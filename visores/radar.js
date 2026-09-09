const API_BASE="https://api-meteoarchidona.onrender.com",PRODUCTO="PPI";
const RADARES=["AHR","SE","AL","CR"];
const URL_LOCALIDADES=new URL("../datos/localidades-radar.geojson",window.location.href).href;
const CENTRO_REGIONAL=[37.15,-4.25],ZOOM_REGIONAL=8;

let mapa=null,capaLocalidades=null,localidades=[],timelines={},indicesPorRadar={},timelineRegional=[];
let capasRadar=Object.fromEntries(RADARES.map(c=>[c,null]));
let capasPendientes=Object.fromEntries(RADARES.map(c=>[c,null]));
let indice=0,reproduciendo=false,temporizador=null,opacidad=.82,secuenciaVisualizacion=0;

function elemento(id){return document.getElementById(id)}
function texto(id,v){const n=elemento(id);if(n)n.textContent=v}
function esperar(ms){return new Promise(r=>setTimeout(r,ms))}
function fechaValida(v){const f=new Date(v);return Number.isNaN(f.getTime())?null:f}
function marcaTemporal(v){const n=Date.parse(v);return Number.isFinite(n)?n:null}
function hora(v){const f=fechaValida(v);return f?f.toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"}):"--:--"}
function fecha(v){const f=fechaValida(v);return f?f.toLocaleDateString("es-ES",{day:"2-digit",month:"2-digit",year:"numeric"}):"--"}
function urlAbsoluta(u){if(!u)return null;if(/^https?:\/\//.test(u))return u;if(u.startsWith("/"))return API_BASE+u;return`${API_BASE}/${u}`}

function establecerEstado(m,t=null){
 const e=elemento("estado");texto("estado-texto",m);
 if(!e)return;
 e.classList.remove("correcto","error");
 if(t)e.classList.add(t);
}

function mostrarMensaje(m,error=false){
 const n=elemento("mensaje");if(!n)return;
 if(!m){n.classList.remove("visible","error");n.textContent="";return}
 n.textContent=m;n.classList.toggle("error",error);n.classList.add("visible");
}

function bounds(f){
 if(!f||!f.limites)return null;
 const o=Number(f.limites.oeste),s=Number(f.limites.sur),e=Number(f.limites.este),n=Number(f.limites.norte);
 return[o,s,e,n].every(Number.isFinite)?[[s,o],[n,e]]:null;
}

function crearPanelesMapa(){
 for(const[n,z]of[["radarPane",350],["localidadesPane",620]]){
  mapa.createPane(n);mapa.getPane(n).style.zIndex=z;mapa.getPane(n).style.pointerEvents="none";
 }
 mapa.getPane("tooltipPane").style.zIndex="700";
}

function prioridadLocalidad(f){const v=Number(f?.properties?.prioridad);return Number.isFinite(v)?v:99}
function zoomMinimoLocalidad(f){const v=Number(f?.properties?.zoom_min);return Number.isFinite(v)?v:5}
function claseEtiquetaLocalidad(tipo){
 const p=["capital","ciudad","municipio","pedania","cabecera","estacion"];
 return`etiqueta-localidad etiqueta-${p.includes(tipo)?tipo:"municipio"}`;
}

function estiloPuntoLocalidad(p){
 if(p.tipo==="capital")return{radius:4.5,color:"#fff",weight:1.5,fill:true,fillColor:"#a8325a",fillOpacity:1,opacity:1};
 if(p.tipo==="ciudad"||p.tipo==="cabecera")return{radius:4,color:"#fff",weight:1.4,fill:true,fillColor:"#a8325a",fillOpacity:1,opacity:1};
 if(p.tipo==="estacion")return{radius:4,color:"#fff",weight:1.5,fill:true,fillColor:"#3b9eff",fillOpacity:1,opacity:1};
 if(p.tipo==="pedania")return{radius:2.8,color:"#fff",weight:1,fill:true,fillColor:"#36d5ff",fillOpacity:1,opacity:1};
 return{radius:3,color:"#fff",weight:1,fill:true,fillColor:"#111",fillOpacity:1,opacity:1};
}

function direccionEtiquetaLocalidad(p){return p.tipo==="estacion"?"right":"top"}
function offsetEtiquetaLocalidad(p){return p.tipo==="estacion"?[7,0]:[0,-7]}

function renderizarLocalidades(){
 if(!mapa||!capaLocalidades)return;
 capaLocalidades.clearLayers();
 const zoom=mapa.getZoom();
 localidades.filter(f=>zoom>=zoomMinimoLocalidad(f)).sort((a,b)=>prioridadLocalidad(b)-prioridadLocalidad(a)).forEach(f=>{
  const g=f.geometry,p=f.properties||{};
  if(!g||g.type!=="Point"||!Array.isArray(g.coordinates)||g.coordinates.length<2)return;
  const lon=Number(g.coordinates[0]),lat=Number(g.coordinates[1]);
  if(!Number.isFinite(lat)||!Number.isFinite(lon))return;
  const punto=L.circleMarker([lat,lon],{pane:"localidadesPane",...estiloPuntoLocalidad(p),interactive:false});
  punto.bindTooltip(p.nombre||"",{
   permanent:true,direction:direccionEtiquetaLocalidad(p),
   offset:offsetEtiquetaLocalidad(p),className:claseEtiquetaLocalidad(p.tipo)
  });
  capaLocalidades.addLayer(punto);
 });
}

async function cargarLocalidades(){
 try{
  const r=await fetch(URL_LOCALIDADES,{cache:"no-store"});
  if(!r.ok)throw new Error(`HTTP ${r.status}`);
  const d=await r.json();
  if(d.type!=="FeatureCollection"||!Array.isArray(d.features))throw new Error("GeoJSON de localidades inválido.");
  localidades=d.features.filter(f=>f&&f.geometry&&f.geometry.type==="Point");
  texto("dato-localidades",localidades.length);renderizarLocalidades();
 }catch(e){
  console.error("No se ha podido cargar la capa de localidades:",e);
  localidades=[];texto("dato-localidades","No disponible");
 }
}

function crearMapa(){
 if(typeof L==="undefined"){
  establecerEstado("Leaflet no disponible","error");
  mostrarMensaje("No se ha podido cargar la librería del mapa.",true);
  return;
 }
 mapa=L.map("mapa-radar",{center:CENTRO_REGIONAL,zoom:ZOOM_REGIONAL,minZoom:5,maxZoom:16,zoomControl:true});
 crearPanelesMapa();
 L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"&copy; OpenStreetMap contributors"}).addTo(mapa);
 capaLocalidades=L.layerGroup().addTo(mapa);
 L.control.scale({metric:true,imperial:false,position:"bottomright"}).addTo(mapa);
 mapa.on("zoomend",renderizarLocalidades);
 reajustarMapa();
}

function reajustarMapa(){
 if(!mapa)return;
 requestAnimationFrame(()=>mapa.invalidateSize({animate:false,pan:false}));
}

window.addEventListener("resize",reajustarMapa);
window.addEventListener("orientationchange",()=>setTimeout(reajustarMapa,150));
if(window.visualViewport)window.visualViewport.addEventListener("resize",reajustarMapa);

function quitarCapa(capa){
 if(capa&&mapa&&mapa.hasLayer(capa))mapa.removeLayer(capa);
}

function limpiarCapasRadar(){
 RADARES.forEach(codigo=>{
  quitarCapa(capasRadar[codigo]);quitarCapa(capasPendientes[codigo]);
  capasRadar[codigo]=null;capasPendientes[codigo]=null;
 });
}

function actualizarControles(){
 const actual=timelineRegional[indice];
 texto("timeline-posicion",actual?hora(actual.observado_en):"--:--");
 if(timelineRegional.length){
  texto("timeline-inicio",hora(timelineRegional[0].observado_en));
  texto("timeline-fin",hora(timelineRegional[timelineRegional.length-1].observado_en));
 }else{
  texto("timeline-inicio","--");texto("timeline-fin","--");
 }
 const slider=elemento("timeline-slider");
 slider.max=Math.max(0,timelineRegional.length-1);slider.value=indice;
}

/* Espera al LOAD real de una imagen Leaflet. */
function esperarCargaOverlay(overlay,timeout=15000){
 return new Promise((resolve,reject)=>{
  let terminado=false,timer=null;
  const limpiar=()=>{
   if(timer)clearTimeout(timer);
   overlay.off("load",ok);overlay.off("error",error);
  };
  const cerrar=(fn,v)=>{
   if(terminado)return;
   terminado=true;limpiar();fn(v);
  };
  const ok=()=>cerrar(resolve,true);
  const error=()=>cerrar(reject,new Error("Error cargando imagen radar"));
  overlay.on("load",ok);overlay.on("error",error);
  timer=setTimeout(()=>cerrar(reject,new Error("Tiempo de espera agotado")),timeout);
  try{overlay.addTo(mapa)}catch(e){cerrar(reject,e)}
 });
}

/* Carga una imagen radar con reintento real. */
async function cargarCapaRadar(codigo,fotograma,ts,secuencia,intentos=2){
 const limites=bounds(fotograma),urlBase=urlAbsoluta(fotograma?.url_imagen);
 if(!limites||!urlBase)return false;

 let ultimoError=null;

 for(let intento=1;intento<=intentos;intento++){
  if(secuencia!==secuenciaVisualizacion)return false;

  const url=urlBase+(urlBase.includes("?")?"&":"?")+
   "_="+encodeURIComponent(`${ts}-${codigo}-${intento}-${Date.now()}`);

  const overlay=L.imageOverlay(url,limites,{pane:"radarPane",opacity:opacidad,interactive:false});
  capasPendientes[codigo]=overlay;

  try{
   await esperarCargaOverlay(overlay);

   if(secuencia!==secuenciaVisualizacion){
    quitarCapa(overlay);
    if(capasPendientes[codigo]===overlay)capasPendientes[codigo]=null;
    return false;
   }

   if(capasPendientes[codigo]===overlay)capasPendientes[codigo]=null;
   capasRadar[codigo]=overlay;
   return true;

  }catch(e){
   ultimoError=e;
   quitarCapa(overlay);
   if(capasPendientes[codigo]===overlay)capasPendientes[codigo]=null;

   console.warn(`Imagen ${codigo}: intento ${intento}/${intentos} fallido`,e);

   if(intento<intentos)await esperar(500*intento);
  }
 }

 console.error(`Imagen ${codigo}: no se pudo cargar`,ultimoError);
 return false;
}

/*
 * Cada instante se compone SECUENCIALMENTE:
 * AHR -> SE -> AL -> CR.
 * "Capas en instante" cuenta únicamente imágenes cuyo LOAD
 * ha terminado correctamente.
 */
async function mostrarFotograma(nuevoIndice){
 if(!mapa||!timelineRegional.length)return;

 const secuencia=++secuenciaVisualizacion;
 indice=Math.max(0,Math.min(nuevoIndice,timelineRegional.length-1));
 const paso=timelineRegional[indice];

 limpiarCapasRadar();

 texto("instante-hora",hora(paso.observado_en));
 texto("instante-fecha",fecha(paso.observado_en));
 texto("dato-capas","0 / 4");
 actualizarControles();
 mostrarMensaje("");
 reajustarMapa();

 let visibles=0;

 for(let i=0;i<RADARES.length;i++){
  if(secuencia!==secuenciaVisualizacion)return;

  const codigo=RADARES[i];
  const fotograma=indicesPorRadar[codigo]?.get(paso.ts);

  if(fotograma){
   const cargada=await cargarCapaRadar(codigo,fotograma,paso.ts,secuencia,2);

   if(secuencia!==secuenciaVisualizacion)return;

   if(cargada){
    visibles++;
    texto("dato-capas",`${visibles} / 4`);
   }
  }

  if(i<RADARES.length-1)await esperar(120);
 }

 if(secuencia!==secuenciaVisualizacion)return;

 texto("dato-capas",`${visibles} / 4`);

 if(visibles===4){
  establecerEstado("4 radares operativos","correcto");
 }else if(visibles>0){
  establecerEstado(`${visibles}/4 capas cargadas`);
 }else{
  establecerEstado("Imágenes no disponibles","error");
  mostrarMensaje("No se ha podido cargar ninguna imagen radar para este instante.",true);
 }

 reajustarMapa();
}

function prepararTimelineRegional(){
 indicesPorRadar={};

 RADARES.forEach(codigo=>{
  indicesPorRadar[codigo]=new Map();
  (timelines[codigo]||[]).forEach(f=>{
   const ts=marcaTemporal(f.observado_en);
   if(ts!==null)indicesPorRadar[codigo].set(ts,f);
  });
 });

 const maestro=timelines.AHR&&timelines.AHR.length?"AHR":RADARES.find(c=>(timelines[c]||[]).length);

 if(!maestro){timelineRegional=[];return}

 timelineRegional=timelines[maestro]
  .map(f=>({observado_en:f.observado_en,ts:marcaTemporal(f.observado_en)}))
  .filter(p=>p.ts!==null);
}

/* Timelines: carga secuencial + dos intentos. */
async function cargarTimelineRadar(codigo,intentos=2){
 let ultimoError=null;

 for(let intento=1;intento<=intentos;intento++){
  try{
   const url=`${API_BASE}/radar/${codigo}/timeline?producto=${PRODUCTO}&_=${Date.now()}-${intento}`;
   const r=await fetch(url,{cache:"no-store"});

   if(!r.ok)throw new Error(`HTTP ${r.status}`);

   const d=await r.json();
   if(!Array.isArray(d.fotogramas))throw new Error("Timeline inválida.");

   return d.fotogramas.slice().sort(
    (a,b)=>marcaTemporal(a.observado_en)-marcaTemporal(b.observado_en)
   );

  }catch(e){
   ultimoError=e;
   console.warn(`Radar ${codigo}: intento ${intento}/${intentos} fallido`,e);
   if(intento<intentos)await esperar(700*intento);
  }
 }

 throw ultimoError||new Error(`No se pudo cargar ${codigo}`);
}

async function cargarTimeline(){
 detener();
 establecerEstado("Cargando");
 mostrarMensaje("Cargando radares...");

 try{
  const resultados=[];

  for(let i=0;i<RADARES.length;i++){
   const codigo=RADARES[i];
   establecerEstado(`Cargando ${i+1}/4`);

   try{
    resultados.push({codigo,fotogramas:await cargarTimelineRadar(codigo,2),error:null});
   }catch(error){
    console.error(`Radar ${codigo}:`,error);
    resultados.push({codigo,fotogramas:[],error});
   }

   if(i<RADARES.length-1)await esperar(200);
  }

  timelines={};
  resultados.forEach(r=>timelines[r.codigo]=r.fotogramas);

  const disponibles=RADARES.filter(c=>(timelines[c]||[]).length);

  if(!disponibles.length)throw new Error("No hay ninguna timeline radar disponible.");

  prepararTimelineRegional();

  if(!timelineRegional.length)throw new Error("No se ha podido construir la timeline regional.");

  indice=timelineRegional.length-1;

  texto("dato-fotogramas",timelineRegional.length);
  texto("dato-radares",`${disponibles.length} / 4`);
  texto("dato-capas","0 / 4");

  if(disponibles.length===4)establecerEstado("4 radares disponibles","correcto");
  else establecerEstado(`${disponibles.length}/4 radares`);

  await mostrarFotograma(indice);

 }catch(e){
  console.error(e);

  ++secuenciaVisualizacion;
  timelines={};indicesPorRadar={};timelineRegional=[];
  limpiarCapasRadar();

  texto("dato-fotogramas","--");
  texto("dato-radares","0 / 4");
  texto("dato-capas","0 / 4");

  establecerEstado("No disponible","error");
  mostrarMensaje("No se ha podido cargar el radar regional: "+e.message,true);
 }
}

function actualizarBotonPlay(){
 const b=elemento("reproducir");
 if(b)b.textContent=reproduciendo?"Ⅱ":"▶";
}

function detener(){
 if(temporizador){clearTimeout(temporizador);temporizador=null}
 reproduciendo=false;
 actualizarBotonPlay();
}

/*
 * La animación ya no avanza cada 850 ms a ciegas.
 * Primero termina de cargar el instante completo y después espera.
 */
function reproducir(){
 if(timelineRegional.length<2)return;

 detener();
 reproduciendo=true;
 actualizarBotonPlay();

 const avanzar=async()=>{
  if(!reproduciendo)return;

  const siguiente=indice+1>=timelineRegional.length?0:indice+1;
  await mostrarFotograma(siguiente);

  if(reproduciendo)temporizador=setTimeout(avanzar,850);
 };

 temporizador=setTimeout(avanzar,850);
}

function instalarEventos(){
 elemento("anterior").addEventListener("click",()=>{
  detener();void mostrarFotograma(indice-1);
 });

 elemento("siguiente").addEventListener("click",()=>{
  detener();void mostrarFotograma(indice+1);
 });

 elemento("reproducir").addEventListener("click",()=>{
  if(reproduciendo)detener();else reproducir();
 });

 elemento("recargar").addEventListener("click",()=>void cargarTimeline());

 elemento("timeline-slider").addEventListener("input",e=>{
  detener();void mostrarFotograma(Number(e.target.value));
 });

 elemento("opacidad-slider").addEventListener("input",e=>{
  opacidad=Number(e.target.value)/100;
  texto("opacidad-valor",`${e.target.value} %`);

  RADARES.forEach(codigo=>{
   if(capasRadar[codigo])capasRadar[codigo].setOpacity(opacidad);
   if(capasPendientes[codigo])capasPendientes[codigo].setOpacity(opacidad);
  });
 });
}

function iniciar(){
 crearMapa();
 instalarEventos();

 requestAnimationFrame(()=>requestAnimationFrame(()=>{
  reajustarMapa();
  cargarLocalidades();
  void cargarTimeline();
 }));
}

if(document.readyState==="loading"){
 document.addEventListener("DOMContentLoaded",iniciar,{once:true});
}else{
 iniciar();
}