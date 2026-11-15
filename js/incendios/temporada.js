/*
 * MeteoArchidona · Componente «Temporada de incendios»
 *
 * Cómo evoluciona el riesgo a lo largo del verano en un pueblo: cada día
 * del 1 de junio al 15 de octubre (la época de peligro alto) es una raya
 * con el color de su nivel, una fila para AEMET y otra para EFFIS. Debajo,
 * los veranos desde 2018 con EFFIS, uno por fila, para compararlos (José,
 * 15-11-2026: relleno de los veranos de 2018 en adelante).
 *
 *     <div data-componente="incendios-temporada"></div>                         (Archidona, último verano)
 *     <div data-componente="incendios-temporada" data-punto="ANTEQUERA" data-anio="2025"></div>
 *     <div data-componente="incendios-temporada" data-selector="no"></div>       (sin selectores)
 *
 * API: GET /incendios/temporada?anio=&punto=
 */

import {
    pedir, crear, aviso, prepararRaiz, titulo, pie, selectorPunto, leerPunto, svg, leyenda, fechaLarga,
    textoError, MESES
} from "./comun.js?v=20261115-incendios1";


/* El ancho del dibujo es el del hueco, para que los textos se lean igual en el móvil. */
const ANCHO_MINIMO = 300;
const ANCHO_MAXIMO = 960;
const IZQUIERDA = 56;
const DERECHA = 8;
const ALTO_FILA = 22;
const SEPARACION = 6;


function colorDe(niveles, valor) {
    const nivel = niveles.find(n => n.nivel === valor);
    return nivel ? nivel.color : null;
}


/* Una o varias filas de rayas: [{etiqueta, valores: [nivel|null…]}] con los días de la temporada. */
function rayas(filas, dias, niveles, descripcion, ANCHO) {
    const alto = filas.length * (ALTO_FILA + SEPARACION) + 22;
    const lienzo = svg("svg", { viewBox: `0 0 ${ANCHO} ${alto}`, role: "img", "aria-label": descripcion }, "inc-grafica");
    const paso = (ANCHO - IZQUIERDA - DERECHA) / dias.length;

    filas.forEach((fila, f) => {
        const y = f * (ALTO_FILA + SEPARACION);
        const texto = svg("text", { x: IZQUIERDA - 8, y: y + ALTO_FILA / 2 + 4, "text-anchor": "end" }, "texto-eje");
        texto.textContent = fila.etiqueta;
        lienzo.appendChild(texto);
        lienzo.appendChild(svg("rect", { x: IZQUIERDA, y, width: ANCHO - IZQUIERDA - DERECHA, height: ALTO_FILA }, "fondo-fila"));
        fila.valores.forEach((valor, i) => {
            const color = colorDe(niveles, valor);
            if (!color) return;
            const raya = svg("rect", { x: IZQUIERDA + i * paso, y, width: Math.max(paso, 1) + 0.4, height: ALTO_FILA, fill: color });
            const nombre = niveles.find(n => n.nivel === valor)?.nombre;
            const titulo = svg("title");
            titulo.textContent = `${fechaLarga(dias[i])}: ${nombre}`;
            raya.appendChild(titulo);
            lienzo.appendChild(raya);
        });
    });

    const abajo = filas.length * (ALTO_FILA + SEPARACION) + 14;
    dias.forEach((dia, i) => {
        const [, mes, diaMes] = dia.split("-").map(Number);
        if (diaMes !== 1) return;
        const x = IZQUIERDA + i * paso;
        lienzo.appendChild(svg("line", { x1: x, x2: x, y1: 0, y2: abajo - 10 }, "marca-mes"));
        const etiqueta = svg("text", { x: x + 3, y: abajo }, "texto-eje");
        etiqueta.textContent = MESES[mes - 1];
        lienzo.appendChild(etiqueta);
    });
    return lienzo;
}


function diasAltos(resumen) {
    return Object.entries(resumen || {}).filter(([nivel]) => Number(nivel) >= 4).reduce((s, [, n]) => s + n, 0);
}


export async function montarTemporadaIncendios(raiz) {
    prepararRaiz(raiz, "inc-temporada");

    const punto = leerPunto(raiz);
    const anioPedido = raiz.dataset.anio ? `&anio=${encodeURIComponent(raiz.dataset.anio)}` : "";

    let datos;
    try {
        datos = await pedir(`/incendios/temporada?punto=${encodeURIComponent(punto)}${anioPedido}`);
    } catch (error) {
        titulo(raiz, "Temporada de incendios", "Cómo evoluciona el riesgo en verano");
        aviso(raiz, textoError(error), true);
        return;
    }

    titulo(raiz, "Temporada de incendios", `${datos.nombre} · verano de ${datos.anio}`);

    if (raiz.dataset.selector !== "no") {
        const controles = crear("div", "inc-controles");
        const etiqueta = crear("label", "inc-selector", "Verano");
        const selector = crear("select");
        for (const anio of [...datos.anios].reverse()) {
            selector.appendChild(new Option(String(anio), String(anio)));
        }
        selector.value = String(datos.anio);
        selector.addEventListener("change", () => {
            raiz.dataset.anio = selector.value;
            montarTemporadaIncendios(raiz);
        });
        etiqueta.appendChild(selector);
        controles.appendChild(etiqueta);
        raiz.appendChild(controles);
        await selectorPunto(raiz, montarTemporadaIncendios, controles);
    }

    const ancho = Math.max(ANCHO_MINIMO, Math.min(ANCHO_MAXIMO, Math.round(raiz.getBoundingClientRect().width) || 720));
    const fechas = datos.dias.map(d => d.fecha);
    const hayAemet = datos.dias.some(d => d.aemet !== null);
    const filas = [];
    if (hayAemet) filas.push({ etiqueta: "AEMET", valores: datos.dias.map(d => d.aemet) });
    filas.push({ etiqueta: "EFFIS", valores: datos.dias.map(d => d.effis) });
    raiz.appendChild(rayas(filas, fechas, datos.niveles, `Nivel de peligro de cada día del verano de ${datos.anio} en ${datos.nombre}`, ancho));

    const cifras = crear("p", "inc-nota");
    const partes = [];
    if (hayAemet) partes.push(`AEMET, ${diasAltos(datos.resumen_aemet)} días en alto o más`);
    partes.push(`EFFIS, ${diasAltos(datos.resumen_effis)} días en alto o más`);
    cifras.textContent = `Del 1 de junio al 15 de octubre: ${partes.join("; ")}.`;
    raiz.appendChild(cifras);
    if (!hayAemet) {
        raiz.appendChild(crear("p", "inc-nota",
            "De los veranos anteriores a que MeteoArchidona guardara los datos de AEMET solo hay la clase de EFFIS."));
    }

    // Todos los veranos con EFFIS, para comparar.
    if (datos.anios.length > 1 && raiz.dataset.veranos !== "no") {
        raiz.appendChild(crear("h4", "inc-subtitulo", `Veranos desde ${datos.anios[0]} (EFFIS)`));
        const hueco = crear("div", "inc-veranos");
        raiz.appendChild(hueco);
        try {
            const veranos = await Promise.all(datos.anios.map(anio =>
                pedir(`/incendios/temporada?punto=${encodeURIComponent(datos.punto)}&anio=${anio}`)));
            const largo = Math.max(...veranos.map(v => v.dias.length));
            const referencia = veranos.find(v => v.dias.length === largo).dias.map(d => d.fecha);
            hueco.appendChild(rayas(
                veranos.map(v => ({ etiqueta: String(v.anio), valores: v.dias.map(d => d.effis) })),
                referencia,
                datos.niveles,
                `Nivel de EFFIS de cada día de los veranos desde ${datos.anios[0]} en ${datos.nombre}`,
                ancho
            ));
        } catch {
            aviso(hueco, "No se han podido leer los veranos anteriores.");
        }
    }

    raiz.appendChild(leyenda(datos.niveles));
    pie(raiz);
}


/* Fin de fichero: js/incendios/temporada.js */
