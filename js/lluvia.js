/* ============================================================
   LLUVIA - Lógica de lluvia visual, capas, gotas
   ============================================================ */

import { obtenerElemento, asignarTexto, asignarHtml, limitar, formatearNumero } from "./utils.js";
import { vientoEstacion } from "./viento.js";

const CODIGOS_ESTACION = ["EL_SILO", "LOS_LLANOS"];
const NOMBRES_NIVEL_LLUVIA = {
    0: "Sin lluvia",
    1: "Débil",
    2: "Moderada",
    3: "Fuerte",
    4: "Muy fuerte",
};

export const lluviaReal = { EL_SILO: 0, LOS_LLANOS: 0 };
export const lluviaSimulada = { EL_SILO: 0, LOS_LLANOS: 0, GLOBAL: 0 };

export function nivelLluviaDesdeTasa(tasa) {
    const tasaNum = Number(tasa);

    // Sin esta comprobación un dato ausente (undefined, "" o
    // cualquier cosa no numérica) da NaN, todas las comparaciones
    // de abajo son falsas y la función acaba devolviendo 4, o sea
    // "Muy fuerte": una estación sin dato se pintaría como
    // tormenta.
    if (!Number.isFinite(tasaNum)) return 0;

    if (tasaNum < 0.1) return 0;
    if (tasaNum < 2) return 1;
    if (tasaNum < 10) return 2;
    if (tasaNum < 50) return 3;
    return 4;
}

export function obtenerIconoLluvia(nivel) {
    const iconos = {
        0: "☀️",
        1: "🌤️",
        2: "☁️",
        3: "🌧️",
        4: "⛈️",
    };
    return iconos[nivel] || "☀️";
}

export function obtenerNivelEfectivo(codigo) {
    return Math.max(lluviaReal[codigo] || 0, lluviaSimulada[codigo] || 0);
}

export function obtenerEstacionDominante(codigos) {
    let dominante = null;

    codigos.forEach((codigo) => {
        if (dominante === null) {
            dominante = codigo;
            return;
        }

        const nivelCodigo = obtenerNivelEfectivo(codigo);
        const nivelDominante = obtenerNivelEfectivo(dominante);

        if (nivelCodigo > nivelDominante) {
            dominante = codigo;
            return;
        }

        if (nivelCodigo === nivelDominante) {
            const velocidadCodigo = Number(vientoEstacion[codigo].velocidad) || 0;
            const velocidadDominante = Number(vientoEstacion[dominante].velocidad) || 0;
            if (velocidadCodigo > velocidadDominante) {
                dominante = codigo;
            }
        }
    });

    return dominante;
}

export function obtenerVientoGlobalLluvia(codigosActivos) {
    let codigo;

    if (codigosActivos.length > 0) {
        codigo = obtenerEstacionDominante(codigosActivos);
    } else {
        codigo = CODIGOS_ESTACION.reduce((mejor, actual) => {
            if (mejor === null) return actual;
            const velocidadMejor = Number(vientoEstacion[mejor].velocidad) || 0;
            const velocidadActual = Number(vientoEstacion[actual].velocidad) || 0;
            return velocidadActual > velocidadMejor ? actual : mejor;
        }, null);
    }

    if (!codigo) {
        return { direccion: null, velocidad: 0 };
    }

    return {
        direccion: vientoEstacion[codigo].direccion,
        velocidad: vientoEstacion[codigo].velocidad,
    };
}

export function aplicarNivelACapa(capa, nivel) {
    if (!capa) return;

    const opacidad = [0, 0.2, 0.5, 0.8, 1];
    capa.style.opacity = opacidad[Math.min(nivel, 4)];
}

export function mostrarLluvia(codigo, datos) {
    if (!datos) return;

    const tasa = Number(datos.tasa_precipitacion) || 0;
    const nivel = nivelLluviaDesdeTasa(tasa);

    lluviaReal[codigo] = nivel;

    const icono = obtenerIconoLluvia(nivel);
    const nombre = NOMBRES_NIVEL_LLUVIA[nivel] || "Desconocida";
    const tasaTexto = formatearNumero(tasa, 2);

    asignarHtml(`lluvia-${codigo}`, `${icono} ${nombre} (${tasaTexto} mm/h)`);
}

export function mostrarErrorLluvia(codigo) {
    asignarHtml(`lluvia-${codigo}`, "❌ Sin datos");
}

export function configurarControlLluvia(elemento, origen) {
    if (!elemento) return;

    const control = elemento.querySelector(".control-lluvia");
    if (!control) return;

    const input = control.querySelector("input[type='range']");
    if (!input) return;

    input.addEventListener("input", (evento) => {
        const nivel = Number(evento.target.value);
        lluviaSimulada[origen] = limitar(nivel, 0, 4);
    });
}

export function inicializarLluviaVisual() {
    const capaLluvia = obtenerElemento("capa-lluvia");
    const capaGotasCristal = obtenerElemento("capa-gotas-cristal");

    if (capaLluvia) capaLluvia.innerHTML = "";
    if (capaGotasCristal) capaGotasCristal.innerHTML = "";
}

export function actualizarSistemaLluvia() {
    const codigosActivos = CODIGOS_ESTACION.filter((codigo) => obtenerNivelEfectivo(codigo) > 0);

    CODIGOS_ESTACION.forEach((codigo) => {
        const nivel = obtenerNivelEfectivo(codigo);
        aplicarNivelACapa(obtenerElemento(`capa-lluvia-${codigo}`), nivel);
    });
}
