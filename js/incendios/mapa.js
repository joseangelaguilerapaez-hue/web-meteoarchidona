/*
 * MeteoArchidona · Componente «Mapa de riesgo de incendio de España»
 *
 * Mapa de España del nivel de peligro de hoy y de los próximos días,
 * pintado por MeteoArchidona con los datos de AEMET (8 días) o de EFFIS
 * (3 días). Botones para cambiar de fuente y de día.
 *
 *     <div data-componente="incendios-mapa"></div>                    (AEMET, con botón de EFFIS)
 *     <div data-componente="incendios-mapa" data-fuente="effis"></div>
 *
 * API: GET /incendios/mapas y la imagen /incendios/mapas/{id} (WebP).
 */

import {
    pedir, base, crear, aviso, prepararRaiz, titulo, pie, diaCorto, diaLargo, textoError
} from "./comun.js?v=20261115-incendios1";


const NOMBRES = { aemet: "AEMET", effis: "EFFIS" };


export async function montarMapaIncendios(raiz) {
    prepararRaiz(raiz, "inc-mapa");
    titulo(raiz, "Peligro de incendio · España", "Mapa de hoy y de los próximos días");

    let datos;
    try {
        datos = await pedir("/incendios/mapas");
    } catch (error) {
        aviso(raiz, textoError(error), true);
        return;
    }

    let fuente = (raiz.dataset.fuente || "aemet").toLowerCase();
    if (!datos[fuente] || !datos[fuente].length) {
        fuente = datos.aemet.length ? "aemet" : "effis";
    }
    if (!datos[fuente].length) {
        aviso(raiz, "Todavía no hay mapas. Se pintan cada mañana.");
        return;
    }

    const controles = crear("div", "inc-controles");
    const fuentes = crear("div", "inc-botones");
    const dias = crear("div", "inc-botones inc-botones-dias");
    controles.appendChild(fuentes);
    controles.appendChild(dias);
    raiz.appendChild(controles);

    const figura = crear("figure", "inc-mapa-figura");
    const imagen = crear("img");
    imagen.loading = "lazy";
    imagen.decoding = "async";
    const leyendaMapa = crear("figcaption", "inc-mapa-pie");
    figura.appendChild(imagen);
    figura.appendChild(leyendaMapa);
    raiz.appendChild(figura);

    const cita = crear("p", "inc-pie");
    raiz.appendChild(cita);

    let indice = 0;

    function pintar() {
        const lista = datos[fuente];
        indice = Math.min(indice, lista.length - 1);
        const mapa = lista[indice];
        imagen.src = `${base()}${mapa.url}`;
        imagen.alt = `Mapa de peligro de incendio de España (${NOMBRES[fuente]}) del ${diaLargo(mapa.fecha)}`;
        leyendaMapa.textContent = `${NOMBRES[fuente]} · ${diaLargo(mapa.fecha)}`;
        cita.textContent = fuente === "aemet" ? datos.cita_aemet : datos.cita_effis;

        for (const boton of fuentes.children) {
            boton.setAttribute("aria-pressed", String(boton.dataset.fuente === fuente));
        }
        dias.replaceChildren(...lista.map((m, i) => {
            const boton = crear("button", "inc-boton", diaCorto(m.fecha));
            boton.type = "button";
            boton.title = diaLargo(m.fecha);
            boton.setAttribute("aria-pressed", String(i === indice));
            boton.addEventListener("click", () => { indice = i; pintar(); });
            return boton;
        }));
    }

    for (const clave of ["aemet", "effis"]) {
        if (!datos[clave].length) continue;
        const boton = crear("button", "inc-boton", NOMBRES[clave]);
        boton.type = "button";
        boton.dataset.fuente = clave;
        boton.addEventListener("click", () => { fuente = clave; pintar(); });
        fuentes.appendChild(boton);
    }

    pintar();
}


/* Fin de fichero: js/incendios/mapa.js */
