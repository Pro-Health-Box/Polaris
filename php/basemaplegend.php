<?php
    # Includes
    require_once('inc/fpdf.php');
    
    date_default_timezone_set('America/New_York');
    setlocale(LC_MONETARY, 'en_US');
    //globals
	   
    class PDF extends FPDF {
        // Page header
        function Header() {
			$this->SetFont('Arial','B',10);
            $this->Cell(0,5,'POLARIS 3G Basemap Legend',0,1,'L');
        }
    }
       
    # Retrive URL arguments
    try {
        $legend = trim($_REQUEST['legend']);
        $orientation = trim($_REQUEST['orientation']);
    } 
    catch (Exception $e) {
        trigger_error("Caught Exception: " . $e->getMessage(), E_USER_ERROR);
    }

    # make the report
    try {
        $pdf = new PDF($orientation);
        $pdf->AliasNbPages();
        $pdf->AddPage(); 
		$pdf->Image('../image/legend/'.$legend.'legend.png',12,20);
		$pdf->Output();       
    }
    catch (Exception $e) {
            trigger_error("Caught Exception: " . $e->getMessage(), E_USER_ERROR);
    }
?>