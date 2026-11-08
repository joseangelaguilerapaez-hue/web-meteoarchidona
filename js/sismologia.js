/*
 * MeteoArchidona · Página Sismología
 *
 * Decisión de José del 8-11-2026: sección de terremotos con el IGN como
 * fuente oficial y el EMSC como aviso rápido, guardados en nuestra base
 * (a menos de 300 km de Archidona), toda en componentes que se puedan
 * poner en los dashboards. Fondo blanco con la gama «Basalto y magma».
 *
 * Componentes (cada uno en su módulo, con su hoja
 * css/sismologia-componentes.css):
 *
 *     data-componente="sismologia-aviso"          → js/sismologia/aviso.js
 *     data-componente="sismologia-ultimo"         → js/sismologia/ultimo.js
 *     data-componente="sismologia-resumen"        → js/sismologia/resumen.js
 *     data-componente="sismologia-mapa"           → js/sismologia/mapa.js
 *     data-componente="sismologia-lista"          → js/sismologia/lista.js
 *     data-componente="sismologia-estadisticas"   → js/sismologia/estadisticas.js
 *
 * Selector de radio (José, 8-11-2026): arriba, 100, 150, 200, 250 o 300
 * km, con 200 por defecto. Al cambiarlo se vuelven a montar los
 * componentes marcados con data-radio-pagina (mapa, lista, cifras y
 * gráficas) y se actualizan los textos con clase sismologia-radio. La
 * API guarda hasta 300 km, así que no hace falta pedir nada distinto. El
 * aviso de terremoto cercano no cambia: sigue en 100 km. La elección se
 * recuerda en el navegador, si deja.
 *
 * Detalle de datos y fuentes en docs/sismologia.md de api-meteoarchidona.
 */

import {montarAvisoTerremoto} from "./sismologia/aviso.js?v=20261108-sismo3";
import {montarUltimoTerremoto} from "./sismologia/ultimo.js?v=20261108-sismo3";
import {montarResumenSismico} from "./sismologia/resumen.js?v=20261108-sismo3";
import {montarMapaTerremotos} from "./sismologia/mapa.js?v=20261108-sismo3";
import {montarListaTerremotos} from "./sismologia/lista.js?v=20261108-sismo3";
import {montarEstadisticasSismicas} from "./sismologia/estadisticas.js?v=20261108-sismo3";


export const COMPONENTES_SISMOLOGIA = {
    "sismologia-aviso": montarAvisoTerremoto,
    "sismologia-ultimo": montarUltimoTerremoto,
    "sismologia-resumen": montarResumenSismico,
    "sismologia-mapa": montarMapaTerremotos,
    "sismologia-lista": montarListaTerremotos,
    "sismologia-estadisticas": montarEstadisticasSismicas
};


function montar(hueco) {
    const montarComponente = COMPONENTES_SISMOLOGIA[hueco.dataset.componente];
    if (!montarComponente) return;

    try {
        const promesa = montarComponente(hueco);
        if (promesa && promesa.catch) {
            promesa.catch(error => console.error(`Sismología: falló ${hueco.dataset.componente}`, error));
        }
    } catch (error) {
        console.error(`Sismología: no se pudo montar ${hueco.dataset.componente}`, error);
    }
}


const RADIOS = [100, 150, 200, 250, 300];

const RADIO_DEFECTO = 200;

const CLAVE_RADIO = "meteoarchidona.sismologia.radio";


function radioGuardado() {
    try {
        const valor = Number(localStorage.getItem(CLAVE_RADIO));
        return RADIOS.includes(valor) ? valor : RADIO_DEFECTO;
    } catch (error) {
        return RADIO_DEFECTO;
    }
}


function guardarRadio(valor) {
    try {
        localStorage.setItem(CLAVE_RADIO, String(valor));
    } catch (error) {
        // Sin almacenamiento (modo privado…): se queda solo para esta visita.
    }
}


function aplicarRadio(valor, montarYa) {
    for (const texto of document.querySelectorAll(".sismologia-radio")) {
        texto.textContent = `${valor} km`;
    }

    for (const hueco of document.querySelectorAll("[data-radio-pagina]")) {
        hueco.dataset.radio = String(valor);
        if (montarYa) montar(hueco);
    }
}


function prepararSelector(inicial) {
    const caja = document.querySelector(".sismologia-radios");
    if (!caja) return;

    for (const valor of RADIOS) {
        const etiqueta = document.createElement("label");
        etiqueta.className = "sismologia-radio-opcion";

        const opcion = document.createElement("input");
        opcion.type = "radio";
        opcion.name = "sismologia-radio";
        opcion.value = String(valor);
        opcion.checked = valor === inicial;
        opcion.addEventListener("change", () => {
            if (!opcion.checked) return;
            guardarRadio(valor);
            aplicarRadio(valor, true);
        });

        etiqueta.appendChild(opcion);
        etiqueta.appendChild(document.createTextNode(`${valor} km`));
        caja.appendChild(etiqueta);
    }
}


const radioInicial = radioGuardado();
prepararSelector(radioInicial);
aplicarRadio(radioInicial, false);

document.querySelectorAll("[data-componente]").forEach(montar);


/* Fin de fichero: js/sismologia.js */
