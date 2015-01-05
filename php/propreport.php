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
	var $pid; 
	var $compid; 
	var $matid; 
	var $margin; 
	var $cellw;
	var $gap;
	var $colOneY;
	var $colTwoY;
	var $widths;
	var $aligns;
	var $weight;
	var $imgw;
	var $imgh;
	
	function setConstants($pid, $compid, $matid, $margin, $cellw, $gap, $imgw, $imgh){
		$this->pid = $pid;
		$this->compid = $compid;
		$this->matid = $matid;
		$this->margin = $margin;
		$this->cellw = $cellw;
		$this->gap = $gap;
		$this->imgw = $imgw;
		$this->imgh = $imgh;
	}
	
	function SetWidths($w){
		//Set the array of column widths
		$this->widths = $w;
	}
	
	function SetAligns($a){
		//Set the array of column alignments
		$this->aligns=$a;
	}
	
	function setWeight($fw){
		//Set the array of column alignments
		$this->weight = $fw;
	}
	
	function setMrgins($col){
		switch($col){
			case "one":
				$this->SetLeftMargin($this->margin);
				break;
			case "two":
				$this->SetLeftMargin($this->margin+$this->cellw+$this->gap);
				break;
		}
	}
	
	// Page header
	function Header(){
	$this->SetFont('Arial','B',10);
		$this->Cell(0,5,'MECKLENBURG COUNTY, North Carolina',0,1,'C');
		$this->Cell(0,5,'POLARIS 3G PARCEL OWNERSHIP AND GIS SUMMARY',0,1,'C');
		$this->SetFont('Arial','',10);
		$this->Cell(0,4,'Date Printed: ' . date("m/d/Y"),0,1,'C');
		$this->SetFont('Arial','',9);
		$this->colOneY = $this->GetY();
		$this->colTwoY = $this->GetY();
	}
	
	// Page footer
	function Footer(){
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
	
	function addTitle($title){
		$this->SetWidths(array($this->cellw));
		$this->SetAligns(array('C'));
		$this->setWeight('B');
		$this->Row(array($title));
	}
	
	function addIdentity(){
		$this->setMrgins("one");
		$this->addTitle("Identity");
		$this->SetWidths(array($this->cellw/2, $this->cellw/2));
		$this->SetAligns(array('C', 'C'));
		$this->setWeight('');			
		$this->Row(array("Parcel ID", "GIS ID"));		
		$this->SetAligns(array('L', 'L'));
		$this->Row(array($this->pid, $this->compid));		
		$this->colOneY = $this->GetY()+2;
	}
			
	function addOwnership(){
		$this->setMrgins("two");
		$this->SetY($this->colTwoY);
		$this->addTitle("Ownership");
		$this->SetWidths(array($this->cellw/2, $this->cellw/2));
		$this->SetAligns(array('C', 'C'));
		$this->setWeight('');			
		$this->Row(array("Owner Name", "Mailing Address"));		
		$this->SetAligns(array('L', 'L'));
		# call ownership web service parameters
		$json = callws("http://maps.co.mecklenburg.nc.us/rest/v2/php-cgi/ws_cama_ownership.php", 
			array('pid'  => $this->pid, 'pidtype'  => 'tax', 'format' => 'json'));
		$data = (json_decode($json,true));
		if ($data ["total_rows"] > 0){
			foreach ($data["rows"] as $item){
				$this->Row(array(formatOwnerName($item["row"]["first_name"], $item["row"]["last_name"]),
					formatAddressTwoLine($item["row"]["address_1"],$item["row"]["address_2"], $item["row"]["city"],$item["row"]["state"],$item["row"]["zipcode"])));		
							
			}
		}
		$this->colTwoY = $this->GetY()+2;
	}
	
	function addCharacts($compid){
		$this->setMrgins("one");
		$this->SetY($this->colOneY);
		$this->addTitle("Property Characteristics");
		$this->SetWidths(array($this->cellw/2, $this->cellw/2));
		$this->SetAligns(array('L', 'L'));
		$this->setWeight('');
		# call land use web service parameters
		$json = callws("http://maps.co.mecklenburg.nc.us/rest/v2/php-cgi/ws_cama_landuse.php", 
			array('pid'  => $this->pid, 'pidtype'  => 'tax', 'format' => 'json'));
		$data = (json_decode($json,true));
		if ($data ["total_rows"] > 0){
			$landuse = $data["rows"][0]["row"]["land_use"];
			$landunits = $data["rows"][0]["row"]["units"];
			$landunittype = $data["rows"][0]["row"]["land_unit_type"];
			$json = callws("http://maps.co.mecklenburg.nc.us/rest/v2/php-cgi/ws_cama_legal.php", 
				array('pid'  => $this->pid, 'pidtype'  => 'tax', 'format' => 'json'));
			$data = (json_decode($json,true));
															
			if ($data ["total_rows"] > 0){
				foreach ($data["rows"] as $item){
					$this->Row(array("Legal desc", $item["row"]["legal_description"]));		
					$this->Row(array("Land Area",formatLandArea($landunits,$landunittype,$item["row"]["total_acres"],$compid)));		
					$this->Row(array("Fire District", $item["row"]["fire_district"]));		 
					$this->Row(array("Special District", $item["row"]["special_district"]));		
					$this->Row(array("Account Type", $item["row"]["account_type"]));		
					$this->Row(array("Municipality", $item["row"]["municipality"]));		
					$this->Row(array("Property Use",$landuse));		
				}	
			}
		}
		$this->colOneY = $this->GetY()+2;
	}
	
	function addDeed(){
		$this->setMrgins("two");
		$this->SetY($this->colTwoY);
		$this->addTitle("Deed Reference(s) and Sale Price");
		$this->SetWidths(array($this->cellw/3, $this->cellw/3, $this->cellw/3));
		$this->SetAligns(array('C', 'C', 'C'));
		$this->setWeight('');
		$this->Row(array("Deed", "Sale Date", "Sale Price"));
		$this->SetAligns(array('L', 'L', 'L'));
		# call sales history web service parameters
		$json = callws("http://maps.co.mecklenburg.nc.us/rest/v2/php-cgi/ws_cama_saleshistory.php", 
			array('pid'  => $this->pid, 'pidtype'  => 'tax', 'format' => 'json'));
		$data = (json_decode($json,true));		
		if ($data ["total_rows"] > 0){
			$ulta_array = array_reverse($data["rows"]);
			foreach ($ulta_array as $item){			
				$this->Row(array(formatDeed($item["row"]["deed_book"]), $item["row"]["sale_date"], formatCurrency($item["row"]["sale_price"])));
			}
		}	
		$this->colTwoY = $this->GetY()+2;
	}
			
	function addSitusAdd(){
		$this->setMrgins("one");
		$this->SetY($this->colOneY);
		$this->addTitle("Situs Addresses Tied to Parcel");
		$this->SetAligns(array('L'));
		$this->setWeight('');
		# call situsaddress web service parameters
		$json = callws("http://maps.co.mecklenburg.nc.us/rest/v2/php-cgi/ws_cama_situsaddress.php", 
			array('pid'  => $this->pid, 'pidtype'  => 'tax', 'format' => 'json'));
		$data = (json_decode($json,true));		
		if ($data ["total_rows"] > 0){
			foreach ($data["rows"] as $item){			
				$addr = formatAddress($item["row"]["house_number"], $item["row"]["prefix"], $item["row"]["street_name"],
					$item["row"]["road_type"], $item["row"]["suffix"], $item["row"]["unit"], $item["row"]["city"]);
				if(strlen($addr) > 1){	
					/*if(($this->GetY()+5>$this->PageBreakTrigger && $this->GetX()<$this->margin+$this->cellw)){
						$this->setMrgins("two");
						$this->SetY($this->colTwoY);
						$this->Ln(2);
					}*/	
					$this->Row(array($addr));		
				}	
			}
		}	
	}

	function addSiteLoc(){
		$this->setMrgins("two");
		$this->SetY($this->colTwoY);
		$this->addTitle("Site Location");
		$this->SetWidths(array($this->cellw*(2/3),$this->cellw*(1/3)));
		$this->SetAligns(array('L'));
		$this->setWeight('');
								
		$json = callws("http://maps.co.mecklenburg.nc.us/rest/v1/ws_geo_featureoverlay.php", 
			array('from_geotable'  => 'master_address_table', 'to_geotable'  => 'spheres_of_influence', 'fields' => 't.name', 'parameters' => 'f.objectid=\''.$this->matid.'\'', 'format' => 'json'));			
		$data = (json_decode($json,true));
		if ($data ["total_rows"] > 0){
			$this->Row(array("ETJ Area", $data["rows"][0]["row"]["name"]));
		}	
		
		$json = callws("http://maps.co.mecklenburg.nc.us/rest/v1/ws_geo_featureoverlay.php", 
			array('from_geotable'  => 'master_address_table', 'to_geotable'  => 'historicdistricts_py', 'fields' => 't.name', 'parameters' => 'f.objectid=\''.$this->matid.'\'', 'format' => 'json'));			
		$data = (json_decode($json,true));
		if ($data ["total_rows"] > 0){
			$this->Row(array("Charlotte Historic District", "Yes"));
		}else{
			$this->Row(array("Charlotte Historic District", "No"));
		}
		
		$json = callws("http://maps.co.mecklenburg.nc.us/rest/v1/ws_geo_featureoverlay.php", 
			array('from_geotable'  => 'master_address_table', 'to_geotable'  => 'annexation_areas_2011', 'fields' => 't.gid', 'parameters' => 'f.objectid=\''.$this->matid.'\'', 'format' => 'json'));			
		$data = (json_decode($json,true));
		if ($data ["total_rows"] > 0){
			$this->Row(array("Charlotte 6/30/2011 Annexation Area", "Yes"));
		}else{
			$this->Row(array("Charlotte 6/30/2011 Annexation Area", "No"));
		}
		
		$json = callws("http://maps.co.mecklenburg.nc.us/rest/v1/ws_geo_featureoverlay.php", 
			array('from_geotable'  => 'master_address_table', 'to_geotable'  => 'census_tracts', 'fields' => 't.tractid', 'parameters' => 'f.objectid=\''.$this->matid.'\'', 'format' => 'json'));			
		$data = (json_decode($json,true));
		if ($data ["total_rows"] > 0){
			$this->Row(array("Census Tract #", $data["rows"][0]["row"]["tractid"]));
		}
		$this->colTwoY = $this->GetY()+2;
	}
	
	function addZoning(){
		$this->setMrgins("one");
		$this->SetY($this->colOneY);
		$this->addTitle("Zoning");
		$this->SetWidths(array($this->cellw));
		$this->SetAligns(array('L'));
		$this->setWeight('');
		$this->Row(array("Contact appropriate Planning Department or see Map."));	
		$this->colOneY = $this->GetY()+2;
	}
	
	function addWaterQualBuff(){
		$this->setMrgins("one");
		$this->SetY($this->colOneY);
		$this->addTitle("Water Quality Buffer");
		$this->SetWidths(array($this->cellw*(2/3),$this->cellw*(1/3)));
		$this->SetAligns(array('L'));
		$this->setWeight('');
		$json = callws("http://maps.co.mecklenburg.nc.us/rest/v1/ws_geo_featureoverlay.php", 
			array('from_geotable'  => 'tax_parcels', 'to_geotable'  => 'water_quality_buffers', 'fields' => 't.gid', 'parameters' => 'f.pid=\''.$this->compid.'\'', 'format' => 'json'));			
		$data = (json_decode($json,true));
		if ($data ["total_rows"] > 0){
			$this->Row(array("Parcel Inside Water Quality Buffer", "Yes"));
		}else{
			$this->Row(array("Parcel Inside Water Quality Buffer", "No"));
		}
		$this->colOneY = $this->GetY()+2;
	}
	
	function addPostConst(){
		$this->setMrgins("two");
		$this->SetY($this->colTwoY);
		$this->addTitle("Post Construction District");
		$this->SetWidths(array($this->cellw/2,$this->cellw/2));
		$this->SetAligns(array('L'));
		$this->setWeight('');
		$json = callws("http://maps.co.mecklenburg.nc.us/rest/v1/ws_geo_featureoverlay.php", 
			array('from_geotable'  => 'master_address_table', 'to_geotable'  => 'post_construction_districts', 'fields' => 't.juris,t.district', 'parameters' => 'f.objectid=\''.$this->matid.'\'', 'format' => 'json'));			
		$data = (json_decode($json,true));
		if ($data ["total_rows"] > 0){
			$this->Row(array("Jurisdiction", $data["rows"][0]["row"]["juris"]));
			$this->Row(array("District", $data["rows"][0]["row"]["district"]));
		}
		$this->colTwoY = $this->GetY()+2;
	}
	
	function addfldp(){
		$this->setMrgins("one");
		$this->SetY($this->colOneY);
		$this->addTitle("FEMA and Community Floodplain");
		$this->SetWidths(array($this->cellw*(1/3),$this->cellw*(2/3)));
		$this->SetAligns(array('L'));
		$this->setWeight('');
		$json = callws("http://maps.co.mecklenburg.nc.us/rest/v1/ws_geo_featureoverlay.php", 
			array('from_geotable'  => 'master_address_table', 'to_geotable'  => 'stormwater_fema_panel_index', 'fields' => 't.panel_lett,t.panel_id', 'parameters' => 'f.objectid=\''.$this->matid.'\'', 'format' => 'json'));			
		$data = (json_decode($json,true));
		if ($data ["total_rows"] > 0){
			$this->Row(array("FEMA Panel#", $data["rows"][0]["row"]["panel_id"]));
			switch($data["rows"][0]["row"]["panel_id"]){
				case "3710450700L": case "3710359500L": case "3710450500L": case "3710359400L": case "3710359300L": case "3710450300L":
					$this->Row(array("FEMA Panel Date", "11/04/2009"));
					break;
				default:
					$this->Row(array("FEMA Panel Date", "03/02/2009"));
					break;
			}
		}
		$json = callws("http://maps.co.mecklenburg.nc.us/rest/v1/ws_geo_featureoverlay.php", 
			array('from_geotable'  => 'tax_parcels', 'to_geotable'  => 'fema_floodplain_changes', 'fields' => 't.gid', 'parameters' => 'f.pid=\''.$this->compid.'\'', 'format' => 'json'));			
		$data = (json_decode($json,true));
		if ($data ["total_rows"] > 0){
			$this->Row(array("FEMA Flood  Zone", "IN:VIEW FEMA FLOODPLAIN TO VERIFY"));
		}else{
			$this->Row(array("FEMA Flood  Zone", "OUT:VIEW FEMA FLOODPLAIN TO VERIFY"));
		}
		$json = callws("http://maps.co.mecklenburg.nc.us/rest/v1/ws_geo_featureoverlay.php", 
			array('from_geotable'  => 'tax_parcels', 'to_geotable'  => 'stormwater_community_encroachment_changes', 'fields' => 't.gid', 'parameters' => 'f.pid=\''.$this->compid.'\'', 'format' => 'json'));			
		$data = (json_decode($json,true));
		if ($data ["total_rows"] > 0){
			$this->Row(array("Community Flood Zone", "IN:VIEW COMMUNITY FLOODPLAIN TO VERIFY"));
		}else{
			$this->Row(array("Community Flood Zone", "OUT:VIEW COMMUNITY FLOODPLAIN TO VERIFY"));
		}
		$this->colOneY = $this->GetY()+2;
	}
	
	function addWatershed(){
		$this->setMrgins("two");
		$this->SetY($this->colTwoY);
		$this->addTitle("Stream Watershed Districts");
		$this->SetWidths(array($this->cellw*(1/3),$this->cellw*(2/3)));
		$this->SetAligns(array('L'));
		$this->setWeight('');
		$json = callws( "http://maps.co.mecklenburg.nc.us/rest/v2/ws_geo_featureoverlay.php", 
			array ( 'from_table'  => 'master_address_table', 
				'to_table'  => 'watersheds_stream', 
				'to_geometryfield' => 'geom', 
				'fields' => 't.name', 
				'parameters' => 'f.objectid=\''.$this->matid.'\''
			) 
		);			
		$data = (json_decode($json,true));
		if ( count ( $data ) > 0 ){
			$this->Row ( array ( "Watershed Name", $data[ 0 ][ "name" ] ) );
		} else {
			$this->Row ( array ( "Watershed Name", "NA" ) );
		}
		$this->colTwoY = $this->GetY()+2;
	}
	
	function addDrinkingWatershed(){
		$this->setMrgins("two");
		$this->SetY($this->colTwoY);
		$this->addTitle("Regulated Drinking Watershed Districts");
		$this->SetWidths(array($this->cellw*(1/3),$this->cellw*(2/3)));
		$this->SetAligns(array('L'));
		$this->setWeight('');
		$json = callws( "http://maps.co.mecklenburg.nc.us/rest/v2/ws_geo_featureoverlay.php", 
			array ( 'from_table'  => 'master_address_table', 
				'to_table'  => 'watersheds_drinking_water', 
				'to_geometryfield' => 'geom', 
				'fields' => 't.name,t.subarea', 
				'parameters' => 'f.objectid=\''.$this->matid.'\''
			) 
		);			
		$data = ( json_decode ( $json, true ) );
		if ( count ( $data ) > 0 ){
			$this->Row ( array ( "Watershed Name", $data[ 0 ][ "name" ] ) );
			$this->Row ( array ( "Watershed Class", $data[ 0 ][ "subarea" ] ) );
		}else {
			$this->Row ( array ( "Watershed Name", "NA" ) );
			$this->Row ( array ( "Watershed Class", "NA" ) );
		}
		$this->colTwoY = $this->GetY()+2;
	}
	
	function addPhoto(){
		$this->Ln(2);
		$this->SetWidths(array($this->cellw));
		$this->SetAligns(array('C'));
		$this->setWeight('');
		$json = callws("http://maps.co.mecklenburg.nc.us/rest/v1/ws_misc_house_photos.php", array('pid'  => $this->pid));			
		$data = (json_decode($json,true));
		if ($data ["total_rows"] > 0){
			foreach ($data["rows"] as $item){
				if (photoexists($item["row"]["photo_url"])){
					//Issue a page break first if needed
					$this->CheckPageBreak($this->imgh+$this->gap*2);
					
					//Save the current position
					$x=$this->GetX();
					$y=$this->GetY();
					//Draw the border
					$this->Rect($x,$y,$this->imgw+$this->gap*2,$this->imgh+$this->gap*3);
					$this->Image($item["row"]["photo_url"],$x+$this->gap,$y+$this->gap,$this->imgw,$this->imgh,'JPG');
					$this->SetY($y+$this->imgh+$this->gap);
					$y=$this->GetY();
					$this->MultiCell($this->cellw,5,date('m/d/Y', strtotime($item["row"]["photo_date"])). " from ". $item["row"]["attribution"],0,'C');						
					$this->SetY($y+$this->gap*3);
				}	
			}
		}	
	}
			
	function Row($data)
	{
		//Calculate the height of the row
		$nb=0;
		for($i=0;$i<count($data);$i++)
			$nb=max($nb,$this->NbLines($this->widths[$i],$data[$i]));
		$h=5*$nb;
		//Issue a page break first if needed
		$this->CheckPageBreak($h);
		//Draw the cells of the row
		for($i=0;$i<count($data);$i++)
		{
			$w=$this->widths[$i];
			$a=isset($this->aligns[$i]) ? $this->aligns[$i] : 'L';
			$fw=isset($this->weight) ? $this->weight : '';
			//Save the current position
			$x=$this->GetX();
			$y=$this->GetY();
			//Draw the border
			$this->Rect($x,$y,$w,$h);
			//set font
			$this->SetFont('Arial',$fw,9);
			//Print the text
			$this->MultiCell($w,5,$data[$i],0,$a);
			//Put the position to the right of the cell
			$this->SetXY($x+$w,$y);
		}
		//Go to the next line
		$this->Ln($h);
	}
	
	function CheckPageBreak($h)
	{
		//If the height h would cause an overflow, add a new page immediately
		//if($this->GetY()+$h>$this->PageBreakTrigger)
		//	$this->AddPage($this->CurOrientation);
		if($this->GetY()+$h>$this->PageBreakTrigger){
			if($this->GetX()<$this->margin+$this->cellw){
				$this->setMrgins("two");
				$this->SetY($this->colTwoY);
			}else{	
				$this->setMrgins("one");
				$this->AddPage($this->CurOrientation);
			}	
		}
	}
	
	function NbLines($w,$txt)
	{
		//Computes the number of lines a MultiCell of width w will take
		$cw=&$this->CurrentFont['cw'];
		if($w==0)
			$w=$this->w-$this->rMargin-$this->x;
		$wmax=($w-2*$this->cMargin)*1000/$this->FontSize;
		$s=str_replace("\r",'',$txt);
		$nb=strlen($s);
		if($nb>0 and $s[$nb-1]=="\n")
			$nb--;
		$sep=-1; $i=0; $j=0; $l=0; $nl=1;
		while($i<$nb)
		{
			$c=$s[$i];
			if($c=="\n")
			{
				$i++; $sep=-1; $j=$i; $l=0; $nl++;
				continue;
			}
			if($c==' ')
				$sep=$i;
			$l+=$cw[$c];
			if($l>$wmax)
			{
				if($sep==-1)
				{
					if($i==$j)
						$i++;
				}
				else
					$i=$sep+1;
				$sep=-1; $j=$i; $l=0; $nl++;
			}
			else
				$i++;
		}
		return $nl;
	}
	
 }
	 
function callws($url, $params){
	# Set the base URL of the web service.
	# URL encode the parameters.
	$query_string = "";
	foreach ($params as $key => $value) { 
		$query_string .= "$key=" . urlencode($value) . "&";
	}
	$url = "$url?$query_string";
	# Get the return results.
	return file_get_contents($url);
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
$compid = trim($_REQUEST['gisid']);
$matid = trim($_REQUEST['mat']);

# set content header
header('Content-type: application/pdf');
    
# make report	
$pdf = new PDF();
$pdf->AliasNbPages();
$pdf->AddPage(); 
$pdf->setConstants($pid, $compid, $matid, 10, 94, 2, 90, 75);
$pdf->SetTopMargin($pdf->margin);
$pdf->addIdentity();
$pdf->addOwnership();
$pdf->addCharacts($compid);
$pdf->addDeed();
$pdf->addSiteLoc();
$pdf->addZoning();
$pdf->addWaterQualBuff();
$pdf->addPostConst();
$pdf->addfldp();
$pdf->addWatershed();
$pdf->addDrinkingWatershed();
$pdf->addSitusAdd();
$pdf->addPhoto();
$pdf->Output();       
   
?>