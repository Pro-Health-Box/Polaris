function basemapInit() {

	require ( [ 
		"esri/dijit/Basemap",
		"esri/dijit/BasemapLayer",
		"esri/geometry/Extent",
		"mojo/BasemapSwitch",
		"dojo/_base/array",
		"dojo/dom",
		"dojo/query",
		"dojo/NodeList-manipulate" ], function ( Basemap, BasemapLayer, Extent, BasemapSwitch, array, dom, query ) {
		
		// Initialize basemapswitch control
		var basemapSwitch = new BasemapSwitch ( { 	
			
			selectedBasemap: "streets", 
			
			basemaps: 
				[
					new Basemap ( {	"id": "streets", layers: [ 
						new BasemapLayer ( { url: "http://gisags03/ArcGIS03/rest/services/basemap/MapServer"} )
					] } ), 
					
					new Basemap ( {	"id": "aerials", layers: [ 
						new BasemapLayer ( { url: "http://gisags03/ArcGIS03/rest/services/aerial2014/MapServer" } )
					] } ),
					
					new Basemap ( {	"id": "hybrid", layers: [ 
						new BasemapLayer ( { url: "http://gisags03/ArcGIS03/rest/services/aerial2014/MapServer" } ),
						new BasemapLayer ( { url: "http://gisags03/ArcGIS03/rest/services/basemap_aerial/MapServer" } )
					] } ),
					
					new Basemap ( {	"id": "topo", layers: [ 
						new BasemapLayer ( { url: "http://gisags03/ArcGIS03/rest/services/topohillshade/MapServer" } )
					] } )
					
				
				],
				
			aerialsLayers:
				[
					new BasemapLayer ( { url: "http://gisags03/ArcGIS03/rest/services/aerial2014/MapServer" } ),
					new BasemapLayer ( { url: "http://gisags03/ArcGIS03/rest/services/aerial2013/MapServer" } ),
					new BasemapLayer ( { url: "http://gisags03/ArcGIS03/rest/services/aerial2012/MapServer" } ),
					new BasemapLayer ( { url: "http://gisags03/ArcGIS03/rest/services/aerial2011/MapServer" } ),
					new BasemapLayer ( { url: "http://gisags03/ArcGIS03/rest/services/aerial2010/MapServer" } ),
					new BasemapLayer ( { url: "http://gisags03/ArcGIS03/rest/services/aerial2009/MapServer" } )
				],
			
			map: map,

			onLabelChange: function ( event ) {
			
				switchOnOffOverlay ( "overlays", event.label, event.show );
							
			},

			onBaseMapChange: function ( basemaplyrs ) {
			
				if ( basemaplyrs.indexOf ( "basemap" ) > -1 ) {
				
					query ( "#basemaplegend" ).innerHTML ( "<img src='image/legend/streetlegend.png' />" );
					printLegend = "street";
				
				} else if ( basemaplyrs.indexOf ( "basemap_aerial" ) > -1 ) {
				
					query ( "#basemaplegend" ).innerHTML ( "<img src='image/legend/hybridlegend.png' />" );
					printLegend = "hybrid";
				
				} else if ( basemaplyrs.indexOf ( "topohillshade" ) > -1 ) {
				
					query ( "#basemaplegend" ).innerHTML ( "<img src='image/legend/topolegend.png' />" );
					printLegend = "topo";
				
				} else {
					
					query ( "#basemaplegend" ).innerHTML ( "No Legend" );
					printLegend = null;
				
				}
				
			}			
						
		} ).placeAt ( dom.byId ( "basemapswitch" ) );
		basemapSwitch.startup();
		
		query ( "#basemaplegend" ).innerHTML ( "<img src='image/legend/streetlegend.png' />" );
		printLegend = "street";
		
	} );

}

function overlaysInit() {

	require ( [ 
		"esri/layers/ArcGISDynamicMapServiceLayer", 
		"esri/layers/GraphicsLayer" ], function ( ArcGISDynamicMapServiceLayer, GraphicsLayer ) {
		
		var printLegendLayers = [];

		// Initialize dynamic map services
		for ( var dynamic_service in config.overlay_services ) {
			
			var srvc = new ArcGISDynamicMapServiceLayer ( config.overlay_services [ dynamic_service ].url, 
				{ 
					id : dynamic_service, 
					opacity : config.overlay_services [ dynamic_service ].opacity,
					visible: config.overlay_services [ dynamic_service ].visible				
				} 
			);
			
			if ( config.overlay_services [ dynamic_service ].visiblelyrs ) {
			
				srvc.setVisibleLayers ( config.overlay_services [ dynamic_service ].visiblelyrs );
				
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
		"dojo/dom-attr",
		"cbtree/extensions/TreeStyling" ], function ( ForestStoreModel, Tree, Legend, ItemFileWriteStore, dom, domAttr ) {
		
			// Initialize layer tree
			if ( !layerListTree ) {
			
				var overlay_store = new ItemFileWriteStore ( { url: "data/overlays.json?foo=1009" } );
			
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
				
				 // Hide Labels and Icons for the entire tree.
				layerListTree.set ( "iconStyle", { display: "none" } );
			
				layerListTree.on ( "checkBoxClick", function ( item, nodeWidget, event ) {
				
					if ( selectedAddress.hasOwnProperty( "taxpid" ) ) {
					
						switch ( item.id[ 0 ] ) {
						
							case "envgrp":
								
								overlay_store.fetchItemByIdentity ( { identity: item.id[ 0 ], onItem: function ( data ) {
								
									for ( var child in data.children ) {
									
										if ( data.children[ child ].clone[ 0 ] )		
											domAttr.set ( dom.byId ( data.children[ child ].id[ 0 ] + 2 ), "checked", data.children[ child ].checked[ 0 ] );
									
									}															
								
								} } );
							
								break;
								
							case "wtrqulbuff": case "postconstdist": case "fldp": case "strmwtrsheds": case "drnkwtrsheds": case "soils":
							
								domAttr.set ( dom.byId ( item.id[ 0 ] + 2 ), "checked", item.checked[ 0 ] );
						
						}
					
					}
						
					//add and remove layer in the overlays map service
					if ( item.hasOwnProperty ( "streets" ) ) {
					
						toggleOverlays ( "overlays_streets", item.checked[ 0 ], item.streets );
						
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
						{ layer: agsServices[ serviceNames.indexOf ( "overlays_streets" ) ], hideLayers: [ 0, 1, 2 ], title: "Opaque Layers" },
						{ layer: agsServices[ serviceNames.indexOf ( "overlays_trans" ) ], title: "Transparent Layers" }
					] 
				}, "overlaylegend" );
				legend.startup();
				
			}	
						
	} );		

}