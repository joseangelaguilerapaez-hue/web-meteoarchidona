/*
 * MeteoArchidona · Página Predicción
 *
 * Desde el 2-11-2026 la página va por pestañas, una por fuente (decisión
 * de José). Este script solo las gobierna y monta el componente de cada
 * una; lo que enseña cada pestaña vive en su propio módulo, para poder
 * ponerlo también en otras páginas o dashboards:
 *
 *     data-componente="prediccion-aemet"   → js/prediccion-aemet.js
 *     data-componente="modelos-numericos"  → js/modelos-numericos.js
 *
 * Cada componente se monta la primera vez que se abre su pestaña: quien
 * solo mira AEMET no descarga los modelos. La pestaña abierta queda en la
 * dirección (/prediccion#modelos) para poder enlazarla.
 */

import {montarPrediccionAemet} from "./prediccion-aemet.js?v=20261102-pestanas1";
import {montarModelosNumericos} from "./modelos-numericos.js?v=20261103-zoom1";


const COMPONENTES = {
    "prediccion-aemet": montarPrediccionAemet,
    "modelos-numericos": montarModelosNumericos
};

const PESTANA_POR_DEFECTO = "aemet";


const pestanas = [...document.querySelectorAll(".pred-pestana[data-pestana]")];
const montados = new WeakSet();


function montarComponentes(panel) {
    for (const hueco of panel.querySelectorAll("[data-componente]")) {
        if (montados.has(hueco)) {
            continue;
        }

        const montar = COMPONENTES[hueco.dataset.componente];

        if (!montar) {
            continue;
        }

        montados.add(hueco);

        try {
            montar(hueco);
        } catch (error) {
            console.error(`Predicción: no se pudo montar ${hueco.dataset.componente}`, error);
        }
    }
}


function abrir(nombre, {foco = false, guardar = true} = {}) {
    const elegida = pestanas.find((pestana) => pestana.dataset.pestana === nombre)
        || pestanas.find((pestana) => pestana.dataset.pestana === PESTANA_POR_DEFECTO);

    for (const pestana of pestanas) {
        const activa = pestana === elegida;
        const panel = document.getElementById(pestana.getAttribute("aria-controls"));

        pestana.setAttribute("aria-selected", String(activa));
        pestana.tabIndex = activa ? 0 : -1;
        pestana.classList.toggle("activa", activa);
        panel.hidden = !activa;

        if (activa) {
            montarComponentes(panel);
        }
    }

    if (foco) {
        elegida.focus();
    }

    if (guardar) {
        const hash = elegida.dataset.pestana === PESTANA_POR_DEFECTO ? "" : `#${elegida.dataset.pestana}`;
        history.replaceState(null, "", `${location.pathname}${location.search}${hash}`);
    }
}


for (const pestana of pestanas) {
    pestana.addEventListener("click", () => abrir(pestana.dataset.pestana));

    pestana.addEventListener("keydown", (evento) => {
        const indice = pestanas.indexOf(pestana);
        let destino = null;

        if (evento.key === "ArrowRight") destino = pestanas[(indice + 1) % pestanas.length];
        if (evento.key === "ArrowLeft") destino = pestanas[(indice - 1 + pestanas.length) % pestanas.length];
        if (evento.key === "Home") destino = pestanas[0];
        if (evento.key === "End") destino = pestanas[pestanas.length - 1];

        if (destino) {
            evento.preventDefault();
            abrir(destino.dataset.pestana, {foco: true});
        }
    });
}

window.addEventListener("hashchange", () => {
    abrir(location.hash.slice(1) || PESTANA_POR_DEFECTO, {guardar: false});
});

abrir(location.hash.slice(1) || PESTANA_POR_DEFECTO, {guardar: false});


/* Fin de fichero: js/prediccion.js */
