<?php
    
error_reporting(E_ERROR | E_WARNING | E_PARSE | E_NOTICE);	
	
# Load Dependecies
require_once('inc/format.inc.php');
require_once('inc/fpdf.php');

# Set Defaults    
date_default_timezone_set('America/New_York');
setlocale(LC_MONETARY, 'en_US');

# Globals
class PDF extends FPDF {
	var $widths;
	var $aligns;
	var $distance;
	
	function SetDistance($dist) {
		//Set the array of column widths
		$this->distance=$dist;
	}
	
	function SetWidths($w) {
		//Set the array of column widths
		$this->widths=$w;
	}
	
	function SetAligns($a) {
		//Set the array of column alignments
		$this->aligns=$a;
	}
        
	function Row($data) {
		//Calculate the height of the row
		$nb=0;
		for($i=0;$i<count($data);$i++)
			$nb=max($nb,$this->NbLines($this->widths[$i],$data[$i]));
		$h=5*$nb;
		//Issue a page break first if needed
		$this->CheckPageBreak($h);
		//Draw the cells of the row
		for($i=0;$i<count($data);$i++) {
			$w=$this->widths[$i];
			$a=isset($this->aligns[$i]) ? $this->aligns[$i] : 'L';
			//Save the current position
			$x=$this->GetX();
			$y=$this->GetY();
			//Draw the border
			$this->Rect($x,$y,$w,$h);
			//Print the text
			$this->MultiCell($w,5,$data[$i],0,$a);
			//Put the position to the right of the cell
			$this->SetXY($x+$w,$y);
		}
		//Go to the next line
		$this->Ln($h);
	}
	
	function CheckPageBreak($h) {
		//If the height h would cause an overflow, add a new page immediately
		if($this->GetY()+$h>$this->PageBreakTrigger)
			$this->AddPage($this->CurOrientation);
	}
        
	function NbLines($w,$txt) {
		//Computes the number of lines a MultiCell of width w will take
		$cw=&$this->CurrentFont['cw'];
		if($w==0)
			$w=$this->w-$this->rMargin-$this->x;
		$wmax=($w-2*$this->cMargin)*1000/$this->FontSize;
		$s=str_replace("\r",'',$txt);
		$nb=strlen($s);
		if($nb>0 and $s[$nb-1]=="\n")
			$nb--;
		$sep=-1;
		$i=0;
		$j=0;
		$l=0;
		$nl=1;
		while($i<$nb) {
			$c=$s[$i];
			if($c=="\n") {
				$i++;
				$sep=-1;
				$j=$i;
				$l=0;
				$nl++;
				continue;
			}
			if($c==' ')
				$sep=$i;
			$l+=$cw[$c];
			if($l>$wmax) {
				if($sep==-1) {
					if($i==$j)
						$i++;
				}
				else
					$i=$sep+1;
				$sep=-1;
				$j=$i;
				$l=0;
				$nl++;
			}
			else
				$i++;
		}
		return $nl;
	}
       
	// Page header
	function Header() {
		$this->SetFont('Arial','B',10);
		$this->Cell(0,5,'MECKLENBURG COUNTY, NC POLARIS 3G DEED REPORT',0,1,'C');
		$this->SetFont('Arial','',10);
		$this->Cell(0,4,'Date Printed: ' . date("m/d/Y"),0,1,'C');
		$this->SetFont('Arial','',9);
		if(strlen($this->distance)>0) {
			$this->Cell(0,5,'Buffer Distance: ' . $this->distance . ' Feet',0,1,'C');
		}
		$this->Ln(1);
		$this->SetAligns(array('C', 'C', 'C', 'C', 'C', 'C', 'C'));
		$this->Row(array('No', 'Parcel ID', 'Owner Name', 'Mailing Address', 'Legal Description', 'Deed Book', 'Deed Page', 'Land Area'));
		$this->SetAligns(array('L', 'L', 'L', 'L', 'L', 'L', 'R'));
	}
        
	// Page footer
	function Footer() {
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
	
	function addTitle($dist) {
		$this->Cell(0,5,'Buffer Distance: ' . $dist . ' Feet',0,1,'C');    
	}
}

# Retrive URL arguments
$pid = trim($_REQUEST['pid']);
$dist = isset($_REQUEST['dist']) ? trim($_REQUEST['dist']) : '';
$format = trim($_REQUEST['format']);

# Get deed information through web sevice
$json = file_get_contents('http://maps.co.mecklenburg.nc.us/rest/v1/ws_cama_deedinfo.php?pid=' . $pid . '&pidtype=tax');
$data = json_decode($json, true);

if ( count ( $data ) > 0 ){

	$rows = array();
	$pid = str_replace ( '\'', '', $pid );
	$temp = explode ( ",", $pid );
		
	if ( $format == "pdf" ) {	
	
		for($i=0;$i<count($temp);$i++) {
	
			foreach ($data as $item) {
			
				if ( $item['pid'] == $temp[$i] ) {
				
					array_push($rows, array ( 
						0 => $temp[$i], 
						1 => formatOwnerList($item['owner_names']),
						2 => formatAddressTwoLine(trim($item['address_1']),trim($item['address_2']),trim($item['city']),trim($item['state']),trim($item['zipcode'])),
						3 => $item['legal_description'],
						4 => $item['deed_book'],
						5 => $item['deed_page'],
						6 => formatLandArea( $item['units'], trim($item['land_unit_type']), $item['total_acres'], $item['common_pid'] )
					));
					
					break;
				
				}
			
			}
	
		}
	
		# set content header
		header('Content-type: application/pdf');
		
		$pdf = new PDF();
		$pdf->AliasNbPages();
		$pdf->SetDistance($dist);
		$pdf->SetWidths(array(7, 20, 39, 38, 30, 18, 18, 20));
		$pdf->AddPage(); 
		for($i = 0; $i < count($rows); $i++){
			array_unshift( $rows[$i], $i + 1 );
			$pdf->Row($rows[$i]);
		}    
		$pdf->Output();

	} else {	

		array_push($rows,array('PARCEL_ID','OWNER_NAME','MAILING_ADDRESS','CITY','STATE','ZIP_CODE','PROPERTY_ADDRESS','LEGAL DESCRIPTION','DEED BOOK','DEED PAGE','LAND AREA'));
	
		for($i=0;$i<count($temp);$i++) {
	
			foreach ($data as $item) {
			
				if ( $item['pid'] == $temp[$i] ) {
				
					array_push($rows, array ( 
						0 => $temp[$i], 
						1 => str_replace(";", ", ", $item['owner_names']),
						2 => formatAddressTwoLine(trim($item['address_1']),trim($item['address_2']),trim($item['city']),trim($item['state']),trim($item['zipcode'])),
						3 => trim($item['city']),
						4 => trim($item['state']),
						5 => trim($item['zipcode']),
						6 => formatAddress($item['house_number'],$item['prefix'],$item['street_name'], $item['road_type'], $item['suffix'], $item['unit'], $item['municipality']),
						7 => $item['legal_description'],
						8 => $item['deed_book'],
						9 => $item['deed_page'],
						10 => formatLandArea( $item['units'], trim($item['land_unit_type']), $item['total_acres'], $item['common_pid'] )
					));
					
					break;
				
				}
			
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
		
	}	

} else {
     echo "No data available to make a report";   
}  
    
?>