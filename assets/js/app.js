// Variabili globali
var map, ppJSON, abJSON, zone;
var ab,pp;
$(window).resize(function() {
  sizeLayerControl();
});

$("#about-btn").click(function() {
	
  content = "<p>Questa applicazione web &egrave; stata sviluppata sfruttando i servizi ReST "+ 
  			"esposti dal <a href='http://www.portaleacque.salute.gov.it' target='_blank'>Portale Acque</a> del <a href='http://salute.gov.it' target='_blank'>Ministero della Salute</a>. "+
  			"I dati sono rilasciati sotto licenza Creative Commons <a href='http://creativecommons.org/licenses/by-nc-nd/4.0/deed.it' target='_blank'>Attribuzione-Non commerciale-Non opere derivate 4.0 Unported</a>. "+
  			"La classificazione delle zone si basa su quella riportata nell’Allegato A alla <a href='http://www.artaabruzzo.it/download/aree/acqua/balneazione/20160414_AL_balneazione_all_08a_2016_dgr_148_2016.pdf' target='_blank'>D.G.R. n. 148 del 10/3/2016</a>.</p>"+
  			"<p>Progettata e sviluppata da <a href='http://alessiodilorenzo.it' target='_blank'>Alessio Di Lorenzo</a> su base <a href='https://github.com/bmcbride/bootleaf' target='_blank'>BootLeaf</a>."
  bootbox.dialog({
  	title: "Informazioni",
  	message: content
  });
  $(".navbar-collapse.in").collapse("hide");
  return false;
});

$("#list-btn").click(function() {
  $('#sidebar').toggle();
  map.invalidateSize();
  return false;
});

$("#nav-btn").click(function() {
  $(".navbar-collapse").collapse("toggle");
  return false;
});

$("#sidebar-toggle-btn").click(function() {
  $("#sidebar").toggle();
  map.invalidateSize();
  return false;
});

$("#sidebar-hide-btn").click(function() {
  $('#sidebar').hide();
  map.invalidateSize();
});

function sizeLayerControl() {
  $(".leaflet-control-layers").css("max-height", $("#map").height() - 50);
}

// Mappe di base
var streets = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png', {
	attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
	subdomains: 'abcd',
	maxZoom: 19
});

var labels = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}@2x.png',{
	attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
});

var ortofoto = L.layerGroup([
	L.tileLayer.wms('http://213.215.135.196/reflector/open/service?', {
		layers: 'rv1',
		format: 'image/png',
		attribution: '<a href="http://realvista.it" target="_blank">RealVista</a> 1.0 Open WMS &copy; <a href="http://e-geos.it" target="_blank">e-GEOS SpA</a> - CC BY SA'
	}),
 	L.tileLayer('http://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png',{
		attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
	})
]);


// Lettura del file di configurazione
var arrayEscluse = [];
var arrayComuni = []; 
$.getJSON("config.json",function(resp){
	// Popolamento dell'array delle zone escluse da usare come filtro sul layer
	var escluse = resp.config.zoneEscluse;
	for (e=0; e < escluse.length; e++){
		arrayEscluse.push(escluse[e].codiceZona);
	}
	// Codice Portale Acque da usare per le chiamate ai servizi ReST
	codPortale = resp.config.codicePortale;
	populateLayerZone(codPortale,arrayEscluse);
	// Popolamento della lista nella barra laterale
	var comuni = resp.config.comuni;
	for (c=0; c < comuni.length; c++){
		arrayComuni.push(comuni[c].nome);
		getLista(comuni[c].istat,comuni[c].nome);
	}
});

var zoneList;
function getLista(istat,nome){
	$.getJSON("proxy.php?format=1&url=http://www.portaleacque.salute.gov.it/PortaleAcquePubblico/ricercaAreeBalneazione.do?codiceComune="+istat+"&type=areebalneazione&format=2", function(resp){
		response = JSON.parse(resp);
		for (a=0; a < response.areeBalneazione.length; a++) {
			response.areeBalneazione[a]['istat'] = istat;
			response.areeBalneazione[a]['comune'] = nome;
			// console.log(response.areeBalneazione[a]);
			minx = response.areeBalneazione[a].minx
			miny = response.areeBalneazione[a].miny
			maxx = response.areeBalneazione[a].maxx
			maxy = response.areeBalneazione[a].maxy
			// Popola la lista nella sidebar
			$(".list").append(
				"<tr onclick='zoomTo("+minx+","+miny+","+maxx+","+maxy+");' style='cursor:pointer;'>"+
					"<td class='nomeComune'>"+response.areeBalneazione[a].comune+"</td>"+
					"<td class='nomeZona'><span class='"+textColor(response.areeBalneazione[a].classe)+"'>"+response.areeBalneazione[a].nome+"</span></td>"+
					"<td class='hidden'>"+response.areeBalneazione[a].codice+"</td>"+
				"</tr>"
			);
		}
		// Filtro con List.js
		var searchOptions = {
		  valueNames: [ 'nomeComune', 'nomeZona' ]
		};
		zoneList = new List('features', searchOptions);
		// Ordinamento iniziale
		zoneList.sort('nomeComune', { order: "asc" });
	});
}

// Typeahead
$('.search').typeahead({ 
	source:arrayComuni,
	afterSelect: function(selection){
		// console.log(data)
		zoneList.search(selection);
	} 
});

function textColor(classe){
	switch (classe) {
		case "1": return "text-primary";
		case "2": return "text-success";
		case "3": return "text-warning";
		case "4": return "text-danger";
	}
}

function zoomTo(minx,miny,maxx,maxy){
	map.fitBounds([
    	[miny, minx],
    	[maxy, maxx]
	],{padding: [10, 10]});
}

// Richiesta ai servizi PP (punti di prelievo) e AB (aree balneabili). 
// Alcuni attributi dei PP vengono trasferiti alle AB attraverso il confronto del CODICE area allo scopo di tematizzare il layer
function populateLayerZone(codPortale,arrayEscluse){
	$.getJSON("proxy.php?format=0&url=www.portaleacque.salute.gov.it/PortaleAcquePubblico/rest/layer/PP/"+codPortale,function(pp){
		ppJSON = pp;
		// Ordina l'array in base a CODICE crescente
	    ppJSON.features.sort(function(a, b) {
	   		return parseFloat(a.properties.CODICE) - parseFloat(b.properties.CODICE);
		});
	}).done(function(){
		$.getJSON("proxy.php?format=0&url=www.portaleacque.salute.gov.it/PortaleAcquePubblico/rest/layer/AB/"+codPortale,function(ab){
			abJSON = ab;
			// Ordina l'array in base a CODICE crescente
			abJSON.features.sort(function(a, b) {
	   			return parseFloat(a.properties.CODICE) - parseFloat(b.properties.CODICE);
			});
		}).done(function(){
			for (i=0; i < abJSON.features.length; i++) {
				if (abJSON.features[i].properties.CODICE = ppJSON.features[i].properties.CODICE){
					abJSON.features[i].properties['PP_CLASSE'] = parseInt(ppJSON.features[i].properties.CLASSE);
					abJSON.features[i].properties['PP_LNG'] = ppJSON.features[i].geometry.coordinates[0];
					abJSON.features[i].properties['PP_LAT'] = ppJSON.features[i].geometry.coordinates[1];
				}
			}
			
			// Rimuove dalla feature collection le zone escluse in base a config.json
			if (arrayEscluse.length > 0) {
				for (e=0; e<arrayEscluse.length;e++){
					var index = abJSON.features.map(function(el) {
						return el.properties.CODICE;
					}).indexOf(parseInt(arrayEscluse[e]));
					// console.log(index);
					abJSON.features.splice(index,1);
				}
			}
			
			// Layer zone - default style 
			zoneStyle = function (feature) {
				switch (feature.properties.PP_CLASSE) {
			       	case 0: return {color: "#ffffff", weight: 1};
			        case 1: return {color: "#0099ff", weight: 1};
			        case 2: return {color: "#00ff00", weight: 1};
			        case 3: return {color: "#ffff00", weight: 1};
			        case 4: return {color: "#ff0000", weight: 1};
			    }
			}

			// layer zone
			zone = L.geoJson(abJSON,{
		  		onEachFeature: function (feature,layer) {
		  			layer.on('mouseover',function(){
		  				this.setStyle({
					        weight: 3,
					        color: '#ff4000',
					        dashArray: '3',
					        fillOpacity: 0
					    });
		  			});
		  			layer.on('mouseout',function(e){
		  				zone.resetStyle(e.target);
		  			});
		  			layer.on('click',function(e){
		  				// console.log(feature.properties)
		  				getDetails(feature.properties,feature.geometry);
		  			});
		  		},
		  		style: zoneStyle
			}).addTo(map);
			// Fit map 
			map.fitBounds(zone.getBounds());
		});
	});
}

// Pannello dettagli
function getDetails(prop,geom){
	// Popup per aree non analizzate (classe 0)
	if (prop.PP_CLASSE == 0) {
		bootbox.dialog({
  			title: "Codice zona: "+prop.CODICE,
  			message: "<p class='text-muted'><strong>Non &egrave; possibile mostrare i dettagli per questa zona!<strong></p>"
  		});
  		return;
	}
	
	$.getJSON("proxy.php?format=1&url=http://www.portaleacque.salute.gov.it/PortaleAcquePubblico/datiArea.do?codiceArea="+prop.CODICE+"&tipoArea=AB", function(response){
		// console.log(JSON.parse(response));
		var areaBalneazione = JSON.parse(response).areaBalneazioneBean;
		var analisi = JSON.parse(response).analisi;
		var storico = JSON.parse(response).analisiStorico;
		
		// Template dettagli
		var template = 	"<div class='row'>"+
							"<div class='col-md-4'>"+
								"<span class='text-muted'>Qualità dell'acqua: </span>"+
								"<strong>"+qualityDescription(areaBalneazione.classe)+"</strong> "+qualityLegend(areaBalneazione.classe)+
							"</div>"+
							"<div class='col-md-8 text-right'>"+
								"<span class='text-muted'>Stato: </span><strong>"+areaBalneazione.statoDesc+"</strong><br/>"+
								"Stagione balneare dal "+formatDate(areaBalneazione.dataInizioStagioneBalneare)+" al "+formatDate(areaBalneazione.dataFineStagioneBalneare)+"</strong><br/>"+
							"</div>"+
						"</div>"+
						"<hr>"+
						"<div class='row'>"+
							"<div class='col-md-12'>"+
								"<ul class='nav nav-tabs' style='margin-bottom:5px;'>"+
									"<li class='active'><a data-toggle='tab' href='#localizzazione-tab'><i class='fa fa-map-marker'></i> Localizzazione</a></li>"+
						  			"<li><a data-toggle='tab' href='#analisi-tab'><i class='fa fa-flask'></i> Analisi stagione in corso</a></li>"+
						  			"<li><a data-toggle='tab' href='#storico-tab'><i class='fa fa-history'></i> Analisi stagione precedente</a></li>"+
								"</ul>"+
								"<div class='tab-content'>"+
									"<div id='localizzazione-tab' class='tab-pane fade in active'>"+
										"<div class='thumbnail'><div id='detailMap' style='widht:100%;height:280px;'></div></div>"+
										"<div class='thumbnail'>"+
										"<table class='table table-striped table-condensed table-bordered'>"+
											"<tr><td>Comune</td><td>"+areaBalneazione.comune+" ("+areaBalneazione.siglaProvincia+")</td></tr>"+
											"<tr><td>Punto di prelievo</td><td> Lat: "+prop.PP_LAT+", Lon: "+prop.PP_LNG+"</td></tr>"+
										"</table>"+
										"</div>"+
									"</div>"+
									"<div id='analisi-tab' class='tab-pane fade'>"+
										"<div class='thumbnail'><p style='padding:5px;margin:0px;border:1px solid #DDD;'><i class='fa fa-ban text-danger'></i> Limite Escherichia coli: <strong>"+areaBalneazione.limiteEc+"</strong>, Limite Enterococchi: <strong>"+areaBalneazione.limiteEi+"</strong></p></div>"+
										"<div class='thumbnail' style='width:100%;height:250px;'><canvas id='analisi-chart' style='border:1px solid #dddddd;'></canvas></div>"+
										"<div class='thumbnail'>"+
											"<p class='text-muted' style='font-size:11px;margin-bottom:-3px;'>Le analisi sono espresse in <strong>cfu/100ml</strong> o equivalente, rappresentate su scala logaritmica</p>"+
											"<table id='prelievi-table' class='table table-striped table-condensed table-bordered'>"+
											"</table>"+
										"</div>"+
									"</div>"+
									"<div id='storico-tab' class='tab-pane fade'>"+
										"<div class='thumbnail'><p style='padding:5px;margin:0px;border:1px solid #DDD;'><i class='fa fa-ban text-danger'></i> Limite Escherichia coli: <strong>"+areaBalneazione.limiteEc+"</strong>, Limite Enterococchi: <strong>"+areaBalneazione.limiteEi+"</strong></p></div>"+
										"<div class='thumbnail' style='width:100%;height:250px;'><canvas id='storico-chart' style='border:1px solid #dddddd;'></canvas></div>"+
										"<div class='thumbnail'>"+
											"<p class='text-muted' style='font-size:11px;margin-bottom:-3px;'>Le analisi sono espresse in <strong>cfu/100ml</strong> o equivalente, rappresentate su scala logaritmica</p>"+
											"<table id='storico-table' class='table table-striped table-condensed table-bordered'>"+
											"</table>"+
										"</div>"+
									"</div>"+
								"</div>"+
							"</div>"+
						"</div>";
		// Modal
		bootbox.dialog({
			size:'large',
  			title: areaBalneazione.nome,
  			message: template,
  			className: "my-modal-details"
		 });
		 
		 $(".my-modal-details").on("shown.bs.modal",function(){
		 	// Stralcio
  			detailMap = L.map("detailMap",{
				zoom: 6,
			  	center: [42.5, 14.5],
			  	zoomControl: false
			});
				
			var base = L.layerGroup([
				L.tileLayer.wms('http://213.215.135.196/reflector/open/service?', {
					layers: 'rv1',
					format: 'image/png',
					attribution: '<a href="http://realvista.it" target="_blank">RealVista</a> 1.0 Open WMS &copy; <a href="http://e-geos.it" target="_blank">e-GEOS SpA</a> - CC BY SA'
				}),
			 	L.tileLayer('http://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}@2x.png',{
					attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
				})
			]).addTo(detailMap);
				
			var area = L.geoJson(null,{
				style: function (feature) {
			        switch (prop.PP_CLASSE) {
			        	// case 0: return {color: "#ffffff", fillOpacity:0.4, weight: 2};
			            case 1: return {color: "#0099ff", fillOpacity:0.4, weight: 2};
			            case 2: return {color: "#00ff00", fillOpacity:0.4, weight: 2};
			            case 3: return {color: "#ffff00", fillOpacity:0.4, weight: 2};
			            case 4: return {color: "#ff0000", fillOpacity:0.4, weight: 2};
			        }
			    }
			}).addTo(detailMap);
			area.addData(geom);
			
			detailMap.fitBounds(area.getBounds(), {
            	padding: [10, 10]
        	});
        	
        	var punto = L.marker(L.latLng(prop.PP_LAT,prop.PP_LNG )).addTo(detailMap);
        	
        	// Analisi
        	getAnalisi(analisi);
        	
        	// Storico
        	getStorico(storico);
        	
        	// Use data table plugin
			$('a[data-toggle="tab"]').on( 'shown.bs.tab', function (e) {
		        $.fn.dataTable.tables( {visible: true, api: true} ).columns.adjust();
		    });
			
			$('#prelievi-table,#storico-table').DataTable({
				scrollY:        140,
				scrollCollapse: true,
				paging:         false,
				order: 			[[ 0, "asc" ]],
				searching: 		false,
				info: 			false,
				language: 		{ url: "//cdn.datatables.net/plug-ins/9dcbecd42ad/i18n/Italian.json" },
				oLanguage: 		{sSearch: "Filtra tabella:", sInfo: "_TOTAL_ prelievi effettuati"}
			});
        	
        	// Grafici
        	drawCharts(analisi,storico);
		 });
		 
	});
}

function getAnalisi(analisi){
	var prelievi="<thead><tr><th>Data prelievo</th><th>Escherichia coli</th><th>Enterococchi</th><th>Superamento limite</th></tr></thead>";
	$.each(analisi,function(i,val){
		prelievi += styleRows(analisi[i]);
	});
	$("#prelievi-table").html(prelievi);
}

function getStorico(storico){
	var prelieviSt="<thead><tr><th>Data prelievo</th><th>Escherichia coli</th><th>Enterococchi</th><th>Superamento limite</th></tr></thead>";
	$.each(storico,function(i,val){
		prelieviSt += styleRows(storico[i]);
	});
	$("#storico-table").html(prelieviSt);
}

function styleRows(valore){
	
	var row = "<tr>";
	
	// Colonna data prelievi
	if (valore.flagOltreLimiti == 0) {
		row += "<td>"+valore.dataAnalisi+"</td>";
	} else {
		row += "<td><span class='text-danger'>"+valore.dataAnalisi+"</span></td>";
	}
	
	// Colona E. coli
	if (valore.valoreEscherichiaColi > 500) {
		row += "<td><span class='text-danger'><strong>"+valore.valoreEscherichiaColi+"</strong></span></td>";
	} else {
		row += "<td>"+valore.valoreEscherichiaColi+"</td>";
	}
	// Colonna Enterococchi
	if (valore.valoreEnterococchi > 200) {
		row += "<td><span class='text-danger'><strong>"+valore.valoreEnterococchi+"</strong></span></td>";
	} else {
		row += "<td>"+valore.valoreEnterococchi+"</td>";
	}
	
	// Flag oltre il limite
	if (valore.flagOltreLimiti == 0) {
		row += "<td>No</td>";
	} else {
		row += "<td><span class='text-danger'>Sì</span></td>";
	}
	
	row += "</tr>";
	
	return row;
}

function qualityDescription(classe){
	switch (classe) {
		case "1": return "<strong><span class='text-primary'>Eccellente</span></strong>";
		case "2": return "<strong><span class='text-success'>Buona</span></strong>";
		case "3": return "<strong><span class='text-warning'>Sufficiente</span></strong>";
		case "4": return "<strong><span class='text-danger'>Scarsa</span></strong>";
	}
}

function qualityLegend(classe){
	switch (classe) {
		case "1": return "<strong><span class='text-primary'><i class='fa fa-star'></i> <i class='fa fa-star'></i> <i class='fa fa-star'></i> <i class='fa fa-star'></i></span></strong>";
		case "2": return "<strong><span class='text-success'><i class='fa fa-star'></i> <i class='fa fa-star'></i> <i class='fa fa-star'></i></span></strong>";
		case "3": return "<strong><span class='text-warning'><i class='fa fa-star'></i> <i class='fa fa-star'></i></span></strong>";
		case "4": return "<strong><span class='text-danger'><i class='fa fa-star'></i></span></strong>";
	}
}

function formatDate(data){
	var datePart = data.match(/\d+/g),
  	year = datePart[0].substring(2), 
  	month = datePart[1], day = datePart[2];

  	return day+'/'+month+'/'+year;
}

// Mappa
map = L.map("map", {
	//zoom: 10,
  	//center: [42.5, 14.5],
  	layers: [streets],
  	zoomControl: true,
  	attributionControl: true
});

// Full extent
L.easyButton('fa-globe', startExtent, 'Estensione iniziale');
function startExtent(){	map.fitBounds(zone.getBounds()); }

// Geocoder indirizzi
L.easyButton('fa-map-marker', geocode, 'Cerca indirizzo');
var googleGeocodeProvider = new L.GeoSearch.Provider.Google();
var addressPin;
function geocode(){
	if (addressPin) {
		map.removeLayer(addressPin);
	}
  	bootbox.prompt("Digita un indirizzo", function(addressText) {                
		if (addressText === null) {                                             
	    	// Nessuna ricerca                              
	  	} else {
	    	googleGeocodeProvider.GetLocations( addressText, function ( data ) {
	    		// in data are your results with x, y, label and bounds (currently availabel for google maps provider only)
	    		// console.log(data);
	    		if (data[0].bounds){
	    			map.fitBounds(data[0].bounds,{ padding:[30,30] });
	    		} else {
	    			map.setView(new L.LatLng(data[0].Y,data[0].X),18);
	    		}
	    		addressPin = L.marker(L.latLng(data[0].Y,data[0].X )).addTo(map);
	    		addressPin.bindPopup(data[0].Label).on('popupclose',function(){
	    			map.removeLayer(addressPin);
	    		}).openPopup();
	    		
	    	});                    
	  	}
	});
}

/* Larger screens get expanded layer control and visible sidebar */
if (document.body.clientWidth <= 767) {
  var isCollapsed = true;
} else {
  var isCollapsed = true;
}

// Switcher
var baseLayers = {
  "Mappa": streets,
  "Ortofoto": ortofoto
};

var groupedOverlays = {
  
};

var layerControl = L.control.groupedLayers(baseLayers, groupedOverlays, {
  collapsed: isCollapsed
}).addTo(map);

// Legenda
var legend = L.control({position: 'bottomright'});
legend.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'info legend'),
        grades = [1, 2, 3, 4, 0],
        labels = ["Eccellente","Buona","Sufficiente","Scarsa","Non classificata"];
        colors = ["#0099ff","#00ff00","#ffff00","#ff0000","#c6c6c6"]

    div.innerHTML += "<h5>Qualit&agrave; acque</h5>";
    for (var i = 0; i < grades.length; i++) {
        div.innerHTML +=
            '<i style="background:' + colors[i] + '"></i> ' + labels[i]  + '<br>';
    }

    return div;
};

legend.addTo(map);

/* Highlight search box text on click */
$("#searchbox").click(function () {
  $(this).select();
});

/* Prevent hitting enter from refreshing the page */
$("#searchbox").keypress(function (e) {
  if (e.which == 13) {
    e.preventDefault();
  }
});

// Leaflet patch to make layer control scrollable on touch browsers
var container = $(".leaflet-control-layers")[0];
if (!L.Browser.touch) {
  L.DomEvent
  .disableClickPropagation(container)
  .disableScrollPropagation(container);
} else {
  L.DomEvent.disableClickPropagation(container);
}

// Creazione grafici
function drawCharts(analisi,storico){
	
	var labelsAnalisi = [], valuesAnalisiEntero = [], valuesAnalisiEcoli = [];
	var labelsStorico = [], valuesStoricoEntero = [], valuesStoricoEcoli = [];
	
	$.each(analisi,function(i,a_val){
		labelsAnalisi.push(analisi[i].dataAnalisi);
		valuesAnalisiEntero.push(analisi[i].valoreEnterococchi);
		valuesAnalisiEcoli.push(analisi[i].valoreEscherichiaColi);
	});
	
	$.each(storico,function(s,s_val){
		labelsStorico.push(storico[s].dataAnalisi);
		valuesStoricoEntero.push(storico[s].valoreEnterococchi);
		valuesStoricoEcoli.push(storico[s].valoreEscherichiaColi);
	});
	
	var dataAnalisi = {
	    labels: labelsAnalisi.reverse(),
	    datasets: [
	        {
	            label: "Escherichia coli",
	            fill: false,
	            lineTension: 0.1,
	            backgroundColor: "rgba(102,0,0,0.4)",
	            borderColor: "rgba(102,0,0,1)",
	            borderCapStyle: 'butt',
	            borderDash: [],
	            borderDashOffset: 0.0,
	            borderJoinStyle: 'miter',
	            pointBorderColor: "rgba(102,0,0,1)",
	            pointBackgroundColor: "#fff",
	            pointBorderWidth: 1,
	            pointHoverRadius: 5,
	            pointHoverBackgroundColor: "rgba(102,0,0,1)",
	            pointHoverBorderColor: "rgba(220,220,220,1)",
	            pointHoverBorderWidth: 2,
	            pointRadius: 1,
	            pointHitRadius: 10,
	            data: valuesAnalisiEcoli.reverse(),
	        },
	        {
	        	label: "Enterococchi",
	        	fill: false,
	            lineTension: 0.1,
	            backgroundColor: "rgba(134,192,75,0.4)",
	            borderColor: "rgba(134,192,75,1)",
	            borderCapStyle: 'butt',
	            borderDash: [],
	            borderDashOffset: 0.0,
	            borderJoinStyle: 'miter',
	            pointBorderColor: "rgba(134,192,75,1)",
	            pointBackgroundColor: "#fff",
	            pointBorderWidth: 1,
	            pointHoverRadius: 5,
	            pointHoverBackgroundColor: "rgba(134,192,75,1)",
	            pointHoverBorderColor: "rgba(220,220,220,1)",
	            pointHoverBorderWidth: 2,
	            pointRadius: 1,
	            pointHitRadius: 10,
	            data: valuesAnalisiEntero.reverse(),
	        }
	    ]
	};
	
	var ctxAnalisi = $("#analisi-chart");
	
	var chartAnalisi = new Chart(ctxAnalisi, {
	    type: 'line',
	    data: dataAnalisi,
	    options: {
	    	responsive:true,
	    	maintainAspectRatio: false,
	        hover: {
	            mode: 'label'
	        }
	    }
	});
	
	var dataStorico = {
	    labels: labelsStorico.reverse(),
	    datasets: [
	        {
	            label: "Escherichia coli",
	            fill: false,
	            lineTension: 0.1,
	            backgroundColor: "rgba(102,0,0,0.4)",
	            borderColor: "rgba(102,0,0,1)",
	            borderCapStyle: 'butt',
	            borderDash: [],
	            borderDashOffset: 0.0,
	            borderJoinStyle: 'miter',
	            pointBorderColor: "rgba(102,0,0,1)",
	            pointBackgroundColor: "#fff",
	            pointBorderWidth: 1,
	            pointHoverRadius: 5,
	            pointHoverBackgroundColor: "rgba(102,0,0,1)",
	            pointHoverBorderColor: "rgba(220,220,220,1)",
	            pointHoverBorderWidth: 2,
	            pointRadius: 1,
	            pointHitRadius: 10,
	            data: valuesStoricoEcoli.reverse(),
	        },
	        {
	        	label: "Enterococchi",
	        	fill: false,
	            lineTension: 0.1,
	            backgroundColor: "rgba(134,192,75,0.4)",
	            borderColor: "rgba(134,192,75,1)",
	            borderCapStyle: 'butt',
	            borderDash: [],
	            borderDashOffset: 0.0,
	            borderJoinStyle: 'miter',
	            pointBorderColor: "rgba(134,192,75,1)",
	            pointBackgroundColor: "#fff",
	            pointBorderWidth: 1,
	            pointHoverRadius: 5,
	            pointHoverBackgroundColor: "rgba(134,192,75,1)",
	            pointHoverBorderColor: "rgba(220,220,220,1)",
	            pointHoverBorderWidth: 2,
	            pointRadius: 1,
	            pointHitRadius: 10,
	            data: valuesStoricoEntero.reverse(),
	        }
	    ]
	};
	
	var ctxStorico = $("#storico-chart");
	
	var chartStorico = new Chart(ctxStorico, {
	    type: 'line',
	    data: dataStorico,
	    options: {
	    	responsive:true,
	    	maintainAspectRatio: false,
	        hover: {
	            mode: 'label'
	        }
	    }
	});
}
