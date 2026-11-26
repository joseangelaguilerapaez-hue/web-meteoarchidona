/*
 * MeteoArchidona · Página Orquídeas
 *
 * Desde el 25-11-2026 es una sección de la página «Fauna y Flora», con su
 * cabecera, su menú y su pie (js/fauna-flora/marco.js).
 *
 * Decisión de José del 25-11-2026: las orquídeas silvestres de la
 * comarca, con las observaciones de GBIF a menos de 25, 50 o 100 km de
 * Archidona (50 por defecto). Gama «Ophrys» sobre blanco.
 *
 * Decisiones de José y Damián Quintana del 26-11-2026: la sección es
 * pública desde su lanzamiento (24-12-2026; antes la ven administradores,
 * amigos y editores de orquídeas y a los demás la página les dice que se
 * estrena pronto), con tres apartados:
 *
 *     Especies y mapa  → resumen, en flor, mapa, catálogo y ficha
 *     Jornadas         → Jornadas de Orquideoflora de Archidona
 *     Publicaciones    → artículos de Damián y sus coautores
 *
 * Componentes (cada uno en su módulo, con su hoja
 * css/orquideas-componentes.css):
 *
 *     data-componente="orquideas-resumen"        → js/orquideas/resumen.js
 *     data-componente="orquideas-en-flor"        → js/orquideas/en-flor.js
 *     data-componente="orquideas-mapa"           → js/orquideas/mapa.js
 *     data-componente="orquideas-especies"       → js/orquideas/especies.js
 *     data-componente="orquideas-ficha"          → js/orquideas/ficha.js
 *     data-componente="orquideas-jornadas"       → js/orquideas/jornadas.js
 *     data-componente="orquideas-publicaciones"  → js/orquideas/publicaciones.js
 *
 * El editor de orquídeas (o un administrador) ve en cada apartado los
 * botones para añadir y corregir (js/orquideas/editor.js).
 *
 * ?apartado=jornadas|publicaciones elige el apartado; ?radio=25|50|100, el
 * radio; ?especie=ID, la especie de la ficha.
 *
 * Detalle de datos y fuentes en docs/orquideas.md de api-meteoarchidona.
 */

import {montarResumenOrquideas} from "./orquideas/resumen.js?v=20261126-jornadas1";
import {montarEnFlorOrquideas} from "./orquideas/en-flor.js?v=20261126-jornadas1";
import {montarMapaOrquideas} from "./orquideas/mapa.js?v=20261126-jornadas1";
import {montarEspeciesOrquideas} from "./orquideas/especies.js?v=20261126-jornadas1";
import {montarFichaOrquideas} from "./orquideas/ficha.js?v=20261126-jornadas1";
import {montarJornadasOrquideas} from "./orquideas/jornadas.js?v=20261126-jornadas1";
import {montarPublicacionesOrquideas} from "./orquideas/publicaciones.js?v=20261126-jornadas1";
import {vigilarCuenta} from "./orquideas/editor.js?v=20261126-jornadas1";
import {pedir, RADIOS, RADIO_DEFECTO, EVENTO_ESPECIE} from "./orquideas/comun.js?v=20261126-jornadas1";
import {montarMarcoFaunaFlora} from "./fauna-flora/marco.js?v=20261126-jornadas1";


export const COMPONENTES_ORQUIDEAS = {
    "orquideas-resumen": montarResumenOrquideas,
    "orquideas-en-flor": montarEnFlorOrquideas,
    "orquideas-mapa": montarMapaOrquideas,
    "orquideas-especies": montarEspeciesOrquideas,
    "orquideas-ficha": montarFichaOrquideas,
    "orquideas-jornadas": montarJornadasOrquideas,
    "orquideas-publicaciones": montarPublicacionesOrquideas
};

const APARTADOS = ["especies", "jornadas", "publicaciones"];

const RUTA_LANZAMIENTOS_JS = "/js/lanzamientos.js?v=20261115-lanzamientos2";


function montar(hueco) {
    const montarComponente = COMPONENTES_ORQUIDEAS[hueco.dataset.componente];
    if (!montarComponente || hueco.dataset.montado) return;
    hueco.dataset.montado = "si";

    try {
        const promesa = montarComponente(hueco);
        if (promesa && promesa.catch) {
            promesa.catch(error => console.error(`Orquídeas: falló ${hueco.dataset.componente}`, error));
        }
    } catch (error) {
        console.error(`Orquídeas: no se pudo montar ${hueco.dataset.componente}`, error);
    }
}


function radioDeLaDireccion() {
    const pedido = Number(new URLSearchParams(location.search).get("radio"));
    return RADIOS.includes(pedido) ? pedido : RADIO_DEFECTO;
}


function apartadoDeLaDireccion() {
    const pedido = new URLSearchParams(location.search).get("apartado");
    return APARTADOS.includes(pedido) ? pedido : "especies";
}


function pintarSelectorRadio(radio) {
    const zona = document.getElementById("orquideas-radio");
    if (!zona) return;
    zona.replaceChildren();
    for (const valor of RADIOS) {
        const boton = document.createElement("button");
        boton.type = "button";
        boton.className = "orquideas-radio-boton";
        boton.textContent = `${valor} km`;
        boton.setAttribute("aria-pressed", String(valor === radio));
        boton.addEventListener("click", () => {
            if (valor === radio) return;
            const direccion = new URL(location.href);
            direccion.searchParams.set("radio", String(valor));
            location.assign(direccion);
        });
        zona.appendChild(boton);
    }
}


/* ------------------------------------------------------------
   Apartados (pestañas)
   ------------------------------------------------------------ */

function abrirApartado(apartado, { enDireccion = true, enfocar = false } = {}) {
    const radio = document.querySelector(".orquideas-radio");
    for (const nombre of APARTADOS) {
        const pestana = document.getElementById(`orquideas-pestana-${nombre}`);
        const panel = document.getElementById(`orquideas-panel-${nombre}`);
        const activo = nombre === apartado;
        pestana.setAttribute("aria-selected", String(activo));
        pestana.tabIndex = activo ? 0 : -1;
        panel.hidden = !activo;
        if (activo) {
            panel.querySelectorAll("[data-componente]").forEach(montar);
            if (enfocar) pestana.focus();
        }
    }
    if (radio) radio.hidden = apartado !== "especies";

    if (enDireccion) {
        const direccion = new URL(location.href);
        if (apartado === "especies") {
            direccion.searchParams.delete("apartado");
        } else {
            direccion.searchParams.set("apartado", apartado);
        }
        history.replaceState(null, "", direccion);
    }
}


function configurarPestanas() {
    const lista = document.getElementById("orquideas-pestanas");
    lista.hidden = false;
    for (const nombre of APARTADOS) {
        document.getElementById(`orquideas-pestana-${nombre}`)
            .addEventListener("click", () => abrirApartado(nombre));
    }
    // Flechas del teclado entre pestañas.
    lista.addEventListener("keydown", evento => {
        if (evento.key !== "ArrowRight" && evento.key !== "ArrowLeft") return;
        const actual = APARTADOS.findIndex(nombre =>
            document.getElementById(`orquideas-pestana-${nombre}`).getAttribute("aria-selected") === "true");
        const paso = evento.key === "ArrowRight" ? 1 : -1;
        abrirApartado(APARTADOS[(actual + paso + APARTADOS.length) % APARTADOS.length], { enfocar: true });
        evento.preventDefault();
    });
    // Una especie elegida desde Publicaciones lleva a su ficha.
    document.addEventListener(EVENTO_ESPECIE, () => {
        if (document.getElementById("orquideas-panel-especies").hidden) abrirApartado("especies");
    });
}


/* ------------------------------------------------------------
   Antes del lanzamiento
   ------------------------------------------------------------ */

async function fechaDeEstreno() {
    try {
        const modulo = await import(RUTA_LANZAMIENTOS_JS);
        const datos = await modulo.cargarLanzamientos();
        const lanzamiento = (datos.lanzamientos || []).find(l => l.clave === "orquideas");
        if (!lanzamiento) return null;
        return new Date(lanzamiento.fecha).toLocaleDateString("es-ES", {
            timeZone: "Europe/Madrid", day: "numeric", month: "long"
        });
    } catch {
        return null;
    }
}

async function avisarEstreno() {
    const aviso = document.getElementById("orquideas-privado");
    const fecha = await fechaDeEstreno();
    aviso.querySelector("[data-texto]").textContent = fecha
        ? `La sección Orquídeas se estrena el ${fecha}. Tendrá el mapa y las fichas de las orquídeas silvestres de la comarca, las Jornadas de Orquideoflora de Archidona y las publicaciones sobre ellas.`
        : "La sección Orquídeas se estrena muy pronto.";
    aviso.hidden = false;
    document.getElementById("orquideas-apartados").hidden = true;
    document.querySelector(".orquideas-radio")?.setAttribute("hidden", "");
}


async function arrancar() {
    // Antes del marco, para no perder el primer aviso de la cuenta.
    vigilarCuenta();
    void montarMarcoFaunaFlora();
    const radio = radioDeLaDireccion();

    // Antes del lanzamiento, quien no puede verla solo ve el aviso.
    try {
        await pedir(`/orquideas/resumen?radio=${radio}`);
    } catch (error) {
        if (error.estado === 401 || error.estado === 403) {
            await avisarEstreno();
            return;
        }
    }

    pintarSelectorRadio(radio);
    for (const hueco of document.querySelectorAll("#orquideas-panel-especies [data-componente]")) {
        hueco.dataset.radio = String(radio);
    }
    configurarPestanas();
    abrirApartado(apartadoDeLaDireccion(), { enDireccion: false });
}


void arrancar();


/* Fin de fichero: js/orquideas.js */
