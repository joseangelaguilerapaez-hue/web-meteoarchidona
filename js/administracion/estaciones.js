/*
 * MeteoArchidona
 * Administración
 *
 * Gestión administrativa de estaciones.
 *
 * Responsabilidades:
 *
 * - cargar estaciones desde la API;
 * - mostrar el listado administrativo;
 * - aplicar filtros;
 * - actualizar los contadores del resumen;
 * - crear una nueva estación;
 * - cargar una estación existente en el formulario;
 * - guardar altas y modificaciones;
 * - gestionar la estación de referencia general;
 * - informar a otros módulos cuando cambia la estación seleccionada
 *   o el catálogo de estaciones disponible.
 *
 * Este módulo todavía no sustituye al código equivalente de
 * js/administracion.js. La conexión definitiva se realizará cuando
 * estén preparados todos los módulos de Administración.
 */


import {
    $,
    estadoAdministracion,
    mostrarEstado,
    crearOpcion,
    asegurarOpcionSelect,
    valorNullable,
    numeroNullable,
    formatearFecha
} from "./estado.js";

import {
    RUTA_ESTACIONES,
    peticionJson
} from "./api.js";


/* ==========================================================
   CALLBACKS DE INTEGRACIÓN
   ========================================================== */

/*
 * El módulo de estaciones no debe conocer internamente el módulo
 * de simulación.
 *
 * Cuando se seleccione una estación o se actualice la lista,
 * principal.js podrá conectar estas notificaciones con simulacion.js.
 */

let callbackEstacionSeleccionada=null;
let callbackEstacionesActualizadas=null;


/* ==========================================================
   CONFIGURACIÓN DE CALLBACKS
   ========================================================== */

export function configurarCallbacksEstaciones({
    alSeleccionarEstacion=null,
    alActualizarEstaciones=null
}={}){

    callbackEstacionSeleccionada=
        typeof alSeleccionarEstacion
        ===
        "function"
        ?
        alSeleccionarEstacion
        :
        null;

    callbackEstacionesActualizadas=
        typeof alActualizarEstaciones
        ===
        "function"
        ?
        alActualizarEstaciones
        :
        null
}


/* ==========================================================
   ETIQUETAS
   ========================================================== */

export function etiquetaEstado(
    valor
){

    return (
        {
            PROYECTADA:
                "Proyectada",

            CONSTRUCCION:
                "En construcción",

            DATOS_SIMULADOS:
                "Datos simulados",

            ACTIVA:
                "Activa",

            INACTIVA:
                "Inactiva"
        }[valor]
        ||
        valor
    )
}


export function etiquetaProveedor(
    valor
){

    return (
        {
            WEATHERLINK:
                "WeatherLink",

            ECOWITT:
                "Ecowitt",

            SIMULADOR:
                "Simulador"
        }[valor]
        ||
        valor
    )
}


/* ==========================================================
   CATÁLOGOS BÁSICOS DE ESTACIONES
   ========================================================== */

export function cargarOpcionesEstaciones(){

    const campoEstado=
        $("campoEstado");

    const campoProveedor=
        $("campoProveedor");

    const filtroEstado=
        $("filtroEstado");

    const filtroProveedor=
        $("filtroProveedor");

    if(
        !campoEstado
        ||
        !campoProveedor
        ||
        !filtroEstado
        ||
        !filtroProveedor
    ){
        return
    }

    const estadoCampoPrevio=
        campoEstado.value;

    const proveedorCampoPrevio=
        campoProveedor.value;

    const estadoFiltroPrevio=
        filtroEstado.value;

    const proveedorFiltroPrevio=
        filtroProveedor.value;

    campoEstado.replaceChildren();

    campoProveedor.replaceChildren();

    filtroEstado.replaceChildren(
        crearOpcion(
            "",
            "Todos los estados"
        )
    );

    filtroProveedor.replaceChildren(
        crearOpcion(
            "",
            "Todos los proveedores"
        )
    );

    estadoAdministracion
        .catalogos
        .estados
        .forEach(
            valor=>{

                campoEstado.appendChild(
                    crearOpcion(
                        valor,
                        etiquetaEstado(
                            valor
                        )
                    )
                );

                filtroEstado.appendChild(
                    crearOpcion(
                        valor,
                        etiquetaEstado(
                            valor
                        )
                    )
                )
            }
        );

    estadoAdministracion
        .catalogos
        .proveedores
        .forEach(
            valor=>{

                campoProveedor.appendChild(
                    crearOpcion(
                        valor,
                        etiquetaProveedor(
                            valor
                        )
                    )
                );

                filtroProveedor.appendChild(
                    crearOpcion(
                        valor,
                        etiquetaProveedor(
                            valor
                        )
                    )
                )
            }
        );

    asegurarOpcionSelect(
        campoEstado,
        estadoCampoPrevio
    );

    asegurarOpcionSelect(
        campoProveedor,
        proveedorCampoPrevio
    );

    asegurarOpcionSelect(
        filtroEstado,
        estadoFiltroPrevio
    );

    asegurarOpcionSelect(
        filtroProveedor,
        proveedorFiltroPrevio
    )
}


/* ==========================================================
   ESTACIÓN DE REFERENCIA GENERAL
   ========================================================== */

export function rellenarSelectReferenciaGeneral(
    estacionActualId=null,
    valorSeleccionado=undefined
){

    const select=
        $("campoEstacionReferenciaGeneral");

    if(!select){
        return
    }

    const previo=
        valorSeleccionado
        !==
        undefined
        ?
        valorSeleccionado
        :
        select.value;

    select.replaceChildren(
        crearOpcion(
            "",
            "Sin referencia general"
        )
    );

    estadoAdministracion
        .estaciones
        .forEach(
            estacion=>{

                if(
                    estacionActualId!==null
                    &&
                    Number(
                        estacion.id
                    )
                    ===
                    Number(
                        estacionActualId
                    )
                ){
                    return
                }

                select.appendChild(
                    crearOpcion(
                        String(
                            estacion.id
                        ),
                        `${
                            estacion.codigo
                        } · ${
                            estacion.nombre_publico
                        }`
                    )
                )
            }
        );

    asegurarOpcionSelect(
        select,
        previo
    )
}


export function actualizarSelectReferenciaGeneral(){

    const estacionActual=
        estadoAdministracion.codigoEdicion
        ?
        estadoAdministracion
            .estaciones
            .find(
                estacion=>
                    estacion.codigo
                    ===
                    estadoAdministracion.codigoEdicion
            )
        :
        null;

    rellenarSelectReferenciaGeneral(
        estacionActual?.id
        ??
        null
    )
}


/* ==========================================================
   RESUMEN
   ========================================================== */

export function actualizarResumenEstaciones(){

    const total=
        $("resumenTotal");

    const activas=
        $("resumenActivas");

    const simuladas=
        $("resumenSimuladas");

    const preparacion=
        $("resumenPreparacion");

    if(total){

        total.textContent=
            String(
                estadoAdministracion
                    .estaciones
                    .length
            )
    }

    if(activas){

        activas.textContent=
            String(
                estadoAdministracion
                    .estaciones
                    .filter(
                        estacion=>
                            estacion.activa
                    )
                    .length
            )
    }

    if(simuladas){

        simuladas.textContent=
            String(
                estadoAdministracion
                    .estaciones
                    .filter(
                        estacion=>
                            estacion.estado
                            ===
                            "DATOS_SIMULADOS"
                    )
                    .length
            )
    }

    if(preparacion){

        preparacion.textContent=
            String(
                estadoAdministracion
                    .estaciones
                    .filter(
                        estacion=>
                            estacion.estado
                            ===
                            "PROYECTADA"
                            ||
                            estacion.estado
                            ===
                            "CONSTRUCCION"
                    )
                    .length
            )
    }
}


/* ==========================================================
   PRESENTACIÓN DEL LISTADO
   ========================================================== */

function localizacion(
    estacion
){

    const partes=[
        estacion.ciudad,
        estacion.region,
        estacion.pais
    ].filter(
        valor=>
            valor
            &&
            String(
                valor
            ).trim()
    );

    return partes.length
        ?
        partes.join(
            " · "
        )
        :
        "Ubicación no especificada"
}


function estacionesFiltradas(){

    const filtroTexto=
        $("filtroTexto");

    const filtroEstado=
        $("filtroEstado");

    const filtroProveedor=
        $("filtroProveedor");

    const texto=
        filtroTexto
        ?
        filtroTexto
            .value
            .trim()
            .toLocaleLowerCase(
                "es"
            )
        :
        "";

    const estadoFiltro=
        filtroEstado
        ?
        filtroEstado.value
        :
        "";

    const proveedorFiltro=
        filtroProveedor
        ?
        filtroProveedor.value
        :
        "";

    return estadoAdministracion
        .estaciones
        .filter(
            estacion=>{

                if(
                    estadoFiltro
                    &&
                    estacion.estado
                    !==
                    estadoFiltro
                ){
                    return false
                }

                if(
                    proveedorFiltro
                    &&
                    estacion.codigo_proveedor
                    !==
                    proveedorFiltro
                ){
                    return false
                }

                if(!texto){
                    return true
                }

                return [
                    estacion.codigo,
                    estacion.nombre_publico,
                    estacion.ciudad,
                    estacion.region,
                    estacion.pais
                ]
                .filter(
                    valor=>
                        valor!=null
                )
                .join(
                    " "
                )
                .toLocaleLowerCase(
                    "es"
                )
                .includes(
                    texto
                )
            }
        )
}


function crearChip(
    texto,
    clase=""
){

    const elemento=
        document.createElement(
            "span"
        );

    elemento.className=
        "chip"
        +
        (
            clase
            ?
            ` ${clase}`
            :
            ""
        );

    elemento.textContent=
        texto;

    return elemento
}


export function renderizarEstaciones(){

    const lista=
        $("listaEstaciones");

    if(!lista){
        return
    }

    lista.replaceChildren();

    const resultado=
        estacionesFiltradas();

    if(!resultado.length){

        const vacio=
            document.createElement(
                "div"
            );

        vacio.className=
            "lista-vacia";

        vacio.textContent=
            "No hay estaciones que coincidan con los filtros.";

        lista.appendChild(
            vacio
        );

        return
    }

    resultado.forEach(
        estacion=>{

            const boton=
                document.createElement(
                    "button"
                );

            boton.type=
                "button";

            boton.className=
                "estacion-card"
                +
                (
                    estadoAdministracion
                        .codigoEdicion
                    ===
                    estacion.codigo
                    ?
                    " seleccionada"
                    :
                    ""
                );

            const codigo=
                document.createElement(
                    "div"
                );

            codigo.className=
                "estacion-codigo";

            codigo.textContent=
                estacion.codigo;

            const nombre=
                document.createElement(
                    "div"
                );

            nombre.className=
                "estacion-nombre";

            nombre.textContent=
                estacion.nombre_publico;

            const chips=
                document.createElement(
                    "div"
                );

            chips.className=
                "chips";

            chips.append(
                crearChip(
                    etiquetaEstado(
                        estacion.estado
                    )
                ),

                crearChip(
                    etiquetaProveedor(
                        estacion.codigo_proveedor
                    )
                ),

                crearChip(
                    estacion.activa
                    ?
                    "Activa"
                    :
                    "No activa",
                    estacion.activa
                    ?
                    "chip-activa"
                    :
                    "chip-inactiva"
                )
            );

            const ubicacion=
                document.createElement(
                    "div"
                );

            ubicacion.className=
                "estacion-localizacion";

            ubicacion.textContent=
                localizacion(
                    estacion
                );

            boton.append(
                codigo,
                nombre,
                chips,
                ubicacion
            );

            boton.addEventListener(
                "click",
                ()=>
                    void seleccionarEstacion(
                        estacion.codigo
                    )
            );

            lista.appendChild(
                boton
            )
        }
    )
}


/* ==========================================================
   FORMULARIO DE ESTACIÓN
   ========================================================== */

export function formularioNuevaEstacion(){

    estadoAdministracion.codigoEdicion=
        null;

    const formulario=
        $("formularioEstacion");

    formulario?.reset();

    if($("tituloFormulario")){

        $("tituloFormulario").textContent=
            "Nueva estación"
    }

    if($("codigoSeleccionado")){

        $("codigoSeleccionado").textContent=
            ""
    }

    if($("campoCodigo")){

        $("campoCodigo").disabled=
            false
    }

    if($("botonGuardar")){

        $("botonGuardar").textContent=
            "Crear estación"
    }

    $("panelMetadatos")
        ?.classList
        .add(
            "oculto"
        );

    $("panelReglasEstacion")
        ?.classList
        .add(
            "oculto"
        );

    mostrarEstado(
        $("estadoFormulario"),
        ""
    );

    if(
        estadoAdministracion
            .catalogos
            .estados
            .includes(
                "PROYECTADA"
            )
        &&
        $("campoEstado")
    ){
        $("campoEstado").value=
            "PROYECTADA"
    }

    if(
        estadoAdministracion
            .catalogos
            .proveedores
            .includes(
                "SIMULADOR"
            )
        &&
        $("campoProveedor")
    ){
        $("campoProveedor").value=
            "SIMULADOR"
    }

    rellenarSelectReferenciaGeneral(
        null,
        null
    );

    renderizarEstaciones();

    $("panelFormularioEstacion")
        ?.scrollIntoView(
            {
                behavior:"smooth",
                block:"start"
            }
        )
}


export function cargarFormularioEstacion(
    estacion
){

    estadoAdministracion.codigoEdicion=
        estacion.codigo;

    if($("tituloFormulario")){

        $("tituloFormulario").textContent=
            "Modificar estación"
    }

    if($("codigoSeleccionado")){

        $("codigoSeleccionado").textContent=
            estacion.codigo
    }

    if($("campoCodigo")){

        $("campoCodigo").value=
            estacion.codigo;

        $("campoCodigo").disabled=
            true
    }

    if($("campoNombre")){

        $("campoNombre").value=
            estacion.nombre_publico
            ||
            ""
    }

    if($("campoDescripcion")){

        $("campoDescripcion").value=
            estacion.descripcion
            ||
            ""
    }

    if($("campoEstado")){

        asegurarOpcionSelect(
            $("campoEstado"),
            estacion.estado
        )
    }

    if($("campoProveedor")){

        asegurarOpcionSelect(
            $("campoProveedor"),
            estacion.codigo_proveedor
        )
    }

    rellenarSelectReferenciaGeneral(
        estacion.id,
        estacion.estacion_referencia_general_id
    );

    if($("campoCiudad")){

        $("campoCiudad").value=
            estacion.ciudad
            ||
            ""
    }

    if($("campoRegion")){

        $("campoRegion").value=
            estacion.region
            ||
            ""
    }

    if($("campoPais")){

        $("campoPais").value=
            estacion.pais
            ||
            ""
    }

    if($("campoZonaHoraria")){

        $("campoZonaHoraria").value=
            estacion.zona_horaria
            ||
            ""
    }

    if($("campoLatitud")){

        $("campoLatitud").value=
            estacion.latitud
            ??
            ""
    }

    if($("campoLongitud")){

        $("campoLongitud").value=
            estacion.longitud
            ??
            ""
    }

    if($("botonGuardar")){

        $("botonGuardar").textContent=
            "Guardar cambios"
    }

    if($("metaId")){

        $("metaId").textContent=
            estacion.id
            ??
            "—"
    }

    if($("metaActiva")){

        $("metaActiva").textContent=
            estacion.activa
            ?
            "Sí"
            :
            "No"
    }

    if($("metaWeatherLinkId")){

        $("metaWeatherLinkId").textContent=
            estacion.weatherlink_station_id
            ??
            "—"
    }

    if($("metaWeatherLinkNombre")){

        $("metaWeatherLinkNombre").textContent=
            estacion.nombre_weatherlink
            ||
            "—"
    }

    if($("metaCreada")){

        $("metaCreada").textContent=
            formatearFecha(
                estacion.creado_en
            )
    }

    if($("metaActualizada")){

        $("metaActualizada").textContent=
            formatearFecha(
                estacion.actualizado_en
            )
    }

    $("panelMetadatos")
        ?.classList
        .remove(
            "oculto"
        );

    $("panelReglasEstacion")
        ?.classList
        .remove(
            "oculto"
        );

    mostrarEstado(
        $("estadoFormulario"),
        ""
    );

    renderizarEstaciones()
}


/* ==========================================================
   SELECCIÓN DE ESTACIÓN
   ========================================================== */

export async function seleccionarEstacion(
    codigo
){

    mostrarEstado(
        $("estadoFormulario"),
        "Cargando estación...",
        "info"
    );

    try{

        const estacion=
            await peticionJson(
                `${
                    RUTA_ESTACIONES
                }/${
                    encodeURIComponent(
                        codigo
                    )
                }`
            );

        cargarFormularioEstacion(
            estacion
        );

        if(callbackEstacionSeleccionada){

            await callbackEstacionSeleccionada(
                estacion
            )
        }

        $("panelFormularioEstacion")
            ?.scrollIntoView(
                {
                    behavior:"smooth",
                    block:"start"
                }
            );

        return estacion

    }catch(error){

        mostrarEstado(
            $("estadoFormulario"),
            error.message,
            "error"
        );

        throw error
    }
}


/* ==========================================================
   CUERPO DE LA PETICIÓN
   ========================================================== */

export function cuerpoEstacion(){

    return {
        codigo:
            $("campoCodigo")
                ?.value
                .trim()
            ||
            "",

        nombre_publico:
            $("campoNombre")
                ?.value
                .trim()
            ||
            "",

        descripcion:
            valorNullable(
                $("campoDescripcion")
                    ?.value
            ),

        estado:
            $("campoEstado")
                ?.value
            ||
            "",

        codigo_proveedor:
            $("campoProveedor")
                ?.value
            ||
            "",

        estacion_referencia_general_id:
            numeroNullable(
                $("campoEstacionReferenciaGeneral")
                    ?.value
            ),

        ciudad:
            valorNullable(
                $("campoCiudad")
                    ?.value
            ),

        region:
            valorNullable(
                $("campoRegion")
                    ?.value
            ),

        pais:
            valorNullable(
                $("campoPais")
                    ?.value
            ),

        zona_horaria:
            valorNullable(
                $("campoZonaHoraria")
                    ?.value
            ),

        latitud:
            numeroNullable(
                $("campoLatitud")
                    ?.value
            ),

        longitud:
            numeroNullable(
                $("campoLongitud")
                    ?.value
            )
    }
}


/* ==========================================================
   GUARDADO
   ========================================================== */

export async function guardarEstacion(
    evento
){

    evento?.preventDefault();

    const boton=
        $("botonGuardar");

    if(boton){

        boton.disabled=
            true
    }

    const estabaEditando=
        !!estadoAdministracion.codigoEdicion;

    mostrarEstado(
        $("estadoFormulario"),
        estabaEditando
        ?
        "Guardando cambios..."
        :
        "Creando estación...",
        "info"
    );

    try{

        const datos=
            cuerpoEstacion();

        let resultado;

        if(
            estadoAdministracion.codigoEdicion
        ){

            const codigoAnterior=
                estadoAdministracion.codigoEdicion;

            delete datos.codigo;

            resultado=
                await peticionJson(
                    `${
                        RUTA_ESTACIONES
                    }/${
                        encodeURIComponent(
                            codigoAnterior
                        )
                    }`,
                    {
                        method:"PATCH",

                        body:
                            JSON.stringify(
                                datos
                            )
                    }
                );

        }else{

            resultado=
                await peticionJson(
                    RUTA_ESTACIONES,
                    {
                        method:"POST",

                        body:
                            JSON.stringify(
                                datos
                            )
                    }
                )
        }

        await cargarEstaciones();

        await seleccionarEstacion(
            resultado.codigo
        );

        mostrarEstado(
            $("estadoFormulario"),
            estabaEditando
            ?
            "Estación actualizada correctamente."
            :
            "Estación creada correctamente.",
            "ok"
        );

        mostrarEstado(
            $("estadoPanel"),
            "Datos administrativos actualizados.",
            "ok"
        );

        return resultado

    }catch(error){

        mostrarEstado(
            $("estadoFormulario"),
            error.message,
            "error"
        );

        throw error

    }finally{

        if(boton){

            boton.disabled=
                false
        }
    }
}


/* ==========================================================
   CARGA DE ESTACIONES
   ========================================================== */

export async function cargarEstaciones(){

    const datos=
        await peticionJson(
            RUTA_ESTACIONES
        );

    estadoAdministracion.estaciones=
        Array.isArray(
            datos
        )
        ?
        datos
        :
        [];

    actualizarResumenEstaciones();

    renderizarEstaciones();

    actualizarSelectReferenciaGeneral();

    if(callbackEstacionesActualizadas){

        await callbackEstacionesActualizadas(
            estadoAdministracion.estaciones
        )
    }

    return estadoAdministracion.estaciones
}


/* ==========================================================
   EVENTOS
   ========================================================== */

export function configurarEventosEstaciones(){

    $("filtroTexto")
        ?.addEventListener(
            "input",
            renderizarEstaciones
        );

    $("filtroEstado")
        ?.addEventListener(
            "change",
            renderizarEstaciones
        );

    $("filtroProveedor")
        ?.addEventListener(
            "change",
            renderizarEstaciones
        );

    $("botonNuevaEstacion")
        ?.addEventListener(
            "click",
            formularioNuevaEstacion
        );

    $("botonCancelar")
        ?.addEventListener(
            "click",
            formularioNuevaEstacion
        );

    $("formularioEstacion")
        ?.addEventListener(
            "submit",
            guardarEstacion
        )
}


// Fin de fichero: js/administracion/estaciones.js