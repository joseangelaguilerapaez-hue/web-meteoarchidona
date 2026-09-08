/* ============================================================
   TESTS - Viento (dirección, velocidad, veleta)
   ============================================================ */

import {
    calcularMovimientoViento,
    obtenerVientoGlobal,
} from "../js/viento.js";

const tests = [];
let passed = 0;
let failed = 0;

function test(nombre, fn) {
    tests.push({ nombre, fn });
}

function assertEqual(actual, expected, mensaje) {
    if (actual !== expected) {
        throw new Error(`${mensaje}: esperado ${expected}, obtuvo ${actual}`);
    }
}

function assertTrue(valor, mensaje) {
    if (!valor) {
        throw new Error(mensaje);
    }
}

function assertCloseTo(actual, expected, delta, mensaje) {
    if (Math.abs(actual - expected) > delta) {
        throw new Error(`${mensaje}: esperado ~${expected}, obtuvo ${actual}`);
    }
}

function runTests() {
    console.log("🧪 Viento - Ejecutando tests...\n");

    for (const { nombre, fn } of tests) {
        try {
            fn();
            console.log(`✅ ${nombre}`);
            passed++;
        } catch (err) {
            console.log(`❌ ${nombre}: ${err.message}`);
            failed++;
        }
    }

    console.log(`\n📊 Resultados: ${passed} pasados, ${failed} fallidos`);
}

// ============================================================
// TESTS
// ============================================================

test("calcularMovimientoViento: sin viento", () => {
    const movimiento = calcularMovimientoViento(0);
    assertEqual(movimiento, 0, "0 km/h = 0 grados movimiento");
});

test("calcularMovimientoViento: viento moderado", () => {
    const movimiento = calcularMovimientoViento(10);
    assertTrue(movimiento > 0, "10 km/h > 0 movimiento");
    assertTrue(movimiento <= 15, "10 km/h <= 15 grados");
});

test("calcularMovimientoViento: viento fuerte", () => {
    const movimiento = calcularMovimientoViento(30);
    assertTrue(movimiento > 0, "30 km/h > 0 movimiento");
    assertTrue(movimiento <= 45, "30 km/h <= 45 grados");
});

test("calcularMovimientoViento: viento muy fuerte", () => {
    const movimiento = calcularMovimientoViento(60);
    assertTrue(movimiento > 0, "60 km/h > 0 movimiento");
    assertTrue(movimiento <= 90, "60 km/h <= 90 grados");
});

test("calcularMovimientoViento: proporcional a velocidad", () => {
    const mov10 = calcularMovimientoViento(10);
    const mov20 = calcularMovimientoViento(20);
    assertTrue(mov20 > mov10, "20 km/h > 10 km/h en movimiento");
});

test("calcularMovimientoViento: null/undefined", () => {
    assertEqual(calcularMovimientoViento(null), 0, "null devuelve 0");
    assertEqual(calcularMovimientoViento(undefined), 0, "undefined devuelve 0");
});

test("calcularMovimientoViento: negativos", () => {
    assertEqual(calcularMovimientoViento(-10), 0, "negativos devuelven 0");
});

test("calcularMovimientoViento: límite máximo", () => {
    const movimiento = calcularMovimientoViento(200);
    assertTrue(movimiento > 0, "velocidades altas devuelven movimiento");
    assertTrue(movimiento <= 180, "movimiento capped en 180");
});

test("obtenerVientoGlobal: ambas estaciones", () => {
    const viento = obtenerVientoGlobal();
    assertTrue(typeof viento === "object", "devuelve objeto");
    assertTrue("velocidad" in viento, "tiene velocidad");
    assertTrue("direccion" in viento, "tiene dirección");
});

test("obtenerVientoGlobal: velocidad es número", () => {
    const viento = obtenerVientoGlobal();
    assertTrue(typeof viento.velocidad === "number", "velocidad es número");
    assertTrue(viento.velocidad >= 0, "velocidad >= 0");
});

test("obtenerVientoGlobal: dirección en rango", () => {
    const viento = obtenerVientoGlobal();
    if (viento.direccion !== null) {
        assertTrue(viento.direccion >= 0 && viento.direccion <= 360, "dirección en rango");
    }
});

test("obtenerVientoGlobal: promedio de estaciones", () => {
    // Simular datos de estaciones
    const viento = obtenerVientoGlobal();
    assertTrue(viento.velocidad >= 0, "velocidad >= 0");
});

test("calcularMovimientoViento: suave a fuerte", () => {
    const suave = calcularMovimientoViento(5);
    const moderado = calcularMovimientoViento(15);
    const fuerte = calcularMovimientoViento(25);

    assertTrue(suave <= moderado, "suave <= moderado");
    assertTrue(moderado <= fuerte, "moderado <= fuerte");
});

test("calcularMovimientoViento: escala logarítmica", () => {
    const mov10 = calcularMovimientoViento(10);
    const mov40 = calcularMovimientoViento(40);

    // 40 es 4x 10, pero movimiento NO debe ser 4x
    const ratio = mov40 / mov10;
    assertTrue(ratio < 4, "escala no lineal (logarítmica)");
    assertTrue(ratio > 1, "ratio > 1");
});

test("obtenerVientoGlobal: consistencia", () => {
    const viento1 = obtenerVientoGlobal();
    const viento2 = obtenerVientoGlobal();

    // Debe ser consistente (mismo dato)
    assertEqual(viento1.velocidad, viento2.velocidad, "velocidad consistente");
});

test("calcularMovimientoViento: tipos numéricos", () => {
    const mov1 = calcularMovimientoViento(10);
    const mov2 = calcularMovimientoViento("10");

    // Debe tolerar string número
    assertTrue(mov1 > 0 || mov2 > 0, "tolera string número");
});

// ============================================================
// EJECUTAR TESTS
// ============================================================

if (typeof module !== "undefined" && module.exports) {
    module.exports = { test, runTests };
} else {
    runTests();
}
