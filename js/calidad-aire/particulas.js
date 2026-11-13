/*
 * MeteoArchidona · Componente «Partículas y polvo»
 *
 * Gráfica hora a hora de los próximos días con las partículas PM10 y
 * PM2,5 y el polvo en suspensión (la calima) que prevé el modelo CAMS.
 * Las franjas de fondo marcan los niveles de calima del polvo (leve
 * desde 20 µg/m³, moderada desde 50, fuerte desde 100) y la línea de
 * puntos, 50 µg/m³, el valor límite diario de PM10.
 *
 *     <div data-componente="aire-particulas"></div>
 *     <div data-componente="aire-particulas" data-horas="48" data-titulo="no"></div>
 *
 * Más adelante (fase 3 de docs/calidad-aire.md) llevará también lo
 * medido por la Junta en Campillos o Campanillas.
 *
 * API: GET /aire/prevision/horas?localidad&horas (la misma petición que
 * el componente por horas, que se comparte).
 */

import {
    pedir, crear, crearSvg, prepararRaiz, aviso, avisoError, titulo, pie, leerLocalidad,
    microgramos, hora, diaDeHora, claveDia, horaActualizacion, FUENTE_MODELO
} from "./comun.js?v=20261111-aire1";


const SERIES = [
    { codigo: "PM10", nombre: "PM10", clase: "air-serie-pm10" },
    { codigo: "PM25", nombre: "PM2,5", clase: "air-serie-pm25" },
    { codigo: "POLVO", nombre: "Polvo (calima)", clase: "air-serie-polvo" }
];

const FRANJAS = [
    [20, 50, "air-franja-leve"],
    [50, 100, "air-franja-moderada"],
    [100, 200, "air-franja-fuerte"],
    [200, 100000, "air-franja-muy-fuerte"]
];

const LIMITE_PM10 = 50;

const ANCHO = 720;
const ALTO = 260;
const MARGEN = { arriba: 14, derecha: 14, abajo: 34, izquierda: 44 };


function escalaMaxima(maximo) {
    const pasos = [30, 60, 100, 150, 200, 300, 500, 800, 1200, 2000];
    return pasos.find(paso => paso >= maximo * 1.1) || Math.ceil(maximo / 500) * 500;
}


export async function montarAireParticulas(raiz) {
    prepararRaiz(raiz, "aire-particulas");
    aviso(raiz, "Dibujando las partículas…");

    const horas = Math.min(Math.max(Number(raiz.dataset.horas) || 96, 12), 120);

    let datos;

    try {
        datos = await pedir(`/aire/prevision/horas?localidad=${leerLocalidad(raiz)}&modelo=CAMS_EUROPA&horas=${horas}`);
    } catch (error) {
        avisoError(raiz, error, "la previsión de partículas");
        return;
    }

    raiz.textContent = "";
    titulo(raiz, "Partículas y polvo", datos.nombre_localidad);

    const pasos = datos.horas;

    if (pasos.length < 2) {
        raiz.appendChild(crear("p", "air-aviso", "Todavía no hay previsión de partículas guardada."));
        pie(raiz, FUENTE_MODELO);
        return;
    }

    const valores = SERIES.map(serie => pasos.map(paso => {
        const valor = paso.contaminantes.find(item => item.codigo === serie.codigo);
        return valor ? valor.valor : null;
    }));

    const maximo = Math.max(LIMITE_PM10, ...valores.flat().filter(valor => valor !== null));
    const tope = escalaMaxima(maximo);

    const ancho = ANCHO - MARGEN.izquierda - MARGEN.derecha;
    const alto = ALTO - MARGEN.arriba - MARGEN.abajo;
    const x = indice => MARGEN.izquierda + (indice / (pasos.length - 1)) * ancho;
    const y = valor => MARGEN.arriba + alto - (Math.min(valor, tope) / tope) * alto;

    const svg = crearSvg("svg", {
        viewBox: `0 0 ${ANCHO} ${ALTO}`,
        class: "air-grafica",
        role: "img",
        "aria-label": `Partículas y polvo previstos en las próximas ${pasos.length} horas; máximo ${microgramos(maximo)}`
    });

    // Franjas de calima.
    for (const [desde, hasta, clase] of FRANJAS) {
        if (desde >= tope) continue;
        svg.appendChild(crearSvg("rect", {
            x: MARGEN.izquierda,
            y: y(Math.min(hasta, tope)),
            width: ancho,
            height: y(desde) - y(Math.min(hasta, tope)),
            class: `air-franja ${clase}`
        }));
    }

    // Rejilla horizontal.
    const marcas = 5;
    for (let paso = 0; paso <= marcas; paso += 1) {
        const valor = (tope / marcas) * paso;
        svg.appendChild(crearSvg("line", {
            x1: MARGEN.izquierda, x2: MARGEN.izquierda + ancho, y1: y(valor), y2: y(valor), class: "air-rejilla"
        }));
        const texto = crearSvg("text", { x: MARGEN.izquierda - 6, y: y(valor) + 4, class: "air-eje", "text-anchor": "end" });
        texto.textContent = Math.round(valor);
        svg.appendChild(texto);
    }

    // Límite diario de PM10.
    svg.appendChild(crearSvg("line", {
        x1: MARGEN.izquierda, x2: MARGEN.izquierda + ancho, y1: y(LIMITE_PM10), y2: y(LIMITE_PM10), class: "air-limite"
    }));

    // Separadores de día y etiquetas.
    let anterior = null;
    pasos.forEach((paso, indice) => {
        const clave = claveDia(paso.hora);
        if (clave === anterior) return;
        anterior = clave;
        if (indice > 0) {
            svg.appendChild(crearSvg("line", {
                x1: x(indice), x2: x(indice), y1: MARGEN.arriba, y2: MARGEN.arriba + alto, class: "air-separador"
            }));
        }
        const texto = crearSvg("text", { x: x(indice) + 4, y: ALTO - 12, class: "air-eje" });
        texto.textContent = diaDeHora(paso.hora);
        svg.appendChild(texto);
    });

    // Líneas.
    SERIES.forEach((serie, posicion) => {
        let trazo = "";
        let abierto = false;
        valores[posicion].forEach((valor, indice) => {
            if (valor === null) {
                abierto = false;
                return;
            }
            trazo += `${abierto ? "L" : "M"}${x(indice).toFixed(1)},${y(valor).toFixed(1)} `;
            abierto = true;
        });
        if (trazo) svg.appendChild(crearSvg("path", { d: trazo.trim(), class: `air-linea ${serie.clase}` }));
    });

    // Lectura al pasar el dedo o el ratón.
    const guia = crearSvg("line", { y1: MARGEN.arriba, y2: MARGEN.arriba + alto, class: "air-guia", visibility: "hidden" });
    svg.appendChild(guia);

    const lectura = crear("p", "air-lectura", "Pasa el dedo o el ratón por la gráfica para ver cada hora.");

    function leer(evento) {
        const caja = svg.getBoundingClientRect();
        const puntoX = ((evento.clientX - caja.left) / caja.width) * ANCHO;
        const indice = Math.round(((puntoX - MARGEN.izquierda) / ancho) * (pasos.length - 1));
        if (indice < 0 || indice >= pasos.length) return;
        guia.setAttribute("x1", x(indice));
        guia.setAttribute("x2", x(indice));
        guia.setAttribute("visibility", "visible");
        const partes = SERIES.map((serie, posicion) => `${serie.nombre} ${microgramos(valores[posicion][indice])}`);
        lectura.textContent = `${diaDeHora(pasos[indice].hora)} ${hora(pasos[indice].hora)} · ${partes.join(" · ")}`;
    }

    svg.addEventListener("pointermove", leer);
    svg.addEventListener("pointerdown", leer);

    const marco = crear("div", "air-grafica-marco");
    marco.appendChild(svg);
    raiz.appendChild(marco);
    raiz.appendChild(lectura);

    const leyenda = crear("div", "air-leyenda");
    for (const serie of SERIES) {
        const elemento = crear("span", "air-leyenda-elemento");
        elemento.appendChild(crear("span", `air-trazo ${serie.clase}`));
        elemento.appendChild(document.createTextNode(serie.nombre));
        leyenda.appendChild(elemento);
    }
    const limite = crear("span", "air-leyenda-elemento");
    limite.appendChild(crear("span", "air-trazo air-trazo-limite"));
    limite.appendChild(document.createTextNode("50 µg/m³: límite diario de PM10"));
    leyenda.appendChild(limite);
    raiz.appendChild(leyenda);

    const actualizada = horaActualizacion(datos.actualizada);
    pie(raiz, `µg/m³ cada hora · franjas: calima leve, moderada y fuerte · ${FUENTE_MODELO}${actualizada ? ` · ${actualizada}` : ""}`);
}


/* Fin de fichero: js/calidad-aire/particulas.js */
