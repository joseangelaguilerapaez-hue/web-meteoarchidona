/* ============================================================
   UTILIDADES GENÉRICAS - Funciones reutilizables
   ============================================================ */

export function obtenerElemento(id) {
    return document.getElementById(id);
}

export function asignarTexto(id, texto) {
    const elemento = obtenerElemento(id);
    if (elemento) {
        elemento.textContent = texto;
    }
}

export function asignarHtml(id, html) {
    const elemento = obtenerElemento(id);
    if (elemento) {
        elemento.innerHTML = html;
    }
}

export function formatearNumero(valor, decimales = 1) {
    if (valor === null || valor === undefined || Number.isNaN(Number(valor))) {
        return "--";
    }
    return Number(valor).toFixed(decimales);
}

export function limitar(valor, minimo, maximo) {
    return Math.min(maximo, Math.max(minimo, valor));
}

export function normalizarGrados(grados) {
    if (grados === null || grados === undefined || Number.isNaN(Number(grados))) {
        return null;
    }
    return ((Number(grados) % 360) + 360) % 360;
}

export function obtenerDireccionCardinal(grados) {
    const valor = normalizarGrados(grados);
    if (valor === null) {
        return "--";
    }

    const direcciones = [
        "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
        "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO",
    ];

    const indice = Math.round(valor / 22.5) % 16;
    return direcciones[indice];
}

export function clasificarUv(valor) {
    const uv = Number(valor);

    if (uv < 3) {
        return "Bajo";
    }
    if (uv < 6) {
        return "Moderado";
    }
    if (uv < 8) {
        return "Alto";
    }
    if (uv < 11) {
        return "Muy alto";
    }
    return "Extremo";
}
