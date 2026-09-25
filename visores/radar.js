/* API_BASE lo decide ../js/api.js, que se carga antes que este fichero. */

const API_BASE=window.API_BASE;

const FONDOS={
 satelite:{
  id:"fondo-satelite",
  tipo:"cartografico"
 },
 politico:{
  id:"fondo-politico",
  tipo:"cartografico"
 },
 fisico:{
  id:"fondo-fisico",
  tipo:"cartografico"
 },
 negro:{
  id:"fondo-negro",
  tipo:"cartografico"
 },
 true_colour:{
  id:"fondo-true-colour",
  tipo:"meteorologico"
 },
 infrarrojo:{
  id:"fondo-infrarrojo",
  tipo:"meteorologico"
 },
 masas_aire:{
  id:"fondo-masas-aire",
  tipo:"meteorologico"
 }
};

const PRODUCTOS_SATELITE=[
 "true_colour",
 "infrarrojo",
 "masas_aire"
];

const URL_LOCALIDADES=new URL(
 "../datos/localidades-radar.geojson",
 window.location.href
).href;

const URL_LIMITES=new URL(
 "../datos/limites-radar.geojson",
 window.location.href
).href;

const CENTRO_REGIONAL=[
 37.15,
 -4.25
];

const ZOOM_REGIONAL=8;

const ATRIBUCION_LIMITES=
 'Límites: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';


/* =========================================================
   ESTADO GENERAL
   ========================================================= */

let mapa=null;

let capaLocalidades=null;
let localidades=[];

let pipeline=null;
let recursos={};
let timelineSeguimiento=[];

let indice=0;

let reproduciendo=false;
let temporizadorReproduccion=null;
let temporizadorActualizacion=null;

let secuenciaVisualizacion=0;
let secuenciaPrecarga=0;

let fondosMapa={};
let capaFondoActual=null;
let fondoActivo="satelite";

let capaFondoMeteorologico=null;
let claveFondoMeteorologico=null;

let capaLimitesAdministrativos=null;
let promesaLimitesAdministrativos=null;
let atribucionLimitesActiva=false;
let limitesActivos=true;

let radarActivo=true;
let rayosActivo=false;

let opacidadRadar=.82;

let capasRadarActuales={};

let capaRayosActual=null;
let claveRayosActual=null;


/* =========================================================
   UTILIDADES
   ========================================================= */

function elemento(id){
 return document.getElementById(id);
}

function texto(id,valor){
 const nodo=elemento(id);

 if(nodo){
  nodo.textContent=valor;
 }
}

function esperar(ms){
 return new Promise(
  resolver=>setTimeout(
   resolver,
   ms
  )
 );
}

function fechaValida(valor){
 const fechaObjeto=
  new Date(valor);

 return Number.isNaN(
  fechaObjeto.getTime()
 )
  ?null
  :fechaObjeto;
}

function marcaTemporal(valor){
 const marca=
  Date.parse(valor);

 return Number.isFinite(marca)
  ?marca
  :null;
}

function hora(valor){
 const fechaObjeto=
  fechaValida(valor);

 return fechaObjeto
  ?fechaObjeto.toLocaleTimeString(
    "es-ES",
    {
     hour:"2-digit",
     minute:"2-digit"
    }
   )
  :"--:--";
}

function fecha(valor){
 const fechaObjeto=
  fechaValida(valor);

 return fechaObjeto
  ?fechaObjeto.toLocaleDateString(
    "es-ES",
    {
     day:"2-digit",
     month:"2-digit",
     year:"numeric"
    }
   )
  :"--";
}

function urlAbsoluta(url){
 if(!url){
  return null;
 }

 if(
  /^https?:\/\//.test(
   url
  )
 ){
  return url;
 }

 if(
  url.startsWith("/")
 ){
  return API_BASE+url;
 }

 return`${API_BASE}/${url}`;
}

function establecerEstado(
 mensaje,
 tipo=null
){
 const estado=
  elemento("estado");

 texto(
  "estado-texto",
  mensaje
 );

 if(!estado){
  return;
 }

 estado.classList.remove(
  "correcto",
  "error"
 );

 if(tipo){
  estado.classList.add(
   tipo
  );
 }
}

function mostrarMensaje(
 mensaje,
 error=false
){
 const nodo=
  elemento("mensaje");

 if(!nodo){
  return;
 }

 if(!mensaje){
  nodo.classList.remove(
   "visible",
   "error"
  );

  nodo.textContent="";
  return;
 }

 nodo.textContent=
  mensaje;

 nodo.classList.toggle(
  "error",
  error
 );

 nodo.classList.add(
  "visible"
 );
}

function obtenerRecurso(clave){
 if(
  !clave||
  !recursos
 ){
  return null;
 }

 return recursos[
  clave
 ]||null;
}

function bounds(recurso){
 if(
  !recurso||
  !recurso.limites
 ){
  return null;
 }

 const oeste=
  Number(
   recurso.limites.oeste
  );

 const sur=
  Number(
   recurso.limites.sur
  );

 const este=
  Number(
   recurso.limites.este
  );

 const norte=
  Number(
   recurso.limites.norte
  );

 return[
  oeste,
  sur,
  este,
  norte
 ].every(
  Number.isFinite
 )
  ?[
    [
     sur,
     oeste
    ],
    [
     norte,
     este
    ]
   ]
  :null;
}

function quitarCapa(capa){
 if(
  capa&&
  mapa&&
  mapa.hasLayer(capa)
 ){
  mapa.removeLayer(
   capa
  );
 }
}

function esFondoMeteorologico(
 nombre
){
 return PRODUCTOS_SATELITE.includes(
  nombre
 );
}

function esFondoOscuro(){
 return(
  fondoActivo==="negro"||
  fondoActivo==="satelite"||
  esFondoMeteorologico(
   fondoActivo
  )
 );
}

function debeMostrarLimites(){
 if(!limitesActivos){
  return false;
 }

 /*
  * Nunca superponemos nuestros límites propios
  * sobre el fondo político.
  */
 if(
  fondoActivo==="politico"
 ){
  return false;
 }

 /*
  * Por ahora los mostramos sobre:
  *
  * - fondo negro;
  * - productos meteorológicos satelitales.
  *
  * La futura interfaz permitirá controlarlos de forma
  * explícita como una capa independiente.
  */
 return(
  fondoActivo==="negro"||
  esFondoMeteorologico(
   fondoActivo
  )
 );
}


/* =========================================================
   ORDEN VERTICAL DEL VISOR

   fondo cartográfico
   fondo satelital meteorológico
   límites administrativos
   radar
   rayos
   localidades
   etiquetas
   ========================================================= */

function crearPanelesMapa(){
 const paneles=[
  [
   "basePane",
   100
  ],
  [
   "satelitePane",
   180
  ],
  [
   "limitesPane",
   260
  ],
  [
   "radarPane",
   350
  ],
  [
   "rayosPane",
   440
  ],
  [
   "localidadesPane",
   620
  ]
 ];

 for(
  const[
   nombre,
   zIndex
  ]of paneles
 ){
  mapa.createPane(
   nombre
  );

  mapa.getPane(
   nombre
  ).style.zIndex=
   zIndex;

  mapa.getPane(
   nombre
  ).style.pointerEvents=
   "none";
 }

 mapa.getPane(
  "tooltipPane"
 ).style.zIndex=
  "700";
}


/* =========================================================
   LÍMITES ADMINISTRATIVOS
   ========================================================= */

function estiloLimiteAdministrativo(
 feature
){
 const propiedades=
  feature?.properties||{};

 /*
  * Estilo provisional.
  *
  * En un paso posterior definiremos específicamente:
  *
  * - color buganvilla;
  * - grosor;
  * - continuidad/discontinuidad;
  * - jerarquía internacional/autonómica/provincial.
  */
 if(
  propiedades.tipo==="comunidad"
 ){
  return{
   color:"#36d5ff",
   weight:2.4,
   opacity:.95,
   fill:false,
   interactive:false
  };
 }

 if(
  propiedades.grupo==="andalucia"
 ){
  return{
   color:"#d8e2ea",
   weight:1.25,
   opacity:.82,
   fill:false,
   interactive:false
  };
 }

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
  debeMostrarLimites();

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
 if(!mapa){
  return;
 }

 if(
  capaLimitesAdministrativos
 ){
  if(
   debeMostrarLimites()&&
   !mapa.hasLayer(
    capaLimitesAdministrativos
   )
  ){
   capaLimitesAdministrativos
    .addTo(mapa);
  }

  return;
 }

 if(
  promesaLimitesAdministrativos
 ){
  await promesaLimitesAdministrativos;
  return;
 }

 promesaLimitesAdministrativos=
  (async()=>{

   try{
    const respuesta=
     await fetch(
      URL_LIMITES,
      {
       cache:"no-store"
      }
     );

    if(
     !respuesta.ok
    ){
     throw new Error(
      `HTTP ${respuesta.status}`
     );
    }

    const datos=
     await respuesta.json();

    if(
     datos.type!=="FeatureCollection"||
     !Array.isArray(
      datos.features
     )
    ){
     throw new Error(
      "GeoJSON de límites inválido."
     );
    }

    capaLimitesAdministrativos=
     L.geoJSON(
      datos,
      {
       pane:"limitesPane",
       interactive:false,
       style:
        estiloLimiteAdministrativo
      }
     );

    if(
     debeMostrarLimites()
    ){
     capaLimitesAdministrativos
      .addTo(mapa);
    }

   }catch(error){
    console.error(
     "No se ha podido cargar la capa de límites administrativos:",
     error
    );

    capaLimitesAdministrativos=
     null;
   }

  })();

 try{
  await promesaLimitesAdministrativos;
 }finally{
  promesaLimitesAdministrativos=
   null;
 }
}

function actualizarLimitesAdministrativos(){
 if(!mapa){
  return;
 }

 actualizarAtribucionLimites();

 if(
  !debeMostrarLimites()
 ){
  quitarCapa(
   capaLimitesAdministrativos
  );

  return;
 }

 void cargarLimitesAdministrativos();
}


/* =========================================================
   FONDOS
   ========================================================= */

function actualizarSelectorFondos(){
 Object.entries(
  FONDOS
 ).forEach(
  ([
   nombre,
   configuracion
  ])=>{

   const boton=
    elemento(
     configuracion.id
    );

   if(!boton){
    return;
   }

   const activo=
    nombre===fondoActivo;

   boton.classList.toggle(
    "activo",
    activo
   );

   boton.setAttribute(
    "aria-pressed",
    String(
     activo
    )
   );
  }
 );
}

function crearFondosMapa(){
 fondosMapa={

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

 cambiarFondo(
  "satelite"
 );
}

function actualizarColorFondoMapa(){
 if(
  !mapa
 ){
  return;
 }

 const contenedor=
  mapa.getContainer();

 const zona=
  contenedor.closest(
   ".mapa-zona"
  );

 const negro=
  fondoActivo==="negro"||
  esFondoMeteorologico(
   fondoActivo
  );

 const color=
  negro
   ?"#000"
   :"#091521";

 contenedor.style.background=
  color;

 if(zona){
  zona.style.background=
   color;
 }
}

function retirarFondoMeteorologico(){
 quitarCapa(
  capaFondoMeteorologico
 );
}

function cambiarFondo(nombre){
 if(
  !mapa||
  !Object.prototype.hasOwnProperty.call(
   FONDOS,
   nombre
  )
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

 fondoActivo=
  nombre;

 const configuracion=
  FONDOS[
   nombre
  ];

 if(
  configuracion.tipo===
  "cartografico"
 ){
  capaFondoActual=
   fondosMapa[
    nombre
   ]||null;

  retirarFondoMeteorologico();

  if(
   capaFondoActual
  ){
   capaFondoActual
    .addTo(mapa);
  }

 }else{
  capaFondoActual=
   null;
 }

 actualizarColorFondoMapa();

 document.body.dataset.fondo=
  nombre;

 actualizarSelectorFondos();

 actualizarLimitesAdministrativos();

 renderizarLocalidades();

 reajustarMapa();

 if(
  configuracion.tipo===
  "meteorologico"&&
  timelineSeguimiento.length
 ){
  void mostrarFotograma(
   indice,
   {
    soloFondo:true
   }
  );
 }
}


/* =========================================================
   LOCALIDADES
   ========================================================= */

function prioridadLocalidad(feature){
 const valor=
  Number(
   feature?.properties?.prioridad
  );

 return Number.isFinite(
  valor
 )
  ?valor
  :99;
}

function zoomMinimoLocalidad(feature){
 const valor=
  Number(
   feature?.properties?.zoom_min
  );

 return Number.isFinite(
  valor
 )
  ?valor
  :5;
}

function claseEtiquetaLocalidad(tipo){
 const permitidos=[
  "capital",
  "ciudad",
  "municipio",
  "pedania",
  "cabecera",
  "estacion"
 ];

 return`etiqueta-localidad etiqueta-${
  permitidos.includes(
   tipo
  )
   ?tipo
   :"municipio"
 }`;
}

function estiloPuntoLocalidad(
 propiedades
){
 const fondoOscuro=
  esFondoOscuro();

 if(
  propiedades.tipo==="capital"
 ){
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
  propiedades.tipo==="ciudad"||
  propiedades.tipo==="cabecera"
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

 if(
  propiedades.tipo==="estacion"
 ){
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

 if(
  propiedades.tipo==="pedania"
 ){
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

function colorEtiquetaLocalidad(
 propiedades
){
 if(
  !esFondoOscuro()
 ){
  return null;
 }

 if(
  propiedades.tipo==="capital"||
  propiedades.tipo==="ciudad"||
  propiedades.tipo==="cabecera"
 ){
  return"#ff5c91";
 }

 if(
  propiedades.tipo==="estacion"
 ){
  return"#60a5fa";
 }

 if(
  propiedades.tipo==="pedania"
 ){
  return"#67e8f9";
 }

 return"#fff";
}

function aplicarColorEtiqueta(
 punto,
 propiedades
){
 const color=
  colorEtiquetaLocalidad(
   propiedades
  );

 if(!color){
  return;
 }

 const aplicar=()=>{
  const tooltip=
   punto.getTooltip();

  const elementoTooltip=
   tooltip
    ?tooltip.getElement()
    :null;

  if(!elementoTooltip){
   return;
  }

  elementoTooltip.style.color=
   color;

  elementoTooltip.style.textShadow=
   "0 1px 2px #000,0 0 4px #000,0 0 7px #000";
 };

 aplicar();

 requestAnimationFrame(
  aplicar
 );
}

function direccionEtiquetaLocalidad(
 propiedades
){
 return propiedades.tipo==="estacion"
  ?"right"
  :"top";
}

function offsetEtiquetaLocalidad(
 propiedades
){
 return propiedades.tipo==="estacion"
  ?[
    7,
    0
   ]
  :[
    0,
    -7
   ];
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
   feature=>
    zoom>=
    zoomMinimoLocalidad(
     feature
    )
  )
  .sort(
   (
    a,
    b
   )=>
    prioridadLocalidad(b)-
    prioridadLocalidad(a)
  )
  .forEach(
   feature=>{

    const geometria=
     feature.geometry;

    const propiedades=
     feature.properties||{};

    if(
     !geometria||
     geometria.type!=="Point"||
     !Array.isArray(
      geometria.coordinates
     )||
     geometria.coordinates.length<2
    ){
     return;
    }

    const longitud=
     Number(
      geometria.coordinates[0]
     );

    const latitud=
     Number(
      geometria.coordinates[1]
     );

    if(
     !Number.isFinite(
      latitud
     )||
     !Number.isFinite(
      longitud
     )
    ){
     return;
    }

    const punto=
     L.circleMarker(
      [
       latitud,
       longitud
      ],
      {
       pane:"localidadesPane",
       ...estiloPuntoLocalidad(
        propiedades
       ),
       interactive:false
      }
     );

    punto.bindTooltip(
     propiedades.nombre||"",
     {
      permanent:true,
      direction:
       direccionEtiquetaLocalidad(
        propiedades
       ),
      offset:
       offsetEtiquetaLocalidad(
        propiedades
       ),
      className:
       claseEtiquetaLocalidad(
        propiedades.tipo
       )
     }
    );

    capaLocalidades.addLayer(
     punto
    );

    aplicarColorEtiqueta(
     punto,
     propiedades
    );
   }
  );
}

async function cargarLocalidades(){
 try{
  const respuesta=
   await fetch(
    URL_LOCALIDADES,
    {
     cache:"no-store"
    }
   );

  if(
   !respuesta.ok
  ){
   throw new Error(
    `HTTP ${respuesta.status}`
   );
  }

  const datos=
   await respuesta.json();

  if(
   datos.type!=="FeatureCollection"||
   !Array.isArray(
    datos.features
   )
  ){
   throw new Error(
    "GeoJSON de localidades inválido."
   );
  }

  localidades=
   datos.features.filter(
    feature=>
     feature&&
     feature.geometry&&
     feature.geometry.type==="Point"
   );

  texto(
   "dato-localidades",
   localidades.length
  );

  renderizarLocalidades();

 }catch(error){
  console.error(
   "No se ha podido cargar la capa de localidades:",
   error
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
 if(
  typeof L==="undefined"
 ){
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

 mapa=
  L.map(
   "mapa-radar",
   {
    center:
     CENTRO_REGIONAL,
    zoom:
     ZOOM_REGIONAL,
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

 L.control.scale(
  {
   metric:true,
   imperial:false,
   position:"bottomright"
  }
 ).addTo(mapa);

 mapa.on(
  "zoomend",
  renderizarLocalidades
 );

 reajustarMapa();
}

function reajustarMapa(){
 if(!mapa){
  return;
 }

 requestAnimationFrame(
  ()=>
   mapa.invalidateSize(
    {
     animate:false,
     pan:false
    }
   )
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

if(
 window.visualViewport
){
 window.visualViewport
  .addEventListener(
   "resize",
   reajustarMapa
  );
}


/* =========================================================
   CARGA DE IMAGEOVERLAY

   Las URLs de imagen son estables.

   No añadimos cache-busters.

   Esto es deliberado: permite que el navegador reutilice
   una imagen ya descargada cuando el usuario vuelve a un
   fotograma anterior.
   ========================================================= */

function esperarCargaOverlay(
 overlay,
 timeout=20000
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
     clearTimeout(
      timer
     );
    }

    overlay.off(
     "load",
     cargada
    );

    overlay.off(
     "error",
     errorCarga
    );
   };

   const cerrar=(
    funcion,
    valor
   )=>{
    if(terminado){
     return;
    }

    terminado=true;

    limpiar();

    funcion(
     valor
    );
   };

   const cargada=()=>
    cerrar(
     resolve,
     true
    );

   const errorCarga=()=>
    cerrar(
     reject,
     new Error(
      "Error cargando imagen meteorológica."
     )
    );

   overlay.on(
    "load",
    cargada
   );

   overlay.on(
    "error",
    errorCarga
   );

   timer=
    setTimeout(
     ()=>
      cerrar(
       reject,
       new Error(
        "Tiempo de espera agotado."
       )
      ),
     timeout
    );

   try{
    overlay.addTo(
     mapa
    );
   }catch(error){
    cerrar(
     reject,
     error
    );
   }
  }
 );
}

async function crearOverlayRecurso(
 clave,
 *,
 pane,
 opacity=1,
 secuencia
){
 const recurso=
  obtenerRecurso(
   clave
  );

 if(!recurso){
  return null;
 }

 const limites=
  bounds(
   recurso
  );

 const url=
  urlAbsoluta(
   recurso.url_imagen
  );

 if(
  !limites||
  !url
 ){
  return null;
 }

 const overlay=
  L.imageOverlay(
   url,
   limites,
   {
    pane,
    opacity,
    interactive:false
   }
  );

 try{
  await esperarCargaOverlay(
   overlay
  );

  if(
   secuencia!==
   secuenciaVisualizacion
  ){
   quitarCapa(
    overlay
   );

   return null;
  }

  return overlay;

 }catch(error){
  quitarCapa(
   overlay
  );

  console.warn(
   `No se ha podido cargar el recurso ${clave}:`,
   error
  );

  return null;
 }
}


/* =========================================================
   FONDO SATELITAL METEOROLÓGICO
   ========================================================= */

async function mostrarFondoMeteorologico(
 paso,
 secuencia
){
 if(
  !esFondoMeteorologico(
   fondoActivo
  )
 ){
  retirarFondoMeteorologico();

  return false;
 }

 const clave=
  paso?.capas?.[
   fondoActivo
  ]||null;

 if(!clave){
  retirarFondoMeteorologico();

  claveFondoMeteorologico=
   null;

  return false;
 }

 if(
  clave===
  claveFondoMeteorologico&&
  capaFondoMeteorologico
 ){
  if(
   !mapa.hasLayer(
    capaFondoMeteorologico
   )
  ){
   capaFondoMeteorologico
    .addTo(mapa);
  }

  return true;
 }

 const nuevaCapa=
  await crearOverlayRecurso(
   clave,
   {
    pane:"satelitePane",
    opacity:1,
    secuencia
   }
  );

 if(
  !nuevaCapa||
  secuencia!==
  secuenciaVisualizacion
 ){
  return false;
 }

 const anterior=
  capaFondoMeteorologico;

 capaFondoMeteorologico=
  nuevaCapa;

 claveFondoMeteorologico=
  clave;

 quitarCapa(
  anterior
 );

 return true;
}


/* =========================================================
   RADAR DINÁMICO
   ========================================================= */

function actualizarSelectorRadar(){
 const boton=
  elemento(
   "capa-radar"
  );

 if(!boton){
  return;
 }

 boton.classList.toggle(
  "activa",
  radarActivo
 );

 boton.setAttribute(
  "aria-pressed",
  String(
   radarActivo
  )
 );

 const estado=
  boton.querySelector(
   ".selector-capa-estado"
  );

 if(estado){
  estado.textContent=
   radarActivo
    ?"Activa"
    :"Oculta";
 }
}

function ocultarCapasRadar(){
 Object.values(
  capasRadarActuales
 ).forEach(
  entrada=>
   quitarCapa(
    entrada?.capa
   )
 );
}

function limpiarCapasRadar(){
 Object.values(
  capasRadarActuales
 ).forEach(
  entrada=>
   quitarCapa(
    entrada?.capa
   )
 );

 capasRadarActuales={};
}

async function mostrarRadares(
 paso,
 secuencia
){
 if(
  !radarActivo
 ){
  ocultarCapasRadar();

  return 0;
 }

 const deseadas=
  paso?.capas?.radares||{};

 const codigosDeseados=
  new Set(
   Object.keys(
    deseadas
   )
  );

 Object.keys(
  capasRadarActuales
 ).forEach(
  codigo=>{

   if(
    codigosDeseados.has(
     codigo
    )
   ){
    return;
   }

   quitarCapa(
    capasRadarActuales[
     codigo
    ]?.capa
   );

   delete capasRadarActuales[
    codigo
   ];
  }
 );

 let visibles=0;

 for(
  const[
   codigo,
   clave
  ]of Object.entries(
   deseadas
  )
 ){
  if(
   secuencia!==
   secuenciaVisualizacion||
   !radarActivo
  ){
   return visibles;
  }

  const actual=
   capasRadarActuales[
    codigo
   ]||null;

  if(
   actual&&
   actual.clave===clave&&
   actual.capa
  ){
   if(
    !mapa.hasLayer(
     actual.capa
    )
   ){
    actual.capa.addTo(
     mapa
    );
   }

   actual.capa.setOpacity(
    opacidadRadar
   );

   visibles++;

   continue;
  }

  const nuevaCapa=
   await crearOverlayRecurso(
    clave,
    {
     pane:"radarPane",
     opacity:
      opacidadRadar,
     secuencia
    }
   );

  if(
   secuencia!==
   secuenciaVisualizacion||
   !radarActivo
  ){
   quitarCapa(
    nuevaCapa
   );

   return visibles;
  }

  if(!nuevaCapa){
   if(actual){
    quitarCapa(
     actual.capa
    );

    delete capasRadarActuales[
     codigo
    ];
   }

   continue;
  }

  if(actual){
   quitarCapa(
    actual.capa
   );
  }

  capasRadarActuales[
   codigo
  ]={
   clave,
   capa:
    nuevaCapa
  };

  visibles++;

  /*
   * Evita golpear simultáneamente al endpoint radar
   * con todos los radares cuando hay que generar nuevos
   * fotogramas procesados.
   */
  await esperar(
   90
  );
 }

 return visibles;
}


/* =========================================================
   RAYOS
   ========================================================= */

function actualizarSelectorRayos(){
 const boton=
  elemento(
   "capa-rayos"
  );

 if(!boton){
  return;
 }

 /*
  * El HTML antiguo lo mantenía deshabilitado.
  *
  * Ahora la API de Seguimiento ya proporciona rayos,
  * por lo que puede activarse incluso antes del siguiente
  * cambio estructural del HTML.
  */
 boton.disabled=false;

 boton.classList.toggle(
  "activa",
  rayosActivo
 );

 boton.setAttribute(
  "aria-pressed",
  String(
   rayosActivo
  )
 );

 boton.title=
  "Mostrar u ocultar actividad eléctrica";

 const estado=
  boton.querySelector(
   ".selector-capa-estado"
  );

 if(estado){
  estado.textContent=
   rayosActivo
    ?"Activa"
    :"Oculta";
 }
}

function ocultarRayos(){
 quitarCapa(
  capaRayosActual
 );
}

async function mostrarRayos(
 paso,
 secuencia
){
 if(
  !rayosActivo
 ){
  ocultarRayos();

  return false;
 }

 const clave=
  paso?.capas?.rayos||null;

 if(!clave){
  ocultarRayos();

  claveRayosActual=
   null;

  return false;
 }

 if(
  clave===
  claveRayosActual&&
  capaRayosActual
 ){
  if(
   !mapa.hasLayer(
    capaRayosActual
   )
  ){
   capaRayosActual.addTo(
    mapa
   );
  }

  return true;
 }

 const nuevaCapa=
  await crearOverlayRecurso(
   clave,
   {
    pane:"rayosPane",
    opacity:1,
    secuencia
   }
  );

 if(
  !nuevaCapa||
  secuencia!==
  secuenciaVisualizacion
 ){
  return false;
 }

 const anterior=
  capaRayosActual;

 capaRayosActual=
  nuevaCapa;

 claveRayosActual=
  clave;

 quitarCapa(
  anterior
 );

 return true;
}


/* =========================================================
   TIMELINE
   ========================================================= */

function actualizarControles(){
 const paso=
  timelineSeguimiento[
   indice
  ];

 texto(
  "timeline-posicion",
  paso
   ?hora(
     paso.instante
    )
   :"--:--"
 );

 if(
  timelineSeguimiento.length
 ){
  texto(
   "timeline-inicio",
   hora(
    timelineSeguimiento[
     0
    ].instante
   )
  );

  texto(
   "timeline-fin",
   hora(
    timelineSeguimiento[
     timelineSeguimiento.length-1
    ].instante
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

 if(slider){
  slider.max=
   Math.max(
    0,
    timelineSeguimiento.length-1
   );

  slider.value=
   indice;
 }
}

function obtenerCodigosRadarPipeline(){
 const codigos=
  new Set();

 Object.values(
  recursos||{}
 ).forEach(
  recurso=>{

   if(
    recurso?.tipo==="radar"&&
    recurso.codigo_radar
   ){
    codigos.add(
     recurso.codigo_radar
    );
   }
  }
 );

 return[
  ...codigos
 ].sort();
}

function actualizarDatosGenerales(){
 texto(
  "dato-fotogramas",
  timelineSeguimiento.length||
  "--"
 );

 const radares=
  obtenerCodigosRadarPipeline();

 texto(
  "dato-radares",
  radares.length
 );

 texto(
  "dato-capas",
  "--"
 );
}

function buscarIndiceMasCercano(
 instante
){
 if(
  !timelineSeguimiento.length
 ){
  return 0;
 }

 const objetivo=
  marcaTemporal(
   instante
  );

 if(
  objetivo===null
 ){
  return(
   timelineSeguimiento.length-1
  );
 }

 let mejorIndice=0;
 let mejorDistancia=
  Infinity;

 timelineSeguimiento.forEach(
  (
   paso,
   posicion
  )=>{

   const marca=
    marcaTemporal(
     paso.instante
    );

   if(
    marca===null
   ){
    return;
   }

   const distancia=
    Math.abs(
     marca-
     objetivo
    );

   if(
    distancia<
    mejorDistancia
   ){
    mejorDistancia=
     distancia;

    mejorIndice=
     posicion;
   }
  }
 );

 return mejorIndice;
}


/* =========================================================
   PRECARGA DEL SIGUIENTE PASO

   Solo se precargan recursos realmente activos y únicamente
   cuando cambian respecto al paso actual.

   La descarga es secuencial para no provocar una ráfaga de
   peticiones pesadas al backend.
   ========================================================= */

function clavesActivasPaso(
 paso
){
 const claves=
  [];

 if(
  esFondoMeteorologico(
   fondoActivo
  )
 ){
  const clave=
   paso?.capas?.[
    fondoActivo
   ];

  if(clave){
   claves.push(
    clave
   );
  }
 }

 if(radarActivo){
  Object.values(
   paso?.capas?.radares||{}
  ).forEach(
   clave=>{

    if(clave){
     claves.push(
      clave
     );
    }
   }
  );
 }

 if(
  rayosActivo&&
  paso?.capas?.rayos
 ){
  claves.push(
   paso.capas.rayos
  );
 }

 return[
  ...new Set(
   claves
  )
 ];
}

function precargarImagen(
 url,
 timeout=20000
){
 return new Promise(
  resolve=>{

   const imagen=
    new Image();

   let terminado=false;

   const cerrar=()=>{
    if(terminado){
     return;
    }

    terminado=true;

    clearTimeout(
     timer
    );

    imagen.onload=null;
    imagen.onerror=null;

    resolve();
   };

   const timer=
    setTimeout(
     cerrar,
     timeout
    );

   imagen.onload=
    cerrar;

   imagen.onerror=
    cerrar;

   imagen.src=
    url;
  }
 );
}

async function precargarSiguientePaso(
 secuencia
){
 const siguienteIndice=
  indice+1;

 if(
  siguienteIndice>=
  timelineSeguimiento.length
 ){
  return;
 }

 const actual=
  timelineSeguimiento[
   indice
  ];

 const siguiente=
  timelineSeguimiento[
   siguienteIndice
  ];

 const actuales=
  new Set(
   clavesActivasPaso(
    actual
   )
  );

 const nuevas=
  clavesActivasPaso(
   siguiente
  ).filter(
   clave=>
    !actuales.has(
     clave
    )
  );

 for(
  const clave of nuevas
 ){
  if(
   secuencia!==
   secuenciaPrecarga
  ){
   return;
  }

  const recurso=
   obtenerRecurso(
    clave
   );

  const url=
   urlAbsoluta(
    recurso?.url_imagen
   );

  if(!url){
   continue;
  }

  await precargarImagen(
   url
  );

  await esperar(
   120
  );
 }
}


/* =========================================================
   VISUALIZACIÓN DE UN PASO
   ========================================================= */

async function mostrarFotograma(
 nuevoIndice,
 opciones={}
){
 if(
  !mapa||
  !timelineSeguimiento.length
 ){
  return;
 }

 indice=
  Math.max(
   0,
   Math.min(
    nuevoIndice,
    timelineSeguimiento.length-1
   )
  );

 const paso=
  timelineSeguimiento[
   indice
  ];

 texto(
  "instante-hora",
  hora(
   paso.instante
  )
 );

 texto(
  "instante-fecha",
  fecha(
   paso.instante
  )
 );

 actualizarControles();

 reajustarMapa();

 const secuencia=
  ++secuenciaVisualizacion;

 ++secuenciaPrecarga;

 if(
  opciones.soloFondo
 ){
  await mostrarFondoMeteorologico(
   paso,
   secuencia
  );

  actualizarLimitesAdministrativos();

  renderizarLocalidades();

  return;
 }

 mostrarMensaje("");

 const resultados=
  await Promise.all(
   [
    mostrarFondoMeteorologico(
     paso,
     secuencia
    ),
    mostrarRadares(
     paso,
     secuencia
    ),
    mostrarRayos(
     paso,
     secuencia
    )
   ]
  );

 if(
  secuencia!==
  secuenciaVisualizacion
 ){
  return;
 }

 const fondoDisponible=
  resultados[0];

 const radaresVisibles=
  resultados[1];

 const rayosVisible=
  resultados[2];

 let capasVisibles=
  radaresVisibles;

 if(
  esFondoMeteorologico(
   fondoActivo
  )&&
  fondoDisponible
 ){
  capasVisibles++;
 }

 if(
  rayosActivo&&
  rayosVisible
 ){
  capasVisibles++;
 }

 texto(
  "dato-capas",
  capasVisibles
 );

 const numeroRadaresPaso=
  Object.keys(
   paso?.capas?.radares||{}
  ).length;

 let capasEsperadas=
  radarActivo
   ?numeroRadaresPaso
   :0;

 if(
  esFondoMeteorologico(
   fondoActivo
  )
 ){
  capasEsperadas++;
 }

 if(
  rayosActivo
 ){
  capasEsperadas++;
 }

 if(
  capasEsperadas===0
 ){
  establecerEstado(
   "Mapa operativo",
   "correcto"
  );

 }else if(
  capasVisibles>0
 ){
  establecerEstado(
   "Seguimiento operativo",
   "correcto"
  );

 }else{
  establecerEstado(
   "Capas no disponibles",
   "error"
  );

  mostrarMensaje(
   "No se ha podido cargar ninguna capa meteorológica activa para este instante.",
   true
  );
 }

 actualizarLimitesAdministrativos();

 renderizarLocalidades();

 reajustarMapa();

 const secuenciaNuevaPrecarga=
  ++secuenciaPrecarga;

 void precargarSiguientePaso(
  secuenciaNuevaPrecarga
 );
}


/* =========================================================
   DESCARGA DEL PIPELINE
   ========================================================= */

function validarPipeline(
 datos
){
 if(
  !datos||
  !Array.isArray(
   datos.pasos
  )||
  typeof datos.recursos!=="object"||
  datos.recursos===null
 ){
  throw new Error(
   "Pipeline de Seguimiento inválido."
  );
 }

 if(
  !datos.pasos.length
 ){
  throw new Error(
   "El pipeline no contiene pasos temporales."
  );
 }
}

function detenerActualizacionProgramada(){
 if(
  temporizadorActualizacion
 ){
  clearTimeout(
   temporizadorActualizacion
  );

  temporizadorActualizacion=
   null;
 }
}

function programarActualizacion(){
 detenerActualizacionProgramada();

 const segundos=
  Number(
   pipeline?.actualizar_cada_segundos
  );

 const intervalo=
  Number.isFinite(
   segundos
  )&&
  segundos>=60
   ?segundos*1000
   :300000;

 temporizadorActualizacion=
  setTimeout(
   ()=>{
    void cargarPipeline(
     {
      preservarPosicion:true,
      automatica:true
     }
    );
   },
   intervalo
  );
}

async function cargarPipeline(
 opciones={}
){
 const preservarPosicion=
  Boolean(
   opciones.preservarPosicion
  );

 const pasosAnteriores=
  timelineSeguimiento;

 const indiceAnterior=
  indice;

 const instanteAnterior=
  pasosAnteriores[
   indiceAnterior
  ]?.instante||null;

 const estabaEnUltimo=
  Boolean(
   pasosAnteriores.length&&
   indiceAnterior===
   pasosAnteriores.length-1
  );

 detener();

 ++secuenciaVisualizacion;
 ++secuenciaPrecarga;

 establecerEstado(
  "Cargando"
 );

 if(
  !opciones.automatica
 ){
  mostrarMensaje(
   "Cargando Seguimiento..."
  );
 }

 try{
  const url=
   `${API_BASE}/seguimiento/pipeline`+
   `?ambito=regional`+
   `&_=${Date.now()}`;

  const respuesta=
   await fetch(
    url,
    {
     cache:"no-store"
    }
   );

  if(
   !respuesta.ok
  ){
   throw new Error(
    `HTTP ${respuesta.status}`
   );
  }

  const datos=
   await respuesta.json();

  validarPipeline(
   datos
  );

  pipeline=
   datos;

  recursos=
   datos.recursos;

  timelineSeguimiento=
   datos.pasos
    .slice()
    .sort(
     (
      a,
      b
     )=>
      marcaTemporal(
       a.instante
      )-
      marcaTemporal(
       b.instante
      )
    );

  if(
   preservarPosicion&&
   instanteAnterior&&
   !estabaEnUltimo
  ){
   indice=
    buscarIndiceMasCercano(
     instanteAnterior
    );

  }else{
   indice=
    timelineSeguimiento.length-1;
  }

  actualizarDatosGenerales();

  mostrarMensaje("");

  await mostrarFotograma(
   indice
  );

  programarActualizacion();

 }catch(error){
  console.error(
   "No se ha podido cargar el pipeline de Seguimiento:",
   error
  );

  establecerEstado(
   "No disponible",
   "error"
  );

  if(
   !timelineSeguimiento.length
  ){
   limpiarCapasRadar();

   ocultarRayos();

   retirarFondoMeteorologico();

   texto(
    "dato-fotogramas",
    "--"
   );

   texto(
    "dato-radares",
    "--"
   );

   texto(
    "dato-capas",
    "--"
   );

   mostrarMensaje(
    "No se ha podido cargar Seguimiento: "+
    error.message,
    true
   );

  }else{
   mostrarMensaje(
    "No se ha podido actualizar Seguimiento. Se mantienen los datos ya cargados.",
    true
   );
  }

  detenerActualizacionProgramada();

  temporizadorActualizacion=
   setTimeout(
    ()=>{
     void cargarPipeline(
      {
       preservarPosicion:true,
       automatica:true
      }
     );
    },
    60000
   );
 }
}


/* =========================================================
   REPRODUCCIÓN
   ========================================================= */

function actualizarBotonPlay(){
 const boton=
  elemento(
   "reproducir"
  );

 if(
  boton
 ){
  boton.textContent=
   reproduciendo
    ?"Ⅱ"
    :"▶";
 }
}

function detener(){
 if(
  temporizadorReproduccion
 ){
  clearTimeout(
   temporizadorReproduccion
  );

  temporizadorReproduccion=
   null;
 }

 reproduciendo=false;

 actualizarBotonPlay();
}

function reproducir(){
 if(
  timelineSeguimiento.length<2
 ){
  return;
 }

 detener();

 reproduciendo=true;

 actualizarBotonPlay();

 const avanzar=
  async()=>{

   if(
    !reproduciendo
   ){
    return;
   }

   const siguiente=
    indice+1>=
    timelineSeguimiento.length
     ?0
     :indice+1;

   await mostrarFotograma(
    siguiente
   );

   if(
    reproduciendo
   ){
    temporizadorReproduccion=
     setTimeout(
      avanzar,
      850
     );
   }
  };

 temporizadorReproduccion=
  setTimeout(
   avanzar,
   850
  );
}


/* =========================================================
   SELECTORES DE CAPA
   ========================================================= */

function alternarRadar(){
 radarActivo=
  !radarActivo;

 actualizarSelectorRadar();

 if(
  !radarActivo
 ){
  ++secuenciaVisualizacion;

  detener();

  ocultarCapasRadar();

  if(
   timelineSeguimiento.length
  ){
   void mostrarFotograma(
    indice
   );
  }

  return;
 }

 if(
  timelineSeguimiento.length
 ){
  void mostrarFotograma(
   indice
  );
 }
}

function alternarRayos(){
 rayosActivo=
  !rayosActivo;

 actualizarSelectorRayos();

 if(
  !rayosActivo
 ){
  ++secuenciaVisualizacion;

  detener();

  ocultarRayos();

  if(
   timelineSeguimiento.length
  ){
   void mostrarFotograma(
    indice
   );
  }

  return;
 }

 if(
  timelineSeguimiento.length
 ){
  void mostrarFotograma(
   indice
  );
 }
}


/* =========================================================
   EVENTOS
   ========================================================= */

function instalarEventos(){
 const anterior=
  elemento(
   "anterior"
  );

 if(anterior){
  anterior.addEventListener(
   "click",
   ()=>{
    detener();

    void mostrarFotograma(
     indice-1
    );
   }
  );
 }

 const siguiente=
  elemento(
   "siguiente"
  );

 if(siguiente){
  siguiente.addEventListener(
   "click",
   ()=>{
    detener();

    void mostrarFotograma(
     indice+1
    );
   }
  );
 }

 const reproducirBoton=
  elemento(
   "reproducir"
  );

 if(reproducirBoton){
  reproducirBoton.addEventListener(
   "click",
   ()=>{
    if(
     reproduciendo
    ){
     detener();
    }else{
     reproducir();
    }
   }
  );
 }

 const recargar=
  elemento(
   "recargar"
  );

 if(recargar){
  recargar.addEventListener(
   "click",
   ()=>void cargarPipeline(
    {
     preservarPosicion:false
    }
   )
  );
 }

 const slider=
  elemento(
   "timeline-slider"
  );

 if(slider){
  slider.addEventListener(
   "input",
   evento=>{
    detener();

    void mostrarFotograma(
     Number(
      evento.target.value
     )
    );
   }
  );
 }

 const opacidad=
  elemento(
   "opacidad-slider"
  );

 if(opacidad){
  opacidad.addEventListener(
   "input",
   evento=>{

    opacidadRadar=
     Number(
      evento.target.value
     )/100;

    texto(
     "opacidad-valor",
     `${evento.target.value} %`
    );

    Object.values(
     capasRadarActuales
    ).forEach(
     entrada=>{

      if(
       entrada?.capa
      ){
       entrada.capa.setOpacity(
        opacidadRadar
       );
      }
     }
    );
   }
  );
 }

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

 const selectorRayos=
  elemento(
   "capa-rayos"
  );

 if(selectorRayos){
  selectorRayos.addEventListener(
   "click",
   alternarRayos
  );
 }

 Object.entries(
  FONDOS
 ).forEach(
  ([
   nombre,
   configuracion
  ])=>{

   const boton=
    elemento(
     configuracion.id
    );

   if(!boton){
    return;
   }

   boton.addEventListener(
    "click",
    ()=>cambiarFondo(
     nombre
    )
   );
  }
 );
}


/* =========================================================
   VISIBILIDAD DE PÁGINA
   ========================================================= */

document.addEventListener(
 "visibilitychange",
 ()=>{
  if(
   document.visibilityState!=="visible"
  ){
   return;
  }

  /*
   * Si el navegador ha permanecido suspendido durante bastante
   * tiempo, actualizamos el pipeline al volver a primer plano.
   */
  const generado=
   marcaTemporal(
    pipeline?.generado_en
   );

  if(
   generado===null
  ){
   return;
  }

  if(
   Date.now()-
   generado>
   360000
  ){
   void cargarPipeline(
    {
     preservarPosicion:true,
     automatica:true
    }
   );
  }
 }
);


/* =========================================================
   INICIO
   ========================================================= */

function iniciar(){
 crearMapa();

 if(!mapa){
  return;
 }

 actualizarSelectorFondos();

 actualizarSelectorRadar();

 actualizarSelectorRayos();

 instalarEventos();

 requestAnimationFrame(
  ()=>
   requestAnimationFrame(
    ()=>{
     reajustarMapa();

     void cargarLocalidades();

     void cargarPipeline(
      {
       preservarPosicion:false
      }
     );
    }
   )
 );
}

window.addEventListener(
 "beforeunload",
 ()=>{
  detener();

  detenerActualizacionProgramada();

  ++secuenciaVisualizacion;
  ++secuenciaPrecarga;
 }
);

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