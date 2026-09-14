/*
 * MeteoArchidona
 * Administración
 *
 * Consola SQL administrativa.
 *
 * Responsabilidades:
 *
 * - ejecutar sentencias SQL administrativas;
 * - mostrar resultados tabulares;
 * - informar del tipo de operación y filas afectadas;
 * - exportar consultas de lectura a CSV;
 * - cargar una consulta de ejemplo;
 * - limpiar el editor y sus resultados.
 *
 * Este módulo todavía no sustituye al código equivalente de
 * js/administracion.js. La conexión definitiva se realizará desde
 * principal.js cuando todos los módulos estén preparados.
 */


import {
    $,
    mostrarEstado,
    formatearValor
} from "./estado.js";

import {
    RUTA_SQL,
    peticionAdministrativa,
    peticionJson
} from "./api.js";


/* ==========================================================
   RENDER DE RESULTADOS
   ========================================================== */

function renderizarResultadoSql(
    datos
){

    const contenedor=
        $("tablaSql");

    if(!contenedor){
        return
    }

    contenedor.replaceChildren();

    const columnas=
        Array.isArray(
            datos.columnas
        )
        ?
        datos.columnas
        :
        [];

    const filas=
        Array.isArray(
            datos.filas
        )
        ?
        datos.filas
        :
        [];

    if($("resumenSql")){

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
            }`
    }

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

                    const valor=
                        Array.isArray(
                            fila
                        )
                        ?
                        fila[indice]
                        :
                        fila?.[columna];

                    celda.textContent=
                        formatearValor(
                            valor
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


/* ==========================================================
   EJECUCIÓN
   ========================================================== */

export async function ejecutarSql(){

    const sentencia=
        $("sqlSentencia")
            ?.value
            .trim()
        ||
        "";

    const estadoElemento=
        $("estadoSql");

    if(!sentencia){

        mostrarEstado(
            estadoElemento,
            "Escribe una sentencia SQL.",
            "error"
        );

        return
    }

    const boton=
        $("botonSqlEjecutar");

    if(boton){

        boton.disabled=
            true
    }

    mostrarEstado(
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
                !!$("sqlConfirmarDestructiva")
                    ?.checked
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

        renderizarResultadoSql(
            datos
        );

        $("panelResultadoSql")
            ?.classList
            .remove(
                "oculto"
            );

        mostrarEstado(
            estadoElemento,
            "SQL ejecutado correctamente.",
            "ok"
        );

        return datos

    }catch(error){

        mostrarEstado(
            estadoElemento,
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
   EXPORTACIÓN CSV
   ========================================================== */

export async function exportarSql(){

    const sentencia=
        $("sqlSentencia")
            ?.value
            .trim()
        ||
        "";

    const estadoElemento=
        $("estadoSql");

    if(!sentencia){

        mostrarEstado(
            estadoElemento,
            "Escribe una consulta de lectura para exportar.",
            "error"
        );

        return
    }

    const boton=
        $("botonSqlExportar");

    if(boton){

        boton.disabled=
            true
    }

    mostrarEstado(
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

        mostrarEstado(
            estadoElemento,
            "CSV descargado correctamente.",
            "ok"
        );

    }catch(error){

        mostrarEstado(
            estadoElemento,
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
   CONSULTA DE EJEMPLO
   ========================================================== */

export function cargarEjemploSql(){

    if(!$("sqlSentencia")){
        return
    }

    $("sqlSentencia").value=
        "SELECT * FROM estaciones ORDER BY id;"
}


/* ==========================================================
   LIMPIEZA
   ========================================================== */

export function limpiarSql(){

    if($("sqlSentencia")){

        $("sqlSentencia").value=
            ""
    }

    if($("sqlConfirmarDestructiva")){

        $("sqlConfirmarDestructiva").checked=
            false
    }

    $("panelResultadoSql")
        ?.classList
        .add(
            "oculto"
        );

    if($("tablaSql")){

        $("tablaSql").replaceChildren()
    }

    if($("resumenSql")){

        $("resumenSql").textContent=
            ""
    }

    mostrarEstado(
        $("estadoSql"),
        ""
    )
}


/* ==========================================================
   EVENTOS
   ========================================================== */

export function configurarEventosSql(){

    $("botonSqlEjecutar")
        ?.addEventListener(
            "click",
            ()=>
                void ejecutarSql()
        );

    $("botonSqlExportar")
        ?.addEventListener(
            "click",
            ()=>
                void exportarSql()
        );

    $("botonSqlEjemplo")
        ?.addEventListener(
            "click",
            cargarEjemploSql
        );

    $("botonSqlLimpiar")
        ?.addEventListener(
            "click",
            limpiarSql
        )
}


// Fin de fichero: js/administracion/sql.js