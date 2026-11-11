/*
 * MeteoArchidona · Componente «Pasos de satélites»
 *
 * Los pasos visibles sobre Archidona de la Estación Espacial
 * Internacional, de la estación china (Tiangong) y de los trenes de
 * Starlink recién lanzados: a qué hora, por dónde aparece y por dónde se
 * va, hasta qué altura sube, con qué brillo y cuándo se apaga al entrar
 * en la sombra de la Tierra. Calculado con los datos orbitales de
 * CelesTrak; se renueva cada 6 horas.
 *
 *     <div data-componente="luna-pasos"></div>
 *
 * Opciones:
 *     data-dias    cuántos días (3 por defecto, de 1 a 10).
 *     data-tipo    ISS, TIANGONG o STARLINK (separados por comas).
 *     data-todos="si"   también los pasos que no se ven (de día o a la sombra).
 */

import {
    RUMBOS,
    aviso, cadaRato, crear, crearSvg, decimal, gradosAngulo, hora, hoyMadrid,
    pedir, prepararRaiz, pie, textoError, vaciar
} from "./comun.js?v=20261111-luna4";


const CADA_MS = 30 * 60 * 1000;

const formatoDia = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", weekday: "long", day: "numeric" });
const formatoFecha = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" });


function cuando(iso) {
    const fecha = formatoFecha.format(new Date(iso));
    const hoy = hoyMadrid();
    if (fecha === hoy) return `Hoy, ${hora(iso)}`;
    const manana = formatoFecha.format(new Date(Date.parse(`${hoy}T12:00:00Z`) + 86400000));
    if (fecha === manana) return `Mañana, ${hora(iso)}`;
    return `${formatoDia.format(new Date(iso))}, ${hora(iso)}`;
}


function brillo(magnitud) {
    if (magnitud === null || magnitud === undefined) return null;
    if (magnitud <= -2.5) return `${decimal(magnitud)} · brillantísima`;
    if (magnitud <= -1) return `${decimal(magnitud)} · muy brillante`;
    if (magnitud <= 1) return `${decimal(magnitud)} · brillante`;
    if (magnitud <= 4) return `${decimal(magnitud)} · se ve bien con cielo oscuro`;
    return `${decimal(magnitud)} · difícil a simple vista`;
}


/* Recorrido en un círculo del cielo: borde = horizonte, centro = cenit;
 * norte arriba y este a la izquierda, como «El cielo ahora». */
function recorrido(paso) {
    const svg = crearSvg("svg", { viewBox: "-60 -60 120 120", class: "lun-recorrido", role: "img" });
    svg.setAttribute("aria-label", `Del ${RUMBOS[paso.direccion_inicio] || paso.direccion_inicio} al ${RUMBOS[paso.direccion_fin] || paso.direccion_fin}`);
    svg.appendChild(crearSvg("circle", { r: 50, class: "lun-recorrido-cielo" }));

    const punto = (altura, acimut) => {
        const r = 50 * (1 - Math.max(0, altura) / 90);
        const a = acimut * Math.PI / 180;
        return [-r * Math.sin(a), -r * Math.cos(a)];
    };
    const [x1, y1] = punto(10, paso.acimut_inicio);
    const [x2, y2] = punto(paso.altura_maxima, paso.acimut_maximo);
    const [x3, y3] = punto(10, paso.acimut_fin);
    // Curva que pasa por el punto más alto.
    const cx = 2 * x2 - (x1 + x3) / 2;
    const cy = 2 * y2 - (y1 + y3) / 2;
    svg.appendChild(crearSvg("path", { d: `M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${x3.toFixed(1)} ${y3.toFixed(1)}`, class: "lun-recorrido-linea" }));
    svg.appendChild(crearSvg("circle", { cx: x1.toFixed(1), cy: y1.toFixed(1), r: 3, class: "lun-recorrido-inicio" }));

    for (const [texto, x, y] of [["N", 0, -54], ["E", -54, 3], ["S", 0, 58], ["O", 54, 3]]) {
        const etiqueta = crearSvg("text", { x, y, class: "lun-cielo-rumbo", "text-anchor": "middle" });
        etiqueta.textContent = texto;
        svg.appendChild(etiqueta);
    }
    return svg;
}


function tarjeta(paso) {
    const caja = crear("article", `lun-paso lun-paso-${paso.tipo.toLowerCase()}${paso.visible ? "" : " lun-tenue"}`);
    caja.appendChild(recorrido(paso));

    const texto = crear("div", "lun-paso-texto");
    const cabeza = crear("div", "lun-paso-cabeza");
    cabeza.appendChild(crear("strong", null, paso.tipo === "STARLINK" ? "Tren de Starlink" : paso.nombre_tipo));
    cabeza.appendChild(crear("span", "lun-paso-hora lun-cifra", cuando(paso.inicio_visible || paso.inicio)));
    texto.appendChild(cabeza);

    const lineas = [
        `Aparece por el ${RUMBOS[paso.direccion_inicio] || paso.direccion_inicio} y se va por el ${RUMBOS[paso.direccion_fin] || paso.direccion_fin}.`,
        `Sube hasta ${gradosAngulo(paso.altura_maxima)} a las ${hora(paso.maximo)}${paso.favorable ? "" : " (paso bajo, poco favorable)"}.`
    ];
    const b = brillo(paso.magnitud);
    if (b) lineas.push(`Brillo ${b}.`);
    if (paso.entrada_sombra) lineas.push(`Se apaga a las ${hora(paso.entrada_sombra)}, al entrar en la sombra de la Tierra.`);
    if (paso.satelites) lineas.push(`Unos ${paso.satelites} satélites en fila, del lanzamiento ${paso.lanzamiento}.`);
    if (!paso.visible) lineas.push("No se ve: es de día o va a la sombra.");
    for (const linea of lineas) texto.appendChild(crear("p", null, linea));

    if (paso.directo) {
        const enlace = crear("a", "lun-enlace", "Ver en directo lo que ve la Estación");
        enlace.href = paso.directo;
        enlace.target = "_blank";
        enlace.rel = "noopener noreferrer";
        texto.appendChild(enlace);
    }

    caja.appendChild(texto);
    return caja;
}


function pintar(raiz, datos) {
    vaciar(raiz);
    if (!datos.pasos.length) {
        raiz.appendChild(crear("p", "lun-aviso", "En estos días no hay pasos visibles desde Archidona."));
    } else {
        const lista = crear("div", "lun-pasos");
        datos.pasos.forEach(p => lista.appendChild(tarjeta(p)));
        raiz.appendChild(lista);
    }
    const actualizado = datos.actualizado ? ` Calculado a las ${hora(datos.actualizado)}.` : "";
    pie(raiz, `Datos orbitales de CelesTrak; cálculo de MeteoArchidona para El Silo (pasos por encima de 10°). El brillo es aproximado.${actualizado}`);
}


export function montarPasos(raiz) {
    prepararRaiz(raiz, "luna-pasos");
    const dias = Math.min(10, Math.max(1, parseInt(raiz.dataset.dias || "3", 10) || 3));
    const tipos = (raiz.dataset.tipo || "").split(",").map(t => t.trim().toUpperCase()).filter(Boolean);
    const parametros = new URLSearchParams({ dias: String(dias), visibles: raiz.dataset.todos === "si" ? "false" : "true" });
    tipos.forEach(t => parametros.append("tipo", t));
    aviso(raiz, "Cargando…");

    cadaRato(raiz, async () => {
        try {
            pintar(raiz, await pedir(`/luna/satelites/pasos?${parametros}`, CADA_MS - 1000));
        } catch (error) {
            aviso(raiz, textoError(error), true);
        }
    }, CADA_MS);
}


/* Fin de fichero: js/luna/pasos.js */
