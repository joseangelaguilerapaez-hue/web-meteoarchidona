"use strict";

/*
 * MeteoArchidona
 * En vivo
 *
 * Lógica exclusiva de:
 *
 *     pages/en-vivo.html
 *
 * Responsabilidades:
 *
 * - guardar el catálogo de zonas y cámaras;
 * - montar el selector de zona;
 * - dibujar la zona elegida y sus cámaras;
 * - reproducir las cámaras MeteoCam mediante HLS;
 * - superponer la marca MeteoArchidona en las cámaras propias;
 * - anclar la marca y el estado al rectángulo real del vídeo;
 * - gestionar imágenes remotas;
 * - liberar reproductores HLS al cambiar de zona.
 */


/* =========================================================
   CATÁLOGO DE ZONAS Y CÁMARAS
   ========================================================= */

const zonas={

    "los-llanos":{

        nombre:
            "Los Llanos",

        descripcion:
            "Cámaras propias de MeteoArchidona instaladas en Los Llanos, " +
            "Villanueva del Trabuco. Las dos vistas permiten observar " +
            "el cielo y el entorno en directo desde perspectivas " +
            "complementarias.",

        nota:
            "<strong>Red MeteoArchidona.</strong> " +
            "Estas emisiones proceden directamente de las cámaras " +
            "de MeteoArchidona y se distribuyen mediante la " +
            "infraestructura propia del proyecto.",

        camaras:[

            {
                nombre:
                    "MeteoCam Los Llanos — Panorámica",

                ubicacion:
                    "Los Llanos · Villanueva del Trabuco",

                tipo:
                    "METEOCAM · PANORÁMICA",

                estado:
                    "CONECTANDO",

                estadoClase:
                    "",

                descripcion:
                    "Vista panorámica de Los Llanos para observar de forma " +
                    "continua el estado general del cielo, la nubosidad, " +
                    "la visibilidad y la evolución del tiempo en el entorno.",

                medio:
                    "hls",

                src:
                    "/live/los-llanos/panoramica/index.m3u8",

                fuenteNombre:
                    "MeteoArchidona",

                fuenteUrl:
                    null
            },


            {
                nombre:
                    "MeteoCam Los Llanos — Específica",

                ubicacion:
                    "Los Llanos · Villanueva del Trabuco",

                tipo:
                    "METEOCAM · ESPECÍFICA",

                estado:
                    "CONECTANDO",

                estadoClase:
                    "",

                descripcion:
                    "Vista específica de Los Llanos orientada a un sector " +
                    "concreto del entorno. Complementa la panorámica para " +
                    "seguir con mayor detalle la visibilidad, las nubes " +
                    "y los cambios meteorológicos.",

                medio:
                    "hls",

                src:
                    "/live/los-llanos/ptz/index.m3u8",

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
    document.getElementById(
        "selector-zona"
    );

const tituloZona=
    document.getElementById(
        "titulo-zona"
    );

const descripcionZona=
    document.getElementById(
        "descripcion-zona"
    );

const contadorZona=
    document.getElementById(
        "contador-zona"
    );

const rejillaCamaras=
    document.getElementById(
        "rejilla-camaras"
    );

const notaProveedor=
    document.getElementById(
        "nota-proveedor"
    );


let temporizadorImagenes=null;

let reproductoresHls=[];


/* =========================================================
   UTILIDADES
   ========================================================= */

function escaparHtml(valor){

    return String(valor)
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}


function urlConMarcaTiempo(url){

    const separador=
        url.includes("?")
            ? "&"
            : "?";

    return (
        url+
        separador+
        "t="+
        Date.now()
    );

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
   MARCA METEOARCHIDONA
   ========================================================= */

function construirMarcaMeteoCam(){

    return `
        <div
            class="marca-meteocam"
            aria-hidden="true"
        >
            <img
                src="/assets/logo-cabecera.png"
                alt=""
                draggable="false"
            >
        </div>
    `;

}


/* =========================================================
   MEDIO HLS
   ========================================================= */

function construirMedioHls(
    camara,
    indice
){

    return `
        <div class="visor-camara visor-camara-hls">

            <div
                class="estado-visor estado-visor-hls"
                id="estado-hls-${indice}"
            >
                ${escaparHtml(camara.estado)}
            </div>

            ${construirMarcaMeteoCam()}

            <div
                class="media-error"
                id="error-hls-${indice}"
            >

                <div>

                    <strong>
                        Emisión no disponible
                    </strong>

                    <span
                        id="mensaje-error-hls-${indice}"
                    >
                        No se puede reproducir
                        esta cámara en este momento.
                    </span>

                </div>

            </div>

            <video
                id="video-hls-${indice}"
                data-hls="1"
                data-indice="${indice}"
                data-stream-src="${escaparHtml(camara.src)}"
                aria-label="${escaparHtml(camara.nombre)}"
                controls
                autoplay
                muted
                playsinline
                preload="metadata"
            ></video>

        </div>
    `;

}


/* =========================================================
   MEDIO
   ========================================================= */

function construirMedio(
    camara,
    indice
){

    if(camara.medio==="hls"){

        return construirMedioHls(
            camara,
            indice
        );

    }


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
            ? urlConMarcaTiempo(
                camara.src
            )
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
                ${
                    esRemota
                        ? (
                            `data-remota="1" `+
                            `data-base-src="${escaparHtml(camara.src)}"`
                        )
                        : ""
                }
            >

        </div>
    `;

}


/* =========================================================
   TARJETA
   ========================================================= */

function construirTarjeta(
    camara,
    indice
){

    return `
        <article class="tarjeta-camara">

            ${construirMedio(
                camara,
                indice
            )}

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
   ESTADO HLS
   ========================================================= */

function obtenerEstadoHls(indice){

    return document.getElementById(
        "estado-hls-"+indice
    );

}


function establecerEstadoHls(
    indice,
    texto
){

    const elemento=
        obtenerEstadoHls(
            indice
        );

    if(!elemento){
        return;
    }

    elemento.textContent=
        texto;

}


function mostrarErrorHls(
    indice,
    mensaje
){

    const error=
        document.getElementById(
            "error-hls-"+indice
        );

    const mensajeError=
        document.getElementById(
            "mensaje-error-hls-"+indice
        );


    if(mensajeError){

        mensajeError.textContent=
            mensaje;

    }


    if(error){

        error.classList.add(
            "visible"
        );

    }

}


function ocultarErrorHls(indice){

    const error=
        document.getElementById(
            "error-hls-"+indice
        );


    if(error){

        error.classList.remove(
            "visible"
        );

    }

}


/* =========================================================
   DESTRUCCIÓN DE REPRODUCTORES HLS
   ========================================================= */

function destruirReproductoresHls(){

    reproductoresHls.forEach(
        reproductor=>{

            if(reproductor.hls){

                try{

                    reproductor.hls.destroy();

                }catch(error){

                    console.debug(
                        "No se pudo destruir un reproductor HLS.",
                        error
                    );

                }

            }


            if(reproductor.video){

                try{

                    reproductor.video.pause();

                    reproductor.video.removeAttribute(
                        "src"
                    );

                    reproductor.video.load();

                }catch(error){

                    console.debug(
                        "No se pudo liberar un elemento de vídeo.",
                        error
                    );

                }

            }

        }
    );


    reproductoresHls=[];

}


/* =========================================================
   POSICIÓN DE SUPERPOSICIONES HLS
   ========================================================= */

function obtenerRectanguloVideo(video){

    const anchoContenedor=
        video.clientWidth;

    const altoContenedor=
        video.clientHeight;


    if(
        !anchoContenedor ||
        !altoContenedor ||
        !video.videoWidth ||
        !video.videoHeight
    ){

        return null;

    }


    const proporcionContenedor=
        anchoContenedor/
        altoContenedor;

    const proporcionVideo=
        video.videoWidth/
        video.videoHeight;


    let anchoVideo;
    let altoVideo;
    let izquierda;
    let arriba;


    if(proporcionVideo>proporcionContenedor){

        anchoVideo=
            anchoContenedor;

        altoVideo=
            anchoContenedor/
            proporcionVideo;

        izquierda=
            0;

        arriba=
            (
                altoContenedor-
                altoVideo
            )/
            2;

    }else{

        altoVideo=
            altoContenedor;

        anchoVideo=
            altoContenedor*
            proporcionVideo;

        arriba=
            0;

        izquierda=
            (
                anchoContenedor-
                anchoVideo
            )/
            2;

    }


    return {
        izquierda:izquierda,
        arriba:arriba,
        derecha:
            anchoContenedor-
            izquierda-
            anchoVideo,
        abajo:
            altoContenedor-
            arriba-
            altoVideo
    };

}


function posicionarSuperposicionesHls(video){

    const rectangulo=
        obtenerRectanguloVideo(
            video
        );


    if(!rectangulo){

        return;

    }


    const visor=
        video.closest(
            ".visor-camara-hls"
        );


    if(!visor){

        return;

    }


    const estado=
        visor.querySelector(
            ".estado-visor-hls"
        );

    const marca=
        visor.querySelector(
            ".marca-meteocam"
        );


    const margen=
        window.matchMedia(
            "(max-width:640px)"
        ).matches
            ? 10
            : 14;


    if(estado){

        estado.style.left=
            (
                rectangulo.izquierda+
                margen
            )+
            "px";

        estado.style.top=
            (
                rectangulo.arriba+
                margen
            )+
            "px";

    }


    if(marca){

        marca.style.left=
            (
                rectangulo.izquierda+
                margen
            )+
            "px";

        marca.style.bottom=
            (
                rectangulo.abajo+
                margen
            )+
            "px";

    }

}


function posicionarTodasLasSuperposicionesHls(){

    rejillaCamaras
        .querySelectorAll(
            "video[data-hls='1']"
        )
        .forEach(
            video=>
                posicionarSuperposicionesHls(
                    video
                )
        );

}


/* =========================================================
   REPRODUCCIÓN HLS NATIVA
   ========================================================= */

function prepararHlsNativo(
    video,
    indice,
    streamUrl
){

    reproductoresHls.push({
        hls:null,
        video:video
    });


    establecerEstadoHls(
        indice,
        "CONECTANDO"
    );


    video.addEventListener(
        "loadedmetadata",
        ()=>{

            ocultarErrorHls(
                indice
            );


            establecerEstadoHls(
                indice,
                "VÍDEO EN DIRECTO"
            );


            video.play()
                .catch(
                    ()=>{

                        establecerEstadoHls(
                            indice,
                            "PULSA PLAY"
                        );

                    }
                );

        }
    );


    video.addEventListener(
        "playing",
        ()=>{

            ocultarErrorHls(
                indice
            );


            establecerEstadoHls(
                indice,
                "VÍDEO EN DIRECTO"
            );

        }
    );


    video.addEventListener(
        "error",
        ()=>{

            establecerEstadoHls(
                indice,
                "SIN EMISIÓN"
            );


            mostrarErrorHls(
                indice,
                "La emisión no está disponible en este momento."
            );

        }
    );


    video.src=
        streamUrl;

}


/* =========================================================
   REPRODUCCIÓN CON HLS.JS
   ========================================================= */

function prepararHlsJs(
    video,
    indice,
    streamUrl
){

    const hls=
        new window.Hls({

            liveSyncDurationCount:
                2,

            liveMaxLatencyDurationCount:
                5,

            enableWorker:
                true

        });


    reproductoresHls.push({
        hls:hls,
        video:video
    });


    establecerEstadoHls(
        indice,
        "CONECTANDO"
    );


    hls.loadSource(
        streamUrl
    );


    hls.attachMedia(
        video
    );


    hls.on(
        window.Hls.Events.MANIFEST_PARSED,
        ()=>{

            ocultarErrorHls(
                indice
            );


            establecerEstadoHls(
                indice,
                "VÍDEO EN DIRECTO"
            );


            video.play()
                .catch(
                    ()=>{

                        establecerEstadoHls(
                            indice,
                            "PULSA PLAY"
                        );

                    }
                );

        }
    );


    hls.on(
        window.Hls.Events.ERROR,
        (
            event,
            data
        )=>{

            if(!data.fatal){

                return;

            }


            if(
                data.type===
                window.Hls.ErrorTypes.NETWORK_ERROR
            ){

                establecerEstadoHls(
                    indice,
                    "RECONECTANDO"
                );


                try{

                    hls.startLoad();

                }catch(error){

                    console.debug(
                        "No se pudo reiniciar la carga HLS.",
                        error
                    );

                }


                return;

            }


            if(
                data.type===
                window.Hls.ErrorTypes.MEDIA_ERROR
            ){

                establecerEstadoHls(
                    indice,
                    "RECUPERANDO VÍDEO"
                );


                try{

                    hls.recoverMediaError();

                }catch(error){

                    console.debug(
                        "No se pudo recuperar el vídeo HLS.",
                        error
                    );

                }


                return;

            }


            establecerEstadoHls(
                indice,
                "SIN EMISIÓN"
            );


            mostrarErrorHls(
                indice,
                "La emisión no puede reproducirse en este momento."
            );


            try{

                hls.destroy();

            }catch(error){

                console.debug(
                    "No se pudo destruir el reproductor HLS tras un error.",
                    error
                );

            }

        }
    );


    video.addEventListener(
        "playing",
        ()=>{

            ocultarErrorHls(
                indice
            );


            establecerEstadoHls(
                indice,
                "VÍDEO EN DIRECTO"
            );

        }
    );

}


/* =========================================================
   PREPARACIÓN DE REPRODUCTORES HLS
   ========================================================= */

function prepararReproductoresHls(){

    const videos=
        rejillaCamaras.querySelectorAll(
            "video[data-hls='1']"
        );


    videos.forEach(
        video=>{

            const indice=
                Number(
                    video.dataset.indice
                );

            const streamUrl=
                video.dataset.streamSrc;


            if(
                !streamUrl ||
                Number.isNaN(indice)
            ){

                return;

            }


            video.addEventListener(
                "loadedmetadata",
                ()=>
                    posicionarSuperposicionesHls(
                        video
                    )
            );


            video.addEventListener(
                "playing",
                ()=>
                    posicionarSuperposicionesHls(
                        video
                    )
            );


            video.addEventListener(
                "resize",
                ()=>
                    posicionarSuperposicionesHls(
                        video
                    )
            );


            if(
                video.canPlayType(
                    "application/vnd.apple.mpegurl"
                )
            ){

                prepararHlsNativo(
                    video,
                    indice,
                    streamUrl
                );

                return;

            }


            if(
                window.Hls &&
                window.Hls.isSupported()
            ){

                prepararHlsJs(
                    video,
                    indice,
                    streamUrl
                );

                return;

            }


            establecerEstadoHls(
                indice,
                "NO COMPATIBLE"
            );


            mostrarErrorHls(
                indice,
                "Este navegador no permite reproducir emisiones HLS."
            );

        }
    );

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
        imagen=>{

            const tarjeta=
                imagen.closest(
                    ".tarjeta-camara"
                );


            if(!tarjeta){
                return;
            }


            const tarjetas=
                Array.from(
                    rejillaCamaras.querySelectorAll(
                        ".tarjeta-camara"
                    )
                );


            const indice=
                tarjetas.indexOf(
                    tarjeta
                );


            if(indice<0){
                return;
            }


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
        rejillaCamaras.querySelectorAll(
            "img[data-remota='1']"
        );


    imagenes.forEach(
        imagen=>{

            const baseSrc=
                imagen.dataset.baseSrc;


            if(!baseSrc){
                return;
            }


            imagen.src=
                urlConMarcaTiempo(
                    baseSrc
                );

        }
    );

}


function detenerRefrescoImagenes(){

    if(!temporizadorImagenes){
        return;
    }


    clearInterval(
        temporizadorImagenes
    );


    temporizadorImagenes=null;

}


function iniciarRefrescoImagenes(){

    detenerRefrescoImagenes();


    const imagenes=
        rejillaCamaras.querySelectorAll(
            "img[data-remota='1']"
        );


    if(imagenes.length===0){

        return;

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
            : "los-llanos";


    const zona=
        zonas[claveValida];


    destruirReproductoresHls();

    detenerRefrescoImagenes();


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
                (
                    camara,
                    indice
                )=>
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

    prepararReproductoresHls();


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
        Object.entries(
            zonas
        )
            .map(
                (
                    [
                        clave,
                        zona
                    ]
                )=>`
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


    return "los-llanos";

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


window.addEventListener(
    "resize",
    posicionarTodasLasSuperposicionesHls
);


window.addEventListener(
    "orientationchange",
    posicionarTodasLasSuperposicionesHls
);


window.addEventListener(
    "pagehide",
    ()=>{

        destruirReproductoresHls();

        detenerRefrescoImagenes();

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


// Fin de fichero
// Fin archivo: js/en-vivo.js