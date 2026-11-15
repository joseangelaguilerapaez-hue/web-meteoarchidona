/*
 * MeteoArchidona · Componente «Riesgo de incendio de un pueblo»
 *
 * Ficha de un pueblo de la comarca: el nivel de hoy en grande, con lo que
 * significa, y los próximos días según AEMET (8 días) y EFFIS (3 días).
 *
 *     <div data-componente="incendios-pueblo"></div>                       (Archidona, con selector)
 *     <div data-componente="incendios-pueblo" data-punto="ANTEQUERA" data-selector="no"></div>
 *
 * API: GET /incendios/riesgo
 */

import {
    pedirRiesgo, crear, aviso, prepararRaiz, titulo, pie, casilla, tintaSobre, selectorPunto, leerPunto,
    diaCorto, diaLargo, textoError
} from "./comun.js?v=20261115-incendios1";


export async function montarPuebloIncendios(raiz) {
    prepararRaiz(raiz, "inc-pueblo");

    let datos;
    try {
        datos = await pedirRiesgo();
    } catch (error) {
        aviso(raiz, textoError(error), true);
        return;
    }

    const codigo = leerPunto(raiz);
    const pueblo = datos.pueblos.find(p => p.codigo === codigo) || datos.pueblos[0];
    if (!pueblo) {
        aviso(raiz, "Todavía no hay datos de riesgo.");
        return;
    }

    titulo(raiz, "Peligro de incendio", pueblo.nombre);
    await selectorPunto(raiz, montarPuebloIncendios);

    const hoy = pueblo.aemet.find(n => n.fecha === datos.hoy) || pueblo.aemet[0];
    const significado = new Map(datos.niveles.map(n => [n.nivel, n.significado]));

    const portada = crear("div", "inc-pueblo-hoy");
    const grande = crear("div", "inc-pueblo-nivel");
    if (hoy && hoy.nivel) {
        grande.style.background = hoy.color;
        grande.style.color = tintaSobre(hoy.color);
        grande.appendChild(crear("span", "inc-pueblo-cuando", hoy.fecha === datos.hoy ? "Hoy" : diaLargo(hoy.fecha)));
        grande.appendChild(crear("strong", null, hoy.nombre));
    } else {
        grande.classList.add("sin-dato");
        grande.textContent = "Sin dato";
    }
    portada.appendChild(grande);
    if (hoy && hoy.nivel) {
        portada.appendChild(crear("p", "inc-pueblo-significado", significado.get(hoy.nivel)));
    }
    raiz.appendChild(portada);

    const effis = new Map(pueblo.effis.map(n => [n.fecha, n]));
    const lista = crear("ol", "inc-pueblo-dias");
    for (const dia of pueblo.aemet) {
        const elemento = crear("li", dia.fecha === datos.hoy ? "hoy" : null);
        const cuando = crear("span", "inc-pueblo-dia", dia.fecha === datos.hoy ? "Hoy" : diaCorto(dia.fecha));
        cuando.title = diaLargo(dia.fecha);
        elemento.appendChild(cuando);
        elemento.appendChild(casilla(dia, { corto: false }));
        if (effis.has(dia.fecha)) {
            const otra = casilla(effis.get(dia.fecha), { clase: "inc-casilla secundaria" });
            otra.title = `EFFIS: ${otra.title}`;
            elemento.appendChild(otra);
        }
        lista.appendChild(elemento);
    }
    raiz.appendChild(lista);
    pie(raiz, { effis: pueblo.effis.length > 0 });
}


/* Fin de fichero: js/incendios/pueblo.js */
