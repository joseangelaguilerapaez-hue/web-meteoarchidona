/*
 * MeteoArchidona
 * Administración · Sequía (Agua y sequía, fase 2).
 *
 * Decisiones de José del 14-11-2026 (docs/agua-sequia.md de la API): el
 * informe mensual del Ministerio solo trae el indicador de cada unidad; el
 * escenario lo estima la API con los umbrales comunes de los planes y aquí
 * se corrige mirando el mapa oficial. «Estimado» vuelve al escenario
 * estimado. Las cargas siguientes no pisan una corrección. El motivo solo
 * se ve aquí.
 *
 * GET /admin/agua/sequia/situacion · PUT /admin/agua/sequia/situacion/{id}
 *
 * El texto nunca se mete como HTML.
 */

import {
    $,
    mostrarEstado
} from "./estado.js?v=20261026-cache1";

import {
    peticionJson
} from "./api.js?v=20261026-cache1";


const RUTA = "/admin/agua/sequia/situacion";

const ESCENARIOS = {
    UTS: ["NORMALIDAD", "SEQUIA_PROLONGADA"],
    UTE: ["NORMALIDAD", "PREALERTA", "ALERTA", "EMERGENCIA"],
};

const MES = new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", month: "long", year: "numeric" });
const DECIMAL = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

let configurado = false;


function crear(etiqueta, clase, texto) {
    const nodo = document.createElement(etiqueta);
    if (clase) nodo.className = clase;
    if (texto !== undefined && texto !== null) nodo.textContent = texto;
    return nodo;
}


function fila(unidad, nombres) {
    const tr = crear("tr");
    tr.appendChild(crear("td", null, unidad.codigo));
    tr.appendChild(crear("td", null, unidad.nombre));
    tr.appendChild(crear("td", null, unidad.tipo));
    tr.appendChild(crear("td", null, unidad.indicador === null || unidad.indicador === undefined ? "—" : DECIMAL.format(unidad.indicador)));
    tr.appendChild(crear("td", null, unidad.estimado ? nombres[unidad.estimado] || unidad.estimado : "—"));

    const celdaEscenario = crear("td");
    const selector = crear("select");
    selector.appendChild(new Option("Estimado", ""));
    for (const codigo of ESCENARIOS[unidad.tipo] || []) {
        selector.appendChild(new Option(nombres[codigo] || codigo, codigo));
    }
    selector.value = unidad.corregido ? unidad.escenario || "" : "";
    selector.setAttribute("aria-label", `Escenario de ${unidad.codigo}`);
    celdaEscenario.appendChild(selector);
    tr.appendChild(celdaEscenario);

    const celdaMotivo = crear("td");
    const motivo = crear("input");
    motivo.type = "text";
    motivo.maxLength = 300;
    motivo.value = unidad.motivo || "";
    motivo.placeholder = "Motivo (opcional)";
    motivo.setAttribute("aria-label", `Motivo de ${unidad.codigo}`);
    celdaMotivo.appendChild(motivo);
    tr.appendChild(celdaMotivo);

    const celdaBoton = crear("td");
    const guardar = crear("button", "boton boton-secundario", "Guardar");
    guardar.type = "button";
    guardar.addEventListener("click", async () => {
        guardar.disabled = true;
        try {
            await peticionJson(`${RUTA}/${unidad.id}`, {
                method: "PUT",
                body: JSON.stringify({ escenario: selector.value || null, motivo: motivo.value.trim() || null }),
            });
            mostrarEstado($("estadoSequia"), `${unidad.codigo} ${unidad.nombre}: guardado.`, "ok");
            await cargarSequia();
        } catch (error) {
            guardar.disabled = false;
            mostrarEstado($("estadoSequia"), error.message || "No se ha podido guardar.", "error");
        }
    });
    celdaBoton.appendChild(guardar);
    tr.appendChild(celdaBoton);
    if (unidad.corregido) tr.classList.add("adm-sequia-corregida");
    return tr;
}


export async function cargarSequia() {
    const datos = await peticionJson(RUTA);
    const nombres = datos.nombres_escenario || {};
    $("mesSequia").textContent = datos.mes ? `Informe con datos de ${MES.format(new Date(`${datos.mes}T00:00:00Z`))}` : "Sin informes cargados";

    const contenedor = $("tablaSequia");
    contenedor.textContent = "";
    if (!datos.demarcaciones.length) {
        contenedor.appendChild(crear("p", "modulo-intro", "Todavía no hay unidades. Lanza el proceso «Carga de Sequía de España» en Procesos."));
        return;
    }
    for (const demarcacion of datos.demarcaciones) {
        contenedor.appendChild(crear("h3", "adm-sequia-demarcacion", demarcacion.nombre));
        const tabla = crear("table");
        const cabeza = crear("thead");
        const filaCabeza = crear("tr");
        for (const columna of ["Código", "Unidad", "Tipo", "Indicador", "Estimado", "Publicado", "Motivo", ""]) {
            filaCabeza.appendChild(crear("th", null, columna));
        }
        cabeza.appendChild(filaCabeza);
        tabla.appendChild(cabeza);
        const cuerpo = crear("tbody");
        for (const unidad of [...demarcacion.uts, ...demarcacion.ute]) {
            cuerpo.appendChild(fila(unidad, nombres));
        }
        tabla.appendChild(cuerpo);
        contenedor.appendChild(tabla);
    }
}


export function configurarEventosSequia() {
    if (configurado) return;
    configurado = true;

    $("botonRecargarSequia")?.addEventListener("click", async () => {
        try {
            await cargarSequia();
            mostrarEstado($("estadoSequia"), "Situación actualizada.", "ok");
        } catch (error) {
            mostrarEstado($("estadoSequia"), error.message || "No se ha podido cargar la situación.", "error");
        }
    });
}


/* Fin de fichero: js/administracion/sequia.js */
