// main.js
// This file contains all the page related events and functions
// Created by Lak Krishnan
// 07/18/14
// @license     MIT

// Global Variables

var map,                    // the map
	agsServices = [],       // ArcGIS Service holder
	serviceNames = [],      // ArcGIS Service name holder
	layerListTree,          // overlay layer tree checkbox control        
	legend,                 // legend control 
	selectedAddress = { },   // holder for the selected location
	parcelGraphic = null,   // graphic of the selected parcel
	locationGraphic = null,	// graphic of a selected location
	helperGraphics = [],    // search result locations used in market analysis
	mapExtentInLatLon,      // holds the map extent projected to epsg 4326  	
	mapClick = "property",      // switch that determines if its ok to do a map identify
	printLegend,           // the currently selected basemap, used to pass to print map
	propPhotoGallery,
	lastSearch = null;
	
// Document Ready
require ( [ 
	"esri/geometry/Extent",
	"esri/map",
	"dijit/form/ToggleButton",
	"dojo/domReady!" ], function ( Extent, Map, ToggleButton ) {
	
	// Constants
	esri.config.defaults.io.proxyUrl = config.arcgisserver_proxy;
	esri.config.defaults.io.alwaysUseProxy = true;
					
	// Initialize the map
	map = new Map ( "map", { extent: new Extent ( config.initial_extent ), minScale: config.min_scale, logo: false, zoom: 1 } );
		
	// Handle hash after layers are loaded
	map.on ( "layers-add-result", handleHash ); 
	
	// Handle hash after layers are loaded
	map.on ( "load", overlaysInit ); 
	
	// Initalize the Layer Tree Control and Legend
	map.on ( "layers-add-result", layerTreeLegendInit );
		
	// Initialize Map Layers 
	basemapInit();
	
	// Initialize Map Events
	mapEventsInit();
							
	//Initialize all Search Controls
	searchInit();
	
	//Initialize Report Issue
	issueInit();
		
	// Initialize PubSub Subscriptions
	require ( [ "dojo/_base/connect" ], function ( connect ) {

		connect.subscribe ( "/change/selected", chngSelection ); // Selected record change
		connect.subscribe ( "/add/graphics", addGraphics ); // Add graphics
		connect.subscribe ( "/set/identity", setIdentity ); // Set selected property identity information
		connect.subscribe ( "/set/characteristics", setCharacteristics ); // Set selected property identity information
		connect.subscribe ( "/set/taxinfo", setTaxInfo ); // Set selected property tax information
		connect.subscribe ( "/set/deed", setDeed ); // Set selected property deed and sales price
		connect.subscribe ( "/set/locinfo", setLocInfo ); // Set selected property location information
		connect.subscribe ( "/set/envinfo", setEnvInfo ); // Set selected property environmental information
		connect.subscribe ( "/dojo/hashchange", handleHash );
				
	} );	
				
} );

//Initialize report issue controls
function issueInit() {

	require ( [ 
		"mojo/Validate", 
		"dojo/_base/array", 
		"dojo/dom", 
		"dojo/on", 
		"dojo/query", 
		"dojo/request/xhr",
		"dojo/NodeList-manipulate" ] , function ( Validate, array, dom, on, query, xhr ) {
	
		on ( dom.byId ( "issuebtn" ), "click", function ( event ) {
		
			var errors = [];
			
			query ( "#issueerror" ).empty ( );
		
			if ( query ( "#issuename" ).val ( ).length === 0 ) {
			
				errors.push ( "Name required" );
			
			}
		
			if ( !Validate.isEmail ( query ( "#issueemail" ).val() ) ) {
				
				errors.push ( "Valid Email required" );
				
			}
			
			if ( query ( "#issuedesc" ).val ( ).length === 0 ) {
			
				errors.push ( "Problem description required" );
			
			}
			
			if ( errors.length > 0 ) {
			
				array.forEach ( errors, function ( item, i ) {
				
					query ( "#issueerror" ).append ( "<div>" + ( i + 1 ) + ". " + item + "</div>" );	
				
				} );
					
			} else {
						
				var message = "The Polaris 3G issue has been reported by " +  query ( "#issuename" ).val ( ) +
					" ( " + query ( "#issueemail" ).val() + " ) : " + query ( "#issuedesc" ).val ( ),
					subject = "Polaris 3G Bug reported by " + query ( "#issuename" ).val ( );
			
				xhr ( config.web_service_local + "send_email.php", {
					data: 	{ 
						"to" : "lakshmanan.krishnan@mecklenburgcountync.gov", 
						"subject": subject, 
						"message" : message,
						"success": "The issue was reported successfully.",
						"failure": "An error occured. Try again."	
					},
					method: "POST"
				} ).then ( function ( data ) {
				
					query ( "#issueerror" ).innerHTML ( data );
					query ( "#issuename" ).val ( " " );
					query ( "#issueemail" ).val ( " " );
					query ( "#issuedesc" ).val ( " " );
									
				} );
			
			}

		} );
		
		on ( dom.byId ( "issueclear" ), "click",function ( event ) {
		
			query ( "#issuename" ).val ( " " );
			query ( "#issueemail" ).val ( " " );
			query ( "#issuedesc" ).val ( " " );
			query ( "#issueerror" ).empty ( );
		
		} );
		
		on ( dom.byId ( "issueclose" ), "click", showIssueForm );
	
	} );
	
}

//Set hash
function chngSelection ( data ) {

	if ( !selectedAddress.hasOwnProperty( "taxpid" ) ||
		( selectedAddress.matid != data.matid || 
			selectedAddress.taxpid != data.taxpid || 
			selectedAddress.groundpid != data.groundpid ) ) { 
				
		require ( [ 
			"dojo/hash", 
			"dojo/io-query", 
			"dojo/_base/lang",
			"dojo/query",
			"dojo/request/script",
			"dojo/NodeList-manipulate" ], function ( Hash, ioQuery, lang, query, script ) {
				
			//store selected address
			lang.mixin ( selectedAddress, data );
						
			//set hash
			Hash ( ioQuery.objectToQuery ( { mat: data.matid, pid: data.taxpid, gisid: data.groundpid } ) );
			
			map.infoWindow.hide();
										
		} );
	
	}
		
}

//Set property information
function setIdentity ( data ) {

	require ( [ 
		"mojo/Format",
		"mojo/PhotoGallery",
		"mojo/Validate",
		"dojo/_base/array", 
		"dojo/_base/lang",
		"dojo/dom",
		"dojo/dom-attr",
		"dojo/io-query", 
		"dojo/on",
		"dojo/query",
		"dojo/request/script", 
		"dojo/NodeList-manipulate" ] , function ( Format, PhotoGallery, Validate, array, lang, dom, domAttr, ioQuery, on, query, script ) {
				
			//add identity information
			query ( "#identity" ).innerHTML ( 
				Format.objectAsTable ( [ { "Parcel ID": data.taxpid, "GIS ID": data.groundpid } ], "proptbl", false ) );
			
			//add address information
			if ( data.groundpid == data.taxpid ) { //get other address points associated with ground parcel
			
				script.get( config.web_service_rest + "v2/ws_geo_featureoverlay.php", {
					jsonp: "callback",
					query: 
					{
						from_table: "tax_parcels",
						to_table: "master_address_table",
						fields: "t.objectid as matid,t.num_parent_parcel as parcel_id,t.full_address as address", 
						parameters: "f.pid='" + data.groundpid + "'"
					}
				} ).then ( function ( matdata ) {
		
					if ( matdata.length > 1 ) {
					
						var addrhtml = "";
				
						array.forEach ( matdata, function ( item, i ) {
						
							if ( item.parcel_id == data.taxpid ) {
								addrhtml += "<option value='" + item.matid + "|" + item.address + "' " + ( ( item.matid == data.matid ) ? "selected='selected'" : "" ) + ">" + 
									( ( lang.trim ( item.address ).length > 0 ) ? item.address : "Unavailable" ) + "</option>";
							}
						
						} );
						
						if ( lang.trim ( addrhtml ).length > 0 ) {
							addrhtml = "<select id='matlist' class='max'>" +
								addrhtml + "</select>";
							
							query ( "#address" ).innerHTML ( 
								Format.objectAsTable ( [ { "Addresses located on Property": addrhtml } ], "proptbl", false ) );							
								
							//on identify layer list change
							on ( dom.byId ( "matlist" ), "change", function ( event ) {
							
								var tempArr = event.target.value.split( "|" );
								finder ( {
									"matid": tempArr[ 0 ], 
									"address": tempArr[ 1 ], 
									"groundpid": selectedAddress.groundpid, 
									"taxpid": selectedAddress.taxpid, 
									"y": selectedAddress.y, 
									"x": selectedAddress.x
								}, "searchresults" );	
								
							} );	
								
						} else {
						
							query ( "#address" ).innerHTML ( 
								Format.objectAsTable ( [ { "Address located on Property": data.address } ], "proptbl", false ) );
							
						}	
					
					} else { 
					
						query ( "#address" ).innerHTML ( 
							Format.objectAsTable ( [ { "Address located on Property": data.address } ], "proptbl", false ) );
						
					}	
								
				} );
			
			} else {
			
				query ( "#address" ).innerHTML ( 
					Format.objectAsTable ( [ { "Address located on Property": data.address } ], "proptbl", false ) );
			
			}
			
			//add ownership information
			script.get( config.web_service_rest + "v2/php-cgi/ws_cama_ownership.php", {
				jsonp: "callback",
				query: 
				{
					pid: data.taxpid,
					pidtype: "tax",
					format: "json"
				}
			} ).then ( function ( camadata ) {
			
				if ( camadata.total_rows > 0 ) {
				
					//format the owner name
					var owners = [];
						
					array.forEach ( camadata.rows, function ( item, i ) {
								
						owners.splice ( parseInt ( item.row.owner_number, 10 ) - 1, 0, { 
							"Owner Name": Format.ownership ( [ item.row.last_name, item.row.first_name ] ), 
							"Mailing Address": Format.trimNconcat ( [ 
								{ val: Format.nullToEmpty ( item.row.address_1 ), appnd: " " },
								{ val: Format.nullToEmpty ( item.row.address_2 ), appnd: "<br/>" },
								{ val: Format.nullToEmpty ( item.row.city ), appnd:" " },
								{ val: Format.nullToEmpty ( item.row.state ), appnd:" " },
								{ val: Format.nullToEmpty ( item.row.zipcode ), appnd:"" } 
							] ) 
						} );
					
					} );
					
					query ( "#ownership" ).innerHTML ( Format.objectAsTable ( owners , "proptbl", false ) ) ;
					
				} else	{
				
					query ( "#ownership" ).innerHTML ( "" ) ;
				
				}
			
			} );
			
			//add owners tied to property
			if ( data.taxpid !== data.groundpid ) {
			
				query ( "#tiedtoowner" ).innerHTML ( 
					Format.objectAsTable ( [ 
						{ 
							"Supplementary Information": "<span class='note'>Additional Owners, Leaseholds, Condo Complex Areas may be present on this selected Tax Parcel.</span>" 
						}, { 
							"Supplementary Information": "<a href='javascript:void(0);' onclick='lastSearch = \"tiedowners\";finder ( {groundpid:\"" + data.groundpid + "\"}, \"searchresults\" );'>Other Owners tied to Parcel</a>" 
						} 
					], "proptbl", false ) );
				
				query ( "#tiedtoowner" ).removeClass ( "hidden" );
									
			} else {
			
				query ( "#tiedtoowner" ).addClass ( "hidden" );
				
			}
						
			//add property photo
			if ( propPhotoGallery ) {			
				
				propPhotoGallery.reset();
			
			} else {
			
				propPhotoGallery = new PhotoGallery ( ).placeAt ( dom.byId ( "photo" ) );
				propPhotoGallery.startup();
			
			}			
				
			script.get ( config.web_service_rest + "v1/ws_misc_house_photos.php", {
				jsonp: "callback",
				query: { pid : data.taxpid }
			} ).then ( function ( camadata ) {
			
				var hasPhoto = false;
						
				if ( camadata.total_rows > 0 ) {
								
					array.forEach ( camadata.rows, function ( item, i ) {
				
						if ( lang.trim ( item.row.photo_url ).length > 0 ) {
						
							//if the property photo exisits at the location add it
							Validate.imageExists ( item.row.photo_url, function ( exists ) {
							
								if ( exists ) {
									
									var imgdate = item.row.photo_date;
									propPhotoGallery.addPhoto ( { 
										url: item.row.photo_url, 
										title: "Photo Date: " + imgdate.substring ( 4, 6 ) + "/" + 
												imgdate.substring ( 6, 8 ) + "/" + imgdate.substring ( 0, 4 ) + 
												"  Source: " + item.row.attribution 
									} );
									
									if ( !hasPhoto ) {
									
										setShare ( lang.mixin ( data, { photo: item.row.photo_url } ) );
										hasPhoto = true;

									}									
																																	
								} else {
								
									if ( ( i === camadata.total_rows - 1 ) && ( !hasPhoto ) ) {
									
										setShare ( lang.mixin ( data, { photo: "http://mapserver.mecklenburgcountync.gov/polaris3g/image/serenehouse.jpg" } ) );
																			
									}
								
								} 
																
							} );
													
						}
						
					} );
					
				} else {
				
					setShare ( lang.mixin ( data, { photo: "http://mapserver.mecklenburgcountync.gov/polaris3g/image/serenehouse.jpg" } ) );
				
				} 
														   
			} );
			
			//set link for property report
			domAttr.set ( "clickpropreport", "href", "php/propreport.php?mat=" + ( selectedAddress.matid ? selectedAddress.matid : "" ) +
				"&pid=" + ( selectedAddress.taxpid ? selectedAddress.taxpid : "" ) + 
				"&gisid=" + ( selectedAddress.groundpid ? selectedAddress.groundpid : "" ) ); 
				
			//set links
			query ( "#idlinks" ).innerHTML ( Format.objectAsTable ( [
					{ 
						"Link To": "<a href='http://maps.co.mecklenburg.nc.us/meckscope/gscope.html?lat=" + data.lat + "&lon=" + data.lon + 
							( data.address === "NA" ? "" : "&address=" + data.address ) + "' target='_blank' );>Google Street View</a>"
					}, { 
						"Link To": "<a href='http://maps.co.mecklenburg.nc.us/meckscope/?lat=" + data.lat + "&lon=" + data.lon   
							+ "' target='_blank' );>2014 Birdseye View maintained by Mecklenburg County</a>"
					}
				] , "proptbl", false ) ) ;	
							
	} );
				
}

function setShare ( data ) {

	require ( [ 
		"mojo/Format",
		"dojo/io-query", 
		"dojo/query",
		"dojo/request/script", 
		"dojo/NodeList-manipulate" ] , function ( Format, ioQuery, query, script ) {
		
			var url = "http://mapserver.mecklenburgcountync.gov/polaris3g/#"  + ioQuery.objectToQuery ( { mat: data.matid, pid: data.taxpid, gisid: data.groundpid } );
			
			//get tiny url
			script.get ( "https://api-ssl.bitly.com/v3/shorten", {
				jsonp: "callback",
				query: 
				{
					"access_token": "ab7fc23d07b8edd659169a63f19e9fe2b9fdceb1",
					"longurl": url,
					"format": "json"
				}
			} ).then ( function ( result ) {
			
				query ( "#share" ).innerHTML ( Format.objectAsTable ( [
					{ 
						"Share": "<a href='http://www.facebook.com/sharer.php?u=" + result.data.url + "'&t='Polaris3G' target='_blank'> <img src='image/facebook.png' style='width:28px; height:28px; border:0;' /></a>" +
								 "&nbsp;&nbsp;&nbsp;<a href='https://twitter.com/share?url=" + result.data.url + "&text=" + encodeURIComponent ( "Details on Property #PID" + 
								 data.taxpid + " in #MecklenburgCountyNC on #Polaris3G" ) + "' target='_blank'><img src='image/twitter.png' style='width:28px; height:28px; border:0;' /></a>" +
								 "&nbsp;&nbsp;&nbsp;<a href='https://plus.google.com/share?url=" + result.data.url + "' target='_blank'><img src='image/google_plus.png' style='width:28px; height:28px; border:0;' /></a>" +
								 "&nbsp;&nbsp;&nbsp;<a href='//www.pinterest.com/pin/create/button/?url=" + encodeURIComponent ( url ) +
									"&media=" + encodeURIComponent( data.photo ) + 
									"&description=" + encodeURIComponent ( ( data.address === "NA" ? "" : "Address: " + data.address ) + ", Parcel ID: " + data.taxpid + ", GIS ID: " + data.groundpid  ) + 
									"' target='_blank' data-pin-do='buttonPin' data-pin-config='above' data-pin-color='red' data-pin-height='28'>" + 
									"<img src='//assets.pinterest.com/images/pidgets/pinit_fg_en_rect_red_28.png' /></a>"
					}, { 
						"Share": "<input type='text' class='max' value='" + result.data.url + "' onClick='this.select();' />"
					}
				] , "proptbl", false ) ) ;

			} );
		
	} );	
			
}

function setCharacteristics ( data ) {

	require ( [ 
		"mojo/Format",
		"mojo/Validate",
		"dojo/promise/all",
		"dojo/Deferred",
		"dojo/request/script", 
		"dojo/_base/array", 
		"dojo/_base/lang", 
		"dojo/query",
		"dojo/NodeList-manipulate" ] , function ( Format, Validate, all, Deferred, script, array, lang, query ) {
		
		all ( [

			script.get ( config.web_service_rest + "v2/php-cgi/ws_cama_legal.php", {
				jsonp: "callback",
				query: 
				{
					pid: data.taxpid,
					pidtype: "tax",
					format: "json"
				}
			} ),
			
			script.get ( config.web_service_rest + "v3/ws_cama_landuse.php", {
				jsonp: "callback",
				query: { pid: data.taxpid }
			} ),
			
			script.get( config.web_service_rest + "v3/ws_geo_attributequery.php", {
				jsonp: "callback",
				query: 
				{
					"table": "tax_parcels",
					"fields": "ST_Area ( the_geom ) As sqft",
					"parameters": "pid='" + data.groundpid + "'"
				}
			} )
			
			] ).then ( function ( results ) {
			
				var legaldata = results[ 0 ],
					landusedata = results[ 1 ],
					parceldata = results[ 2 ],
					info = {},
					landuseArr = [],
					landuse_unit = null,
					landuse_type = null;
					
				if ( landusedata.length > 0 ) {
				
					array.forEach ( landusedata, function ( item, i ) {	landuseArr.push ( item.land_use ); } );
					landuse_unit = 	landusedata[ 0 ].units;
					landuse_type = 	landusedata[ 0 ].land_unit_type;
					
					//set neighboorhood code in the market analysis form
					query ( "#neighborcode" ).val ( landusedata[ 0 ].neighborhood_code );
				
				} else {
				
					//set neighboorhood code in the market analysis form
					query ( "#neighborcode" ).val ( "" );
								
				}	
										
				if ( legaldata.total_rows > 0 ) {
											
					info[ "Legal Desc" ] = Format.legalDesc ( legaldata.rows[ 0 ].row.legal_description );
					info["Land Area" ] = Format.landArea ( landuse_unit, landuse_type, legaldata.rows[ 0 ].row.total_acres, 
						( parceldata.length > 0 ? ( parceldata[ 0 ].sqft / 43650 ) : null ) );
					info[ "Fire District" ] = Format.ucwords ( legaldata.rows[ 0 ].row.fire_district.toLowerCase() );
					info[ "Special District" ] = ( legaldata.rows[ 0 ].row.special_district ? Format.ucwords ( legaldata.rows[ 0 ].row.special_district.toLowerCase() ) : "NA" );
					info[ "Account Type" ] = Format.ucwords ( legaldata.rows[ 0 ].row.account_type.toLowerCase() );
					info[ "Municipality" ] = Format.ucwords ( legaldata.rows[ 0 ].row.municipality.toLowerCase() );
					info[ "Land Use" ] = Format.ucwords ( Format.arrayToNumList ( landuseArr ).toLowerCase() );
														
					query ( "#characteristics" ).innerHTML ( Format.objectAsTable ( info , "proptbl", true ) ) ;
					
				}	
												
			} );	
		
	} );	

}

function setTaxInfo ( data ) {

	require ( [ 
		"mojo/Format",
		"dojo/query",
		"dojo/NodeList-manipulate" ] , function ( Format, query ) {
		
		var links = [
			{ 
				"Link To": "<a href='http://meckcama.co.mecklenburg.nc.us/RELookup/Property/Print?parcelId=" + 
					data.taxpid + "' target='_blank'>Tax Values & Building Information</a>"
			}, { 
				"Link To": "<a href='http://taxbill.co.mecklenburg.nc.us/publicwebaccess/BillSearchResults.aspx?ParcelNum=" + 
					data.taxpid + "' target='_blank'>Tax Bill Information</a>"
			}
		];
		query ( "#taxlinks" ).innerHTML ( Format.objectAsTable ( links , "proptbl", false ) ) ;
	
	} );

}

function setDeed ( data ) {

	require ( [ 
		"mojo/Format",
		"dojo/currency",
		"dojo/request/script", 
		"dojo/query",
		"dojo/NodeList-manipulate" ] , function ( Format, localeCurrency, script, query ) {
		
		script.get( config.web_service_rest + "v2/php-cgi/ws_cama_saleshistory.php", {
			jsonp: "callback",
			query: 
			{
				pid: data.taxpid,
				pidtype: "tax",
				format: "json"
			}
		} ).then ( function ( camadata ) {
		
			if ( camadata.total_rows > 0 ) {
			
				var info = [],
					links = [
						{ "Link To": "<a href='http://meckrod.manatron.com' target='_blank'>Recorded Deeds and Maps (03/01/1990 to Current)</a>" }, 
						{ "Link To": "<a href='http://meckrodindex.com/oldindexsearch.php' target='_blank'>Recorded Deeds and Maps (02/28/1990 and Prior)</a>" }
					];
			
				for ( var i = camadata.rows.length-1; i >= 0; i-- ) { //descending order
					
					var deedArr = camadata.rows[i].row.deed_book.split ( " " );
					
					info.push ( { 
						Deed: Format.deed ( ( deedArr.length === 2 ? deedArr[ 0 ] : "" ), ( deedArr.length === 2 ? deedArr[ 1 ] : "" ), camadata.rows[i].row.sale_date ), 
						"Sale Date":  camadata.rows[i].row.sale_date,
						"Sale Price": localeCurrency.format ( camadata.rows[i].row.sale_price, { currency: "USD" } ) 
					} );
				
				}
				
				query ( "#deed" ).innerHTML ( Format.objectAsTable ( info , "proptbl", false ) ) ;
				query ( "#deedlinks" ).innerHTML ( Format.objectAsTable ( links , "proptbl", false ) ) ;
							
			}	
		
		} );
				
	} );	

}

function setLocInfo ( data ) {

	require ( [ 
		"esri/tasks/IdentifyTask",
		"esri/tasks/IdentifyParameters",
		"esri/geometry/Point",
		"esri/SpatialReference",
		"mojo/Format",
		"dojo/_base/array", 
		"dojo/request/script", 
		"dojo/promise/all",
		"dojo/Deferred",
		"dojo/query",
		"dojo/NodeList-manipulate" ] , function ( IdentifyTask, IdentifyParameters, Point, SpatialReference,
			Format, 
			array, script, all, Deferred, query ) {
			
		var overlayIdentifyService =  new IdentifyTask ( config.overlay_services.overlays_streets.url ),		
			oidParams = IdentifyParameters();
			oidParams.tolerance = 0;
			oidParams.returnGeometry = false;
			oidParams.layerIds = [ 18, 21, 25, 34 ];
			oidParams.layerOption = IdentifyParameters.LAYER_OPTION_ALL;
			oidParams.geometry = new Point ( data.x, data.y, new SpatialReference ( config.initial_extent.spatialReference ) );
			oidParams.mapExtent = map.extent;
		
		all ( [
	
			script.get( config.web_service_rest + "v2/ws_geo_pointoverlay.php", {
				jsonp: "callback",
				query: 
				{
					x: data.x,
					y: data.y,
					srid: "2264",
					table: "neighborhoods",
					fields: "id as code"
				}
			} ),

			//find sphere of influence, historic district, annexation areas, census tract
			overlayIdentifyService.execute ( oidParams )			
			
		] ).then ( function ( results ) {
				
			var tempArr = [ ],
				info = {},
				links = [ ],
				toggles = [
					{ 
						"Toggle Related Overlays": "<input type='checkbox' id='zone2' onclick= 'switchOnOffOverlay ( \"overlays\", \"zone\", this.checked );' >Zoning</input>"
					}
				];
			
			array.forEach ( results[1], function ( item, i ) { tempArr.push( item.layerName ); } );
			
			//add sphere of influence info
			if ( array.indexOf ( tempArr, "Sphere of Influence" ) > -1 ) {
			
				info[ "ETJ Area" ] = results[ 1 ][ array.indexOf ( tempArr, "Sphere of Influence" ) ].feature.attributes.name;
			
			} 
			
			//add historic district info
			info[ "Charlotte Historic District" ] = ( array.indexOf ( tempArr, "Hist Districts" ) > -1 ? "Yes" : "No"  )
			
			//add annexation area info
			info[ "Charlotte 6/30/2011 Annexation Area" ] = ( array.indexOf ( tempArr, "Annex Areas" ) > -1 ? "Yes" : "No"  )
			
			//add census tract info
			if ( array.indexOf ( tempArr, "Census Tracts" ) > -1 ) {
			
				info[ "Census Tract No" ] = results[ 1 ][ array.indexOf ( tempArr, "Census Tracts" ) ].feature.attributes.name10;
			
			} 
							
			//add location links
			if ( data.matid ) {
				
				//home schools
				links.push ( {
					"Link To": "<a href='http://maps.co.mecklenburg.nc.us/geoportal/?matid=" + data.matid + 
						"&q=schools-home' target='_blank' );>Home School Assignment</a>"
				} );
				
				//magnet schools
				links.push ( {
					"Link To": "<a href='http://maps.co.mecklenburg.nc.us/geoportal/?matid=" + data.matid + 
						"&q=schools-magnet' target='_blank' );>List of Magnet Schools</a>"
				} );
				
				//voting location
				links.push ( {
					"Link To": "<a href='http://maps.co.mecklenburg.nc.us/geoportal/?matid=" + data.matid + 
						"&q=voting' target='_blank' );>Voting Location</a>"
				} );
				
				//parks
				links.push ( {
					"Link To": "<a href='http://gis.mecklenburgcountync.gov/website/parklocator/' target='_blank' );>Park Locator</a>"
				} );
												
				//google directions
				links.push ( {
					"Link To": "<a href='http://maps.google.com/maps?daddr=" + data.address + 
						"&saddr=+' target='_blank' );>Google Directions</a>"
				} );		
			
			}
			
			//add toggle overlays
			query ( "#loctoggles" ).innerHTML ( Format.objectAsTable ( toggles , "proptbl", false ) ) ;
			
			//add quality of life link
			if ( results[ 0 ].length > 0 ) {
					
				links.push ( {
					"Link To": "<a href='http://maps.co.mecklenburg.nc.us/qoldashboard/?npa=" + results[ 0 ][ 0 ].code + 
						"' target='_blank' );>Quality of Life Dashboard</a>"
				} );
					
			}
			
			//add zoning designation list
			links.push ( {
				"Link To": "<a href='http://polaris3g.mecklenburgcountync.gov/data/ZoningDesignations.pdf'" +
					" target='_blank' );>Zoning Designations PDF</a>"
			} );
			
			query ( "#locinfo" ).innerHTML ( Format.objectAsTable ( info, "proptbl", true ) ) ;
			query ( "#loclinks" ).innerHTML ( Format.objectAsTable ( links, "proptbl", false ) );
										
		} );

		//add situs address
		script.get( config.web_service_rest + "v2/php-cgi/ws_cama_situsaddress.php", {
			jsonp: "callback",
			query: 
			{
				pid: data.taxpid,
				pidtype: "tax",
				format: "json"
			}
		} ).then ( function ( camadata ) {
		
			if ( camadata.total_rows > 0 ) {
			
				var addrs = [];
				
				array.forEach ( camadata.rows, function ( item, i ) {
				
					addrs.push ( 
						Format.ucwords ( Format.trimNconcat ( [ 
							{ val: item.row.house_number, appnd: " " },
							{ val: item.row.prefix, appnd: " " },
							{ val: item.row.street_name, appnd:" " },
							{ val: item.row.road_type, appnd:" " },
							{ val: item.row.suffix, appnd:" " },
							{ val: item.row.unit, appnd:"" }
						] ).toLowerCase() )
					);
					
				} );
				
				query ( "#situsaddress" ).innerHTML ( Format.objectAsTable ( [ { 
					"Tax Situs Addresses tied to Parcel": Format.arrayToNumList ( addrs ) 
				} ], "proptbl", false ) ) ;
				
											
			} 	
		
		} );		
				
	} );	

}

function setEnvInfo ( data ) {

require ( [ 
		"esri/tasks/IdentifyTask",
		"esri/tasks/IdentifyParameters",
		"esri/geometry/Point",
		"esri/SpatialReference",
		"mojo/Format",
		"dojo/_base/array",
		"dojo/request/script", 
		"dojo/promise/all",
		"dojo/Deferred",
		"dojo/query",
		"dojo/NodeList-manipulate" ] , function ( IdentifyTask, IdentifyParameters, Point, SpatialReference,
			Format, 
			array, script, all, Deferred, query ) {
		
		var info = {},
			links = [
				{ 
					"Link To": "<a href='http://mapserver.mecklenburgcountync.gov/3dfz/#taxpid=" + data.taxpid + 
						"' target='_blank' );>Flood Zone Information</a>"
				}, { 
					"Link To": "<a href='http://maps.co.mecklenburg.nc.us/geoportal/?matid=" + data.matid + 
						"&q=env-water' target='_blank' );>Water Information</a>"
				}, { 
					"Link To": "<a href='http://maps.co.mecklenburg.nc.us/geoportal/?matid=" + data.matid + 
						"&q=env-land' target='_blank' );>Land Information</a>"
				}, { 
					"Link To": "<a href='http://maps.co.mecklenburg.nc.us/geoportal/?matid=" + data.matid + 
						"&q=env-air' target='_blank' );>Air Information</a>"
				}, { 
					"Link To": "<a href='http://charmeck.org/stormwater/regulations/Pages/SWIMOrdinances.aspx'" +
						" target='_blank' );>Surface Water Improvement and Management (SWIM) Ordinances</a>"
				}, { 
					"Link To": "<a href='http://charmeck.org/stormwater/regulations/Pages/Post-ConstructionStormWaterOrdinances.aspx'" +
						" target='_blank' );>Post-Construction Storm Water Ordinances</a>"
				}				
				/*{ 
					"Link To": "<a href='http://charmeck.org/mecklenburg/county/WaterandLandResources/Conservation/Documents/IndextoMapUnits.pdf'" +
						" target='_blank' );>Soil Type Descriptions</a>"
				}*/
			],
			toggles = [
				{ 
					"Toggle Related Overlays": "<input type='checkbox' id='wtrqulbuff2' onclick= 'switchOnOffOverlay ( \"overlays_trans\", \"wtrqulbuff\", this.checked );' >Water Quality Buffers</input>"
				}, { 
					"Toggle Related  Overlays": "<input type='checkbox' id='postconstdist2' onclick= 'switchOnOffOverlay ( \"overlays\", \"postconstdist\", this.checked );' >Post Construction Districts</input>"
				}, { 
					"Toggle Related  Overlays": "<input type='checkbox' id='postconstbuff2' onclick= 'switchOnOffOverlay ( \"overlays_trans\", \"postconstbuff\", this.checked );' >Post Construction Buffers</input>"
				},{ 
					"Toggle Related Overlays": "<input type='checkbox' id='fldp2' onclick= 'switchOnOffOverlay ( \"overlays_trans\", \"fldp\", this.checked );' >FEMA and Community Floodplain</input>"
				}, { 
					"Toggle Related Overlays": "<input type='checkbox' id='strmwtrsheds2' onclick= 'switchOnOffOverlay ( \"overlays\", \"strmwtrsheds\", this.checked );' >Stream Watersheds</input>"
				}, { 
					"Toggle Related Overlays": "<input type='checkbox' id='drnkwtrsheds2' onclick= 'switchOnOffOverlay ( \"overlays\", \"drnkwtrsheds\", this.checked );' >Regulated Drinking Watersheds</input>"
				}, { 
					"Toggle Related Overlays": "<input type='checkbox' id='soils2' onclick= 'switchOnOffOverlay ( \"overlays\", \"soils\", this.checked );' >Soils</input>"
				}
			],
					
			overlayIdentifyService =  new IdentifyTask ( config.overlay_services.overlays_streets.url ),		
			oidParams = IdentifyParameters();
			oidParams.tolerance = 0;
			oidParams.returnGeometry = false;
			oidParams.layerIds = [ 17, 35, 48 ];
			oidParams.layerOption = IdentifyParameters.LAYER_OPTION_ALL;
			oidParams.geometry = new Point ( data.x, data.y, new SpatialReference ( config.initial_extent.spatialReference ) );
			oidParams.mapExtent = map.extent,
			
			floodzoneIdentifyService =  new IdentifyTask ( config.identify_services.floodzone.url ),		
			fidParams = IdentifyParameters();
			fidParams.tolerance = 0;
			fidParams.returnGeometry = false;
			fidParams.layerIds = [ 14 ];
			fidParams.layerOption = IdentifyParameters.LAYER_OPTION_ALL;
			fidParams.geometry = new Point ( data.x, data.y, new SpatialReference ( config.initial_extent.spatialReference ) );
			fidParams.mapExtent = map.extent;
		
		all ( [

			//check if parcel intersects water quality buffer
			script.get ( config.web_service_rest + "v2/ws_geo_featureoverlay.php", {
				jsonp: "callback",
				query: 
				{
					from_table: "tax_parcels",
					to_table: "water_quality_buffers",  
					fields: "t.gid",
					parameters: "f.pid='" + data.groundpid + "'"
				}
			} ),
			
			script.get ( config.web_service_rest + "v2/ws_geo_featureoverlay.php", {
				jsonp: "callback",
				query: 
				{
					from_table: "tax_parcels",
					to_table: "fema_floodplain_changes",  
					fields: "t.gid",
					parameters: "f.pid='" + data.groundpid + "'"
				}
			} ),
				
			script.get( config.web_service_rest + "v2/ws_geo_featureoverlay.php", {
				jsonp: "callback",
				query: 
				{
					from_table: "tax_parcels",
					to_table: "lomr_floodplain_changes", 
					fields: "t.gid",
					parameters: "f.pid='" + data.groundpid + "'"
				}
			} ),
			
			//find fema panel index
			floodzoneIdentifyService.execute ( fidParams ),
			
			//find post construction district, stream watershed, drinking watershed
			overlayIdentifyService.execute ( oidParams )
					
		] ).then ( function ( results ) {
		
			//set Water Quality Buffer information		
			info[ "Inside Water Quality Buffer" ] = ( results[ 0 ].length > 0 ? "Yes" : "No" );
						
			//set Floodzone info
			info[ "Inside FEMA Flood Zone" ] = ( results[ 1 ].length > 0 ? "<a href='http://mapserver.mecklenburgcountync.gov/3dfz/#taxpid=" + data.taxpid + "' target='_blank' );>Yes</a>" : "No" );
			info[ "Inside Community Flood Zone" ] = ( results[ 2 ].length > 0 ? "<a href='http://mapserver.mecklenburgcountync.gov/3dfz/#taxpid=" + data.taxpid + "' target='_blank' );>Yes</a>" : "No" );
			
			//set FEMA Panel and Date
			if ( results[ 3 ].length > 0 ) {
			
				var effdate = results[ 3 ][ 0 ].feature.attributes.EFF_DATE.split("/"),
					filename = results[ 3 ][ 0 ].feature.attributes.FIRM_PAN + 
						( effdate[ 2 ] + Format.leftPad ( effdate[ 0 ], 2 ) + Format.leftPad ( effdate[ 1 ], 2 ) );
				
				info[ "FEMA Panel No" ] = "<a href='ftp://ftp1.co.mecklenburg.nc.us/luesa/stormwater/Floodplain%20Mapping/Effective%20Data/FIRM%20Panels/" 
					+ filename + ".pdf' target='_blank'>" + results[ 3 ][ 0 ].feature.attributes.FIRM_PAN + "</a>";
				info[ "FEMA Panel Date" ] = Format.leftPad ( effdate[ 0 ], 2 ) + "/" + 
					Format.leftPad ( effdate[ 1 ], 2 ) + "/" + effdate[ 2 ];
															
			} else {
			
				info[ "FEMA Panel No" ] = "NA";
			
			}
												
			//set watershed info
			if ( results[ 4 ].length > 0 ) {
						
				array.forEach ( results[ 4 ], function ( item, i ) {
				
					switch ( item.layerName ) {
					
						case "Post Const Dist":
							info[ "Post Construction District" ] = Format.ucwords ( item.feature.attributes.district.toLowerCase() );
							break;
					
						case "Watershed":
							info[ "Stream Watershed Name" ] = Format.ucwords ( item.feature.attributes.name.toLowerCase() );
							break;
							
						case "Regulated Drinking Watershed":
							info[ "Has limit on amount of Built-Upon Area" ] = "<a href='http://charmeck.org/stormwater/regulations/Documents/DeterminingBUA1114.pdf' target='_blank'>Yes</a>";
							info[ "Regulated Drinking Watershed Name" ] = Format.ucwords ( item.feature.attributes.name.toLowerCase() );
							info[ "Regulated Drinking Watershed Class" ] = item.feature.attributes.subarea;
							break;
											
					}
			
				} );
						
				query ( "#envinfo" ).innerHTML ( Format.objectAsTable ( info, "proptbl", true ) ) ;
				
			}	
			
		} );
		
		//add toggle overlays
		query ( "#envtoggles" ).innerHTML ( Format.objectAsTable ( toggles , "proptbl", false ) ) ;
		
		
		//add links
		query ( "#envlinks" ).innerHTML ( Format.objectAsTable ( links , "proptbl", false ) ) ;
		
				
	} );	

}

function toggleNav ( nav, show ) {

	require ( [ "dojo/query", "dojo/NodeList-manipulate" ] , function ( query ) {

		if ( show ) {
		
			query ( "#" + nav ).removeClass ( "hidden" );
	
		} else {
		
			query ( "#" + nav ).addClass ( "hidden" );
		
		}
			
	} );

}

function showDiv ( cont ) {

	require ( [ "dojo/dom", "dojo/query", "dojo/window", "dojo/NodeList-manipulate" ] , function ( dom, query, win ) {
				
		var viewport = win.getBox ( );		
				
		//show requested div in data main
		query ( "div#datamain>div" ).addClass ( "hidden" );	
		query ( "#" + cont ).removeClass ( "hidden" );
				
		//Set nav
		toggleNav ( "navredoanalysis", ( cont === "searchresults" && lastSearch === "mrktanalysis" ? true : false ) );
		toggleNav ( "navredoadvsearch", ( cont === "searchresults" && ( lastSearch === "adv" || lastSearch === "buffer" ) ? true : false ) );
		toggleNav ( "navsrchresults", ( cont !== "searchresults" ? true : false ) );
		toggleNav ( "navpropdetails", ( cont !== "propdetails" && selectedAddress.hasOwnProperty ( "taxpid" ) ? true: false ) );
		toggleNav ( "navpropinforeport", ( cont === "searchresults" && ( lastSearch === "buffer" || lastSearch === "mrktanalysis" ) ? true : false ) );
		toggleNav ( "navpropreport", ( cont === "propdetails" && selectedAddress.hasOwnProperty ( "taxpid" ) ? true : false ) );
		toggleNav ( "navdeedreport", ( cont === "searchresults" && ( lastSearch === "buffer" || lastSearch === "mrktanalysis" ) ? true : false ) );
		toggleNav ( "navdeedcsv", ( cont === "searchresults" && ( lastSearch === "buffer" || lastSearch === "mrktanalysis" ) ? true : false ) );
		toggleNav ( "navlayers", ( cont !== "layers" ? true : false ) );
		toggleNav ( "navdictionary", ( cont === "layers" ? true : false ) );
		toggleNav ( "navlegend", ( cont === "layers" ? true : false ) );
		toggleNav ( "navzoomprop", ( cont === "propdetails" && parcelGraphic ? true : false ) );
				
		//hide progress animated gif
		if ( cont === "idlayers" || cont === "poi" || cont === "propdetails" || cont === "searchresults" ) {
		
			query ( ".spin" ).addClass ( "hidden" );
			query ( ".unspin" ).removeClass ( "hidden" );				
			
		}	
		
		//scroll aside in mobile devices	
		if ( viewport.w < 921 && ( cont === "advsearch" || cont === "marketanalysis" || cont === "searchresults" ) ) {
		
			win.scrollIntoView ( dom.byId ( "aside" ) );
		
		}
							
	} );	

}

function showTip ( type ) {

	require ( [ "dojo/query", "dojo/NodeList-manipulate" ] , function ( query ) {

		var htmlstr = "<img src='image/tip.png' />"

		switch ( type ) {
			
			case "locsearch":
				htmlstr += "Click or touch the map to select a Property nearby.";
				break;
				
			case "toomanylayers":
				htmlstr += "Switching on too many overlays slows down the map.";
				break;
				
		}
		
		query ( "#tip" ).innerHTML ( htmlstr );
		
		//show no tip div
		query ( "#tip" ).removeClass ( "hidden" );
	
	} );

}

function showIssueForm ( ) {

	require ( [ "dojo/query", "dojo/NodeList-manipulate" ] , function ( query ) {
	
		query ( "#issueerror" ).empty ( );
		query ( "#issue" ).toggleClass ( "hidden" );
								
	} );

}

function showMap() {

	require ( [ "dojo/query", "dojo/NodeList-manipulate" ] , function ( query ) {
	
		query ( "#aside" ).addClass ( "hidden" );
		query ( "#showmaplink" ).addClass ( "hidden" );
		query ( "#showdatalink" ).removeClass ( "hidden" );
			
	} );

}

function toggleMrktAnalysis() {

	require ( [ "dojo/query", "dojo/NodeList-manipulate" ] , function ( query ) {
	
		query ( "#advsearch, #searchhelp" ).addClass ( "hidden" );
	
		query ( "#mrktanlys" ).toggleClass ( "hidden" );
		
	} );

}

function toggleSearchHelp() {

	require ( [ "dojo/query", "dojo/NodeList-manipulate" ] , function ( query ) {
	
		query ( "#searchhelp" ).toggleClass ( "hidden" );
		
	} );

}

//guess the best possible pid that would be used in the master address table
function guessPIDinMAT ( taxpid, groundpid ) {
	
	var pid;
	
	require ( [ "mojo/Validate" ] , function ( Validate ) {
	
		if ( Validate.is8Number ( taxpid ) ) {
		
			pid = taxpid;
		
		} else if ( Validate.is8Number ( groundpid ) ) {	
			
			pid = groundpid;
		
		} else {
		
			pid = taxpid.substr ( 0 , 8 );
			
		}

	} );	
			
	return pid;
	
}

function getBestMatchingAddr ( address, checkArr ) {

	var match_arr = [], retval;
	
	require ( [ "dojo/_base/array" ] , function ( array ) {
		
		for ( var i=0; i < checkArr.length; i++ ) {
		
			var match = 0;
			var temp = checkArr[ i ].split( "|" );
			for ( var j = 0; j < temp.length; j++ ) 
				match += array.indexOf ( address, temp[ j ] ) + 1;
					
			match_arr.push ( match );
			
		}
	
		retval = array.indexOf ( match_arr, Math.max.apply ( window, match_arr ) );
		
	} );	
	
	return retval;
		
}