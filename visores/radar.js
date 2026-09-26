/* API_BASE lo decide ../js/api.js, que se carga antes que este fichero. */

const API_BASE=window.API_BASE;

const FONDOS={
 satelite:{id:"fondo-satelite",tipo:"cartografico"},
 politico:{id:"fondo-politico",tipo:"cartografico"},
 fisico:{id:"fondo-fisico",tipo:"cartografico"},
 negro:{id:"fondo-negro",tipo:"cartografico"},
 true_colour:{id:"fondo-true-colour",tipo:"meteorologico"},
 infrarrojo:{id:"fondo-infrarrojo",tipo:"meteorologico"},
 masas_aire:{id:"fondo-masas-aire",tipo:"meteorologico"}
};

const NOMBRES_FONDOS={
 satelite:"Satélite HD",
 politico:"Político",
 fisico:"Físico",
 negro:"Negro",
 true_colour:"Canal visible",
 infrarrojo:"Infrarrojo",
 masas_aire:"Masas de aire"
};

const PRODUCTOS_SATELITE=[
 "true_colour",
 "infrarrojo",
 "masas_aire"
];

const AMBITOS=[
 "regional",
 "nacional"
];

const LIMITES_REGIONALES={
 oeste:-8.5,
 sur:35.0,
 este:0.5,
 norte:40.5
};

const LIMITES_NACIONALES={
 oeste:-10.5,
 sur:34.5,
 este:5.0,
 norte:44.5
};

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
const ZOOM_MINIMO_BASE=5;
const ZOOM_MINIMO_METEOROLOGICO_ABSOLUTO=4;

const ATRIBUCION_LIMITES=
 'Límites administrativos: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · Costa y fronteras: referencia simplificada MeteoArchidona';

const FORMATO_HORA_MADRID=
 new Intl.DateTimeFormat(
  "es-ES",
  {
   timeZone:"Europe/Madrid",
   hour:"2-digit",
   minute:"2-digit",
   hour12:false
  }
 );

let mapa=null;

let capaLocalidades=null;
let localidades=[];

let pipeline=null;
let recursos={};
let timelineSeguimiento=[];
let indice=0;

let ambitoActivo="regional";
let ambitoPendiente=null;
let temporizadorEvaluacionAmbito=null;

let pipelinesPorAmbito={
 regional:null,
 nacional:null
};

let promesasPipeline={
 regional:null,
 nacional:null
};

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

let leyendaSeguimiento=null;
let temporizadorLeyenda=null;


/* =========================================================
   UTILIDADES
   ========================================================= */

function elemento(id){
 return document.getElementById(
  id
 );
}

function texto(
 id,
 valor
){
 const nodo=
  elemento(
   id
  );

 if(nodo){
  nodo.textContent=
   valor;
 }
}

function esperar(ms){
 return new Promise(
  resolve=>
   setTimeout(
    resolve,
    ms
   )
 );
}

function fechaValida(
 valor
){
 const fechaObjeto=
  new Date(
   valor
  );

 return Number.isNaN(
  fechaObjeto.getTime()
 )
  ?null
  :fechaObjeto;
}

function marcaTemporal(
 valor
){
 const marca=
  Date.parse(
   valor
  );

 return Number.isFinite(
  marca
 )
  ?marca
  :null;
}

function hora(
 valor
){
 const fechaObjeto=
  fechaValida(
   valor
  );

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

function fecha(
 valor
){
 const fechaObjeto=
  fechaValida(
   valor
  );

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

function horaMadridActual(){
 return FORMATO_HORA_MADRID.format(
  new Date()
 );
}

function urlAbsoluta(
 url
){
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
  elemento(
   "estado"
  );

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
  elemento(
   "mensaje"
  );

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

function obtenerRecurso(
 clave
){
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

function bounds(
 recurso
){
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

function quitarCapa(
 capa
){
 if(
  capa&&
  mapa&&
  mapa.hasLayer(
   capa
  )
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
 if(
  !limitesActivos
 ){
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
  * Tampoco sobre Satélite HD ni Físico.
  *
  * La capa propia se reserva para:
  *
  * - fondo negro;
  * - Canal visible;
  * - infrarrojo;
  * - masas de aire.
  */
 return(
  fondoActivo==="negro"||
  esFondoMeteorologico(
   fondoActivo
  )
 );
}

function nombreAmbito(
 ambito
){
 return ambito==="nacional"
  ?"nacional"
  :"regional";
}

function nombreFondo(
 nombre
){
 return NOMBRES_FONDOS[
  nombre
 ]||nombre;
}


/* =========================================================
   LEYENDA DE SEGUIMIENTO

   La hora mostrada aquí NO depende de la zona horaria del
   dispositivo.

   Siempre se calcula expresamente en:

       Europe/Madrid

   Por tanto gestiona automáticamente CET / CEST y los cambios
   legales de horario de verano.

   La hora amarilla de la cabecera continúa representando el
   instante meteorológico seleccionado en la timeline.
   ========================================================= */

function crearLeyendaSeguimiento(){
 if(
  !mapa||
  leyendaSeguimiento
 ){
  return;
 }

 const contenedor=
  mapa.getContainer();

 const leyenda=
  document.createElement(
   "div"
  );

 leyenda.className=
  "leyenda-seguimiento";

 leyenda.setAttribute(
  "aria-label",
  "Leyenda de Seguimiento"
 );

 contenedor.appendChild(
  leyenda
 );

 leyendaSeguimiento=
  leyenda;

 actualizarLeyendaSeguimiento();
}

function actualizarLeyendaSeguimiento(){
 if(
  !leyendaSeguimiento
 ){
  return;
 }

 const estadoRadar=
  radarActivo
   ?"activa"
   :"oculta";

 const estadoRayos=
  rayosActivo
   ?"activos"
   :"ocultos";

 leyendaSeguimiento.replaceChildren();

 const horaNodo=
  document.createElement(
   "div"
  );

 horaNodo.className=
  "leyenda-seguimiento-hora";

 horaNodo.textContent=
  `Madrid · ${horaMadridActual()}`;

 const fondoNodo=
  document.createElement(
   "div"
  );

 fondoNodo.className=
  "leyenda-seguimiento-linea";

 const fondoEtiqueta=
  document.createElement(
   "strong"
  );

 fondoEtiqueta.textContent=
  "Base: ";

 fondoNodo.appendChild(
  fondoEtiqueta
 );

 fondoNodo.appendChild(
  document.createTextNode(
   nombreFondo(
    fondoActivo
   )
  )
 );

 const capasNodo=
  document.createElement(
   "div"
  );

 capasNodo.className=
  "leyenda-seguimiento-linea";

 const lluviaEtiqueta=
  document.createElement(
   "strong"
  );

 lluviaEtiqueta.textContent=
  "Lluvia: ";

 capasNodo.appendChild(
  lluviaEtiqueta
 );

 capasNodo.appendChild(
  document.createTextNode(
   `${estadoRadar} · `
  )
 );

 const rayosEtiqueta=
  document.createElement(
   "strong"
  );

 rayosEtiqueta.textContent=
  "Rayos: ";

 capasNodo.appendChild(
  rayosEtiqueta
 );

 capasNodo.appendChild(
  document.createTextNode(
   estadoRayos
  )
 );

 leyendaSeguimiento.appendChild(
  horaNodo
 );

 leyendaSeguimiento.appendChild(
  fondoNodo
 );

 leyendaSeguimiento.appendChild(
  capasNodo
 );
}

function iniciarRelojLeyenda(){
 if(
  temporizadorLeyenda
 ){
  clearInterval(
   temporizadorLeyenda
  );
 }

 actualizarLeyendaSeguimiento();

 temporizadorLeyenda=
  setInterval(
   actualizarLeyendaSeguimiento,
   30000
  );
}

function detenerRelojLeyenda(){
 if(
  temporizadorLeyenda
 ){
  clearInterval(
   temporizadorLeyenda
  );

  temporizadorLeyenda=
   null;
 }
}


/* =========================================================
   ÁMBITO REGIONAL / NACIONAL

   La vista decide el ámbito.

   Mientras todo el viewport cabe dentro del BBOX regional:

       oeste = -8.5
       este  =  0.5
       sur   = 35.0
       norte = 40.5

   se utiliza:

       /seguimiento/pipeline?ambito=regional

   Cuando el viewport desborda ese rectángulo se utiliza:

       /seguimiento/pipeline?ambito=nacional

   El cambio conserva el instante temporal más próximo.

   Los dos pipelines pueden mantenerse en caché simultáneamente.
   ========================================================= */

function determinarAmbitoVista(){
 if(!mapa){
  return"regional";
 }

 const vista=
  mapa.getBounds();

 const cabeRegional=
  vista.getWest()>=
   LIMITES_REGIONALES.oeste&&
  vista.getEast()<=
   LIMITES_REGIONALES.este&&
  vista.getSouth()>=
   LIMITES_REGIONALES.sur&&
  vista.getNorth()<=
   LIMITES_REGIONALES.norte;

 return cabeRegional
  ?"regional"
  :"nacional";
}

function pipelineReciente(
 datos,
 maximoMs=360000
){
 const generado=
  marcaTemporal(
   datos?.generado_en
  );

 if(
  generado===null
 ){
  return false;
 }

 return(
  Date.now()-
  generado<=
  maximoMs
 );
}

function programarEvaluacionAmbito(){
 if(
  temporizadorEvaluacionAmbito
 ){
  clearTimeout(
   temporizadorEvaluacionAmbito
  );
 }

 temporizadorEvaluacionAmbito=
  setTimeout(
   ()=>{
    temporizadorEvaluacionAmbito=
     null;

    void evaluarAmbitoVista();
   },
   120
  );
}

async function evaluarAmbitoVista(){
 if(!mapa){
  return;
 }

 const deseado=
  determinarAmbitoVista();

 if(
  deseado===ambitoActivo||
  deseado===ambitoPendiente
 ){
  return;
 }

 await cambiarAmbitoSeguimiento(
  deseado
 );
}

function limpiarCapasPorCambioAmbito(){
 retirarFondoMeteorologico();

 capaFondoMeteorologico=
  null;

 claveFondoMeteorologico=
  null;

 limpiarCapasRadar();

 ocultarRayos();

 capaRayosActual=
  null;

 claveRayosActual=
  null;
}

function reanudarReproduccionSiProcede(
 debeReanudar
){
 if(
  !debeReanudar||
  reproduciendo||
  timelineSeguimiento.length<2
 ){
  return;
 }

 reproducir();
}

async function cambiarAmbitoSeguimiento(
 nuevoAmbito
){
 if(
  !AMBITOS.includes(
   nuevoAmbito
  )
 ){
  return;
 }

 if(
  nuevoAmbito===
  ambitoActivo
 ){
  return;
 }

 if(
  nuevoAmbito===
  ambitoPendiente
 ){
  return;
 }

 const instanteReferencia=
  timelineSeguimiento[
   indice
  ]?.instante||null;

 const ambitoAnterior=
  ambitoActivo;

 const estabaReproduciendo=
  reproduciendo;

 /*
  * Un cambio de ámbito puede coincidir con una animación.
  *
  * Detenemos temporalmente la reproducción e invalidamos cualquier
  * carga de imagen que todavía esté pendiente del ámbito anterior.
  *
  * Cuando termine el cambio se reanudará automáticamente si el
  * usuario tenía Play activado.
  */
 detener();

 ++secuenciaVisualizacion;
 ++secuenciaPrecarga;

 ambitoPendiente=
  nuevoAmbito;

 establecerEstado(
  `Cargando ámbito ${nombreAmbito(nuevoAmbito)}`
 );

 try{
  const datos=
   await obtenerPipelineAmbito(
    nuevoAmbito,
    {
     forzar:false
    }
   );

  /*
   * El usuario puede volver a acercar o mover el mapa mientras
   * el pipeline del otro ámbito todavía está descargándose.
   *
   * En ese caso no aplicamos una respuesta que ya haya quedado
   * obsoleta respecto a la extensión actual del mapa.
   */
  if(
   determinarAmbitoVista()!==
   nuevoAmbito
  ){
   actualizarEstadoVisual(
    timelineSeguimiento[
     indice
    ]
   );

   reanudarReproduccionSiProcede(
    estabaReproduciendo
   );

   return;
  }

  /*
   * Antes de sustituir recursos y timeline retiramos físicamente
   * todos los overlays del ámbito anterior.
   *
   * Esto impide que, durante un cambio regional <-> nacional,
   * pueda quedar dibujado un raster antiguo encima del nuevo
   * pipeline.
   */
  limpiarCapasPorCambioAmbito();

  ambitoActivo=
   nuevoAmbito;

  document.body.dataset.ambito=
   ambitoActivo;

  aplicarPipeline(
   datos,
   {
    instanteReferencia,
    irAlUltimo:false
   }
  );

  renderizarLocalidades();

  actualizarLeyendaSeguimiento();

  await mostrarFotograma(
   indice
  );

  programarActualizacion();

  reanudarReproduccionSiProcede(
   estabaReproduciendo
  );

 }catch(error){
  console.error(
   `No se ha podido cambiar al ámbito ${nuevoAmbito}:`,
   error
  );

  ambitoActivo=
   ambitoAnterior;

  document.body.dataset.ambito=
   ambitoActivo;

  renderizarLocalidades();

  actualizarLeyendaSeguimiento();

  establecerEstado(
   `Ámbito ${nombreAmbito(nuevoAmbito)} no disponible`,
   "error"
  );

  mostrarMensaje(
   `No se ha podido cargar el ámbito ${nombreAmbito(nuevoAmbito)}. Se mantiene el ámbito ${nombreAmbito(ambitoAnterior)}.`,
   true
  );

  reanudarReproduccionSiProcede(
   estabaReproduciendo
  );

 }finally{
  if(
   ambitoPendiente===
   nuevoAmbito
  ){
   ambitoPendiente=
    null;
  }
 }
}


/* =========================================================
   ENCUADRE DE LOS RASTER METEOROLÓGICOS

   Para fondos meteorológicos se permite alejar el mapa hasta el
   nivel exacto necesario para que TODA la cobertura nacional pueda
   caber en el viewport.

   Esto es distinto de obligar al viewport a quedar dentro del
   raster.

   La diferencia es importante:

   - getBoundsZoom(..., false) calcula el zoom al que el raster
     completo cabe en la pantalla;

   - getBoundsZoom(..., true) calcula el zoom al que toda la
     pantalla cabe dentro del raster.

   La segunda opción era demasiado restrictiva en móvil y impedía
   ver la Península completa.

   Tampoco se utiliza maxBounds estricto.

   Un maxBounds exactamente igual al raster puede producir saltos,
   recortes y desplazamientos indeseados cuando el viewport tiene
   una proporción diferente de la imagen.

   Solo impedimos que el centro del mapa abandone completamente la
   cobertura nacional.

   De este modo conseguimos:

   - poder encuadrar toda la Península;
   - no permitir un alejamiento ilimitado;
   - evitar grandes márgenes negros;
   - mantener estable el cambio regional / nacional.
   ========================================================= */

function limitesNacionalesLeaflet(){
 if(
  typeof L==="undefined"
 ){
  return null;
 }

 return L.latLngBounds(
  [
   [
    LIMITES_NACIONALES.sur,
    LIMITES_NACIONALES.oeste
   ],
   [
    LIMITES_NACIONALES.norte,
    LIMITES_NACIONALES.este
   ]
  ]
 );
}

function actualizarRestriccionesMeteorologicas(){
 if(!mapa){
  return;
 }

 /*
  * Los fondos cartográficos pueden navegar libremente con el
  * mínimo general del visor.
  *
  * NEGRO tampoco tiene un raster propio que pueda quedar fuera
  * del encuadre.
  */
 if(
  !esFondoMeteorologico(
   fondoActivo
  )
 ){
  mapa.setMinZoom(
   ZOOM_MINIMO_BASE
  );

  mapa.setMaxBounds(
   null
  );

  return;
 }

 const limites=
  limitesNacionalesLeaflet();

 if(!limites){
  return;
 }

 /*
  * false = encajar el BBOX completo dentro del viewport.
  *
  * Este es el cálculo que permite visualizar completa la cobertura
  * nacional.
  */
 let zoomMinimo=
  mapa.getBoundsZoom(
   limites,
   false
  );

 if(
  !Number.isFinite(
   zoomMinimo
  )
 ){
  zoomMinimo=
   ZOOM_MINIMO_BASE;
 }

 zoomMinimo=
  Math.max(
   ZOOM_MINIMO_METEOROLOGICO_ABSOLUTO,
   zoomMinimo
  );

 mapa.setMaxBounds(
  null
 );

 mapa.setMinZoom(
  zoomMinimo
 );

 if(
  mapa.getZoom()<
  zoomMinimo
 ){
  mapa.setZoom(
   zoomMinimo,
   {
    animate:false
   }
  );
 }

 /*
  * No bloqueamos el viewport dentro del BBOX.
  *
  * Solo corregimos una situación extrema en la que el centro del
  * mapa haya quedado fuera de la cobertura meteorológica.
  */
 if(
  !limites.contains(
   mapa.getCenter()
  )
 ){
  mapa.panInsideBounds(
   limites,
   {
    animate:false
   }
  );
 }
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
   LÍMITES ADMINISTRATIVOS, COSTA Y FRONTERAS

   Solo aparecen sobre:

   - NEGRO;
   - CANAL VISIBLE;
   - INFRARROJO;
   - MASAS DE AIRE.

   Nunca sobre POLÍTICO.
   Tampoco sobre SATÉLITE HD ni FÍSICO.

   Jerarquía visual:

   1. costa:
      azul eléctrico fino;

   2. contorno de Andalucía:
      buganvilla más visible;

   3. provincias andaluzas:
      buganvilla más tenue;

   4. fronteras internacionales:
      buganvilla fino y discontinuo;

   5. provincias del entorno:
      gris muy discreto.
   ========================================================= */

function estiloLimiteAdministrativo(
 feature
){
 const propiedades=
  feature?.properties||{};

 if(
  propiedades.tipo==="costa"
 ){
  return{
   color:"#00b7ff",
   weight:1.55,
   opacity:.92,
   fill:false,
   interactive:false
  };
 }

 if(
  propiedades.tipo===
  "frontera_internacional"
 ){
  return{
   color:"#c04b78",
   weight:1.05,
   opacity:.86,
   dashArray:"6 5",
   lineCap:"round",
   fill:false,
   interactive:false
  };
 }

 if(
  propiedades.tipo==="comunidad"
 ){
  return{
   color:"#c43f75",
   weight:2.0,
   opacity:.96,
   fill:false,
   interactive:false
  };
 }

 if(
  propiedades.grupo==="andalucia"
 ){
  return{
   color:"#d2628d",
   weight:1.15,
   opacity:.78,
   fill:false,
   interactive:false
  };
 }

 return{
  color:"#8996a3",
  weight:.85,
  opacity:.48,
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

  atribucionLimitesActiva=
   true;

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

  atribucionLimitesActiva=
   false;
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
    .addTo(
     mapa
    );
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
      .addTo(
       mapa
      );
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
 if(!mapa){
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

function cambiarFondo(
 nombre
){
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
    .addTo(
     mapa
    );
  }

 }else{
  capaFondoActual=
   null;
 }

 actualizarColorFondoMapa();

 document.body.dataset.fondo=
  nombre;

 actualizarSelectorFondos();

 actualizarRestriccionesMeteorologicas();

 actualizarLimitesAdministrativos();

 renderizarLocalidades();

 actualizarLeyendaSeguimiento();

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

   REGIONAL
   --------

   Mantiene el catálogo detallado actual y utiliza zoom_min.

   NACIONAL
   --------

   Solo aparecen los elementos que el GeoJSON marca explícitamente:

       "nacional": true

   Actualmente son las localidades de referencia seleccionadas para
   el ámbito nacional.

   No existe una lista de nombres hardcodeada en JavaScript.
   ========================================================= */

function prioridadLocalidad(
 feature
){
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

function zoomMinimoLocalidad(
 feature
){
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

function localidadDisponibleEnAmbito(
 feature
){
 if(
  ambitoActivo!=="nacional"
 ){
  return true;
 }

 return(
  feature?.properties?.nacional===
  true
 );
}

function claseEtiquetaLocalidad(
 tipo
){
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

function claseEtiquetaLocalidadCompleta(
 propiedades
){
 const claseBase=
  claseEtiquetaLocalidad(
   propiedades.tipo
  );

 if(
  ambitoActivo==="nacional"
 ){
  return`${claseBase} etiqueta-nacional`;
 }

 return claseBase;
}

function estiloPuntoLocalidad(
 propiedades
){
 const fondoOscuro=
  esFondoOscuro();

 const nacional=
  ambitoActivo==="nacional";

 if(
  propiedades.tipo==="capital"
 ){
  return{
   radius:
    nacional
     ?3.2
     :4.5,
   color:"#fff",
   weight:
    nacional
     ?1.1
     :1.5,
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
   radius:
    nacional
     ?3
     :4,
   color:"#fff",
   weight:
    nacional
     ?1
     :1.4,
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
  radius:
   nacional
    ?2.8
    :3,
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

  if(
   !elementoTooltip
  ){
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
 if(
  ambitoActivo==="nacional"
 ){
  return[
   0,
   -5
  ];
 }

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

 let visibles=0;

 localidades
  .filter(
   feature=>
    localidadDisponibleEnAmbito(
     feature
    )&&
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
    prioridadLocalidad(
     b
    )-
    prioridadLocalidad(
     a
    )
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
      geometria.coordinates[
       0
      ]
     );

    const latitud=
     Number(
      geometria.coordinates[
       1
      ]
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
       claseEtiquetaLocalidadCompleta(
        propiedades
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

    visibles++;
   }
  );

 texto(
  "dato-localidades",
  visibles
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
    minZoom:
     ZOOM_MINIMO_METEOROLOGICO_ABSOLUTO,
    maxZoom:19,
    zoomControl:true
   }
  );

 crearPanelesMapa();

 crearFondosMapa();

 capaLocalidades=
  L.layerGroup()
   .addTo(
    mapa
   );

 L.control.scale(
  {
   metric:true,
   imperial:false,
   position:"bottomright"
  }
 ).addTo(
  mapa
 );

 crearLeyendaSeguimiento();

 iniciarRelojLeyenda();

 mapa.on(
  "zoomend",
  ()=>{
   renderizarLocalidades();

   actualizarRestriccionesMeteorologicas();
  }
 );

 mapa.on(
  "zoomend",
  programarEvaluacionAmbito
 );

 mapa.on(
  "moveend",
  programarEvaluacionAmbito
 );

 reajustarMapa();
}

function reajustarMapa(){
 if(!mapa){
  return;
 }

 requestAnimationFrame(
  ()=>{
   mapa.invalidateSize(
    {
     animate:false,
     pan:false
    }
   );

   actualizarRestriccionesMeteorologicas();
  }
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

   Las URLs de imagen permanecen estables.

   No añadimos cache-busters a las imágenes.

   Esto permite que una imagen descargada anteriormente pueda ser
   reutilizada inmediatamente por la caché del navegador.
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
    if(
     terminado
    ){
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
 opciones
){
 const{
  pane,
  opacity=1,
  secuencia
 }=opciones;

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
    .addTo(
     mapa
    );
  }

  actualizarRestriccionesMeteorologicas();

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

 actualizarRestriccionesMeteorologicas();

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

 actualizarLeyendaSeguimiento();
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
   * Evita una ráfaga simultánea de peticiones al endpoint
   * de procesamiento radar.
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

 actualizarLeyendaSeguimiento();
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
   capaRayosActual
    .addTo(
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
   ESTADO VISUAL

   El estado se calcula a partir de las capas que realmente están
   dibujadas en Leaflet.

   Esto evita conservar mensajes de error antiguos cuando, por ejemplo,
   el infrarrojo sí se ha cargado correctamente después de un fallo
   previo del radar.
   ========================================================= */

function contarCapasVisiblesMapa(){
 if(!mapa){
  return 0;
 }

 let total=0;

 if(
  esFondoMeteorologico(
   fondoActivo
  )&&
  capaFondoMeteorologico&&
  mapa.hasLayer(
   capaFondoMeteorologico
  )
 ){
  total++;
 }

 if(
  radarActivo
 ){
  Object.values(
   capasRadarActuales
  ).forEach(
   entrada=>{

    if(
     entrada?.capa&&
     mapa.hasLayer(
      entrada.capa
     )
    ){
     total++;
    }
   }
  );
 }

 if(
  rayosActivo&&
  capaRayosActual&&
  mapa.hasLayer(
   capaRayosActual
  )
 ){
  total++;
 }

 return total;
}

function contarCapasEsperadas(
 paso
){
 let total=0;

 if(
  radarActivo
 ){
  total+=
   Object.keys(
    paso?.capas?.radares||{}
   ).length;
 }

 if(
  esFondoMeteorologico(
   fondoActivo
  )
 ){
  total++;
 }

 if(
  rayosActivo
 ){
  total++;
 }

 return total;
}

function actualizarEstadoVisual(
 paso
){
 const visibles=
  contarCapasVisiblesMapa();

 const esperadas=
  contarCapasEsperadas(
   paso
  );

 texto(
  "dato-capas",
  visibles
 );

 actualizarLeyendaSeguimiento();

 if(
  esperadas===0
 ){
  mostrarMensaje("");

  establecerEstado(
   "Mapa operativo",
   "correcto"
  );

  return;
 }

 if(
  visibles>0
 ){
  mostrarMensaje("");

  establecerEstado(
   "Seguimiento operativo",
   "correcto"
  );

  return;
 }

 establecerEstado(
  "Capas no disponibles",
  "error"
 );

 mostrarMensaje(
  "No se ha podido cargar ninguna capa meteorológica activa para este instante.",
  true
 );
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

 texto(
  "dato-radares",
  obtenerCodigosRadarPipeline()
   .length
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
   ========================================================= */

function clavesActivasPaso(
 paso
){
 const claves=[];

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

 if(
  radarActivo
 ){
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
    if(
     terminado
    ){
     return;
    }

    terminado=true;

    clearTimeout(
     timer
    );

    imagen.onload=
     null;

    imagen.onerror=
     null;

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

 actualizarLeyendaSeguimiento();

 reajustarMapa();

 const secuencia=
  ++secuenciaVisualizacion;

 ++secuenciaPrecarga;

 /*
  * Cuando únicamente cambia el fondo satelital no es necesario
  * reconstruir radar y rayos.
  *
  * Aun así, una vez terminada la carga se recalcula el estado visual
  * completo para eliminar cualquier mensaje de error antiguo.
  */
 if(
  opciones.soloFondo
 ){
  await mostrarFondoMeteorologico(
   paso,
   secuencia
  );

  if(
   secuencia!==
   secuenciaVisualizacion
  ){
   return;
  }

  actualizarRestriccionesMeteorologicas();

  actualizarLimitesAdministrativos();

  renderizarLocalidades();

  actualizarEstadoVisual(
   paso
  );

  reajustarMapa();

  return;
 }

 mostrarMensaje("");

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

 actualizarRestriccionesMeteorologicas();

 actualizarLimitesAdministrativos();

 renderizarLocalidades();

 actualizarEstadoVisual(
  paso
 );

 reajustarMapa();

 const secuenciaNuevaPrecarga=
  ++secuenciaPrecarga;

 void precargarSiguientePaso(
  secuenciaNuevaPrecarga
 );
}


/* =========================================================
   PIPELINE
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

async function obtenerPipelineAmbito(
 ambito,
 opciones={}
){
 if(
  !AMBITOS.includes(
   ambito
  )
 ){
  throw new Error(
   `Ámbito no válido: ${ambito}`
  );
 }

 const forzar=
  Boolean(
   opciones.forzar
  );

 const cacheado=
  pipelinesPorAmbito[
   ambito
  ];

 /*
  * Si ya conocemos el pipeline y todavía es reciente,
  * podemos reutilizarlo inmediatamente.
  */
 if(
  !forzar&&
  cacheado&&
  pipelineReciente(
   cacheado
  )
 ){
  return cacheado;
 }

 /*
  * Si ya existe una descarga del mismo ámbito en curso,
  * todos los consumidores reutilizan la misma promesa.
  */
 if(
  promesasPipeline[
   ambito
  ]
 ){
  return promesasPipeline[
   ambito
  ];
 }

 promesasPipeline[
  ambito
 ]=
  (async()=>{

   const url=
    `${API_BASE}/seguimiento/pipeline`+
    `?ambito=${encodeURIComponent(ambito)}`+
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

   pipelinesPorAmbito[
    ambito
   ]=
    datos;

   return datos;

  })();

 try{
  return await promesasPipeline[
   ambito
  ];

 }finally{
  promesasPipeline[
   ambito
  ]=
   null;
 }
}

function aplicarPipeline(
 datos,
 opciones={}
){
 const instanteReferencia=
  opciones.instanteReferencia||
  null;

 const irAlUltimo=
  Boolean(
   opciones.irAlUltimo
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
  !irAlUltimo&&
  instanteReferencia
 ){
  indice=
   buscarIndiceMasCercano(
    instanteReferencia
   );

 }else{
  indice=
   timelineSeguimiento.length-1;
 }

 actualizarDatosGenerales();

 actualizarLeyendaSeguimiento();
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
    void cargarPipelineActivo(
     {
      preservarPosicion:true,
      automatica:true,
      forzar:true
     }
    );
   },
   intervalo
  );
}

async function cargarPipelineActivo(
 opciones={}
){
 const preservarPosicion=
  Boolean(
   opciones.preservarPosicion
  );

 const forzar=
  Boolean(
   opciones.forzar
  );

 const instanteAnterior=
  timelineSeguimiento[
   indice
  ]?.instante||null;

 const estabaEnUltimo=
  Boolean(
   timelineSeguimiento.length&&
   indice===
   timelineSeguimiento.length-1
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
  const datos=
   await obtenerPipelineAmbito(
    ambitoActivo,
    {
     forzar
    }
   );

  aplicarPipeline(
   datos,
   {
    instanteReferencia:
     preservarPosicion&&
     !estabaEnUltimo
      ?instanteAnterior
      :null,

    irAlUltimo:
     !preservarPosicion||
     estabaEnUltimo
   }
  );

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
     void cargarPipelineActivo(
      {
       preservarPosicion:true,
       automatica:true,
       forzar:true
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

 if(boton){
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

 actualizarLeyendaSeguimiento();

 if(
  !radarActivo
 ){
  ++secuenciaVisualizacion;

  detener();

  ocultarCapasRadar();
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

 actualizarLeyendaSeguimiento();

 if(
  !rayosActivo
 ){
  ++secuenciaVisualizacion;

  detener();

  ocultarRayos();
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

 if(
  reproducirBoton
 ){
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
   ()=>
    void cargarPipelineActivo(
     {
      preservarPosicion:false,
      forzar:true
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

 if(
  selectorRadar
 ){
  selectorRadar.addEventListener(
   "click",
   alternarRadar
  );
 }

 const selectorRayos=
  elemento(
   "capa-rayos"
  );

 if(
  selectorRayos
 ){
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
    ()=>
     cambiarFondo(
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

  actualizarLeyendaSeguimiento();

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
   void cargarPipelineActivo(
    {
     preservarPosicion:true,
     automatica:true,
     forzar:true
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

 ambitoActivo=
  determinarAmbitoVista();

 document.body.dataset.ambito=
  ambitoActivo;

 actualizarSelectorFondos();

 actualizarSelectorRadar();

 actualizarSelectorRayos();

 actualizarRestriccionesMeteorologicas();

 actualizarLeyendaSeguimiento();

 instalarEventos();

 requestAnimationFrame(
  ()=>
   requestAnimationFrame(
    ()=>{
     reajustarMapa();

     void cargarLocalidades();

     void cargarPipelineActivo(
      {
       preservarPosicion:false,
       forzar:false
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

  detenerRelojLeyenda();

  if(
   temporizadorEvaluacionAmbito
  ){
   clearTimeout(
    temporizadorEvaluacionAmbito
   );

   temporizadorEvaluacionAmbito=
    null;
  }

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