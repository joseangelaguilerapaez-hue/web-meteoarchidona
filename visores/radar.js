const API_BASE="https://api-meteoarchidona.onrender.com",PRODUCTO="PPI";
const RADARES=["AHR","SE","AL","CR"];
const URL_LOCALIDADES=new URL("../datos/localidades-radar.geojson",window.location.href).href;

const CENTRO_REGIONAL=[37.15,-4.25];
const ZOOM_REGIONAL=8;

let mapa=null,capaLocalidades=null,localidades=[],timelines={},indicesPorRadar={},timelineRegional=[];
let capasRadar=Object.fromEntries(RADARES.map(c=>[c,null]));
let indice=0,reproduciendo=false,temporizador=null,opacidad=.82;

function elemento(id){return document.getElementById(id)}
function texto(id,v){const n=elemento(id);if(n)n.textContent=v}
function esperar(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
function fechaValida(v){const f=new Date(v);return Number.isNaN(f.getTime())?null:f}
function marcaTemporal(v){const n=Date.parse(v);return Number.isFinite(n)?n:null}
function hora(v){const f=fechaValida(v);return f?f.toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"}):"--:--"}
function fecha(v){const f=fechaValida(v);return f?f.toLocaleDateString("es-ES",{day:"2-digit",month:"2-digit",year:"numeric"}):"--"}
function urlAbsoluta(u){if(!u)return null;if(/^https?:\/\//.test(u))return u;if(u.startsWith("/"))return API_BASE+u;return`${API_BASE}/${u}`}

function establecerEstado(m,t=null){
const e=elemento("estado");
texto("estado-texto",m);
e.classList.remove("correcto","error");
if(t)e.classList.add(t);
}

function mostrarMensaje(m,error=false){
const n=elemento("mensaje");
if(!m){
n.classList.remove("visible","error");
n.textContent="";
return;
}
n.textContent=m;
n.classList.toggle("error",error);
n.classList.add("visible");
}

function bounds(f){
if(!f||!f.limites)return null;
const o=Number(f.limites.oeste),s=Number(f.limites.sur),e=Number(f.limites.este),n=Number(f.limites.norte);
return[o,s,e,n].every(Number.isFinite)?[[s,o],[n,e]]:null;
}

function crearPanelesMapa(){
for(const[n,z]of[["radarPane",350],["localidadesPane",620]]){
mapa.createPane(n);
mapa.getPane(n).style.zIndex=z;
mapa.getPane(n).style.pointerEvents="none";
}
mapa.getPane("tooltipPane").style.zIndex="700";
}

function prioridadLocalidad(f){
const v=Number(f?.properties?.prioridad);
return Number.isFinite(v)?v:99;
}

function zoomMinimoLocalidad(f){
const v=Number(f?.properties?.zoom_min);
return Number.isFinite(v)?v:5;
}

function claseEtiquetaLocalidad(tipo){
const permitidos=["capital","ciudad","municipio","pedania","cabecera","estacion"];
return`etiqueta-localidad etiqueta-${permitidos.includes(tipo)?tipo:"municipio"}`;
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
const visibles=localidades
.filter(f=>zoom>=zoomMinimoLocalidad(f))
.sort((a,b)=>prioridadLocalidad(b)-prioridadLocalidad(a));

visibles.forEach(f=>{
const g=f.geometry,p=f.properties||{};

if(!g||g.type!=="Point"||!Array.isArray(g.coordinates)||g.coordinates.length<2)return;

const lon=Number(g.coordinates[0]),lat=Number(g.coordinates[1]);

if(!Number.isFinite(lat)||!Number.isFinite(lon))return;

const punto=L.circleMarker(
[lat,lon],
{
pane:"localidadesPane",
...estiloPuntoLocalidad(p),
interactive:false
}
);

punto.bindTooltip(
p.nombre||"",
{
permanent:true,
direction:direccionEtiquetaLocalidad(p),
offset:offsetEtiquetaLocalidad(p),
className:claseEtiquetaLocalidad(p.tipo)
}
);

capaLocalidades.addLayer(punto);
});
}

async function cargarLocalidades(){
try{
const r=await fetch(URL_LOCALIDADES,{cache:"no-store"});

if(!r.ok)throw new Error(`HTTP ${r.status}`);

const d=await r.json();

if(d.type!=="FeatureCollection"||!Array.isArray(d.features)){
throw new Error("GeoJSON de localidades inválido.");
}

localidades=d.features.filter(f=>f&&f.geometry&&f.geometry.type==="Point");

texto("dato-localidades",localidades.length);
renderizarLocalidades();

}catch(e){
console.error("No se ha podido cargar la capa de localidades:",e);
localidades=[];
texto("dato-localidades","No disponible");
}
}

function crearMapa(){
if(typeof L==="undefined"){
establecerEstado("Leaflet no disponible","error");
mostrarMensaje("No se ha podido cargar la librería del mapa.",true);
return;
}

mapa=L.map(
"mapa-radar",
{
center:CENTRO_REGIONAL,
zoom:ZOOM_REGIONAL,
minZoom:5,
maxZoom:16,
zoomControl:true
}
);

crearPanelesMapa();

L.tileLayer(
"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
{
maxZoom:19,
attribution:"&copy; OpenStreetMap contributors"
}
).addTo(mapa);

capaLocalidades=L.layerGroup().addTo(mapa);

L.control.scale({
metric:true,
imperial:false,
position:"bottomright"
}).addTo(mapa);

mapa.on("zoomend",renderizarLocalidades);

reajustarMapa();
}

function reajustarMapa(){
if(!mapa)return;

requestAnimationFrame(
()=>mapa.invalidateSize({
animate:false,
pan:false
})
);
}

window.addEventListener("resize",reajustarMapa);

window.addEventListener(
"orientationchange",
()=>setTimeout(reajustarMapa,150)
);

if(window.visualViewport){
window.visualViewport.addEventListener("resize",reajustarMapa);
}

function limpiarCapasRadar(){
RADARES.forEach(codigo=>{
if(!capasRadar[codigo])return;

mapa.removeLayer(capasRadar[codigo]);
capasRadar[codigo]=null;
});
}

function actualizarControles(){
const actual=timelineRegional[indice];

texto(
"timeline-posicion",
actual?hora(actual.observado_en):"--:--"
);

if(timelineRegional.length){
texto("timeline-inicio",hora(timelineRegional[0].observado_en));
texto("timeline-fin",hora(timelineRegional[timelineRegional.length-1].observado_en));
}else{
texto("timeline-inicio","--");
texto("timeline-fin","--");
}

const slider=elemento("timeline-slider");

slider.max=Math.max(0,timelineRegional.length-1);
slider.value=indice;
}

function mostrarFotograma(nuevoIndice){
if(!mapa||!timelineRegional.length)return;

indice=Math.max(
0,
Math.min(nuevoIndice,timelineRegional.length-1)
);

const paso=timelineRegional[indice];

let visibles=0;

RADARES.forEach(codigo=>{
if(capasRadar[codigo]){
mapa.removeLayer(capasRadar[codigo]);
capasRadar[codigo]=null;
}

const fotograma=indicesPorRadar[codigo]?.get(paso.ts);

if(!fotograma)return;

const limites=bounds(fotograma);
const urlBase=urlAbsoluta(fotograma.url_imagen);

if(!limites||!urlBase)return;

const url=
urlBase+
(urlBase.includes("?")?"&":"?")+
"_="+
encodeURIComponent(`${paso.ts}-${codigo}`);

capasRadar[codigo]=L.imageOverlay(
url,
limites,
{
pane:"radarPane",
opacity:opacidad,
interactive:false
}
).addTo(mapa);

visibles++;
});

texto("instante-hora",hora(paso.observado_en));
texto("instante-fecha",fecha(paso.observado_en));
texto("dato-capas",`${visibles} / 4`);

actualizarControles();
mostrarMensaje("");
reajustarMapa();
}

function prepararTimelineRegional(){
indicesPorRadar={};

RADARES.forEach(codigo=>{
indicesPorRadar[codigo]=new Map();

(timelines[codigo]||[]).forEach(fotograma=>{
const ts=marcaTemporal(fotograma.observado_en);

if(ts!==null){
indicesPorRadar[codigo].set(ts,fotograma);
}
});
});

const maestro=
timelines.AHR&&timelines.AHR.length
?"AHR"
:RADARES.find(codigo=>(timelines[codigo]||[]).length);

if(!maestro){
timelineRegional=[];
return;
}

timelineRegional=timelines[maestro]
.map(fotograma=>({
observado_en:fotograma.observado_en,
ts:marcaTemporal(fotograma.observado_en)
}))
.filter(paso=>paso.ts!==null);
}

/*
 * Carga robusta de una timeline.
 *
 * Cada radar dispone de dos intentos.
 * Se añade un parámetro variable para evitar respuestas cacheadas
 * y se deja una pequeña pausa antes del segundo intento.
 */
async function cargarTimelineRadar(codigo,intentos=2){
let ultimoError=null;

for(let intento=1;intento<=intentos;intento++){
try{
const url=
`${API_BASE}/radar/${codigo}/timeline`+
`?producto=${PRODUCTO}`+
`&_=${Date.now()}-${intento}`;

const r=await fetch(url,{cache:"no-store"});

if(!r.ok){
throw new Error(`HTTP ${r.status}`);
}

const d=await r.json();

if(!Array.isArray(d.fotogramas)){
throw new Error("Timeline inválida.");
}

return d.fotogramas
.slice()
.sort(
(a,b)=>
marcaTemporal(a.observado_en)-
marcaTemporal(b.observado_en)
);

}catch(error){
ultimoError=error;

console.warn(
`Radar ${codigo}: intento ${intento}/${intentos} fallido`,
error
);

if(intento<intentos){
await esperar(700*intento);
}
}
}

throw ultimoError||new Error(`No se pudo cargar ${codigo}`);
}

/*
 * Las cuatro timelines se consultan SECUENCIALMENTE.
 *
 * Antes se solicitaban simultáneamente mediante Promise.all().
 * En conexiones móviles / Render eso podía provocar que algunas
 * peticiones fallasen mientras otras sí respondían.
 */
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
const fotogramas=await cargarTimelineRadar(codigo,2);

resultados.push({
codigo,
fotogramas,
error:null
});

}catch(error){
console.error(`Radar ${codigo}:`,error);

resultados.push({
codigo,
fotogramas:[],
error
});
}

if(i<RADARES.length-1){
await esperar(200);
}
}

timelines={};

resultados.forEach(resultado=>{
timelines[resultado.codigo]=resultado.fotogramas;
});

const disponibles=RADARES.filter(
codigo=>(timelines[codigo]||[]).length
);

if(!disponibles.length){
throw new Error("No hay ninguna timeline radar disponible.");
}

prepararTimelineRegional();

if(!timelineRegional.length){
throw new Error("No se ha podido construir la timeline regional.");
}

indice=timelineRegional.length-1;

texto("dato-fotogramas",timelineRegional.length);
texto("dato-radares",`${disponibles.length} / 4`);

if(disponibles.length===4){
establecerEstado("4 radares operativos","correcto");
}else{
establecerEstado(`${disponibles.length}/4 radares`);
}

mostrarFotograma(indice);

}catch(e){
console.error(e);

timelines={};
indicesPorRadar={};
timelineRegional=[];

limpiarCapasRadar();

texto("dato-fotogramas","--");
texto("dato-radares","0 / 4");
texto("dato-capas","0 / 4");

establecerEstado("No disponible","error");

mostrarMensaje(
"No se ha podido cargar el radar regional: "+e.message,
true
);
}
}

function actualizarBotonPlay(){
elemento("reproducir").textContent=reproduciendo?"Ⅱ":"▶";
}

function detener(){
if(temporizador){
clearInterval(temporizador);
temporizador=null;
}

reproduciendo=false;
actualizarBotonPlay();
}

function reproducir(){
if(timelineRegional.length<2)return;

detener();

reproduciendo=true;
actualizarBotonPlay();

temporizador=setInterval(
()=>{
mostrarFotograma(
indice+1>=timelineRegional.length
?0
:indice+1
);
},
850
);
}

function instalarEventos(){
elemento("anterior").addEventListener(
"click",
()=>{
detener();
mostrarFotograma(indice-1);
}
);

elemento("siguiente").addEventListener(
"click",
()=>{
detener();
mostrarFotograma(indice+1);
}
);

elemento("reproducir").addEventListener(
"click",
()=>reproduciendo?detener():reproducir()
);

elemento("recargar").addEventListener(
"click",
cargarTimeline
);

elemento("timeline-slider").addEventListener(
"input",
e=>{
detener();
mostrarFotograma(Number(e.target.value));
}
);

elemento("opacidad-slider").addEventListener(
"input",
e=>{
opacidad=Number(e.target.value)/100;

texto("opacidad-valor",`${e.target.value} %`);

RADARES.forEach(codigo=>{
if(capasRadar[codigo]){
capasRadar[codigo].setOpacity(opacidad);
}
});
}
);
}

function iniciar(){
crearMapa();
instalarEventos();

requestAnimationFrame(
()=>requestAnimationFrame(
()=>{
reajustarMapa();
cargarLocalidades();
cargarTimeline();
}
)
);
}

if(document.readyState==="loading"){
document.addEventListener(
"DOMContentLoaded",
iniciar,
{once:true}
);
}else{
iniciar();
}