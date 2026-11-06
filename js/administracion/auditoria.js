/*
 * MeteoArchidona
 * Administración · Auditoría.
 *
 * Sección propia de Administración con pestañas (José, 5 y 6-11-2026).
 * La primera es «Visitas»; las siguientes (estadísticas de visitas y
 * otras consultas) se decidirán más adelante.
 *
 * GET /admin/auditoria/visitas?desde&hasta&unicos&propias&despues&limite
 * GET /admin/auditoria/visitas/{sesion}
 *
 * Visitas: listado completo en líneas finas, solo con lo importante, la
 * más reciente arriba; al bajar se cargan más. Al pulsar una línea se
 * abre debajo su ficha con todo lo guardado y el recorrido.
 *
 * - Periodo: Hoy (por defecto), Semana (de lunes a hoy), Mes o Fechas.
 * - «Una por visitante»: una línea por navegador, la de su última visita
 *   del periodo, con cuántas hizo.
 * - «Incluir las propias»: por defecto no salen las visitas de los
 *   navegadores desde los que se ha entrado alguna vez con una cuenta
 *   administradora (José, Mario).
 *
 * Solo hay visitas de quienes aceptan las estadísticas: de los demás no
 * se guarda nada que permita listarlos.
 */

import {
    $,
    mostrarEstado
} from "./estado.js?v=20261026-cache1";

import {
    peticionJson
} from "./api.js?v=20261026-cache1";


const RUTA = "/admin/auditoria/visitas";
const ZONA = "Europe/Madrid";
const POR_TANDA = 50;

const DISPOSITIVOS = {
    MOVIL: "Móvil",
    TABLETA: "Tableta",
    ORDENADOR: "Ordenador",
    OTRO: "Otro"
};

const PERIODOS = {
    hoy: "hoy",
    semana: "esta semana",
    mes: "este mes",
    fechas: "entre esas fechas"
};

const filtro = {
    periodo: "hoy",
    desde: "",
    hasta: "",
    unicos: false,
    propias: false
};

let siguiente = null;
let cargando = false;
let peticionActual = 0;
let observador = null;
let eventosConfigurados = false;
let abierta = null;


/* ==========================================================
   UTILIDADES
   ========================================================== */

function crear(etiqueta, clase, texto){

    const elemento = document.createElement(etiqueta);

    if(clase){
        elemento.className = clase;
    }

    if(texto !== undefined && texto !== null){
        elemento.textContent = texto;
    }

    return elemento;
}


/* Fecha de Madrid como AAAA-MM-DD. */
function diaMadrid(fecha = new Date()){

    return new Intl.DateTimeFormat("en-CA", {
        timeZone: ZONA,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).format(fecha);
}


function sumarDias(dia, dias){

    const [anio, mes, d] = dia.split("-").map(Number);
    const fecha = new Date(Date.UTC(anio, mes - 1, d + dias));
    return fecha.toISOString().slice(0, 10);
}


function rangoPeriodo(){

    const hoy = diaMadrid();

    if(filtro.periodo === "semana"){
        const [anio, mes, d] = hoy.split("-").map(Number);
        const semana = (new Date(Date.UTC(anio, mes - 1, d)).getUTCDay() + 6) % 7;
        return [sumarDias(hoy, -semana), hoy];
    }

    if(filtro.periodo === "mes"){
        return [`${hoy.slice(0, 8)}01`, hoy];
    }

    if(filtro.periodo === "fechas"){
        const desde = filtro.desde || hoy;
        const hasta = filtro.hasta || desde;
        return desde <= hasta ? [desde, hasta] : [hasta, desde];
    }

    return [hoy, hoy];
}


function hora(valor, conFecha){

    const opciones = {
        timeZone: ZONA,
        hour: "2-digit",
        minute: "2-digit"
    };

    if(conFecha){
        opciones.day = "2-digit";
        opciones.month = "2-digit";
    }

    return new Date(valor).toLocaleString("es-ES", opciones);
}


function horaSegundos(valor){

    return new Date(valor).toLocaleTimeString("es-ES", {
        timeZone: ZONA,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
}


function fechaCompleta(valor){

    if(!valor){
        return "—";
    }

    return new Date(valor).toLocaleString("es-ES", {
        timeZone: ZONA,
        dateStyle: "short",
        timeStyle: "medium"
    });
}


function duracion(segundos){

    if(!segundos){
        return "0 s";
    }

    if(segundos < 60){
        return `${segundos} s`;
    }

    const minutos = Math.floor(segundos / 60);

    if(minutos < 60){
        return `${minutos} min`;
    }

    return `${Math.floor(minutos / 60)} h ${minutos % 60} min`;
}


function zona(visita){

    return [visita.localidad, visita.region, visita.pais]
        .filter(Boolean)
        .filter((valor, indice, lista) => lista.indexOf(valor) === indice)
        .slice(0, 2)
        .join(", ")
        || "Zona desconocida";
}


function siNo(valor){

    if(valor === null || valor === undefined){
        return "—";
    }

    return valor ? "Sí" : "No";
}


/* ==========================================================
   LÍNEA
   ========================================================== */

function linea(visita, conFecha){

    const fila = crear("li", "auditoria-visita");

    const boton = crear("button", "auditoria-linea");
    boton.type = "button";
    boton.setAttribute("aria-expanded", "false");

    boton.append(
        crear("span", "auditoria-hora", hora(visita.inicio, conFecha)),
        crear("span", "auditoria-zona", zona(visita)),
        crear(
            "span",
            "auditoria-equipo",
            [DISPOSITIVOS[visita.dispositivo] || visita.dispositivo, visita.navegador]
                .filter(Boolean)
                .join(" · ")
            || "—"
        ),
        crear("span", "auditoria-paginas", `${visita.paginas} pág.`),
        crear("span", "auditoria-duracion", duracion(visita.duracion_segundos))
    );

    const marcas = crear("span", "auditoria-marcas");

    if(visita.usuario){
        marcas.append(crear("span", "auditoria-marca auditoria-marca-usuario", visita.usuario));
    }
    if(visita.nuevo){
        marcas.append(crear("span", "auditoria-marca auditoria-marca-nuevo", "Nuevo"));
    }
    if(visita.visitas_periodo > 1){
        marcas.append(crear("span", "auditoria-marca", `×${visita.visitas_periodo}`));
    }
    if(visita.propia){
        marcas.append(crear("span", "auditoria-marca auditoria-marca-propia", "Propia"));
    }

    boton.append(marcas);

    boton.title = visita.primera_pagina
        ? `Entró por ${visita.primera_pagina}`
        : "";

    boton.addEventListener("click", () => {
        alternarFicha(fila, boton, visita.sesion);
    });

    fila.append(boton);
    return fila;
}


/* ==========================================================
   FICHA
   ========================================================== */

function dato(lista, etiqueta, valor){

    const par = crear("div", "auditoria-dato");
    par.append(
        crear("dt", "", etiqueta),
        crear("dd", "", valor === null || valor === undefined || valor === "" ? "—" : String(valor))
    );
    lista.append(par);
}


function textoDatos(datos){

    if(!datos || !Object.keys(datos).length){
        return "";
    }

    return Object.entries(datos)
        .map(([clave, valor]) => `${clave}: ${typeof valor === "object" ? JSON.stringify(valor) : valor}`)
        .join(" · ");
}


function pintarFicha(contenedor, ficha){

    const datos = crear("dl", "auditoria-ficha-datos");

    dato(datos, "Inicio", fechaCompleta(ficha.inicio));
    dato(datos, "Última actividad", fechaCompleta(ficha.ultima_actividad));
    dato(datos, "Cierre", ficha.fin ? fechaCompleta(ficha.fin) : "Sin cerrar");
    dato(datos, "Duración", duracion(ficha.duracion_segundos));
    dato(datos, "Usuario", ficha.usuario || "Anónimo");
    dato(datos, "Visitante", ficha.visitante);
    dato(datos, "Primera visita", fechaCompleta(ficha.primera_visita_visitante));
    dato(datos, "Visitas en total", ficha.visitas_visitante);
    dato(datos, "IP", ficha.ip);
    dato(datos, "Zona", [ficha.localidad, ficha.region, ficha.pais].filter(Boolean).join(", "));
    dato(datos, "Dispositivo", DISPOSITIVOS[ficha.dispositivo] || ficha.dispositivo);
    dato(datos, "Navegador", ficha.navegador);
    dato(datos, "Sistema", ficha.sistema);
    dato(datos, "Pantalla", ficha.pantalla);
    dato(datos, "Ventana", ficha.ventana);
    dato(datos, "Táctil", siNo(ficha.tactil));
    dato(datos, "Modo oscuro", siNo(ficha.modo_oscuro));
    dato(datos, "Idioma", ficha.idioma);
    dato(datos, "Zona horaria", ficha.zona_horaria);
    dato(datos, "Procedencia", ficha.procedencia || "Directa");

    if(ficha.campana && Object.keys(ficha.campana).length){
        dato(datos, "Campaña", textoDatos(ficha.campana));
    }

    dato(datos, "Sesión", ficha.sesion);

    const titulo = crear(
        "h4",
        "auditoria-ficha-titulo",
        `Recorrido (${ficha.eventos.length} ${ficha.eventos.length === 1 ? "evento" : "eventos"})`
    );

    const recorrido = crear("ol", "auditoria-recorrido");

    for(const evento of ficha.eventos){

        const paso = crear("li", "auditoria-paso");
        const detalle = [evento.componente, textoDatos(evento.datos)]
            .filter(Boolean)
            .join(" · ");

        paso.append(
            crear("span", "auditoria-paso-hora", horaSegundos(evento.fecha)),
            crear("span", "auditoria-paso-pagina", evento.pagina),
            crear("span", "auditoria-paso-evento", evento.evento),
            crear("span", "auditoria-paso-detalle", detalle)
        );

        recorrido.append(paso);
    }

    if(!ficha.eventos.length){
        recorrido.append(crear("li", "auditoria-paso", "Sin eventos registrados."));
    }

    contenedor.replaceChildren(datos, titulo, recorrido);
}


async function alternarFicha(fila, boton, sesion){

    const existente = fila.querySelector(".auditoria-ficha");

    if(existente){
        existente.remove();
        boton.setAttribute("aria-expanded", "false");
        fila.classList.remove("abierta");
        abierta = null;
        return;
    }

    // Solo una ficha abierta a la vez: así la lista sigue siendo fina.
    if(abierta && abierta !== fila){
        abierta.querySelector(".auditoria-ficha")?.remove();
        abierta.querySelector(".auditoria-linea")?.setAttribute("aria-expanded", "false");
        abierta.classList.remove("abierta");
    }

    const contenedor = crear("div", "auditoria-ficha", "Cargando…");
    fila.append(contenedor);
    fila.classList.add("abierta");
    boton.setAttribute("aria-expanded", "true");
    abierta = fila;

    try{
        const ficha = await peticionJson(`${RUTA}/${encodeURIComponent(sesion)}`);
        if(contenedor.isConnected){
            pintarFicha(contenedor, ficha);
        }
    }catch(error){
        contenedor.textContent = error.message || "No se ha podido cargar la ficha.";
        contenedor.classList.add("auditoria-ficha-error");
    }
}


/* ==========================================================
   LISTADO
   ========================================================== */

function ruta(despues){

    const [desde, hasta] = rangoPeriodo();
    const parametros = new URLSearchParams({
        desde,
        hasta,
        limite: String(POR_TANDA)
    });

    if(filtro.unicos){
        parametros.set("unicos", "true");
    }
    if(filtro.propias){
        parametros.set("propias", "true");
    }
    if(despues){
        parametros.set("despues", despues);
    }

    return `${RUTA}?${parametros}`;
}


function resumen(total){

    const nombre = filtro.unicos
        ? (total === 1 ? "visitante" : "visitantes")
        : (total === 1 ? "visita" : "visitas");

    const [desde, hasta] = rangoPeriodo();
    const periodo = filtro.periodo === "fechas"
        ? (desde === hasta
            ? `el ${desde.split("-").reverse().join("/")}`
            : `del ${desde.split("-").reverse().join("/")} al ${hasta.split("-").reverse().join("/")}`)
        : PERIODOS[filtro.periodo];

    return `${total.toLocaleString("es-ES")} ${nombre} ${periodo}`
        + (filtro.propias ? ", con las propias." : ".");
}


export async function cargarVisitas({mas = false} = {}){

    const lista = $("listaAuditoriaVisitas");
    const estado = $("estadoAuditoria");

    if(!lista || (mas && (!siguiente || cargando))){
        return;
    }

    const numero = ++peticionActual;
    cargando = true;

    if(!mas){
        siguiente = null;
        abierta = null;
        lista.replaceChildren();
        $("resumenAuditoria").textContent = "";
    }

    mostrarEstado(estado, mas ? "Cargando más…" : "Cargando…");

    try{
        const respuesta = await peticionJson(ruta(mas ? siguiente : null));

        // Si entretanto se cambió el filtro, esta respuesta ya no vale.
        if(numero !== peticionActual){
            return;
        }

        const [desde, hasta] = rangoPeriodo();
        const conFecha = desde !== hasta;

        lista.classList.toggle("con-fecha", conFecha);
        lista.append(...respuesta.visitas.map(visita => linea(visita, conFecha)));
        siguiente = respuesta.siguiente;

        $("resumenAuditoria").textContent = resumen(respuesta.total);
        $("botonMasAuditoria").hidden = !siguiente;

        mostrarEstado(
            estado,
            respuesta.total ? "" : "No hay visitas en este periodo.",
            respuesta.total ? undefined : "info"
        );

    }catch(error){

        if(numero === peticionActual){
            mostrarEstado(
                estado,
                error.message || "No se han podido cargar las visitas.",
                "error"
            );
        }
        throw error;

    }finally{

        if(numero === peticionActual){
            cargando = false;
        }
    }
}


/* ==========================================================
   FILTROS
   ========================================================== */

function pintarFiltros(){

    for(const boton of document.querySelectorAll("#periodosAuditoria [data-periodo]")){
        const activo = boton.dataset.periodo === filtro.periodo;
        boton.classList.toggle("activo", activo);
        boton.setAttribute("aria-pressed", String(activo));
    }

    const fechas = $("fechasAuditoria");
    if(fechas){
        fechas.hidden = filtro.periodo !== "fechas";
    }
}


function recargar(){

    cargarVisitas().catch(() => {});
}


export function configurarEventosAuditoria(){

    if(eventosConfigurados){
        return;
    }

    eventosConfigurados = true;

    const hoy = diaMadrid();
    $("desdeAuditoria").value = hoy;
    $("hastaAuditoria").value = hoy;
    $("desdeAuditoria").max = hoy;
    $("hastaAuditoria").max = hoy;

    for(const boton of document.querySelectorAll("#periodosAuditoria [data-periodo]")){
        boton.addEventListener("click", () => {
            filtro.periodo = boton.dataset.periodo;
            if(filtro.periodo === "fechas"){
                filtro.desde = $("desdeAuditoria").value;
                filtro.hasta = $("hastaAuditoria").value;
            }
            pintarFiltros();
            recargar();
        });
    }

    for(const id of ["desdeAuditoria", "hastaAuditoria"]){
        $(id).addEventListener("change", () => {
            filtro.desde = $("desdeAuditoria").value;
            filtro.hasta = $("hastaAuditoria").value;
            recargar();
        });
    }

    $("unicosAuditoria").addEventListener("change", evento => {
        filtro.unicos = evento.target.checked;
        recargar();
    });

    $("propiasAuditoria").addEventListener("change", evento => {
        filtro.propias = evento.target.checked;
        recargar();
    });

    $("botonRecargarAuditoria").addEventListener("click", recargar);

    $("botonMasAuditoria").addEventListener("click", () => {
        cargarVisitas({mas: true}).catch(() => {});
    });

    // Al llegar al final de la lista se piden más sin pulsar nada.
    if("IntersectionObserver" in window){
        observador = new IntersectionObserver(entradas => {
            if(
                entradas.some(entrada => entrada.isIntersecting)
                && $("modulo-auditoria")?.classList.contains("activo")
            ){
                cargarVisitas({mas: true}).catch(() => {});
            }
        }, {rootMargin: "300px"});
        observador.observe($("finAuditoria"));
    }

    pintarFiltros();
}


export function limpiarAuditoria(){

    peticionActual++;
    siguiente = null;
    cargando = false;
    abierta = null;
    $("listaAuditoriaVisitas")?.replaceChildren();
    const resumenTexto = $("resumenAuditoria");
    if(resumenTexto){
        resumenTexto.textContent = "";
    }
    const mas = $("botonMasAuditoria");
    if(mas){
        mas.hidden = true;
    }
    mostrarEstado($("estadoAuditoria"), "");
}


// Fin de fichero: js/administracion/auditoria.js
