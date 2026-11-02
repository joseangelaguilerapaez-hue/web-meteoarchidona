"use strict";

/*
 * MeteoArchidona
 * Componente · Ficha de estación
 *
 * Responsabilidades:
 *
 * - cargar una única vez la plantilla HTML de ficha de estación;
 * - crear instancias independientes de la ficha;
 * - sustituir PLANTILLA por el código real de estación;
 * - aplicar modo vertical u horizontal;
 * - consultar las cámaras públicas asociadas a cada estación;
 * - mostrar un selector cuando exista más de una cámara;
 * - mostrar de forma informativa el preset activo de una PTZ;
 * - montar el visor correspondiente a la cámara seleccionada;
 * - mostrar mediante el mismo visor el estado "no disponible"
 *   cuando la estación todavía no disponga de cámara.
 *
 * La geometría de la ficha depende únicamente de:
 *
 *     vertical
 *     horizontal
 *
 * La existencia o no de cámara NO crea variantes adicionales
 * de diseño.
 *
 * Cámaras
 * =======
 *
 * El catálogo funcional procede de:
 *
 *     GET /estaciones/{codigo_estacion}/camaras
 *
 * La API determina:
 *
 * - qué cámaras están habilitadas;
 * - su nombre público;
 * - su tipo de vista;
 * - si admiten presets;
 * - cuál es su preset activo.
 *
 * El navegador no mantiene una lista funcional de cámaras.
 *
 * Publicación de vídeo
 * ====================
 *
 * La tabla de cámaras todavía no contiene todos los parámetros
 * necesarios para resolver automáticamente la publicación HLS.
 *
 * Por ello existe temporalmente una correspondencia mínima entre
 * el identificador interno de cámara y el visor actualmente
 * publicado.
 *
 * En Los Llanos:
 *
 *     cámara #1 -> panorámica
 *     cámara #2 -> PTZ
 *
 * Esta correspondencia desaparecerá cuando la configuración de
 * publicación pueda obtenerse desde la API.
 *
 * Presets
 * =======
 *
 * El preset activo es únicamente informativo en esta fase.
 *
 * Cambiar físicamente la posición de una cámara PTZ pertenecerá
 * al subsistema:
 *
 *     comando_camara
 *         ->
 *     MeteoCam
 *         ->
 *     cámara física
 */


/* ==========================================================
   CONFIGURACIÓN
   ========================================================== */


const RUTA_COMPONENTE =
    "/componentes/ficha-estacion.html?v=20261101-nieve";


const MODOS_VALIDOS =
    new Set([
        "vertical",
        "horizontal"
    ]);


/*
 * Correspondencia TEMPORAL entre registros públicos de cámara
 * y publicaciones actualmente conocidas por visor-video.js.
 *
 * La identidad funcional de las cámaras procede ya de PostgreSQL.
 *
 * Solo permanece cableada la resolución del transporte de vídeo.
 */
const PUBLICACIONES_CAMARA = {

    LOS_LLANOS: {

        1: {
            camara:
                "los-llanos",

            vista:
                "panoramica"
        },

        2: {
            camara:
                "los-llanos",

            vista:
                "ptz"
        }

    }

};


let promesaPlantilla =
    null;


/*
 * Catálogo público cargado durante la vida de la página.
 *
 * Clave:
 *     código de estación.
 *
 * Valor:
 *     array de cámaras públicas.
 */
const catalogosCamaras =
    new Map();


/*
 * Evita lanzar varias peticiones simultáneas para una misma
 * estación cuando diferentes fases de sincronización solicitan
 * el catálogo al mismo tiempo.
 */
const promesasCatalogosCamaras =
    new Map();


/* ==========================================================
   NORMALIZACIÓN
   ========================================================== */


function normalizarCodigoEstacion(
    codigo
) {

    return String(
        codigo
        ??
        ""
    )
        .trim()
        .toUpperCase();

}


function normalizarModo(
    modo
) {

    const valor =
        String(
            modo
            ??
            ""
        )
            .trim()
            .toLowerCase();


    if (
        MODOS_VALIDOS.has(
            valor
        )
    ) {

        return valor;

    }


    return "vertical";

}


function normalizarTexto(
    valor
) {

    const texto =
        String(
            valor
            ??
            ""
        )
            .trim();


    return texto
        ||
        null;

}


/* ==========================================================
   API
   ========================================================== */


function obtenerApiBase() {

    return String(
        window.API_BASE
        ||
        "/api"
    )
        .trim()
        .replace(
            /\/+$/,
            ""
        );

}


/* ==========================================================
   PLANTILLA
   ========================================================== */


async function descargarPlantilla() {

    const respuesta =
        await fetch(
            RUTA_COMPONENTE,
            {
                cache:
                    "no-store"
            }
        );


    if (
        !respuesta.ok
    ) {

        throw new Error(
            `No se pudo cargar la ficha de estación: HTTP ${respuesta.status}`
        );

    }


    const html =
        await respuesta.text();


    const documento =
        new DOMParser()
            .parseFromString(
                html,
                "text/html"
            );


    const plantilla =
        documento.getElementById(
            "plantilla-estacion"
        );


    if (
        !plantilla
        ||
        plantilla.tagName
        !==
        "TEMPLATE"
    ) {

        throw new Error(
            "El componente ficha-estacion.html no contiene una plantilla válida."
        );

    }


    const ficha =
        plantilla.content
            .querySelector(
                ".ficha-estacion"
            );


    if (!ficha) {

        throw new Error(
            "La plantilla no contiene el elemento .ficha-estacion."
        );

    }


    return plantilla;

}


export async function obtenerPlantillaFichaEstacion() {

    if (
        !promesaPlantilla
    ) {

        promesaPlantilla =
            descargarPlantilla()
                .catch(
                    error => {

                        /*
                         * Permitimos reintentar en una llamada posterior
                         * si la descarga falla temporalmente.
                         */
                        promesaPlantilla =
                            null;

                        throw error;

                    }
                );

    }


    return promesaPlantilla;

}


/* ==========================================================
   SUSTITUCIÓN DE IDENTIFICADORES
   ========================================================== */


function sustituirTextoPlantilla(
    valor,
    codigo
) {

    if (
        typeof valor
        !==
        "string"
        ||
        !valor.includes(
            "PLANTILLA"
        )
    ) {

        return valor;

    }


    return valor.replaceAll(
        "PLANTILLA",
        codigo
    );

}


function sustituirAtributosPlantilla(
    elemento,
    codigo
) {

    Array.from(
        elemento.attributes
        ??
        []
    ).forEach(
        atributo => {

            const valorNuevo =
                sustituirTextoPlantilla(
                    atributo.value,
                    codigo
                );


            if (
                valorNuevo
                ===
                atributo.value
            ) {

                return;

            }


            elemento.setAttribute(
                atributo.name,
                valorNuevo
            );

        }
    );

}


function sustituirCodigoPlantilla(
    ficha,
    codigo
) {

    const elementos = [
        ficha,
        ...ficha.querySelectorAll(
            "*"
        )
    ];


    elementos.forEach(
        elemento => {

            sustituirAtributosPlantilla(
                elemento,
                codigo
            );


            delete elemento.dataset
                .gotasLluviaInicializadas;

            delete elemento.dataset
                .controlLluviaConfigurado;

            delete elemento.dataset
                .patrocinioConfigurado;

            delete elemento.dataset
                .selectorCamaraConfigurado;

        }
    );

}


/* ==========================================================
   MODO DE FICHA
   ========================================================== */


export function establecerModoFicha(
    ficha,
    modo
) {

    if (!ficha) {
        return "vertical";
    }


    const modoNormalizado =
        normalizarModo(
            modo
        );


    ficha.classList.remove(
        "ficha-estacion--vertical",
        "ficha-estacion--horizontal"
    );


    ficha.classList.add(
        `ficha-estacion--${modoNormalizado}`
    );


    ficha.dataset
        .modoFicha =
        modoNormalizado;


    return modoNormalizado;

}


export function obtenerModoFicha(
    ficha
) {

    return normalizarModo(
        ficha?.dataset
            ?.modoFicha
    );

}


/* ==========================================================
   CATÁLOGO PÚBLICO DE CÁMARAS
   ========================================================== */


function validarCamaraPublica(
    camara
) {

    if (
        !camara
        ||
        typeof camara
        !==
        "object"
    ) {

        return false;

    }


    if (
        !Number.isInteger(
            camara.id
        )
        ||
        camara.id
        <
        1
    ) {

        return false;

    }


    if (
        !normalizarTexto(
            camara.nombre
        )
    ) {

        return false;

    }


    if (
        ![
            "PANORAMICA",
            "PTZ"
        ].includes(
            String(
                camara.tipo_vista
                ??
                ""
            )
                .trim()
                .toUpperCase()
        )
    ) {

        return false;

    }


    return true;

}


function normalizarCamaraPublica(
    camara
) {

    const tipoVista =
        String(
            camara.tipo_vista
        )
            .trim()
            .toUpperCase();


    let presetActivo =
        null;


    if (
        camara.preset_activo
        &&
        typeof camara.preset_activo
        ===
        "object"
        &&
        Number.isInteger(
            camara.preset_activo.id
        )
        &&
        camara.preset_activo.id
        >
        0
    ) {

        const nombrePreset =
            normalizarTexto(
                camara.preset_activo
                    .nombre
            );


        if (nombrePreset) {

            presetActivo = {
                id:
                    camara.preset_activo.id,

                nombre:
                    nombrePreset
            };

        }

    }


    return {
        id:
            camara.id,

        nombre:
            normalizarTexto(
                camara.nombre
            )
            ||
            `Cámara ${camara.id}`,

        tipo_vista:
            tipoVista,

        en_linea:
            camara.en_linea
            ===
            true,

        admite_presets:
            camara.admite_presets
            ===
            true,

        preset_activo:
            presetActivo
    };

}


async function consultarCamarasEstacion(
    codigo
) {

    const codigoNormalizado =
        normalizarCodigoEstacion(
            codigo
        );


    if (!codigoNormalizado) {

        return [];

    }


    const respuesta =
        await fetch(
            `${
                obtenerApiBase()
            }/estaciones/${
                encodeURIComponent(
                    codigoNormalizado
                )
            }/camaras`,
            {
                cache:
                    "no-store"
            }
        );


    if (
        !respuesta.ok
    ) {

        throw new Error(
            `No se pudieron consultar las cámaras de ${codigoNormalizado}: HTTP ${respuesta.status}`
        );

    }


    const datos =
        await respuesta.json();


    if (
        !datos
        ||
        typeof datos
        !==
        "object"
        ||
        !Array.isArray(
            datos.camaras
        )
    ) {

        throw new Error(
            `La API no devolvió un catálogo válido de cámaras para ${codigoNormalizado}.`
        );

    }


    const codigoRespuesta =
        normalizarCodigoEstacion(
            datos.estacion_codigo
        );


    if (
        codigoRespuesta
        &&
        codigoRespuesta
        !==
        codigoNormalizado
    ) {

        throw new Error(
            `La API devolvió cámaras de una estación distinta a ${codigoNormalizado}.`
        );

    }


    return datos.camaras
        .filter(
            validarCamaraPublica
        )
        .map(
            normalizarCamaraPublica
        );

}


async function obtenerCatalogoCamaras(
    codigo
) {

    const codigoNormalizado =
        normalizarCodigoEstacion(
            codigo
        );


    if (!codigoNormalizado) {

        return [];

    }


    if (
        catalogosCamaras.has(
            codigoNormalizado
        )
    ) {

        return (
            catalogosCamaras.get(
                codigoNormalizado
            )
            ??
            []
        );

    }


    if (
        promesasCatalogosCamaras.has(
            codigoNormalizado
        )
    ) {

        return promesasCatalogosCamaras.get(
            codigoNormalizado
        );

    }


    const promesa =
        consultarCamarasEstacion(
            codigoNormalizado
        )
            .then(
                camaras => {

                    catalogosCamaras.set(
                        codigoNormalizado,
                        camaras
                    );


                    return camaras;

                }
            )
            .finally(
                () => {

                    promesasCatalogosCamaras.delete(
                        codigoNormalizado
                    );

                }
            );


    promesasCatalogosCamaras.set(
        codigoNormalizado,
        promesa
    );


    return promesa;

}


/* ==========================================================
   PUBLICACIÓN DE VÍDEO
   ========================================================== */


function obtenerPublicacionCamara(
    codigo,
    camara
) {

    if (!camara) {

        return null;

    }


    const codigoNormalizado =
        normalizarCodigoEstacion(
            codigo
        );


    return (
        PUBLICACIONES_CAMARA[
            codigoNormalizado
        ]
        ?.[
            camara.id
        ]
        ??
        null
    );

}


/*
 * Conservamos esta función exportada para no romper posibles
 * consumidores externos del componente.
 *
 * Ahora devuelve la primera cámara pública ya cargada en memoria.
 */
export function obtenerCamaraEstacion(
    codigo
) {

    const codigoNormalizado =
        normalizarCodigoEstacion(
            codigo
        );


    const camaras =
        catalogosCamaras.get(
            codigoNormalizado
        )
        ??
        [];


    return (
        camaras[0]
        ??
        null
    );

}


export function estacionDisponeCamara(
    codigo
) {

    const codigoNormalizado =
        normalizarCodigoEstacion(
            codigo
        );


    const camaras =
        catalogosCamaras.get(
            codigoNormalizado
        );


    return Boolean(
        camaras
        &&
        camaras.length
        >
        0
    );

}


/* ==========================================================
   CÁMARA SELECCIONADA
   ========================================================== */


function obtenerCamaraSeleccionada(
    ficha,
    camaras
) {

    if (
        !Array.isArray(
            camaras
        )
        ||
        camaras.length
        ===
        0
    ) {

        return null;

    }


    const identificadorSeleccionado =
        Number(
            ficha?.dataset
                ?.camaraSeleccionadaId
        );


    if (
        Number.isInteger(
            identificadorSeleccionado
        )
    ) {

        const encontrada =
            camaras.find(
                camara =>
                    camara.id
                    ===
                    identificadorSeleccionado
            );


        if (encontrada) {

            return encontrada;

        }

    }


    /*
     * La API devuelve las cámaras ordenadas por identificador.
     *
     * Mientras no exista una propiedad explícita de cámara pública
     * predeterminada, utilizamos la primera cámara del catálogo.
     */
    return camaras[0];

}


function guardarCamaraSeleccionada(
    ficha,
    camara
) {

    if (
        !ficha
        ||
        !camara
    ) {

        return;

    }


    ficha.dataset
        .camaraSeleccionadaId =
        String(
            camara.id
        );

}


/* ==========================================================
   CONTROLES DE CÁMARA
   ========================================================== */


function obtenerElementosControlesCamara(
    ficha
) {

    return {
        controles:
            ficha.querySelector(
                ".estacion-camara-controles"
            ),

        bloqueSelector:
            ficha.querySelector(
                ".estacion-camara-selector"
            ),

        selector:
            ficha.querySelector(
                ".estacion-camara-select"
            ),

        bloquePreset:
            ficha.querySelector(
                ".estacion-camara-preset"
            ),

        preset:
            ficha.querySelector(
                ".estacion-camara-preset-valor"
            )
    };

}


function ocultarControlesCamara(
    ficha
) {

    const elementos =
        obtenerElementosControlesCamara(
            ficha
        );


    if (
        elementos.controles
    ) {

        elementos.controles.hidden =
            true;

    }


    if (
        elementos.bloqueSelector
    ) {

        elementos.bloqueSelector.hidden =
            true;

    }


    if (
        elementos.selector
    ) {

        elementos.selector.disabled =
            true;


        elementos.selector.replaceChildren();

    }


    if (
        elementos.bloquePreset
    ) {

        elementos.bloquePreset.hidden =
            true;

    }


    if (
        elementos.preset
    ) {

        elementos.preset.textContent =
            "—";

    }

}


function rellenarSelectorCamaras(
    selector,
    camaras,
    camaraSeleccionada
) {

    selector.replaceChildren();


    camaras.forEach(
        camara => {

            const opcion =
                document.createElement(
                    "option"
                );


            opcion.value =
                String(
                    camara.id
                );


            opcion.textContent =
                camara.nombre;


            selector.appendChild(
                opcion
            );

        }
    );


    if (camaraSeleccionada) {

        selector.value =
            String(
                camaraSeleccionada.id
            );

    }

}


function actualizarInformacionPreset(
    elementos,
    camara
) {

    if (
        !elementos.bloquePreset
        ||
        !elementos.preset
    ) {

        return false;

    }


    const mostrarPreset =
        Boolean(
            camara
            &&
            camara.tipo_vista
            ===
            "PTZ"
            &&
            camara.admite_presets
        );


    elementos.bloquePreset.hidden =
        !mostrarPreset;


    if (!mostrarPreset) {

        elementos.preset.textContent =
            "—";


        return false;

    }


    elementos.preset.textContent =
        camara.preset_activo
            ?.nombre
        ||
        "Sin preset activo";


    return true;

}


function configurarEventoSelectorCamara(
    ficha,
    selector,
    codigo
) {

    if (
        selector.dataset
            .selectorCamaraConfigurado
        ===
        "1"
    ) {

        return;

    }


    selector.dataset
        .selectorCamaraConfigurado =
        "1";


    selector.addEventListener(
        "change",
        () => {

            const camaras =
                catalogosCamaras.get(
                    codigo
                )
                ??
                [];


            const camaraId =
                Number(
                    selector.value
                );


            const camara =
                camaras.find(
                    item =>
                        item.id
                        ===
                        camaraId
                );


            if (!camara) {

                return;

            }


            guardarCamaraSeleccionada(
                ficha,
                camara
            );


            aplicarCatalogoCamarasFicha(
                ficha,
                codigo,
                camaras
            );

        }
    );

}


function actualizarControlesCamara(
    ficha,
    codigo,
    camaras,
    camaraSeleccionada
) {

    const elementos =
        obtenerElementosControlesCamara(
            ficha
        );


    if (
        !elementos.controles
        ||
        !elementos.bloqueSelector
        ||
        !elementos.selector
    ) {

        return;

    }


    if (
        !camaraSeleccionada
        ||
        camaras.length
        ===
        0
    ) {

        ocultarControlesCamara(
            ficha
        );


        return;

    }


    const mostrarSelector =
        camaras.length
        >
        1;


    elementos.bloqueSelector.hidden =
        !mostrarSelector;


    if (mostrarSelector) {

        rellenarSelectorCamaras(
            elementos.selector,
            camaras,
            camaraSeleccionada
        );


        elementos.selector.disabled =
            false;


        configurarEventoSelectorCamara(
            ficha,
            elementos.selector,
            codigo
        );


    } else {

        elementos.selector.disabled =
            true;


        elementos.selector.replaceChildren();

    }


    const mostrarPreset =
        actualizarInformacionPreset(
            elementos,
            camaraSeleccionada
        );


    elementos.controles.hidden =
        !(
            mostrarSelector
            ||
            mostrarPreset
        );

}


/* ==========================================================
   URL DEL VISOR
   ========================================================== */


function crearParametrosVisorBase() {

    const parametros =
        new URLSearchParams();


    /*
     * El visor incrustado dentro de una ficha necesita su propia
     * escala visual.
     *
     * El modo compacto reduce únicamente las superposiciones y
     * controles del visor mientras permanece incrustado.
     *
     * Al entrar en pantalla completa recuperará la escala normal.
     */
    parametros.set(
        "compacto",
        "1"
    );


    parametros.set(
        "interactivo",
        "1"
    );


    /*
     * Nunca se carga una emisión al crear la ficha.
     * El usuario debe solicitarla expresamente.
     */
    parametros.set(
        "autoplay",
        "0"
    );


    parametros.set(
        "controles",
        "1"
    );


    /*
     * Toda la superficie del visor alterna reproducción/pausa.
     * Por ello el visor solo mostrará como control propio
     * el botón de pantalla completa.
     */
    parametros.set(
        "click",
        "1"
    );


    return parametros;

}


export function crearUrlVisorEstacion(
    codigo,
    camara = null
) {

    const codigoNormalizado =
        normalizarCodigoEstacion(
            codigo
        );


    const publicacion =
        obtenerPublicacionCamara(
            codigoNormalizado,
            camara
        );


    const parametros =
        crearParametrosVisorBase();


    parametros.set(
        "estacion",
        codigoNormalizado
    );


    if (publicacion) {

        parametros.set(
            "camara",
            publicacion.camara
        );


        parametros.set(
            "vista",
            publicacion.vista
        );


        /*
         * en_linea es informativo.
         *
         * Mientras MeteoCam todavía no sincronice ese estado,
         * una cámara habilitada puede figurar como desconectada
         * aunque su publicación HLS actual siga siendo utilizable.
         *
         * Por tanto la disponibilidad del visor depende aquí de
         * que exista una publicación conocida, no de en_linea.
         */
        parametros.set(
            "disponible",
            "1"
        );


    } else {

        /*
         * El visor sigue existiendo aunque no haya una cámara
         * publicable.
         *
         * visor-video.js interpretará disponible=0 como un estado
         * corporativo estático:
         *
         *     VÍDEO EN DIRECTO
         *     NO DISPONIBLE EN ESTA ESTACIÓN
         *
         * sin crear HLS ni realizar intentos de conexión.
         */
        parametros.set(
            "disponible",
            "0"
        );


        parametros.set(
            "controles",
            "0"
        );


        parametros.set(
            "click",
            "0"
        );

    }


    return (
        `/visores/video.html?${
            parametros.toString()
        }`
    );

}


/* ==========================================================
   IFRAME DEL VISOR
   ========================================================== */


function montarIframeVisor(
    ficha,
    codigo,
    camara
) {

    if (!ficha) {
        return null;
    }


    const codigoNormalizado =
        normalizarCodigoEstacion(
            codigo
        );


    const contenedor =
        ficha.querySelector(
            ".estacion-visor-contenedor"
        );


    const zonaVisor =
        ficha.querySelector(
            ".estacion-visor"
        );


    if (
        !contenedor
        ||
        !zonaVisor
    ) {

        return null;

    }


    const publicacion =
        obtenerPublicacionCamara(
            codigoNormalizado,
            camara
        );


    /*
     * Sin cámara, el viento sube a ocupar ese sitio.
     *
     * Dejar la mitad derecha en blanco quedaba peor que el recuadro que
     * se quitó: media ficha vacía con el nombre colgando en una punta.
     * La veleta es lo que mejor llena ese hueco, y de paso la ficha
     * entera queda más corta.
     */
    function colocarViento(ficha, arriba) {

        const superior =
            ficha.querySelector(
                ".estacion-superior"
            );

        const secundarios =
            ficha.querySelector(
                ".estacion-secundarios"
            );

        const viento =
            ficha.querySelector(
                ".viento-panel"
            );


        if (
            !superior
            ||
            !secundarios
            ||
            !viento
        ) {

            return;

        }


        const sitio = arriba
            ? superior
            : secundarios;


        /* Ya está donde toca: no se toca el DOM por gusto. */
        if (
            viento.parentElement === sitio
        ) {

            return;

        }


        if (
            arriba
        ) {

            superior.append(
                viento
            );


            return;

        }


        secundarios.prepend(
            viento
        );

    }


    /*
     * Estación sin cámara: fuera la zona entera.
     *
     * Antes se montaba igualmente el visor para que enseñara el
     * cartel "VÍDEO EN DIRECTO / NO DISPONIBLE EN ESTA ESTACIÓN".
     * Ocupaba lo mismo que un directo, repetía el logotipo en tres
     * de las cuatro fichas de la portada y, de paso, cargaba un
     * iframe por estación para no enseñar nada.
     *
     * Con el atributo, css/ficha-estacion.css esconde .estacion-camara
     * y la ficha reparte ese sitio entre sus datos. Si más adelante
     * la estación estrena cámara, el atributo se quita solo en la
     * siguiente pasada y el visor aparece.
     */
    if (
        !publicacion
    ) {

        ficha.dataset
            .sinCamara = "1";


        colocarViento(
            ficha,
            true
        );


        contenedor.replaceChildren();


        zonaVisor.dataset
            .camaraDisponible = "0";


        delete zonaVisor.dataset
            .camaraId;


        return null;

    }


    delete ficha.dataset
        .sinCamara;


    colocarViento(
        ficha,
        false
    );


    const url =
        crearUrlVisorEstacion(
            codigoNormalizado,
            camara
        );


    const iframeExistente =
        contenedor.querySelector(
            "iframe"
        );


    /*
     * Es fundamental conservar el iframe existente cuando la URL
     * no cambia.
     *
     * Volver a insertar el iframe mientras está en fullscreen
     * haría que Chrome/Android saliera inmediatamente de pantalla
     * completa.
     */
    if (
        iframeExistente
        &&
        iframeExistente.dataset
            .visorSrc
        ===
        url
    ) {

        zonaVisor.dataset
            .camaraDisponible =
            publicacion
                ? "1"
                : "0";


        if (camara) {

            zonaVisor.dataset
                .camaraId =
                String(
                    camara.id
                );


        } else {

            delete zonaVisor.dataset
                .camaraId;

        }


        return iframeExistente;

    }


    contenedor.replaceChildren();


    const iframe =
        document.createElement(
            "iframe"
        );


    iframe.className =
        "estacion-visor-iframe";


    iframe.src =
        url;


    iframe.dataset
        .visorSrc =
        url;


    if (
        camara
        &&
        publicacion
    ) {

        iframe.title =
            `Vídeo en directo · ${camara.nombre}`;


    } else if (camara) {

        iframe.title =
            `Vídeo en directo no disponible · ${camara.nombre}`;


    } else {

        iframe.title =
            "Vídeo en directo no disponible en esta estación";

    }


    iframe.loading =
        "lazy";


    iframe.setAttribute(
        "allow",
        "autoplay; fullscreen"
    );


    iframe.setAttribute(
        "allowfullscreen",
        ""
    );


    iframe.setAttribute(
        "referrerpolicy",
        "same-origin"
    );


    zonaVisor.dataset
        .camaraDisponible =
        publicacion
            ? "1"
            : "0";


    if (camara) {

        zonaVisor.dataset
            .camaraId =
            String(
                camara.id
            );


    } else {

        delete zonaVisor.dataset
            .camaraId;

    }


    contenedor.appendChild(
        iframe
    );


    return iframe;

}


/* ==========================================================
   APLICACIÓN DEL CATÁLOGO A LA FICHA
   ========================================================== */


function aplicarCatalogoCamarasFicha(
    ficha,
    codigo,
    camaras
) {

    if (!ficha) {

        return null;

    }


    const codigoNormalizado =
        normalizarCodigoEstacion(
            codigo
        );


    if (
        normalizarCodigoEstacion(
            ficha.dataset
                .codigoEstacion
        )
        !==
        codigoNormalizado
    ) {

        return null;

    }


    const camaraSeleccionada =
        obtenerCamaraSeleccionada(
            ficha,
            camaras
        );


    if (camaraSeleccionada) {

        guardarCamaraSeleccionada(
            ficha,
            camaraSeleccionada
        );


    } else {

        delete ficha.dataset
            .camaraSeleccionadaId;

    }


    actualizarControlesCamara(
        ficha,
        codigoNormalizado,
        camaras,
        camaraSeleccionada
    );


    return montarIframeVisor(
        ficha,
        codigoNormalizado,
        camaraSeleccionada
    );

}


/* ==========================================================
   CARGA ASÍNCRONA DEL CATÁLOGO
   ========================================================== */


async function cargarCamarasFicha(
    ficha,
    codigo
) {

    const codigoNormalizado =
        normalizarCodigoEstacion(
            codigo
        );


    try {

        const camaras =
            await obtenerCatalogoCamaras(
                codigoNormalizado
            );


        aplicarCatalogoCamarasFicha(
            ficha,
            codigoNormalizado,
            camaras
        );


        return camaras;


    } catch (
        error
    ) {

        console.error(
            `Error cargando cámaras de ${codigoNormalizado}:`,
            error
        );


        /*
         * Un fallo temporal de la consulta no debe romper la ficha.
         *
         * Se conserva el visor corporativo de "no disponible".
         *
         * El catálogo no se almacena en caché cuando falla, de modo
         * que una sincronización posterior podrá reintentar.
         */
        ocultarControlesCamara(
            ficha
        );


        montarIframeVisor(
            ficha,
            codigoNormalizado,
            null
        );


        return [];

    }

}


/* ==========================================================
   MONTAJE DEL VISOR
   ========================================================== */


export function montarVisorFicha(
    ficha,
    codigo
) {

    if (!ficha) {
        return null;
    }


    const codigoNormalizado =
        normalizarCodigoEstacion(
            codigo
        );


    if (!codigoNormalizado) {

        return null;

    }


    /*
     * Si el catálogo ya está en memoria podemos renderizar
     * inmediatamente sin tocar innecesariamente el iframe.
     */
    if (
        catalogosCamaras.has(
            codigoNormalizado
        )
    ) {

        return aplicarCatalogoCamarasFicha(
            ficha,
            codigoNormalizado,
            catalogosCamaras.get(
                codigoNormalizado
            )
            ??
            []
        );

    }


    /*
     * Hasta que responda la API mostramos el estado corporativo
     * de vídeo no disponible.
     *
     * La petición posterior sustituirá este iframe únicamente
     * si existe una cámara publicable.
     */
    const iframe =
        montarIframeVisor(
            ficha,
            codigoNormalizado,
            null
        );


    void cargarCamarasFicha(
        ficha,
        codigoNormalizado
    );


    return iframe;

}


/* ==========================================================
   METADATOS BÁSICOS
   ========================================================== */


function obtenerLocalidad(
    estacion
) {

    if (
        estacion?.ciudad
    ) {

        return String(
            estacion.ciudad
        );

    }


    return [
        estacion?.region,
        estacion?.pais
    ]
        .filter(
            Boolean
        )
        .join(
            " · "
        );

}


export function actualizarIdentidadFicha(
    ficha,
    estacion
) {

    if (
        !ficha
        ||
        !estacion
    ) {

        return;

    }


    const codigo =
        normalizarCodigoEstacion(
            estacion.codigo
        );


    const nombre =
        estacion.nombre_publico
        ||
        codigo;


    const localidad =
        obtenerLocalidad(
            estacion
        );


    const nombreElemento =
        ficha.querySelector(
            ".estacion-nombre"
        );


    const localidadElemento =
        ficha.querySelector(
            ".estacion-localidad"
        );


    const veleta =
        ficha.querySelector(
            ".veleta"
        );


    const patrocinio =
        ficha.querySelector(
            ".patrocinio-estacion"
        );


    if (nombreElemento) {

        nombreElemento.textContent =
            nombre;

    }


    if (localidadElemento) {

        localidadElemento.textContent =
            localidad;

    }


    if (veleta) {

        veleta.setAttribute(
            "aria-label",
            `Veleta de ${nombre}`
        );


        veleta.setAttribute(
            "title",
            `Veleta de ${nombre}`
        );

    }


    if (patrocinio) {

        patrocinio.setAttribute(
            "aria-label",
            `Patrocinadores de los datos de lluvia de ${nombre}`
        );

    }

}


/* ==========================================================
   CREACIÓN
   ========================================================== */


export async function crearFichaEstacion(
    estacion,
    opciones = {}
) {

    const codigo =
        normalizarCodigoEstacion(
            estacion?.codigo
        );


    if (!codigo) {

        throw new Error(
            "No se puede crear una ficha sin código de estación."
        );

    }


    const plantilla =
        await obtenerPlantillaFichaEstacion();


    const fragmento =
        plantilla.content
            .cloneNode(
                true
            );


    const ficha =
        fragmento.querySelector(
            ".ficha-estacion"
        );


    if (!ficha) {

        throw new Error(
            "No se pudo crear la instancia de ficha de estación."
        );

    }


    sustituirCodigoPlantilla(
        ficha,
        codigo
    );


    ficha.dataset
        .estacionDinamica =
        "1";


    ficha.dataset
        .codigoEstacion =
        codigo;


    establecerModoFicha(
        ficha,
        opciones.modo
        ??
        "vertical"
    );


    actualizarIdentidadFicha(
        ficha,
        {
            ...estacion,
            codigo
        }
    );


    montarVisorFicha(
        ficha,
        codigo
    );


    return ficha;

}


/* ==========================================================
   DISTRIBUCIÓN DE REJILLA
   ========================================================== */


/*
 * La ficha horizontal solo tiene sentido cuando Actualidad está
 * mostrando realmente la rejilla en dos columnas.
 *
 * Por debajo de 851 px Actualidad pasa a una sola columna, por lo
 * que TODAS las fichas deben ser verticales, incluida la última.
 */
export function actualizarModosRejilla(
    rejilla
) {

    if (!rejilla) {
        return;
    }


    const fichas =
        Array.from(
            rejilla.querySelectorAll(
                ":scope > .ficha-estacion"
            )
        );


    /*
     * Estado base:
     * todas las fichas son siempre verticales.
     */
    fichas.forEach(
        ficha => {

            establecerModoFicha(
                ficha,
                "vertical"
            );

        }
    );


    /*
     * Actualidad solo utiliza dos columnas a partir de 851 px.
     *
     * En móvil y tableta estrecha nunca se fuerza una ficha
     * horizontal aunque el número de estaciones sea impar.
     */
    const rejillaDosColumnas =
        window.matchMedia(
            "(min-width: 851px)"
        ).matches;


    if (!rejillaDosColumnas) {

        return;

    }


    /*
     * En escritorio, si el número de estaciones es impar,
     * únicamente la última ocupa las dos columnas y utiliza
     * el diseño horizontal.
     */
    if (
        fichas.length
        %
        2
        ===
        1
    ) {

        establecerModoFicha(
            fichas[
                fichas.length
                -
                1
            ],
            "horizontal"
        );

    }

}


/* ==========================================================
   ACTUALIZACIÓN
   ========================================================== */


export function actualizarFichaEstacion(
    ficha,
    estacion
) {

    if (
        !ficha
        ||
        !estacion
    ) {

        return;

    }


    const codigo =
        normalizarCodigoEstacion(
            estacion.codigo
        );


    if (!codigo) {
        return;
    }


    ficha.dataset
        .codigoEstacion =
        codigo;


    actualizarIdentidadFicha(
        ficha,
        {
            ...estacion,
            codigo
        }
    );


    montarVisorFicha(
        ficha,
        codigo
    );

}


// Fin de fichero: js/ficha-estacion.js