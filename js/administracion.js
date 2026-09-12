/*
 * MeteoArchidona
 * Administración
 *
 * Lógica exclusiva de:
 *
 *     administracion.html
 *
 * Salió de un <script> al final de esa página, entera y sin tocar.
 * Ahora se carga con defer desde la cabecera, que se ejecuta igual:
 * con el documento ya leído y antes de DOMContentLoaded.
 *
 * Es un fichero grande y hace de todo: acceso con PIN, estaciones,
 * reglas, referencias y sus formularios. Partirlo por
 * responsabilidades es trabajo aparte, y no cabía en el cambio que
 * solo lo saca del HTML.
 */

const LONGITUD_PIN=6;

const URL_API=
    "https://api-meteoarchidona.onrender.com";

const RUTA_ACCESO=
    "/admin/acceso";

const RUTA_ESTACIONES=
    "/admin/estaciones";

const RUTA_CATALOGOS=
    "/admin/estaciones/catalogos";

const RUTA_WEATHERLINK=
    "/admin/weatherlink";

const RUTA_EUMETSAT=
    "/admin/eumetsat";

const RUTA_SQL=
    "/admin/sql";

const CLAVE_TOKEN=
    "meteoarchidona_admin_token";

const CLAVE_TIPO_TOKEN=
    "meteoarchidona_admin_tipo_token";

const CLAVE_EXPIRACION=
    "meteoarchidona_admin_expira_en";


let pinIntroducido="";
let solicitudEnCurso=false;
let intervaloSesion=null;
let codigoEdicion=null;
let urlImagenEumetsat=null;
let historicoWeatherlinkActual=null;

let catalogos={
    estados:[],
    proveedores:[]
};

let estaciones=[];
let reglasActuales=[];

let reglaEdicionId=null;
let reglaOrigenId=null;
let origenEdicionId=null;


const $=
    id=>document.getElementById(id);


const contenidoAcceso=
    $("contenidoAcceso");

const panelAdministracion=
    $("panelAdministracion");

const indicadorPin=
    $("indicadorPin");

const puntosPin=
    Array.from(
        indicadorPin.querySelectorAll(
            ".punto-pin"
        )
    );

const teclas=
    document.querySelectorAll(
        ".tecla"
    );

const estadoAcceso=
    $("estadoAcceso");

const estadoPanel=
    $("estadoPanel");


function estado(
    elemento,
    mensaje,
    tipo=""
){
    elemento.className=
        (
            elemento.id==="estadoPanel"
            ?
            "estado-panel"
            :
            elemento.id==="estadoFormulario"
            ?
            "estado-formulario"
            :
            elemento.id==="estadoReglas"
            ?
            "estado-reglas"
            :
            elemento.classList.contains(
                "estado-editor"
            )
            ?
            "estado-editor"
            :
            "estado"
        )
        +
        (
            tipo
            ?
            ` ${tipo}`
            :
            ""
        );

    elemento.textContent=
        mensaje
}


function actualizarPin(){

    puntosPin.forEach(
        (
            punto,
            indice
        )=>
            punto.classList.toggle(
                "activo",
                indice<pinIntroducido.length
            )
    )
}


function bloquearTeclado(
    bloqueado
){

    teclas.forEach(
        tecla=>
            tecla.disabled=
                bloqueado
    )
}


function agregarNumero(
    numero
){

    if(
        solicitudEnCurso
        ||
        pinIntroducido.length
        >=
        LONGITUD_PIN
    ){
        return
    }

    estado(
        estadoAcceso,
        ""
    );

    pinIntroducido+=numero;

    actualizarPin();

    if(
        pinIntroducido.length
        ===
        LONGITUD_PIN
    ){
        void solicitarAcceso()
    }
}


function borrarPin(){

    if(
        solicitudEnCurso
        ||
        !pinIntroducido
    ){
        return
    }

    pinIntroducido=
        pinIntroducido.slice(
            0,
            -1
        );

    actualizarPin()
}


function limpiarPin(){

    if(solicitudEnCurso){
        return
    }

    pinIntroducido="";

    estado(
        estadoAcceso,
        ""
    );

    actualizarPin()
}


function obtenerToken(){

    return sessionStorage.getItem(
        CLAVE_TOKEN
    )
}


function obtenerExpiracion(){

    const numero=
        Number(
            sessionStorage.getItem(
                CLAVE_EXPIRACION
            )
        );

    return Number.isFinite(
        numero
    )
    ?
    numero
    :
    null
}


function sesionEsValida(){

    const token=
        obtenerToken();

    const expiracion=
        obtenerExpiracion();

    return !!(
        token
        &&
        expiracion
        &&
        expiracion
        >
        Math.floor(
            Date.now()/1000
        )
    )
}


function guardarSesion(
    datos
){

    sessionStorage.setItem(
        CLAVE_TOKEN,
        datos.token
    );

    sessionStorage.setItem(
        CLAVE_TIPO_TOKEN,
        datos.tipo_token
        ||
        "bearer"
    );

    sessionStorage.setItem(
        CLAVE_EXPIRACION,
        String(
            datos.expira_en
        )
    )
}


function eliminarSesion(){

    sessionStorage.removeItem(
        CLAVE_TOKEN
    );

    sessionStorage.removeItem(
        CLAVE_TIPO_TOKEN
    );

    sessionStorage.removeItem(
        CLAVE_EXPIRACION
    )
}


function detenerReloj(){

    if(
        intervaloSesion
        !==
        null
    ){
        clearInterval(
            intervaloSesion
        );

        intervaloSesion=null
    }
}


function actualizarReloj(){

    const expiracion=
        obtenerExpiracion();

    if(!expiracion){

        $("tiempoSesion").textContent=
            "Sesión · --:--";

        return
    }

    const restante=
        expiracion
        -
        Math.floor(
            Date.now()/1000
        );

    if(restante<=0){

        cerrarSesion(
            "La sesión administrativa ha caducado."
        );

        return
    }

    $("tiempoSesion").textContent=
        `Sesión · ${
            String(
                Math.floor(
                    restante/60
                )
            ).padStart(
                2,
                "0"
            )
        }:${
            String(
                restante%60
            ).padStart(
                2,
                "0"
            )
        }`
}


function abrirPanel(){

    contenidoAcceso.classList.add(
        "oculto"
    );

    panelAdministracion.classList.remove(
        "oculto"
    );

    $("botonCerrarSesionCabecera")
        .classList.remove(
            "oculto"
        );

    detenerReloj();

    actualizarReloj();

    intervaloSesion=
        setInterval(
            actualizarReloj,
            1000
        )
}


function mostrarAcceso(
    mensaje=""
){

    detenerReloj();

    panelAdministracion.classList.add(
        "oculto"
    );

    contenidoAcceso.classList.remove(
        "oculto"
    );

    $("botonCerrarSesionCabecera")
        .classList.add(
            "oculto"
        );

    pinIntroducido="";

    solicitudEnCurso=false;

    bloquearTeclado(
        false
    );

    actualizarPin();

    estado(
        estadoAcceso,
        mensaje,
        mensaje
        ?
        "info"
        :
        ""
    )
}


function limpiarDatosSesion(){

    estaciones=[];
    reglasActuales=[];

    catalogos={
        estados:[],
        proveedores:[]
    };

    codigoEdicion=null;

    historicoWeatherlinkActual=null;

    ocultarEditoresReglas();

    limpiarEumetsat()
}


function cerrarSesion(
    mensaje=""
){

    eliminarSesion();

    limpiarDatosSesion();

    mostrarAcceso(
        mensaje
    )
}


async function detalleError(
    respuesta
){

    try{

        const datos=
            await respuesta.clone().json();

        if(
            datos
            &&
            typeof datos.detail
            ===
            "string"
            &&
            datos.detail.trim()
        ){
            return datos.detail
        }

    }catch{
    }

    return (
        "La operación no pudo completarse. "
        +
        `HTTP ${respuesta.status}.`
    )
}


async function comprobar(
    respuesta
){

    if(respuesta.ok){
        return respuesta
    }

    const error=
        new Error(
            await detalleError(
                respuesta
            )
        );

    error.codigoHttp=
        respuesta.status;

    error.retryAfter=
        respuesta.headers.get(
            "Retry-After"
        );

    throw error
}


async function peticionAdministrativa(
    ruta,
    opciones={}
){

    if(!sesionEsValida()){

        cerrarSesion(
            "La sesión administrativa ha caducado."
        );

        throw new Error(
            "Sesión administrativa no disponible."
        )
    }

    const cabeceras=
        new Headers(
            opciones.headers
            ||
            {}
        );

    cabeceras.set(
        "Authorization",
        `Bearer ${obtenerToken()}`
    );

    if(
        opciones.body
        &&
        !(
            opciones.body
            instanceof
            FormData
        )
        &&
        !cabeceras.has(
            "Content-Type"
        )
    ){
        cabeceras.set(
            "Content-Type",
            "application/json"
        )
    }

    const respuesta=
        await fetch(
            URL_API+ruta,
            {
                ...opciones,
                headers:cabeceras,
                cache:"no-store"
            }
        );

    try{

        return await comprobar(
            respuesta
        );

    }catch(error){

        if(
            error.codigoHttp
            ===
            401
        ){
            cerrarSesion(
                "La sesión administrativa ya no es válida."
            )
        }

        throw error
    }
}


async function peticionJson(
    ruta,
    opciones={}
){

    return (
        await peticionAdministrativa(
            ruta,
            opciones
        )
    ).json()
}


async function solicitarAcceso(){

    if(
        solicitudEnCurso
        ||
        pinIntroducido.length
        !==
        LONGITUD_PIN
    ){
        return
    }

    const pin=
        pinIntroducido;

    solicitudEnCurso=true;

    bloquearTeclado(
        true
    );

    estado(
        estadoAcceso,
        "Comprobando acceso con la API...",
        "info"
    );

    try{

        const respuesta=
            await fetch(
                URL_API
                +
                RUTA_ACCESO,
                {
                    method:"POST",
                    headers:{
                        "Content-Type":
                            "application/json"
                    },
                    body:JSON.stringify(
                        {
                            pin
                        }
                    ),
                    cache:"no-store"
                }
            );

        await comprobar(
            respuesta
        );

        const datos=
            await respuesta.json();

        if(
            !datos?.token
            ||
            !datos?.expira_en
        ){
            throw new Error(
                "La API no devolvió una sesión válida."
            )
        }

        guardarSesion(
            datos
        );

        pinIntroducido="";

        actualizarPin();

        abrirPanel();

        await cargarDatosAdministracion();

        activarModulo(
            "resumen"
        );

    }catch(error){

        eliminarSesion();

        pinIntroducido="";

        actualizarPin();

        let mensaje=
            error.message
            ||
            "No ha sido posible validar el acceso.";

        if(
            error.codigoHttp
            ===
            429
            &&
            error.retryAfter
        ){
            mensaje+=
                ` Espera ${error.retryAfter} segundos.`
        }

        estado(
            estadoAcceso,
            mensaje,
            "error"
        );

    }finally{

        solicitudEnCurso=false;

        bloquearTeclado(
            false
        )
    }
}


function activarModulo(
    nombre
){

    document.querySelectorAll(
        ".modulo"
    ).forEach(
        modulo=>
            modulo.classList.toggle(
                "activo",
                modulo.id
                ===
                `modulo-${nombre}`
            )
    );

    document.querySelectorAll(
        ".modulo-boton"
    ).forEach(
        boton=>
            boton.classList.toggle(
                "activo",
                boton.dataset.modulo
                ===
                nombre
            )
    )
}


function opcion(
    valor,
    texto
){

    const elemento=
        document.createElement(
            "option"
        );

    elemento.value=
        valor;

    elemento.textContent=
        texto;

    return elemento
}


function asegurarOpcionSelect(
    select,
    valor
){

    if(
        valor===null
        ||
        valor===undefined
        ||
        valor===""
    ){
        select.value="";
        return
    }

    const texto=
        String(valor);

    const existe=
        Array.from(
            select.options
        ).some(
            elemento=>
                elemento.value
                ===
                texto
        );

    if(!existe){

        select.appendChild(
            opcion(
                texto,
                texto
            )
        )
    }

    select.value=
        texto
}


function etiquetaEstado(
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


function etiquetaProveedor(
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


function cargarOpcionesCatalogos(){

    const campoEstado=
        $("campoEstado");

    const campoProveedor=
        $("campoProveedor");

    const filtroEstado=
        $("filtroEstado");

    const filtroProveedor=
        $("filtroProveedor");

    campoEstado.replaceChildren();

    campoProveedor.replaceChildren();

    filtroEstado.replaceChildren(
        opcion(
            "",
            "Todos los estados"
        )
    );

    filtroProveedor.replaceChildren(
        opcion(
            "",
            "Todos los proveedores"
        )
    );

    catalogos.estados.forEach(
        valor=>{

            campoEstado.appendChild(
                opcion(
                    valor,
                    etiquetaEstado(
                        valor
                    )
                )
            );

            filtroEstado.appendChild(
                opcion(
                    valor,
                    etiquetaEstado(
                        valor
                    )
                )
            )
        }
    );

    catalogos.proveedores.forEach(
        valor=>{

            campoProveedor.appendChild(
                opcion(
                    valor,
                    etiquetaProveedor(
                        valor
                    )
                )
            );

            filtroProveedor.appendChild(
                opcion(
                    valor,
                    etiquetaProveedor(
                        valor
                    )
                )
            )
        }
    )
}


function actualizarResumen(){

    $("resumenTotal").textContent=
        String(
            estaciones.length
        );

    $("resumenActivas").textContent=
        String(
            estaciones.filter(
                estacion=>
                    estacion.activa
            ).length
        );

    $("resumenSimuladas").textContent=
        String(
            estaciones.filter(
                estacion=>
                    estacion.estado
                    ===
                    "DATOS_SIMULADOS"
            ).length
        );

    $("resumenPreparacion").textContent=
        String(
            estaciones.filter(
                estacion=>
                    estacion.estado
                    ===
                    "PROYECTADA"
                    ||
                    estacion.estado
                    ===
                    "CONSTRUCCION"
            ).length
        )
}


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


function filtradas(){

    const texto=
        $("filtroTexto")
            .value
            .trim()
            .toLocaleLowerCase(
                "es"
            );

    const estadoFiltro=
        $("filtroEstado").value;

    const proveedorFiltro=
        $("filtroProveedor").value;

    return estaciones.filter(
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


function chip(
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


function renderizarEstaciones(){

    const lista=
        $("listaEstaciones");

    lista.replaceChildren();

    const resultado=
        filtradas();

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
                    codigoEdicion
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
                chip(
                    etiquetaEstado(
                        estacion.estado
                    )
                ),

                chip(
                    etiquetaProveedor(
                        estacion.codigo_proveedor
                    )
                ),

                chip(
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


function valorNullable(
    valor
){

    const resultado=
        String(
            valor
            ??
            ""
        ).trim();

    return resultado
        ?
        resultado
        :
        null
}


function numeroNullable(
    valor
){

    const resultado=
        String(
            valor
            ??
            ""
        ).trim();

    if(!resultado){
        return null
    }

    const numero=
        Number(
            resultado
        );

    return Number.isFinite(
        numero
    )
    ?
    numero
    :
    null
}


function fecha(
    valor
){

    if(!valor){
        return "—"
    }

    const fechaObjeto=
        new Date(
            valor
        );

    return Number.isNaN(
        fechaObjeto.getTime()
    )
    ?
    String(
        valor
    )
    :
    fechaObjeto.toLocaleString(
        "es-ES"
    )
}


function formularioNuevaEstacion(){

    codigoEdicion=null;

    $("formularioEstacion").reset();

    $("tituloFormulario").textContent=
        "Nueva estación";

    $("codigoSeleccionado").textContent=
        "";

    $("campoCodigo").disabled=
        false;

    $("botonGuardar").textContent=
        "Crear estación";

    $("panelMetadatos")
        .classList.add(
            "oculto"
        );

    $("panelReglasEstacion")
        .classList.add(
            "oculto"
        );

    ocultarEditoresReglas();

    reglasActuales=[];

    estado(
        $("estadoFormulario"),
        ""
    );

    if(
        catalogos.estados.includes(
            "PROYECTADA"
        )
    ){
        $("campoEstado").value=
            "PROYECTADA"
    }

    if(
        catalogos.proveedores.includes(
            "SIMULADOR"
        )
    ){
        $("campoProveedor").value=
            "SIMULADOR"
    }

    renderizarEstaciones();

    $("panelFormularioEstacion")
        .scrollIntoView(
            {
                behavior:"smooth",
                block:"start"
            }
        )
}


function cargarFormulario(
    estacion
){

    codigoEdicion=
        estacion.codigo;

    $("tituloFormulario").textContent=
        "Modificar estación";

    $("codigoSeleccionado").textContent=
        estacion.codigo;

    $("campoCodigo").value=
        estacion.codigo;

    $("campoCodigo").disabled=
        true;

    $("campoNombre").value=
        estacion.nombre_publico
        ||
        "";

    $("campoDescripcion").value=
        estacion.descripcion
        ||
        "";

    $("campoEstado").value=
        estacion.estado;

    $("campoProveedor").value=
        estacion.codigo_proveedor;

    $("campoCiudad").value=
        estacion.ciudad
        ||
        "";

    $("campoRegion").value=
        estacion.region
        ||
        "";

    $("campoPais").value=
        estacion.pais
        ||
        "";

    $("campoZonaHoraria").value=
        estacion.zona_horaria
        ||
        "";

    $("campoLatitud").value=
        estacion.latitud
        ??
        "";

    $("campoLongitud").value=
        estacion.longitud
        ??
        "";

    $("botonGuardar").textContent=
        "Guardar cambios";

    $("metaId").textContent=
        estacion.id
        ??
        "—";

    $("metaActiva").textContent=
        estacion.activa
        ?
        "Sí"
        :
        "No";

    $("metaWeatherLinkId").textContent=
        estacion.weatherlink_station_id
        ??
        "—";

    $("metaWeatherLinkNombre").textContent=
        estacion.nombre_weatherlink
        ||
        "—";

    $("metaCreada").textContent=
        fecha(
            estacion.creado_en
        );

    $("metaActualizada").textContent=
        fecha(
            estacion.actualizado_en
        );

    $("panelMetadatos")
        .classList.remove(
            "oculto"
        );

    $("panelReglasEstacion")
        .classList.remove(
            "oculto"
        );

    estado(
        $("estadoFormulario"),
        ""
    );

    renderizarEstaciones()
}


async function seleccionarEstacion(
    codigo
){

    estado(
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

        cargarFormulario(
            estacion
        );

        await cargarReglas(
            codigo
        );

        $("panelFormularioEstacion")
            .scrollIntoView(
                {
                    behavior:"smooth",
                    block:"start"
                }
            );

    }catch(error){

        estado(
            $("estadoFormulario"),
            error.message,
            "error"
        )
    }
}


function cuerpoEstacion(){

    return {
        codigo:
            $("campoCodigo")
                .value
                .trim(),

        nombre_publico:
            $("campoNombre")
                .value
                .trim(),

        descripcion:
            valorNullable(
                $("campoDescripcion").value
            ),

        estado:
            $("campoEstado").value,

        codigo_proveedor:
            $("campoProveedor").value,

        ciudad:
            valorNullable(
                $("campoCiudad").value
            ),

        region:
            valorNullable(
                $("campoRegion").value
            ),

        pais:
            valorNullable(
                $("campoPais").value
            ),

        zona_horaria:
            valorNullable(
                $("campoZonaHoraria").value
            ),

        latitud:
            numeroNullable(
                $("campoLatitud").value
            ),

        longitud:
            numeroNullable(
                $("campoLongitud").value
            )
    }
}


async function guardarEstacion(
    evento
){

    evento.preventDefault();

    const boton=
        $("botonGuardar");

    boton.disabled=true;

    estado(
        $("estadoFormulario"),
        codigoEdicion
        ?
        "Guardando cambios..."
        :
        "Creando estación...",
        "info"
    );

    try{

        let datos=
            cuerpoEstacion();

        let resultado;

        if(codigoEdicion){

            delete datos.codigo;

            resultado=
                await peticionJson(
                    `${
                        RUTA_ESTACIONES
                    }/${
                        encodeURIComponent(
                            codigoEdicion
                        )
                    }`,
                    {
                        method:"PATCH",
                        body:JSON.stringify(
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
                        body:JSON.stringify(
                            datos
                        )
                    }
                )
        }

        await cargarEstaciones();

        await seleccionarEstacion(
            resultado.codigo
        );

        estado(
            $("estadoFormulario"),
            codigoEdicion
            ?
            "Estación actualizada correctamente."
            :
            "Estación creada correctamente.",
            "ok"
        );

        estado(
            estadoPanel,
            "Datos administrativos actualizados.",
            "ok"
        );

    }catch(error){

        estado(
            $("estadoFormulario"),
            error.message,
            "error"
        );

    }finally{

        boton.disabled=false
    }
}


async function cargarEstaciones(){

    estaciones=
        await peticionJson(
            RUTA_ESTACIONES
        );

    actualizarResumen();

    renderizarEstaciones();

    rellenarSelectOrigen()
}


/* ==========================================================
   REGLAS DE SIMULACIÓN
   ========================================================== */

function ocultarEditoresReglas(){

    $("editorRegla")
        .classList.add(
            "oculto"
        );

    $("editorOrigen")
        .classList.add(
            "oculto"
        );

    reglaEdicionId=null;
    reglaOrigenId=null;
    origenEdicionId=null
}


function mostrarEstadoReglas(
    mensaje,
    tipo=""
){

    estado(
        $("estadoReglas"),
        mensaje,
        tipo
    )
}


function rellenarSelectOrigen(){

    const select=
        $("origenEstacion");

    if(!select){
        return
    }

    const previo=
        select.value;

    select.replaceChildren(
        opcion(
            "",
            "Selecciona una estación..."
        )
    );

    estaciones.forEach(
        estacion=>{

            select.appendChild(
                opcion(
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


function renderizarReglas(){

    const lista=
        $("listaReglasEstacion");

    lista.replaceChildren();

    $("contadorReglas").textContent=
        `${
            reglasActuales.length
        } regla${
            reglasActuales.length===1
            ?
            ""
            :
            "s"
        }`;

    if(!reglasActuales.length){

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

    reglasActuales.forEach(
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

            const chipsElemento=
                document.createElement(
                    "div"
                );

            chipsElemento.className=
                "chips";

            chipsElemento.append(
                chip(
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

                chip(
                    `Prioridad ${
                        regla.prioridad
                    }`
                )
            );

            izquierda.append(
                variable,
                chipsElemento
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


async function cargarReglas(
    codigo=codigoEdicion
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

        reglasActuales=
            Array.isArray(
                datos.reglas
            )
            ?
            datos.reglas
            :
            [];

        renderizarReglas();

        mostrarEstadoReglas(
            reglasActuales.length
            ?
            "Configuración de simulación cargada."
            :
            "Sin reglas de simulación configuradas.",
            reglasActuales.length
            ?
            "ok"
            :
            "info"
        );

    }catch(error){

        reglasActuales=[];

        renderizarReglas();

        mostrarEstadoReglas(
            error.message,
            "error"
        )
    }
}


function nuevaRegla(){

    if(!codigoEdicion){
        return
    }

    reglaEdicionId=null;

    $("formularioRegla").reset();

    $("reglaOperacion").value=
        "MEDIA";

    $("reglaPrioridad").value=
        "0";

    $("reglaEstacionalidad").value=
        "";

    $("reglaFranjaDia").value=
        "";

    $("reglaActiva").checked=
        true;

    $("tituloEditorRegla").textContent=
        `Nueva regla · ${codigoEdicion}`;

    $("botonGuardarRegla").textContent=
        "Crear regla";

    estado(
        $("estadoEditorRegla"),
        ""
    );

    $("editorOrigen")
        .classList.add(
            "oculto"
        );

    $("editorRegla")
        .classList.remove(
            "oculto"
        );

    $("editorRegla")
        .scrollIntoView(
            {
                behavior:"smooth",
                block:"start"
            }
        )
}


function editarRegla(
    id
){

    const regla=
        reglasActuales.find(
            elemento=>
                elemento.id
                ===
                id
        );

    if(!regla){
        return
    }

    reglaEdicionId=id;

    $("reglaVariableDestino").value=
        regla.variable_destino
        ||
        "";

    asegurarOpcionSelect(
        $("reglaOperacion"),
        regla.operacion
        ||
        "MEDIA"
    );

    $("reglaValor").value=
        regla.valor
        ??
        "";

    $("reglaPrioridad").value=
        regla.prioridad
        ??
        0;

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

    $("reglaDescripcion").value=
        regla.descripcion
        ||
        "";

    $("reglaActiva").checked=
        !!regla.activa;

    $("tituloEditorRegla").textContent=
        `Modificar regla #${regla.id}`;

    $("botonGuardarRegla").textContent=
        "Guardar cambios";

    estado(
        $("estadoEditorRegla"),
        ""
    );

    $("editorOrigen")
        .classList.add(
            "oculto"
        );

    $("editorRegla")
        .classList.remove(
            "oculto"
        );

    $("editorRegla")
        .scrollIntoView(
            {
                behavior:"smooth",
                block:"start"
            }
        )
}


function cuerpoRegla(){

    return {
        variable_destino:
            $("reglaVariableDestino")
                .value
                .trim(),

        operacion:
            $("reglaOperacion").value,

        valor:
            numeroNullable(
                $("reglaValor").value
            ),

        estacionalidad:
            valorNullable(
                $("reglaEstacionalidad").value
            ),

        franja_dia:
            valorNullable(
                $("reglaFranjaDia").value
            ),

        prioridad:
            Number(
                $("reglaPrioridad").value
                ||
                0
            ),

        activa:
            $("reglaActiva").checked,

        descripcion:
            valorNullable(
                $("reglaDescripcion").value
            )
    }
}


async function guardarRegla(
    evento
){

    evento.preventDefault();

    if(!codigoEdicion){
        return
    }

    const boton=
        $("botonGuardarRegla");

    boton.disabled=true;

    estado(
        $("estadoEditorRegla"),
        reglaEdicionId
        ?
        "Guardando regla..."
        :
        "Creando regla...",
        "info"
    );

    try{

        const ruta=
            reglaEdicionId
            ?
            `${
                RUTA_ESTACIONES
            }/${
                encodeURIComponent(
                    codigoEdicion
                )
            }/reglas/${
                reglaEdicionId
            }`
            :
            `${
                RUTA_ESTACIONES
            }/${
                encodeURIComponent(
                    codigoEdicion
                )
            }/reglas`;

        await peticionJson(
            ruta,
            {
                method:
                    reglaEdicionId
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
            reglaEdicionId
            ?
            "Regla actualizada correctamente."
            :
            "Regla creada correctamente.";

        reglaEdicionId=null;

        $("editorRegla")
            .classList.add(
                "oculto"
            );

        await cargarReglas();

        mostrarEstadoReglas(
            mensaje,
            "ok"
        );

    }catch(error){

        estado(
            $("estadoEditorRegla"),
            error.message,
            "error"
        );

    }finally{

        boton.disabled=false
    }
}


function nuevaReferencia(
    reglaId
){

    reglaOrigenId=
        reglaId;

    origenEdicionId=
        null;

    $("formularioOrigen").reset();

    rellenarSelectOrigen();

    $("origenPeso").value=
        "1";

    $("origenOrden").value=
        "0";

    $("origenActiva").checked=
        true;

    $("tituloEditorOrigen").textContent=
        `Añadir referencia · regla #${reglaId}`;

    $("botonGuardarOrigen").textContent=
        "Añadir referencia";

    estado(
        $("estadoEditorOrigen"),
        ""
    );

    $("editorRegla")
        .classList.add(
            "oculto"
        );

    $("editorOrigen")
        .classList.remove(
            "oculto"
        );

    $("editorOrigen")
        .scrollIntoView(
            {
                behavior:"smooth",
                block:"start"
            }
        )
}


function editarReferencia(
    reglaId,
    origenId
){

    const regla=
        reglasActuales.find(
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

    reglaOrigenId=
        reglaId;

    origenEdicionId=
        origenId;

    rellenarSelectOrigen();

    $("origenEstacion").value=
        String(
            origen.estacion_origen_id
        );

    $("origenVariable").value=
        origen.variable_origen
        ||
        "";

    $("origenPeso").value=
        origen.peso
        ??
        1;

    $("origenOrden").value=
        origen.orden
        ??
        0;

    $("origenActiva").checked=
        !!origen.activa;

    $("tituloEditorOrigen").textContent=
        `Modificar referencia #${
            origenId
        } · regla #${
            reglaId
        }`;

    $("botonGuardarOrigen").textContent=
        "Guardar cambios";

    estado(
        $("estadoEditorOrigen"),
        ""
    );

    $("editorRegla")
        .classList.add(
            "oculto"
        );

    $("editorOrigen")
        .classList.remove(
            "oculto"
        );

    $("editorOrigen")
        .scrollIntoView(
            {
                behavior:"smooth",
                block:"start"
            }
        )
}


function cuerpoOrigen(){

    return {
        estacion_origen_id:
            Number(
                $("origenEstacion").value
            ),

        variable_origen:
            $("origenVariable")
                .value
                .trim(),

        peso:
            Number(
                $("origenPeso").value
            ),

        orden:
            Number(
                $("origenOrden").value
            ),

        activa:
            $("origenActiva").checked
    }
}


async function guardarOrigen(
    evento
){

    evento.preventDefault();

    if(
        !codigoEdicion
        ||
        !reglaOrigenId
    ){
        return
    }

    const boton=
        $("botonGuardarOrigen");

    boton.disabled=true;

    estado(
        $("estadoEditorOrigen"),
        origenEdicionId
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
                    codigoEdicion
                )
            }/reglas/${
                reglaOrigenId
            }/origenes`;

        const ruta=
            origenEdicionId
            ?
            `${
                base
            }/${
                origenEdicionId
            }`
            :
            base;

        await peticionJson(
            ruta,
            {
                method:
                    origenEdicionId
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
            origenEdicionId
            ?
            "Referencia actualizada correctamente."
            :
            "Referencia añadida correctamente.";

        reglaOrigenId=null;

        origenEdicionId=null;

        $("editorOrigen")
            .classList.add(
                "oculto"
            );

        await cargarReglas();

        mostrarEstadoReglas(
            mensaje,
            "ok"
        );

    }catch(error){

        estado(
            $("estadoEditorOrigen"),
            error.message,
            "error"
        );

    }finally{

        boton.disabled=false
    }
}


/* ==========================================================
   CARGA GENERAL
   ========================================================== */

async function cargarDatosAdministracion(){

    estado(
        estadoPanel,
        "Actualizando datos administrativos...",
        "info"
    );

    try{

        const [
            datosCatalogos,
            datosEstaciones
        ]=
            await Promise.all(
                [
                    peticionJson(
                        RUTA_CATALOGOS
                    ),

                    peticionJson(
                        RUTA_ESTACIONES
                    )
                ]
            );

        catalogos=
            datosCatalogos;

        estaciones=
            datosEstaciones;

        cargarOpcionesCatalogos();

        actualizarResumen();

        renderizarEstaciones();

        rellenarSelectOrigen();

        if(
            codigoEdicion
            &&
            estaciones.some(
                estacion=>
                    estacion.codigo
                    ===
                    codigoEdicion
            )
        ){
            await seleccionarEstacion(
                codigoEdicion
            )
        }

        estado(
            estadoPanel,
            "Datos administrativos actualizados.",
            "ok"
        );

    }catch(error){

        estado(
            estadoPanel,
            error.message,
            "error"
        )
    }
}


/* ==========================================================
   WEATHERLINK
   ========================================================== */

function formatear(
    valor
){

    if(
        valor===null
        ||
        valor===undefined
        ||
        valor===""
    ){
        return "—"
    }

    if(
        typeof valor
        ===
        "boolean"
    ){
        return valor
            ?
            "Sí"
            :
            "No"
    }

    return String(
        valor
    )
}


function buscarValor(
    objeto,
    nombres
){

    if(
        objeto===null
        ||
        typeof objeto
        !==
        "object"
    ){
        return null
    }

    for(
        const nombre
        of
        nombres
    ){
        if(
            Object.prototype
                .hasOwnProperty
                .call(
                    objeto,
                    nombre
                )
            &&
            objeto[nombre]!==null
            &&
            objeto[nombre]!==undefined
        ){
            return objeto[nombre]
        }
    }

    for(
        const valor
        of
        Object.values(
            objeto
        )
    ){
        const resultado=
            buscarValor(
                valor,
                nombres
            );

        if(resultado!==null){
            return resultado
        }
    }

    return null
}


function fAC(
    valor
){

    const numero=
        Number(
            valor
        );

    return Number.isFinite(
        numero
    )
    ?
    (
        numero-32
    )
    *
    5
    /
    9
    :
    null
}


function mphAKmh(
    valor
){

    const numero=
        Number(
            valor
        );

    return Number.isFinite(
        numero
    )
    ?
    numero*1.609344
    :
    null
}


function inHgAHpa(
    valor
){

    const numero=
        Number(
            valor
        );

    return Number.isFinite(
        numero
    )
    ?
    numero*33.8638866667
    :
    null
}


function tarjetaMeteo(
    titulo,
    valor
){

    const tarjeta=
        document.createElement(
            "div"
        );

    tarjeta.className=
        "tarjeta";

    const etiqueta=
        document.createElement(
            "div"
        );

    etiqueta.className=
        "tarjeta-etiqueta";

    etiqueta.textContent=
        titulo;

    const dato=
        document.createElement(
            "div"
        );

    dato.className=
        "tarjeta-valor";

    dato.textContent=
        valor;

    tarjeta.append(
        etiqueta,
        dato
    );

    return tarjeta
}


function mostrarCondicionesWeatherlink(
    datos
){

    const contenedor=
        $("tarjetasWeatherlink");

    contenedor.replaceChildren();

    const temperatura=
        buscarValor(
            datos,
            [
                "temp",
                "temp_out",
                "temperature"
            ]
        );

    const humedad=
        buscarValor(
            datos,
            [
                "hum",
                "hum_out",
                "humidity"
            ]
        );

    const presion=
        buscarValor(
            datos,
            [
                "bar_sea_level",
                "bar_absolute",
                "bar"
            ]
        );

    const viento=
        buscarValor(
            datos,
            [
                "wind_speed_last",
                "wind_speed",
                "wind_speed_avg_last_2_min"
            ]
        );

    const lluvia=
        buscarValor(
            datos,
            [
                "rain_rate_last",
                "rain_rate"
            ]
        );

    const solar=
        buscarValor(
            datos,
            [
                "solar_rad",
                "solar_radiation"
            ]
        );

    const uv=
        buscarValor(
            datos,
            [
                "uv_index",
                "uv"
            ]
        );

    const bateria=
        buscarValor(
            datos,
            [
                "battery_percent"
            ]
        );

    const valores=[
        [
            "Temperatura",
            temperatura===null
            ?
            "—"
            :
            `${
                fAC(
                    temperatura
                )?.toFixed(
                    1
                )
            } °C`
        ],

        [
            "Humedad",
            humedad===null
            ?
            "—"
            :
            `${
                Number(
                    humedad
                ).toFixed(
                    0
                )
            } %`
        ],

        [
            "Presión",
            presion===null
            ?
            "—"
            :
            `${
                inHgAHpa(
                    presion
                )?.toFixed(
                    1
                )
            } hPa`
        ],

        [
            "Viento",
            viento===null
            ?
            "—"
            :
            `${
                mphAKmh(
                    viento
                )?.toFixed(
                    1
                )
            } km/h`
        ],

        [
            "Lluvia",
            lluvia===null
            ?
            "—"
            :
            `${lluvia} in/h`
        ],

        [
            "Radiación",
            solar===null
            ?
            "—"
            :
            `${solar} W/m²`
        ],

        [
            "UV",
            formatear(
                uv
            )
        ],

        [
            "Batería",
            bateria===null
            ?
            "—"
            :
            `${bateria} %`
        ]
    ];

    valores.forEach(
        (
            [
                titulo,
                valor
            ]
        )=>
            contenedor.appendChild(
                tarjetaMeteo(
                    titulo,
                    valor
                )
            )
    );

    $("jsonWeatherlinkCondiciones")
        .textContent=
            JSON.stringify(
                datos,
                null,
                2
            );

    $("panelWeatherlinkCondiciones")
        .classList.remove(
            "oculto"
        )
}


async function consultarEstacionesWeatherlink(){

    const boton=
        $("botonWeatherlinkEstaciones");

    const estadoElemento=
        $("estadoWeatherlink");

    boton.disabled=true;

    estado(
        estadoElemento,
        "Consultando WeatherLink...",
        "info"
    );

    try{

        const datos=
            await peticionJson(
                RUTA_WEATHERLINK
                +
                "/estaciones"
            );

        const estacionesWeatherlink=
            datos.weatherlink
                ?.stations
            ||
            [];

        const cuerpo=
            $("tablaWeatherlinkEstaciones");

        cuerpo.replaceChildren();

        estacionesWeatherlink.forEach(
            estacion=>{

                const fila=
                    document.createElement(
                        "tr"
                    );

                [
                    estacion.station_id,
                    estacion.station_name,
                    estacion.time_zone,
                    estacion.private
                ].forEach(
                    valor=>{

                        const celda=
                            document.createElement(
                                "td"
                            );

                        celda.textContent=
                            formatear(
                                valor
                            );

                        fila.appendChild(
                            celda
                        )
                    }
                );

                const celdaAccion=
                    document.createElement(
                        "td"
                    );

                const usar=
                    document.createElement(
                        "button"
                    );

                usar.type=
                    "button";

                usar.className=
                    "boton boton-secundario boton-mini";

                usar.textContent=
                    "Usar";

                usar.addEventListener(
                    "click",
                    ()=>{

                        $("weatherlinkStationId").value=
                            estacion.station_id;

                        void consultarCondicionesWeatherlink()
                    }
                );

                celdaAccion.appendChild(
                    usar
                );

                fila.appendChild(
                    celdaAccion
                );

                cuerpo.appendChild(
                    fila
                )
            }
        );

        $("jsonWeatherlinkEstaciones")
            .textContent=
                JSON.stringify(
                    datos,
                    null,
                    2
                );

        $("panelWeatherlinkEstaciones")
            .classList.remove(
                "oculto"
            );

        estado(
            estadoElemento,
            `${
                estacionesWeatherlink.length
            } estaciones obtenidas.`,
            "ok"
        );

    }catch(error){

        estado(
            estadoElemento,
            error.message,
            "error"
        );

    }finally{

        boton.disabled=false
    }
}


function stationIdWeatherlink(){

    const stationId=
        Number(
            $("weatherlinkStationId").value
        );

    if(
        !Number.isInteger(
            stationId
        )
        ||
        stationId<=0
    ){
        throw new Error(
            "Indica un station_id válido."
        )
    }

    return stationId
}


async function consultarCondicionesWeatherlink(){

    const estadoElemento=
        $("estadoWeatherlinkEstacion");

    estado(
        estadoElemento,
        "Consultando condiciones...",
        "info"
    );

    try{

        const stationId=
            stationIdWeatherlink();

        const datos=
            await peticionJson(
                `${
                    RUTA_WEATHERLINK
                }/condiciones/${
                    stationId
                }`
            );

        mostrarCondicionesWeatherlink(
            datos
        );

        estado(
            estadoElemento,
            "Condiciones obtenidas correctamente.",
            "ok"
        );

    }catch(error){

        estado(
            estadoElemento,
            error.message,
            "error"
        )
    }
}


async function consultarHistoricoWeatherlink(){

    const estadoElemento=
        $("estadoWeatherlinkEstacion");

    estado(
        estadoElemento,
        "Consultando histórico de 24 horas...",
        "info"
    );

    try{

        const stationId=
            stationIdWeatherlink();

        const datos=
            await peticionJson(
                `${
                    RUTA_WEATHERLINK
                }/historico/${
                    stationId
                }`
            );

        historicoWeatherlinkActual=
            datos;

        $("jsonWeatherlinkHistorico")
            .textContent=
                JSON.stringify(
                    datos,
                    null,
                    2
                );

        const registros=
            datos.weatherlink
                ?.sensors
                ?.length
            ??
            datos.weatherlink
                ?.data
                ?.length
            ??
            "—";

        $("resumenWeatherlinkHistorico")
            .textContent=
                `station_id ${
                    stationId
                } · respuesta recibida · colecciones detectadas: ${
                    registros
                }`;

        $("panelWeatherlinkHistorico")
            .classList.remove(
                "oculto"
            );

        estado(
            estadoElemento,
            "Histórico obtenido correctamente.",
            "ok"
        );

    }catch(error){

        estado(
            estadoElemento,
            error.message,
            "error"
        )
    }
}


function descargarHistorico(){

    if(!historicoWeatherlinkActual){
        return
    }

    const blob=
        new Blob(
            [
                JSON.stringify(
                    historicoWeatherlinkActual,
                    null,
                    2
                )
            ],
            {
                type:"application/json"
            }
        );

    const url=
        URL.createObjectURL(
            blob
        );

    const enlace=
        document.createElement(
            "a"
        );

    enlace.href=
        url;

    enlace.download=
        `weatherlink-historico-${
            $("weatherlinkStationId").value
            ||
            "estacion"
        }.json`;

    document.body.appendChild(
        enlace
    );

    enlace.click();

    enlace.remove();

    URL.revokeObjectURL(
        url
    )
}


/* ==========================================================
   EUMETSAT
   ========================================================== */

function limpiarEumetsat(){

    if(urlImagenEumetsat){

        URL.revokeObjectURL(
            urlImagenEumetsat
        );

        urlImagenEumetsat=null
    }

    const imagen=
        $("imagenEumetsat");

    if(imagen){

        imagen.hidden=true;

        imagen.removeAttribute(
            "src"
        )
    }

    if($("metaEumetsat")){

        $("metaEumetsat").textContent=
            "Todavía no se ha realizado ninguna consulta."
    }

    if($("estadoEumetsat")){

        estado(
            $("estadoEumetsat"),
            ""
        )
    }
}


async function cargarEumetsat(){

    const boton=
        $("botonEumetsatCargar");

    const estadoElemento=
        $("estadoEumetsat");

    const zona=
        $("eumetsatZona").value;

    boton.disabled=true;

    estado(
        estadoElemento,
        "Solicitando PNG LI AFA...",
        "info"
    );

    try{

        const respuesta=
            await fetch(
                `${
                    URL_API
                }${
                    RUTA_EUMETSAT
                }/imagen?zona=${
                    encodeURIComponent(
                        zona
                    )
                }`,
                {
                    cache:"no-store"
                }
            );

        await comprobar(
            respuesta
        );

        const blob=
            await respuesta.blob();

        if(urlImagenEumetsat){

            URL.revokeObjectURL(
                urlImagenEumetsat
            )
        }

        urlImagenEumetsat=
            URL.createObjectURL(
                blob
            );

        const imagen=
            $("imagenEumetsat");

        imagen.src=
            urlImagenEumetsat;

        imagen.hidden=
            false;

        const zonaTexto=
            $("eumetsatZona")
                .selectedOptions[0]
                ?.textContent
            ||
            zona;

        const tiempo=
            respuesta.headers.get(
                "X-MeteoArchidona-Eumetsat-Tiempo"
            )
            ||
            "no expuesto por CORS";

        const bbox=
            respuesta.headers.get(
                "X-MeteoArchidona-Eumetsat-Bbox"
            )
            ||
            "no expuesto por CORS";

        const dimensiones=
            respuesta.headers.get(
                "X-MeteoArchidona-Eumetsat-Dimensiones"
            )
            ||
            "no expuestas por CORS";

        $("metaEumetsat").textContent=
            `Zona: ${
                zonaTexto
            } · timestamp: ${
                tiempo
            } · BBOX: ${
                bbox
            } · dimensiones: ${
                dimensiones
            } · ${
                blob.size
            } bytes`;

        estado(
            estadoElemento,
            "PNG LI AFA obtenido correctamente.",
            "ok"
        );

    }catch(error){

        estado(
            estadoElemento,
            error.message,
            "error"
        );

    }finally{

        boton.disabled=false
    }
}


/* ==========================================================
   SQL
   ========================================================== */

function renderSql(
    datos
){

    const contenedor=
        $("tablaSql");

    contenedor.replaceChildren();

    const columnas=
        datos.columnas
        ||
        [];

    const filas=
        datos.filas
        ||
        [];

    $("resumenSql").textContent=
        `Tipo: ${
            datos.tipo
            ||
            "—"
        } · filas: ${
            datos.numero_filas
            ??
            filas.length
        } · afectadas: ${
            datos.filas_afectadas
            ??
            "—"
        }${
            datos.filas_truncadas
            ?
            " · resultado truncado"
            :
            ""
        }`;

    if(
        !columnas.length
        ||
        !filas.length
    ){

        const mensaje=
            document.createElement(
                "div"
            );

        mensaje.className=
            "nota";

        mensaje.textContent=
            "La operación no devolvió filas para mostrar.";

        contenedor.appendChild(
            mensaje
        );

        return
    }

    const tabla=
        document.createElement(
            "table"
        );

    const cabecera=
        document.createElement(
            "thead"
        );

    const filaCabecera=
        document.createElement(
            "tr"
        );

    columnas.forEach(
        columna=>{

            const celda=
                document.createElement(
                    "th"
                );

            celda.textContent=
                columna;

            filaCabecera.appendChild(
                celda
            )
        }
    );

    cabecera.appendChild(
        filaCabecera
    );

    const cuerpo=
        document.createElement(
            "tbody"
        );

    filas.forEach(
        fila=>{

            const filaElemento=
                document.createElement(
                    "tr"
                );

            columnas.forEach(
                (
                    columna,
                    indice
                )=>{

                    const celda=
                        document.createElement(
                            "td"
                        );

                    celda.textContent=
                        formatear(
                            Array.isArray(
                                fila
                            )
                            ?
                            fila[indice]
                            :
                            fila[columna]
                        );

                    filaElemento.appendChild(
                        celda
                    )
                }
            );

            cuerpo.appendChild(
                filaElemento
            )
        }
    );

    tabla.append(
        cabecera,
        cuerpo
    );

    contenedor.appendChild(
        tabla
    )
}


async function ejecutarSql(){

    const sentencia=
        $("sqlSentencia")
            .value
            .trim();

    const estadoElemento=
        $("estadoSql");

    if(!sentencia){

        estado(
            estadoElemento,
            "Escribe una sentencia SQL.",
            "error"
        );

        return
    }

    const boton=
        $("botonSqlEjecutar");

    boton.disabled=true;

    estado(
        estadoElemento,
        "Ejecutando SQL...",
        "info"
    );

    try{

        const datosFormulario=
            new FormData();

        datosFormulario.append(
            "sentencia",
            sentencia
        );

        datosFormulario.append(
            "confirmar_destructiva",
            String(
                $("sqlConfirmarDestructiva")
                    .checked
            )
        );

        const datos=
            await peticionJson(
                `${
                    RUTA_SQL
                }/ejecutar`,
                {
                    method:"POST",
                    body:datosFormulario
                }
            );

        renderSql(
            datos
        );

        $("panelResultadoSql")
            .classList.remove(
                "oculto"
            );

        estado(
            estadoElemento,
            "SQL ejecutado correctamente.",
            "ok"
        );

    }catch(error){

        estado(
            estadoElemento,
            error.message,
            "error"
        );

    }finally{

        boton.disabled=false
    }
}


async function exportarSql(){

    const sentencia=
        $("sqlSentencia")
            .value
            .trim();

    const estadoElemento=
        $("estadoSql");

    if(!sentencia){

        estado(
            estadoElemento,
            "Escribe una consulta de lectura para exportar.",
            "error"
        );

        return
    }

    const boton=
        $("botonSqlExportar");

    boton.disabled=true;

    estado(
        estadoElemento,
        "Generando CSV...",
        "info"
    );

    try{

        const datosFormulario=
            new FormData();

        datosFormulario.append(
            "sentencia",
            sentencia
        );

        const respuesta=
            await peticionAdministrativa(
                `${
                    RUTA_SQL
                }/exportar`,
                {
                    method:"POST",
                    body:datosFormulario
                }
            );

        const blob=
            await respuesta.blob();

        const url=
            URL.createObjectURL(
                blob
            );

        const enlace=
            document.createElement(
                "a"
            );

        enlace.href=
            url;

        enlace.download=
            "meteoarchidona-sql.csv";

        document.body.appendChild(
            enlace
        );

        enlace.click();

        enlace.remove();

        URL.revokeObjectURL(
            url
        );

        estado(
            estadoElemento,
            "CSV descargado correctamente.",
            "ok"
        );

    }catch(error){

        estado(
            estadoElemento,
            error.message,
            "error"
        );

    }finally{

        boton.disabled=false
    }
}


/* ==========================================================
   EVENTOS
   ========================================================== */

function configurarEventos(){

    document.querySelectorAll(
        "[data-numero]"
    ).forEach(
        boton=>
            boton.addEventListener(
                "click",
                ()=>
                    agregarNumero(
                        boton.dataset.numero
                    )
            )
    );

    $("botonBorrar")
        .addEventListener(
            "click",
            borrarPin
        );

    $("botonLimpiar")
        .addEventListener(
            "click",
            limpiarPin
        );

    $("botonCerrarSesion")
        .addEventListener(
            "click",
            ()=>
                cerrarSesion()
        );

    $("botonCerrarSesionCabecera")
        .addEventListener(
            "click",
            ()=>
                cerrarSesion()
        );

    $("botonActualizar")
        .addEventListener(
            "click",
            ()=>
                void cargarDatosAdministracion()
        );

    document.querySelectorAll(
        ".modulo-boton"
    ).forEach(
        boton=>
            boton.addEventListener(
                "click",
                ()=>
                    activarModulo(
                        boton.dataset.modulo
                    )
            )
    );

    document.querySelectorAll(
        "[data-ir-modulo]"
    ).forEach(
        boton=>
            boton.addEventListener(
                "click",
                ()=>
                    activarModulo(
                        boton.dataset.irModulo
                    )
            )
    );

    $("filtroTexto")
        .addEventListener(
            "input",
            renderizarEstaciones
        );

    $("filtroEstado")
        .addEventListener(
            "change",
            renderizarEstaciones
        );

    $("filtroProveedor")
        .addEventListener(
            "change",
            renderizarEstaciones
        );

    $("botonNuevaEstacion")
        .addEventListener(
            "click",
            formularioNuevaEstacion
        );

    $("botonCancelar")
        .addEventListener(
            "click",
            formularioNuevaEstacion
        );

    $("formularioEstacion")
        .addEventListener(
            "submit",
            guardarEstacion
        );

    $("botonNuevaRegla")
        .addEventListener(
            "click",
            nuevaRegla
        );

    $("formularioRegla")
        .addEventListener(
            "submit",
            guardarRegla
        );

    $("botonCancelarRegla")
        .addEventListener(
            "click",
            ()=>{

                $("editorRegla")
                    .classList.add(
                        "oculto"
                    );

                reglaEdicionId=null
            }
        );

    $("formularioOrigen")
        .addEventListener(
            "submit",
            guardarOrigen
        );

    $("botonCancelarOrigen")
        .addEventListener(
            "click",
            ()=>{

                $("editorOrigen")
                    .classList.add(
                        "oculto"
                    );

                reglaOrigenId=null;

                origenEdicionId=null
            }
        );

    $("botonWeatherlinkEstaciones")
        .addEventListener(
            "click",
            ()=>
                void consultarEstacionesWeatherlink()
        );

    $("botonWeatherlinkCondiciones")
        .addEventListener(
            "click",
            ()=>
                void consultarCondicionesWeatherlink()
        );

    $("botonWeatherlinkHistorico")
        .addEventListener(
            "click",
            ()=>
                void consultarHistoricoWeatherlink()
        );

    $("botonDescargarHistorico")
        .addEventListener(
            "click",
            descargarHistorico
        );

    $("botonEumetsatCargar")
        .addEventListener(
            "click",
            ()=>
                void cargarEumetsat()
        );

    $("botonEumetsatLimpiar")
        .addEventListener(
            "click",
            limpiarEumetsat
        );

    $("botonSqlEjecutar")
        .addEventListener(
            "click",
            ()=>
                void ejecutarSql()
        );

    $("botonSqlExportar")
        .addEventListener(
            "click",
            ()=>
                void exportarSql()
        );

    $("botonSqlEjemplo")
        .addEventListener(
            "click",
            ()=>{

                $("sqlSentencia").value=
                    "SELECT * FROM estaciones ORDER BY id;"
            }
        );

    $("botonSqlLimpiar")
        .addEventListener(
            "click",
            ()=>{

                $("sqlSentencia").value=
                    "";

                $("sqlConfirmarDestructiva").checked=
                    false;

                $("panelResultadoSql")
                    .classList.add(
                        "oculto"
                    );

                estado(
                    $("estadoSql"),
                    ""
                )
            }
        )
}


async function iniciar(){

    configurarEventos();

    actualizarPin();

    if(sesionEsValida()){

        abrirPanel();

        await cargarDatosAdministracion();

    }else{

        eliminarSesion();

        mostrarAcceso()
    }
}


void iniciar();


// Fin de fichero: js/administracion.js
