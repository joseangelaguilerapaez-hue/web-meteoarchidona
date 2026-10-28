/*
 * MeteoArchidona
 * Página Estadísticas (pages/estadisticas.html)
 *
 * Sección pública del menú, pero su contenido es para usuarios
 * registrados y para Administración (decisión de José, 28-10-2026):
 *
 * - sin sesión, un aviso de que hace falta registrarse, con los botones
 *   de registro e inicio de sesión de js/cuenta.js;
 * - con sesión, el catálogo por secciones y, al elegir una estadística,
 *   el visor reutilizable (js/visor-estadisticas.js) con su gráfica, su
 *   tabla y el PDF.
 *
 * Quién puede entrar lo decide la API, no esta página:
 *
 *     GET /estadisticas/catalogo              401 si no hay sesión
 *     GET /estadisticas/catalogo/{id}/datos   los datos para el visor
 *
 * Un usuario va con su cookie de sesión (ma_sesion). Administración, con
 * el token que guarda su panel en sessionStorage, si sigue vigente en
 * esta pestaña.
 *
 * Al iniciar o cerrar sesión, js/cuenta.js avisa con el evento
 * «meteoarchidona:cuenta» y la página se vuelve a comprobar sin recargar.
 *
 * La dirección guarda la estadística abierta (/estadisticas#LLUVIA_HOY)
 * para poder volver a ella o compartirla con otro usuario registrado.
 */

import {
    crearVisorEstadisticas,
    mensajeDeError
} from "./visor-estadisticas.js?v=20261027-visor1";


const URL_API = window.API_BASE || "/api";

// Las mismas claves que usa js/administracion.js.
const CLAVE_TOKEN = "meteoarchidona_admin_token";
const CLAVE_EXPIRACION = "meteoarchidona_admin_expira_en";

const NOMBRES_PERIODO = {
    HOY: "Hoy",
    AYER: "Ayer",
    ULTIMAS_24_HORAS: "Últimas 24 horas",
    ULTIMOS_7_DIAS: "Últimos 7 días",
    ULTIMOS_30_DIAS: "Últimos 30 días",
    ESTE_MES: "Este mes",
    MES_PASADO: "Mes pasado",
    ESTE_ANIO: "Este año",
    ANIO_PASADO: "Año pasado",
};

const NOMBRES_AGRUPACION = {
    SIN_AGRUPAR: "cada lectura",
    HORA: "por horas",
    DIA: "por días",
    SEMANA: "por semanas",
    MES: "por meses",
    ANIO: "por años",
};

const NOMBRES_PRESENTACION = {
    GRAFICA: "Gráfica",
    TABLA: "Tabla",
    AMBAS: "Gráfica y tabla",
};


const $ = id => document.getElementById(id);

let secciones = [];

let seccionActual = null;

let definicionActual = null;

let visor = null;

let comprobacion = 0;

let peticionDatos = 0;


/* ==========================================================
   ACCESO
   ========================================================== */

function cabecerasAdministracion(){

    try{
        const token = sessionStorage.getItem(CLAVE_TOKEN);
        const expira = Number(sessionStorage.getItem(CLAVE_EXPIRACION));

        if(token && Number.isFinite(expira) && expira > Date.now() / 1000){
            return {Authorization: `Bearer ${token}`};
        }
    }catch{
        // Sin sessionStorage (navegación privada estricta): como usuario.
    }

    return {};
}


function pedir(ruta){

    return fetch(`${URL_API}${ruta}`, {
        headers: cabecerasAdministracion(),
        credentials: "same-origin",
        cache: "no-store",
    });
}


/* ==========================================================
   ESTADOS DE LA PÁGINA
   ========================================================== */

function mostrarSolo(cual){

    $("estadisticas-comprobando").hidden = cual !== "comprobando";
    $("estadisticas-registro").hidden = cual !== "registro";
    $("estadisticas-catalogo").hidden = cual !== "catalogo";
    $("estadisticas-error").hidden = cual !== "error";

    if(cual !== "catalogo"){
        $("estadisticas-visor").hidden = true;
    }
}


function mostrarError(texto){

    $("estadisticas-error").textContent = texto;
    mostrarSolo("error");
}


async function comprobar(){

    const esta = ++comprobacion;

    let respuesta;

    try{
        respuesta = await pedir("/estadisticas/catalogo");
    }catch{
        if(esta === comprobacion){
            mostrarError("No se ha podido conectar con MeteoArchidona. Inténtalo de nuevo en un momento.");
        }
        return;
    }

    if(esta !== comprobacion){
        return;
    }

    if(respuesta.status === 401 || respuesta.status === 403){
        secciones = [];
        definicionActual = null;
        visor?.vaciar();
        mostrarSolo("registro");
        return;
    }

    if(!respuesta.ok){
        mostrarError(await mensajeDeError(respuesta));
        return;
    }

    const datos = await respuesta.json();

    if(esta !== comprobacion){
        return;
    }

    secciones = datos.secciones.filter(s => s.definiciones.length);

    if(!secciones.length){
        mostrarError("Todavía no hay estadísticas publicadas en el catálogo.");
        return;
    }

    mostrarSolo("catalogo");
    abrirDesdeDireccion();
}


/* ==========================================================
   CATÁLOGO
   ========================================================== */

function elemento(etiqueta, clase, texto){

    const nodo = document.createElement(etiqueta);

    if(clase){
        nodo.className = clase;
    }

    if(texto !== undefined){
        nodo.textContent = texto;
    }

    return nodo;
}


function nombreEstacion(codigo){

    return codigo
        .toLowerCase()
        .split("_")
        .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
        .join(" ");
}


function textoDetalle(definicion){

    const periodo = NOMBRES_PERIODO[definicion.periodo_relativo] || "Periodo fijo";
    const agrupacion = NOMBRES_AGRUPACION[definicion.agrupacion] || "";

    return [
        agrupacion ? `${periodo}, ${agrupacion}` : periodo,
        definicion.estaciones.map(nombreEstacion).join(" y "),
    ].filter(Boolean).join(" · ");
}


function pintarSecciones(){

    const nav = $("estadisticas-secciones");

    nav.replaceChildren(...secciones.map(seccion => {

        const boton = elemento("button", "estadisticas-seccion", seccion.nombre);
        boton.type = "button";
        boton.dataset.seccion = seccion.codigo;
        boton.setAttribute("aria-pressed", String(seccion === seccionActual));

        const cuenta = elemento("span", "estadisticas-seccion-cuenta", String(seccion.definiciones.length));
        boton.append(cuenta);

        boton.addEventListener("click", () => elegirSeccion(seccion));

        return boton;
    }));
}


function pintarLista(){

    const lista = $("estadisticas-lista");

    const tarjetas = seccionActual.definiciones.map(definicion => {

        const tarjeta = elemento("button", "estadisticas-tarjeta");
        tarjeta.type = "button";
        tarjeta.setAttribute("aria-pressed", String(definicion === definicionActual));

        const tipo = elemento(
            "span",
            "estadisticas-tarjeta-tipo",
            NOMBRES_PRESENTACION[definicion.presentacion] || ""
        );

        const nombre = elemento("span", "estadisticas-tarjeta-nombre", definicion.nombre);

        tarjeta.append(tipo, nombre);

        if(definicion.descripcion){
            tarjeta.append(elemento("span", "estadisticas-tarjeta-descripcion", definicion.descripcion));
        }

        tarjeta.append(elemento("span", "estadisticas-tarjeta-detalle", textoDetalle(definicion)));

        tarjeta.addEventListener("click", () => abrir(definicion, {desplazar: true}));

        return tarjeta;
    });

    const cabecera = elemento("div", "estadisticas-lista-cabecera");

    cabecera.append(
        elemento("h2", "", seccionActual.nombre),
        elemento(
            "p",
            "",
            seccionActual.descripcion || "Pulsa una estadística para verla."
        )
    );

    const rejilla = elemento("div", "estadisticas-rejilla");
    rejilla.append(...tarjetas);

    lista.replaceChildren(cabecera, rejilla);
}


function elegirSeccion(seccion){

    seccionActual = seccion;
    pintarSecciones();
    pintarLista();
}


function buscar(codigo){

    for(const seccion of secciones){
        const definicion = seccion.definiciones.find(d => d.codigo === codigo);

        if(definicion){
            return {seccion, definicion};
        }
    }

    return null;
}


function abrirDesdeDireccion(){

    const codigo = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    const encontrada = codigo ? buscar(codigo) : null;

    if(encontrada){
        seccionActual = encontrada.seccion;
        pintarSecciones();
        pintarLista();
        abrir(encontrada.definicion, {desplazar: true, cambiarDireccion: false});
        return;
    }

    if(!seccionActual || !secciones.includes(seccionActual)){
        seccionActual = secciones.find(s => s.codigo === seccionActual?.codigo) || secciones[0];
    }

    pintarSecciones();
    pintarLista();
}


/* ==========================================================
   VISOR
   ========================================================== */

async function abrir(definicion, {desplazar = false, cambiarDireccion = true} = {}){

    const otra = definicion !== definicionActual;

    definicionActual = definicion;
    pintarLista();

    if(cambiarDireccion && definicion.codigo){
        history.replaceState(null, "", `#${encodeURIComponent(definicion.codigo)}`);
    }

    const zona = $("estadisticas-visor");
    zona.hidden = false;

    if(!visor){
        visor = crearVisorEstadisticas($("estadisticas-visor-contenido"));
    }

    if(otra){
        // Que no quede a la vista la anterior mientras llega esta.
        visor.vaciar();
    }

    visor.mostrarCargando();

    if(desplazar){
        zona.scrollIntoView({behavior: "smooth", block: "start"});
    }

    const esta = ++peticionDatos;

    try{
        const respuesta = await pedir(`/estadisticas/catalogo/${definicion.id}/datos`);

        if(esta !== peticionDatos){
            return;
        }

        if(respuesta.status === 401 || respuesta.status === 403){
            comprobar();
            return;
        }

        if(!respuesta.ok){
            visor.mostrarError(await mensajeDeError(respuesta));
            return;
        }

        const resultado = await respuesta.json();

        if(esta === peticionDatos){
            visor.mostrar(resultado);
        }
    }catch{
        if(esta === peticionDatos){
            visor.mostrarError("No se ha podido calcular. Inténtalo de nuevo en un momento.");
        }
    }
}


/* ==========================================================
   ARRANQUE
   ========================================================== */

document.addEventListener("meteoarchidona:cuenta", () => comprobar());

window.addEventListener("hashchange", () => {
    if(secciones.length){
        abrirDesdeDireccion();
    }
});

comprobar();


// Fin de fichero: js/estadisticas.js
