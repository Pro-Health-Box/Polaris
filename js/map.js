//Toolbox Initialization
function toolboxInit ( printLegendLayers ) {

	require ( [ 
		"mojo/ToolBox",
		"esri/tasks/GeometryService",
		"esri/tasks/PrintTask",
		"dojo/dom",
		"dojo/io-query" ], function ( ToolBox, GeometryService, PrintTask, dom, ioQuery ) {
		
		// Initialize basemapswitch control
		var toolbox = new ToolBox ( { 
				
				map: map ,
				
				geometryService: new GeometryService ( config.geometry_service ),
				
				printTask: new PrintTask ( config.print_task ),
				
				printLegendLayers: printLegendLayers,
				
				onToolOn: function ( event ) {
				
					if ( event.tool === "print" ) {
					
						mapClick = "property";
					
					} else {
					
						var selectionLayer = agsServices[ serviceNames.indexOf ( "selection" ) ];
				
						//disable click event of the selected feature
						selectionLayer.disableMouseEvents();
					
						mapClick = event.tool;
					
					}
														
				},

				onToolOff: function ( event ) {
				
					if ( event.tool === "identify" ) {
					
						delLocationGraphic ( );
						
					}
				
					if ( mapClick !== "property" ) {
				
						var selectionLayer = agsServices[ serviceNames.indexOf ( "selection" ) ];
				
						//enable click event of the selected feature
						selectionLayer.enableMouseEvents();
				
						mapClick = "property";
						
					}	
										
				}
				
			} ).placeAt ( dom.byId ( "toolbox" ) );
		toolbox.startup();
		
	} );

}

//Map Events Initialization
function mapEventsInit() {

	require ( [ 
		"mojo/Format",
		"esri/tasks/GeometryService",
		"esri/tasks/ProjectParameters", 
		"esri/SpatialReference",
		"dojo/_base/connect",
		"dojo/dom",
		"dojo/dom-geometry",
		"dojo/on",
		"dojo/query",
		"dojo/touch",
		"dojo/window",
		"dojo/NodeList-manipulate" ], function ( Format, GeometryService, ProjectParameters, SpatialReference, connect, dom, domGeom, on, query, touch, win ) {
		
		// Calculate lat lon extent  
		map.on ( "extent-change", function ( event ) {
	
			var geometryService = new GeometryService ( config.geometry_service ),
				params = new ProjectParameters();
			
			params.geometries = [ event.extent ];
			params.outSR = new SpatialReference ( { "wkid": 4326 } );
						
			geometryService.project( params, function ( features ) { mapExtentInLatLon = features[ 0 ]; } );
			
		} ); 	
		
		// Take care of map clicks		
		map.on ( "click", function ( event ) {
						
			if ( ( mapClick === "property" ) && !event.graphic ) {
			
				finder ( { x: event.mapPoint.x, y: event.mapPoint.y }, "searchresults" );
				
				lastSearch = "click";
				query ( "#searching" ).removeClass ( "hidden" );
						
			} else if ( mapClick === "identify" ) {
			
				//add click point information
				var latlon = Format.XYasLatLon ( event.mapPoint.y, event.mapPoint.x, map.extent, mapExtentInLatLon ),
					info = {  
						"YX": parseInt ( event.mapPoint.y ) + ", " + parseInt ( event.mapPoint.x ), 
						"Lat Lon": latlon.lat + ", " + latlon.lon, 
						"USNG": LLtoUSNG ( latlon.lat, latlon.lon, 4 )
					};
				query ( "#idlayerloccont" ).innerHTML ( Format.objectAsTable ( info , "proptbl", true ) ) ;
			
				//add field information of selected layer in dropdown
				query ( "#idlayerdatacont" ).empty ( );
				idLayers ( { x: event.mapPoint.x, y: event.mapPoint.y, lyridx : query ( "#idlayerlist" ).val ( ) } );
								
				//show idlayer div				
				showDiv ( 'idlayers' );
								
				//add pointer to map at the clicked location
				connect.publish ( "/add/graphics", { 
					graphictype: "location",
					x: event.mapPoint.x, 
					y: event.mapPoint.y, 
					desc: null,
					removegraphics: [ ], 
					zoom: false 
				} );
			
			}	
		
		} );
		
		query ( "#scrolltodataleft, #scrolltodataright" ).on ( "click", function ( event ) {
		
			win.scrollIntoView ( dom.byId ( "aside" ) );
			
		} );
					
	} );		

}

//delete location graphic from map
function delLocationGraphic ( ) {

	if ( locationGraphic ) { 
	
		var selectionLayer = agsServices[ serviceNames.indexOf ( "selection" ) ];
		selectionLayer.remove ( locationGraphic );
		locationGraphic = null;	
	
	}

}	

//add graphics to map
function addGraphics ( data ) {

	require ( [
		"dojo/request/script", 
		"esri/geometry/Extent",		
		"esri/graphic", 
		"esri/symbols/PictureMarkerSymbol",
		"esri/symbols/SimpleFillSymbol", 
		"esri/symbols/SimpleLineSymbol", 
		"esri/SpatialReference", 
		"esri/geometry/Point", 
		"dojo/_base/Color",
		"dojo/_base/array",
		"dojo/query",
		"mojo/TextToGeom" ], function ( script, Extent, Graphic, PictureMarkerSymbol, SimpleFillSymbol, SimpleLineSymbol, 
			SpatialReference, Point, Color, array, query, TextToGeom ) {
		
		var selectionLayer = agsServices[ serviceNames.indexOf ( "selection" ) ];
		
		//remove location graphic
		delLocationGraphic ( );	
				
		//remove helper graphics
		if ( data.removegraphics.length > 0 ) { 
			
			for ( var g = helperGraphics.length -1; g > -1; g-- ) { 
				
				if ( array.indexOf ( data.removegraphics, helperGraphics[ g ].attributes.type ) > -1 ) {
					
					selectionLayer.remove ( helperGraphics[ g ] );
					helperGraphics.splice ( g, 2 );
				}

			}			
					
		}	
			
		switch ( data.graphictype ) {
		
			case "parcelpoly":
			
				//get parcel gemoetry from gissde02 and add to map
				script.get ( config.web_service_rest + "v1/ws_geo_sdeattributequery.php", {
					jsonp: "callback",
					query: { 
						"table" : "parcel_p", 
						"fields" : "ST_AsText ( shape ) as parcelgeom", 
						"parameters" : "pid='" + data.groundpid + "'",
						"source" : "tax"
					}
				} ).then ( function ( parceldata ) {
				
					//remove parcel graphic
					if ( parcelGraphic ) 
						selectionLayer.remove ( parcelGraphic );
					parcelGraphic = null;	
				
					if ( parceldata.length > 0 ) {
					
						//add parcel feature to map
						parcelGraphic = new Graphic ( 
							TextToGeom.polygon ( parceldata[ 0 ].parcelgeom, 2264 ), 
							new SimpleFillSymbol ( 
								SimpleFillSymbol.STYLE_SOLID, 
								new SimpleLineSymbol ( SimpleLineSymbol.STYLE_SOLID, new Color ( [ 0, 255, 102 ] ), 3 ), 
								new Color ( [ 0, 255, 102, 0 ] ) ), 
								{ "title" : "<h5>Selected Property</h5>", "content": "Parcel ID: " + data.taxpid + "<br/>" + data.address } ) ;
						selectionLayer.add ( parcelGraphic );	
																							
						//zoom to add feature
						if ( data.zoom ) {
						
							zoom.toExtent ( getGraphicsExtent ( [ parcelGraphic ] ) );
																											
						}	
													
					} else {					
						
						zoom.toExtent ( new Extent ( config.initial_extent ) );
					
					}

					//show property details	
					showDiv ( "propdetails" );					
				
				} );
			
				break;
		
			case "parcelpoint":
			
				array.forEach ( data.points, function ( item, i ) {
				
					//add the xy location to the map
					var parcelPtGraphic = new Graphic ( 
						new Point ( item.x, item.y, new SpatialReference ( config.initial_extent.spatialReference ) ), 
						new PictureMarkerSymbol ( "image/markers/" + ( i + 1 ) + ".png", 32, 36 ),
						{ "type" : "parcelpt" } ) ;
					
					helperGraphics.push ( parcelPtGraphic );
					selectionLayer.add ( parcelPtGraphic );					
									
				} );
			
				//zoom to add feature
				if ( data.zoom ) {
						
					zoom.toExtent ( getGraphicsExtent ( helperGraphics ) );
						
				}
			
				break;
				
			case "buffer":
			
				var bufferGraphic = new Graphic ( data.buffergeom, 
					new SimpleFillSymbol ( SimpleFillSymbol.STYLE_SOLID, 
					new SimpleLineSymbol ( SimpleLineSymbol.STYLE_SOLID, new Color ( [ 255, 0, 0, 0.65 ] ), 2 ),
					new Color ( [ 255, 0, 0, 0.35 ] ) ),
					{ "type" : "buffer" } );
			
				helperGraphics.push ( bufferGraphic );
				selectionLayer.add ( bufferGraphic );
			
				//zoom to add feature
				if ( data.zoom ) {
						
					zoom.toExtent ( getGraphicsExtent ( helperGraphics ) );
						
				}
				
				break;
				
			case "road":
			
				//get the road segments form gissde02 and add to the map
				script.get ( config.web_service_rest + "v1/ws_geo_sdeattributequery.php", {
					jsonp: "callback",
					query: { 
						"table" : "roads", 
						"fields" : "ST_AsText ( shape ) as roadgeom", 
						"parameters" : "wholestname = '" + data.wholestname + "'" + 
							( data.hasOwnProperty ( "jurisdiction" ) ? " and l_juris ='" + data.jurisdiction + "'" : "" ),
						"source" : "gis"
					}
				} ).then ( function ( roaddata ) {
				
					if ( roaddata.length > 0 ) {
					
						array.forEach ( roaddata, function ( item, i ) {
						
							var roadGraphic = new Graphic ( 
								TextToGeom.polyline ( item.roadgeom, 2264 ),
								new SimpleLineSymbol ( SimpleLineSymbol.STYLE_SOLID, new Color ( [ 0, 255, 102 ] ), 3 ), 
								{ type: "road", title : "<h5>Road</h5>", content: data.wholestname } );
							
							helperGraphics.push ( roadGraphic );
							
							selectionLayer.add ( roadGraphic );	
																							
						} );
						
						//zoom to add feature
						if ( data.zoom ) {
													
							zoom.toExtent ( getGraphicsExtent ( helperGraphics ) );
							
						}
						
					}
								
				} );
			
				break;	
		
			case "location":
			
				//add the xy location to the map
				locationGraphic = new Graphic ( 
					new Point ( data.x, data.y, new SpatialReference ( config.initial_extent.spatialReference ) ), 
					new PictureMarkerSymbol ( { url: "image/markers/loc.png", width: 25, height: 41, yoffset: 20 } ), 
					{ type: "loc", title : "<h5>Location</h5>", content: data.desc } ) ; 
					
				selectionLayer.add ( locationGraphic );	
					
				//zoom to add feature
				if ( data.zoom ) {
						
					zoom.toExtent ( getGraphicsExtent ( [ locationGraphic ] ) );
						
				}
						
				break;
		
		}
								
	} );		

}

function getGraphicsExtent ( graphics ) {

	var geometry, extent, ext;
	
	require ( [ 
		"dojo/_base/array",
		"esri/geometry/Point",
		"esri/geometry/Extent" ], function ( array, Point, Extent ) {
  
		array.forEach ( graphics, function ( graphic, i ) {
		
				geometry = graphic.geometry;
							
				if ( geometry instanceof Point ) {
				
					ext = new Extent ( parseFloat ( geometry.x ) - 1, parseFloat ( geometry.y ) - 1, 
						parseFloat ( geometry.x ) + 1, parseFloat ( geometry.y ) + 1, geometry.spatialReference );
								
				} else if ( geometry instanceof Extent ) { 
				
					ext = geometry;
					
				} else {
				
					ext = geometry.getExtent();
					
				}	

				if ( extent ) { 
				
					extent = extent.union ( ext );
					
				} else { 
					
					extent = new Extent ( ext );
					
				}	
		
		} );
		
    } );
	
	return extent;

}

function switchOnOffOverlay ( service, id, switchon ) {

	var overlay_store = layerListTree.model.store;
	
	overlay_store.fetchItemByIdentity ( { identity: id, onItem: function ( item ) {
			
		overlay_store.setValue ( item, 'checked', switchon );
		toggleOverlays ( service, switchon, item[ ( service === "overlays" ? "dyn" : "dyntrans" ) ] );	
				
	} } );

}

function toggleOverlays ( service, show, inputlyrs ) {

	var lyrs = agsServices[ serviceNames.indexOf ( service ) ].visibleLayers;
			
	for ( var i = 0; i < inputlyrs.length ; i++ ) {
	
		if ( show ) { 
		
			if ( lyrs.indexOf ( inputlyrs[ i ] ) < 0 )
				lyrs.push ( inputlyrs[ i ] );
			
		} else {
		
			lyrs.splice ( lyrs.indexOf ( inputlyrs[ i ] ), 1 );	
		
		}	
	
	}
	
	agsServices[ serviceNames.indexOf ( service ) ].setVisibleLayers ( lyrs );
	legend.refresh();
		
}
			
var zoom = {
	
	toExtent: function ( extent ) {
	
		//done to work properly, when zooming to the extent of a point with a dynamic mapservice as the basemap
		if ( extent.xmax - extent.xmin < 100 ) { 
			extent.xmin -= 100 - ( extent.xmax - extent.xmin );
			extent.xmax += 100 + ( extent.xmax - extent.xmin );
		}
		
		if(extent.ymax - extent.ymin < 100){
			extent.ymin -= 100 - ( extent.ymax - extent.ymin );
			extent.ymax += 100 + ( extent.ymax - extent.ymin );	
		}
			
		map.setExtent ( extent.expand ( 2 ) );
	
	},
	
	toSelectedParcel: function ( ) {
	
		this.toExtent ( getGraphicsExtent ( [ parcelGraphic ] ) );
	
	}
	
};
