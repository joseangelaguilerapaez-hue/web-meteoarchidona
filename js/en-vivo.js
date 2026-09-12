"use strict";

/*
 * MeteoArchidona
 * En vivo
 *
 * Lógica exclusiva de:
 *
 *     en-vivo.html
 *
 * Responsabilidades:
 *
 * - guardar el catálogo de zonas y cámaras;
 * - montar el selector de zona;
 * - dibujar la zona elegida y sus cámaras.
 *
 * Salió de un <script> al final de esa página. Ahora se carga con
 * defer desde la cabecera, que se ejecuta igual: después de que el
 * documento esté leído y antes de DOMContentLoaded.
 */

/* =========================================================
   CATÁLOGO DE ZONAS Y CÁMARAS
   ========================================================= */

const zonas={

    propias:{

        nombre:"Cámaras propias / 360º",

        descripcion:
            "Red propia de MeteoArchidona. De momento mostramos " +
            "las ubicaciones previstas con imágenes provisionales; " +
            "el streaming 360º se incorporará cuando las cámaras " +
            "queden instaladas y conectadas.",

        nota:
            "<strong>Red MeteoArchidona.</strong> " +
            "Estas cámaras serán gestionadas directamente por el proyecto.",

        camaras:[

            {
                nombre:"El Silo",

                ubicacion:
                    "Archidona · cámara propia",

                tipo:
                    "PROPIA · 360º",

                estado:
                    "PRÓXIMAMENTE",

                estadoClase:
                    "proximamente",

                descripcion:
                    "Ubicación principal de MeteoArchidona en Archidona. " +
                    "La futura cámara panorámica ofrecerá una vista amplia " +
                    "del cielo y del entorno para seguimiento visual del tiempo.",

                medio:
                    "imagen-local",

                src:
                    "../assets/camaras/el-silo-provisional.jpg",

                alt:
                    "Vista provisional de la futura cámara de El Silo",

                fuenteNombre:
                    "MeteoArchidona",

                fuenteUrl:
                    null
            },

            {
                nombre:"Los Llanos",

                ubicacion:
                    "Villanueva del Trabuco · cámara propia",

                tipo:
                    "PROPIA · 360º",

                estado:
                    "PRÓXIMAMENTE",

                estadoClase:
                    "proximamente",

                descripcion:
                    "Segunda ubicación prevista de la red propia. " +
                    "Complementará la observación visual desde Archidona " +
                    "con una panorámica del entorno de Los Llanos.",

                medio:
                    "imagen-local",

                src:
                    "../assets/camaras/los-llanos-provisional.jpg",

                alt:
                    "Vista provisional de la futura cámara de Los Llanos",

                fuenteNombre:
                    "MeteoArchidona",

                fuenteUrl:
                    null
            }

        ]

    },


    "sierra-nevada":{

        nombre:
            "Sierra Nevada",

        descripcion:
            "Cámaras y vistas de diferentes cotas de Sierra Nevada: " +
            "Pradollano, áreas familiares, pistas, zonas altas y puntos " +
            "especialmente útiles para seguir las primeras nevadas y " +
            "el estado de la estación.",

        nota:
            "<strong>Fuentes externas.</strong> " +
            "Los vídeos se reproducen desde el reproductor oficial de Feratel " +
            "y las imágenes se solicitan directamente a sus proveedores. " +
            "MeteoArchidona no reemite ni almacena estos vídeos.",

        camaras:[

            {
                nombre:
                    "Zona Borreguiles",

                ubicacion:
                    "Sierra Nevada · 2.690 m",

                tipo:
                    "STREAMING",

                estado:
                    "VÍDEO EN DIRECTO",

                estadoClase:
                    "",

                descripcion:
                    "Panorámica en directo de Borreguiles con barrido sobre " +
                    "pistas, remontes y el entorno de alta montaña.",

                medio:
                    "iframe",

                src:
                    "https://webtv.feratel.com/webtv/?c1=0&cam=15111&design=v5",

                fuenteNombre:
                    "Sierra Nevada / Feratel",

                fuenteUrl:
                    "https://webtv.feratel.com/webtv/?c1=0&cam=15111&design=v5"
            },


            {
                nombre:
                    "Mirlo Blanco / Pradollano",

                ubicacion:
                    "Sierra Nevada · 2.150 m",

                tipo:
                    "STREAMING",

                estado:
                    "VÍDEO EN DIRECTO",

                estadoClase:
                    "",

                descripcion:
                    "Vista en directo del área de Mirlo Blanco. " +
                    "El barrido permite observar la zona familiar, " +
                    "actividades, trineos y diferentes vistas hacia El Río.",

                medio:
                    "iframe",

                src:
                    "https://webtv.feratel.com/webtv/?c1=0&cam=15114&design=v5",

                fuenteNombre:
                    "Sierra Nevada / Feratel",

                fuenteUrl:
                    "https://webtv.feratel.com/webtv/?c1=0&cam=15114&design=v5"
            },


            {
                nombre:
                    "Zona Veleta",

                ubicacion:
                    "Sierra Nevada · ≈ 3.000 m",

                tipo:
                    "STREAMING",

                estado:
                    "STREAMING FERATEL",

                estadoClase:
                    "",

                descripcion:
                    "Una de las vistas más útiles para controlar las primeras " +
                    "nevadas, la visibilidad, el viento y el estado de las cotas " +
                    "altas. Fuera de temporada puede aparecer sin emisión.",

                medio:
                    "iframe",

                src:
                    "https://webtv.feratel.com/webtv/?c1=0&cam=15112&design=v5",

                fuenteNombre:
                    "Sierra Nevada / Feratel",

                fuenteUrl:
                    "https://webtv.feratel.com/webtv/?c1=0&cam=15112&design=v5"
            },


            {
                nombre:
                    "Zona Laguna",

                ubicacion:
                    "Sierra Nevada · 2.603 m",

                tipo:
                    "STREAMING",

                estado:
                    "STREAMING FERATEL",

                estadoClase:
                    "",

                descripcion:
                    "Vista de la zona de La Laguna, muy útil para comprobar " +
                    "nieve, visibilidad y condiciones de una de las áreas altas " +
                    "de la estación. Fuera de temporada puede quedar sin emisión.",

                medio:
                    "iframe",

                src:
                    "https://webtv.feratel.com/webtv/?c1=0&cam=15110&design=v5",

                fuenteNombre:
                    "Sierra Nevada / Feratel",

                fuenteUrl:
                    "https://webtv.feratel.com/webtv/?c1=0&cam=15110&design=v5"
            },


            {
                nombre:
                    "Zona Montebajo",

                ubicacion:
                    "Sierra Nevada · 2.371 m",

                tipo:
                    "STREAMING",

                estado:
                    "STREAMING FERATEL",

                estadoClase:
                    "",

                descripcion:
                    "Panorámica de Montebajo para seguir el estado de la nieve, " +
                    "la nubosidad y la visibilidad en una cota intermedia. " +
                    "Fuera de temporada puede aparecer sin emisión.",

                medio:
                    "iframe",

                src:
                    "https://webtv.feratel.com/webtv/?c1=0&cam=15113&design=v5",

                fuenteNombre:
                    "Sierra Nevada / Feratel",

                fuenteUrl:
                    "https://webtv.feratel.com/webtv/?c1=0&cam=15113&design=v5"
            },


            {
                nombre:
                    "Pradollano",

                ubicacion:
                    "Sierra Nevada · zona baja · ≈ 2.100 m",

                tipo:
                    "IMAGEN",

                estado:
                    "IMAGEN ACTUALIZADA",

                estadoClase:
                    "imagen",

                descripcion:
                    "Vista especialmente útil para comprobar si la nieve llega " +
                    "hasta Pradollano y conocer visualmente el estado de la zona " +
                    "baja antes de subir a la estación.",

                medio:
                    "imagen-remota",

                src:
                    "https://recursos.sierranevada.es/_extras/fotos_camaras/pradollano/snap_c1.jpg",

                alt:
                    "Webcam de Pradollano en Sierra Nevada",

                fuenteNombre:
                    "Sierra Nevada / Cetursa",

                fuenteUrl:
                    "https://recursos.sierranevada.es/_extras/fotos_camaras/pradollano/snap_c1.jpg"
            },


            {
                nombre:
                    "El Río - Las Negras",

                ubicacion:
                    "Sierra Nevada · El Río / Las Negras",

                tipo:
                    "IMAGEN",

                estado:
                    "IMAGEN ACTUALIZADA",

                estadoClase:
                    "imagen",

                descripcion:
                    "Vista específica de la zona de El Río y Las Negras, " +
                    "muy interesante para comprobar la innivación y el estado " +
                    "visual de esta conexión entre pistas.",

                medio:
                    "imagen-remota",

                src:
                    "https://sierranevadaeee.es/sierranevadaeee.com/camaramelia/snap_c1.jpg",

                alt:
                    "Webcam de El Río y Las Negras en Sierra Nevada",

                fuenteNombre:
                    "Escuela Española de Esquí de Sierra Nevada",

                fuenteUrl:
                    "https://sierranevadaeee.es/sierranevadaeee.com/camaramelia/snap_c1.jpg"
            }

        ]

    }

};


/* =========================================================
   ELEMENTOS
   ========================================================= */

const selectorZona=
    document.getElementById("selector-zona");

const tituloZona=
    document.getElementById("titulo-zona");

const descripcionZona=
    document.getElementById("descripcion-zona");

const contadorZona=
    document.getElementById("contador-zona");

const rejillaCamaras=
    document.getElementById("rejilla-camaras");

const notaProveedor=
    document.getElementById("nota-proveedor");

let temporizadorImagenes=null;


/* =========================================================
   UTILIDADES
   ========================================================= */

function escaparHtml(valor){

    return String(valor)
        .replaceAll("&","&amp;")
        .replaceAll("<","&lt;")
        .replaceAll(">","&gt;")
        .replaceAll('"',"&quot;")
        .replaceAll("'","&#039;");

}


function urlConMarcaTiempo(url){

    const separador=
        url.includes("?")
            ? "&"
            : "?";

    return url+
        separador+
        "t="+
        Date.now();

}


/* =========================================================
   FUENTE
   ========================================================= */

function construirFuente(camara){

    const nombre=
        escaparHtml(
            camara.fuenteNombre
        );

    if(!camara.fuenteUrl){

        return `
            <span class="fuente">
                <strong>Fuente:</strong>
                ${nombre}
            </span>
        `;

    }

    return `
        <span class="fuente">

            <strong>Fuente:</strong>

            <a
                href="${escaparHtml(camara.fuenteUrl)}"
                target="_blank"
                rel="noopener noreferrer"
            >
                ${nombre}
            </a>

        </span>
    `;

}


/* =========================================================
   MEDIO
   ========================================================= */

function construirMedio(camara,indice){

    const claseEstado=
        camara.estadoClase
            ? " "+camara.estadoClase
            : "";

    const estado=`
        <div class="estado-visor${claseEstado}">
            ${escaparHtml(camara.estado)}
        </div>
    `;


    if(camara.medio==="iframe"){

        return `
            <div class="visor-camara">

                ${estado}

                <iframe
                    src="${escaparHtml(camara.src)}"
                    title="${escaparHtml(camara.nombre)}"
                    loading="lazy"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowfullscreen
                ></iframe>

            </div>
        `;

    }


    const esRemota=
        camara.medio==="imagen-remota";


    const src=
        esRemota
            ? urlConMarcaTiempo(camara.src)
            : camara.src;


    return `
        <div class="visor-camara">

            ${estado}

            <div
                class="media-error"
                id="error-imagen-${indice}"
            >
                <div>

                    <strong>
                        Imagen no disponible
                    </strong>

                    El proveedor no está entregando
                    una captura en este momento.

                </div>
            </div>

            <img
                src="${escaparHtml(src)}"
                alt="${escaparHtml(camara.alt || camara.nombre)}"
                loading="lazy"
                ${esRemota
                    ? `data-remota="1" data-base-src="${escaparHtml(camara.src)}"`
                    : ""
                }
            >

        </div>
    `;

}


/* =========================================================
   TARJETA
   ========================================================= */

function construirTarjeta(camara,indice){

    return `
        <article class="tarjeta-camara">

            ${construirMedio(camara,indice)}

            <div class="cuerpo-camara">

                <div class="fila-titulo">

                    <div class="titulo-camara">

                        <h3>
                            ${escaparHtml(camara.nombre)}
                        </h3>

                        <div class="ubicacion-camara">
                            ${escaparHtml(camara.ubicacion)}
                        </div>

                    </div>

                    <div class="tipo-camara">
                        ${escaparHtml(camara.tipo)}
                    </div>

                </div>

                <p class="descripcion-camara">
                    ${escaparHtml(camara.descripcion)}
                </p>

                <div class="pie-camara">
                    ${construirFuente(camara)}
                </div>

            </div>

        </article>
    `;

}


/* =========================================================
   GESTIÓN DE ERRORES DE IMÁGENES
   ========================================================= */

function prepararImagenes(){

    const imagenes=
        rejillaCamaras.querySelectorAll(
            ".visor-camara img"
        );


    imagenes.forEach(
        (imagen,indice)=>{

            const error=
                document.getElementById(
                    "error-imagen-"+indice
                );


            imagen.addEventListener(
                "load",
                ()=>{

                    if(error){
                        error.classList.remove(
                            "visible"
                        );
                    }

                }
            );


            imagen.addEventListener(
                "error",
                ()=>{

                    if(error){
                        error.classList.add(
                            "visible"
                        );
                    }

                }
            );

        }
    );

}


/* =========================================================
   REFRESCO DE WEBCAMS JPEG
   ========================================================= */

function refrescarImagenesRemotas(){

    const imagenes=
        document.querySelectorAll(
            "img[data-remota='1']"
        );


    imagenes.forEach(
        imagen=>{

            const baseSrc=
                imagen.dataset.baseSrc;

            imagen.src=
                urlConMarcaTiempo(
                    baseSrc
                );

        }
    );

}


function iniciarRefrescoImagenes(){

    if(temporizadorImagenes){

        clearInterval(
            temporizadorImagenes
        );

    }


    temporizadorImagenes=
        setInterval(
            refrescarImagenesRemotas,
            60*1000
        );

}


/* =========================================================
   URL
   ========================================================= */

function actualizarUrl(claveZona){

    try{

        const url=
            new URL(
                window.location.href
            );

        url.searchParams.set(
            "zona",
            claveZona
        );

        window.history.replaceState(
            {},
            "",
            url
        );

    }catch(error){

        console.debug(
            "No se pudo actualizar la URL de la zona.",
            error
        );

    }

}


/* =========================================================
   RENDERIZADO
   ========================================================= */

function renderizarZona(
    claveZona,
    actualizarDireccion=true
){

    const claveValida=
        zonas[claveZona]
            ? claveZona
            : "propias";


    const zona=
        zonas[claveValida];


    selectorZona.value=
        claveValida;


    tituloZona.textContent=
        zona.nombre;


    descripcionZona.textContent=
        zona.descripcion;


    contadorZona.textContent=
        zona.camaras.length+
        (
            zona.camaras.length===1
                ? " CÁMARA"
                : " CÁMARAS"
        );


    rejillaCamaras.innerHTML=
        zona.camaras
            .map(
                (camara,indice)=>
                    construirTarjeta(
                        camara,
                        indice
                    )
            )
            .join("");


    notaProveedor.innerHTML=
        zona.nota;


    prepararImagenes();

    iniciarRefrescoImagenes();


    if(actualizarDireccion){

        actualizarUrl(
            claveValida
        );

    }

}


/* =========================================================
   SELECTOR
   ========================================================= */

function cargarSelector(){

    selectorZona.innerHTML=
        Object.entries(zonas)
            .map(
                ([clave,zona])=>`
                    <option value="${escaparHtml(clave)}">
                        ${escaparHtml(zona.nombre)}
                    </option>
                `
            )
            .join("");

}


/* =========================================================
   ZONA INICIAL
   ========================================================= */

function obtenerZonaInicial(){

    try{

        const parametros=
            new URLSearchParams(
                window.location.search
            );


        const zonaSolicitada=
            parametros.get(
                "zona"
            );


        if(
            zonaSolicitada &&
            zonas[zonaSolicitada]
        ){

            return zonaSolicitada;

        }

    }catch(error){

        console.debug(
            "No se pudo leer la zona de la URL.",
            error
        );

    }


    return "propias";

}


/* =========================================================
   EVENTOS
   ========================================================= */

selectorZona.addEventListener(
    "change",
    ()=>{

        renderizarZona(
            selectorZona.value
        );

    }
);


/* =========================================================
   INICIO
   ========================================================= */

cargarSelector();

renderizarZona(
    obtenerZonaInicial(),
    false
);



// Fin de fichero: js/en-vivo.js
