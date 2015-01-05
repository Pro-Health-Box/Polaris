function searchInit ( ) {

	require ( [ 
		"mojo/Format",
		"esri/tasks/GeometryService",
        "esri/tasks/BufferParameters",
		"dojox/data/QueryReadStore",
		"dijit/form/ComboBox",
		"dijit/form/DateTextBox",
		"dijit/form/ValidationTextBox",
		"dojo/_base/array",
		"dojo/_base/connect",
		"dojo/_base/lang",
		"dojo/data/ItemFileWriteStore",
		"dojo/dom",
		"dojo/on",  
		"dojo/query",
		"dojo/request/script",
		"dojo/NodeList-manipulate" ], function ( Format, GeometryService, BufferParameters, 
			QueryReadStore, ComboBox, DateTextBox, ValidationTextBox,
			array, connect, lang, ItemFileWriteStore, dom, on, query, script ) {
			
		//local variables
		var mainSearch,
			situsStSrch,
			saledatefrom,
			saledateto,
			buffersrch,
			anlysStSrch;

		///////////////////////////////////////
		// 1. Initialize Main Search control //
		///////////////////////////////////////
		
		//Main search autocomplete combobox initialization
		mainSearch = new ComboBox ( {
		
			id: "mainSearch",
			queryExpr: "${0}",		
			searchAttr: "label",
			searchDelay: 400,
			autoComplete: false,
			hasDownArrow: false,
			style: "width:100%; border: none; background: #ffffff;",
			maxHeight: 300,
			placeHolder: "Enter address / parcel# / owner / landmark",
			labelFunc: Format.tagsrchresults, 
			labelType: "html",
			store: new QueryReadStore ( { 
				"url": config.web_service_rest + "v1/ws_geo_dojoubersearch.php?searchtypes=PID,GISID,Address,Owner,Intersection,Library,School,Park,CATS,Wholestname,Business" 
			} ),
			onInput: function ( event ) {
			
				if ( event.keyCode === 13 ) { 
				
					processSearch ( );
					
				} else {
				
					query ( "#searchclear" ).addClass ( "hidden" );
					query ( "#searchprogress" ).removeClass ( "hidden" );
				
				}	
		
			},
			onSearch: function ( results, qry ) { 
						
				if ( qry.label.length === 0 || results.total > 0 ) {
				
					query ( "#searchprogress" ).addClass ( "hidden" );
					query ( "#searchclear" ).removeClass ( "hidden" );
									
				}
							
			},
			onChange: processSearch
							
		} ).placeAt ( dom.byId ( "mainsearchcont" ) );
		mainSearch.startup();
		
		//Main Search go button click event
		on ( dom.byId ( "searchbtn" ), "click", function ( event ) {
		
			query ( "#searchprogress" ).addClass ( "hidden" );
			query ( "#searchclear" ).removeClass ( "hidden" );
			backupSearch ( mainSearch.get ( "value" ) );	

		} );
						
		//Main Search clear button click event  
		on ( dom.byId ( "searchclear" ), "click", function ( event ) {
		
			mainSearch.reset ( );
			
		} );
		
		//Main Search help button click event
		on ( dom.byId ( "searchhelpclose" ), "click", toggleSearchHelp );
		
		////////////////////////////////////////////////
		// 2. Initialize Situs Address Search control //
		////////////////////////////////////////////////
		
		//Situs street autocomplete combobox initialization
		situsStSrch = new ComboBox ( {
		
			id: "situsst",
			queryExpr: "${0}",		
			searchAttr: "label",
			searchDelay: 400,
			hasDownArrow: false,
			style: "width:100%; border-color: #504A52;",
			maxHeight: 300,
			placeHolder: "Street (Required)",
			store: new QueryReadStore ( { 
				"url": config.web_service_rest + "v1/ws_geo_dojoubersearch.php?searchtypes=Road" 
			} )
							
		} ).placeAt ( dom.byId ( "situsstCont" ) );
		situsStSrch.startup();
				
		//Situs Address Search go button click event
		on ( dom.byId ( "situssearchbtn" ), "click", function ( event ) {
		
			if ( query ( "#situsst" ).val ( ).length > 0 ) {
		
				finder ( {
					
					"staddrno": query ( "#situsaddrno" ).val ( ),
					"stprefix": query ( "#situsprefix" ).val ( ),
					"stname": query ( "#situsst" ).val ( ),
					"sttype": query ( "#situssttype" ).val ( ),
					"stsuffix": query ( "#situssuffix" ).val ( ),
					"stmuni": query ( "#situsmuni" ).val ( )
				
				}, "searchresults" );
				
				lastSearch = "adv";
				query ( "#situssearchprogress" ).removeClass ( "hidden" );
				query ( "#situssearcherror" ).innerHTML ( "" );
				
				
			}  else {
						
				query ( "#situssearcherror" ).innerHTML ( "Street Name required" );
			
			}	
		
		} );
		
		//Situs Address Search clear button click event
		on ( dom.byId ( "situssearchclear" ), "click", resetSitusAddressSearch );
		
		//Reset Situs Address Search form
		resetSitusAddressSearch ( );
		
		////////////////////////////////////////
		// 3. Initialize Owner Search control //
		////////////////////////////////////////
		
		//Owner Address Search go button click event
		on ( dom.byId ( "onamesearchbtn" ), "click", function ( event ) {
		
			if ( query ( "#lastname" ).val ( ).length > 0 ) {
			
				finder ( { lastname: query ( "#lastname" ).val ( ), firstname: query ( "#firstname" ).val ( ) }, "searchresults" );
				
				lastSearch = "adv";
				query ( "#onamesearchprogress" ).removeClass ( "hidden" );
				query ( "#onamesearcherror" ).innerHTML ( "" );
								
			} else {
			
				query ( "#onamesearcherror" ).innerHTML ( "Last Name / Business Name required" );
												
			}
		
		} );
		
		//Owner Search clear button click event
		on ( dom.byId ( "onamesearchclear" ), "click", resetOwnerNameSearch );

		//Reset Owner Search form
		resetOwnerNameSearch ( );
		
		/////////////////////////////////////////
		// 4. Initialize Buffer Search control //
		/////////////////////////////////////////
			
		//Buffer Search go button click event
		on ( dom.byId ( "buffersearchbtn" ), "click", function ( event ) {
				
			if ( query ( "#buffersize" ).val ( ).length > 0 ) {
			
				var buffersize = parseInt ( query ( "#buffersize" ).val ( ) );
				
					if ( buffersize && ( buffersize > 0 && buffersize < 5281 ) ) {
										
						if ( selectedAddress.hasOwnProperty ( "groundpid" ) && parcelGraphic ) {
						
							bufferSearch ( buffersize ); 
			
							lastSearch = "buffer";
							query ( "#buffersearchprogress" ).removeClass ( "hidden" );
							query ( "#buffersearcherror" ).innerHTML ( "" );
										
						} else {
						
							query ( "#buffersearcherror" ).innerHTML ( "A property should be selected" );
						
						}
										
					} else {
					
						query ( "#buffersearcherror" ).innerHTML ( "Buffer should be between 1 and 5280" );
					
					}
						
			} else {
			
				query ( "#buffersearcherror" ).innerHTML ( "Buffer Size required" );
												
			}
		
		} );
		
		//Buffer Search clear button click event
		on ( dom.byId ( "buffersearchclear" ), "click", resetBufferSearch );
		
		//Reset Buffer Search form
		resetBufferSearch ( );
		
		///////////////////////////////////////////////////
		// 5. Initialize Preliminary Plan Search control //
		///////////////////////////////////////////////////
		
		//Initialize the Preliminary Plan Search combobox
		script.get ( config.web_service_rest + "v1/ws_geo_sdeattributequery.php", {
			jsonp: "callback",
			query: { 
				"table" : "prelimplans_l", 
				"fields" : "distinct projname", 
				"parameters" : "projname != ' ' order by projname",
				"source" : "gis"
			}
		} ).then ( function ( gisdata ) {
		
			if ( gisdata.length > 0 ) {
		
				var htmlstr = "";
				
				array.forEach ( gisdata, function ( item, i ) {						
					
					htmlstr += "<option value='" + item.projname + "'>" + item.projname + "</option>";
													
				} );
				
				query ( "#prelimplansearch" ).append ( htmlstr );
											
			}		
		
		} );
		
		//Preliminary Plan Search go button click event
		on ( dom.byId ( "prelimplansearchbtn" ), "click", function ( event ) {
		
			prelimPlanSearch ( query ( "#prelimplansearch" ).val ( ) );
			
			lastSearch = "adv";
		
		} );
		
		///////////////////////////////////////////////////
		// 6. Initialize Engineering Grid Search control //
		///////////////////////////////////////////////////
		
		//Initialize the Enginering Grid Search combobox
		script.get ( config.web_service_rest + "v1/ws_geo_sdeattributequery.php", {
			jsonp: "callback",
			query: { 
				"table" : "enggrid_p", 
				"fields" : "map_sheet_no", 
				"parameters" : "1=1 order by map_sheet_no",
				"source" : "gis"
			}
		} ).then ( function ( gisdata ) {
			
			if ( gisdata.length > 0 ) {
		
				var htmlstr = "";
				
				array.forEach ( gisdata, function ( item, i ) {						
					
					htmlstr += "<option value='" + item.map_sheet_no + "'>" + item.map_sheet_no + "</option>";
													
				} );
				
				query ( "#enggridsearch" ).append ( htmlstr );
											
			}		
		
		} );
		
		//Engineering Grid Search go button click event
		on ( dom.byId ( "enggridsearchbtn" ), "click", function ( event ) {
		
			engGridSearch ( query ( "#enggridsearch" ).val ( ) );
			
			lastSearch = "adv";
					
		} );
		
		///////////////////////////////////////////
		// 7. Initialize Market Analysis control //
		///////////////////////////////////////////
		
		//Market Analysis Street search autocomplete combobox initialization
		anlysStSrch = new ComboBox ( {
		
			id: "stname",
			queryExpr: "${0}",		
			searchAttr: "label",
			searchDelay: 400,
			hasDownArrow: false,
			style: "width:100%; border-color: #504A52;",
			maxHeight: 300,
			placeHolder: "Enter Street Name",
			store: new QueryReadStore ( { 
				"url": config.web_service_rest + "v1/ws_geo_dojoubersearch.php?searchtypes=Road" 
			} )
							
		} ).placeAt ( dom.byId ( "stnameCont" ) );
		anlysStSrch.startup();
		
		//Market Analysis date textbox initialization		
		saledatefrom = new DateTextBox ( { 
			required: false, 
			type: "text", 
			placeholder: "Min",
			style: "width: 100px; border-color: #504A52; font-size: 1.1em" }, "saledatefrom" );
		
		saledateto = new DateTextBox ( { 
			required: false, 
			type: "text", 
			placeholder: "Max",
			style: "width: 100px; border-color: #504A52; font-size: 1.1em" }, "saledateto" );  	
			
		//Primary Search combobox change event	
		on ( dom.byId ( "primarysrchtype" ), "change", function ( event ) {
		
			query ( "table#mrktanlysform tr:tr:nth-child(2),table#mrktanlysform tr:nth-child(3),table#mrktanlysform tr:nth-child(4),table#mrktanlysform tr:nth-child(5)" ).addClass ( "hidden" );
			query ( "table#mrktanlysform tr:tr:nth-child("+ ( event.target.selectedIndex + 2 ) + ")" ).removeClass ( "hidden" );
					
		} );	
		
		//Property use combobox change event	
		on ( dom.byId ( "propuse" ), "change", function ( event ) {
		
			if ( query ( "#propuse" ).val ( ) === "Vacant" ) {
			
				query ( "table#mrktanlysform tr:tr:nth-child(13),tr:nth-child(14),tr:nth-child(15),tr:nth-child(16),tr:nth-child(17),tr:nth-child(18)" ).addClass ( "hidden" );
			
			} else {
			
				query ( "table#mrktanlysform tr:tr:nth-child(13),tr:nth-child(14),tr:nth-child(15),tr:nth-child(16),tr:nth-child(17),tr:nth-child(18)" ).removeClass ( "hidden" );
			
			}
							
		} );
		
		//Market Analysis go button click event
		on ( dom.byId ( "mrktanlysbtn" ), "click", function ( event ) {
		
			var data = validateMrktAnlysForm ( );
				
			if ( data.errors.length === 0 ) {	
				
				var geometryService = new GeometryService ( config.geometry_service ),
					bufferParams = new BufferParameters();
				
				if ( lang.trim ( data.params.pidbuff ) ) {
				
					//add buffer graphic to map
					//simplfy parcel polygon
					geometryService.simplify ( [ parcelGraphic.geometry ], function ( geometries ) {
					
						lang.mixin ( bufferParams, { distances: [ parseInt ( data.params.pidbuff.substr ( data.params.pidbuff.indexOf ( "|" ) + 1, data.params.pidbuff.length - 1 ) ) ], geometries: geometries } );
														
						//buffer parcel polygon
						geometryService.buffer ( bufferParams, function ( bufferGeometry ) {
						
							//add buffer graphics
							connect.publish ( "/add/graphics", { 
								graphictype: "buffer", 
								buffergeom: bufferGeometry[ 0 ], 
								removegraphics: [ "buffer", "road", "parcelpt" ], 
								zoom: false 
							} );		
							
						} );	
					
					} );
					
				}	
				
				analyzeTheMarket ( data.params );

				lastSearch = "mrktanalysis";
				query ( "#mrktanlysprogress" ).removeClass ( "hidden" );
				query ( "#mrktanlyserror" ).innerHTML ( "" );
			
			} else {
			
				var htmlstr = "";
			
				array.forEach ( params.errors, function ( item, i ) {		
		
					htmlstr += "<div>" + ( i + 1 ) + ". " + item + "</div>";
				
				} );
				
				query ( "#mrktanlyserror" ).innerHTML ( htmlstr );
		
			}	
			
		} );		
		
		//Market Analysis clear button click event
		on ( dom.byId ( "mrktanlysclear" ), "click", resetMarketAnalysis );
		
		//Reset Market Analysis form
		resetMarketAnalysis ( );
		
		///////////////////////////////
		// 8. Layer Identify control //
		///////////////////////////////
		
		//Layerlist combobox change event	
		on ( dom.byId ( "idlayerlist" ), "change", function ( event ) {
			
			idLayers ( { x: locationGraphic.geometry.x, y: locationGraphic.geometry.y, lyridx : query ( "#idlayerlist" ).val ( ) } );
									
		} );
	
	} );
	
}

//////////////////////
// Search Functions //
//////////////////////

//process the main search string
function processSearch() {

	require ( [ "dojo/query", "dijit/registry", "dojo/NodeList-manipulate" ], function ( query, registry ) {
	
		var widget = registry.byId ( "mainSearch" );
		
		if ( !widget.item ) {
		
			if ( widget.get ( "value" ).length > 0 )
				backupSearch ( widget.get ( "value" ) );	
			
		} else {
		
			query ( "#searchclear" ).addClass ( "hidden" );
			query ( "#searchprogress" ).removeClass ( "hidden" );
		
			finder ( widget.item.i, "searchresults" );	
			
			lastSearch = "main";
			
		}
						
	} );

}

function finder ( data, container ) {

	require ( [ 
		"mojo/Format",
		"mojo/SearchResultBoxLite",
		"mojo/Validate",
		"dijit/registry",
		"dojo/_base/array", 
		"dojo/_base/connect",
		"dojo/_base/lang", 
		"dojo/dom",
		"dojo/query", 
		"dojo/request/script",
		"dojo/NodeList-manipulate" ] , function ( Format, SearchResultBoxLite, Validate, registry, array, connect, lang, dom, query, script ) {
				
			//1. Ready to publish 
			if ( data.matid && data.taxpid && data.groundpid && data.x && data.y && data.lat && data.lon ) {
			
				if ( data.matid === -1 )
					data.matid = null;
						
				//publish
				connect.publish ( "/change/selected", data );
				connect.publish ( "/add/graphics", lang.mixin ( data, { 
					graphictype: "parcelpoly", 
					removegraphics: ( data.hasOwnProperty ( "removegraphics" ) ? data.removegraphics : [ "buffer", "road", "parcelpt" ] ),
					zoom: ( data.hasOwnProperty ( "zoom" ) ? data.zoom : true ) 					
				} ) );
				connect.publish ( "/set/identity", data );
				connect.publish ( "/set/characteristics", data );
				connect.publish ( "/set/taxinfo", data );
				connect.publish ( "/set/deed", data );
				connect.publish ( "/set/locinfo", data );
				connect.publish ( "/set/envinfo", data );
				
				//scroll data div to top
				document.getElementById ( "aside" ).scrollTop = 0 ;
																			
			}
			
			//2. Should have come from querystring find XY and full address of the master address point
			else if ( data.matid && data.taxpid && data.groundpid ) {
			
				script.get ( config.web_service_rest + "v3/ws_geo_attributequery.php", {
					jsonp: "callback",
					query: 
					{
						"table": "master_address_table",
						"fields": "full_address as address, ST_Y ( the_geom ) as y, ST_X ( the_geom ) as x, " + 
								  "ST_Y ( ST_Transform ( the_geom, 4326 ) ) as lat, ST_X ( ST_Transform ( the_geom, 4326 ) ) as lon",
						"parameters": "objectid='" + data.matid + "'"
					}
				} ).then ( function ( matdata ) {
				
					if ( matdata.length > 0 ) {
					
						lang .mixin ( data, matdata[ 0 ] );
						finder ( data, container );
																													
					}	
															   
				} );
			
			
			}
			
			//3. Get ground pid from cama	
			else if ( data.matid && data.taxpid ) {
				
				script.get ( config.web_service_rest + "v2/php-cgi/ws_cama_pidswitcher.php", {
					jsonp: "callback",
					query: 
					{
						"pid": data.taxpid,
						"pidtype": "tax",
						"format": "json"
					}
				} ).then ( function ( camadata ) {
				
					if ( camadata.total_rows > 0 ) { //kick it back to Main Search
				
						data.groundpid = camadata.rows[ 0 ].row.common_parcel_id;
						data.taxpid = camadata.rows[ 0 ].row.parcel_id;					
				
						finder ( data, container );
			
					}		
					//else is not handled because its impossible to have no ground pid for a corresponding tax pid
															   
				} );
										
			}
			
			//4. Get tax pid from cama
			else if ( data.matid && data.groundpid ) {
		
				script.get ( config.web_service_rest + "v1/ws_cama_taxparcelinfo.php", {
					jsonp: "callback",
					query: { compid: data.groundpid }
				} ).then ( function ( camadata ) {
				
					if ( camadata.length > 0 ) { //the passed groundpid exists in cama
					
						var idx = 0;
						
						if ( camadata.length > 1 ) { //some tax pids have alphabets appended after 3 digit numerals
							
							var sideaddrs = []
							
							array.forEach ( camadata, function ( item, i ) {
								
								sideaddrs.push ( item.house_number + "|" + item.street_name );
																
							} );
							
							//find the best matching tax pid by comparing the master address and situs address
							idx = getBestMatchingAddr ( data.address, sideaddrs );			
							
						}
						
						data.taxpid = camadata[ idx ].pid;
						
						finder ( data, container );
					
					} else { //ground pid doesn't exist in cama
					
						badSearch();
						
					}
															   
				} );
				
			}
			
			//5. Get matid by intersecting parcel layer with master address table 
			else if ( data.groundpid && data.taxpid ) {
						
				script.get ( config.web_service_rest + "v2/ws_geo_featureoverlay.php", {
					jsonp: "callback",
					query: 
					{
						"from_table" : "tax_parcels",
						"to_table" : "master_address_table",
						"fields" : "f.pid as groundpid, " + 
									"cast(t.objectid as text) as matid, t.full_address as address, t.num_parent_parcel as parcel_id, " +
									"ST_Y ( t.the_geom ) as y, ST_X ( t.the_geom ) as x, " + 
									"ST_Y ( ST_Transform ( t.the_geom, 4326 ) ) as lat, ST_X ( ST_Transform (t. the_geom, 4326 ) ) as lon",
						"parameters" : "f.pid='" + data.groundpid + "'"			
					}
				} ).then ( function ( gisdata ) {
								
					if ( gisdata.length > 0 ) {
					
						var idx = 0;
					
						if ( data.groundpid != data.taxpid ) { //its a condo
										
							array.forEach ( gisdata, function ( item, i ) {
								
								if ( item.parcel_id == guessPIDinMAT ( data.taxpid, data.groundpid ) ) {
									idx = i;
									return false;
								}	
																
							} );
																							
						}
						
						lang.mixin ( data, { 
							matid: gisdata[ idx ].matid, 
							address: gisdata[ idx ].address,  
							y: gisdata[ idx ].y, 
							x: gisdata[ idx ].x,
							lat: gisdata[ idx ].lat, 
							lon: gisdata[ idx ].lon
						} );
						
						finder ( data, container );
						
					} else {
					
						script.get ( config.web_service_rest + "v3/ws_geo_attributequery.php", {
							jsonp: "callback",
							query: 
							{
								"table": "tax_parcels",
								"fields": "ST_Y(ST_PointOnSurface(the_geom)) as y, ST_X(ST_PointOnSurface(the_geom)) as x, " +
										  "ST_Y ( ST_PointOnSurface ( ST_Transform ( the_geom, 4326 ) ) ) as lat, " + 
										  "ST_X ( ST_PointOnSurface ( ST_Transform ( the_geom, 4326 ) ) ) as lon",
								"parameters": "pid='" + data.groundpid + "'"
							}
						} ).then ( function ( parceldata ) {
												
							lang.mixin ( data, parceldata[ 0 ] );
							lang.mixin ( data, { matid: -1, address: "NA" } );
							
							finder ( data, container );
																													   
						} );
					
					} 
															   
				} );
						
			}
			
			//7. Probably control came from a master address search, find groundpid by intersecting with parcel layer
			else if ( data.matid ) { 
						
				script.get ( config.web_service_rest + "v2/ws_geo_featureoverlay.php", {
					jsonp: "callback",
					query: 
					{
						"from_table" : "master_address_table",
						"to_table" : "tax_parcels",
						"fields" : "f.full_address as address, f.num_parent_parcel as pid_mat, t.pid as groundpid, " +
									"ST_Y ( f.the_geom ) as y, ST_X ( f.the_geom ) as x," + 
									"ST_Y ( ST_Transform ( f.the_geom, 4326 ) ) as lat, ST_X ( ST_Transform ( f.the_geom, 4326 ) ) as lon",
						"parameters" : "f.objectid='" + data.matid + "'"			
					}
				} ).then ( function ( gisdata ) {
												
					if ( gisdata.length > 0 ) {
									
						if ( Validate.isCNumber ( gisdata[ 0 ].groundpid ) ) { //if ground pid has C the pid attached to the MAT point is King
						
							if ( Validate.isCNumber ( gisdata[ 0 ].pid_mat ) ) { //the pid attached to MAT has a C so matid is useless, kick it back to Main Search
															
								finder ( { "groundpid": gisdata[ 0 ].groundpid } );
								
							} else { //kick it back to Main Search
								
								data.address = gisdata[ 0 ].address; 
								data.taxpid = gisdata[ 0 ].pid_mat; 
								data.y = gisdata[ 0 ].y; 
								data.x = gisdata[ 0 ].x;
								data.lat = gisdata[ 0 ].lat; 
								data.lon = gisdata[ 0 ].lon; 	
								
								finder ( data, container );
									
							}		
						
						} else { //kick it back to Main Search 
						
							data.address = gisdata[ 0 ].address; 
							data.groundpid = gisdata[ 0 ].groundpid; 
							data.y = gisdata[ 0 ].y; 
							data.x = gisdata[ 0 ].x;
							data.lat = gisdata[ 0 ].lat; 
							data.lon = gisdata[ 0 ].lon; 	
								
							finder ( data, container );
											
						}
									
					} else { //no parcel intersects mat point
					
						badSearch();
					
					}
																		   
				} );
			
			}
			
			//8. Go to cama and get ground pid
			else if ( data.taxpid ) {
			
				script.get ( config.web_service_rest + "v2/php-cgi/ws_cama_pidswitcher.php", {
					jsonp: "callback",
					query: 
					{
						"pid" : data.taxpid,
						"pidtype" : "tax",
						"format" : "json"		
					}
				} ).then ( function ( camadata ) {
				
					if ( camadata.total_rows > 0) {
					
						data.groundpid = camadata.rows[ 0 ].row.common_parcel_id; 
				
						finder ( data, container );
					
					} else { //tax pid is not found in cama. can happen if a bad pid comes from the master address table
					
						badSearch();
						
					}	
															   
				} );
				
			}
			
			//9. Query cama based on passed parameter(s) 
			else if ( data.groundpid || data.lastname || data.stname ) {
			
				script.get ( config.web_service_rest + "v1/ws_cama_taxparcelinfo.php", {
					jsonp: "callback",
					query: {
						
						compid: ( data.groundpid ? data.groundpid : "" ),
						lastname: ( data.lastname ? lang.trim ( data.lastname ) : "" ),
						firstname: ( data.firstname ? lang.trim ( data.firstname ) : "" ),
						staddrno: ( data.staddrno ? data.staddrno : "" ),
						stprefix: ( data.stprefix ? data.stprefix : "" ),
						stname: ( data.stname ? data.stname : "" ),
						sttype: ( data.sttype ? data.sttype : "" ),
						stsuffix: ( data.stsuffix ? data.stsuffix : "" ),
						stmuni: ( data.stmuni ? data.stmuni : "" )	
						
					}
				} ).then ( function ( camadata ) {
				
					if ( camadata.length == 1 ) {	//kick it back to Main Search	
				
						finder ( {
							taxpid: lang.trim ( camadata[ 0 ].pid ), 
							groundpid: lang.trim ( camadata[ 0 ].common_pid ),
							removegraphics: ( data.stname ? [ ] : [ "buffer", "road", "parcelpt" ] ),
							zoom: ( data.hasOwnProperty ( "zoom" ) ? data.zoom : true )	
						}, container );	
										
					} else if ( camadata.length > 1 ) { //more taxpids associated with ground pid show results for user to select manually	
							
						require ( [ "dojo/dom", "mojo/SearchResultBoxLite" ], 
						
							function ( dom, SearchResultBoxLite ) {
						
								query( "#" + container ).innerHTML ( "<h5><span class = 'note'>Are you looking for?</span></h5>" );
							
								array.forEach ( camadata, function ( item, i ) {
																
									var widget = new SearchResultBoxLite (
										{
											idx: i + 1,
											displaytext : "<div><b>Parcel ID:</b>&nbsp;" + item.pid + "</div>" + 
												"<div>" + 
													Format.address ( Format.nullToEmpty( item.house_number ), 
														Format.nullToEmpty( item.prefix ), 
														Format.nullToEmpty( item.street_name ), 
														Format.nullToEmpty( item.road_type ), 
														Format.nullToEmpty( item.suffix ), 
														Format.nullToEmpty( item.unit ), 
														Format.jurisdisplay ( Format.nullToEmpty( item.municipality ) ), "", "" ) + 
												"</div>" +
												"<div><b>Ownership:</b></div>" + 
												"<div>" + Format.ownerlist ( item.owner_names ) + "</div>",
											params: { 
												taxpid: lang.trim ( item.pid ), 
												groundpid: lang.trim ( item.common_pid ),
												removegraphics: ( data.stname ? [ ] : [ "buffer", "road", "parcelpt" ] ),
												zoom: ( data.hasOwnProperty ( "zoom" ) ? data.zoom : true ),
												backtoresults: true		
											},
											onClick: function ( boxdata ) {
						
												finder ( boxdata, container );
																							
											}
										}
									).placeAt ( dom.byId ( container ) );	
								
								} );
								
								//show search results div
								showDiv ( 'searchresults' );
																															
							} 
							
						);
									
					} else { //no parcel with search criterion exists in cama 
					
						badSearch();
						
					}
															   
				} );
			
			}
			
			//6. Probably control came form a map click or road search
			else if ( data.y && data.x ) {
			
				if ( data.hasOwnProperty ( "tag" ) ) {
				
					if ( data.tag === "Road" ) { //road search
					
						lang.mixin ( data, { wholestname: data.label });
										
						script.get( config.web_service_rest + "v3/ws_geo_attributequery.php", {
							jsonp: "callback",
							query: 
							{
								"table" : "Roads",
								"fields" : "distinct prefixdire, streetname, streettype, suffix, wholestnam as wholestname, l_juris as jurisdiction",
								"parameters" : "wholestnam = '" + data.wholestname + "'"
							}
						} ).then ( function ( roaddata ) {
						
							if ( roaddata.length > 1 ) { //multiple roads with same road name
														
								//list results
								query ( "#" + container ).innerHTML ( "<h5><span class = 'note'>Did you mean?</span></h5>" );
							
								array.forEach ( roaddata, function ( item, i ) {
						
									var widget = new SearchResultBoxLite (
										{
											idx: i + 1,
											displaytext: item.wholestname + ", " + Format.jurisdisplay ( item.jurisdiction ),
											params: {
												stprefix: ( ( item.prefixdire ) ?  item.prefixdire : null ),
												stname: ( ( item.streetname ) ?  item.streetname : null ),
												sttype: ( ( item.streettype ) ?  item.streettype : null ), 
												stsuffix: ( ( item.suffix ) ?  item.suffix : null ),
												stmuni: ( ( item.jurisdiction ) ?  Format.juriscama ( item.jurisdiction ) : null ),
												wholestname: ( ( item.wholestname ) ?  item.wholestname : null ),
												jurisdiction: ( ( item.jurisdiction ) ?  item.jurisdiction : null ),
												removegraphics: [ "buffer", "road", "parcelpt" ]
											},
											onClick: function( param ) {
															
												finder ( lang.mixin ( data, param ), container );
												
												connect.publish ( "/add/graphics", lang.mixin ( param, { graphictype: "road", zoom: true } ) );
																							
											}
										}
									).placeAt ( dom.byId ( container ) );
																	
								} );
							
								//show search results div
								showDiv ( 'searchresults' );
															
							} else if ( roaddata.length > 0 ) {
														
								var item = roaddata[ 0 ];
							
								lang.mixin ( data, {
									stprefix: ( ( item.prefixdire ) ?  item.prefixdire : null ),
									stname: ( ( item.streetname ) ?  item.streetname : null ),
									sttype: ( ( item.streettype ) ?  item.streettype : null ), 
									stsuffix: ( ( item.suffix ) ?  item.suffix : null ),
									stmuni: ( ( item.jurisdiction ) ?  Format.juriscama ( item.jurisdiction ) : null ),
									removegraphics: [ "buffer", "road", "parcelpt" ]
								} );
								
								finder ( data, container );
								
								connect.publish ( "/add/graphics", lang.mixin( data, { graphictype: "road", zoom: true } ) );
																
							}
						
						} );
										
					} else { //points of interest
					
						//add location information
						//add pointer to map and identify layer that intersect point
						var latlon = Format.XYasLatLon ( data.y, data.x, map.extent, mapExtentInLatLon ),
							info = {
								Desciption: data.desc, 
								YX: parseInt ( data.y ) + ", " + parseInt ( data.x ), 
								"Lat Lon": latlon.lat + ", " + latlon.lon, 
								USNG: LLtoUSNG ( latlon.lat, latlon.lon, 4 )
							};
						
						query ( "#poicont" ).innerHTML ( Format.objectAsTable ( info , "proptbl", true ) ) ;
						
						//show point of interest div
						showDiv ( 'poi' );
						showTip ( "locsearch" );
											
						connect.publish ( "/add/graphics", lang.mixin( data, { graphictype: "location", removegraphics: [ "buffer", "road", "parcelpt" ], zoom: true } ) );
						
					}	
				
				} else { //map click
							
					script.get ( config.web_service_rest + "v2/ws_geo_pointoverlay.php", {
						jsonp: "callback",
						query: 
						{
							"x" : data.x,
							"y" : data.y,
							"srid" : "2264",
							"table" : "tax_parcels",
							"fields" : "pid as groundpid"			
						}
					} ).then ( function ( parceldata ) {
																				
						if ( parceldata.length == 1 ) { //kick it back to Main Search
						
							finder ( { "groundpid": parceldata[ 0 ].groundpid, removegraphics: [ "buffer", "road", "parcelpt" ], zoom: false }, container );
						
						} else	{ //no parcel intersects identify point
							
							badSearch();	
						
						}
																   
					} );
					
				}
							
			} else {
								
				var widget = registry.byId ( "mainSearch" );
				widget.set ( "value", "" );	
				
				query ( "#searchprogress" ).addClass ( "hidden" );
				query ( "#searchclear" ).removeClass ( "hidden" );
				
			}
			
		} 
	);
	
}

function backupSearch ( searchStr ) {
		
	require ( [ "mojo/Validate", "dojo/query", "dojo/NodeList-manipulate" ], function ( Validate, query ) {
	
		if ( Validate.isTaxPID ( searchStr ) ) {

			finder ( {"taxpid": searchStr }, "searchresults" );	
			
			lastSearch = "main";
			query ( "#searchclear" ).addClass ( "hidden" );
			query ( "#searchprogress" ).removeClass ( "hidden" );
					
		} else if ( Validate.isCNumber ( searchStr ) ) {
		
			finder ( { "groundpid": searchStr }, "searchresults" );	
			
			lastSearch = "main";
			query ( "#searchclear" ).addClass ( "hidden" );
			query ( "#searchprogress" ).removeClass ( "hidden" );
					
		} else {
		
			var standardizedAddr = getStandardizedAddress ( searchStr ).split( "|" );
		
			if ( standardizedAddr[ 2 ].length > 0 ) { //atleast a street name is needed
			
				standardizedAddrSearch ( standardizedAddr, "searchresults" );	
				
				lastSearch = "main";
				query ( "#searchclear" ).addClass ( "hidden" );
				query ( "#searchprogress" ).removeClass ( "hidden" );
			
			} else { //search string needs to be validated by uber search
				
				badSearch();
	
			}
		
		}
		
	} );
	
}

function standardizedAddrSearch ( standardizedAddr, container ) {
	
	require ( [ 
		"mojo/SearchResultBoxLite",
		"dojo/_base/array", 
		"dojo/dom", 
		"dojo/query", 
		"dojo/request/script", 
		"dojo/NodeList-manipulate" ] , function ( SearchResultBoxLite, array, dom, query, script ) {
	
		script.get ( config.web_service_rest + "v3/ws_geo_attributequery.php", {
			jsonp: "callback",
			query: 
			{
				"table" : "master_address_table",
				"fields" : "objectid as matid, full_address as address",
				"parameters" : ( standardizedAddr[ 2 ].length > 0 ? ( standardizedAddr[ 0 ].length > 0 ?  "dmetaphone(nme_street) like dmetaphone('" + standardizedAddr[ 2 ] + "')" : "nme_street like '" + standardizedAddr[ 2 ] + "%'" ) : "" ) +
					( standardizedAddr[ 0 ].length > 0 ? " and txt_street_number = '" + standardizedAddr[ 0 ] + "'" : "" ) +
					( standardizedAddr[ 1 ].length > 0 ? " and cde_street_dir_prfx = '" + standardizedAddr[ 1 ] + "'" : "" ) +
					( standardizedAddr[ 3 ].length > 0 ? " and cde_roadway_type = '" + standardizedAddr[ 3 ] + "'" : "" ) +
					( standardizedAddr[ 4 ].length > 0 ? " and cde_street_dir_suff = '" + standardizedAddr[ 4 ] + "'" : "" ) +
					( standardizedAddr[ 5 ].length > 0 ? " and txt_addr_unit = '" + standardizedAddr[ 5 ] + "'" : "" ) +
					( standardizedAddr[ 6 ].length > 0 ? " and nme_po_city = '" + standardizedAddr[ 6 ] + "'" : "" ) +
					( standardizedAddr[ 8 ].length > 0 ? " and cde_zip1 = '" + standardizedAddr[ 8 ] + "'" : "" ) 
			}
		} ).then ( function ( matdata ) {
					
			if ( matdata.length > 1 ) { //publish search results
						
				//list results
				query ( "#" + container ).innerHTML ( "<h5><span class = 'note'>Did you mean?</span></h5>" );
				
				array.forEach ( matdata, function ( item, i ) {
				
					var widget = new SearchResultBoxLite (
						{
							idx: i + 1,
							displaytext: item.address,
							params: { 
								matid: item.matid,
								backtoresults: true								
							}, 
							onClick: function ( boxdata ) {
								finder ( boxdata, "searchresults" );
							}
						}
					).placeAt ( dom.byId ( container ) );
													
				} );
							
				//show search results div
				showDiv ( 'searchresults' );
																				
			} else if ( matdata.length > 0 ) {
				
				finder ( { "matid": matdata[ 0 ].matid }, "searchresults" );
												
			} else {
				
				badSearch();
					
			}
			   
		} );
				
	} );
	
}

function bufferSearch ( buffersize ) {

	require ( [
		"mojo/Format",
		"mojo/SearchResultBoxLite",
		"esri/tasks/GeometryService",
        "esri/tasks/BufferParameters",
		"esri/tasks/query",
		"esri/tasks/QueryTask",
		"dojo/_base/array",
		"dojo/_base/connect",	
		"dojo/_base/lang",
		"dojo/Deferred",
		"dojo/dom",
		"dojo/dom-attr",
		"dojo/dom-construct",
		"dojo/on",
		"dojo/promise/all",
		"dojo/query",
		"dojo/request/script" ], function ( Format, SearchResultBoxLite, 
			GeometryService, BufferParameters, Query, QueryTask, 
			array, connect, lang, Deferred, dom, domAttr, domConstruct, on, all, query, script ) {
	
		var geometryService = new GeometryService ( config.geometry_service ),
			geometry = parcelGraphic.geometry,
			bufferParams = new BufferParameters();
		
		//setup the buffer parameters
		bufferParams.distances = [ buffersize ];
	
		//simplfy polygon
		geometryService.simplify ( [ geometry ], function ( geometries ) {
			
			bufferParams.geometries = geometries;
			geometryService.buffer ( bufferParams, function ( bufferGeometry ) {
			
				//get compids based on buffer graphics
				var qry = new Query ( ),
					qryTask = new QueryTask ( config.overlay_services.overlays_streets.url + "/2" );
		
				qry.spatialRelationship = Query.SPATIAL_REL_INTERSECTS;
				qry.geometry = bufferGeometry[ 0 ];
				qry.returnGeometry = false;
				qry.outFields = [ "pid", "st_area(shape)" ];
	
				qryTask.execute ( qry, function ( results ) { 
				
					var groundpids = "", 
						reportparams = { taxpids: "", lottype: "", propuse: "", srchtype: "", srchval: "", 
							orderby: "pid", orderdir: "asc", buffersize: buffersize };
										
					array.forEach ( results.features, function ( item, i ) {
						
						groundpids +=  ( groundpids.length > 0 ? "," : "" ) + item.attributes.pid;
													
					} );
									
					script.get ( config.web_service_rest + "v1/ws_cama_deedinfo.php", {
						jsonp: "callback",
						query: { pid: groundpids, pidtype: "common", excludepid: selectedAddress.taxpid, excludepidtype: "tax" }
					} ).then ( function ( camadata ) {
							
						query( "#searchresults" ).innerHTML ( "<h5><span class = 'note'>Are you looking for?</span></h5>" );
																										
						array.forEach ( camadata, function ( item, i ) {
						
							var tempArr = array.filter ( results.features, function ( parcel ) { 
							return parcel.attributes.pid === lang.trim ( item.common_pid  )} );
													
							var widget = new SearchResultBoxLite ( {
								idx: i + 1,
								displaytext : 
									"<table>" +
										"<tr>" +
											"<th class='fixed'>Parcel ID</th>" + 
											"<td>" + item.pid + "</td>" + 
										"</tr>" + 
										
										"<tr>" +
											"<th class='fixed'>Ownership</th>" + 
											"<td>" + Format.ownerlist ( item.owner_names ) + "</td>" + 
										"</tr>" +
										"<tr>" +
											"<th class='fixed'>Mailing Address</th>" + 
											"<td>" + Format.trimNconcat ( [ 
													{ val: Format.nullToEmpty ( item.address_1 ), appnd: " " },
													{ val: Format.nullToEmpty ( item.address_2 ), appnd: "<br/>" },
													{ val: Format.nullToEmpty ( item.city ), appnd:" " },
													{ val: Format.nullToEmpty ( item.state ), appnd:" " },
													{ val: Format.nullToEmpty ( item.zipcode ), appnd:"" } 
												] ) +
											"</td>" + 
										"</tr>" +
										"<tr>" +
											"<th class='fixed'>Land Area</th>" + 
											"<td>" + Format.landArea ( item.units, item.land_unit_type, item.total_acres, 
													( tempArr.length > 0 ? tempArr[ 0 ].attributes[ "st_area(shape)" ]  / 43650 : null ) ) + 
										"</td>" + 
										"</tr>" +
										"<tr>" +
											"<th class='fixed'>Legal Desc</th>" + 
											"<td>" + item.legal_description + "</td>" + 
										"</tr>" +
										"<tr>" +	
											"<th class='fixed'>Deed</th>" + 
											"<td>" + Format.deed ( item.deed_book, item.deed_page, item.sale_date, true ) + "</td>" + 
										"</tr>" +
										
									"</table>",
								params: { 
									taxpid: lang.trim ( item.pid ), 
									groundpid: lang.trim ( item.common_pid ),
									removegraphics: [ ],
									zoom: true,
									backtoresults: true	
								},
								onClick: function ( boxdata ) {
					
									finder ( boxdata, "searchresults" );
											
								}	
								
							} ).placeAt ( dom.byId ( "searchresults" ) );
							
							//append taxpids for deed report
							reportparams.taxpids += ( reportparams.taxpids.length > 0 ? "," : "" ) + item.pid;
							
						} );
						
						//set report links
						updateReportLinks ( reportparams );
												
						//show search results div
						showDiv ( 'searchresults' );							
					
					} );
									
				} );

				//add buffer graphics
				connect.publish ( "/add/graphics", { 
					graphictype: "buffer", 
					buffergeom: bufferGeometry[ 0 ], 
					removegraphics: [ "buffer", "road", "parcelpt" ], 
					zoom: true
				} );		
					
			} );	
			
		} );
      
	} );
		
}

function prelimPlanSearch ( prelimplan ) {

	require ( [ "esri/tasks/query", "esri/tasks/QueryTask" ], function ( query, QueryTask ) {
	
		var qry = new query(),
			prelimplansQueryTask = new QueryTask( config.overlay_services.overlays_streets.url + "/32" );
			
		qry.where = "projname = '" + prelimplan + "'";
		qry.returnGeometry = true;
		qry.outFields = [ "projname" ];
		prelimplansQueryTask.execute ( qry, function ( results ) { 
		
			switchOnOffOverlay ( "overlays", "prelimplans", true );
			zoom.toExtent ( results.features[ 0 ].geometry.getExtent() ); 
		
		} );
	
	} );

}

function engGridSearch ( enggrid ) {

	require ( [ "esri/tasks/query", "esri/tasks/QueryTask" ], function ( query, QueryTask ) {
	
		var qry = new query(),
			enggridQueryTask = new QueryTask( config.overlay_services.overlays_streets.url + "/24" );
			
		qry.where = "map_sheet_no = '" + enggrid + "'";
		qry.returnGeometry = true;
		qry.outFields = [ "map_sheet_no" ];
		enggridQueryTask.execute ( qry, function ( results ) { 
			
			switchOnOffOverlay ( "overlays", "enggrid", true );
			zoom.toExtent ( results.features[ 0 ].geometry.getExtent() ); 
		
		} );
	
	} );

}

function analyzeTheMarket ( param ) {

	require ( [ 
		"mojo/Format",
		"mojo/SearchResultBoxLite",
		"dojo/_base/array", 
		"dojo/_base/connect",
		"dojo/_base/lang",
		"dojo/currency",
		"dojo/dom", 
		"dojo/dom-attr",
		"dojo/on",
		"dojo/query", 
		"dojo/request/script", 
		"dojo/NodeList-dom",
		"dojo/NodeList-manipulate" ] , function ( Format, SearchResultBoxLite, 
			array, connect, lang, localeCurrency, dom, domAttr, on, query, script ) {
		
		script.get ( config.web_service_rest + "v1/ws_cama_marketanalysis.php", {
			jsonp: "callback",
			query: param
		} ).then ( function ( camadata ) {
				
			if ( camadata.length > 0 ) { //more taxpids associated with ground pid show results for user to select manually	
											
				var groundpids = [],
					commonpids = "",
					reportparams = { 
						taxpids: "", 
						orderby: param.orderby, 
						orderdir: param.orderdir, 
						lottype: param.lottype, 
						propuse: param.propuse, 
						buffersize: ( param.pidbuff.length > 0 ? ( param.pidbuff.substring ( param.pidbuff.indexOf ( "|" ) + 1, param.pidbuff.length ) ) : "" )
					};
					
				//store unique ground pids
				array.forEach ( camadata, function ( item, i ) {
				
					commonpids += ( commonpids.length > 0 ? "," : "" ) + "'" + lang.trim ( item.common_pid ) + "'";
				
				} );
				
				//show results and add parcel centroids to map
				script.get( config.web_service_rest + "v3/ws_geo_attributequery.php", {
					jsonp: "callback",
					query: 
					{
						"table": "tax_parcels",
						"fields": "pid as common_pid, ST_Y(ST_PointOnSurface(the_geom)) as y, ST_X(ST_PointOnSurface(the_geom)) as x, " +
							"ST_Area ( the_geom ) As sqft",
						"parameters": "pid in (" + commonpids + ")"
					}
				} ).then ( function ( parceldata ) {
				
					if ( parceldata.length > 0 ) {
					
						var compids = commonpids.replace ( /'/g, "" );
															
						var parcelPoints = [];
							
						query( "#searchresults" ).innerHTML ( "<h5><span class = 'note'>Are you looking for?</span></h5>" + 
							"<div class='cont textcenter'>"+getPagingHTML ( camadata[0].totalrows, param )+"</div>" +
							"<div id='mrktanlysthink' class='cont textcenter hidden' style='padding-top: 0;'><img src='image/spin.gif' /></div>" );	
						
						query ( ".page" ).onclick( function ( e ){  
						
							analyzeTheMarket ( lang.mixin ( param, { pageno: parseInt ( e.target.id.replace ( "page", "") ) } ) );
							query( "#mrktanlysthink" ).removeClass ( "hidden" );
													
						} );
											
						array.forEach ( camadata, function ( item, i ) {
							
							var tempArr = array.filter ( parceldata, function ( parcel ) { 
								return parcel.common_pid === lang.trim ( item.common_pid  )} );
							
							if ( tempArr.length > 0 ) {
							
								lang.mixin ( item, tempArr[ 0 ] );
								
								if ( array.indexOf ( groundpids, item.common_pid ) < 0 ) {
				
									groundpids.push ( item.common_pid );
									parcelPoints.push ( { y: item.y, x: item.x } );
						
								}	
																
								var widget = new SearchResultBoxLite ( {
									idx: array.indexOf ( groundpids, item.common_pid ) + 1,
									displaytext : 
										"<table>" +
											"<tr>" +
												"<th class='fixed'>Parcel ID</th>" + 
												"<td>" + item.pid + "</td>" + 
											"</tr>" + 
											"<tr>" +
												"<th class='fixed'>Address</th>" + 
												"<td>" + 
													Format.address ( Format.nullToEmpty( item.house_number ), 
														Format.nullToEmpty( item.prefix ), 
														Format.nullToEmpty( item.street_name ), 
														Format.nullToEmpty( item.road_type ), 
														Format.nullToEmpty( item.suffix ), 
														Format.nullToEmpty( item.unit ), 
														Format.jurisdisplay ( Format.nullToEmpty( item.municipality ) ), "", "" ) + 
												"</td>" + 
											"</tr>" +
											"<tr>" +
												"<th class='fixed'>Sale Price</th>" + 
												"<td>" + Format.saleinfo ( item.sale_price, item.sale_date ) + "</td>" + 
											"</tr>" +
											"<tr>" +
												"<th class='fixed'>Market Value</th>" + 
												"<td>" + localeCurrency.format ( item.market_value, { currency: "USD" } ) + "</td>" + 
											"</tr>" +
											"<tr>" +
												"<th class='fixed'>Land Area</th>" + 
												"<td>" + 
													Format.landArea ( item.land_unit, item.land_type, item.land_area, ( item.sqft / 43650 ) ) +
												"</td>" + 
											"</tr>" +
											( param.propuse === "Vacant" ? "" :  
												"<tr>" +	
													"<th class='fixed'>Year Built</th>" + 
													"<td>" + Format.nullToEmpty( item.built_year ) + "</td>" + 
												"</tr>" +
												"<tr>" +	
													"<th class='fixed'>Square Feet</th>" + 
													"<td>" + Format.number ( item.built_area, 0 ) + "</td>" + 
												"</tr>" +
												"<tr>" +	
													"<th class='fixed'>Bedrooms</th>" + 
													"<td>" + Format.nullToEmpty( item.bedrooms ) + "</td>" + 
												"</tr>" +
												"<tr>" +	
													"<th class='fixed'>Full Baths</th>" + 
													"<td>" + Format.nullToEmpty( item.fullbaths ) + "</td>" + 
												"</tr>" 
											) +
										"</table>",
									params: { 
										taxpid: lang.trim ( item.pid ), 
										groundpid: lang.trim ( item.common_pid ),
										removegraphics: [ ],
										zoom: true,
										backtoresults: true											
									},
									onClick: function ( boxdata ) {
						
										finder ( boxdata, "searchresults" );
												
									}	
									
								} ).placeAt ( dom.byId ( "searchresults" ) );
								
								//append taxpids for deed report
								reportparams.taxpids += ( reportparams.taxpids.length > 0 ? "," : "" ) + item.pid;
																
							}	
									
						} );
						
						//set property report link
						array.forEach ( [ "juris", "nbc", "st", "pidbuff" ], function ( item, i ) {
						
							if ( param[ item ].length > 0 ) {
							
								lang.mixin( reportparams, { srchtype: item, srchval: param[ item ] } );
							
							}
						
						} );
													
						//set report links	
						updateReportLinks ( reportparams );
						
						//add point graphics
						connect.publish ( "/add/graphics", { 
							graphictype: "parcelpoint", 
							points: parcelPoints, 
							removegraphics: ( param.pidbuff.length > 0 ? [ "road", "parcelpt" ] : [ "buffer", "road", "parcelpt" ] ), 
							zoom: true 
						} );		
						
					}
									
				} );
							
				//show search results div
				showDiv ( "searchresults" );
																															
			} else {
			
				badSearch();
				
			}

			//hide progress animation
			query( "#mrktanlysprogress" ).addClass ( "hidden" );			
							
		} );
							
	} );	

}

//layer identify
function idLayers ( data ) {

	require ( [ 
		"mojo/Format",
		"esri/tasks/IdentifyTask",
		"esri/tasks/IdentifyParameters",
		"esri/geometry/Point",
		"esri/SpatialReference",
		"dojo/_base/lang",
		"dojo/dom", 
		"dojo/Deferred",
		"dojo/promise/all",
		"dojo/query",
		"dojo/request/script",
		"dojo/NodeList-manipulate" ], function ( Format, IdentifyTask, IdentifyParameters, Point, SpatialReference,
			lang, dom, Deferred, all, query, script ) { 
	
			query ( "#idlayerdatacont div" ).addClass ( "hidden" );
		
			if ( dom.byId ( "idlayerdata" + data.lyridx ) ) {
			
				query ( "#idlayerdata" + data.lyridx ).removeClass ( "hidden" );
								
			} else {
			
				var polyTables = {
				
					"0": "juris_p",
					"2": "roads",
					"3": "buildings",
					"4": "SOI_p",
					"5": "BASEPREC_P",
					"7": "zipcode_p",
					"8": 54,
					"9": 55,
					"10": "PostConstructionDistricts",
					"11": "water_quality_buffers",
					"12": "WATERSHED_P",
					"13": "Watershed_R",
					"14": "water_quality_buffers",
					"15": "census_tracts_2010", 
					"16": "enggrid_p",
					"17": "prelimplans_l",
					"18": 46
					
				};
							
				switch ( data.lyridx ) {
					
					case "0": //jurisdiction
					case "3": //building footprints
					case "4": //spheres of influence
					case "5": //voter precincts
					case "7": //zipcodes
					case "10": //post const district
					case "11": //post const buffer
					case "12": //stream watersheds
					case "13": //drinking watersheds
					case "14": //water quality buffer buffers
					case "15": //census tract
					case "16": //eng grid
														
						script.get ( config.web_service_rest + "v1/ws_geo_sdeattributequery.php", {
							jsonp: "callback",
							query: { 
								table: polyTables[ data.lyridx ], 
								fields: "*", 
								parameters: "ST_Within(st_point ( " + data.x + "," + data.y + ", 2264 ) , shape)",
								source: "gis"
							}
						} ).then ( function ( gisdata ) { processIDLayers ( ( gisdata.length > 0 ? gisdata [ 0 ] : null ), data.lyridx ); } );
					
						break;
						
					case "8": //fema flooplain
					case "9": //community floodplain					
					case "18": //nc geodetic monuments
					
						var overlayIdentifyService =  new IdentifyTask ( config.overlay_services.overlays_streets.url ),
							idParams = IdentifyParameters();
							
						lang.mixin ( idParams, {
							tolerance: 3, 
							returnGeometry: false, 
							layerIds: [ polyTables[ data.lyridx ] ], 
							layerOption: IdentifyParameters.LAYER_OPTION_ALL, 
							geometry: new Point ( data.x, data.y, new SpatialReference ( config.initial_extent.spatialReference ) ),
							mapExtent: map.extent 
						} );	
																						
						overlayIdentifyService.execute ( idParams ).then ( function ( results ) { 
							processIDLayers ( ( results.length > 0 ? results[ 0 ].feature.attributes : null ), data.lyridx ); 
						} );
					
						break;	
						
					case "1": //master address table
						
						script.get ( config.web_service_rest + "v1/ws_geo_sdeattributequery.php", {
							jsonp: "callback",
							query: { 
								table: "mat", 
								fields: "*",
								parameters: "ST_Within(shape, ST_Buffer ( st_point ( " + data.x + "," + data.y + ", 2264), 10 ) )",					
								source: "gis"
							}
						} ).then ( function ( gisdata ) { processIDLayers ( ( gisdata.length > 0 ? gisdata [ 0 ] : null ), data.lyridx ); } );
						
						break;
						
					case "2": //streets
					case "17": //prelim plan
					
						script.get ( config.web_service_rest + "v1/ws_geo_sdeattributequery.php", {
							jsonp: "callback",
							query: { 
								table: polyTables[ data.lyridx ], 
								fields: "*",
								parameters: "ST_Intersects(ST_Buffer ( st_point ( " + data.x + "," + data.y + ", 2264), 10 ), shape )",					
								source: "gis"
							}
						} ).then ( function ( gisdata ) { processIDLayers ( ( gisdata.length > 0 ? gisdata [ 0 ] : null ), data.lyridx ); } );
						
						break;	
					
					case "6": //Zoning
					
						all ( [
			
							//charlotte zoning
							script.get ( config.web_service_rest + "v1/ws_geo_sdeattributequery.php", {
								jsonp: "callback",
								query: { 
									table: "Zoning_py", 
									fields: "*", 
									parameters: "ST_Within(st_point ( " + data.x + "," + data.y + ", 2264 ) , shape)",
									source: "gis"
								}
							} ),
							
							//town zoning
							script.get ( config.web_service_rest + "v1/ws_geo_sdeattributequery.php", {
								jsonp: "callback",
								query: { 
									table: "COZONING_P", 
									fields: "*", 
									parameters: "ST_Within(st_point ( " + data.x + "," + data.y + ", 2264 ) , shape)",
									source: "tax"
								}
							} )
												
						] ).then ( function ( results ) {
						
							if ( results[ 0 ].length > 0 ) {
							
								processIDLayers ( results[ 0 ][ 0 ], data.lyridx );

							} else if ( results[ 1 ].length > 0 ) {

								processIDLayers ( results[ 1 ][ 0 ], data.lyridx );
							
							} else {
							
								processIDLayers ( null, data.lyridx );
							
							}

						} );
											
						break;			
					
				}
									
			}
		
	} );

}

//////////////////////
// Helper Functions //
//////////////////////

function handleHash ( ) {

	require ( [ "mojo/Validate", "dojo/hash", "dojo/io-query" ], function ( Validate, hash, ioquery ) {

		var data = ioquery.queryToObject ( hash() ),
			params = { };
								
		if ( data.mat ) { 				 

			if( Validate.isNumeric ( data.mat ) ) 
				params.matid = data.mat; 
				
		}			

		if ( data.pid ) {

			if ( Validate.isTaxPID ( data.pid ) )
				params.taxpid = data.pid; 
						
		}

		if ( data.gisid ) {
			
			if ( Validate.isGroundPID ( data.gisid ) )
				params.groundpid = data.gisid; 
						
		}
				
		if ( params.matid !== selectedAddress.matid || 
			params.taxpid !== selectedAddress.taxpid ||
			params.groundpid !== selectedAddress.groundpid ) {
						
			finder ( params, "searchresults" );
			
		}
						
	} );	

}

function processIDLayers ( attributes, lyridx ) {

	require ( [ "mojo/Format", "dojo/query", "dojo/NodeList-manipulate" ], function ( Format, query ) { 
	
		if ( attributes ) { 
	
			var htmlstr = "",
				attribs = { };
		
			for ( var attribute in attributes ) {
												
				if ( attribute.toLowerCase() !== "shape" && attribute.toLowerCase() !== "the_geom" && 
					attribute.toLowerCase() !== "geom" ) {
										
					attribs[ attribute.toLowerCase() ] =  attributes[ attribute ];
					
				}	

			}
			
			query ( "#idlayerdatacont" ).append ( "<div id='idlayerdata" + lyridx + "'>" + Format.objectAsTable ( attribs, "proptbl", true ) + "</div>" );
			
		} else {
		
			query ( "#idlayerdatacont" ).append ( "<div id='idlayerdata" + lyridx + "'><span class='note'>No data found</span></div>" );
		
		}	
	
	} );	
	
}

//set reports links in the property detail tab
function updateReportLinks ( data ) {

	require ( [ "dojo/dom-attr" ] , function ( domAttr ) {

		//set Property Summary
		domAttr.set ( "clickpropinforeport", "href", "php/propsummary.php?pid=" + data.taxpids + "&orderby=" + data.orderby +
			"&orderdir=" + data.orderdir + "&lottype=" + data.lottype + "&propuse=" + data.propuse + 
			"&srchtype=" + data.srchtype + "&srchval=" + data.srchval );
			
		//set deed report
		domAttr.set ( "clickdeedreport", "href", "php/deedreport.php?pid=" + data.taxpids + "&dist=" + data.buffersize + "&format=pdf" );
		
		//set deed csv	
		domAttr.set ( "clickdeedcsv", "href", "php/deedreport.php?pid=" + data.taxpids + "&format=csv" );
		
	} );	

}

//validate market analysis form
function validateMrktAnlysForm () {
				
	var data = {
		params: {
			juris: "", 
			nbc: "",
			st: "",
			pidbuff: "",
			saledatefrom: "",
			saledateto: "",
			bdrms: "",
			btrms: "",
			extwall: "",
			storytype: "",
			pagesize: 36,
			pageno: 1
		},	
		errors: []
	};	

	require ( [ 
		"mojo/Format",
		"mojo/Validate",
		"dijit/registry",
		"dojo/_base/lang",
		"dojo/query",
		"dojo/NodeList-manipulate" ] , function ( Format, Validate, registry, lang, query ) {
		
		switch ( query ( "#primarysrchtype" ).val ( ) ) {
		
			case "0":
				data.params.juris = query ( "#jurisdiction" ).val ( );
				break;
				
			case "1":
				data.params.nbc = query ( "#neighborcode" ).val ( );
				break;
				
			case "2":
				data.params.st = registry.byId ( "stname" ).get ( "value" );
				break;
				
			case "3":
				if ( !selectedAddress.hasOwnProperty( "groundpid" ) ) {	
				
					data.errors.push ( "Select a property to do market analysis using a buffer." );
		
				} 
				
				if ( lang.trim ( query ( "#anlysbuffsize" ).val ( ) ).length === 0 ) {
				
					data.errors.push ( "Enter a valid buffer size." );
				
				} else {
					
					var buffersize = parseInt ( query ( "#anlysbuffsize" ).val ( ) );
					
					if ( buffersize && ( buffersize > 0 && buffersize < 5281 ) ) {
					
						lang.mixin ( data.params, { pidbuff: selectedAddress.groundpid + "|" + buffersize } );
					
					} else {
					
						data.errors.push ( "Enter a valid buffer size." );
					
					}
				
				}
				
				break;	
				
		} 
		
		//property use
		data.params.propuse = query ( "#propuse" ).val ( );
					
		//acre values
		data.params.minacres = Format.number ( query ( "#acrefrom" ).val ( ), 3 );
		data.params.maxacres = Format.number ( query ( "#acreto" ).val ( ), 3 );
		
		//assesment info
		data.params.lottype = query ( "#noacre" ).val ( );
				
		//market values 
		data.params.minmktval = Format.number ( query ( "#mrktvalfrom" ).val ( ), 0 ) ;
		data.params.maxmktval = Format.number ( query ( "#mrktvalto" ).val ( ), 0 );
						
		//sale price
		data.params.minsalesprice = Format.number ( query ( "#salepricefrom" ).val ( ), 0 ) ;
		data.params.maxsalesprice = Format.number ( query ( "#salepriceto" ).val ( ), 0 );
				
		//sale date		
		if ( registry.byId ( "saledatefrom" ).get ( "state" ) === "Error" || registry.byId ( "saledateto" ).get ( "state" ) === "Error"  ) {
		
			data.errors.push ( "Enter a valid Sale Date range" );

		} else {
		
			lang.mixin ( data.params, { 
				startdate: ( registry.byId ( "saledatefrom" ).get ( "value" ) ? Format.readableDate ( registry.byId ( "saledatefrom" ).get ( "value" ) ) : "" ), 
				enddate: ( registry.byId ( "saledateto" ).get ( "value" ) ? Format.readableDate ( registry.byId ( "saledateto" ).get ( "value" ) ) : "" ) 
			} );
		
		}
				
		//yearbuilt
		data.params.minyrblt = ( Validate.isCountyYear ( lang.trim ( query ( "#yearbuiltfrom" ).val ( ) ) ) ? lang.trim ( query ( "#yearbuiltfrom" ).val ( ) ) : "" );
		data.params.maxyrblt = ( Validate.isCountyYear ( lang.trim ( query ( "#yearbuiltto" ).val ( ) ) ) ? lang.trim ( query ( "#yearbuiltto" ).val ( ) ) : "" );
		
		//sq feet
		data.params.minsqft = Format.number ( query ( "#sqftfrom" ).val ( ), 0 ) ;
		data.params.maxsqft = Format.number ( query ( "#sqftto" ).val ( ), 0 ) ;
		
		//building info
		if ( data.params.propuse != "Vacant" ) {
		
			lang.mixin ( data.params, { 
				bdrms: query ( "#bedrooms" ).val ( ), 
				btrms: query ( "#bathrooms" ).val ( ), 
				extwall: query ( "#exteriorframe" ).val ( ),
				storytype: query ( "#storytype" ).val ( ) 
			} );
		
		}		
		
		//sort 
		var sortby = query ( "#sortby" ).val ( );
		data.params.orderby = sortby.substr ( 0, sortby.indexOf ( "|" ) );
		data.params.orderdir = sortby.substr ( sortby.indexOf ( "|" ) + 1, sortby.length - 1 );	
						
	} );
	
	return data;
	
}

//paging for market analysis
function getPagingHTML ( numrows, param ) {

	var pages = Math.ceil ( numrows / 36 ),
		bpages = 0,
		pghtml = "";

	require ( [ 
		"dojo/_base/lang",
		"dojo/dom",
		"dojo/on" ] , function ( lang, dom, on ) {
		
		for ( i = ( ( param.pageno - 4 <= 0 ) ? 1 : ( param.pageno - 4 ) ); i < param.pageno; i++ ) {
		
			pghtml += "<a id='page" + i + "' class='page' href='javascript:void(0);' >" + i + "</a> ";	
			bpages++;
		
		}

		pghtml += "<b>" + param.pageno + "</b> ";	
		
		for ( i = param.pageno + 1; i <= param.pageno + 4; i++ ) {
		
			if ( i <= pages ) { 
			
				pghtml += "<a id='page" + i + "' class='page' href='javascript:void(0);' >"+i+"</a> ";	
							
			}	
		
		}
		
		if ( param.pageno > 1 ) { 
		
			pghtml = "<a id='page" + ( param.pageno - 1 ) + "' class='page' href='javascript:void(0);' >&lt;&lt;prev</a> " + pghtml;
				
		}	
		
		if ( param.pageno < pages ) {
		
			pghtml += "<a id='page" + ( param.pageno + 1 ) + "' class='page' href='javascript:void(0);' >next&gt;&gt;</a>";
						
		}	
		
		pghtml += "<br/><span>" + numrows + " results</span>";
		
	} );	
	
	return pghtml;

}

//bad search error message
function badSearch() {

	require ( [ "dojo/query", "dojo/NodeList-manipulate" ], function ( query ) {
	
		//show error div
		query ( "#error" ).removeClass ( "hidden" );
		
		query ( ".spin" ).addClass ( "hidden" );
		query ( ".unspin" ).removeClass ( "hidden" );
			
	} );
	
}

//standardize addresses
function getStandardizedAddress(address) {	
	
	var inputAddress = address.replace ( /[^a-zA-Z0-9]/g, " " ).trim().toUpperCase().split ( " " ),
		stdAddress = [ "", "", "", "","", "", "", "", "" ],
		prefixes = [ "NORTH", "N", "EAST", "E", "WEST", "W", "SOUTH", "S" ],
		sttypes = [ "ALLEY", "ALY", "AL", "AVENUE", "AVE", "AV", "BOULEVARD", "BLVD", "BV", "CIRCLE", "CIR", "CR", "CRESCENT", "CRES", 
					"CS", "COURT", "CT", "CT", "COVE", "CV", "CV", "DRIVE", "DR", "DR", "FREEWAY", "FWY", "FR", "HIGHWAY", "HWY", "HY",
					"LANE", "LN", "LN", "LOOP", "LOOP", "LP", "PLACE", "PL", "PL", "PARKWAY", "PKY", "PY", "ROAD", "RD", "RD", 
					"RUN", "RUN", "RN", "ROW", "ROW", "RW", "STREET", "ST", "ST", "TRACE", "TRCE", "TC", "TRAIL", "TRL", "TL", "TERRACE", "TER", "TR", "WAY", "WAY", "WY" ],
		suffixes = [ "N", "NORTH", "E", "EAST", "W", "WEST", "S", "SOUTH", "EX", "EXT" ]; 			
		units = [ "APT", "SUITE" ],
		states = [ "ALABAMA", "AL", "ALABAMA", "ALASKA", "AK", "ALASKA", "ARIZONA", "AZ", "ARIZONA", "ARKANSAS", "AR", "ARKANSAS", 
					"CALIFORNIA", "CA", "CALIFORNIA", "COLORADO", "CO", "COLORADO", "CONNECTICUT", "CT", "CONNECTICUT", 
					"DELAWARE", "DE", "DELAWARE", "DISTRICTOFCOLUMBIA", "DC", "DISTRICT OF COLUMBIA", "FLORIDA", "FL", "FLORIDA", 
					"GEORGIA", "GA", "GEORGIA", "HAWAII", "HI", "HAWAII", "IDAHO", "ID", "IDAHO", "ILLINOIS", "IL", "ILLINOIS", "INDIANA", "IN", "INDIANA", "IOWA", "IA", "IOWA", 
					"KANSAS", "KS", "KANSAS", "KENTUCKY", "KY", "KENTUCKY", "LOUISIANA", "LA", "LOUISIANA", 
					"MAINE", "ME", "MAINE", "MARYLAND", "MD", "MARYLAND", "MASSACHUSETTS", "MA", "MASSACHUSETTS", "MICHIGAN", "MI", "MICHIGAN", 
					"MINNESOTA", "MN", "MINNESOTA", "MISSISSIPPI", "MS", "MISSISSIPPI", "MISSOURI", "MO", "MISSOURI", "MONTANA", "MT", "MONTANA", 
					"NEBRASKA", "NE", "NEBRASKA", "NEVADA", "NV", "NEVADA", "NEWHAMPSHIRE", "NH", "NEW HAMPSHIRE", "NEWJERSEY", "NJ", "NEW JERSEY", 
					"NEWMEXICO", "NM", "NEW MEXICO", "NEWYORK", "NY", "NEW YORK", "NORTHCAROLINA", "NC", "NORTH CAROLINA", "NORTHDAKOTA", "ND", "NORTH DAKOTA", 
					"OHIO", "OH", "OHIO", "OKLAHOMA", "OK", "OKLAHOMA", "OREGON", "OR", "OREGON", "PENNSYLVANIA", "PA", "PENNSYLVANIA", "RHODEISLAND", "RI", "RHODE ISLAND",
					"SOUTHCAROLINA", "SC", "SOUTH CAROLINA", "SOUTHDAKOTA", "SD", "SOUTH DAKOTA", "TENNESSEE", "TN", "TENNESSEE", "TEXAS", "TX", "TEXAS", 
					"UTAH", "UT", "UTAH", "VERMONT", "VT", "VERMONT", "VIRGINIA", "VA", "VIRGINIA", "WASHINGTON", "WA", "WESTVIRGINIA", "WV", "WISCONSIN", "WI", "WYOMING", "WY" ],
		notoriousList = {
				"N": [ 
						"NORTH", "NORTH COMMUNITY HOUSE", "NORTH POINT", "NORTH COURSE", "NORTH BEATTIES FORD", "NORTH WIND", "NORTH HILLS", "NORTH HARBOR",
						"NORTH LIBRARY", "NORTH VALLEY", "NORTH FALLS", "NORTH CASTLE", "NORTH KIMBERLY", "NORTH COVE",	"NORTH LYNBROOK", 
						"NORTH CANYON", "NORTH RIDGE", "NORTH PINE HILL", "NORTH SHORE", "NORTH FAULKNER", "NORTH HAMPTON", "NORTH DOWNING" 
					 ],
				"E": [ 
						"EAST", "EAST BATTERY", "EAST END", "EAST ORCHARD", "EAST TODD", "EAST ROCK", "EAST FORD", "EAST ARBORS", "EAST DOUGLAS PARK",
						"EAST LAKE", "EAST BARDEN", "EAST LANE", "EAST PROVIDENCE" 
					 ],
				"W": [ 
						"WEST", "WEST KENTON", "WEST TODD", "WEST DOUGLAS PARK", "WEST BANK", "WEST SLOPE", "WEST CATAWBA", "WEST ARBORS",
						"WEST HOLLY VISTA", "WEST POINTE", "N C 73", "S MAIN", "S J LAWRENCE", "W S LEE", "W T HARRIS" 
					 ],
				"S": [ 
						"SOUTH", "SOUTH BIRKDALE COMMONS", "SOUTH RIDGE", "SOUTH HAMPTON", "SOUTH BANK", "SOUTH LAKES", "SOUTH VILLAGE",	"SOUTH BRENT",
						"SOUTH RENSSELAER", "SOUTH REGAL", "SOUTH HILL", "SOUTH BEND", "SOUTH STREAM", "SOUTH DEVON", "SOUTH LIBRARY",
						"SOUTH POINT", "SOUTH CREEK", "SOUTH DOWNS", "SOUTH WAY", "SOUTH HALL", "SOUTH FAULKNER", "SOUTH HILL VIEW",
						"SOUTH BRIDGE",	"SOUTH FORD", "SOUTH COMMERCE" 
					 ]		
			},
		prefixToname = { "E": "EAST", "W": "WEST", "S": "SOUTH", "N": "NORTH" },			
		j = 0;

	for ( var i = 0; i < inputAddress.length; i++ ) {
	
		switch ( j ) {
			
			case 0: //house no
				
				if ( onlyNumbers( inputAddress[ i ] ) ) {
				
					stdAddress[ j ] = inputAddress[ i ];
								
				} else {
				
					i--; 
				
				}
				 
				j++
							
				break;
				
			case 1: //prefix
			
				if ( prefixes.indexOf( inputAddress[ i ] ) > -1 ) {
				
					stdAddress[ j ] = prefixes[ prefixes.indexOf ( inputAddress[ i ] ) + ( 1 - ( prefixes.indexOf ( inputAddress[ i ] ) % 2) ) ]; //standardize prefix
				
				} else { 
				
					i--; 
				
				} 
				
				j++;
							
				break;
				
			case 2: //street name
			
				if ( sttypes.indexOf ( inputAddress[ i ] ) == -1 ) {
								
					if ( inputAddress[i].length > 0 )			
						stdAddress[ j ] += ( stdAddress[ j ].length > 0 ? " " : "" ) + inputAddress[ i ];
					
				} else { 
					
					i--; 
					j++; 
				
				}
												
				break;
				
			case 3: //street type
							
				stdAddress[ j ] = sttypes[ sttypes.indexOf ( inputAddress[ i ] ) + ( 2 - ( sttypes.indexOf ( inputAddress[ i ] ) % 3 ) ) ]; //standardize street type
				j++;
						
				break;

			case 4: //suffix
			
				if ( suffixes.indexOf ( inputAddress[ i ] ) > -1 ) {
				
					stdAddress[ j ] = suffixes[ suffixes.indexOf ( inputAddress[ i ] ) + ( 1 - ( suffixes.indexOf ( inputAddress[ i ] ) % 2 ) ) ]; //standardize suffix
				
				} else { 
				
					i--; 
				
				}	
				
				j++;
				
				break;
				
			case 5: //unit
			
				if ( units.indexOf ( inputAddress [ i ] ) == -1 ) {
				
					if( soundex ( inputAddress [ i ] ).substring ( 1 ) == "000" ) { //this takes cares of spaces also
										
						stdAddress[ j ] +=  ( stdAddress[ j ].length > 0 ? " " : "" ) + inputAddress[ i ];  		
					
					} else { 
					
						i--; 
						j++; 
						
					}
				
				} 
							
				break;
								
			case 6: //city and state
			
				if ( !inputAddress[ i ].match( /^\d{5}$/ ) ) {
				
					if ( inputAddress[i].length > 0 )
						stdAddress[ j ] += ( stdAddress[ j ].length > 0 ? " " : "" ) + inputAddress[i];  		
				
				} else { 
					
					i--; 
					j += 2; 
					
				}
							
				break;	
				
			case 8: //zip
			
				stdAddress[ j ] = inputAddress[ i ];

				break;
											
		}
														
	}
	
	//fix notorious street names	
	if ( stdAddress[ 1 ].length > 0 ) {
					
		if ( notoriousList[ stdAddress[ 1 ] ].indexOf ( ( stdAddress[ 1 ] + " " + stdAddress[ 2 ] ).trim() ) > -1 ) {
		
			stdAddress[ 2 ] =	notoriousList[ stdAddress[ 1 ] ][notoriousList[ stdAddress[ 1 ] ].indexOf ( ( stdAddress[ 1 ] + " " + stdAddress[ 2 ] ).trim() ) ];
			stdAddress[ 1 ] = "";	
		
		} else if ( notoriousList[ stdAddress[ 1 ] ].indexOf ( ( prefixToname[ stdAddress[ 1 ] ] + " " + stdAddress[ 2 ] ).trim() ) > -1 ) {
		
			stdAddress[ 2 ] =	notoriousList[ stdAddress[ 1 ] ][notoriousList[ stdAddress[ 1 ] ].indexOf ( ( prefixToname[ stdAddress[ 1 ] ] + " " + stdAddress[ 2 ] ).trim() ) ];
			stdAddress[ 1 ] = "";	
		
		}
	
	}
		
	//split city and state
				
	if ( stdAddress[ 6 ].length > 0 ) {
				
		var city = stdAddress[ 6 ].split( " " ), temp = [];
												
		for ( var k = city.length-1; k > -1; k-- ) {		
					
			temp.splice( 0, 0, city[ k ] );

			//look for state names in the city state cell
			if ( states.indexOf ( temp.join( "" ) ) > -1 ) {
			
				stdAddress[ 7 ] = states [ states.indexOf( temp.join( "" ) ) + ( 1 - ( states.indexOf ( temp.join( "" ) ) % 3 ) ) ];
				city.splice ( k, temp.length );
				stdAddress[ 6 ] = city.join( " " ); 
				break;
				
			} 
			
		}
		
	}
	
	return stdAddress.join( "|" );
	
}

function onlyNumbers( sText ) {

	var ValidChars = "0123456789.";
	var isNumber = true;
	var Char;

	for ( i = 0; i < sText.length && isNumber == true; i++ ) { 
		
		Char = sText.charAt ( i ); 
		if ( ValidChars.indexOf ( Char ) == -1 ) 
			isNumber = false;
    
	}
	
    return isNumber;

}

function soundex ( str ) {
 
	//  discuss at: http://phpjs.org/functions/soundex/
	// original by: Jonas Raoni Soares Silva (http://www.jsfromhell.com)
	// original by: Arnout Kazemier (http://www.3rd-Eden.com)
	// improved by: Jack
	// improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
	// bugfixed by: Onno Marsman
	// bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
	//    input by: Brett Zamir (http://brett-zamir.me)
	//  revised by: Rafal Kukawski (http://blog.kukawski.pl)
	//   example 1: soundex('Kevin');
	//   returns 1: 'K150'
	//   example 2: soundex('Ellery');
	//   returns 2: 'E460'
	//   example 3: soundex('Euler');
	//   returns 3: 'E460'
  
	str = ( str + '' ).toUpperCase();
	if ( !str ) {
	
		return '';
  
	}
	var sdx = [ 0, 0, 0, 0 ],
		m = {
			B : 1,
			F : 1,
			P : 1,
			V : 1,
			C : 2,
			G : 2,
			J : 2,
			K : 2,
			Q : 2,
			S : 2,
			X : 2,
			Z : 2,
			D : 3,
			T : 3,
			L : 4,
			M : 5,
			N : 5,
			R : 6
		},
		i = 0,
		j, s = 0,
		c, p;

	while ( ( c = str.charAt ( i++ ) ) && s < 4 ) {
	
		if ( j = m[ c ] ) {
			
			if ( j !== p ) {
				
				sdx[ s++ ] = p = j;
		
			}
    
		} else {
			s += i === 1;
			p = 0;
		}
	}

	sdx[ 0 ] = str.charAt ( 0 );
	return sdx.join( '' );
}

//reset search input controls
function resetSitusAddressSearch ( ) {

	require ( [ "dojo/query", "dijit/registry", "dojo/NodeList-manipulate" ], function ( query, registry ) {
			
		query ( "#situsaddrno" ).val ( "" );
		query ( "#situsprefix" ).val ( "" );
		query ( "#situssttype" ).val ( "" );
		query ( "#situssuffix" ).val ( "" );
		query ( "#situsmuni" ).val ( "" );
		query ( "#situssearcherror" ).innerHTML ( "" );
		
		registry.byId ( "situsst" ).reset();
		
	} );	
			
}

function resetOwnerNameSearch ( ) {
	
	require ( [ "dojo/query", "dojo/NodeList-manipulate" ], function ( query ) {
	
		query ( "#lastname" ).val ( "" );
		query ( "#firstname" ).val ( "" );
		query ( "#onamesearcherror" ).innerHTML ( "" );
		
	} );	
}

function resetBufferSearch ( ) {

	require ( [ "dojo/query", "dojo/NodeList-manipulate" ], function ( query ) {
	
		query ( "#buffersize" ).val ( "" );
		query ( "#buffersearcherror" ).innerHTML ( "" );
				
	} );	

}

function resetMarketAnalysis ( ) {

	require ( [ "dojo/query", "dijit/registry", "dojo/NodeList-manipulate" ], function ( query, registry ) {

		query ( "#primarysrchtype" ).val ( 0 );
		query ( "#jurisdiction" ).val ( 1 );
		query ( "#neighborcode" ).val ( "" );
				
		query ( "#propuse" ).val ( "Single-Fam" );
		query ( "#noacre" ).val ( "ALL" );
		query ( "#sortby" ).val ( "market_value|desc" );
		
		query ( "#acrefrom, #acreto" ).val ( "" );
		query ( "#mrktvalfrom, #mrktvalto, #salepricefrom, #salepriceto" ).val ( "" );
		registry.byId ( "saledatefrom" ).reset ();
		registry.byId ( "saledateto" ).reset ();
		query ( "#yearbuiltfrom, #yearbuiltto" ).val ( "" );
		query ( "#sqftfrom, #sqftto, #bedrooms, #bathrooms, #exteriorframe, #storytype" ).val ( "" );
		
		query ( "table#mrktanlysform tr:tr:nth-child(3),tr:nth-child(4)" ).addClass ( "hidden" );
		query ( "table#mrktanlysform tr:tr:nth-child(2)" ).removeClass ( "hidden" );
		
		registry.byId ( "stname" ).reset();
		
	} );	
	
}

//add array and string functionality for old browsers mostly used by address standardization functions
if ( !Array.prototype.indexOf ) {
    
	Array.prototype.indexOf = function ( searchElement, fromIndex ) {
     
		if ( this === undefined || this === null ) {
        
			throw new TypeError( '"this" is null or not defined' );
		}

		var length = this.length >>> 0; // Hack to convert object.length to a UInt32

		fromIndex = +fromIndex || 0;

		if ( Math.abs ( fromIndex ) === Infinity ) {
        
			fromIndex = 0;
      
		}

		if ( fromIndex < 0 ) {
        
			fromIndex += length;
			if ( fromIndex < 0 ) {
			
				fromIndex = 0;
			
			}
			
		}

		for ( ;fromIndex < length; fromIndex++ ) {
		
			if ( this[ fromIndex ] === searchElement ) {
				
				return fromIndex;
				
			}
			
		}

		return -1;
		
    };
	
}
 
if ( !String.prototype.trim ) {

	String.prototype.trim = function () {
	
		return this.replace ( /^\s+|\s+$/g, '' );
	
	};
	
} 