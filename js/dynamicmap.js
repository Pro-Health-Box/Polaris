function basemapInit() {

	require ( [ 
		"esri/dijit/Legend",
		"esri/geometry/Extent",
		"esri/layers/ArcGISDynamicMapServiceLayer",
		"mojo/BasemapSwitchLite",
		"dojo/dom" ], function ( Legend, Extent, ArcGISDynamicMapServiceLayer, BasemapSwitchLite, dom ) {
		
		// Initialize dynamic map services
		for ( var basemap_service in config.classic_services.basemap ) {
			
			var srvc = new ArcGISDynamicMapServiceLayer ( config.classic_services.basemap [ basemap_service ].url, 
				{ 
					id : basemap_service, 
					opacity : config.classic_services.basemap [ basemap_service ].opacity,
					visible: config.classic_services.basemap [ basemap_service ].visible				
				} 
			);
			
			if ( config.classic_services.basemap [ basemap_service ].visiblelyrs ) {
			
				srvc.setVisibleLayers ( config.classic_services.basemap [ basemap_service ].visiblelyrs );
				
			}
			
			agsServices.push ( srvc );
			serviceNames.push ( basemap_service ); //store dynamic service names ti easily pull an ags service later in the code
			
		}
		
		// Add all map services to the map
		map.addLayers ( agsServices );
		
		// Initialize basemapswitch control
		basemapSwitch = new BasemapSwitchLite ( { 	
			
			basemap: "streets", 
			onClick: function ( basemap ) {	
				
				if ( basemap == "streets" ) {
				
					//change basemaps
					agsServices[ serviceNames.indexOf ( "aerial" ) ].hide();
					agsServices[ serviceNames.indexOf ( "streets_aerial" ) ].hide();
					agsServices[ serviceNames.indexOf ( "overlays_aerial" ) ].hide();
					
					agsServices[ serviceNames.indexOf ( "streets" ) ].show();
					agsServices[ serviceNames.indexOf ( "overlays_streets" ) ].show();
					
					printLegend = "street";
				
				} else {
				
					//change basemaps
					agsServices[ serviceNames.indexOf ( "streets" ) ].hide();
					agsServices[ serviceNames.indexOf ( "overlays_streets" ) ].hide();
					
					agsServices[ serviceNames.indexOf ( "aerial" ) ].show();
					agsServices[ serviceNames.indexOf ( "streets_aerial" ) ].show();
					agsServices[ serviceNames.indexOf ( "overlays_aerial" ) ].show();
					
					printLegend = "hybrid";
				
				}
										
			} 
			
		} ).placeAt ( dom.byId ( "basemapswitch" ) );
		basemapSwitch.startup();
		
		
		//add legend
		var basemaplegend = new Legend ( { 
			map:map, 
			layerInfos: [  
				{ layer: agsServices[ serviceNames.indexOf ( "streets" ) ], title: "Streets Layers" },
				{ layer: agsServices[ serviceNames.indexOf ( "streets_aerial" ) ], title: "Aerial Layers" }
			] 
		}, "basemaplegend"  );
		basemaplegend.startup();
		
		
		printLegend = "street";
		
	} );

}

function overlaysInit() {

	require ( [ 
		"esri/layers/ArcGISDynamicMapServiceLayer",
		"esri/layers/GraphicsLayer" ], function ( ArcGISDynamicMapServiceLayer, GraphicsLayer ) {
		
		var printLegendLayers = [];

		// Initialize dynamic map services
		for ( var dynamic_service in config.classic_services.overlays ) {
					
			var srvc = new ArcGISDynamicMapServiceLayer ( config.classic_services.overlays [ dynamic_service ].url, 
				{ 
					id : dynamic_service, 
					opacity : config.classic_services.overlays [ dynamic_service ].opacity,
					visible: config.classic_services.overlays [ dynamic_service ].visible				
				} 
			);
			
			if ( config.classic_services.overlays [ dynamic_service ].visiblelyrs ) {
			
				srvc.setVisibleLayers ( config.classic_services.overlays [ dynamic_service ].visiblelyrs );
				
			}
			
			agsServices.push ( srvc );
			serviceNames.push ( dynamic_service ); //store dynamic service names ti easily pull an ags service later in the code
			printLegendLayers.push ( dynamic_service );
			
		}
		
		// Initialize graphic layers
		agsServices.push( new GraphicsLayer() );
		serviceNames.push ( "selection" ); //store dynamic service name for future usage
			
		// Add all map services to the map
		map.addLayers ( agsServices );
				
		// Initialize Toolbox
		toolboxInit ( printLegendLayers );

	} );		

}

//Layer Tree Control Initialization
function layerTreeLegendInit() {

	require ( [ 
		"cbtree/models/ForestStoreModel" ,
		"cbtree/Tree",
		"esri/dijit/Legend",
		"dojo/data/ItemFileWriteStore",
		"dojo/dom",
		"dojo/dom-attr" ], function ( ForestStoreModel, Tree, Legend, ItemFileWriteStore, dom, domAttr ) {
			
			// Initialize layer tree
			if ( !layerListTree ) {
			
				var overlay_store = new ItemFileWriteStore ( { url: "data/overlaysclassic.json?foo=1009" } );
			
				layerListTree = new Tree ( { 
			
					autoExpand: true, 
					checkBoxes: true, 
					model: 
						new ForestStoreModel ( { 
							
							store: overlay_store, 
							query: { type: "group", show: true }, 
							rootId: "root", 
							rootLabel: "Overlays List", 
							childrenAttrs: [ "children" ] 
							
						} ), 
					showRoot: false 
				
				} );
			
				layerListTree.on ( "checkBoxClick", function ( item, nodeWidget, event ) {
			
					var assocCheckboxes = {
						"2a": "twoa",
						"2b": "twob",
						"2d": "twod",			
						"2e": "twoe",
						"2f": "twof",
						"2g": "twog"
					}
				
					if ( selectedAddress ) {
					
						switch ( item.id[ 0 ] ) {
						
							case "2":
								for ( var chkbox in assocCheckboxes ) {

									domAttr.set ( dom.byId ( assocCheckboxes[chkbox] ), "checked", item.checked[ 0 ] );
														
								};
								
								break;
							
							case "2a": case "2b": case "2d": case "2e": case "2f": case "2g":
								domAttr.set ( dom.byId ( assocCheckboxes [ item.id[ 0 ] ] ), "checked", item.checked[ 0 ] );
								break;
						
						}

					}
					
					//add and remove layer in the streets overlays map service
					if ( item.hasOwnProperty ( "streets" ) ) {
					
						toggleOverlays ( "overlays_streets", item.checked[ 0 ], item.streets );
						
					}	
					
					//add and remove layer in the aerial overlays map service
					if ( item.hasOwnProperty ( "aerial" ) ) {
					
						toggleOverlays ( "overlays_aerial", item.checked[ 0 ], item.aerial );
						
					}	
							
					//add and remove layer in the overlays transparent map service
					if ( item.hasOwnProperty ( "trans" ) ) {
					
						toggleOverlays ( "overlays_trans", item.checked[ 0 ], item.trans );
																
					}
						
				} );
				
				layerListTree.placeAt(dom.byId ( "layerstree" ));
				layerListTree.startup();
			
			}
			
			//add legend
			if ( !legend ) {
				legend = new Legend ( { 
					map:map, 
					layerInfos: [  
						{ layer: agsServices[ serviceNames.indexOf ( "overlays_streets" ) ], hideLayers: [ 0, 1, 2 ], title: "Overlay Layers" },
						{ layer: agsServices[ serviceNames.indexOf ( "overlays_aerial" ) ], hideLayers: [ 0, 1, 2 ], title: "Overlay Layers" },
						{ layer: agsServices[ serviceNames.indexOf ( "overlays_trans" ) ], title: "Transparent Layers" } 
					] 
				}, "overlaylegend"  );
				legend.startup();
			}
			
	} );		

}