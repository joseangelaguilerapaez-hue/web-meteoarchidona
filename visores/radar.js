/* API_BASE lo decide ../js/api.js, que se carga antes que este fichero. */
const API_BASE=window.API_BASE,PRODUCTO="PPI";
const RADARES=["AHR","SE","AL","CR"];
const FONDOS=["satelite","politico","fisico","negro"];

const URL_LOCALIDADES=new URL(
 "../datos/localidades-radar.geojson",
 window.location.href
).href;

const URL_LIMITES=new URL(
 "../datos/limites-radar.geojson",
 window.location.href
).href;

const CENTRO_REGIONAL=[37.15,-4.25],ZOOM_REGIONAL=8;

const ATRIBUCION_LIMITES=
 'Límites: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

let mapa=null;
let capaLocalidades=null;
let localidades=[];
let timelines={};
let indicesPorRadar={};
let timelineRegional=[];

let fondosMapa={};
let capaFondoActual=null;
let fondoActivo="satelite";

let capaLimitesAdministrativos=null;
let promesaLimitesAdministrativos=null;
let atribucionLimitesActiva=false;

let capasRadar=Object.fromEntries(
 RADARES.map(c=>[c,null])
);

let capasPendientes=Object.fromEntries(
 RADARES.map(c=>[c,null])
);

let indice=0;
let reproduciendo=false;
let temporizador=null;
let opacidad=.82;
let secuenciaVisualizacion=0;

let radarActivo=true;
let tsCapasRadar=null;


/* =========================================================
   UTILIDADES
   ========================================================= */

function elemento(id){
 return document.getElementById(id);
}

function texto(id,v){
 const n=elemento(id);
 if(n)n.textContent=v;
}

function esperar(ms){
 return new Promise(r=>setTimeout(r,ms));
}

function fechaValida(v){
 const f=new Date(v);
 return Number.isNaN(f.getTime())?null:f;
}

function marcaTemporal(v){
 const n=Date.parse(v);
 return Number.isFinite(n)?n:null;
}

function hora(v){
 const f=fechaValida(v);

 return f
  ?f.toLocaleTimeString(
    "es-ES",
    {
     hour:"2-digit",
     minute:"2-digit"
    }
   )
  :"--:--";
}

function fecha(v){
 const f=fechaValida(v);

 return f
  ?f.toLocaleDateString(
    "es-ES",
    {
     day:"2-digit",
     month:"2-digit",
     year:"numeric"
    }
   )
  :"--";
}

function urlAbsoluta(u){
 if(!u)return null;

 if(/^https?:\/\//.test(u)){
  return u;
 }

 if(u.startsWith("/")){
  return API_BASE+u;
 }

 return`${API_BASE}/${u}`;
}

function establecerEstado(m,t=null){
 const e=elemento("estado");

 texto("estado-texto",m);

 if(!e)return;

 e.classList.remove(
  "correcto",
  "error"
 );

 if(t)e.classList.add(t);
}

function mostrarMensaje(
 m,
 error=false
){
 const n=elemento("mensaje");

 if(!n)return;

 if(!m){
  n.classList.remove(
   "visible",
   "error"
  );

  n.textContent="";
  return;
 }

 n.textContent=m;

 n.classList.toggle(
  "error",
  error
 );

 n.classList.add("visible");
}

function bounds(f){
 if(!f||!f.limites){
  return null;
 }

 const o=Number(f.limites.oeste);
 const s=Number(f.limites.sur);
 const e=Number(f.limites.este);
 const n=Number(f.limites.norte);

 return[o,s,e,n].every(
  Number.isFinite
 )
  ?[[s,o],[n,e]]
  :null;
}

function quitarCapa(capa){
 if(
  capa&&
  mapa&&
  mapa.hasLayer(capa)
 ){
  mapa.removeLayer(capa);
 }
}


/* =========================================================
   ORDEN VERTICAL DEL VISOR

   fondo
   límites Andalucía/provincias
   satélite meteorológico
   radar
   rayos
   localidades
   etiquetas

   SATÉLITE HD es un fondo cartográfico y por tanto
   permanece en basePane.

   Las localidades permanecen siempre por encima de las
   capas meteorológicas.
   ========================================================= */

function crearPanelesMapa(){
 const paneles=[
  ["basePane",100],
  ["limitesPane",220],
  ["satelitePane",280],
  ["radarPane",350],
  ["rayosPane",440],
  ["localidadesPane",620]
 ];

 for(const[n,z]of paneles){
  mapa.createPane(n);

  mapa.getPane(n)
   .style.zIndex=z;

  mapa.getPane(n)
   .style.pointerEvents="none";
 }

 mapa.getPane("tooltipPane")
  .style.zIndex="700";
}


/* =========================================================
   LÍMITES ADMINISTRATIVOS
   ========================================================= */

function estiloLimiteAdministrativo(feature){
 const p=feature?.properties||{};

 /*
  * Contorno exterior de Andalucía:
  * más grueso y luminoso.
  */
 if(p.tipo==="comunidad"){
  return{
   color:"#36d5ff",
   weight:2.4,
   opacity:.95,
   fill:false,
   interactive:false
  };
 }

 /*
  * Límites internos de las provincias andaluzas.
  */
 if(p.grupo==="andalucia"){
  return{
   color:"#d8e2ea",
   weight:1.25,
   opacity:.82,
   fill:false,
   interactive:false
  };
 }

 /*
  * Provincias/comunidades del entorno:
  * Badajoz, Ciudad Real, Albacete y Murcia.
  */
 return{
  color:"#8996a3",
  weight:1,
  opacity:.70,
  fill:false,
  interactive:false
 };
}

function actualizarAtribucionLimites(){
 if(
  !mapa||
  !mapa.attributionControl
 ){
  return;
 }

 const debeEstar=
  fondoActivo==="negro";

 if(
  debeEstar&&
  !atribucionLimitesActiva
 ){
  mapa.attributionControl
   .addAttribution(
    ATRIBUCION_LIMITES
   );

  atribucionLimitesActiva=true;
  return;
 }

 if(
  !debeEstar&&
  atribucionLimitesActiva
 ){
  mapa.attributionControl
   .removeAttribution(
    ATRIBUCION_LIMITES
   );

  atribucionLimitesActiva=false;
 }
}

async function cargarLimitesAdministrativos(){
 if(!mapa)return;

 /*
  * Si ya se descargaron anteriormente simplemente
  * volvemos a mostrarlos.
  */
 if(capaLimitesAdministrativos){

  if(
   fondoActivo==="negro"&&
   !mapa.hasLayer(
    capaLimitesAdministrativos
   )
  ){
   capaLimitesAdministrativos
    .addTo(mapa);
  }

  return;
 }

 /*
  * Evita lanzar varias descargas si el usuario pulsa
  * repetidamente NEGRO mientras todavía está cargando.
  */
 if(promesaLimitesAdministrativos){
  await promesaLimitesAdministrativos;
  return;
 }

 promesaLimitesAdministrativos=
  (async()=>{

   try{
    const r=await fetch(
     URL_LIMITES,
     {
      cache:"no-store"
     }
    );

    if(!r.ok){
     throw new Error(
      `HTTP ${r.status}`
     );
    }

    const d=await r.json();

    if(
     d.type!=="FeatureCollection"||
     !Array.isArray(d.features)
    ){
     throw new Error(
      "GeoJSON de límites inválido."
     );
    }

    capaLimitesAdministrativos=
     L.geoJSON(
      d,
      {
       pane:"limitesPane",
       interactive:false,
       style:
        estiloLimiteAdministrativo
      }
     );

    /*
     * La descarga puede terminar después de que el
     * usuario haya abandonado el fondo negro.
     */
    if(
     fondoActivo==="negro"
    ){
     capaLimitesAdministrativos
      .addTo(mapa);
    }

   }catch(e){
    console.error(
     "No se ha podido cargar la capa de límites administrativos:",
     e
    );

    capaLimitesAdministrativos=null;
   }

  })();

 try{
  await promesaLimitesAdministrativos;
 }finally{
  promesaLimitesAdministrativos=null;
 }
}

function actualizarLimitesAdministrativos(){
 if(!mapa)return;

 actualizarAtribucionLimites();

 if(
  fondoActivo!=="negro"
 ){
  quitarCapa(
   capaLimitesAdministrativos
  );

  return;
 }

 void cargarLimitesAdministrativos();
}


/* =========================================================
   FONDOS CARTOGRÁFICOS
   ========================================================= */

function actualizarSelectorFondos(){
 FONDOS.forEach(nombre=>{

  const b=elemento(
   `fondo-${nombre}`
  );

  if(!b)return;

  const activo=
   nombre===fondoActivo;

  b.classList.toggle(
   "activo",
   activo
  );

  b.setAttribute(
   "aria-pressed",
   String(activo)
  );
 });
}

function crearFondosMapa(){
 fondosMapa={

  /*
   * SATÉLITE HD
   *
   * Servicio oficial IGN/CNIG:
   * Ortoimágenes de Máxima Actualidad.
   *
   * A escalas generales utiliza cobertura de satélite
   * y al acercarnos utiliza ortofotografía PNOA de
   * máxima resolución disponible.
   */
  satelite:L.tileLayer(
   "https://tms-pnoa-ma.idee.es/1.0.0/pnoa-ma/{z}/{x}/{-y}.jpeg",
   {
    pane:"basePane",
    maxNativeZoom:19,
    maxZoom:19,
    attribution:
     'Ortoimágenes: &copy; <a href="https://www.ign.es/" target="_blank" rel="noopener">IGN/CNIG</a> · PNOA Máxima Actualidad'
   }
  ),

  politico:L.tileLayer(
   "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
   {
    pane:"basePane",
    maxNativeZoom:19,
    maxZoom:19,
    attribution:
     '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
   }
  ),

  fisico:L.tileLayer(
   "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
   {
    pane:"basePane",
    maxNativeZoom:17,
    maxZoom:19,
    subdomains:"abc",
    attribution:
     'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)'
   }
  )

 };

 /*
  * SATÉLITE HD es el fondo inicial del visor.
  */
 cambiarFondo("satelite");
}

function cambiarFondo(nombre){
 if(
  !mapa||
  !FONDOS.includes(nombre)
 ){
  return;
 }

 if(
  capaFondoActual&&
  mapa.hasLayer(
   capaFondoActual
  )
 ){
  mapa.removeLayer(
   capaFondoActual
  );
 }

 fondoActivo=nombre;

 capaFondoActual=
  fondosMapa[nombre]||null;

 const contenedor=
  mapa.getContainer();

 const zona=
  contenedor.closest(
   ".mapa-zona"
  );

 if(nombre==="negro"){

  contenedor.style.background=
   "#000";

  if(zona){
   zona.style.background=
    "#000";
  }

 }else{

  contenedor.style.background=
   "#091521";

  if(zona){
   zona.style.background=
    "#091521";
  }
 }

 if(capaFondoActual){
  capaFondoActual.addTo(mapa);
 }

 document.body.dataset.fondo=
  nombre;

 actualizarSelectorFondos();

 /*
  * Los límites administrativos propios solo aparecen
  * en el fondo negro.
  */
 actualizarLimitesAdministrativos();

 /*
  * Se reconstruyen las localidades.
  *
  * Tanto el fondo negro como la fotografía aérea
  * necesitan colores claros y sombras para conservar
  * la legibilidad.
  */
 renderizarLocalidades();

 reajustarMapa();
}


/* =========================================================
   LOCALIDADES
   ========================================================= */

function prioridadLocalidad(f){
 const v=Number(
  f?.properties?.prioridad
 );

 return Number.isFinite(v)
  ?v
  :99;
}

function zoomMinimoLocalidad(f){
 const v=Number(
  f?.properties?.zoom_min
 );

 return Number.isFinite(v)
  ?v
  :5;
}

function claseEtiquetaLocalidad(tipo){
 const p=[
  "capital",
  "ciudad",
  "municipio",
  "pedania",
  "cabecera",
  "estacion"
 ];

 return`etiqueta-localidad etiqueta-${
  p.includes(tipo)
   ?tipo
   :"municipio"
 }`;
}

function estiloPuntoLocalidad(p){
 const fondoOscuro=
  fondoActivo==="negro"||
  fondoActivo==="satelite";

 if(p.tipo==="capital"){
  return{
   radius:4.5,
   color:"#fff",
   weight:1.5,
   fill:true,
   fillColor:
    fondoOscuro
     ?"#d93f74"
     :"#a8325a",
   fillOpacity:1,
   opacity:1
  };
 }

 if(
  p.tipo==="ciudad"||
  p.tipo==="cabecera"
 ){
  return{
   radius:4,
   color:"#fff",
   weight:1.4,
   fill:true,
   fillColor:
    fondoOscuro
     ?"#d93f74"
     :"#a8325a",
   fillOpacity:1,
   opacity:1
  };
 }

 if(p.tipo==="estacion"){
  return{
   radius:4,
   color:"#fff",
   weight:1.5,
   fill:true,
   fillColor:"#3b9eff",
   fillOpacity:1,
   opacity:1
  };
 }

 if(p.tipo==="pedania"){
  return{
   radius:2.8,
   color:"#fff",
   weight:1,
   fill:true,
   fillColor:"#36d5ff",
   fillOpacity:1,
   opacity:1
  };
 }

 return{
  radius:3,
  color:"#fff",
  weight:1,
  fill:true,
  fillColor:
   fondoOscuro
    ?"#fff"
    :"#111",
  fillOpacity:1,
  opacity:1
 };
}

function colorEtiquetaLocalidad(p){
 if(
  fondoActivo!=="negro"&&
  fondoActivo!=="satelite"
 ){
  return null;
 }

 if(
  p.tipo==="capital"||
  p.tipo==="ciudad"||
  p.tipo==="cabecera"
 ){
  return"#ff5c91";
 }

 if(p.tipo==="estacion"){
  return"#60a5fa";
 }

 if(p.tipo==="pedania"){
  return"#67e8f9";
 }

 return"#fff";
}

function aplicarColorEtiqueta(
 punto,
 p
){
 const color=
  colorEtiquetaLocalidad(p);

 if(!color)return;

 const aplicar=()=>{

  const tooltip=
   punto.getTooltip();

  const el=
   tooltip
    ?tooltip.getElement()
    :null;

  if(!el)return;

  el.style.color=color;

  el.style.textShadow=
   "0 1px 2px #000,0 0 4px #000,0 0 7px #000";
 };

 aplicar();

 requestAnimationFrame(
  aplicar
 );
}

function direccionEtiquetaLocalidad(p){
 return p.tipo==="estacion"
  ?"right"
  :"top";
}

function offsetEtiquetaLocalidad(p){
 return p.tipo==="estacion"
  ?[7,0]
  :[0,-7];
}

function renderizarLocalidades(){
 if(
  !mapa||
  !capaLocalidades
 ){
  return;
 }

 capaLocalidades.clearLayers();

 const zoom=
  mapa.getZoom();

 localidades
  .filter(
   f=>zoom>=zoomMinimoLocalidad(f)
  )
  .sort(
   (a,b)=>
    prioridadLocalidad(b)-
    prioridadLocalidad(a)
  )
  .forEach(f=>{

   const g=f.geometry;
   const p=f.properties||{};

   if(
    !g||
    g.type!=="Point"||
    !Array.isArray(g.coordinates)||
    g.coordinates.length<2
   ){
    return;
   }

   const lon=Number(
    g.coordinates[0]
   );

   const lat=Number(
    g.coordinates[1]
   );

   if(
    !Number.isFinite(lat)||
    !Number.isFinite(lon)
   ){
    return;
   }

   const punto=
    L.circleMarker(
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
     direction:
      direccionEtiquetaLocalidad(p),
     offset:
      offsetEtiquetaLocalidad(p),
     className:
      claseEtiquetaLocalidad(
       p.tipo
      )
    }
   );

   capaLocalidades.addLayer(
    punto
   );

   aplicarColorEtiqueta(
    punto,
    p
   );
  });
}

async function cargarLocalidades(){
 try{

  const r=await fetch(
   URL_LOCALIDADES,
   {
    cache:"no-store"
   }
  );

  if(!r.ok){
   throw new Error(
    `HTTP ${r.status}`
   );
  }

  const d=await r.json();

  if(
   d.type!=="FeatureCollection"||
   !Array.isArray(d.features)
  ){
   throw new Error(
    "GeoJSON de localidades inválido."
   );
  }

  localidades=
   d.features.filter(
    f=>
     f&&
     f.geometry&&
     f.geometry.type==="Point"
   );

  texto(
   "dato-localidades",
   localidades.length
  );

  renderizarLocalidades();

 }catch(e){

  console.error(
   "No se ha podido cargar la capa de localidades:",
   e
  );

  localidades=[];

  texto(
   "dato-localidades",
   "No disponible"
  );
 }
}


/* =========================================================
   MAPA
   ========================================================= */

function crearMapa(){
 if(typeof L==="undefined"){

  establecerEstado(
   "Leaflet no disponible",
   "error"
  );

  mostrarMensaje(
   "No se ha podido cargar la librería del mapa.",
   true
  );

  return;
 }

 mapa=L.map(
  "mapa-radar",
  {
   center:CENTRO_REGIONAL,
   zoom:ZOOM_REGIONAL,
   minZoom:5,
   maxZoom:19,
   zoomControl:true
  }
 );

 crearPanelesMapa();

 crearFondosMapa();

 capaLocalidades=
  L.layerGroup()
   .addTo(mapa);

 L.control.scale({
  metric:true,
  imperial:false,
  position:"bottomright"
 }).addTo(mapa);

 mapa.on(
  "zoomend",
  renderizarLocalidades
 );

 reajustarMapa();
}

function reajustarMapa(){
 if(!mapa)return;

 requestAnimationFrame(
  ()=>
   mapa.invalidateSize({
    animate:false,
    pan:false
   })
 );
}

window.addEventListener(
 "resize",
 reajustarMapa
);

window.addEventListener(
 "orientationchange",
 ()=>
  setTimeout(
   reajustarMapa,
   150
  )
);

if(window.visualViewport){
 window.visualViewport.addEventListener(
  "resize",
  reajustarMapa
 );
}


/* =========================================================
   RADAR
   ========================================================= */

function limpiarCapasRadar(){
 RADARES.forEach(codigo=>{

  quitarCapa(
   capasRadar[codigo]
  );

  quitarCapa(
   capasPendientes[codigo]
  );

  capasRadar[codigo]=null;
  capasPendientes[codigo]=null;
 });

 tsCapasRadar=null;
}

function ocultarCapasRadar(){
 RADARES.forEach(codigo=>{

  quitarCapa(
   capasRadar[codigo]
  );

  quitarCapa(
   capasPendientes[codigo]
  );

  capasPendientes[codigo]=null;
 });
}

function contarCapasRadarDisponibles(){
 return RADARES.reduce(
  (
   n,
   codigo
  )=>
   n+(
    capasRadar[codigo]
     ?1
     :0
   ),
  0
 );
}

function actualizarSelectorRadar(){
 const b=elemento(
  "capa-radar"
 );

 if(!b)return;

 b.classList.toggle(
  "activa",
  radarActivo
 );

 b.setAttribute(
  "aria-pressed",
  String(radarActivo)
 );

 const estado=
  b.querySelector(
   ".selector-capa-estado"
  );

 if(estado){
  estado.textContent=
   radarActivo
    ?"Activa"
    :"Oculta";
 }
}

function reponerCapasRadar(){
 if(
  !mapa||
  !radarActivo
 ){
  return 0;
 }

 let visibles=0;

 RADARES.forEach(codigo=>{

  const capa=
   capasRadar[codigo];

  if(capa){

   if(
    !mapa.hasLayer(capa)
   ){
    capa.addTo(mapa);
   }

   capa.setOpacity(
    opacidad
   );

   visibles++;
  }
 });

 texto(
  "dato-capas",
  `${visibles} / 4`
 );

 if(visibles===4){

  establecerEstado(
   "4 radares operativos",
   "correcto"
  );

 }else if(visibles>0){

  establecerEstado(
   `${visibles}/4 capas cargadas`
  );

 }else{

  establecerEstado(
   "Radar sin capas"
  );
 }

 return visibles;
}


/* =========================================================
   TIMELINE
   ========================================================= */

function actualizarControles(){
 const actual=
  timelineRegional[indice];

 texto(
  "timeline-posicion",
  actual
   ?hora(actual.observado_en)
   :"--:--"
 );

 if(timelineRegional.length){

  texto(
   "timeline-inicio",
   hora(
    timelineRegional[0]
     .observado_en
   )
  );

  texto(
   "timeline-fin",
   hora(
    timelineRegional[
     timelineRegional.length-1
    ].observado_en
   )
  );

 }else{

  texto(
   "timeline-inicio",
   "--"
  );

  texto(
   "timeline-fin",
   "--"
  );
 }

 const slider=
  elemento(
   "timeline-slider"
  );

 slider.max=
  Math.max(
   0,
   timelineRegional.length-1
  );

 slider.value=indice;
}


/* =========================================================
   CARGA REAL DE IMÁGENES RADAR
   ========================================================= */

function esperarCargaOverlay(
 overlay,
 timeout=15000
){
 return new Promise(
  (
   resolve,
   reject
  )=>{

   let terminado=false;
   let timer=null;

   const limpiar=()=>{

    if(timer){
     clearTimeout(timer);
    }

    overlay.off(
     "load",
     ok
    );

    overlay.off(
     "error",
     error
    );
   };

   const cerrar=(
    fn,
    v
   )=>{

    if(terminado)return;

    terminado=true;

    limpiar();

    fn(v);
   };

   const ok=()=>
    cerrar(
     resolve,
     true
    );

   const error=()=>
    cerrar(
     reject,
     new Error(
      "Error cargando imagen radar"
     )
    );

   overlay.on(
    "load",
    ok
   );

   overlay.on(
    "error",
    error
   );

   timer=setTimeout(
    ()=>
     cerrar(
      reject,
      new Error(
       "Tiempo de espera agotado"
      )
     ),
    timeout
   );

   try{
    overlay.addTo(mapa);
   }catch(e){
    cerrar(
     reject,
     e
    );
   }
  }
 );
}

async function cargarCapaRadar(
 codigo,
 fotograma,
 ts,
 secuencia,
 intentos=2
){
 const limites=
  bounds(fotograma);

 const urlBase=
  urlAbsoluta(
   fotograma?.url_imagen
  );

 if(
  !limites||
  !urlBase
 ){
  return false;
 }

 let ultimoError=null;

 for(
  let intento=1;
  intento<=intentos;
  intento++
 ){

  if(
   secuencia!==secuenciaVisualizacion||
   !radarActivo
  ){
   return false;
  }

  const url=
   urlBase+
   (
    urlBase.includes("?")
     ?"&"
     :"?"
   )+
   "_="+
   encodeURIComponent(
    `${ts}-${codigo}-${intento}-${Date.now()}`
   );

  const overlay=
   L.imageOverlay(
    url,
    limites,
    {
     pane:"radarPane",
     opacity:opacidad,
     interactive:false
    }
   );

  capasPendientes[codigo]=
   overlay;

  try{

   await esperarCargaOverlay(
    overlay
   );

   if(
    secuencia!==secuenciaVisualizacion||
    !radarActivo
   ){

    quitarCapa(
     overlay
    );

    if(
     capasPendientes[codigo]===
     overlay
    ){
     capasPendientes[codigo]=
      null;
    }

    return false;
   }

   if(
    capasPendientes[codigo]===
    overlay
   ){
    capasPendientes[codigo]=
     null;
   }

   capasRadar[codigo]=
    overlay;

   return true;

  }catch(e){

   ultimoError=e;

   quitarCapa(
    overlay
   );

   if(
    capasPendientes[codigo]===
    overlay
   ){
    capasPendientes[codigo]=
     null;
   }

   console.warn(
    `Imagen ${codigo}: intento ${intento}/${intentos} fallido`,
    e
   );

   if(
    intento<intentos
   ){
    await esperar(
     500*intento
    );
   }
  }
 }

 console.error(
  `Imagen ${codigo}: no se pudo cargar`,
  ultimoError
 );

 return false;
}


/* =========================================================
   FOTOGRAMA REGIONAL
   ========================================================= */

async function mostrarFotograma(
 nuevoIndice
){
 if(
  !mapa||
  !timelineRegional.length
 ){
  return;
 }

 const secuencia=
  ++secuenciaVisualizacion;

 indice=Math.max(
  0,
  Math.min(
   nuevoIndice,
   timelineRegional.length-1
  )
 );

 const paso=
  timelineRegional[indice];

 texto(
  "instante-hora",
  hora(
   paso.observado_en
  )
 );

 texto(
  "instante-fecha",
  fecha(
   paso.observado_en
  )
 );

 actualizarControles();

 mostrarMensaje("");

 reajustarMapa();

 if(!radarActivo){

  texto(
   "dato-capas",
   "0 / 4"
  );

  establecerEstado(
   "Radar oculto"
  );

  return;
 }

 limpiarCapasRadar();

 texto(
  "dato-capas",
  "0 / 4"
 );

 let visibles=0;

 for(
  let i=0;
  i<RADARES.length;
  i++
 ){

  if(
   secuencia!==secuenciaVisualizacion||
   !radarActivo
  ){
   return;
  }

  const codigo=
   RADARES[i];

  const fotograma=
   indicesPorRadar[codigo]
    ?.get(paso.ts);

  if(fotograma){

   const cargada=
    await cargarCapaRadar(
     codigo,
     fotograma,
     paso.ts,
     secuencia,
     2
    );

   if(
    secuencia!==secuenciaVisualizacion||
    !radarActivo
   ){
    return;
   }

   if(cargada){

    visibles++;

    texto(
     "dato-capas",
     `${visibles} / 4`
    );
   }
  }

  if(
   i<RADARES.length-1
  ){
   await esperar(120);
  }
 }

 if(
  secuencia!==secuenciaVisualizacion||
  !radarActivo
 ){
  return;
 }

 tsCapasRadar=
  paso.ts;

 texto(
  "dato-capas",
  `${visibles} / 4`
 );

 if(visibles===4){

  establecerEstado(
   "4 radares operativos",
   "correcto"
  );

 }else if(visibles>0){

  establecerEstado(
   `${visibles}/4 capas cargadas`
  );

 }else{

  establecerEstado(
   "Imágenes no disponibles",
   "error"
  );

  mostrarMensaje(
   "No se ha podido cargar ninguna imagen radar para este instante.",
   true
  );
 }

 reajustarMapa();
}


/* =========================================================
   CONSTRUCCIÓN DE TIMELINE REGIONAL
   ========================================================= */

function prepararTimelineRegional(){
 indicesPorRadar={};

 RADARES.forEach(codigo=>{

  indicesPorRadar[codigo]=
   new Map();

  (
   timelines[codigo]||[]
  ).forEach(f=>{

   const ts=
    marcaTemporal(
     f.observado_en
    );

   if(ts!==null){
    indicesPorRadar[codigo]
     .set(
      ts,
      f
     );
   }
  });
 });

 const maestro=
  timelines.AHR&&
  timelines.AHR.length
   ?"AHR"
   :RADARES.find(
     c=>
      (
       timelines[c]||[]
      ).length
    );

 if(!maestro){

  timelineRegional=[];

  return;
 }

 timelineRegional=
  timelines[maestro]
   .map(f=>({
    observado_en:
     f.observado_en,
    ts:
     marcaTemporal(
      f.observado_en
     )
   }))
   .filter(
    p=>p.ts!==null
   );
}


/* =========================================================
   DESCARGA DE TIMELINES
   ========================================================= */

async function cargarTimelineRadar(
 codigo,
 intentos=2
){
 let ultimoError=null;

 for(
  let intento=1;
  intento<=intentos;
  intento++
 ){

  try{

   const url=
    `${API_BASE}/radar/${codigo}/timeline`+
    `?producto=${PRODUCTO}`+
    `&_=${Date.now()}-${intento}`;

   const r=await fetch(
    url,
    {
     cache:"no-store"
    }
   );

   if(!r.ok){
    throw new Error(
     `HTTP ${r.status}`
    );
   }

   const d=await r.json();

   if(
    !Array.isArray(
     d.fotogramas
    )
   ){
    throw new Error(
     "Timeline inválida."
    );
   }

   return d.fotogramas
    .slice()
    .sort(
     (
      a,
      b
     )=>
      marcaTemporal(
       a.observado_en
      )-
      marcaTemporal(
       b.observado_en
      )
    );

  }catch(e){

   ultimoError=e;

   console.warn(
    `Radar ${codigo}: intento ${intento}/${intentos} fallido`,
    e
   );

   if(
    intento<intentos
   ){
    await esperar(
     700*intento
    );
   }
  }
 }

 throw(
  ultimoError||
  new Error(
   `No se pudo cargar ${codigo}`
  )
 );
}

async function cargarTimeline(){
 detener();

 ++secuenciaVisualizacion;

 tsCapasRadar=null;

 establecerEstado(
  "Cargando"
 );

 mostrarMensaje(
  "Cargando radares..."
 );

 try{

  const resultados=[];

  for(
   let i=0;
   i<RADARES.length;
   i++
  ){

   const codigo=
    RADARES[i];

   establecerEstado(
    `Cargando ${i+1}/4`
   );

   try{

    resultados.push({
     codigo,
     fotogramas:
      await cargarTimelineRadar(
       codigo,
       2
      ),
     error:null
    });

   }catch(error){

    console.error(
     `Radar ${codigo}:`,
     error
    );

    resultados.push({
     codigo,
     fotogramas:[],
     error
    });
   }

   if(
    i<RADARES.length-1
   ){
    await esperar(200);
   }
  }

  timelines={};

  resultados.forEach(
   r=>
    timelines[r.codigo]=
     r.fotogramas
  );

  const disponibles=
   RADARES.filter(
    c=>
     (
      timelines[c]||[]
     ).length
   );

  if(!disponibles.length){
   throw new Error(
    "No hay ninguna timeline radar disponible."
   );
  }

  prepararTimelineRegional();

  if(!timelineRegional.length){
   throw new Error(
    "No se ha podido construir la timeline regional."
   );
  }

  indice=
   timelineRegional.length-1;

  texto(
   "dato-fotogramas",
   timelineRegional.length
  );

  texto(
   "dato-radares",
   `${disponibles.length} / 4`
  );

  texto(
   "dato-capas",
   "0 / 4"
  );

  if(radarActivo){

   if(
    disponibles.length===4
   ){
    establecerEstado(
     "4 radares disponibles",
     "correcto"
    );
   }else{
    establecerEstado(
     `${disponibles.length}/4 radares`
    );
   }

  }else{

   establecerEstado(
    "Radar oculto"
   );
  }

  await mostrarFotograma(
   indice
  );

 }catch(e){

  console.error(e);

  ++secuenciaVisualizacion;

  timelines={};
  indicesPorRadar={};
  timelineRegional=[];

  limpiarCapasRadar();

  texto(
   "dato-fotogramas",
   "--"
  );

  texto(
   "dato-radares",
   "0 / 4"
  );

  texto(
   "dato-capas",
   "0 / 4"
  );

  establecerEstado(
   "No disponible",
   "error"
  );

  mostrarMensaje(
   "No se ha podido cargar el radar regional: "+
   e.message,
   true
  );
 }
}


/* =========================================================
   REPRODUCCIÓN
   ========================================================= */

function actualizarBotonPlay(){
 const b=elemento(
  "reproducir"
 );

 if(b){
  b.textContent=
   reproduciendo
    ?"Ⅱ"
    :"▶";
 }
}

function detener(){
 if(temporizador){

  clearTimeout(
   temporizador
  );

  temporizador=null;
 }

 reproduciendo=false;

 actualizarBotonPlay();
}

function reproducir(){
 if(
  timelineRegional.length<2
 ){
  return;
 }

 detener();

 reproduciendo=true;

 actualizarBotonPlay();

 const avanzar=async()=>{

  if(!reproduciendo)return;

  const siguiente=
   indice+1>=
   timelineRegional.length
    ?0
    :indice+1;

  await mostrarFotograma(
   siguiente
  );

  if(reproduciendo){
   temporizador=
    setTimeout(
     avanzar,
     850
    );
  }
 };

 temporizador=
  setTimeout(
   avanzar,
   850
  );
}


/* =========================================================
   SELECTOR RADAR
   ========================================================= */

function alternarRadar(){
 radarActivo=
  !radarActivo;

 actualizarSelectorRadar();

 if(!radarActivo){

  ++secuenciaVisualizacion;

  detener();

  ocultarCapasRadar();

  texto(
   "dato-capas",
   "0 / 4"
  );

  establecerEstado(
   "Radar oculto"
  );

  mostrarMensaje("");

  reajustarMapa();

  return;
 }

 const paso=
  timelineRegional[indice];

 if(
  paso&&
  tsCapasRadar===paso.ts&&
  contarCapasRadarDisponibles()>0
 ){
  reponerCapasRadar();

  reajustarMapa();

  return;
 }

 if(paso){
  void mostrarFotograma(
   indice
  );
 }
}


/* =========================================================
   EVENTOS
   ========================================================= */

function instalarEventos(){

 elemento("anterior")
  .addEventListener(
   "click",
   ()=>{
    detener();

    void mostrarFotograma(
     indice-1
    );
   }
  );

 elemento("siguiente")
  .addEventListener(
   "click",
   ()=>{
    detener();

    void mostrarFotograma(
     indice+1
    );
   }
  );

 elemento("reproducir")
  .addEventListener(
   "click",
   ()=>{
    if(reproduciendo){
     detener();
    }else{
     reproducir();
    }
   }
  );

 elemento("recargar")
  .addEventListener(
   "click",
   ()=>void cargarTimeline()
  );

 elemento("timeline-slider")
  .addEventListener(
   "input",
   e=>{
    detener();

    void mostrarFotograma(
     Number(
      e.target.value
     )
    );
   }
  );

 elemento("opacidad-slider")
  .addEventListener(
   "input",
   e=>{

    opacidad=
     Number(
      e.target.value
     )/100;

    texto(
     "opacidad-valor",
     `${e.target.value} %`
    );

    RADARES.forEach(
     codigo=>{

      if(
       capasRadar[codigo]
      ){
       capasRadar[codigo]
        .setOpacity(
         opacidad
        );
      }

      if(
       capasPendientes[codigo]
      ){
       capasPendientes[codigo]
        .setOpacity(
         opacidad
        );
      }
     }
    );
   }
  );

 const selectorRadar=
  elemento(
   "capa-radar"
  );

 if(selectorRadar){
  selectorRadar.addEventListener(
   "click",
   alternarRadar
  );
 }

 FONDOS.forEach(nombre=>{

  const boton=
   elemento(
    `fondo-${nombre}`
   );

  if(!boton)return;

  boton.addEventListener(
   "click",
   ()=>cambiarFondo(nombre)
  );
 });
}


/* =========================================================
   INICIO
   ========================================================= */

function iniciar(){
 crearMapa();

 actualizarSelectorFondos();
 actualizarSelectorRadar();

 instalarEventos();

 requestAnimationFrame(
  ()=>
   requestAnimationFrame(
    ()=>{
     reajustarMapa();
     cargarLocalidades();
     void cargarTimeline();
    }
   )
 );
}

if(
 document.readyState==="loading"
){
 document.addEventListener(
  "DOMContentLoaded",
  iniciar,
  {
   once:true
  }
 );
}else{
 iniciar();
}

// Fin de fichero: visores/radar.js