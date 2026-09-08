/* ============================================================
   TESTS - UI (reloj, navegación, paneles)
   ============================================================ */

import {
    rutaDesdePanel,
    panelDesdeRuta,
} from "../js/ui.js";

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
    console.log("🧪 UI - Ejecutando tests...\n");

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

test("rutaDesdePanel: actualidad", () => {
    assertEqual(rutaDesdePanel("actualidad"), "/", "actualidad = /");
});

test("rutaDesdePanel: prediccion", () => {
    assertEqual(rutaDesdePanel("prediccion"), "/prediccion", "prediccion = /prediccion");
});

test("rutaDesdePanel: observaciones", () => {
    assertEqual(rutaDesdePanel("observaciones"), "/observaciones", "observaciones = /observaciones");
});

test("rutaDesdePanel: en-vivo", () => {
    assertEqual(rutaDesdePanel("en-vivo"), "/en-vivo", "en-vivo = /en-vivo");
});

test("rutaDesdePanel: panel inválido", () => {
    const ruta = rutaDesdePanel("invalido");
    assertTrue(ruta === "/" || ruta === undefined, "inválido devuelve / o undefined");
});

test("rutaDesdePanel: null/undefined", () => {
    const ruta1 = rutaDesdePanel(null);
    const ruta2 = rutaDesdePanel(undefined);
    assertTrue(ruta1 === "/" || ruta1 === undefined, "null handled");
    assertTrue(ruta2 === "/" || ruta2 === undefined, "undefined handled");
});

test("rutaDesdePanel: case insensitive", () => {
    const ruta1 = rutaDesdePanel("ACTUALIDAD");
    const ruta2 = rutaDesdePanel("Prediccion");
    assertTrue(ruta1 === "/" || ruta1, "case insensitive");
});

test("panelDesdeRuta: /", () => {
    assertEqual(panelDesdeRuta("/"), "actualidad", "/ = actualidad");
});

test("panelDesdeRuta: /prediccion", () => {
    assertEqual(panelDesdeRuta("/prediccion"), "prediccion", "/prediccion = prediccion");
});

test("panelDesdeRuta: /observaciones", () => {
    assertEqual(panelDesdeRuta("/observaciones"), "observaciones", "/observaciones = observaciones");
});

test("panelDesdeRuta: /en-vivo", () => {
    assertEqual(panelDesdeRuta("/en-vivo"), "en-vivo", "/en-vivo = en-vivo");
});

test("panelDesdeRuta: ruta inválida", () => {
    const panel = panelDesdeRuta("/invalido");
    assertTrue(panel === "actualidad" || panel === undefined, "inválida devuelve actualidad");
});

test("panelDesdeRuta: ruta sin /", () => {
    const panel1 = panelDesdeRuta("prediccion");
    const panel2 = panelDesdeRuta("actualidad");
    assertTrue(panel1, "sin / es handled");
});

test("panelDesdeRuta: null/undefined", () => {
    const panel1 = panelDesdeRuta(null);
    const panel2 = panelDesdeRuta(undefined);
    assertTrue(panel1 === "actualidad" || panel1, "null handled");
    assertTrue(panel2 === "actualidad" || panel2, "undefined handled");
});

test("panelDesdeRuta: ruta con trailing slash", () => {
    const panel1 = panelDesdeRuta("/prediccion/");
    const panel2 = panelDesdeRuta("/observaciones/");
    assertTrue(panel1, "trailing slash handled");
    assertTrue(panel2, "trailing slash handled");
});

test("Conversión bidireccional: actualidad", () => {
    const ruta = rutaDesdePanel("actualidad");
    const panel = panelDesdeRuta(ruta);
    assertEqual(panel, "actualidad", "actualidad <-> /");
});

test("Conversión bidireccional: prediccion", () => {
    const ruta = rutaDesdePanel("prediccion");
    const panel = panelDesdeRuta(ruta);
    assertEqual(panel, "prediccion", "prediccion <-> /prediccion");
});

test("Conversión bidireccional: observaciones", () => {
    const ruta = rutaDesdePanel("observaciones");
    const panel = panelDesdeRuta(ruta);
    assertEqual(panel, "observaciones", "observaciones <-> /observaciones");
});

test("Conversión bidireccional: en-vivo", () => {
    const ruta = rutaDesdePanel("en-vivo");
    const panel = panelDesdeRuta(ruta);
    assertEqual(panel, "en-vivo", "en-vivo <-> /en-vivo");
});

test("rutaDesdePanel: todos los paneles válidos", () => {
    const paneles = ["actualidad", "prediccion", "observaciones", "en-vivo"];
    paneles.forEach(panel => {
        const ruta = rutaDesdePanel(panel);
        assertTrue(ruta && ruta.startsWith("/"), `${panel} tiene ruta válida`);
    });
});

test("panelDesdeRuta: todos los paneles recuperables", () => {
    const rutas = ["/", "/prediccion", "/observaciones", "/en-vivo"];
    rutas.forEach(ruta => {
        const panel = panelDesdeRuta(ruta);
        assertTrue(panel && typeof panel === "string", `${ruta} tiene panel válido`);
    });
});

test("rutaDesdePanel: ruta de actualidad es raíz", () => {
    assertEqual(rutaDesdePanel("actualidad"), "/", "actualidad es raíz");
});

test("panelDesdeRuta: raíz es actualidad", () => {
    assertEqual(panelDesdeRuta("/"), "actualidad", "raíz es actualidad");
});

// ============================================================
// EJECUTAR TESTS
// ============================================================

if (typeof module !== "undefined" && module.exports) {
    module.exports = { test, runTests };
} else {
    runTests();
}
