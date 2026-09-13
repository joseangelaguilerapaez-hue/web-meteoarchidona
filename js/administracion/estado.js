/*
 * MeteoArchidona
 * Administración
 *
 * Estado compartido y utilidades comunes de los módulos
 * administrativos.
 *
 * Este fichero no contiene lógica específica de estaciones,
 * simulación, WeatherLink, EUMETSAT, SQL ni autenticación.
 *
 * Su misión es ofrecer un único estado compartido para los módulos
 * de Administración y pequeñas funciones auxiliares utilizadas por
 * más de una responsabilidad.
 */


/* ==========================================================
   ESTADO COMPARTIDO
   ========================================================== */

export const estadoAdministracion={

    pinIntroducido:"",
    solicitudEnCurso:false,
    intervaloSesion:null,

    codigoEdicion:null,

    urlImagenEumetsat:null,
    historicoWeatherlinkActual:null,

    catalogos:{
        estados:[],
        proveedores:[],
        variables_simulacion:[],
        operaciones_simulacion:[],
        estacionalidades_simulacion:[],
        franjas_dia_simulacion:[]
    },

    estaciones:[],
    reglasActuales:[],

    reglaEdicionId:null,
    reglaOrigenId:null,
    origenEdicionId:null
};


/* ==========================================================
   ACCESO AL DOM
   ========================================================== */

export function $(
    id
){

    return document.getElementById(
        id
    )
}


/* ==========================================================
   ESTADOS VISUALES
   ========================================================== */

export function mostrarEstado(
    elemento,
    mensaje,
    tipo=""
){

    if(!elemento){
        return
    }

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


/* ==========================================================
   SELECTORES
   ========================================================== */

export function crearOpcion(
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


export function asegurarOpcionSelect(
    select,
    valor
){

    if(!select){
        return
    }

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
        String(
            valor
        );

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
            crearOpcion(
                texto,
                texto
            )
        )
    }

    select.value=
        texto
}


/* ==========================================================
   NORMALIZACIÓN DE VALORES
   ========================================================== */

export function valorNullable(
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


export function numeroNullable(
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


/* ==========================================================
   PRESENTACIÓN DE VALORES
   ========================================================== */

export function formatearFecha(
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


export function formatearValor(
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


/* ==========================================================
   CATÁLOGOS
   ========================================================== */

export function reiniciarCatalogos(){

    estadoAdministracion.catalogos={
        estados:[],
        proveedores:[],
        variables_simulacion:[],
        operaciones_simulacion:[],
        estacionalidades_simulacion:[],
        franjas_dia_simulacion:[]
    }
}


export function establecerCatalogos(
    datos={}
){

    estadoAdministracion.catalogos={

        estados:
            Array.isArray(
                datos.estados
            )
            ?
            datos.estados
            :
            [],

        proveedores:
            Array.isArray(
                datos.proveedores
            )
            ?
            datos.proveedores
            :
            [],

        variables_simulacion:
            Array.isArray(
                datos.variables_simulacion
            )
            ?
            datos.variables_simulacion
            :
            [],

        operaciones_simulacion:
            Array.isArray(
                datos.operaciones_simulacion
            )
            ?
            datos.operaciones_simulacion
            :
            [],

        estacionalidades_simulacion:
            Array.isArray(
                datos.estacionalidades_simulacion
            )
            ?
            datos.estacionalidades_simulacion
            :
            [],

        franjas_dia_simulacion:
            Array.isArray(
                datos.franjas_dia_simulacion
            )
            ?
            datos.franjas_dia_simulacion
            :
            []
    }
}


/* ==========================================================
   LIMPIEZA DEL ESTADO
   ========================================================== */

export function reiniciarEstadoAdministracion(){

    estadoAdministracion.pinIntroducido="";

    estadoAdministracion.solicitudEnCurso=false;

    estadoAdministracion.codigoEdicion=null;

    estadoAdministracion.historicoWeatherlinkActual=null;

    estadoAdministracion.estaciones=[];

    estadoAdministracion.reglasActuales=[];

    estadoAdministracion.reglaEdicionId=null;

    estadoAdministracion.reglaOrigenId=null;

    estadoAdministracion.origenEdicionId=null;

    reiniciarCatalogos()
}


// Fin de fichero: js/administracion/estado.js