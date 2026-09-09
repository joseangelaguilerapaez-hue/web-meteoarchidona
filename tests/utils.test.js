/* ============================================================
   TESTS - Funciones genéricas
   ============================================================ */

import { formatearNumero, limitar, normalizarGrados, obtenerDireccionCardinal, clasificarUv } from "../js/utils.js";

// Test Runner simple
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
    console.log("🧪 Ejecutando tests...\n");

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

    // Sin esto el proceso termina con código 0 aunque fallen
    // tests, y tanto el && de "npm test" como el workflow de CI
    // dan la ejecución por buena. Se usa exitCode en vez de
    // exit(1) para no cortar la salida por pantalla.
    if (failed > 0 && typeof process !== "undefined") {
        process.exitCode = 1;
    }
}

// ============================================================
// TESTS
// ============================================================

test("formatearNumero: valor válido", () => {
    assertEqual(formatearNumero(25.456, 2), "25.46", "formatearNumero(25.456, 2)");
    assertEqual(formatearNumero(10, 1), "10.0", "formatearNumero(10, 1)");
});

test("formatearNumero: valores null/undefined", () => {
    assertEqual(formatearNumero(null), "--", "null");
    assertEqual(formatearNumero(undefined), "--", "undefined");
    assertEqual(formatearNumero(NaN), "--", "NaN");
});

test("formatearNumero: decimales por defecto", () => {
    assertEqual(formatearNumero(25.456), "25.5", "decimales=1 por defecto");
});

test("limitar: dentro de rango", () => {
    assertEqual(limitar(5, 0, 10), 5, "5 está dentro [0,10]");
});

test("limitar: bajo mínimo", () => {
    assertEqual(limitar(-5, 0, 10), 0, "-5 < 0, devuelve 0");
});

test("limitar: sobre máximo", () => {
    assertEqual(limitar(15, 0, 10), 10, "15 > 10, devuelve 10");
});

test("normalizarGrados: 0-360", () => {
    assertEqual(normalizarGrados(45), 45, "45 es válido");
    assertEqual(normalizarGrados(0), 0, "0 es válido");
    assertEqual(normalizarGrados(360), 0, "360 normaliza a 0");
});

test("normalizarGrados: negativos", () => {
    assertEqual(normalizarGrados(-45), 315, "-45 normaliza a 315");
    assertEqual(normalizarGrados(-90), 270, "-90 normaliza a 270");
});

test("normalizarGrados: mayores a 360", () => {
    assertEqual(normalizarGrados(450), 90, "450 normaliza a 90");
    assertEqual(normalizarGrados(720), 0, "720 normaliza a 0");
});

test("normalizarGrados: null/undefined", () => {
    assertEqual(normalizarGrados(null), null, "null devuelve null");
    assertEqual(normalizarGrados(undefined), null, "undefined devuelve null");
});

test("obtenerDireccionCardinal: puntos cardinales", () => {
    assertEqual(obtenerDireccionCardinal(0), "N", "0°=N");
    assertEqual(obtenerDireccionCardinal(90), "E", "90°=E");
    assertEqual(obtenerDireccionCardinal(180), "S", "180°=S");
    assertEqual(obtenerDireccionCardinal(270), "O", "270°=O");
});

test("obtenerDireccionCardinal: intermedios", () => {
    assertEqual(obtenerDireccionCardinal(45), "NE", "45°=NE");
    assertEqual(obtenerDireccionCardinal(135), "SE", "135°=SE");
    assertEqual(obtenerDireccionCardinal(225), "SO", "225°=SO");
    assertEqual(obtenerDireccionCardinal(315), "NO", "315°=NO");
});

test("obtenerDireccionCardinal: null", () => {
    assertEqual(obtenerDireccionCardinal(null), "--", "null devuelve --");
});

test("clasificarUv: niveles correctos", () => {
    assertEqual(clasificarUv(2), "Bajo", "2=Bajo");
    assertEqual(clasificarUv(4), "Moderado", "4=Moderado");
    assertEqual(clasificarUv(7), "Alto", "7=Alto");
    assertEqual(clasificarUv(9), "Muy alto", "9=Muy alto");
    assertEqual(clasificarUv(12), "Extremo", "12=Extremo");
});

test("clasificarUv: límites", () => {
    assertEqual(clasificarUv(3), "Moderado", "3 límite inferior");
    assertEqual(clasificarUv(6), "Alto", "6 límite inferior");
});

// ============================================================
// EJECUTAR TESTS
// ============================================================

if (typeof module !== "undefined" && module.exports) {
    module.exports = { test, runTests };
} else {
    // En navegador
    runTests();
}
