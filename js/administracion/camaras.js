/*
 * MeteoArchidona
 * Administración de cámaras
 *
 * Módulo de interfaz para consultar y administrar cámaras lógicas.
 *
 * La API es la fuente de verdad.
 *
 * Este módulo no registra dispositivos, descubre cámaras Reolink
 * ni modifica sus características técnicas.
 *
 * Operaciones:
 *
 * - GET /admin/camaras:
 *   listado completo;
 *
 * - PATCH /admin/camaras/{id}:
 *   nombre público y habilitación.
 *
 * La autenticación se reutiliza desde:
 *
 *     js/administracion/api.js
 *
 * Los elementos HTML del módulo se integrarán posteriormente
 * en administracion.html.
 */

import {
    $,
    estadoAdministracion,
    mostrarEstado
} from "./estado.js?v=20261010-cache1";

import {
    peticionJson
} from "./api.js?v=20261010-cache1";


const RUTA_CAMARAS =
    "/admin/camaras";


let camaras = [];

let camaraSeleccionadaId = null;

let eventosConfigurados = false;

let guardando = false;


/* ==========================================================
   ESTACIONES
   ========================================================== */

function nombreEstacion(
    estacionId
){

    const estacion =
        estadoAdministracion.estaciones.find(
            item =>
                item.id === estacionId
        );

    if(!estacion){

        return `Estación ${estacionId}`;

    }

    return (
        estacion.nombre_publico
        ||
        estacion.codigo
    );

}


/* ==========================================================
   NOMBRE DE CÁMARA
   ========================================================== */

function nombreCamara(
    camara
){

    return (
        camara.nombre_publico
        ||
        camara.nombre_tecnico
        ||
        `${camara.tipo_vista} · Cámara ${camara.id}`
    );

}


/* ==========================================================
   FECHAS
   ========================================================== */

function textoFecha(
    valor
){

    if(!valor){
        return "—";
    }

    const fecha =
        new Date(
            valor
        );

    if(
        Number.isNaN(
            fecha.getTime()
        )
    ){
        return "—";
    }

    return fecha.toLocaleString(
        "es-ES"
    );

}


/* ==========================================================
   ELEMENTOS
   ========================================================== */

function crearElemento(
    etiqueta,
    clase,
    texto
){

    const elemento =
        document.createElement(
            etiqueta
        );

    if(clase){

        elemento.className =
            clase;

    }

    if(
        texto !== undefined
        &&
        texto !== null
    ){

        elemento.textContent =
            String(
                texto
            );

    }

    return elemento;

}


function agregarChip(
    contenedor,
    texto,
    clase=""
){

    contenedor.appendChild(
        crearElemento(
            "span",
            `chip ${clase}`.trim(),
            texto
        )
    );

}


/* ==========================================================
   FILTRO DE ESTACIONES
   ========================================================== */

function actualizarFiltroEstaciones(){

    const selector =
        $("filtroCamaraEstacion");

    if(!selector){
        return;
    }

    const valorAnterior =
        selector.value;

    selector.replaceChildren(
        new Option(
            "Todas las estaciones",
            ""
        )
    );

    for(
        const estacion
        of estadoAdministracion.estaciones
    ){

        selector.appendChild(
            new Option(
                estacion.nombre_publico
                ||
                estacion.codigo,

                String(
                    estacion.id
                )
            )
        );

    }

    const existe =
        [...selector.options].some(
            opcion =>
                opcion.value === valorAnterior
        );

    if(existe){

        selector.value =
            valorAnterior;

    }

}


/* ==========================================================
   FILTRADO
   ========================================================== */

function obtenerCamarasFiltradas(){

    const texto =
        (
            $("filtroCamaraTexto")?.value
            ||
            ""
        )
        .trim()
        .toLocaleLowerCase(
            "es-ES"
        );

    const estacion =
        $("filtroCamaraEstacion")?.value
        ||
        "";

    const habilitacion =
        $("filtroCamaraHabilitada")?.value
        ||
        "";

    return camaras.filter(
        camara=>{

            if(
                estacion
                &&
                String(
                    camara.estacion_id
                ) !== estacion
            ){
                return false;
            }

            if(
                habilitacion === "si"
                &&
                !camara.habilitada
            ){
                return false;
            }

            if(
                habilitacion === "no"
                &&
                camara.habilitada
            ){
                return false;
            }

            if(!texto){
                return true;
            }

            const datos = [
                camara.id,
                nombreCamara(camara),
                camara.nombre_tecnico,
                camara.identificador_dispositivo,
                camara.identificador_vista,
                camara.modelo,
                nombreEstacion(
                    camara.estacion_id
                )
            ];

            return datos.some(
                valor=>
                    String(
                        valor ?? ""
                    )
                    .toLocaleLowerCase(
                        "es-ES"
                    )
                    .includes(
                        texto
                    )
            );

        }
    );

}


/* ==========================================================
   LISTADO DE CÁMARAS
   ========================================================== */

function renderizarListado(){

    const contenedor =
        $("listaCamaras");

    if(!contenedor){
        return;
    }

    contenedor.replaceChildren();

    const resultado =
        obtenerCamarasFiltradas();

    if(!resultado.length){

        contenedor.appendChild(
            crearElemento(
                "div",
                "lista-vacia",
                camaras.length
                    ?
                    "No hay cámaras que coincidan con los filtros."
                    :
                    "Todavía no hay cámaras registradas."
            )
        );

        return;

    }

    for(
        const camara
        of resultado
    ){

        const boton =
            crearElemento(
                "button",
                "estacion-card"
                +
                (
                    camara.id === camaraSeleccionadaId
                    ?
                    " seleccionada"
                    :
                    ""
                )
            );

        boton.type =
            "button";

        boton.append(
            crearElemento(
                "div",
                "estacion-codigo",
                `#${camara.id} · ${nombreEstacion(
                    camara.estacion_id
                )}`
            ),

            crearElemento(
                "div",
                "estacion-nombre",
                nombreCamara(
                    camara
                )
            )
        );

        const chips =
            crearElemento(
                "div",
                "chips"
            );

        agregarChip(
            chips,
            camara.tipo_vista
        );

        agregarChip(
            chips,
            camara.habilitada
                ?
                "Habilitada"
                :
                "Deshabilitada",

            camara.habilitada
                ?
                "chip-activa"
                :
                "chip-inactiva"
        );

        agregarChip(
            chips,
            camara.en_linea
                ?
                "En línea"
                :
                "Sin conexión",

            camara.en_linea
                ?
                "chip-activa"
                :
                "chip-inactiva"
        );

        boton.appendChild(
            chips
        );

        boton.addEventListener(
            "click",
            ()=>
                seleccionarCamara(
                    camara.id
                )
        );

        contenedor.appendChild(
            boton
        );

    }

}


/* ==========================================================
   DETALLES TÉCNICOS
   ========================================================== */

function renderizarDetalles(
    camara
){

    const contenedor =
        $("datosTecnicosCamara");

    if(!contenedor){
        return;
    }

    contenedor.replaceChildren();

    if(!camara){

        contenedor.appendChild(
            crearElemento(
                "div",
                "lista-vacia",
                "Selecciona una cámara."
            )
        );

        return;

    }

    const detalles = [

        [
            "Estación",
            nombreEstacion(
                camara.estacion_id
            )
        ],

        [
            "Integración",
            camara.codigo_integracion
        ],

        [
            "Dispositivo",
            camara.identificador_dispositivo
        ],

        [
            "Vista",
            camara.identificador_vista
        ],

        [
            "Tipo de vista",
            camara.tipo_vista
        ],

        [
            "Fabricante",
            camara.fabricante
        ],

        [
            "Modelo",
            camara.modelo
        ],

        [
            "N.º de serie",
            camara.numero_serie
        ],

        [
            "Firmware",
            camara.firmware
        ],

        [
            "Agente MeteoCam",
            camara.identificador_agente
        ],

        [
            "Captura",
            camara.capacidad_captura
                ?
                "Sí"
                :
                "No"
        ],

        [
            "Streaming",
            camara.capacidad_stream
                ?
                "Sí"
                :
                "No"
        ],

        [
            "PTZ",
            camara.capacidad_ptz
                ?
                "Sí"
                :
                "No"
        ],

        [
            "Presets",
            camara.capacidad_preset
                ?
                "Sí"
                :
                "No"
        ],

        [
            "Conexión informada",
            camara.en_linea
                ?
                "En línea"
                :
                "Sin conexión"
        ],

        [
            "Última detección",
            textoFecha(
                camara.fecha_ultima_deteccion
            )
        ],

        [
            "Última sincronización",
            textoFecha(
                camara.fecha_ultima_sincronizacion
            )
        ]

    ];

    for(
        const [etiqueta, valor]
        of detalles
    ){

        const ficha =
            crearElemento(
                "div",
                "metadato"
            );

        ficha.append(
            crearElemento(
                "div",
                "metadato-etiqueta",
                etiqueta
            ),

            crearElemento(
                "div",
                "metadato-valor",
                valor ?? "—"
            )
        );

        contenedor.appendChild(
            ficha
        );

    }

}


/* ==========================================================
   FORMULARIO
   ========================================================== */

function renderizarSeleccion(){

    const camara =
        camaras.find(
            item =>
                item.id === camaraSeleccionadaId
        );

    const nombre =
        $("campoCamaraNombrePublico");

    const habilitada =
        $("campoCamaraHabilitada");

    const guardar =
        $("botonGuardarCamara");

    const titulo =
        $("tituloFormularioCamara");

    if(titulo){

        titulo.textContent =
            camara
                ?
                `Cámara #${camara.id} · ${camara.tipo_vista}`
                :
                "Selecciona una cámara";

    }

    if(nombre){

        nombre.value =
            camara?.nombre_publico
            ||
            "";

        nombre.disabled =
            !camara;

    }

    if(habilitada){

        habilitada.checked =
            camara?.habilitada === true;

        habilitada.disabled =
            !camara;

    }

    if(guardar){

        guardar.disabled =
            !camara
            ||
            guardando;

    }

    renderizarDetalles(
        camara
    );

}


function seleccionarCamara(
    camaraId
){

    camaraSeleccionadaId =
        camaraId;

    renderizarListado();

    renderizarSeleccion();

    mostrarEstado(
        $("estadoFormularioCamara"),
        ""
    );

}


/* ==========================================================
   GUARDAR CAMBIOS ADMINISTRATIVOS
   ========================================================== */

async function guardarCamara(
    evento
){

    evento.preventDefault();

    if(guardando){
        return;
    }

    const camara =
        camaras.find(
            item =>
                item.id === camaraSeleccionadaId
        );

    if(!camara){
        return;
    }

    const nombre =
        $("campoCamaraNombrePublico")
        .value
        .trim();

    const habilitada =
        $("campoCamaraHabilitada")
        .checked;

    const cambios = {};

    if(
        nombre
        !==
        (
            camara.nombre_publico
            ||
            ""
        )
    ){

        cambios.nombre_publico =
            nombre || null;

    }

    if(
        habilitada
        !==
        camara.habilitada
    ){

        cambios.habilitada =
            habilitada;

    }

    if(
        !Object.keys(
            cambios
        ).length
    ){

        mostrarEstado(
            $("estadoFormularioCamara"),
            "No hay cambios que guardar.",
            "info"
        );

        return;

    }

    guardando = true;

    $("botonGuardarCamara").disabled =
        true;

    mostrarEstado(
        $("estadoFormularioCamara"),
        "Guardando cambios...",
        "info"
    );

    try{

        const actualizada =
            await peticionJson(
                `${RUTA_CAMARAS}/${camara.id}`,
                {
                    method:"PATCH",
                    body:JSON.stringify(
                        cambios
                    )
                }
            );

        camaras =
            camaras.map(
                item =>
                    item.id === actualizada.id
                    ?
                    actualizada
                    :
                    item
            );

        renderizarListado();

        renderizarSeleccion();

        mostrarEstado(
            $("estadoFormularioCamara"),
            "Cámara actualizada.",
            "ok"
        );

    }catch(error){

        mostrarEstado(
            $("estadoFormularioCamara"),
            error.message
            ||
            "No se ha podido actualizar la cámara.",
            "error"
        );

    }finally{

        guardando = false;

        $("botonGuardarCamara").disabled =
            false;

    }

}


/* ==========================================================
   CARGAR CÁMARAS
   ========================================================== */

export async function cargarCamaras(){

    try{

        const resultado =
            await peticionJson(
                RUTA_CAMARAS
            );

        if(
            !Array.isArray(
                resultado
            )
        ){

            throw new Error(
                "La API no ha devuelto un catálogo válido de cámaras."
            );

        }

        camaras =
            resultado;

        if(
            !camaras.some(
                item =>
                    item.id === camaraSeleccionadaId
            )
        ){

            camaraSeleccionadaId =
                null;

        }

        actualizarFiltroEstaciones();

        renderizarListado();

        renderizarSeleccion();

        mostrarEstado(
            $("estadoCamaras"),
            `${camaras.length} cámaras registradas.`,
            "ok"
        );

    }catch(error){

        mostrarEstado(
            $("estadoCamaras"),
            error.message
            ||
            "No se ha podido cargar el catálogo de cámaras.",
            "error"
        );

        throw error;

    }

}


/* ==========================================================
   EVENTOS
   ========================================================== */

export function configurarEventosCamaras(){

    if(
        eventosConfigurados
        ||
        !$("listaCamaras")
    ){
        return;
    }

    eventosConfigurados = true;

    for(
        const id
        of [
            "filtroCamaraTexto",
            "filtroCamaraEstacion",
            "filtroCamaraHabilitada"
        ]
    ){

        $(id)?.addEventListener(
            "input",
            renderizarListado
        );

    }

    $("botonRecargarCamaras")?.addEventListener(
        "click",
        ()=>
            void cargarCamaras()
                .catch(
                    ()=>{}
                )
    );

    $("formularioCamara")?.addEventListener(
        "submit",
        guardarCamara
    );

    renderizarSeleccion();

}


/* ==========================================================
   LIMPIEZA DE SESIÓN
   ========================================================== */

export function limpiarCamaras(){

    camaras = [];

    camaraSeleccionadaId = null;

    guardando = false;

    $("listaCamaras")?.replaceChildren();

    mostrarEstado(
        $("estadoCamaras"),
        ""
    );

    mostrarEstado(
        $("estadoFormularioCamara"),
        ""
    );

    renderizarSeleccion();

}


// Fin de fichero: js/administracion/camaras.js