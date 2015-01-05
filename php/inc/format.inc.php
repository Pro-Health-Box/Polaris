<?php
           
function formatAddressTwoLine($addr1,$addr2,$city, $state, $zip){
	$addr = "";
	$addr1 = trim($addr1);
	$addr2 = trim($addr2);
	$city = trim($city);
	$state = trim($state);
	$zip = trim($zip);
	
	if(strlen($addr1)>0) $addr .= $addr1; 
	if(strlen($addr2)>0) $addr .= " " . $addr2;
	if(strlen($city)>0) $addr .= "\n" . $city;
	if(strlen($state)>0) $addr .= " " . $state;
	if(strlen($zip)>0) $addr .= " " . $zip;
	return $addr;
}

function formatAddress($hno,$prefix,$stname,$rdtype,$suffix,$unit,$muni){
	
	$addr = "";
	if(strlen(trim($hno))>0) $addr .= $hno; 
	if(strlen(trim($prefix))>0) $addr .= " " . trim($prefix);
	if(strlen(trim($stname))>0) $addr .= " " . trim($stname);
	if(strlen(trim($rdtype))>0) $addr .= " " . trim($rdtype);
	if(strlen(trim($suffix))>0) $addr .= " " . trim($suffix);
	if(strlen(trim($unit))>0) $addr .= " " . trim($unit);
	if(strlen(trim($muni))>0) $addr .= " " . trim($muni);
	
	return $addr;
}
    
function formatMailAddress($addr1,$addr2){
	$addr = "";
	if(strlen(trim($addr1))>0) $addr .= trim($addr1); 
	if(strlen(trim($addr2))>0) $addr .= " " . trim($addr2);
	return $addr;
}

function formatLandArea ( $unit, $type_landuse, $acres, $compid ) {
	$landarea = '';
			
	if ( $acres && $acres > 0 ) {
		$landarea = (double) ( number_format ( $acres, 3, '.', '' ) ) . " AC";
	} else if ( $type_landuse && $unit ) {
		switch ( $type_landuse ) {
			case "AC": case "SMAC":
				$landarea = (double) ( number_format( $unit, 3, '.', '' ) ) . " AC";
				break;
			case "SF":
				$landarea = (double) ( number_format ( $unit / 43650, 3, '.', '' ) ) . " AC";
				break;
			default:
				$landarea = (double) ( number_format ( $unit, 3, '.', '' ) ) . " " . $type_landuse;
			
				# Get parcel polygon area
				$json = file_get_contents("http://maps.co.mecklenburg.nc.us/rest/v1/ws_geo_sdeattributequery.php?table=parcel_p&source=tax&fields=ST_Area(shape)%20as%20sqft&parameters=pid='11111111'");
				$data = json_decode($json, true);
				
				if ( count ( $data ) > 0 ){
					$landarea  .= " (" . number_format ( $data[0]["sqft"] / 43650, 3, '.', '' ) . " GIS Acres)";				
				}
				break;
		}
	}
	
	return $landarea;
	
}

function formatOwnerName($fname, $lname){
	$oname = "";
	$fname = trim($fname);
	$lname = trim($lname);
	if(strlen($fname) > 0 || strlen($lname) > 0){
		if(strlen($fname) > 0){$oname .= $fname;}
		if(strlen($lname) > 0){$oname .= " " . $lname;}
	}  
	return $oname;
}

function formatOwnerList($ownerlist){
	$owners = explode ( "|", trim($ownerlist) );
	$ownerlist = "1. " . str_replace(";", ", ", $owners[0]);
	
	for($l=1;$l<count($owners);$l++) {
		if (strlen(trim($owners[$l])) > 0 ) {
			$ownerlist .= "\r\n" . ( $l + 1 ) . "." . str_replace(";", ", ", $owners[$l]);
		}
	}
	return $ownerlist;	
}

function formatCurrency($num){
	if(strlen($num) > 0){return '$'.number_format((double)$num,2);}
	else{return $num;}
}

function formatNumber($num){
	if(strlen($num) > 0){return number_format((double)$num,2);}
	else{return $num;}
}

function formatBuiltArea($num){
	if(strlen($num) > 0){return number_format((double)trim($num,0));}
	else{return $num;}
}

function formatDeed($deed){
	$deed = trim($deed);
	if(strlen($deed) > 0){
		$deed = str_replace(" ","-",$deed);
	}	
	return $deed;
}

function multiarray_search($array,$needle){
	$key = -1;
	for($i = 0; $i < count($array); $i++){
		if(in_array($needle, $array[$i])){$key = $i; break;}
	}
	return $key;
}
    	
?>