var config = {
	
	initial_extent: 
	{
		xmin: 1384251.24585599,
		ymin: 460978.995855999,
		xmax: 1537013.50075424,
		ymax: 660946.333333335,
		spatialReference: { wkid: 2264 }
	},
	
	min_scale: 425000,
	
	overlay_services:
	{
		
		overlays_trans:  
		{ 
			url: "http://gisags03/ArcGIS03/rest/services/overlays/MapServer", 
			opacity: 0.5, 
			visible: true,
			visiblelyrs: [ -1 ]
		},

		overlays_streets:  
		{ 
			url: "http://gisags03/ArcGIS03/rest/services/overlays/MapServer", 
			opacity: 1.0, 			
			visible: true,
			visiblelyrs: [ -1 ]
		}			
						
	},
	
	classic_services:
	{
		
		basemap: 
		{
			streets:  
			{ 
				url: "http://gisags03/ArcGIS03/rest/services/classic/MapServer", 
				opacity: 1.0,
				visible: true,
				visiblelyrs: [ 22, 24, 26, 62, 67, 69, 82, 83, 84, 86, 88, 90, 92, 94, 96, 98, 100 ]
			},
			
			aerial: 
			{ 
				url: "http://gisags03/ArcGIS03/rest/services/aerial2014/MapServer", 
				opacity: 1.0,
				visible: false
			},
			
					
			streets_aerial: 
			{ 
				url: "http://gisags03/ArcGIS03/rest/services/classic/MapServer", 
				opacity: 1.0,
				visible: false,
				visiblelyrs: [ 23, 25, 26, 62, 68, 70, 82, 83, 85, 87, 89, 91, 93, 95, 97, 99, 101 ]
			}		
			
		},

		overlays: 
		{
		
			overlays_trans:  
			{ 
				url: "http://gisags03/ArcGIS03/rest/services/classic/MapServer", 
				opacity: 0.5, 
				visible: true,
				visiblelyrs: [ -1 ]
			},

			overlays_streets:  
			{ 
				url: "http://gisags03/ArcGIS03/rest/services/classic/MapServer", 
				opacity: 1.0, 			
				visible: true,
				visiblelyrs: [ 0, 1, 2, 3, 26, 46, 47, 80 ]
			},

			overlays_aerial:  
			{ 
				url: "http://gisags03/ArcGIS03/rest/services/classic/MapServer", 
				opacity: 1.0, 			
				visible: false,
				visiblelyrs: [ 0, 1, 2, 4, 26, 46, 47, 81 ]
			}				
							
		}		
						
	},
	
	identify_services:
	{
				
		floodzone:  
		{ 
			url: "http://meckmap.mecklenburgcountync.gov/ArcGIS/rest/services/stormwater/floodoverlays/MapServer"
		} 
	
	},

	geometry_service: "http://gisags03/ArcGIS03/rest/services/Geometry/GeometryServer",
	
	print_task: "http://polaris3g.mecklenburgcountync.gov/polarisv/rest/services/print/ExportWebMap/GPServer/Export%20Web%20Map",
	
	web_service_local: "php/",
	
	web_service_rest: "http://maps.co.mecklenburg.nc.us/rest/",
	
	arcgisserver_proxy: "php/proxy.php"
	
};		