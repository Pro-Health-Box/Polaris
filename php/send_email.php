<?php

	if ($_SERVER["REQUEST_METHOD"] == "POST") {
  
		$to = trim ( $_POST[ "to" ] );
		$subject = trim ( $_POST[ "subject" ] );
		$message = trim ( $_POST[ "message" ] );
		$success = trim ( $_POST[ "success" ] );
		$failure = trim ( $_POST[ "failure" ] );
		
	}
			
	// Send email
	try {
		
		// Set mailing parameters
		ini_set ( "SMTP", "smtprelay.ds.co.mecklenburg.nc.us" );
		ini_set ( "smtp_port", "25" );
		ini_set ( "sendmail_from", "noreply@mecklenburgcountync.gov" );
				
		// Send the mail
		mail($to, $subject, $message, $headers);
		
		echo $success;
	}
	catch(Exception $error) {
	
		echo $failure;
	
	}
	
?>
