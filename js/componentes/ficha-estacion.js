/*
 * MeteoArchidona · Componente «Ficha de estación»
 *
 * La ficha de una estación (datos actuales, lluvia, viento, estado y
 * sus cámaras) montable en cualquier página o dashboard con solo el
 * código de la estación. Hasta el 4-11-2026 solo la creaba Actualidad
 * dentro de su rejilla; desde entonces es un componente más (decisión
 * de José: todo en componentes, para los dashboards).
 *
 *     <div data-componente="ficha-estacion" data-estacion="LOS_LLANOS"></div>
 *     <div data-componente="ficha-estacion" data-estacion="EL_SILO"
 *          data-modo="horizontal"></div>
 *
 *     import {montarFichaEstacion} from "/js/componentes/ficha-estacion.js?v=…";
 *     montarFichaEstacion(hueco);
 *
 * Opciones:
 *   - data-estacion: código de la estación (obligatorio), el mismo de
 *     la API (LOS_LLANOS, EL_SILO…).
 *   - data-modo: "vertical" (por defecto) u "horizontal".
 *
 * La ficha pide ella misma sus datos a la API: el catálogo público
 * (/estaciones) para el nombre y la localidad, las condiciones actuales
 * cada minuto y sus cámaras. Reutiliza tal cual la plantilla
 * (componentes/ficha-estacion.html) y los módulos de Actualidad, así que
 * se ve y se comporta igual que allí, lluvia local y gotas incluidas.
 *
 * Una ficha por estación y página: sus elementos llevan id con el código
 * de la estación. Si se repite, la segunda no se monta y lo dice en la
 * consola. Una estación que no esté en el catálogo público deja un aviso
 * en el hueco.
 *
 * Carga css/ficha-estacion.css y js/api.js si la página no los tiene.
 */

import {asegurarHoja, asegurarScript} from "./comun.js?v=20261104-componentes1";

import {
    INTERVALO_CATALOGO_MS,
    INTERVALO_CONDICIONES_MS,
    INTERVALO_GOTAS_CRISTAL_MS
} from "../actualidad/estado.js?v=20260914-modular2";

import {
    actualizarMetadatosFicha,
    cargarPlantillaFichaEstacion,
    crearEstadoInicialEstacion,
    crearFichaEstacion,
    obtenerMetadatosEstacion
} from "../actualidad/estaciones.js?v=20261113-episodio1";

import {
    cargarCatalogoEstaciones,
    cargarEstacion
} from "../actualidad/api.js?v=20261113-episodio1";

import {
    actualizarSistemaLluvia,
    generarGotasCristalActivas,
    inicializarLluviaVisualEstacion
} from "../actualidad/efectos-lluvia.js?v=20261113-episodio1";

import {configurarControlesLluvia} from "../actualidad/simulacion.js?v=20261113-episodio1";

import {configurarPatrocinios} from "../actualidad/patrocinios.js?v=20260914-modular2";

import {establecerModoFicha, montarVisorFicha} from "../ficha-estacion.js?v=20261101-nieve";


const HOJA = "/css/ficha-estacion.css?v=20261113-episodio1";

const SCRIPT_API = "/js/api.js?v=20261003-vps1";

const MODOS = new Set(["vertical", "horizontal"]);


/* Fichas montadas en la página: código → ficha. */
const montadas = new Map();

/* Preparación común (API, plantilla y catálogo): una sola vez por página. */
let preparacion = null;

let relojesArrancados = false;


function normalizarCodigo(valor) {
    return String(valor || "").trim().toUpperCase();
}


function preparar() {
    if (!preparacion) {
        preparacion = (async () => {
            asegurarHoja(HOJA);
            await asegurarScript(SCRIPT_API, "API_BASE");
            if (!(await cargarPlantillaFichaEstacion())) {
                throw new Error("No se pudo cargar la plantilla de la ficha.");
            }
            await cargarCatalogoEstaciones();
        })();
        // Si falla, que el siguiente intento vuelva a empezar.
        preparacion.catch(() => { preparacion = null; });
    }
    return preparacion;
}


function avisar(hueco, texto) {
    hueco.innerHTML = "";
    const aviso = document.createElement("p");
    aviso.className = "ficha-estacion-aviso";
    aviso.textContent = texto;
    hueco.appendChild(aviso);
}


async function refrescarCondiciones() {
    await Promise.all([...montadas.keys()].map(codigo => cargarEstacion(codigo)));
}


async function refrescarCatalogo() {
    if (!(await cargarCatalogoEstaciones())) {
        return;
    }
    for (const [codigo, ficha] of montadas) {
        const estacion = obtenerMetadatosEstacion(codigo);
        if (estacion) {
            actualizarMetadatosFicha(ficha, estacion);
            // Conserva el iframe si la dirección del visor no cambia.
            montarVisorFicha(ficha, codigo);
        }
    }
    actualizarSistemaLluvia();
}


/* Un solo juego de relojes para todas las fichas de la página. */
function arrancarRelojes() {
    if (relojesArrancados) {
        return;
    }
    relojesArrancados = true;
    window.setInterval(refrescarCondiciones, INTERVALO_CONDICIONES_MS);
    window.setInterval(refrescarCatalogo, INTERVALO_CATALOGO_MS);
    window.setInterval(generarGotasCristalActivas, INTERVALO_GOTAS_CRISTAL_MS);
}


export async function montarFichaEstacion(hueco) {

    const codigo = normalizarCodigo(hueco.dataset.estacion);

    if (!codigo) {
        avisar(hueco, "Falta indicar la estación.");
        console.error("Ficha de estación: el hueco no tiene data-estacion.", hueco);
        return null;
    }

    if (montadas.has(codigo) || document.getElementById(`tarjeta-${codigo}`)) {
        console.warn(`Ficha de estación: ${codigo} ya está en la página; solo cabe una por estación.`);
        hueco.hidden = true;
        return null;
    }

    hueco.classList.add("componente-ficha-estacion");
    hueco.setAttribute("aria-busy", "true");

    try {
        await preparar();
    } catch (error) {
        hueco.removeAttribute("aria-busy");
        avisar(hueco, "No se ha podido cargar la ficha de la estación.");
        throw error;
    }

    const estacion = obtenerMetadatosEstacion(codigo);

    if (!estacion) {
        hueco.removeAttribute("aria-busy");
        avisar(hueco, "Esta estación no está publicada.");
        return null;
    }

    // Por si otro hueco con la misma estación se ha adelantado mientras tanto.
    if (montadas.has(codigo)) {
        hueco.hidden = true;
        return null;
    }

    const ficha = crearFichaEstacion(estacion);

    if (!ficha) {
        hueco.removeAttribute("aria-busy");
        avisar(hueco, "No se ha podido cargar la ficha de la estación.");
        return null;
    }

    const modo = String(hueco.dataset.modo || "").trim().toLowerCase();
    if (MODOS.has(modo)) {
        establecerModoFicha(ficha, modo);
    }

    hueco.replaceChildren(ficha);
    hueco.removeAttribute("aria-busy");
    montadas.set(codigo, ficha);

    crearEstadoInicialEstacion(codigo);
    inicializarLluviaVisualEstacion(codigo);
    configurarControlesLluvia(ficha);
    configurarPatrocinios(ficha);

    arrancarRelojes();

    await cargarEstacion(codigo);

    return ficha;
}


/* Fin de fichero: js/componentes/ficha-estacion.js */
