/*
 * MeteoArchidona · Agua y sequía · Situación oficial del Ministerio
 *
 *     <div data-componente="sequia-oficial" data-demarcacion="Guadalquivir"></div>
 *
 * Informe mensual del Ministerio (Observatorio Nacional de la Sequía,
 * MITECO): indicadores de sequía prolongada (UTS) y de escasez (UTE) de
 * cada unidad territorial, con el escenario que estima MeteoArchidona con
 * los umbrales comunes de los planes (corregible en Administración) y los
 * dos mapas oficiales al lado (José, 14-11-2026; docs/agua-sequia.md de la
 * API).
 *
 * Opciones: data-demarcacion (todas por defecto; el Guadalquivir sale
 * primero), data-mapas="no" para no poner los mapas oficiales y
 * data-tablas="no" para dejar solo el resumen y los mapas.
 *
 * API: GET /agua/sequia/oficial y las imágenes /agua/sequia/mapas/{id}.
 */

import { aviso, crear, mes, pedir, pie, prepararRaiz } from "./comun.js?v=20261114-sequia2";


const formatoIndicador = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ORDEN_UTE = ["NORMALIDAD", "PREALERTA", "ALERTA", "EMERGENCIA"];
const ORDEN_UTS = ["NORMALIDAD", "SEQUIA_PROLONGADA"];

function base() {
    return window.API_BASE || "/api";
}

function marcaEscenario(codigo, nombres) {
    return crear("span", `seq-clase esc-${codigo || "NINGUNO"}`, (codigo && nombres[codigo]) || "Sin dato");
}

function resumen(cuentas, orden, nombres, titulo) {
    const caja = crear("div", "seq-oficial-resumen");
    caja.appendChild(crear("span", "seq-capa-nombre", titulo));
    const fila = crear("div", "seq-oficial-cuentas");
    for (const codigo of orden) {
        const total = (cuentas && cuentas[codigo]) || 0;
        const pastilla = marcaEscenario(codigo, nombres);
        pastilla.textContent = `${nombres[codigo]}: ${total}`;
        fila.appendChild(pastilla);
    }
    caja.appendChild(fila);
    return caja;
}

function tabla(unidades, nombres, titulo) {
    const caja = crear("div", "seq-tabla-caja");
    const t = crear("table", "seq-tabla seq-tabla-oficial");
    const leyendaTabla = crear("caption", null, titulo);
    t.appendChild(leyendaTabla);
    const cabeza = crear("thead");
    const filaCabeza = crear("tr");
    for (const columna of ["Unidad", "Índice", "Escenario"]) {
        filaCabeza.appendChild(crear("th", null, columna));
    }
    cabeza.appendChild(filaCabeza);
    t.appendChild(cabeza);
    const cuerpo = crear("tbody");
    for (const u of unidades) {
        const fila = crear("tr");
        const nombre = crear("th");
        nombre.scope = "row";
        nombre.appendChild(crear("span", "seq-codigo", u.codigo));
        nombre.appendChild(crear("span", "seq-unidad", u.nombre));
        fila.appendChild(nombre);
        fila.appendChild(crear("td", "seq-cifra", u.indicador === null || u.indicador === undefined ? "—" : formatoIndicador.format(u.indicador)));
        const celda = crear("td");
        celda.appendChild(marcaEscenario(u.escenario, nombres));
        celda.appendChild(crear("span", "seq-nota seq-marca", u.corregido ? "revisado" : "estimado"));
        fila.appendChild(celda);
        cuerpo.appendChild(fila);
    }
    t.appendChild(cuerpo);
    caja.appendChild(t);
    return caja;
}

function mapaOficial(entrada, titulo) {
    const marco = crear("figure", "seq-mapa-marco seq-mapa-oficial");
    if (!entrada) {
        aviso(marco, `${titulo}: sin mapa cargado.`);
        return marco;
    }
    const imagen = crear("img");
    imagen.src = `${base()}/agua/sequia/mapas/${entrada.id}`;
    imagen.alt = `${titulo} (mapa oficial del Ministerio)`;
    imagen.loading = "lazy";
    imagen.decoding = "async";
    marco.appendChild(imagen);
    marco.appendChild(crear("figcaption", null, titulo));
    return marco;
}


export async function montarOficialSequia(raiz) {
    prepararRaiz(raiz, "seq-oficial");
    const cabeza = crear("div", "seq-cabeza");
    const textos = crear("div");
    textos.appendChild(crear("div", "emb-etiqueta", "Sequía · Ministerio"));
    if (raiz.dataset.titulo !== "no") {
        textos.appendChild(crear("h3", "emb-titulo", "Situación oficial de sequía y escasez"));
    }
    cabeza.appendChild(textos);
    raiz.appendChild(cabeza);

    const cuerpo = crear("div", "seq-cuerpo");
    raiz.appendChild(cuerpo);
    aviso(cuerpo, "Cargando el informe del Ministerio…");

    const demarcacion = (raiz.dataset.demarcacion || "").trim();
    let datos;
    try {
        datos = await pedir(`/agua/sequia/oficial${demarcacion ? `?demarcacion=${encodeURIComponent(demarcacion)}` : ""}`);
    } catch {
        aviso(cuerpo, "No se ha podido leer la situación oficial. Prueba dentro de un rato.", true);
        return;
    }
    cuerpo.textContent = "";
    const nombres = datos.nombres_escenario || {};

    if (datos.mes) {
        cuerpo.appendChild(crear("p", "seq-resumen", `Informe del Ministerio con datos de ${mes(datos.mes)}`));
    } else if (!datos.mapa_sequia && !datos.mapa_escasez) {
        aviso(cuerpo, "Todavía no hay informes del Ministerio cargados.");
        return;
    }

    if (datos.resumen) {
        const resumenes = crear("div", "seq-oficial-resumenes");
        resumenes.appendChild(resumen(datos.resumen.uts, ORDEN_UTS, nombres, "Sequía prolongada (unidades UTS)"));
        resumenes.appendChild(resumen(datos.resumen.ute, ORDEN_UTE, nombres, "Escasez (unidades UTE)"));
        cuerpo.appendChild(resumenes);
    }

    if (raiz.dataset.mapas !== "no") {
        const mapas = crear("div", "seq-oficial-mapas");
        mapas.appendChild(mapaOficial(datos.mapa_sequia, "Sequía prolongada"));
        mapas.appendChild(mapaOficial(datos.mapa_escasez, "Escasez coyuntural"));
        cuerpo.appendChild(mapas);
    }

    if (raiz.dataset.tablas !== "no") {
        for (const d of datos.demarcaciones) {
            const bloque = crear("details", "seq-demarcacion");
            if (d === datos.demarcaciones[0]) bloque.open = true;
            bloque.appendChild(crear("summary", null, d.nombre));
            if (d.uts.length) bloque.appendChild(tabla(d.uts, nombres, "Sequía prolongada"));
            if (d.ute.length) bloque.appendChild(tabla(d.ute, nombres, "Escasez"));
            cuerpo.appendChild(bloque);
        }
        if (datos.demarcaciones.length) {
            cuerpo.appendChild(crear("p", "seq-nota",
                "La Mediterránea Andaluza y Guadalete-Barbate las gestiona la Junta y no vienen en las tablas del informe: mira los mapas oficiales."));
        }
    }

    cuerpo.appendChild(crear("p", "emb-aviso", datos.aviso));
    const enlace = crear("p", "seq-nota");
    const a = crear("a", null, "Informes y mapas del Ministerio");
    a.href = datos.url_informes;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    enlace.appendChild(a);
    cuerpo.appendChild(enlace);
    pie(cuerpo, datos.cita);
}


/* Fin de fichero: js/sequia/oficial.js */
