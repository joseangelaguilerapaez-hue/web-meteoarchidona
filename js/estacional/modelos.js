/*
 * MeteoArchidona · Componente «Qué dice cada modelo» (predicción estacional)
 *
 * El escenario más probable de cada modelo del conjunto de Copernicus para
 * el trimestre (o el periodo elegido), con un punto de color por modelo:
 * de un vistazo se ve si están de acuerdo. Sin números (José, 14-11-2026).
 *
 *     <div data-componente="estacional-modelos"></div>
 *     data-periodo="trimestre" (por defecto) o "1", "2", "3" (cada mes)
 *     data-titulo="no"         sin título
 *     data-salida="2026-11"    una salida concreta (por defecto, la última)
 *
 * API: GET /estacional/sistemas
 */

import {
    pedirSistemas, crear, aviso, prepararRaiz, titulo, pie, capital, textoError
} from "./comun.js?v=20261115-estacional1";


const NOMBRES = {
    TEMPERATURA: { INFERIOR: "Más frío", NORMAL: "Normal", SUPERIOR: "Más cálido" },
    LLUVIA: { INFERIOR: "Más seco", NORMAL: "Normal", SUPERIOR: "Más lluvioso" }
};


function elegirPeriodos(datos, eleccion) {
    const trimestres = datos.periodos.filter(p => p.tipo === "TRIMESTRE");
    const meses = datos.periodos.filter(p => p.tipo === "MES");
    const nombres = [...new Set(meses.map(p => p.nombre))];
    const indice = Number.parseInt(eleccion, 10);
    if (indice >= 1 && indice <= nombres.length) {
        return meses.filter(p => p.nombre === nombres[indice - 1]);
    }
    return trimestres;
}


export async function montarEstacionalModelos(raiz) {
    prepararRaiz(raiz, "est-modelos");
    aviso(raiz, "Cargando los modelos…");

    let datos;
    try {
        datos = await pedirSistemas(raiz);
    } catch (error) {
        prepararRaiz(raiz, "est-modelos");
        aviso(raiz, textoError(error), true);
        return;
    }

    prepararRaiz(raiz, "est-modelos");
    const periodos = elegirPeriodos(datos, raiz.dataset.periodo || "trimestre");
    if (!periodos.length) {
        aviso(raiz, "Sin datos de los modelos.", true);
        return;
    }

    titulo(raiz, "PREDICCIÓN ESTACIONAL · COPERNICUS", `Qué dice cada modelo · ${capital(periodos[0].nombre)}`);

    const porVariable = {};
    for (const periodo of periodos) {
        porVariable[periodo.variable] = periodo.sistemas;
    }

    // Una fila por modelo, en el orden de la API.
    const codigos = [];
    for (const periodo of periodos) {
        for (const sistema of periodo.sistemas) {
            if (!codigos.some(c => c.codigo === sistema.codigo)) {
                codigos.push({ codigo: sistema.codigo, nombre: sistema.nombre });
            }
        }
    }

    const tabla = crear("table", "est-tabla-modelos");
    const cabeza = crear("thead");
    const filaCabeza = crear("tr");
    filaCabeza.appendChild(crear("th", null, "Modelo"));
    filaCabeza.appendChild(crear("th", null, "Temperatura"));
    filaCabeza.appendChild(crear("th", null, "Lluvia"));
    cabeza.appendChild(filaCabeza);
    tabla.appendChild(cabeza);

    const cuerpo = crear("tbody");
    for (const { codigo, nombre } of codigos) {
        const fila = crear("tr");
        fila.appendChild(crear("td", "est-modelo-nombre", nombre));
        for (const variable of ["TEMPERATURA", "LLUVIA"]) {
            const sistema = (porVariable[variable] || []).find(s => s.codigo === codigo);
            const celda = crear("td", `est-modelo-celda est-${variable === "LLUVIA" ? "lluvia" : "temperatura"}`);
            if (sistema) {
                const categoria = sistema.escenario.toLowerCase();
                celda.appendChild(crear("span", `est-punto est-tramo-${categoria}`));
                celda.appendChild(crear("span", null, NOMBRES[variable][sistema.escenario] || sistema.escenario));
            } else {
                celda.textContent = "—";
            }
            fila.appendChild(celda);
        }
        cuerpo.appendChild(fila);
    }
    tabla.appendChild(cuerpo);
    raiz.appendChild(tabla);

    raiz.appendChild(crear("p", "est-detalle",
        "Cada punto es el escenario que más se repite entre las simulaciones de ese modelo. " +
        "Los dos canadienses cuentan juntos como un solo modelo."));

    pie(raiz, null);
}


/* Fin de fichero: js/estacional/modelos.js */
