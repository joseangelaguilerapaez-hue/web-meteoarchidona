/*
 * MeteoArchidona · Página Luna
 *
 * Decisión de José del 11-11-2026: sección «Luna», la hermana de Sol, con
 * la astronomía vista desde Archidona, calculada en nuestro servidor con
 * Skyfield para la estación de El Silo, toda en componentes que se puedan
 * poner en los dashboards, con fondo propio azul noche y la gama «Azul
 * noche y oro lunar». Primera entrega: la Luna, los crepúsculos y los
 * planetas. Segunda: pasos de satélites, «¿Se puede observar esta noche?» y
 * el aviso del cielo. Tercera: próximos eventos, cuenta atrás del eclipse,
 * lluvias de estrellas y el calendario lunar del campo.
 *
 * Componentes (cada uno en su módulo, con su hoja
 * css/luna-componentes.css):
 *
 *     data-componente="luna-ahora"           → js/luna/luna-ahora.js
 *     data-componente="luna-horario"         → js/luna/horario.js
 *     data-componente="luna-calendario"      → js/luna/calendario.js
 *     data-componente="luna-distancia"       → js/luna/distancia.js
 *     data-componente="luna-crepusculos"     → js/luna/crepusculos.js
 *     data-componente="luna-planetas-noche"  → js/luna/planetas-noche.js
 *     data-componente="luna-planetas-ahora"  → js/luna/planetas-ahora.js
 *     data-componente="luna-pasos"           → js/luna/pasos.js
 *     data-componente="luna-observacion"     → js/luna/observacion.js
 *     data-componente="luna-aviso"           → js/luna/aviso.js
 *     data-componente="luna-eventos"         → js/luna/eventos.js
 *     data-componente="luna-eclipse"         → js/luna/eclipse.js
 *     data-componente="luna-lluvias"         → js/luna/lluvias.js
 *     data-componente="luna-campo"           → js/luna/campo.js
 *
 * Detalle de datos y cálculo en docs/luna.md de api-meteoarchidona.
 */

import {montarLunaAhora} from "./luna/luna-ahora.js?v=20261111-luna4";
import {montarHorarioLuna} from "./luna/horario.js?v=20261111-luna4";
import {montarCalendarioLuna} from "./luna/calendario.js?v=20261111-luna4";
import {montarDistanciaLuna} from "./luna/distancia.js?v=20261111-luna4";
import {montarCrepusculos} from "./luna/crepusculos.js?v=20261111-luna4";
import {montarPlanetasNoche} from "./luna/planetas-noche.js?v=20261111-luna4";
import {montarPlanetasAhora} from "./luna/planetas-ahora.js?v=20261111-luna4";
import {montarPasos} from "./luna/pasos.js?v=20261111-luna4";
import {montarObservacion} from "./luna/observacion.js?v=20261111-luna4";
import {montarAvisoCielo} from "./luna/aviso.js?v=20261111-luna4";
import {montarEventos} from "./luna/eventos.js?v=20261111-luna4";
import {montarEclipse} from "./luna/eclipse.js?v=20261111-luna4";
import {montarLluvias} from "./luna/lluvias.js?v=20261111-luna4";
import {montarCampo} from "./luna/campo.js?v=20261111-luna4";


export const COMPONENTES_LUNA = {
    "luna-ahora": montarLunaAhora,
    "luna-horario": montarHorarioLuna,
    "luna-calendario": montarCalendarioLuna,
    "luna-distancia": montarDistanciaLuna,
    "luna-crepusculos": montarCrepusculos,
    "luna-planetas-noche": montarPlanetasNoche,
    "luna-planetas-ahora": montarPlanetasAhora,
    "luna-pasos": montarPasos,
    "luna-observacion": montarObservacion,
    "luna-aviso": montarAvisoCielo,
    "luna-eventos": montarEventos,
    "luna-eclipse": montarEclipse,
    "luna-lluvias": montarLluvias,
    "luna-campo": montarCampo
};


function montar(hueco) {
    const montarComponente = COMPONENTES_LUNA[hueco.dataset.componente];
    if (!montarComponente) return;

    try {
        const promesa = montarComponente(hueco);
        if (promesa && promesa.catch) {
            promesa.catch(error => console.error(`Luna: falló ${hueco.dataset.componente}`, error));
        }
    } catch (error) {
        console.error(`Luna: no se pudo montar ${hueco.dataset.componente}`, error);
    }
}


for (const hueco of document.querySelectorAll("[data-componente]")) {
    montar(hueco);
}


/* Fin de fichero: js/luna.js */
