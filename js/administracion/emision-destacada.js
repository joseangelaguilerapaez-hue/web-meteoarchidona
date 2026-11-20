/*
 * MeteoArchidona
 * Administración · Emisión destacada.
 *
 * Decisiones de José del 20-11-2026 (docs/emision-destacada.md de la API):
 * qué sale en el componente «Emisión destacada ahora» de Actualidad y de
 * los dashboards.
 *
 * - Manual: manda sobre todo. Solo una activa: al activar otra se apaga la
 *   anterior. «Quitar la manual» vuelve a lo programado.
 * - Franja: de una hora a otra (hora de Madrid), un día o todos los días.
 *   Si se pisan, manda la que empezó más tarde.
 * - Por defecto: cuando no hay otra (al empezar, la panorámica de Los
 *   Llanos). Se cambia, no se borra.
 *
 * Cada una es un directo (de la lista de En vivo) o un timelapse: cámara,
 * producto y modo (el último, un día o todos, en orden descendente o
 * ascendente).
 *
 * GET/POST /admin/emision-destacada · PUT/DELETE /admin/emision-destacada/{id}
 * POST /admin/emision-destacada/{id}/activar · POST /admin/emision-destacada/quitar-manual
 *
 * El texto nunca se mete como HTML.
 */

import {
    $,
    mostrarEstado
} from "./estado.js?v=20261026-cache1";

import {
    URL_API,
    peticionAdministrativa,
    peticionJson
} from "./api.js?v=20261026-cache1";

import {ZONAS_CAMARAS} from "../componentes/catalogo-camaras.js?v=20261120-destacada1";


const RUTA = "/admin/emision-destacada";

const USOS = {DEFECTO: "Por defecto", MANUAL: "Manual", FRANJA: "Franja"};
const MODOS = {ULTIMO: "El último", DIA: "Un día", TODOS: "Todos"};
const ORDENES = {DESC: "del más reciente al más antiguo", ASC: "del más antiguo al más reciente"};

const FECHA = new Intl.DateTimeFormat("es-ES", {day: "numeric", month: "short", year: "numeric", timeZone: "UTC"});

let configurado = false;
let datos = {emisiones: [], productos: [], actual: null};
let directos = [];
let editando = null;


function crear(etiqueta, clase, texto) {
    const nodo = document.createElement(etiqueta);
    if (clase) nodo.className = clase;
    if (texto !== undefined && texto !== null) nodo.textContent = texto;
    return nodo;
}


function estado(mensaje, tipo) {
    mostrarEstado($("estadoEmisionDestacada"), mensaje, tipo);
}


function dia(texto) {
    return texto ? FECHA.format(new Date(`${texto}T00:00:00Z`)) : "";
}


function hora(texto) {
    return texto ? String(texto).slice(0, 5) : "";
}


/* ==========================================================
   DIRECTOS DISPONIBLES (los de En vivo)
   ========================================================== */

async function cargarDirectos() {

    const lista = [];

    for (const zona of Object.values(ZONAS_CAMARAS)) {
        for (const camara of zona.camaras || []) {
            if (camara.clave) {
                lista.push({clave: camara.clave, nombre: `${zona.nombre} · ${camara.nombreCorto || camara.nombre}`});
            }
        }
    }

    try {
        const respuesta = await fetch(`${URL_API}/camaras/youtube`, {cache: "no-store"});
        const youtube = respuesta.ok ? await respuesta.json() : [];
        for (const camara of Array.isArray(youtube) ? youtube : []) {
            if (camara?.id) {
                lista.push({clave: `camara-${camara.id}`, nombre: `YouTube · ${camara.nombre || camara.id}`});
            }
        }
    } catch (error) {
        console.error("Emisión destacada: no se pudieron cargar los directos de YouTube", error);
    }

    directos = lista;
}


function nombreDirecto(clave) {
    return directos.find(directo => directo.clave === clave)?.nombre || `${clave} (ya no está en En vivo)`;
}


function producto(id) {
    return datos.productos.find(item => item.id === id);
}


/* ==========================================================
   DESCRIPCIÓN DE UNA EMISIÓN
   ========================================================== */

function queEmite(emision) {

    if (emision.tipo === "DIRECTO") {
        return `Directo · ${nombreDirecto(emision.clave_directo)}`;
    }

    const item = producto(emision.programacion_id);
    const nombre = item ? `${item.camara_nombre} · ${item.nombre}` : "producto borrado";
    let modo = MODOS[emision.modo_timelapse] || emision.modo_timelapse;
    if (emision.modo_timelapse === "DIA") modo = `el del ${dia(emision.fecha_timelapse)}`;
    if (emision.modo_timelapse === "TODOS") modo = `todos, ${ORDENES[emision.orden_timelapse] || ""}`;
    return `Timelapse · ${nombre} · ${modo}`;
}


function cuando(emision) {

    if (emision.uso === "DEFECTO") return "Cuando no hay otra";
    if (emision.uso === "MANUAL") return "Hasta que se quite";

    const horas = `de ${hora(emision.hora_inicio)} a ${hora(emision.hora_fin)}`;
    return emision.repetir_diario ? `Todos los días, ${horas}` : `${dia(emision.fecha_franja)}, ${horas}`;
}


/* ==========================================================
   LO QUE SALE AHORA Y LA LISTA
   ========================================================== */

function pintarActual() {

    const caja = $("actualEmisionDestacada");
    const actual = datos.actual;
    caja.textContent = "";

    if (!actual?.emision) {
        caja.textContent = "No hay ninguna emisión configurada.";
        return;
    }

    const emision = datos.emisiones.find(item => item.id === actual.emision.id);
    const texto = emision ? queEmite(emision) : "—";
    caja.append(crear("strong", null, `Ahora sale (${(USOS[actual.origen] || actual.origen || "").toLowerCase()}): `), texto);

    if (actual.sustituida) {
        caja.append(crear("div", "campo-ayuda", "El timelapse elegido no tiene vídeo: sale la de por defecto."));
    }

    $("botonQuitarManual").hidden = actual.origen !== "MANUAL";
}


function pintarLista() {

    const contenedor = $("listaEmisionDestacada");
    contenedor.textContent = "";

    const tabla = crear("table");
    const cabeza = crear("tr");
    for (const columna of ["Uso", "Qué sale", "Cuándo", "Estado", ""]) {
        cabeza.append(crear("th", null, columna));
    }
    tabla.append(crear("thead"));
    tabla.tHead.append(cabeza);
    const cuerpo = crear("tbody");

    const orden = {DEFECTO: 0, MANUAL: 1, FRANJA: 2};
    const emisiones = [...datos.emisiones].sort((a, b) => orden[a.uso] - orden[b.uso] || b.id - a.id);

    for (const emision of emisiones) {
        const fila = crear("tr");
        fila.append(
            crear("td", null, USOS[emision.uso] || emision.uso),
            crear("td", null, queEmite(emision)),
            crear("td", null, cuando(emision)),
            crear("td", null, emision.uso === "DEFECTO" ? "—" : emision.activa ? "Activa" : "Apagada"),
        );

        const acciones = crear("td");

        const editar = crear("button", "boton boton-secundario", "Editar");
        editar.type = "button";
        editar.addEventListener("click", () => editar_(emision));
        acciones.append(editar);

        if (emision.uso !== "DEFECTO") {
            const encender = crear("button", "boton boton-secundario", emision.activa ? "Apagar" : "Activar");
            encender.type = "button";
            encender.addEventListener("click", () => activar(emision, !emision.activa));
            const borrar = crear("button", "boton boton-peligro", "Borrar");
            borrar.type = "button";
            borrar.addEventListener("click", () => borrar_(emision));
            acciones.append(" ", encender, " ", borrar);
        }

        fila.append(acciones);
        cuerpo.append(fila);
    }

    tabla.append(cuerpo);
    contenedor.append(tabla);
}


/* ==========================================================
   FORMULARIO
   ========================================================== */

function opciones(selector, lista, valor) {
    selector.textContent = "";
    for (const [codigo, texto] of lista) {
        selector.append(new Option(texto, codigo));
    }
    if (valor !== undefined && valor !== null) selector.value = String(valor);
}


function rellenarCamaras(camaraId) {
    const vistas = new Map();
    for (const item of datos.productos) vistas.set(item.camara_id, item.camara_nombre);
    opciones($("edCamara"), [...vistas].map(([id, nombre]) => [id, nombre]), camaraId);
}


function rellenarProductos(programacionId) {
    const camara = Number($("edCamara").value);
    const lista = datos.productos.filter(item => item.camara_id === camara);
    opciones($("edProducto"), lista.map(item => [item.id, item.activa ? item.nombre : `${item.nombre} (inactiva)`]), programacionId);
}


function rellenarDias(fecha) {
    const item = producto(Number($("edProducto").value));
    const dias = item?.dias || [];
    opciones($("edDia"), dias.map(texto => [texto, dia(texto)]), fecha);
    if (!dias.length) $("edDia").append(new Option("Sin vídeos ahora", ""));
}


function ajustarFormulario() {
    const uso = $("edUso").value;
    const tipo = $("edTipo").value;
    const modo = $("edModo").value;

    $("edUso").disabled = editando?.uso === "DEFECTO";
    $("grupoEdDirecto").hidden = tipo !== "DIRECTO";
    $("grupoEdTimelapse").hidden = tipo !== "TIMELAPSE";
    $("grupoEdDia").hidden = tipo !== "TIMELAPSE" || modo !== "DIA";
    $("grupoEdOrden").hidden = tipo !== "TIMELAPSE" || modo !== "TODOS";
    $("grupoEdFranja").hidden = uso !== "FRANJA";
    $("grupoEdFecha").hidden = uso !== "FRANJA" || $("edRepetir").checked;
}


function limpiarFormulario() {
    editando = null;
    $("tituloFormularioEd").textContent = "Nueva emisión";
    $("botonGuardarEd").textContent = "Guardar";
    $("botonCancelarEd").hidden = true;

    opciones($("edUso"), [["MANUAL", "Manual (manda sobre todo)"], ["FRANJA", "Franja horaria"]], "MANUAL");
    $("edTipo").value = "DIRECTO";
    opciones($("edDirecto"), directos.map(item => [item.clave, item.nombre]));
    rellenarCamaras();
    rellenarProductos();
    $("edModo").value = "ULTIMO";
    rellenarDias();
    $("edOrden").value = "DESC";
    $("edInicio").value = "";
    $("edFin").value = "";
    $("edRepetir").checked = false;
    $("edFecha").value = "";
    ajustarFormulario();
}


function editar_(emision) {
    limpiarFormulario();
    editando = emision;
    $("tituloFormularioEd").textContent = emision.uso === "DEFECTO" ? "Cambiar la emisión por defecto" : "Editar emisión";
    $("botonGuardarEd").textContent = "Guardar cambios";
    $("botonCancelarEd").hidden = false;

    if (emision.uso === "DEFECTO") {
        opciones($("edUso"), [["DEFECTO", "Por defecto"]], "DEFECTO");
    } else {
        $("edUso").value = emision.uso;
    }
    $("edTipo").value = emision.tipo;

    if (emision.tipo === "DIRECTO") {
        if (!directos.some(item => item.clave === emision.clave_directo)) {
            $("edDirecto").append(new Option(nombreDirecto(emision.clave_directo), emision.clave_directo));
        }
        $("edDirecto").value = emision.clave_directo;
    } else {
        rellenarCamaras(emision.camara_id);
        rellenarProductos(emision.programacion_id);
        $("edModo").value = emision.modo_timelapse;
        rellenarDias(emision.fecha_timelapse);
        if (emision.fecha_timelapse && $("edDia").value !== emision.fecha_timelapse) {
            $("edDia").append(new Option(`${dia(emision.fecha_timelapse)} (ya no tiene vídeo)`, emision.fecha_timelapse));
            $("edDia").value = emision.fecha_timelapse;
        }
        $("edOrden").value = emision.orden_timelapse || "DESC";
    }

    $("edInicio").value = hora(emision.hora_inicio);
    $("edFin").value = hora(emision.hora_fin);
    $("edRepetir").checked = Boolean(emision.repetir_diario);
    $("edFecha").value = emision.fecha_franja || "";
    ajustarFormulario();
    $("formularioEmisionDestacada").scrollIntoView({behavior: "smooth", block: "start"});
}


function leerFormulario() {
    const tipo = $("edTipo").value;
    const uso = $("edUso").value;
    const modo = $("edModo").value;
    const franja = uso === "FRANJA";
    return {
        uso,
        activa: editando ? editando.activa : true,
        tipo,
        clave_directo: tipo === "DIRECTO" ? $("edDirecto").value || null : null,
        camara_id: tipo === "TIMELAPSE" ? Number($("edCamara").value) || null : null,
        programacion_id: tipo === "TIMELAPSE" ? Number($("edProducto").value) || null : null,
        modo_timelapse: tipo === "TIMELAPSE" ? modo : null,
        fecha_timelapse: tipo === "TIMELAPSE" && modo === "DIA" ? $("edDia").value || null : null,
        orden_timelapse: $("edOrden").value || "DESC",
        hora_inicio: franja ? $("edInicio").value || null : null,
        hora_fin: franja ? $("edFin").value || null : null,
        fecha_franja: franja && !$("edRepetir").checked ? $("edFecha").value || null : null,
        repetir_diario: franja && $("edRepetir").checked,
    };
}


async function guardar(evento) {
    evento.preventDefault();
    const boton = $("botonGuardarEd");
    boton.disabled = true;
    try {
        const cuerpo = JSON.stringify(leerFormulario());
        if (editando) {
            await peticionJson(`${RUTA}/${editando.id}`, {method: "PUT", body: cuerpo});
            estado("Emisión guardada.", "ok");
        } else {
            await peticionJson(RUTA, {method: "POST", body: cuerpo});
            estado("Emisión creada.", "ok");
        }
        await cargarEmisionDestacada();
    } catch (error) {
        estado(error.message || "No se ha podido guardar.", "error");
    } finally {
        boton.disabled = false;
    }
}


async function activar(emision, activa) {
    try {
        await peticionJson(`${RUTA}/${emision.id}/activar`, {method: "POST", body: JSON.stringify({activa})});
        estado(activa ? "Emisión activada." : "Emisión apagada.", "ok");
        await cargarEmisionDestacada();
    } catch (error) {
        estado(error.message || "No se ha podido cambiar.", "error");
    }
}


async function borrar_(emision) {
    if (!window.confirm(`¿Borrar esta emisión?\n\n${queEmite(emision)}\n${cuando(emision)}`)) return;
    try {
        await peticionAdministrativa(`${RUTA}/${emision.id}`, {method: "DELETE"});
        estado("Emisión borrada.", "ok");
        await cargarEmisionDestacada();
    } catch (error) {
        estado(error.message || "No se ha podido borrar.", "error");
    }
}


/* ==========================================================
   ENTRADA
   ========================================================== */

export async function cargarEmisionDestacada() {
    if (!directos.length) await cargarDirectos();
    datos = await peticionJson(RUTA);
    pintarActual();
    pintarLista();
    if (!editando) limpiarFormulario();
}


export function configurarEventosEmisionDestacada() {
    if (configurado) return;
    configurado = true;

    $("formularioEmisionDestacada").addEventListener("submit", guardar);
    $("botonCancelarEd").addEventListener("click", limpiarFormulario);
    for (const id of ["edUso", "edTipo", "edModo", "edRepetir"]) {
        $(id).addEventListener("change", ajustarFormulario);
    }
    $("edCamara").addEventListener("change", () => {
        rellenarProductos();
        rellenarDias();
    });
    $("edProducto").addEventListener("change", () => rellenarDias());

    $("botonQuitarManual").addEventListener("click", async () => {
        try {
            await peticionAdministrativa(`${RUTA}/quitar-manual`, {method: "POST"});
            estado("Manual quitada: vuelve lo programado.", "ok");
            await cargarEmisionDestacada();
        } catch (error) {
            estado(error.message || "No se ha podido quitar.", "error");
        }
    });

    $("botonRecargarEd").addEventListener("click", async () => {
        try {
            await cargarEmisionDestacada();
            estado("Actualizado.", "ok");
        } catch (error) {
            estado(error.message || "No se ha podido cargar.", "error");
        }
    });
}


/* Fin de fichero: js/administracion/emision-destacada.js */
