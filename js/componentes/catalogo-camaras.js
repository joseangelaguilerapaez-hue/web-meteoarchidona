/*
 * MeteoArchidona · Catálogo de cámaras en vivo
 *
 * Lista única de zonas y cámaras (propias de Los Llanos y de Sierra
 * Nevada). La usan el componente «Cámaras en vivo»
 * (js/componentes/camaras-en-vivo.js) y la Sala de cámaras
 * (js/sala-camaras.js), para que una cámara añadida aquí salga en las dos
 * (José, 20-11-2026). Los directos de YouTube no están aquí: vienen de la
 * API (/api/camaras/youtube).
 *
 * El nombre corto (nombreCorto) es la etiqueta de cada recuadro de la Sala de cámaras.
 */

/* =========================================================
   CATÁLOGO DE ZONAS Y CÁMARAS
   ========================================================= */

export const ZONAS_CAMARAS={

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

                nombreCorto:
                    "Los Llanos · Panorámica",

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

                // El id de la cámara en la API (como en js/ficha-estacion.js).
                idCamara:
                    1,

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

                nombreCorto:
                    "Los Llanos · Específica",

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

                idCamara:
                    2,

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

                nombreCorto:
                    "Borreguiles",

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

                nombreCorto:
                    "Mirlo Blanco",

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

                nombreCorto:
                    "Veleta",

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

                nombreCorto:
                    "Laguna",

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

                nombreCorto:
                    "Montebajo",

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

                nombreCorto:
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

                nombreCorto:
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


/* Fin de fichero: js/componentes/catalogo-camaras.js */
