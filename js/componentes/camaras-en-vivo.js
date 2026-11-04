/*
 * MeteoArchidona · Componente «Cámaras en vivo»
 *
 * Selector de zona y rejilla de cámaras: las propias de MeteoArchidona
 * (Los Llanos, con el visor de vídeo reutilizable) y las de otras
 * fuentes, con refresco de las webcams de imagen fija. Era la lógica de
 * js/en-vivo.js; desde el 4-11-2026 es un componente (decisión de José:
 * todo en componentes, para los dashboards).
 *
 *     <div data-componente="camaras-en-vivo"></div>
 *     <div data-componente="camaras-en-vivo" data-zona="los-llanos"
 *          data-direccion="no"></div>
 *
 *     import {montarCamarasEnVivo} from "/js/componentes/camaras-en-vivo.js?v=…";
 *     montarCamarasEnVivo(hueco);
 *
 * Opciones:
 *   - data-zona: zona inicial (si no, la de ?zona= de la dirección, o
 *     Los Llanos).
 *   - data-direccion="no": no apunta la zona elegida en la dirección (en
 *     un dashboard sobra).
 *
 * Usa id fijos: uno por página. Carga css/componentes-en-vivo.css si falta.
 */

import {asegurarHoja} from "./comun.js?v=20261104-componentes1";


const MARCADO = `
<section
    class="selector-panel"
    aria-labelledby="titulo-selector"
>

    <div class="selector-contenido">

        <div class="selector-texto">

            <h2 id="titulo-selector">
                Selecciona una zona
            </h2>

            <p>
                Elige la zona cuyas cámaras quieres consultar.
                Las cámaras de Los Llanos pertenecen a la red
                propia de MeteoArchidona.
            </p>

        </div>


        <div class="selector-control">

            <label for="selector-zona">
                ZONA
            </label>

            <select
                id="selector-zona"
                data-auditoria-seleccion="SELECTOR_EMISION"
                aria-label="Seleccionar zona de cámaras"
            ></select>

        </div>

    </div>

</section>


<!-- ======================================================
     CÁMARAS EXISTENTES

     - MeteoCam Los Llanos
     - Sierra Nevada
     - Fuentes externas

     Gestionadas por:
         js/en-vivo.js
     ====================================================== -->

<section
    class="seccion-camaras"
    aria-live="polite"
>

    <div class="cabecera-zona">

        <div>

            <h2 id="titulo-zona"></h2>

            <p id="descripcion-zona"></p>

        </div>

        <div
            class="contador-zona"
            id="contador-zona"
        ></div>

    </div>


    <div
        class="rejilla-camaras"
        id="rejilla-camaras"
    ></div>


    <div
        class="nota-proveedor"
        id="nota-proveedor"
    ></div>

</section>
`;


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

                descripcion:
                    "Vista panorámica de Los Llanos para observar de forma " +
                    "continua el estado general del cielo, la nubosidad, " +
                    "la visibilidad y la evolución del tiempo en el entorno.",

                medio:
                    "visor-video",

                visorCamara:
                    "los-llanos",

                visorVista:
                    "panoramica",

                interactivo:
                    true,

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

                descripcion:
                    "Vista específica de Los Llanos orientada a un sector " +
                    "concreto del entorno. Complementa la panorámica para " +
                    "seguir con mayor detalle la visibilidad, las nubes " +
                    "y los cambios meteorológicos.",

                medio:
                    "visor-video",

                visorCamara:
                    "los-llanos",

                visorVista:
                    "ptz",

                interactivo:
                    true,

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




export function montarCamarasEnVivo(raiz) {

    asegurarHoja("/css/componentes-en-vivo.css?v=20261104-componentes1");

    raiz.classList.add("camaras-en-vivo");
    raiz.innerHTML = MARCADO;

    const zonaPedida = raiz.dataset.zona;
    const conDireccion = raiz.dataset.direccion !== "no";

    /* =========================================================
       ELEMENTOS
       ========================================================= */

    const selectorZona=
        raiz.querySelector("#"+
            "selector-zona"
        );

    const tituloZona=
        raiz.querySelector("#"+
            "titulo-zona"
        );

    const descripcionZona=
        raiz.querySelector("#"+
            "descripcion-zona"
        );

    const contadorZona=
        raiz.querySelector("#"+
            "contador-zona"
        );

    const rejillaCamaras=
        raiz.querySelector("#"+
            "rejilla-camaras"
        );

    const notaProveedor=
        raiz.querySelector("#"+
            "nota-proveedor"
        );


    let temporizadorImagenes=null;


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
       VISOR DE VÍDEO METEOARCHIDONA
       ========================================================= */

    function construirUrlVisorVideo(camara){

        const parametros=
            new URLSearchParams({
                camara:
                    camara.visorCamara,
                vista:
                    camara.visorVista,
                interactivo:
                    camara.interactivo===false
                        ? "0"
                        : "1"
            });


        return (
            "../visores/video.html?"+
            parametros.toString()
        );

    }


    function construirMedioVisorVideo(camara){

        const src=
            construirUrlVisorVideo(
                camara
            );


        return `
            <div class="visor-camara visor-camara-propia">

                <iframe
                    class="iframe-visor-video"
                    src="${escaparHtml(src)}"
                    title="${escaparHtml(camara.nombre)}"
                    loading="eager"
                    allow="autoplay; fullscreen"
                    allowfullscreen
                ></iframe>

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

        if(camara.medio==="visor-video"){

            return construirMedioVisorVideo(
                camara
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
                    raiz.querySelector("#"+
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

        if(!conDireccion){
            return;
        }

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

        if(zonaPedida && zonas[zonaPedida]){
            return zonaPedida;
        }

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
        "pagehide",
        detenerRefrescoImagenes
    );


    /* =========================================================
       INICIO
       ========================================================= */

    cargarSelector();


    renderizarZona(
        obtenerZonaInicial(),
        false
    );

}


/* Fin de fichero: js/componentes/camaras-en-vivo.js */
