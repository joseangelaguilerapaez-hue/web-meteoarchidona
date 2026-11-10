/*
 * MeteoArchidona
 * Administración · Pool de procesos.
 *
 * Decisiones de José del 10-11-2026 (docs/procesos.md de la API):
 *
 * - Resumen de un vistazo: en curso (con su barra viva), fallidos y con
 *   incidencias de los últimos 7 días, y las últimas incidencias.
 * - Lanzar: de momento solo los procesos manuales («Recuperar histórico»:
 *   7, 15 o 30 días; una estación o todas). La web lo encarga y el worker
 *   del VPS lo ejecuta en segundo plano, uno a la vez: si ya hay uno en
 *   marcha, la API lo rechaza y aquí se dice.
 * - Lista: los más recientes arriba (tipo, estado con color, quién lo
 *   lanzó, cuándo, duración y barra viva si está en curso), filtros por
 *   estado, tipo y fechas, y más al bajar.
 * - Ficha al pulsar una línea: parámetros, mensaje final o de error,
 *   resumen por estación e incidencias. Botón Cancelar: el proceso se para
 *   al acabar el paso en curso y queda como cancelado.
 *
 * GET  /admin/procesos/tipos · /resumen · /admin/procesos?… · /{id} · /{id}/progreso
 * POST /admin/procesos · /{id}/cancelar
 *
 * La barra es el componente reutilizable js/componentes/barra-progreso.js.
 * Las horas, en hora de Madrid.
 */

import {
    $,
    mostrarEstado
} from "./estado.js?v=20261026-cache1";

import {
    peticionJson
} from "./api.js?v=20261026-cache1";

import {
    crearBarraProgreso,
    seguirProceso
} from "../componentes/barra-progreso.js?v=20261110-procesos1";


const RUTA = "/admin/procesos";
const ZONA = "Europe/Madrid";
const POR_TANDA = 50;
const REFRESCO_MS = 3000;

const ESTADOS = [
    ["", "Todos"],
    ["PENDIENTE", "Pendiente"],
    ["EN_CURSO", "En curso"],
    ["CORRECTO", "Correcto"],
    ["CON_INCIDENCIAS", "Con incidencias"],
    ["CANCELADO", "Cancelado"],
    ["ERROR", "Error"]
];

const filtro = {
    estado: "",
    tipo: "",
    desde: "",
    hasta: ""
};

let tipos = [];
let ultimoId = null;
let hayMas = false;
let cargando = false;
let peticionActual = 0;
let eventosConfigurados = false;
let abierta = null;
let observador = null;
let temporizador = null;

// Barras vivas: id del proceso -> función para dejar de seguirlo.
const seguimientos = new Map();


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


function fechaHora(valor){

    if(!valor){
        return "—";
    }

    return new Date(valor).toLocaleString("es-ES", {
        timeZone: ZONA,
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
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

    if(segundos === null || segundos === undefined){
        return "—";
    }

    const total = Math.max(0, Math.round(segundos));

    if(total < 60){
        return `${total} s`;
    }

    const minutos = Math.floor(total / 60);

    if(minutos < 60){
        return `${minutos} min ${total % 60} s`;
    }

    return `${Math.floor(minutos / 60)} h ${minutos % 60} min`;
}


function diaMadrid(fecha = new Date()){

    return new Intl.DateTimeFormat("en-CA", {
        timeZone: ZONA,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).format(fecha);
}


/* Inicio de un día de Madrid (AAAA-MM-DD) como instante ISO con zona. */
function inicioDiaMadrid(dia){

    const [anio, mes, d] = dia.split("-").map(Number);
    // Mediodía UTC de ese día: de ahí sale el desfase de Madrid ese día.
    const referencia = new Date(Date.UTC(anio, mes - 1, d, 12));
    const horaMadrid = Number(new Intl.DateTimeFormat("en-GB", {
        timeZone: ZONA,
        hour: "2-digit",
        hourCycle: "h23"
    }).format(referencia));
    const desfase = horaMadrid - 12;
    return new Date(Date.UTC(anio, mes - 1, d, -desfase)).toISOString();
}


function sumarDias(dia, dias){

    const [anio, mes, d] = dia.split("-").map(Number);
    return new Date(Date.UTC(anio, mes - 1, d + dias)).toISOString().slice(0, 10);
}


function chipEstado(estado, nombre){

    const chip = crear("span", "procesos-chip", nombre || estado);
    chip.dataset.estado = estado;
    return chip;
}


function textoIncidencias(proceso){

    const partes = [];

    if(proceso.incidencias_error){
        partes.push(`${proceso.incidencias_error} ${proceso.incidencias_error === 1 ? "error" : "errores"}`);
    }
    if(proceso.incidencias_aviso){
        partes.push(`${proceso.incidencias_aviso} ${proceso.incidencias_aviso === 1 ? "aviso" : "avisos"}`);
    }
    return partes.join(" · ");
}


function activo(proceso){

    return proceso.estado === "PENDIENTE" || proceso.estado === "EN_CURSO";
}


function moduloVisible(){

    return Boolean($("modulo-procesos")?.classList.contains("activo"));
}


async function pedirProgreso(id){

    return peticionJson(`${RUTA}/${id}/progreso`);
}


function dejarDeSeguir(id){

    const detener = seguimientos.get(id);
    if(detener){
        detener();
        seguimientos.delete(id);
    }
}


function dejarDeSeguirTodos(){

    for(const id of [...seguimientos.keys()]){
        dejarDeSeguir(id);
    }
}


/* Barra que se actualiza sola hasta que el proceso termina. */
function barraViva(proceso, {compacta, alActualizar = null}){

    const barra = crearBarraProgreso({compacta});
    barra.actualizar(proceso);

    // Lo que acompaña a la barra (p. ej. la etiqueta del estado en la
    // línea) se pone al día con cada consulta.
    const seguida = {
        actualizar(progreso){
            barra.actualizar(progreso);
            alActualizar?.(progreso);
        }
    };

    if(activo(proceso)){
        const clave = `${proceso.id}-${compacta ? "c" : "g"}-${Math.random()}`;
        // Fuera del apartado no se pregunta: se sigue al volver.
        const consultar = () => moduloVisible()
            ? pedirProgreso(proceso.id)
            : Promise.reject(new Error("Apartado oculto"));
        const detener = seguirProceso(seguida, consultar, {
            cadaMs: REFRESCO_MS,
            alTerminar: () => {
                seguimientos.delete(clave);
                // Al terminar, el resumen y la lista se ponen al día.
                programarRecarga();
            }
        });
        seguimientos.set(clave, detener);
    }

    return barra.elemento;
}


function programarRecarga(){

    clearTimeout(temporizador);
    temporizador = setTimeout(() => {
        cargarProcesos().catch(() => {});
    }, 800);
}


/* ==========================================================
   RESUMEN
   ========================================================== */

function tarjeta(cifra, texto, estado){

    const elemento = crear("div", "procesos-tarjeta");
    if(estado){
        elemento.dataset.estado = estado;
    }
    elemento.append(
        crear("strong", "procesos-tarjeta-cifra", String(cifra)),
        crear("span", "procesos-tarjeta-texto", texto)
    );
    return elemento;
}


function lineaIncidencia(incidencia, {conProceso = false} = {}){

    const fila = crear("li", "procesos-incidencia");
    fila.dataset.nivel = incidencia.nivel;

    const tramo = incidencia.tramo_desde && incidencia.tramo_hasta
        && incidencia.tramo_desde !== incidencia.tramo_hasta
        ? `${fechaHora(incidencia.tramo_desde)} → ${fechaHora(incidencia.tramo_hasta)}`
        : "";

    fila.append(
        crear("span", "procesos-incidencia-nivel", incidencia.nivel_nombre),
        crear("span", "procesos-incidencia-hora", fechaHora(incidencia.momento)),
        crear(
            "span",
            "procesos-incidencia-que",
            [incidencia.codigo_nombre, incidencia.estacion_nombre, tramo].filter(Boolean).join(" · ")
        ),
        crear("span", "procesos-incidencia-mensaje", incidencia.mensaje)
    );

    if(conProceso){
        fila.title = `Proceso n.º ${incidencia.proceso_id}`;
    }
    return fila;
}


function pintarResumen(resumen){

    const contenedor = $("resumenProcesos");
    if(!contenedor){
        return;
    }

    const tarjetas = crear("div", "procesos-tarjetas");
    tarjetas.append(
        tarjeta(resumen.en_curso.length, "en marcha", resumen.en_curso.length ? "EN_CURSO" : ""),
        tarjeta(resumen.fallidos, `fallidos (${resumen.dias} días)`, resumen.fallidos ? "ERROR" : ""),
        tarjeta(
            resumen.con_incidencias,
            `con incidencias (${resumen.dias} días)`,
            resumen.con_incidencias ? "CON_INCIDENCIAS" : ""
        ),
        tarjeta(
            resumen.avisos_recientes + resumen.errores_recientes,
            "avisos y errores recientes",
            resumen.errores_recientes ? "ERROR" : (resumen.avisos_recientes ? "CON_INCIDENCIAS" : "")
        )
    );

    const piezas = [tarjetas];

    for(const proceso of resumen.en_curso){
        const caja = crear("div", "procesos-en-curso");
        caja.append(
            crear(
                "p",
                "procesos-en-curso-titulo",
                `${proceso.tipo_nombre} · ${proceso.parametros_texto} · ${proceso.lanzado_por}`
            ),
            barraViva(proceso, {compacta: false})
        );
        piezas.push(caja);
    }

    if(resumen.incidencias_recientes.length){
        const titulo = crear("h4", "procesos-subtitulo", "Últimas incidencias");
        const lista = crear("ul", "procesos-incidencias");
        lista.append(...resumen.incidencias_recientes.map(i => lineaIncidencia(i, {conProceso: true})));
        piezas.push(titulo, lista);
    }

    contenedor.replaceChildren(...piezas);
}


/* ==========================================================
   LANZAR
   ========================================================== */

function pintarLanzador(){

    const selectorTipo = $("tipoNuevoProceso");
    const campos = $("parametrosNuevoProceso");
    if(!selectorTipo || !campos){
        return;
    }

    if(!selectorTipo.options.length){
        selectorTipo.append(...tipos.map(tipo => new Option(tipo.nombre, tipo.codigo)));
    }

    const tipo = tipos.find(t => t.codigo === selectorTipo.value) || tipos[0];
    if(!tipo){
        campos.replaceChildren(crear("p", "modulo-intro", "No hay procesos que lanzar a mano."));
        $("botonLanzarProceso").disabled = true;
        return;
    }

    $("descripcionNuevoProceso").textContent = tipo.descripcion;
    $("botonLanzarProceso").disabled = false;

    const piezas = tipo.parametros.map(parametro => {
        const id = `parametroProceso-${parametro.codigo}`;
        const caja = crear("div", "procesos-campo");
        const etiqueta = crear("label", "", parametro.nombre);
        etiqueta.htmlFor = id;
        const selector = crear("select");
        selector.id = id;
        selector.dataset.parametro = parametro.codigo;
        selector.append(...parametro.opciones.map(opcion => new Option(opcion.nombre, opcion.valor)));
        selector.value = parametro.defecto;
        caja.append(etiqueta, selector);
        return caja;
    });

    campos.replaceChildren(...piezas);
}


function pintarFiltroTipos(){

    const selector = $("filtroTipoProcesos");
    if(!selector || selector.options.length){
        return;
    }
    selector.append(new Option("Todos", ""), ...tipos.map(tipo => new Option(tipo.nombre, tipo.codigo)));
}


async function lanzarProceso(){

    const boton = $("botonLanzarProceso");
    const estado = $("estadoLanzarProceso");
    const tipo = $("tipoNuevoProceso").value;

    const parametros = {};
    for(const selector of $("parametrosNuevoProceso").querySelectorAll("select[data-parametro]")){
        parametros[selector.dataset.parametro] = selector.value;
    }

    boton.disabled = true;
    mostrarEstado(estado, "Encargando…");

    try{
        const proceso = await peticionJson(RUTA, {
            method: "POST",
            body: JSON.stringify({tipo, parametros})
        });
        mostrarEstado(
            estado,
            `Encargado (n.º ${proceso.id}). El worker lo empieza en menos de un minuto.`,
            "ok"
        );
        filtro.estado = "";
        $("filtroEstadoProcesos").value = "";
        await cargarProcesos();
    }catch(error){
        mostrarEstado(
            estado,
            error.message || "No se ha podido encargar el proceso.",
            "error"
        );
    }finally{
        boton.disabled = false;
    }
}


/* ==========================================================
   LÍNEA Y FICHA
   ========================================================== */

function linea(proceso){

    const fila = crear("li", "procesos-proceso");
    fila.dataset.id = String(proceso.id);

    const boton = crear("button", "procesos-linea");
    boton.type = "button";
    boton.setAttribute("aria-expanded", "false");

    const chip = chipEstado(proceso.estado, proceso.estado_nombre);

    const progreso = crear("span", "procesos-progreso");
    if(activo(proceso)){
        progreso.append(barraViva(proceso, {
            compacta: true,
            alActualizar: actual => {
                chip.dataset.estado = actual.estado;
                chip.textContent = actual.cancelacion_solicitada && !actual.terminado
                    ? "Cancelando…"
                    : actual.estado_nombre;
            }
        }));
    }else{
        progreso.textContent = textoIncidencias(proceso);
        progreso.classList.toggle("con-errores", proceso.incidencias_error > 0);
    }

    boton.append(
        crear("span", "procesos-numero", `${proceso.id}`),
        crear("span", "procesos-tipo", `${proceso.tipo_nombre} · ${proceso.parametros_texto}`),
        chip,
        crear("span", "procesos-quien", proceso.lanzado_por),
        crear("span", "procesos-cuando", fechaHora(proceso.fecha_encargo)),
        crear("span", "procesos-duracion", duracion(proceso.duracion_segundos)),
        progreso
    );

    boton.title = proceso.mensaje || "";

    boton.addEventListener("click", () => {
        alternarFicha(fila, boton, proceso.id);
    });

    fila.append(boton);
    return fila;
}


function dato(lista, etiqueta, valor){

    const par = crear("div", "procesos-dato");
    par.append(
        crear("dt", "", etiqueta),
        crear("dd", "", valor === null || valor === undefined || valor === "" ? "—" : String(valor))
    );
    lista.append(par);
}


function tablaEstaciones(contadores){

    const estaciones = contadores?.estaciones;
    if(!Array.isArray(estaciones) || !estaciones.length){
        return null;
    }

    const tabla = crear("table", "procesos-tabla");
    const cabecera = crear("tr");
    for(const titulo of ["Estación", "Nuevos", "Completados", "Descartados", "Huecos", "Sin datos", "Fallidos"]){
        cabecera.append(crear("th", "", titulo));
    }
    const cabeza = crear("thead");
    cabeza.append(cabecera);

    const cuerpo = crear("tbody");
    const numero = valor => Number(valor || 0).toLocaleString("es-ES");

    for(const estacion of estaciones){
        const fila = crear("tr");
        if(estacion.omitida){
            const nombre = crear("td", "", estacion.nombre);
            const nota = crear("td", "procesos-tabla-nota", estacion.omitida);
            nota.colSpan = 6;
            fila.append(nombre, nota);
        }else{
            fila.append(
                crear("td", "", estacion.nombre),
                crear("td", "", numero(estacion.nuevos)),
                crear("td", "", numero(estacion.completados)),
                crear("td", "", numero(estacion.descartados)),
                crear("td", "", numero(estacion.huecos)),
                crear("td", "", estacion.minutos_sin_datos ? duracion(estacion.minutos_sin_datos * 60) : "—"),
                crear("td", "", numero(estacion.tramos_fallidos))
            );
        }
        cuerpo.append(fila);
    }

    tabla.append(cabeza, cuerpo);
    return tabla;
}


function pintarFicha(contenedor, ficha){

    const piezas = [];

    if(activo(ficha)){
        piezas.push(barraViva(ficha, {compacta: false}));
    }

    const datos = crear("dl", "procesos-ficha-datos");
    dato(datos, "Proceso", `n.º ${ficha.id} · ${ficha.tipo_nombre}`);
    dato(datos, "Parámetros", ficha.parametros_texto);
    dato(datos, "Estado", ficha.estado_nombre + (ficha.cancelacion_solicitada && activo(ficha) ? " (cancelación pedida)" : ""));
    dato(datos, "Lanzado por", ficha.lanzado_por);
    dato(datos, "Encargado", fechaCompleta(ficha.fecha_encargo));
    dato(datos, "Inicio", fechaCompleta(ficha.fecha_inicio));
    dato(datos, "Fin", fechaCompleta(ficha.fecha_fin));
    dato(datos, "Duración", duracion(ficha.duracion_segundos));
    dato(datos, "Pasos", ficha.pasos_total ? `${ficha.pasos_hechos} de ${ficha.pasos_total}` : "—");
    piezas.push(datos);

    if(ficha.mensaje){
        const mensaje = crear("p", "procesos-mensaje", ficha.mensaje);
        mensaje.dataset.estado = ficha.estado;
        piezas.push(mensaje);
    }

    if(ficha.resumen){
        piezas.push(crear("pre", "procesos-resumen", ficha.resumen));
    }

    const tabla = tablaEstaciones(ficha.contadores);
    if(tabla){
        const envoltura = crear("div", "procesos-tabla-envoltura");
        envoltura.append(tabla);
        piezas.push(envoltura);
    }

    const titulo = crear(
        "h4",
        "procesos-subtitulo",
        `Incidencias (${ficha.incidencias.length})`
    );
    piezas.push(titulo, incidenciasAgrupadas(ficha.incidencias));

    const acciones = crear("div", "acciones procesos-acciones");

    const pdf = crear("button", "boton boton-secundario", "Descargar PDF");
    pdf.type = "button";
    pdf.addEventListener("click", () => imprimirFicha(ficha));

    const json = crear("button", "boton boton-secundario", "Descargar JSON");
    json.type = "button";
    json.addEventListener("click", () => descargarJson(ficha));

    acciones.append(pdf, json);

    if(activo(ficha)){
        const cancelar = crear(
            "button",
            "boton boton-peligro",
            ficha.cancelacion_solicitada ? "Cancelación pedida" : "Cancelar"
        );
        cancelar.type = "button";
        cancelar.disabled = ficha.cancelacion_solicitada;
        cancelar.addEventListener("click", () => cancelarProceso(ficha.id, cancelar));
        const nota = crear(
            "span",
            "procesos-nota",
            "Se para al acabar el paso en curso; lo hecho queda guardado."
        );
        acciones.append(cancelar, nota);
    }

    piezas.push(acciones);

    contenedor.replaceChildren(...piezas);
}


/* ==========================================================
   INCIDENCIAS AGRUPADAS, PDF Y JSON
   Decisión de José del 10-11-2026: con 30 días salen muchos avisos
   seguidos. En la ficha se agrupan por estación y tipo (se despliegan);
   el PDF (impresión del navegador, «Guardar como PDF») y el JSON llevan
   todas, una a una.
   ========================================================== */

const ORDEN_NIVEL = {ERROR: 0, AVISO: 1, INFORMACION: 2};


function grupos(incidencias){

    const mapa = new Map();

    for(const incidencia of incidencias){
        const clave = `${incidencia.estacion_nombre || ""}|${incidencia.codigo}`;
        if(!mapa.has(clave)){
            mapa.set(clave, {
                estacion: incidencia.estacion_nombre || "",
                codigo: incidencia.codigo,
                nombre: incidencia.codigo_nombre,
                nivel: incidencia.nivel,
                nivelNombre: incidencia.nivel_nombre,
                incidencias: [],
                minutos: 0
            });
        }
        const grupo = mapa.get(clave);
        grupo.incidencias.push(incidencia);
        grupo.minutos += Number(incidencia.datos?.minutos || 0);
        if(ORDEN_NIVEL[incidencia.nivel] < ORDEN_NIVEL[grupo.nivel]){
            grupo.nivel = incidencia.nivel;
            grupo.nivelNombre = incidencia.nivel_nombre;
        }
    }

    return [...mapa.values()].sort((a, b) =>
        (ORDEN_NIVEL[a.nivel] - ORDEN_NIVEL[b.nivel])
        || a.estacion.localeCompare(b.estacion, "es")
        || a.nombre.localeCompare(b.nombre, "es")
    );
}


function textoGrupo(grupo){

    const cuantas = grupo.incidencias.length;
    const unidad = grupo.codigo === "HUECO_PROVEEDOR"
        ? (cuantas === 1 ? "tramo" : "tramos")
        : (cuantas === 1 ? "vez" : "veces");
    const partes = [`${cuantas} ${unidad}`];

    if(grupo.minutos){
        partes.push(`${duracion(grupo.minutos * 60)} en total`);
    }

    return [grupo.estacion, grupo.nombre].filter(Boolean).join(" · ") + ": " + partes.join(", ");
}


function incidenciasAgrupadas(incidencias){

    const caja = crear("div", "procesos-grupos");

    if(!incidencias.length){
        caja.append(crear("p", "procesos-incidencia procesos-sin", "Sin incidencias."));
        return caja;
    }

    for(const grupo of grupos(incidencias)){
        const desplegable = crear("details", "procesos-grupo");
        desplegable.dataset.nivel = grupo.nivel;
        // Los errores, abiertos; lo demás, cerrado.
        desplegable.open = grupo.nivel === "ERROR";

        const resumen = crear("summary", "procesos-grupo-resumen");
        resumen.append(
            crear("span", "procesos-incidencia-nivel", grupo.nivelNombre),
            crear("span", "procesos-grupo-texto", textoGrupo(grupo))
        );

        const lista = crear("ul", "procesos-incidencias");
        lista.append(...grupo.incidencias.map(i => lineaIncidencia(i)));

        desplegable.append(resumen, lista);
        caja.append(desplegable);
    }

    return caja;
}


function nombreFichero(ficha, extension){

    const dia = diaMadrid(new Date(ficha.fecha_encargo));
    const tipo = String(ficha.tipo || "proceso").toLowerCase().replaceAll("_", "-");
    return `proceso-${ficha.id}-${tipo}-${dia}.${extension}`;
}


function descargarJson(ficha){

    const datos = {
        generado_en: new Date().toISOString(),
        origen: "MeteoArchidona · Administración → Procesos",
        ...ficha
    };
    const blob = new Blob([JSON.stringify(datos, null, 2)], {type: "application/json"});
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(blob);
    enlace.download = nombreFichero(ficha, "json");
    document.body.append(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(enlace.href), 10000);
}


function celdas(fila, valores, etiqueta = "td"){

    for(const valor of valores){
        fila.append(crear(etiqueta, "", valor === null || valor === undefined || valor === "" ? "—" : String(valor)));
    }
    return fila;
}


/*
 * Hoja blanca colgada del <body>; al imprimir solo se ve ella (css).
 * Lleva todo: datos, mensaje, resumen, tabla por estación, el resumen
 * por grupos y cada incidencia en una fila.
 */
function imprimirFicha(ficha){

    document.querySelector(".procesos-hoja-impresion")?.remove();

    const hoja = crear("div", "procesos-hoja-impresion");

    const cabecera = crear("header", "procesos-impresion-cabecera");
    const logo = crear("img", "procesos-impresion-logo");
    logo.src = "/assets/logo-meteoarchidona.png";
    logo.alt = "MeteoArchidona";
    const titulos = crear("div");
    titulos.append(
        crear("h1", "", `Proceso n.º ${ficha.id} · ${ficha.tipo_nombre}`),
        crear("p", "", `${ficha.parametros_texto} · ${ficha.estado_nombre} · lanzado por ${ficha.lanzado_por}`)
    );
    cabecera.append(logo, titulos);
    hoja.append(cabecera);

    const datos = crear("table", "procesos-impresion-datos");
    const cuerpoDatos = crear("tbody");
    for(const [etiqueta, valor] of [
        ["Encargado", fechaCompleta(ficha.fecha_encargo)],
        ["Inicio", fechaCompleta(ficha.fecha_inicio)],
        ["Fin", fechaCompleta(ficha.fecha_fin)],
        ["Duración", duracion(ficha.duracion_segundos)],
        ["Pasos", ficha.pasos_total ? `${ficha.pasos_hechos} de ${ficha.pasos_total}` : "—"],
        ["Mensaje", ficha.mensaje]
    ]){
        cuerpoDatos.append(celdas(crear("tr"), [etiqueta, valor]));
    }
    datos.append(cuerpoDatos);
    hoja.append(datos);

    if(ficha.resumen){
        hoja.append(crear("h2", "", "Resumen"), crear("pre", "", ficha.resumen));
    }

    const tabla = tablaEstaciones(ficha.contadores);
    if(tabla){
        hoja.append(crear("h2", "", "Por estación"), tabla);
    }

    hoja.append(crear("h2", "", `Incidencias (${ficha.incidencias.length})`));

    if(ficha.incidencias.length){
        const lista = crear("ul", "procesos-impresion-grupos");
        lista.append(...grupos(ficha.incidencias).map(g => crear("li", "", `${g.nivelNombre} · ${textoGrupo(g)}`)));
        hoja.append(lista);

        const detalle = crear("table", "procesos-impresion-incidencias");
        const cabeza = crear("thead");
        cabeza.append(celdas(crear("tr"), ["Nivel", "Estación", "Tipo", "Desde", "Hasta", "Duración", "Mensaje"], "th"));
        const cuerpo = crear("tbody");
        for(const incidencia of ficha.incidencias){
            const minutos = incidencia.datos?.minutos;
            cuerpo.append(celdas(crear("tr"), [
                incidencia.nivel_nombre,
                incidencia.estacion_nombre,
                incidencia.codigo_nombre,
                incidencia.tramo_desde ? fechaHora(incidencia.tramo_desde) : fechaHora(incidencia.momento),
                incidencia.tramo_hasta && incidencia.tramo_hasta !== incidencia.tramo_desde
                    ? fechaHora(incidencia.tramo_hasta)
                    : "",
                minutos ? duracion(minutos * 60) : "",
                incidencia.mensaje
            ]));
        }
        detalle.append(cabeza, cuerpo);
        hoja.append(detalle);
    }else{
        hoja.append(crear("p", "", "Sin incidencias."));
    }

    hoja.append(crear(
        "footer",
        "procesos-impresion-pie",
        `MeteoArchidona · Administración → Procesos · Documento interno generado el ${fechaCompleta(new Date().toISOString())} (hora de Madrid).`
    ));

    document.body.append(hoja);
    document.body.classList.add("imprimiendo-proceso");

    const terminar = () => {
        document.body.classList.remove("imprimiendo-proceso");
        hoja.remove();
        window.removeEventListener("afterprint", terminar);
    };

    window.addEventListener("afterprint", terminar);
    window.print();
}


async function abrirFicha(fila, id){

    const contenedor = crear("div", "procesos-ficha", "Cargando…");
    fila.querySelector(".procesos-ficha")?.remove();
    fila.append(contenedor);

    try{
        const ficha = await peticionJson(`${RUTA}/${id}`);
        if(contenedor.isConnected){
            pintarFicha(contenedor, ficha);
        }
    }catch(error){
        contenedor.textContent = error.message || "No se ha podido cargar la ficha.";
        contenedor.classList.add("procesos-ficha-error");
    }
}


function cerrarFicha(fila){

    fila.querySelector(".procesos-ficha")?.remove();
    fila.querySelector(".procesos-linea")?.setAttribute("aria-expanded", "false");
    fila.classList.remove("abierta");
}


async function alternarFicha(fila, boton, id){

    if(fila.querySelector(".procesos-ficha")){
        cerrarFicha(fila);
        abierta = null;
        return;
    }

    // Una ficha abierta a la vez: la lista sigue siendo fina.
    if(abierta && abierta !== fila){
        cerrarFicha(abierta);
    }

    fila.classList.add("abierta");
    boton.setAttribute("aria-expanded", "true");
    abierta = fila;
    await abrirFicha(fila, id);
}


async function cancelarProceso(id, boton){

    boton.disabled = true;

    try{
        await peticionJson(`${RUTA}/${id}/cancelar`, {method: "POST"});
        boton.textContent = "Cancelación pedida";
        programarRecarga();
    }catch(error){
        boton.disabled = false;
        mostrarEstado($("estadoProcesos"), error.message || "No se ha podido cancelar.", "error");
    }
}


/* ==========================================================
   LISTA
   ========================================================== */

function ruta(antesDe){

    const parametros = new URLSearchParams({limite: String(POR_TANDA)});

    if(filtro.estado){
        parametros.set("estado", filtro.estado);
    }
    if(filtro.tipo){
        parametros.set("tipo", filtro.tipo);
    }
    if(filtro.desde){
        parametros.set("desde", inicioDiaMadrid(filtro.desde));
    }
    if(filtro.hasta){
        parametros.set("hasta", inicioDiaMadrid(sumarDias(filtro.hasta, 1)));
    }
    if(antesDe){
        parametros.set("antes_de", String(antesDe));
    }
    return `${RUTA}?${parametros}`;
}


async function cargarLista({mas = false} = {}){

    const lista = $("listaProcesos");

    if(!lista || (mas && (!hayMas || cargando))){
        return;
    }

    const numero = ++peticionActual;
    cargando = true;

    try{
        const procesos = await peticionJson(ruta(mas ? ultimoId : null));

        if(numero !== peticionActual){
            return;
        }

        if(!mas){
            // La ficha abierta se vuelve a abrir tras recargar.
            const idAbierta = abierta?.dataset.id;
            abierta = null;
            lista.replaceChildren(...procesos.map(linea));
            const fila = idAbierta ? lista.querySelector(`[data-id="${idAbierta}"]`) : null;
            if(fila){
                fila.classList.add("abierta");
                fila.querySelector(".procesos-linea")?.setAttribute("aria-expanded", "true");
                abierta = fila;
                abrirFicha(fila, Number(idAbierta));
            }
        }else{
            lista.append(...procesos.map(linea));
        }

        ultimoId = procesos.length ? procesos[procesos.length - 1].id : ultimoId;
        hayMas = procesos.length === POR_TANDA;
        $("botonMasProcesos").hidden = !hayMas;

        if(!mas){
            mostrarEstado(
                $("estadoProcesos"),
                procesos.length ? "" : "No hay procesos con estos filtros.",
                procesos.length ? undefined : "info"
            );
        }
    }finally{
        if(numero === peticionActual){
            cargando = false;
        }
    }
}


export async function cargarProcesos(){

    const estado = $("estadoProcesos");

    if(!$("modulo-procesos")){
        return;
    }

    dejarDeSeguirTodos();

    try{
        if(!tipos.length){
            tipos = await peticionJson(`${RUTA}/tipos`);
            pintarLanzador();
            pintarFiltroTipos();
        }

        const resumen = await peticionJson(`${RUTA}/resumen`);
        pintarResumen(resumen);

        await cargarLista();
    }catch(error){
        mostrarEstado(
            estado,
            error.message || "No se han podido cargar los procesos.",
            "error"
        );
        throw error;
    }
}


/* ==========================================================
   EVENTOS
   ========================================================== */

function recargar(){

    cargarProcesos().catch(() => {});
}


export function configurarEventosProcesos(){

    if(eventosConfigurados){
        return;
    }

    eventosConfigurados = true;

    const selectorEstado = $("filtroEstadoProcesos");
    selectorEstado.append(...ESTADOS.map(([valor, nombre]) => new Option(nombre, valor)));
    selectorEstado.addEventListener("change", () => {
        filtro.estado = selectorEstado.value;
        recargar();
    });

    $("filtroTipoProcesos").addEventListener("change", evento => {
        filtro.tipo = evento.target.value;
        recargar();
    });

    const hoy = diaMadrid();
    for(const id of ["desdeProcesos", "hastaProcesos"]){
        $(id).max = hoy;
        $(id).addEventListener("change", () => {
            filtro.desde = $("desdeProcesos").value;
            filtro.hasta = $("hastaProcesos").value;
            recargar();
        });
    }

    $("botonLimpiarFiltrosProcesos").addEventListener("click", () => {
        Object.assign(filtro, {estado: "", tipo: "", desde: "", hasta: ""});
        selectorEstado.value = "";
        $("filtroTipoProcesos").value = "";
        $("desdeProcesos").value = "";
        $("hastaProcesos").value = "";
        recargar();
    });

    $("tipoNuevoProceso").addEventListener("change", pintarLanzador);
    $("botonLanzarProceso").addEventListener("click", lanzarProceso);
    $("botonRecargarProcesos").addEventListener("click", recargar);

    $("botonMasProcesos").addEventListener("click", () => {
        cargarLista({mas: true}).catch(() => {});
    });

    // Al llegar al final de la lista se piden más sin pulsar nada.
    if("IntersectionObserver" in window){
        observador = new IntersectionObserver(entradas => {
            if(entradas.some(entrada => entrada.isIntersecting) && moduloVisible()){
                cargarLista({mas: true}).catch(() => {});
            }
        }, {rootMargin: "300px"});
        observador.observe($("finProcesos"));
    }

    // Al volver al apartado, todo al día (las barras siguen solas mientras tanto).
    window.addEventListener("hashchange", () => {
        if(moduloVisible()){
            recargar();
        }
    });
}


export function limpiarProcesos(){

    peticionActual++;
    dejarDeSeguirTodos();
    clearTimeout(temporizador);
    tipos = [];
    ultimoId = null;
    hayMas = false;
    cargando = false;
    abierta = null;
    $("listaProcesos")?.replaceChildren();
    $("resumenProcesos")?.replaceChildren();
    $("tipoNuevoProceso")?.replaceChildren();
    $("filtroTipoProcesos")?.replaceChildren();
    const mas = $("botonMasProcesos");
    if(mas){
        mas.hidden = true;
    }
    mostrarEstado($("estadoProcesos"), "");
    mostrarEstado($("estadoLanzarProceso"), "");
}


/* Fin de fichero: js/administracion/procesos.js */
