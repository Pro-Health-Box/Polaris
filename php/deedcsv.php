<?php
    # Includes
    require_once("../services/inc/error.inc.php");
    require_once("../services/inc/database.inc.php");
    require_once("../services/inc/security.inc.php");
	require_once('inc/format.inc.php');
       
    date_default_timezone_set('America/New_York');
    setlocale(LC_MONETARY, 'en_US');
    //globals
		    
    # Retrive URL arguments
    try {
        $pids = trim($_REQUEST['pids']);
    } 
    catch (Exception $e) {
        trigger_error("Caught Exception: " . $e->getMessage(), E_USER_ERROR);
    }

    # make the report
    try {
		$pids = '\'' . str_replace(',','\',\'',$pids) . '\'';
		//revert back (select distinct * from dbo.tb_pubsales) to dbo.tb_pubsales
		$sql = "select own.id_pid as pid, own.id_common_pid as common_pid, own.nme_ownerlastname as last_name, own.nme_ownerfirstname as first_name, own.txt_ownertype_desc as owner_type, 
				own.txt_mailaddr1 as mail_addr1, ISNULL(own.txt_mailaddr2,'') as mail_addr2, own.txt_city as mail_city, own.txt_State as mail_state, own.txt_zipcode as mail_zip,
                loc.num_HouseNo as house_number, loc.txt_StDir as prefix, loc.txt_StName as street_name, loc.txt_StType as road_type, loc.txt_StSuffix as suffix, loc.num_HouseUnit as unit, loc.cde_Munic_Desc as municipality,
                info.num_TotalAC as land_area, land.cnt_LandUnits as land_unit, land.cde_LandUnitType as land_type, sales.txt_deedbook as deed_book, sales.txt_deedpage as deed_page, info.txt_legaldesc as legal_desc 
                from dbo.tb_PubOwner as own left join((select distinct * from dbo.tb_pubsales) as sales inner join(dbo.tb_pubparcelinfo as info inner join(dbo.tb_publand as land inner join dbo .tb_publocation as loc on loc.num_Card_No = land.num_Card_No and loc.id_Pid = land.id_PID)
                on info.id_pid = land.id_pid) on sales.id_pid = info.id_pid) on own.id_pid = sales.id_pid 
                where isnull(sales.num_SequenceNo,0) = 0 and land.num_SequenceNo = 1 and own.id_pid in (".$pids.") order by pid";
		
		$sql = sanitizeSQL($sql);
		$camaconn = camaConnection();
		
		/*** fetch into an PDOStatement object ***/
		$recordSet = $camaconn->prepare($sql);
        $recordSet->execute();
		
		if ($recordSet) {
			
			$rows = array();
			
			array_push($rows,array('PARCEL_ID','OWNER_NAME','MAILING_ADDRESS','CITY','STATE','ZIP_CODE','PROPERTY_ADDRESS','LEGAL DESCRIPTION','DEED BOOK','DEED PAGE','LAND AREA'));     
			
			$pids = str_replace ( '\'', '', $pids );
			$temp = explode ( ",", $pids );
			
			for($i=0;$i<count($temp);$i++) {
			
				array_push($rows, array ( 0 => $temp[$i] ));
									
			}
			
			while ($row  = $recordSet->fetch(PDO::FETCH_ASSOC)) {
			
				$key = multiarray_search($rows,$row['pid']);
				
				if ( count($rows[$key]) > 1 ) {
				
					$rows[$key][1] .= " AND " . formatOwnerName($row['first_name'], $row['last_name']);
				
				} else {
				
					array_push ( $rows[$key], formatOwnerName($row['first_name'], $row['last_name']),
						formatMailAddress(trim($row['mail_addr1']),trim($row['mail_addr2'])),trim($row['mail_city']),trim($row['mail_state']),trim($row['mail_zip']),
						formatAddress($row['house_number'],$row['prefix'],$row['street_name'], $row['road_type'], $row['suffix'], $row['unit'], $row['municipality']), 
						$row['legal_desc'], $row['deed_book'], $row['deed_page'],
						formatLandArea( $row['land_unit'], trim($row['land_type']), $row['land_area'], $row['common_pid'] ) );
				
				}
				
			}
						
			header("Cache-Control: must-revalidate, post-check=0, pre-check=0");
			header('Content-Description: File Transfer');
			header("Content-type: text/csv");
			header("Content-Disposition: attachment; filename=deed.csv");
			header("Expires: 0");
			header("Pragma: public");
          
            $fp = fopen('php://output', 'w');
			
            foreach ($rows as $fields) {
                fputcsv($fp, $fields);
            }
            $csv = fgets($fp);
            fclose($fp);
		  
		} else {
            echo "No data available to make CSV";   
        }  
        
        
    }
    catch (Exception $e) {
            trigger_error("Caught Exception: " . $e->getMessage(), E_USER_ERROR);
    }
?>