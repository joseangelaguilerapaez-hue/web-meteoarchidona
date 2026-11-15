/*
 * MeteoArchidona · Componente «Riesgo de incendio hoy»
 *
 * Recuadro pequeño para la portada y los dashboards: nivel de peligro de
 * hoy en Archidona según AEMET (el que manda) y EFFIS al lado, el más
 * alto de la comarca y la época de peligro de Andalucía.
 *
 *     <div data-componente="incendios-resumen"></div>
 *
 * API: GET /incendios/resumen
 */

import {
    pedir, crear, aviso, prepararRaiz, casilla, tintaSobre, textoError, PAGINA, CITA_AEMET
} from "./comun.js?v=20261115-incendios1";


export async function montarResumenIncendios(raiz) {
    prepararRaiz(raiz, "inc-resumen");

    let datos;
    try {
        datos = await pedir("/incendios/resumen");
    } catch (error) {
        aviso(raiz, textoError(error), true);
        return;
    }

    const enlace = crear("a", "inc-resumen-enlace");
    enlace.href = PAGINA;

    const cabeza = crear("div", "inc-resumen-cabeza");
    cabeza.appendChild(crear("span", "inc-etiqueta", "Riesgo de incendio hoy"));
    cabeza.appendChild(crear("span", "inc-resumen-lugar", "Archidona"));
    enlace.appendChild(cabeza);

    const principal = datos.archidona_aemet;
    const nivel = crear("div", "inc-resumen-nivel");
    if (principal && principal.nivel) {
        nivel.style.background = principal.color;
        nivel.style.color = tintaSobre(principal.color);
        nivel.textContent = principal.nombre;
    } else {
        nivel.classList.add("sin-dato");
        nivel.textContent = "Sin dato todavía";
    }
    enlace.appendChild(nivel);

    const detalles = crear("div", "inc-resumen-detalles");

    const effis = crear("span", "inc-resumen-dato");
    effis.appendChild(document.createTextNode("EFFIS "));
    effis.appendChild(casilla(datos.archidona_effis, { corto: false, clase: "inc-casilla pequena" }));
    detalles.appendChild(effis);

    if (datos.maximo_comarca && datos.pueblo_maximo && datos.maximo_comarca.nivel > (principal?.nivel || 0)) {
        const maximo = crear("span", "inc-resumen-dato");
        maximo.appendChild(document.createTextNode(`Comarca: ${datos.pueblo_maximo} `));
        maximo.appendChild(casilla(datos.maximo_comarca, { corto: false, clase: "inc-casilla pequena" }));
        detalles.appendChild(maximo);
    }

    const epoca = crear("span", "inc-resumen-epoca", datos.epoca.nombre);
    epoca.style.borderColor = datos.epoca.color;
    detalles.appendChild(epoca);
    enlace.appendChild(detalles);

    raiz.appendChild(enlace);
    raiz.appendChild(crear("p", "inc-pie", CITA_AEMET));
}


/* Fin de fichero: js/incendios/resumen.js */
