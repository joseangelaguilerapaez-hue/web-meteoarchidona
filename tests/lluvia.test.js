/* ============================================================
   TESTS - Lluvia (visualización, cálculos)
   ============================================================ */

import {
    nivelLluviaDesdeTasa,
    obtenerIconoLluvia,
    obtenerNivelEfectivo,
    lluviaReal,
    lluviaSimulada,
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

test("nivelLluviaDesdeTasa: sin lluvia", () => {
    assertEqual(nivelLluviaDesdeTasa(0), 0, "0 mm/h = nivel 0");
    assertEqual(nivelLluviaDesdeTasa(0.05), 0, "0.05 mm/h = nivel 0");
});

test("nivelLluviaDesdeTasa: lluvia débil", () => {
    assertEqual(nivelLluviaDesdeTasa(0.1), 1, "0.1 mm/h = nivel 1");
    assertEqual(nivelLluviaDesdeTasa(0.5), 1, "0.5 mm/h = nivel 1");
    assertEqual(nivelLluviaDesdeTasa(1.9), 1, "1.9 mm/h = nivel 1");
});

test("nivelLluviaDesdeTasa: lluvia moderada", () => {
    assertEqual(nivelLluviaDesdeTasa(2), 2, "2 mm/h = nivel 2");
    assertEqual(nivelLluviaDesdeTasa(5), 2, "5 mm/h = nivel 2");
    assertEqual(nivelLluviaDesdeTasa(9.9), 2, "9.9 mm/h = nivel 2");
});

test("nivelLluviaDesdeTasa: lluvia fuerte", () => {
    assertEqual(nivelLluviaDesdeTasa(10), 3, "10 mm/h = nivel 3");
    assertEqual(nivelLluviaDesdeTasa(20), 3, "20 mm/h = nivel 3");
    assertEqual(nivelLluviaDesdeTasa(49.9), 3, "49.9 mm/h = nivel 3");
});

test("nivelLluviaDesdeTasa: lluvia muy fuerte", () => {
    assertEqual(nivelLluviaDesdeTasa(50), 4, "50 mm/h = nivel 4");
    assertEqual(nivelLluviaDesdeTasa(100), 4, "100 mm/h = nivel 4");
});

test("nivelLluviaDesdeTasa: límites entre niveles", () => {
    // Cada umbral pertenece al nivel de arriba.
    assertEqual(nivelLluviaDesdeTasa(0.1), 1, "0.1 abre el nivel 1");
    assertEqual(nivelLluviaDesdeTasa(2), 2, "2 abre el nivel 2");
    assertEqual(nivelLluviaDesdeTasa(10), 3, "10 abre el nivel 3");
    assertEqual(nivelLluviaDesdeTasa(50), 4, "50 abre el nivel 4");
});

test("nivelLluviaDesdeTasa: sin dato devuelve 0", () => {
    // Un dato ausente no puede acabar clasificado como tormenta.
    assertEqual(nivelLluviaDesdeTasa(null), 0, "null devuelve 0");
    assertEqual(nivelLluviaDesdeTasa(undefined), 0, "undefined devuelve 0");
    assertEqual(nivelLluviaDesdeTasa(NaN), 0, "NaN devuelve 0");
    assertEqual(nivelLluviaDesdeTasa(""), 0, "cadena vacía devuelve 0");
    assertEqual(nivelLluviaDesdeTasa("--"), 0, "texto devuelve 0");
});

test("nivelLluviaDesdeTasa: acepta números en texto", () => {
    assertEqual(nivelLluviaDesdeTasa("5"), 2, "\"5\" se interpreta como 5");
});

test("obtenerIconoLluvia: un icono por nivel", () => {
    assertEqual(obtenerIconoLluvia(0), "☀️", "nivel 0 sin lluvia");
    assertEqual(obtenerIconoLluvia(1), "🌤️", "nivel 1 débil");
    assertEqual(obtenerIconoLluvia(2), "☁️", "nivel 2 moderada");
    assertEqual(obtenerIconoLluvia(3), "🌧️", "nivel 3 fuerte");
    assertEqual(obtenerIconoLluvia(4), "⛈️", "nivel 4 muy fuerte");
});

test("obtenerIconoLluvia: nivel inválido", () => {
    assertEqual(obtenerIconoLluvia(-1), "☀️", "nivel negativo cae en el icono por defecto");
    assertEqual(obtenerIconoLluvia(9), "☀️", "nivel fuera de tabla cae en el icono por defecto");
    assertEqual(obtenerIconoLluvia(undefined), "☀️", "sin nivel cae en el icono por defecto");
});

test("obtenerIconoLluvia: todos los niveles devuelven texto", () => {
    for (let nivel = 0; nivel <= 4; nivel += 1) {
        assertTrue(typeof obtenerIconoLluvia(nivel) === "string", `nivel ${nivel} devuelve string`);
    }
});

test("obtenerNivelEfectivo: la lluvia real prevalece", () => {
    lluviaReal.EL_SILO = 2;
    lluviaSimulada.EL_SILO = 1;
    assertEqual(obtenerNivelEfectivo("EL_SILO"), 2, "real (2) por encima de simulada (1)");
});

test("obtenerNivelEfectivo: usa la simulada si no hay real", () => {
    lluviaReal.EL_SILO = 0;
    lluviaSimulada.EL_SILO = 3;
    assertEqual(obtenerNivelEfectivo("EL_SILO"), 3, "sin lluvia real, usa la simulada");
});

test("obtenerNivelEfectivo: devuelve el máximo de las dos", () => {
    lluviaReal.EL_SILO = 3;
    lluviaSimulada.EL_SILO = 1;
    assertEqual(obtenerNivelEfectivo("EL_SILO"), 3, "máximo cuando manda la real");

    lluviaReal.LOS_LLANOS = 1;
    lluviaSimulada.LOS_LLANOS = 3;
    assertEqual(obtenerNivelEfectivo("LOS_LLANOS"), 3, "máximo cuando manda la simulada");
});

test("obtenerNivelEfectivo: las dos a cero", () => {
    lluviaReal.EL_SILO = 0;
    lluviaSimulada.EL_SILO = 0;
    assertEqual(obtenerNivelEfectivo("EL_SILO"), 0, "las dos a 0 devuelve 0");
});

test("obtenerNivelEfectivo: estación desconocida", () => {
    assertEqual(obtenerNivelEfectivo("NO_EXISTE"), 0, "una estación sin datos devuelve 0");
});

test("nivelLluviaDesdeTasa: valores negativos", () => {
    assertEqual(nivelLluviaDesdeTasa(-5), 0, "negativos devuelven 0");
});

// ============================================================
// EJECUTAR TESTS
// ============================================================

if (typeof module !== "undefined" && module.exports) {
    module.exports = { test, runTests };
} else {
    runTests();
}
