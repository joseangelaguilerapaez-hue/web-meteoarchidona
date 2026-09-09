/* ============================================================
   TESTS - UI (reloj, navegación, paneles)
   ============================================================ */

import {
    hashDesdePanel,
    panelDesdeHash,
    panelesValidos,
    panelPorDefecto,
} from "../js/ui.js";

/*
ui.js saca las secciones de window.RUTAS_NAVEGACION, que en el
navegador publica js/rutas.js. Aquí se monta el mismo objeto
para probar contra la lista real del sitio.
*/
globalThis.window = globalThis.window || {};
globalThis.window.RUTAS_NAVEGACION = [
    { id: "actualidad", etiqueta: "Actualidad", pagina: "./index.html", enMenu: true },
    { id: "prediccion", etiqueta: "Predicción", pagina: "./prediccion.html", enMenu: true },
    { id: "observaciones", etiqueta: "Observaciones", pagina: "./observaciones.html", enMenu: true },
    { id: "en-vivo", etiqueta: "En vivo", pagina: "./en-vivo.html", enMenu: true },
    { id: "info", etiqueta: "Información", pagina: "./info.html", enMenu: true },
];
globalThis.window.RUTA_POR_DEFECTO = "actualidad";

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

test("panelesValidos: sale de rutas.js", () => {
    const paneles = panelesValidos();
    assertEqual(paneles.length, 5, "las cinco secciones de rutas.js");
    for (const id of ["actualidad", "prediccion", "observaciones", "en-vivo", "info"]) {
        assertTrue(paneles.includes(id), `incluye ${id}`);
    }
});

test("panelesValidos: sin rutas.js hay una lista de reserva", () => {
    const rutas = globalThis.window.RUTAS_NAVEGACION;
    globalThis.window.RUTAS_NAVEGACION = undefined;

    try {
        assertEqual(panelesValidos().length, 1, "una sola sección de reserva");
        assertEqual(panelesValidos()[0], "actualidad", "la reserva es actualidad");
        assertEqual(panelPorDefecto(), "actualidad", "el panel por defecto también");
    } finally {
        globalThis.window.RUTAS_NAVEGACION = rutas;
    }
});

test("panelPorDefecto: sale de rutas.js", () => {
    assertEqual(panelPorDefecto(), "actualidad", "el que declara rutas.js");
});

test("hashDesdePanel: secciones válidas", () => {
    assertEqual(hashDesdePanel("actualidad"), "#actualidad", "actualidad");
    assertEqual(hashDesdePanel("prediccion"), "#prediccion", "prediccion");
    assertEqual(hashDesdePanel("observaciones"), "#observaciones", "observaciones");
    assertEqual(hashDesdePanel("en-vivo"), "#en-vivo", "en-vivo");
    assertEqual(hashDesdePanel("info"), "#info", "info");
});

test("hashDesdePanel: sección inexistente", () => {
    assertEqual(hashDesdePanel("invalido"), "", "una sección que no existe no genera hash");
    assertEqual(hashDesdePanel(null), "", "null no genera hash");
    assertEqual(hashDesdePanel(undefined), "", "undefined no genera hash");
    assertEqual(hashDesdePanel(""), "", "cadena vacía no genera hash");
});

test("panelDesdeHash: secciones válidas", () => {
    assertEqual(panelDesdeHash("#prediccion"), "prediccion", "#prediccion");
    assertEqual(panelDesdeHash("#observaciones"), "observaciones", "#observaciones");
    assertEqual(panelDesdeHash("#en-vivo"), "en-vivo", "#en-vivo");
    assertEqual(panelDesdeHash("#info"), "info", "#info");
});

test("panelDesdeHash: sin hash es la sección por defecto", () => {
    assertEqual(panelDesdeHash(""), "actualidad", "cadena vacía");
    assertEqual(panelDesdeHash("#"), "actualidad", "solo la almohadilla");
});

test("panelDesdeHash: sección inexistente cae en la de por defecto", () => {
    assertEqual(panelDesdeHash("#invalido"), "actualidad", "sección que no existe");
    assertEqual(panelDesdeHash("#../../etc/passwd"), "actualidad", "texto arbitrario");
});

test("panelDesdeHash: sin hash válido no revienta", () => {
    assertEqual(panelDesdeHash(null), "actualidad", "null");
    assertEqual(panelDesdeHash(undefined), "actualidad", "undefined");
    assertEqual(panelDesdeHash(42), "actualidad", "un número");
});

test("panelDesdeHash: tolera mayúsculas y espacios", () => {
    assertEqual(panelDesdeHash("#PREDICCION"), "prediccion", "mayúsculas");
    assertEqual(panelDesdeHash("#  prediccion  "), "prediccion", "espacios alrededor");
});

test("panelDesdeHash: acepta la sección sin almohadilla", () => {
    assertEqual(panelDesdeHash("prediccion"), "prediccion", "sin #");
});

test("Conversión bidireccional: toda sección va y vuelve", () => {
    for (const panel of panelesValidos()) {
        assertEqual(panelDesdeHash(hashDesdePanel(panel)), panel, `${panel} va y vuelve`);
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
