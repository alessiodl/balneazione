<?php
	// Parameters from the client
	$url = $_GET['url'];
	$fmt = $_GET['format'];
	
	//  Initiate curl
	$ch = curl_init();
	// Disable SSL verification
	curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
	// Will return the response, if false it print the response
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

	if ($fmt == 0){
		// Set the url
		curl_setopt($ch, CURLOPT_URL, $url);
		// Execute
		$result=curl_exec($ch);
		// Closing
		curl_close($ch);
		print $result;
	} else if ($fmt == 1){
		// Set the url
		curl_setopt($ch, CURLOPT_URL, $url."&tipoArea=AB");
		// Execute
		$result=curl_exec($ch);
		// Closing
		curl_close($ch);
		// Print
		print json_encode($result);
	} else if ($fmt == 2){
		// Set the url
		curl_setopt($ch, CURLOPT_URL, $url."&type=areebalneazione");
		// Execute
		$result=curl_exec($ch);
		// Closing
		curl_close($ch);
		// Print
		print json_encode($result);
	}
?>
