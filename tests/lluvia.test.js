/* ============================================================
   TESTS - Lluvia (visualización, cálculos)
   ============================================================ */

import {
    nivelLluviaDesdeTasa,
    obtenerIconoLluvia,
    obtenerNivelEfectivo,
} from "../js/lluvia.js";

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

function runTests() {
    console.log("🧪 Lluvia - Ejecutando tests...\n");

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

test("nivelLluviaDesdeTasa: sin lluvia", () => {
    assertEqual(nivelLluviaDesdeTasa(0), 0, "0 mm/h = nivel 0");
    assertEqual(nivelLluviaDesdeTasa(0.1), 0, "0.1 mm/h = nivel 0");
});

test("nivelLluviaDesdeTasa: lluvia débil", () => {
    assertEqual(nivelLluviaDesdeTasa(0.5), 1, "0.5 mm/h = nivel 1");
    assertEqual(nivelLluviaDesdeTasa(2), 1, "2 mm/h = nivel 1");
});

test("nivelLluviaDesdeTasa: lluvia moderada", () => {
    assertEqual(nivelLluviaDesdeTasa(5), 2, "5 mm/h = nivel 2");
    assertEqual(nivelLluviaDesdeTasa(10), 2, "10 mm/h = nivel 2");
});

test("nivelLluviaDesdeTasa: lluvia fuerte", () => {
    assertEqual(nivelLluviaDesdeTasa(20), 3, "20 mm/h = nivel 3");
    assertEqual(nivelLluviaDesdeTasa(40), 3, "40 mm/h = nivel 3");
});

test("nivelLluviaDesdeTasa: lluvia muy fuerte", () => {
    assertEqual(nivelLluviaDesdeTasa(50), 4, "50 mm/h = nivel 4");
    assertEqual(nivelLluviaDesdeTasa(100), 4, "100 mm/h = nivel 4");
});

test("nivelLluviaDesdeTasa: límites entre niveles", () => {
    assertEqual(nivelLluviaDesdeTasa(2.5), 1, "2.5 es límite nivel 1-2");
    assertEqual(nivelLluviaDesdeTasa(12.5), 2, "12.5 es límite nivel 2-3");
    assertEqual(nivelLluviaDesdeTasa(45), 4, "45 es límite nivel 3-4");
});

test("nivelLluviaDesdeTasa: null/undefined", () => {
    assertEqual(nivelLluviaDesdeTasa(null), 0, "null devuelve 0");
    assertEqual(nivelLluviaDesdeTasa(undefined), 0, "undefined devuelve 0");
    assertEqual(nivelLluviaDesdeTasa(NaN), 0, "NaN devuelve 0");
});

test("obtenerIconoLluvia: nivel 0 (sin lluvia)", () => {
    const icono = obtenerIconoLluvia(0);
    assertTrue(icono === "☀️" || icono === "clear", "nivel 0 = ☀️");
});

test("obtenerIconoLluvia: nivel 1 (débil)", () => {
    const icono = obtenerIconoLluvia(1);
    assertTrue(icono === "🌧️" || icono === "light", "nivel 1 = 🌧️");
});

test("obtenerIconoLluvia: nivel 2 (moderada)", () => {
    const icono = obtenerIconoLluvia(2);
    assertTrue(icono === "⛈️" || icono === "moderate", "nivel 2 = ⛈️");
});

test("obtenerIconoLluvia: nivel 3 (fuerte)", () => {
    const icono = obtenerIconoLluvia(3);
    assertTrue(icono === "⛈️" || icono === "heavy", "nivel 3 = ⛈️");
});

test("obtenerIconoLluvia: nivel 4 (muy fuerte)", () => {
    const icono = obtenerIconoLluvia(4);
    assertTrue(icono === "⛈️" || icono === "extreme", "nivel 4 = ⛈️");
});

test("obtenerIconoLluvia: nivel inválido", () => {
    const icono = obtenerIconoLluvia(-1);
    assertTrue(icono === "❌" || icono === "unknown", "nivel inválido");
});

test("obtenerNivelEfectivo: lluvia real prevalece", () => {
    // Si lluvia real > simulada, devuelve real
    const nivel = obtenerNivelEfectivo(2, 1);
    assertTrue(nivel >= 2, "lluvia real (2) prevalece sobre simulada (1)");
});

test("obtenerNivelEfectivo: lluvia simulada si no hay real", () => {
    // Si lluvia real es 0, devuelve simulada
    const nivel = obtenerNivelEfectivo(0, 3);
    assertTrue(nivel === 3, "sin lluvia real, usa simulada");
});

test("obtenerNivelEfectivo: máximo de ambas", () => {
    // Devuelve el máximo
    const nivel1 = obtenerNivelEfectivo(3, 1);
    const nivel2 = obtenerNivelEfectivo(1, 3);
    assertTrue(nivel1 >= 3 && nivel2 >= 3, "devuelve máximo");
});

test("obtenerNivelEfectivo: ambas 0", () => {
    const nivel = obtenerNivelEfectivo(0, 0);
    assertEqual(nivel, 0, "ambas 0 devuelve 0");
});

test("obtenerNivelEfectivo: null/undefined", () => {
    const nivel1 = obtenerNivelEfectivo(null, 2);
    const nivel2 = obtenerNivelEfectivo(2, undefined);
    assertTrue(nivel1 >= 0 && nivel2 >= 0, "null/undefined manejado");
});

test("nivelLluviaDesdeTasa: valores negativos", () => {
    assertEqual(nivelLluviaDesdeTasa(-5), 0, "negativos devuelven 0");
});

test("obtenerIconoLluvia: todos los niveles retornan string", () => {
    for (let i = 0; i <= 4; i++) {
        const icono = obtenerIconoLluvia(i);
        assertTrue(typeof icono === "string", `nivel ${i} devuelve string`);
    }
});

// ============================================================
// EJECUTAR TESTS
// ============================================================

if (typeof module !== "undefined" && module.exports) {
    module.exports = { test, runTests };
} else {
    runTests();
}
