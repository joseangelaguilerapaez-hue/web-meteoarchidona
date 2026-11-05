/*
 * MeteoArchidona · Componente «Ficha de un embalse»
 *
 * Todo de un embalse: dónde está, su uso y capacidad, el vaso con su
 * porcentaje, la comparación con hace un año y las medias, la gráfica
 * del año hidrológico y su histórico semanal desde 1988.
 *
 *     <div data-componente="embalses-ficha" data-embalse="GUADALQUIVIR-IZNAJAR"></div>
 *     <div data-componente="embalses-ficha" data-embalse="MEDITERRANEA_ANDALUZA-VINUELA_LA"
 *          data-historico="no"></div>
 *
 *     import {montarFichaEmbalse} from "/js/embalses/ficha.js?v=…";
 *     montarFichaEmbalse(hueco);
 *
 * data-embalse: código del embalse (el que da la lista). Sin él, el de
 * Iznájar. data-historico="no" quita el histórico (para casillas
 * pequeñas).
 *
 * API: GET /embalses/ficha/{codigo}, /embalses/anio-hidrologico y
 * /embalses/serie con ámbito EMBALSE.
 */

import {
    consulta, pedir,
    crear, aviso, prepararRaiz, estado, vaso, pieBoletin,
    porcentaje, hm3, variacion, puntos, claseTendencia
} from "./comun.js?v=20261105-embalses1";
import {grafica, leyenda} from "./anio-hidrologico.js?v=20261105-embalses1";


const NS = "http://www.w3.org/2000/svg";

export const EMBALSE_DEFECTO = "GUADALQUIVIR-IZNAJAR";

const USOS = {
    CONSUNTIVO: "Abastecimiento y riego",
    HIDROELECTRICO: "Hidroeléctrico"
};


function svg(etiqueta, atributos = {}, clase) {
    const nodo = document.createElementNS(NS, etiqueta);
    for (const [clave, valor] of Object.entries(atributos)) nodo.setAttribute(clave, valor);
    if (clase) nodo.setAttribute("class", clase);
    return nodo;
}

/* Histórico semanal como área, con un año marcado cada cinco. */
function dibujarHistorico(puntosSerie, ancho) {
    const alto = 120;
    const margen = { arriba: 8, derecha: 8, abajo: 20, izquierda: 34 };
    const anchoUtil = ancho - margen.izquierda - margen.derecha;
    const altoUtil = alto - margen.arriba - margen.abajo;

    const tiempos = puntosSerie.map(p => Date.parse(`${p.fecha}T00:00:00Z`));
    const inicio = tiempos[0];
    const fin = tiempos[tiempos.length - 1];
    const x = t => margen.izquierda + ((t - inicio) / Math.max(1, fin - inicio)) * anchoUtil;
    const y = v => margen.arriba + (1 - Math.max(0, Math.min(100, v ?? 0)) / 100) * altoUtil;

    const lienzo = svg("svg", { viewBox: `0 0 ${ancho} ${alto}`, role: "img", "aria-label": "Histórico del embalse desde 1988" });

    for (const valor of [0, 50, 100]) {
        lienzo.appendChild(svg("line", { x1: margen.izquierda, x2: ancho - margen.derecha, y1: y(valor), y2: y(valor) }, "rejilla"));
        const texto = svg("text", { x: margen.izquierda - 5, y: y(valor) + 4, "text-anchor": "end" }, "eje");
        texto.textContent = `${valor}%`;
        lienzo.appendChild(texto);
    }

    const primerAnio = new Date(inicio).getUTCFullYear();
    const ultimoAnio = new Date(fin).getUTCFullYear();
    const cada = anchoUtil < 420 ? 10 : 5;
    for (let anio = Math.ceil(primerAnio / cada) * cada; anio <= ultimoAnio; anio += cada) {
        const texto = svg("text", { x: x(Date.UTC(anio, 0, 1)), y: alto - 5, "text-anchor": "middle" }, "eje");
        texto.textContent = anio;
        lienzo.appendChild(texto);
    }

    let d = `M${x(tiempos[0]).toFixed(1)},${y(0).toFixed(1)}`;
    puntosSerie.forEach((p, i) => {
        d += `L${x(tiempos[i]).toFixed(1)},${y(p.porcentaje).toFixed(1)}`;
    });
    d += `L${x(fin).toFixed(1)},${y(0).toFixed(1)}Z`;
    lienzo.appendChild(svg("path", { d }, "area"));

    return lienzo;
}

function historico(caja, puntosSerie) {
    let anchoDibujado = 0;
    const dibujar = () => {
        const ancho = Math.max(280, Math.round(caja.clientWidth || 640));
        if (ancho === anchoDibujado && caja.querySelector("svg")) return;
        anchoDibujado = ancho;
        caja.textContent = "";
        caja.appendChild(dibujarHistorico(puntosSerie, ancho));
    };
    dibujar();
    if ("ResizeObserver" in window) {
        let espera = null;
        new ResizeObserver(() => {
            clearTimeout(espera);
            espera = setTimeout(dibujar, 120);
        }).observe(caja);
    }
}


export async function montarFichaEmbalse(raiz) {
    prepararRaiz(raiz, "embalses-ficha");
    aviso(raiz, "Cargando el embalse…");

    const codigo = (raiz.dataset.embalse || EMBALSE_DEFECTO).toUpperCase();
    const ambito = { ambito: "EMBALSE", codigo };
    const conHistorico = raiz.dataset.historico !== "no";

    let ficha;
    let anio;
    let serie = null;
    try {
        [ficha, anio, serie] = await Promise.all([
            pedir(`/embalses/ficha/${encodeURIComponent(codigo)}`),
            pedir(`/embalses/anio-hidrologico?${consulta(ambito)}`),
            conHistorico ? pedir(`/embalses/serie?${consulta(ambito)}`) : Promise.resolve(null)
        ]);
    } catch (error) {
        aviso(raiz, error.estado === 404
            ? "No se encuentra ese embalse."
            : "No se ha podido leer el embalse. Se puede volver a intentar más tarde.", true);
        return;
    }

    const embalse = ficha.embalse;
    const resumen = ficha.resumen;
    raiz.textContent = "";

    const cabeza = crear("div", "emb-ficha-cabeza");
    cabeza.appendChild(crear("div", "emb-etiqueta", "Embalse"));
    cabeza.appendChild(crear("h3", "emb-ficha-nombre", embalse.nombre));
    const lugar = [embalse.provincia, embalse.comunidad, `cuenca ${embalse.cuenca_nombre}`].filter(Boolean).join(" · ");
    cabeza.appendChild(crear("p", "emb-ficha-lugar", `${lugar} · ${USOS[embalse.uso] || embalse.uso} · capacidad ${hm3(embalse.capacidad)}`));
    raiz.appendChild(cabeza);

    if (resumen) {
        const bloque = crear("div", "emb-resumen");
        bloque.appendChild(vaso(resumen.porcentaje, { marcas: [resumen.media_diez_anios] }));

        const textos = crear("div", "emb-resumen-datos");
        const principal = crear("p", "emb-resumen-principal");
        principal.appendChild(crear("strong", "emb-cifra", hm3(resumen.agua)));
        principal.appendChild(document.createTextNode(` de ${hm3(resumen.capacidad)} `));
        principal.appendChild(estado(resumen.estado));
        textos.appendChild(principal);

        const semana = crear("p", "emb-resumen-principal");
        semana.appendChild(document.createTextNode("Esta semana: "));
        semana.appendChild(crear("span", `emb-cifra ${claseTendencia(resumen.variacion_semanal)}`, variacion(resumen.variacion_semanal)));
        textos.appendChild(semana);

        const comparativas = crear("dl", "emb-comparativas");
        for (const [titulo, valor] of [
            ["Hace un año", resumen.porcentaje_hace_un_anio],
            ["Media 5 años", resumen.media_cinco_anios],
            ["Media 10 años", resumen.media_diez_anios]
        ]) {
            const caja = crear("div", "emb-comparativa");
            caja.appendChild(crear("dt", null, titulo));
            const cifra = crear("dd", null, porcentaje(valor));
            if (valor !== null && valor !== undefined && resumen.porcentaje !== null) {
                const diferencia = resumen.porcentaje - valor;
                cifra.appendChild(crear("small", claseTendencia(diferencia), `ahora ${puntos(diferencia)}`));
            }
            caja.appendChild(cifra);
            comparativas.appendChild(caja);
        }
        textos.appendChild(comparativas);
        bloque.appendChild(textos);
        raiz.appendChild(bloque);
    }

    if (anio.semanas.some(s => s.actual !== null || s.anterior !== null)) {
        raiz.appendChild(crear("div", "emb-etiqueta", `Año hidrológico ${anio.etiqueta}`));
        const caja = crear("div", "emb-grafica");
        raiz.appendChild(caja);
        raiz.appendChild(leyenda(anio.etiqueta));
        grafica(caja, anio);
    }

    if (serie && serie.puntos && serie.puntos.length > 1) {
        const desde = serie.puntos[0].fecha.slice(0, 4);
        raiz.appendChild(crear("div", "emb-etiqueta", `Histórico desde ${desde}`));
        const caja = crear("div", "emb-grafica emb-historico");
        raiz.appendChild(caja);
        historico(caja, serie.puntos);
    }

    if (resumen) pieBoletin(raiz, resumen.fecha);
}


/* Fin de fichero: js/embalses/ficha.js */
