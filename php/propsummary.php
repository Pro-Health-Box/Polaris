<?php
    
error_reporting(E_ERROR | E_WARNING | E_PARSE | E_NOTICE);	
	
# Load Dependecies
require_once('inc/format.inc.php');
require_once('inc/fpdf.php');	
	
# Set Defaults    
date_default_timezone_set('America/New_York');
setlocale(LC_MONETARY, 'en_US');
    
# Globals
   
class PDF extends FPDF
{
	// Page header
	function Header()
	{
	$this->SetFont('Arial','B',10);
		$this->Cell(0,5,'MECKLENBURG COUNTY, NC POLARIS 3G PROPERTY INFORMATION REPORT',0,1,'C');
		$this->SetFont('Arial','',10);
		$this->Cell(0,4,'Date Printed: ' . date("m/d/Y"),0,1,'C');
		$this->SetFont('Arial','',9);
	}
	
	// Page footer
	function Footer()
	{
		// Position at 1.7 cm from bottom
		$this->SetY(-17);
		$this->SetX(0);
		// Arial italic 8
		$this->SetFont('Arial','I',8);
		$this->SetLeftMargin(10);
		$this->SetRightMargin(10);
		$this->MultiCell(0,3,'This map or report is prepared for the inventory of real property within Mecklenburg County and is compiled from recorded deeds, plats, tax maps, surveys, planimetric maps, and other public records and data. Users of this map or report are hereby notified that the aforementioned public primary information sources should be consulted for verification. Mecklenburg County and its mapping contractors assume no legal responsibility for the information contained herein.',0,'L');							
		// Page number
		$this->Cell(0,3,'Page '.$this->PageNo().'/{nb}',0,0,'R');
	}
	
	function addTitle($orderby, $orderdir, $propuse, $srchtype, $srchval){
		//order direction
		if($orderdir == 'desc'){$orderdir = 'Descending';}
		else{$orderdir = 'Ascending';}
		
		//order by field
		if($orderby == 'market_value'){$orderby = 'Market Value Order';}
		else if($orderby == 'sale_date,sale_price'){$orderby = 'Sales Date/Sales Price Order';}
		else if($orderby == 'sale_price'){$orderby = 'Sales Price Order';}
		else if($orderby == 'house_number,prefix,street_name,road_type,suffix,unit'){$orderby = 'Address Location Order';}
		else {$orderby = 'Parcel ID Order';}
		
		//propuse
		if($propuse == "Attached Res"){$propuse = " Condominium property";}
		else if($propuse == "Commercial"){$propuse = " Commerical";}
		else if($propuse == "Hotel/Motel"){$propuse = " Hotel/Motel";}
		else if($propuse == "Govt-Inst"){$propuse = " Goverment Institution";}
		else if($propuse == "Manufactured"){$propuse = " Manufactured Home property";}
		else if($propuse == "Multi-Family"){$propuse = " Multi-Family Property";}
		else if($propuse == "Office"){$propuse = " Office";}
		else if($propuse == "Single-Fam"){$propuse = " Single-Family Property";}
		else if($propuse == "StadiumArena"){$propuse = " Stadium/Arena";}
		else if($propuse == "Vacant"){$propuse = " Vacant Land";}
		else if($propuse == "Warehouse"){$propuse = " Warehouse";}
		else if($propuse == "Warehouse Lg"){$propuse = " Large Warehouse";}
		
		//search type
		$juris = array("UNINC Mecklenburg Co", "Charlotte", "Davidson", "Cornelius", "Pineville", "Matthews", "Huntersville", "Mint Hill", "Stallings");
		$srchby = '';
		switch ($srchtype){
			case "juris":
				$srchby = ' in ' . $juris[$srchval];
				break;
			case "nbc":
				$srchby = ' in Neighborhood Code ' . $srchval;
				break;
			case "st":
				$srchby = ' on ' . $srchval;
				break;
			case "pidbuff":
				$srchvalparts = explode("|",$srchval);
				$srchby = ' within ' . $srchvalparts[1] . ' ft of ' . $srchvalparts[0];
				break;
			default:
				$srchby = ' None';
				break;
		}
														
		$this->Cell(0,5,'Search Criteria:' . $propuse . $srchby . '. Sorted by: ' . $orderdir . ' ' . $orderby,0,1,'C');    
	}
	
	function addBox($boxrow, $boxcol, $photo_url, $photo_date, $pid, $addr, $land_area, $sale_price, $sale_date, $market_value, $sqft, $yearbuilt, $bdrm, $bath, $siteno){
		$cellw = 62; 
		$cellh = 82;
		$pgmargin = 10;
		$gap = 2;
		$rowy = 24;
		$imgw = 58;
		$imgh = 43;
		$this->SetLeftMargin($pgmargin+ ($boxcol*$cellw) + ($boxcol*$gap));
		$this->SetRightMargin($pgmargin + ($cellw*(2-$boxcol)) + ($gap*(2-$boxcol)));
		$this->SetY($rowy+($boxrow*$cellh)+($boxrow*$gap));
		$this->Cell(0,$cellh,'',1,1,'C');
		$this->SetXY($pgmargin + ($boxcol*$cellw) + ($boxcol*$gap)+$gap,$rowy+($boxrow*$cellh)+($boxrow*$gap)+$gap);
		if(strlen(trim($photo_url)) > 0 && photoexists(trim($photo_url))){
				$this->Image($photo_url,$pgmargin + ($boxcol*$cellw) + ($boxcol*$gap) + $gap,$rowy+($boxrow*$cellh)+($boxrow*$gap) + $gap,$imgw,$imgh,'JPG');
				$this->Cell($imgw,$imgh,'',1,1,'C');
				$this->MultiCell($cellw,4,date('m/d/Y', strtotime($photo_date)). " from Mecklenburg County",0,'C');							
		}else{
				$this->Image('../image/photo_not_available.png',$pgmargin + ($boxcol*$cellw) + ($boxcol*$gap) + $gap,$rowy+($boxrow*$cellh)+($boxrow*$gap) + $gap,$imgw,$imgh,'PNG');
				$this->Cell($imgw,$imgh,'',1,1,'C');
		}
		
		$this->SetY($rowy+($boxrow*$cellh)+($boxrow*$gap)+$imgh+(3*$gap));
		$this->Write(4, $siteno . ') Parcel ID #: ' . $pid);
		$this->Ln(4);
		$this->Write(4, 'Location: ' . substr($addr, 0 ,45));
		$this->Ln(4);
		$this->Write(4, 'Land Area: ' . $land_area); 
		$this->Ln(4);
		$this->Write(4, 'Sales Price: ' . $sale_price . ' (' . $sale_date . ')');
		$this->Ln(4);
		$this->Write(4, 'Tax Market Value: '.$market_value); 
		$this->Ln(4);
		$this->Write(4, 'Sq. Ft.: ' . $sqft.'  Year Built: ' . $yearbuilt); 
		$this->Ln(4);
		$this->Write(4, 'Bedrooms: '. $bdrm.' Full Baths: ' . $bath);
	}
	
	function addBoxVacant($boxrow, $boxcol, $pid, $addr, $land_area, $sale_price, $sale_date, $market_value, $siteno){
		$cellw = 62; 
		$cellh = 26;
		$pgmargin = 10;
		$gap = 2;
		$rowy = 26;
		$this->SetLeftMargin($pgmargin+ ($boxcol*$cellw) + ($boxcol*$gap));
		$this->SetRightMargin($pgmargin + ($cellw*(2-$boxcol)) + ($gap*(2-$boxcol)));
		$this->SetY($rowy+($boxrow*$cellh)+($boxrow*$gap));
		$this->Cell(0,$cellh,'',1,1,'C');
		$this->SetXY($pgmargin + ($boxcol*$cellw) + ($boxcol*$gap),$rowy+($boxrow*$cellh)+($boxrow*$gap)+($gap/2));
		$this->Write(4, 'Site #: ' . $siteno . ' Parcel ID #: ' . $pid);
		$this->Ln(4);
		$this->Write(4, 'Location: ' . $addr);
		$this->Ln(4);
		$this->Write(4, 'Land Area: ' . $land_area); 
		$this->Ln(4);
		$this->Write(4, 'Sales Price: ' . $sale_price . ' (' . $sale_date . ')');
		$this->Ln(4);
		$this->Write(4, 'Tax Market Value: '.$market_value); 
	}
}
	
function photoexists($url){
	$header_response = get_headers($url, 1);
	if (strpos($header_response[0], "404" ) !== false )
	{
			return false;
	}else{
			return true;
	}
}
	   
# Retrive URL arguments
$pid = trim($_REQUEST['pid']);
$orderby = trim($_REQUEST['orderby']);
$orderdir = trim($_REQUEST['orderdir']);
$lottype = trim($_REQUEST['lottype']);
$propuse = trim($_REQUEST['propuse']);
$srchtype = trim($_REQUEST['srchtype']);
$srchval = trim($_REQUEST['srchval']);

# Get property information through web sevice
$json = file_get_contents("http://maps.co.mecklenburg.nc.us/rest/v1/ws_cama_propertyinfo.php?pid=" . $pid . "&orderby=" . $orderby . "&orderdir=" . $orderdir );
$data = json_decode($json, true);

if ( count ( $data ) > 0 ){
	$rowcnt = 0;
    $colcnt = 0;
	$siteno = 1;
			
	if($propuse == 'Vacant'){
		$boxcnt = 27;
	}else{ 
		$boxcnt = 9;
	}
	
	# set content header
	header('Content-type: application/pdf');
	
	$pdf = new PDF();
	$pdf->AliasNbPages();
	
	foreach ($data as $item) {
		//add a page for every 9 boxes after 9 boxes
		if(($rowcnt == 0) && ($colcnt == 0)){
			$pdf->SetLeftMargin(10);
			$pdf->SetRightMargin(10);
			$pdf->AddPage(); 
			$pdf->addTitle($orderby, $orderdir, $propuse, $srchtype, $srchval);
		}
		
		if($propuse == 'Vacant'){
			$pdf->addBoxVacant($rowcnt,$colcnt-($rowcnt*3),$item['pid'],
				 formatAddress(trim($item['house_number']),trim($item['prefix']),trim($item['street_name']),trim($item['road_type']),trim($item['suffix']),trim($item['unit']),trim($item['municipality'])),
				 formatLandArea($item['land_unit'], trim($item['land_type']), $item['land_area'], $item['common_pid']),
				 formatCurrency(trim($item['sale_price'])), trim($item['sale_date']),formatCurrency(trim($item['market_value'])), $siteno);
		}else{
			$pdf->addBox($rowcnt,$colcnt-($rowcnt*3),$item['photo_url'], $item['photo_date'],$item['pid'],
				 formatAddress(trim($item['house_number']),trim($item['prefix']),trim($item['street_name']),trim($item['road_type']),trim($item['suffix']),trim($item['unit']),trim($item['municipality'])),
				 formatLandArea($item['land_unit'], trim($item['land_type']), $item['land_area'], $item['common_pid']),
				 formatCurrency(trim($item['sale_price'])), trim($item['sale_date']),formatCurrency(trim($item['market_value'])),
				 formatBuiltArea($item['built_area']), trim($item['built_year']), trim($item['bedrooms']),trim($item['fullbaths']), $siteno);
		}
		
		$colcnt++;
		//reset rowcnt after 3 cols are added
		if($colcnt%3 == 0){$rowcnt++;}
		//after 9 boxes are added reset counter so that a new page is added
		if(($colcnt%$boxcnt == 0)){
			$rowcnt = 0;
			$colcnt = 0;
		}
				
		$siteno++;		 
		
	}
	
	$pdf->Output();
}else{
     echo "No data available to make a report";   
} 
   
?>