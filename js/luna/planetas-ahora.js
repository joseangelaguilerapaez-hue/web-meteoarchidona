/*
 * MeteoArchidona · Componente «El cielo ahora»
 *
 * Dónde están ahora mismo el Sol, la Luna y los planetas vistos desde El
 * Silo: un círculo del cielo (el borde es el horizonte, el centro el
 * cenit; norte arriba y este a la izquierda, como al mirar hacia arriba
 * tumbado con la cabeza al norte) con los que están por encima del
 * horizonte, y una tabla con la altura y el acimut de todos.
 *
 *     <div data-componente="luna-planetas-ahora"></div>
 *
 * Se renueva cada minuto.
 */

import {
    FUENTE_CALCULO,
    aviso, cadaRato, crear, crearSvg, decimal, gradosAngulo, hora, pedir, prepararRaiz, pie, textoError, vaciar
} from "./comun.js?v=20261111-luna1";


const CADA_MS = 60 * 1000;
const RADIO = 100;


function posicion(altura, acimut) {
    const r = RADIO * (1 - Math.max(0, altura) / 90);
    const a = acimut * Math.PI / 180;
    // Norte arriba, este a la izquierda (mirando al cielo).
    return { x: -r * Math.sin(a), y: -r * Math.cos(a) };
}


function cielo(datos) {
    const svg = crearSvg("svg", {
        viewBox: "-118 -118 236 236",
        class: "lun-cielo",
        role: "img",
        "aria-label": "Posición del Sol, la Luna y los planetas en el cielo de Archidona"
    });

    svg.appendChild(crearSvg("circle", { r: RADIO, class: `lun-cielo-fondo luz-${datos.luz}` }));
    for (const altura of [30, 60]) {
        svg.appendChild(crearSvg("circle", { r: RADIO * (1 - altura / 90), class: "lun-cielo-anillo" }));
    }

    for (const [texto, acimut] of [["N", 0], ["E", 90], ["S", 180], ["O", 270]]) {
        const p = posicion(-8, acimut);
        const etiqueta = crearSvg("text", { x: p.x * 1.1, y: p.y * 1.1 + 4, class: "lun-cielo-rumbo", "text-anchor": "middle" });
        etiqueta.textContent = texto;
        svg.appendChild(etiqueta);
    }

    const arriba = datos.cuerpos.filter(c => c.sobre_horizonte);
    for (const cuerpo of arriba) {
        const p = posicion(cuerpo.altura, cuerpo.acimut);
        const grupo = crearSvg("g", { class: `lun-astro lun-astro-${cuerpo.cuerpo.toLowerCase()}` });
        const radio = cuerpo.cuerpo === "SOL" || cuerpo.cuerpo === "LUNA" ? 7 : 4;
        grupo.appendChild(crearSvg("circle", { cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: radio }));
        const nombre = crearSvg("text", { x: (p.x + radio + 3).toFixed(1), y: (p.y + 3).toFixed(1), class: "lun-astro-nombre" });
        nombre.textContent = cuerpo.nombre;
        grupo.appendChild(nombre);
        const titulo = crearSvg("title");
        titulo.textContent = `${cuerpo.nombre}: ${gradosAngulo(cuerpo.altura)} de altura, acimut ${gradosAngulo(cuerpo.acimut)}`;
        grupo.appendChild(titulo);
        svg.appendChild(grupo);
    }

    return svg;
}


function tabla(datos) {
    const tabla = crear("table", "lun-tabla");
    const cabeza = crear("tr");
    for (const texto of ["", "Altura", "Acimut", "Brillo", "Constelación"]) {
        cabeza.appendChild(crear("th", null, texto));
    }
    tabla.appendChild(crear("thead")).appendChild(cabeza);
    const cuerpo = tabla.appendChild(crear("tbody"));

    for (const c of datos.cuerpos) {
        const fila = crear("tr", c.sobre_horizonte ? null : "lun-tenue");
        fila.appendChild(crear("th", null, c.nombre));
        fila.appendChild(crear("td", "lun-cifra", c.sobre_horizonte ? gradosAngulo(c.altura) : "bajo el horizonte"));
        fila.appendChild(crear("td", "lun-cifra", `${gradosAngulo(c.acimut)} ${c.direccion}`));
        fila.appendChild(crear("td", "lun-cifra", c.magnitud === null ? "—" : decimal(c.magnitud)));
        fila.appendChild(crear("td", null, c.constelacion_nombre || "—"));
        cuerpo.appendChild(fila);
    }

    const envoltorio = crear("div", "lun-tabla-envoltorio");
    envoltorio.appendChild(tabla);
    return envoltorio;
}


function pintar(raiz, datos) {
    vaciar(raiz);
    raiz.appendChild(crear(
        "p", "lun-nota",
        `${hora(datos.momento)} · ${datos.nombre_luz} (Sol a ${decimal(datos.altura_sol)}°).`
    ));

    const cuerpo = crear("div", "lun-cielo-ahora");
    cuerpo.appendChild(cielo(datos));
    cuerpo.appendChild(tabla(datos));
    raiz.appendChild(cuerpo);

    pie(raiz, `Altura sobre el horizonte y acimut desde el norte hacia el este, con la refracción de la atmósfera. ${FUENTE_CALCULO}.`);
}


export function montarPlanetasAhora(raiz) {
    prepararRaiz(raiz, "luna-planetas-ahora");
    aviso(raiz, "Cargando…");

    cadaRato(raiz, async () => {
        try {
            pintar(raiz, await pedir("/luna/ahora", CADA_MS - 2000));
        } catch (error) {
            aviso(raiz, textoError(error), true);
        }
    }, CADA_MS);
}


/* Fin de fichero: js/luna/planetas-ahora.js */
