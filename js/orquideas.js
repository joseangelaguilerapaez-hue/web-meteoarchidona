/*
 * MeteoArchidona · Página Orquídeas
 *
 * Desde el 25-11-2026 es una sección de la página «Fauna y Flora», con su
 * cabecera, su menú y su pie (js/fauna-flora/marco.js).
 *
 * Decisión de José del 25-11-2026: las orquídeas silvestres de la
 * comarca, con las observaciones de GBIF a menos de 25, 50 o 100 km de
 * Archidona (50 por defecto). Gama «Ophrys» sobre blanco. Sección privada:
 * solo la ven los administradores y los amigos de las orquídeas; a los
 * demás la página les dice que es privada (la API responde 401 o 403).
 *
 * Componentes (cada uno en su módulo, con su hoja
 * css/orquideas-componentes.css):
 *
 *     data-componente="orquideas-resumen"   → js/orquideas/resumen.js
 *     data-componente="orquideas-en-flor"   → js/orquideas/en-flor.js
 *     data-componente="orquideas-mapa"      → js/orquideas/mapa.js
 *     data-componente="orquideas-especies"  → js/orquideas/especies.js
 *     data-componente="orquideas-ficha"     → js/orquideas/ficha.js
 *
 * ?radio=25|50|100 elige el radio; ?especie=ID, la especie de la ficha.
 *
 * Detalle de datos y fuentes en docs/orquideas.md de api-meteoarchidona.
 */

import {montarResumenOrquideas} from "./orquideas/resumen.js?v=20261125-orquideas1";
import {montarEnFlorOrquideas} from "./orquideas/en-flor.js?v=20261125-orquideas1";
import {montarMapaOrquideas} from "./orquideas/mapa.js?v=20261125-orquideas1";
import {montarEspeciesOrquideas} from "./orquideas/especies.js?v=20261125-orquideas1";
import {montarFichaOrquideas} from "./orquideas/ficha.js?v=20261125-orquideas1";
import {pedir, textoError, RADIOS, RADIO_DEFECTO} from "./orquideas/comun.js?v=20261125-orquideas1";
import {montarMarcoFaunaFlora} from "./fauna-flora/marco.js?v=20261125-fauna1";


export const COMPONENTES_ORQUIDEAS = {
    "orquideas-resumen": montarResumenOrquideas,
    "orquideas-en-flor": montarEnFlorOrquideas,
    "orquideas-mapa": montarMapaOrquideas,
    "orquideas-especies": montarEspeciesOrquideas,
    "orquideas-ficha": montarFichaOrquideas
};


function montar(hueco) {
    const montarComponente = COMPONENTES_ORQUIDEAS[hueco.dataset.componente];
    if (!montarComponente) return;

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


async function arrancar() {
    void montarMarcoFaunaFlora();
    const radio = radioDeLaDireccion();
    const privado = document.getElementById("orquideas-privado");
    const contenido = document.getElementById("orquideas-contenido");

    // Primero se comprueba el permiso: sin él, solo el aviso de sección privada.
    try {
        await pedir(`/orquideas/resumen?radio=${radio}`);
    } catch (error) {
        if (error.estado === 401 || error.estado === 403) {
            privado.querySelector("[data-texto]").textContent = textoError(error);
            privado.hidden = false;
            contenido.hidden = true;
            document.querySelector(".orquideas-radio")?.setAttribute("hidden", "");
            return;
        }
    }

    pintarSelectorRadio(radio);

    for (const hueco of document.querySelectorAll("#orquideas-contenido [data-componente]")) {
        hueco.dataset.radio = String(radio);
        montar(hueco);
    }
}


void arrancar();


/* Fin de fichero: js/orquideas.js */
