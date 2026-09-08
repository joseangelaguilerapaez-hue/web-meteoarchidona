/* ============================================================
   VIENTO - Lógica de cálculo y visualización de viento
   ============================================================ */

import { obtenerElemento, normalizarGrados, obtenerDireccionCardinal } from "./utils.js";

export const vientoEstacion = {
    EL_SILO: { direccion: null, velocidad: 0 },
    LOS_LLANOS: { direccion: null, velocidad: 0 },
};

export function actualizarVeleta(codigo, grados) {
    const valor = normalizarGrados(grados);
    const veleta = obtenerElemento(`veleta-${codigo}`);

    if (!veleta) {
        return;
    }

    if (valor === null) {
        veleta.style.opacity = "0.3";
        veleta.textContent = "--";
        return;
    }

    veleta.style.opacity = "1";
    veleta.style.transform = `rotate(${valor}deg)`;
    veleta.title = obtenerDireccionCardinal(valor);
}

export function calcularMovimientoViento(direccionMeteorologica, velocidadKmh, ancho, alto) {
    const valor = normalizarGrados(direccionMeteorologica);

    if (valor === null || velocidadKmh === null || velocidadKmh === 0) {
        return { dx: 0, dy: 0, vxProm: 0, vyProm: 0 };
    }

    const radianes = (valor * Math.PI) / 180;
    const vxRaw = Math.sin(radianes);
    const vyRaw = -Math.cos(radianes);

    const pixelsPorSegundo = velocidadKmh / 3.6;
    const vx = vxRaw * pixelsPorSegundo;
    const vy = vyRaw * pixelsPorSegundo;

    const tiempoLluviaSegundos = Math.max(ancho, alto) / pixelsPorSegundo;
    const numPasos = Math.ceil(tiempoLluviaSegundos * 60);

    return {
        dx: vx,
        dy: vy,
        vxProm: vx / numPasos,
        vyProm: vy / numPasos,
    };
}

export function obtenerVientoGlobal(codigosActivos) {
    if (codigosActivos.length === 0) {
        return { direccion: null, velocidad: 0 };
    }

    const activos = codigosActivos.filter((codigo) => vientoEstacion[codigo]?.velocidad > 0);

    if (activos.length === 0) {
        return { direccion: null, velocidad: 0 };
    }

    const velocidadMedia = activos.reduce((sum, codigo) => sum + vientoEstacion[codigo].velocidad, 0) / activos.length;

    const direccionesValidas = activos
        .map((codigo) => vientoEstacion[codigo].direccion)
        .filter((d) => d !== null);

    if (direccionesValidas.length === 0) {
        return { direccion: null, velocidad: velocidadMedia };
    }

    const sinSum = direccionesValidas.reduce((sum, d) => sum + Math.sin((d * Math.PI) / 180), 0);
    const cosSum = direccionesValidas.reduce((sum, d) => sum + Math.cos((d * Math.PI) / 180), 0);

    const direccionMedia = Math.atan2(sinSum, cosSum) * (180 / Math.PI);

    return {
        direccion: normalizarGrados(direccionMedia),
        velocidad: velocidadMedia,
    };
}
