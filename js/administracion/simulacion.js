/*
 * MeteoArchidona
 * Administración
 *
 * Gestión de reglas de simulación y estaciones de referencia.
 *
 * Responsabilidades:
 *
 * - cargar los catálogos de simulación en los desplegables;
 * - mostrar las reglas de una estación;
 * - crear y modificar reglas;
 * - crear y modificar estaciones de referencia de cada regla;
 * - reutilizar la estación de referencia general cuando corresponda;
 * - mantener sincronizado el formulario de simulación con el
 *   estado compartido de Administración.
 *
 * Este módulo todavía no sustituye al código equivalente de
 * js/administracion.js. La conexión definitiva se realizará
 * desde principal.js cuando todos los módulos estén preparados.
 */


import {
    $,
    estadoAdministracion,
    mostrarEstado,
    crearOpcion,
    asegurarOpcionSelect,
    valorNullable,
    numeroNullable
} from "./estado.js";

import {
    RUTA_ESTACIONES,
    peticionJson
} from "./api.js";


/* ==========================================================
   ETIQUETAS DE CATÁLOGOS
   ========================================================== */

function etiquetaEstacionalidad(
    valor
){

    return (
        {
            INVIERNO:
                "INVIERNO",

            PRIMAVERA:
                "PRIMAVERA",

            VERANO:
                "VERANO",

            OTONO:
                "OTOÑO"
        }[valor]
        ||
        valor
    )
}


function etiquetaFranjaDia(
    valor
){

    return (
        {
            NOCHE:
                "NOCHE",

            MANANA:
                "MAÑANA",

            MEDIODIA:
                "MEDIODÍA",

            TARDE:
                "TARDE"
        }[valor]
        ||
        valor
    )
}


/* ==========================================================
   CARGA DE SELECTORES DESDE CATÁLOGOS
   ========================================================== */

function rellenarSelectCatalogo(
    select,
    valores,
    {
        textoInicial=null,
        valorInicial="",
        etiqueta=null,
        conservar=true
    }={}
){

    if(!select){
        return
    }

    const previo=
        conservar
        ?
        select.value
        :
        "";

    const opciones=[];

    if(textoInicial!==null){

        opciones.push(
            crearOpcion(
                valorInicial,
                textoInicial
            )
        )
    }

    (
        Array.isArray(
            valores
        )
        ?
        valores
        :
        []
    ).forEach(
        valor=>{

            opciones.push(
                crearOpcion(
                    valor,
                    etiqueta
                    ?
                    etiqueta(
                        valor
                    )
                    :
                    valor
                )
            )
        }
    );

    select.replaceChildren(
        ...opciones
    );

    if(conservar){

        asegurarOpcionSelect(
            select,
            previo
        )
    }
}


export function cargarOpcionesSimulacion(){

    rellenarSelectCatalogo(
        $("reglaVariableDestino"),
        estadoAdministracion
            .catalogos
            .variables_simulacion,
        {
            textoInicial:
                "Selecciona una variable...",
            conservar:false
        }
    );

    rellenarSelectCatalogo(
        $("origenVariable"),
        estadoAdministracion
            .catalogos
            .variables_simulacion,
        {
            textoInicial:
                "Selecciona una variable...",
            conservar:false
        }
    );

    rellenarSelectCatalogo(
        $("reglaOperacion"),
        estadoAdministracion
            .catalogos
            .operaciones_simulacion,
        {
            conservar:false
        }
    );

    rellenarSelectCatalogo(
        $("reglaEstacionalidad"),
        estadoAdministracion
            .catalogos
            .estacionalidades_simulacion,
        {
            textoInicial:
                "Sin restricción",
            conservar:false,
            etiqueta:
                etiquetaEstacionalidad
        }
    );

    rellenarSelectCatalogo(
        $("reglaFranjaDia"),
        estadoAdministracion
            .catalogos
            .franjas_dia_simulacion,
        {
            textoInicial:
                "Sin restricción",
            conservar:false,
            etiqueta:
                etiquetaFranjaDia
        }
    )
}


/* ==========================================================
   ESTACIONES DE ORIGEN
   ========================================================== */

export function rellenarSelectOrigen(){

    const select=
        $("origenEstacion");

    if(!select){
        return
    }

    const previo=
        select.value;

    select.replaceChildren(
        crearOpcion(
            "",
            "Selecciona una estación..."
        )
    );

    estadoAdministracion
        .estaciones
        .forEach(
            estacion=>{

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

    if(
        Array.from(
            select.options
        ).some(
            elemento=>
                elemento.value
                ===
                previo
        )
    ){
        select.value=
            previo
    }
}


/* ==========================================================
   VISUALIZACIÓN
   ========================================================== */

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


function datoRegla(
    etiqueta,
    valor
){

    const contenedor=
        document.createElement(
            "div"
        );

    contenedor.className=
        "regla-dato";

    const etiquetaElemento=
        document.createElement(
            "div"
        );

    etiquetaElemento.className=
        "regla-dato-etiqueta";

    etiquetaElemento.textContent=
        etiqueta;

    const valorElemento=
        document.createElement(
            "div"
        );

    valorElemento.className=
        "regla-dato-valor";

    valorElemento.textContent=
        valor
        ??
        "—";

    contenedor.append(
        etiquetaElemento,
        valorElemento
    );

    return contenedor
}


export function mostrarEstadoReglas(
    mensaje,
    tipo=""
){

    mostrarEstado(
        $("estadoReglas"),
        mensaje,
        tipo
    )
}


/* ==========================================================
   EDITORES
   ========================================================== */

export function ocultarEditoresReglas(){

    $("editorRegla")
        ?.classList
        .add(
            "oculto"
        );

    $("editorOrigen")
        ?.classList
        .add(
            "oculto"
        );

    estadoAdministracion.reglaEdicionId=
        null;

    estadoAdministracion.reglaOrigenId=
        null;

    estadoAdministracion.origenEdicionId=
        null
}


/* ==========================================================
   RENDER DE REGLAS
   ========================================================== */

export function renderizarReglas(){

    const lista=
        $("listaReglasEstacion");

    if(!lista){
        return
    }

    lista.replaceChildren();

    if($("contadorReglas")){

        $("contadorReglas").textContent=
            `${
                estadoAdministracion
                    .reglasActuales
                    .length
            } regla${
                estadoAdministracion
                    .reglasActuales
                    .length
                ===
                1
                ?
                ""
                :
                "s"
            }`
    }

    if(
        !estadoAdministracion
            .reglasActuales
            .length
    ){

        const vacio=
            document.createElement(
                "div"
            );

        vacio.className=
            "sin-reglas";

        vacio.textContent=
            "Esta estación no tiene reglas de simulación configuradas.";

        lista.appendChild(
            vacio
        );

        return
    }

    estadoAdministracion
        .reglasActuales
        .forEach(
            regla=>{

                const tarjeta=
                    document.createElement(
                        "article"
                    );

                tarjeta.className=
                    "regla-card"
                    +
                    (
                        regla.activa
                        ?
                        ""
                        :
                        " inactiva"
                    );

                const cabecera=
                    document.createElement(
                        "div"
                    );

                cabecera.className=
                    "regla-cabecera";

                const izquierda=
                    document.createElement(
                        "div"
                    );

                const variable=
                    document.createElement(
                        "div"
                    );

                variable.className=
                    "regla-variable";

                variable.textContent=
                    `${
                        regla.variable_destino
                    } · ${
                        regla.operacion
                    }`;

                const chips=
                    document.createElement(
                        "div"
                    );

                chips.className=
                    "chips";

                chips.append(
                    crearChip(
                        regla.activa
                        ?
                        "Activa"
                        :
                        "Inactiva",
                        regla.activa
                        ?
                        "chip-activa"
                        :
                        "chip-inactiva"
                    ),

                    crearChip(
                        `Prioridad ${
                            regla.prioridad
                        }`
                    )
                );

                izquierda.append(
                    variable,
                    chips
                );

                const acciones=
                    document.createElement(
                        "div"
                    );

                acciones.className=
                    "acciones";

                const editar=
                    document.createElement(
                        "button"
                    );

                editar.type=
                    "button";

                editar.className=
                    "boton boton-secundario boton-mini";

                editar.textContent=
                    "Editar regla";

                editar.addEventListener(
                    "click",
                    ()=>
                        editarRegla(
                            regla.id
                        )
                );

                acciones.appendChild(
                    editar
                );

                cabecera.append(
                    izquierda,
                    acciones
                );

                tarjeta.appendChild(
                    cabecera
                );

                if(regla.descripcion){

                    const descripcion=
                        document.createElement(
                            "p"
                        );

                    descripcion.className=
                        "regla-descripcion";

                    descripcion.textContent=
                        regla.descripcion;

                    tarjeta.appendChild(
                        descripcion
                    )
                }

                const datos=
                    document.createElement(
                        "div"
                    );

                datos.className=
                    "regla-datos";

                datos.append(
                    datoRegla(
                        "Valor",
                        regla.valor
                        ??
                        "—"
                    ),

                    datoRegla(
                        "Estacionalidad",
                        regla.estacionalidad
                        ||
                        "Sin restricción"
                    ),

                    datoRegla(
                        "Franja",
                        regla.franja_dia
                        ||
                        "Sin restricción"
                    )
                );

                tarjeta.appendChild(
                    datos
                );

                const bloque=
                    document.createElement(
                        "div"
                    );

                bloque.className=
                    "origenes-bloque";

                const cabeceraOrigenes=
                    document.createElement(
                        "div"
                    );

                cabeceraOrigenes.className=
                    "origenes-cabecera";

                const tituloOrigenes=
                    document.createElement(
                        "div"
                    );

                tituloOrigenes.className=
                    "origenes-titulo";

                tituloOrigenes.textContent=
                    `Estaciones de referencia · ${
                        (
                            regla.origenes
                            ||
                            []
                        ).length
                    }`;

                const anadir=
                    document.createElement(
                        "button"
                    );

                anadir.type=
                    "button";

                anadir.className=
                    "boton boton-principal boton-mini";

                anadir.textContent=
                    "+ Añadir referencia";

                anadir.addEventListener(
                    "click",
                    ()=>
                        nuevaReferencia(
                            regla.id
                        )
                );

                cabeceraOrigenes.append(
                    tituloOrigenes,
                    anadir
                );

                bloque.appendChild(
                    cabeceraOrigenes
                );

                const listaOrigenes=
                    document.createElement(
                        "div"
                    );

                listaOrigenes.className=
                    "origen-lista";

                if(
                    !(
                        regla.origenes
                        ||
                        []
                    ).length
                ){

                    const vacio=
                        document.createElement(
                            "div"
                        );

                    vacio.className=
                        "sin-origenes";

                    vacio.textContent=
                        "Esta regla todavía no tiene estaciones de referencia.";

                    listaOrigenes.appendChild(
                        vacio
                    );

                }else{

                    regla.origenes.forEach(
                        origen=>{

                            const tarjetaOrigen=
                                document.createElement(
                                    "div"
                                );

                            tarjetaOrigen.className=
                                "origen-card"
                                +
                                (
                                    origen.activa
                                    ?
                                    ""
                                    :
                                    " inactivo"
                                );

                            const superior=
                                document.createElement(
                                    "div"
                                );

                            superior.className=
                                "origen-superior";

                            const nombre=
                                document.createElement(
                                    "div"
                                );

                            const nombrePublico=
                                document.createElement(
                                    "div"
                                );

                            nombrePublico.className=
                                "origen-estacion";

                            nombrePublico.textContent=
                                origen.nombre_publico_estacion_origen;

                            const codigo=
                                document.createElement(
                                    "div"
                                );

                            codigo.className=
                                "origen-codigo";

                            codigo.textContent=
                                origen.codigo_estacion_origen;

                            nombre.append(
                                nombrePublico,
                                codigo
                            );

                            const editarOrigen=
                                document.createElement(
                                    "button"
                                );

                            editarOrigen.type=
                                "button";

                            editarOrigen.className=
                                "boton boton-secundario boton-mini";

                            editarOrigen.textContent=
                                "Editar";

                            editarOrigen.addEventListener(
                                "click",
                                ()=>
                                    editarReferencia(
                                        regla.id,
                                        origen.id
                                    )
                            );

                            superior.append(
                                nombre,
                                editarOrigen
                            );

                            const detalle=
                                document.createElement(
                                    "div"
                                );

                            detalle.className=
                                "origen-detalle";

                            detalle.textContent=
                                `${
                                    origen.variable_origen
                                } · peso ${
                                    origen.peso
                                } · orden ${
                                    origen.orden
                                } · ${
                                    origen.activa
                                    ?
                                    "activa"
                                    :
                                    "inactiva"
                                }`;

                            tarjetaOrigen.append(
                                superior,
                                detalle
                            );

                            listaOrigenes.appendChild(
                                tarjetaOrigen
                            )
                        }
                    )
                }

                bloque.appendChild(
                    listaOrigenes
                );

                tarjeta.appendChild(
                    bloque
                );

                lista.appendChild(
                    tarjeta
                )
            }
        )
}


/* ==========================================================
   CARGA DE REGLAS
   ========================================================== */

export async function cargarReglas(
    codigo=
        estadoAdministracion
            .codigoEdicion
){

    if(!codigo){
        return
    }

    mostrarEstadoReglas(
        "Cargando reglas...",
        "info"
    );

    try{

        const datos=
            await peticionJson(
                `${
                    RUTA_ESTACIONES
                }/${
                    encodeURIComponent(
                        codigo
                    )
                }/reglas`
            );

        estadoAdministracion.reglasActuales=
            Array.isArray(
                datos.reglas
            )
            ?
            datos.reglas
            :
            [];

        renderizarReglas();

        mostrarEstadoReglas(
            estadoAdministracion
                .reglasActuales
                .length
            ?
            "Configuración de simulación cargada."
            :
            "Sin reglas de simulación configuradas.",
            estadoAdministracion
                .reglasActuales
                .length
            ?
            "ok"
            :
            "info"
        );

    }catch(error){

        estadoAdministracion.reglasActuales=
            [];

        renderizarReglas();

        mostrarEstadoReglas(
            error.message,
            "error"
        );

        throw error
    }
}


/* ==========================================================
   NUEVA REGLA
   ========================================================== */

export function nuevaRegla(){

    if(
        !estadoAdministracion
            .codigoEdicion
    ){
        return
    }

    estadoAdministracion.reglaEdicionId=
        null;

    $("formularioRegla")
        ?.reset();

    asegurarOpcionSelect(
        $("reglaOperacion"),
        "MEDIA"
    );

    if($("reglaVariableDestino")){

        $("reglaVariableDestino").value=
            ""
    }

    if($("reglaPrioridad")){

        $("reglaPrioridad").value=
            "0"
    }

    if($("reglaEstacionalidad")){

        $("reglaEstacionalidad").value=
            ""
    }

    if($("reglaFranjaDia")){

        $("reglaFranjaDia").value=
            ""
    }

    if($("reglaActiva")){

        $("reglaActiva").checked=
            true
    }

    if($("tituloEditorRegla")){

        $("tituloEditorRegla").textContent=
            `Nueva regla · ${
                estadoAdministracion
                    .codigoEdicion
            }`
    }

    if($("botonGuardarRegla")){

        $("botonGuardarRegla").textContent=
            "Crear regla"
    }

    mostrarEstado(
        $("estadoEditorRegla"),
        ""
    );

    $("editorOrigen")
        ?.classList
        .add(
            "oculto"
        );

    $("editorRegla")
        ?.classList
        .remove(
            "oculto"
        );

    $("editorRegla")
        ?.scrollIntoView(
            {
                behavior:"smooth",
                block:"start"
            }
        )
}


/* ==========================================================
   EDITAR REGLA
   ========================================================== */

export function editarRegla(
    id
){

    const regla=
        estadoAdministracion
            .reglasActuales
            .find(
                elemento=>
                    elemento.id
                    ===
                    id
            );

    if(!regla){
        return
    }

    estadoAdministracion.reglaEdicionId=
        id;

    asegurarOpcionSelect(
        $("reglaVariableDestino"),
        regla.variable_destino
        ||
        ""
    );

    asegurarOpcionSelect(
        $("reglaOperacion"),
        regla.operacion
        ||
        "MEDIA"
    );

    if($("reglaValor")){

        $("reglaValor").value=
            regla.valor
            ??
            ""
    }

    if($("reglaPrioridad")){

        $("reglaPrioridad").value=
            regla.prioridad
            ??
            0
    }

    asegurarOpcionSelect(
        $("reglaEstacionalidad"),
        regla.estacionalidad
        ||
        ""
    );

    asegurarOpcionSelect(
        $("reglaFranjaDia"),
        regla.franja_dia
        ||
        ""
    );

    if($("reglaDescripcion")){

        $("reglaDescripcion").value=
            regla.descripcion
            ||
            ""
    }

    if($("reglaActiva")){

        $("reglaActiva").checked=
            !!regla.activa
    }

    if($("tituloEditorRegla")){

        $("tituloEditorRegla").textContent=
            `Modificar regla #${
                regla.id
            }`
    }

    if($("botonGuardarRegla")){

        $("botonGuardarRegla").textContent=
            "Guardar cambios"
    }

    mostrarEstado(
        $("estadoEditorRegla"),
        ""
    );

    $("editorOrigen")
        ?.classList
        .add(
            "oculto"
        );

    $("editorRegla")
        ?.classList
        .remove(
            "oculto"
        );

    $("editorRegla")
        ?.scrollIntoView(
            {
                behavior:"smooth",
                block:"start"
            }
        )
}


/* ==========================================================
   CUERPO DE REGLA
   ========================================================== */

function cuerpoRegla(){

    return {
        variable_destino:
            $("reglaVariableDestino")
                ?.value
                .trim()
            ||
            "",

        operacion:
            $("reglaOperacion")
                ?.value
            ||
            "",

        valor:
            numeroNullable(
                $("reglaValor")
                    ?.value
            ),

        estacionalidad:
            valorNullable(
                $("reglaEstacionalidad")
                    ?.value
            ),

        franja_dia:
            valorNullable(
                $("reglaFranjaDia")
                    ?.value
            ),

        prioridad:
            Number(
                $("reglaPrioridad")
                    ?.value
                ||
                0
            ),

        activa:
            !!$("reglaActiva")
                ?.checked,

        descripcion:
            valorNullable(
                $("reglaDescripcion")
                    ?.value
            )
    }
}


/* ==========================================================
   GUARDAR REGLA
   ========================================================== */

export async function guardarRegla(
    evento
){

    evento?.preventDefault();

    if(
        !estadoAdministracion
            .codigoEdicion
    ){
        return
    }

    const boton=
        $("botonGuardarRegla");

    if(boton){

        boton.disabled=
            true
    }

    mostrarEstado(
        $("estadoEditorRegla"),
        estadoAdministracion
            .reglaEdicionId
        ?
        "Guardando regla..."
        :
        "Creando regla...",
        "info"
    );

    try{

        const ruta=
            estadoAdministracion
                .reglaEdicionId
            ?
            `${
                RUTA_ESTACIONES
            }/${
                encodeURIComponent(
                    estadoAdministracion
                        .codigoEdicion
                )
            }/reglas/${
                estadoAdministracion
                    .reglaEdicionId
            }`
            :
            `${
                RUTA_ESTACIONES
            }/${
                encodeURIComponent(
                    estadoAdministracion
                        .codigoEdicion
                )
            }/reglas`;

        await peticionJson(
            ruta,
            {
                method:
                    estadoAdministracion
                        .reglaEdicionId
                    ?
                    "PATCH"
                    :
                    "POST",

                body:
                    JSON.stringify(
                        cuerpoRegla()
                    )
            }
        );

        const mensaje=
            estadoAdministracion
                .reglaEdicionId
            ?
            "Regla actualizada correctamente."
            :
            "Regla creada correctamente.";

        estadoAdministracion.reglaEdicionId=
            null;

        $("editorRegla")
            ?.classList
            .add(
                "oculto"
            );

        await cargarReglas();

        mostrarEstadoReglas(
            mensaje,
            "ok"
        );

    }catch(error){

        mostrarEstado(
            $("estadoEditorRegla"),
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
   NUEVA REFERENCIA
   ========================================================== */

export function nuevaReferencia(
    reglaId
){

    estadoAdministracion.reglaOrigenId=
        reglaId;

    estadoAdministracion.origenEdicionId=
        null;

    $("formularioOrigen")
        ?.reset();

    rellenarSelectOrigen();

    if($("origenVariable")){

        $("origenVariable").value=
            ""
    }

    if($("origenPeso")){

        $("origenPeso").value=
            "1"
    }

    if($("origenOrden")){

        $("origenOrden").value=
            "0"
    }

    if($("origenActiva")){

        $("origenActiva").checked=
            true
    }

    if($("tituloEditorOrigen")){

        $("tituloEditorOrigen").textContent=
            `Añadir referencia · regla #${
                reglaId
            }`
    }

    if($("botonGuardarOrigen")){

        $("botonGuardarOrigen").textContent=
            "Añadir referencia"
    }

    mostrarEstado(
        $("estadoEditorOrigen"),
        ""
    );

    $("editorRegla")
        ?.classList
        .add(
            "oculto"
        );

    $("editorOrigen")
        ?.classList
        .remove(
            "oculto"
        );

    $("editorOrigen")
        ?.scrollIntoView(
            {
                behavior:"smooth",
                block:"start"
            }
        )
}


/* ==========================================================
   EDITAR REFERENCIA
   ========================================================== */

export function editarReferencia(
    reglaId,
    origenId
){

    const regla=
        estadoAdministracion
            .reglasActuales
            .find(
                elemento=>
                    elemento.id
                    ===
                    reglaId
            );

    const origen=
        regla
        ?.origenes
        ?.find(
            elemento=>
                elemento.id
                ===
                origenId
        );

    if(!origen){
        return
    }

    estadoAdministracion.reglaOrigenId=
        reglaId;

    estadoAdministracion.origenEdicionId=
        origenId;

    rellenarSelectOrigen();

    if($("origenEstacion")){

        $("origenEstacion").value=
            String(
                origen.estacion_origen_id
            )
    }

    asegurarOpcionSelect(
        $("origenVariable"),
        origen.variable_origen
        ||
        ""
    );

    if($("origenPeso")){

        $("origenPeso").value=
            origen.peso
            ??
            1
    }

    if($("origenOrden")){

        $("origenOrden").value=
            origen.orden
            ??
            0
    }

    if($("origenActiva")){

        $("origenActiva").checked=
            !!origen.activa
    }

    if($("tituloEditorOrigen")){

        $("tituloEditorOrigen").textContent=
            `Modificar referencia #${
                origenId
            } · regla #${
                reglaId
            }`
    }

    if($("botonGuardarOrigen")){

        $("botonGuardarOrigen").textContent=
            "Guardar cambios"
    }

    mostrarEstado(
        $("estadoEditorOrigen"),
        ""
    );

    $("editorRegla")
        ?.classList
        .add(
            "oculto"
        );

    $("editorOrigen")
        ?.classList
        .remove(
            "oculto"
        );

    $("editorOrigen")
        ?.scrollIntoView(
            {
                behavior:"smooth",
                block:"start"
            }
        )
}


/* ==========================================================
   CUERPO DE REFERENCIA
   ========================================================== */

function cuerpoOrigen(){

    return {
        estacion_origen_id:
            Number(
                $("origenEstacion")
                    ?.value
            ),

        variable_origen:
            $("origenVariable")
                ?.value
                .trim()
            ||
            "",

        peso:
            Number(
                $("origenPeso")
                    ?.value
            ),

        orden:
            Number(
                $("origenOrden")
                    ?.value
            ),

        activa:
            !!$("origenActiva")
                ?.checked
    }
}


/* ==========================================================
   GUARDAR REFERENCIA
   ========================================================== */

export async function guardarOrigen(
    evento
){

    evento?.preventDefault();

    if(
        !estadoAdministracion
            .codigoEdicion
        ||
        !estadoAdministracion
            .reglaOrigenId
    ){
        return
    }

    const boton=
        $("botonGuardarOrigen");

    if(boton){

        boton.disabled=
            true
    }

    mostrarEstado(
        $("estadoEditorOrigen"),
        estadoAdministracion
            .origenEdicionId
        ?
        "Guardando referencia..."
        :
        "Añadiendo referencia...",
        "info"
    );

    try{

        const base=
            `${
                RUTA_ESTACIONES
            }/${
                encodeURIComponent(
                    estadoAdministracion
                        .codigoEdicion
                )
            }/reglas/${
                estadoAdministracion
                    .reglaOrigenId
            }/origenes`;

        const ruta=
            estadoAdministracion
                .origenEdicionId
            ?
            `${
                base
            }/${
                estadoAdministracion
                    .origenEdicionId
            }`
            :
            base;

        await peticionJson(
            ruta,
            {
                method:
                    estadoAdministracion
                        .origenEdicionId
                    ?
                    "PATCH"
                    :
                    "POST",

                body:
                    JSON.stringify(
                        cuerpoOrigen()
                    )
            }
        );

        const mensaje=
            estadoAdministracion
                .origenEdicionId
            ?
            "Referencia actualizada correctamente."
            :
            "Referencia añadida correctamente.";

        estadoAdministracion.reglaOrigenId=
            null;

        estadoAdministracion.origenEdicionId=
            null;

        $("editorOrigen")
            ?.classList
            .add(
                "oculto"
            );

        await cargarReglas();

        mostrarEstadoReglas(
            mensaje,
            "ok"
        );

    }catch(error){

        mostrarEstado(
            $("estadoEditorOrigen"),
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
   CAMBIOS EXTERNOS DE ESTACIONES
   ========================================================== */

export function estacionesActualizadas(){

    rellenarSelectOrigen()
}


export async function estacionSeleccionada(
    estacion
){

    if(!estacion){
        return
    }

    await cargarReglas(
        estacion.codigo
    )
}


/* ==========================================================
   EVENTOS
   ========================================================== */

export function configurarEventosSimulacion(){

    $("botonNuevaRegla")
        ?.addEventListener(
            "click",
            nuevaRegla
        );

    $("formularioRegla")
        ?.addEventListener(
            "submit",
            guardarRegla
        );

    $("botonCancelarRegla")
        ?.addEventListener(
            "click",
            ()=>{

                $("editorRegla")
                    ?.classList
                    .add(
                        "oculto"
                    );

                estadoAdministracion.reglaEdicionId=
                    null
            }
        );

    $("formularioOrigen")
        ?.addEventListener(
            "submit",
            guardarOrigen
        );

    $("botonCancelarOrigen")
        ?.addEventListener(
            "click",
            ()=>{

                $("editorOrigen")
                    ?.classList
                    .add(
                        "oculto"
                    );

                estadoAdministracion.reglaOrigenId=
                    null;

                estadoAdministracion.origenEdicionId=
                    null
            }
        )
}


// Fin de fichero: js/administracion/simulacion.js