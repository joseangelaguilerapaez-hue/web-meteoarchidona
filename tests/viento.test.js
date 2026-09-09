/* ============================================================
   TESTS - Viento (dirección, velocidad, veleta)
   ============================================================ */

import {
    calcularMovimientoViento,
    obtenerVientoGlobal,
    vientoEstacion,
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

test("calcularMovimientoViento: sin viento", () => {
    const movimiento = calcularMovimientoViento(90, 0, 800, 600);
    assertEqual(movimiento.dx, 0, "0 km/h no mueve en x");
    assertEqual(movimiento.dy, 0, "0 km/h no mueve en y");
});

test("calcularMovimientoViento: devuelve las cuatro componentes", () => {
    const movimiento = calcularMovimientoViento(90, 10, 800, 600);
    for (const clave of ["dx", "dy", "vxProm", "vyProm"]) {
        assertTrue(clave in movimiento, `incluye ${clave}`);
        assertTrue(typeof movimiento[clave] === "number", `${clave} es número`);
    }
});

test("calcularMovimientoViento: dirección meteorológica", () => {
    // 90 grados es viento del este: la lluvia se desplaza hacia el este (+x).
    const desdeEste = calcularMovimientoViento(90, 20, 800, 600);
    assertTrue(desdeEste.dx > 0, "viento del este mueve hacia +x");
    assertCloseTo(desdeEste.dy, 0, 0.001, "viento del este no mueve en y");

    // 180 grados es viento del sur: se desplaza hacia el norte (-y).
    const desdeSur = calcularMovimientoViento(180, 20, 800, 600);
    assertCloseTo(desdeSur.dx, 0, 0.001, "viento del sur no mueve en x");
    assertTrue(desdeSur.dy > 0, "viento del sur mueve hacia +y");
});

test("calcularMovimientoViento: convierte km/h a píxeles por segundo", () => {
    const movimiento = calcularMovimientoViento(90, 36, 800, 600);
    assertCloseTo(movimiento.dx, 10, 0.001, "36 km/h son 10 px/s");
});

test("calcularMovimientoViento: proporcional a la velocidad", () => {
    const lento = calcularMovimientoViento(90, 10, 800, 600);
    const rapido = calcularMovimientoViento(90, 20, 800, 600);
    assertTrue(rapido.dx > lento.dx, "más velocidad, más desplazamiento");
    assertCloseTo(rapido.dx / lento.dx, 2, 0.001, "el doble de velocidad es el doble de dx");
});

test("calcularMovimientoViento: dirección nula", () => {
    const sinDireccion = calcularMovimientoViento(null, 20, 800, 600);
    assertEqual(sinDireccion.dx, 0, "sin dirección no hay movimiento en x");
    assertEqual(sinDireccion.dy, 0, "sin dirección no hay movimiento en y");
});

test("calcularMovimientoViento: velocidad nula", () => {
    const sinVelocidad = calcularMovimientoViento(90, null, 800, 600);
    assertEqual(sinVelocidad.dx, 0, "sin velocidad no hay movimiento en x");
    assertEqual(sinVelocidad.dy, 0, "sin velocidad no hay movimiento en y");
});

test("calcularMovimientoViento: grados fuera de rango", () => {
    // normalizarGrados lleva 450 a 90, así que deben coincidir.
    const normal = calcularMovimientoViento(90, 20, 800, 600);
    const fueraDeRango = calcularMovimientoViento(450, 20, 800, 600);
    assertCloseTo(fueraDeRango.dx, normal.dx, 0.001, "450 grados equivale a 90");
});

test("obtenerVientoGlobal: sin estaciones activas", () => {
    const viento = obtenerVientoGlobal([]);
    assertEqual(viento.direccion, null, "sin estaciones la dirección es null");
    assertEqual(viento.velocidad, 0, "sin estaciones la velocidad es 0");
});

test("obtenerVientoGlobal: estaciones sin viento", () => {
    vientoEstacion.EL_SILO = { direccion: null, velocidad: 0 };
    vientoEstacion.LOS_LLANOS = { direccion: null, velocidad: 0 };

    const viento = obtenerVientoGlobal(["EL_SILO", "LOS_LLANOS"]);
    assertEqual(viento.direccion, null, "sin viento la dirección es null");
    assertEqual(viento.velocidad, 0, "sin viento la velocidad es 0");
});

test("obtenerVientoGlobal: una sola estación", () => {
    vientoEstacion.EL_SILO = { direccion: 90, velocidad: 12 };
    vientoEstacion.LOS_LLANOS = { direccion: null, velocidad: 0 };

    const viento = obtenerVientoGlobal(["EL_SILO", "LOS_LLANOS"]);
    assertCloseTo(viento.velocidad, 12, 0.001, "toma la velocidad de la única activa");
    assertCloseTo(viento.direccion, 90, 0.001, "toma su dirección");
});

test("obtenerVientoGlobal: promedia las dos estaciones", () => {
    vientoEstacion.EL_SILO = { direccion: 90, velocidad: 10 };
    vientoEstacion.LOS_LLANOS = { direccion: 90, velocidad: 20 };

    const viento = obtenerVientoGlobal(["EL_SILO", "LOS_LLANOS"]);
    assertCloseTo(viento.velocidad, 15, 0.001, "velocidad media de 10 y 20");
    assertCloseTo(viento.direccion, 90, 0.001, "misma dirección en ambas");
});

test("obtenerVientoGlobal: media circular de direcciones", () => {
    // La media aritmética de 350 y 10 daría 180, que es el sentido
    // contrario. La media circular correcta es 0.
    vientoEstacion.EL_SILO = { direccion: 350, velocidad: 10 };
    vientoEstacion.LOS_LLANOS = { direccion: 10, velocidad: 10 };

    const viento = obtenerVientoGlobal(["EL_SILO", "LOS_LLANOS"]);
    assertCloseTo(viento.direccion, 0, 0.001, "350 y 10 promedian 0, no 180");
});

test("obtenerVientoGlobal: dirección siempre en rango", () => {
    vientoEstacion.EL_SILO = { direccion: 350, velocidad: 10 };
    vientoEstacion.LOS_LLANOS = { direccion: 10, velocidad: 10 };

    const viento = obtenerVientoGlobal(["EL_SILO", "LOS_LLANOS"]);
    assertTrue(viento.direccion >= 0 && viento.direccion < 360, "dirección entre 0 y 360");
});

test("obtenerVientoGlobal: consistencia", () => {
    vientoEstacion.EL_SILO = { direccion: 45, velocidad: 8 };
    vientoEstacion.LOS_LLANOS = { direccion: 45, velocidad: 8 };

    const primera = obtenerVientoGlobal(["EL_SILO", "LOS_LLANOS"]);
    const segunda = obtenerVientoGlobal(["EL_SILO", "LOS_LLANOS"]);
    assertEqual(primera.velocidad, segunda.velocidad, "misma velocidad con los mismos datos");
    assertEqual(primera.direccion, segunda.direccion, "misma dirección con los mismos datos");
});

// ============================================================
// EJECUTAR TESTS
// ============================================================

if (typeof module !== "undefined" && module.exports) {
    module.exports = { test, runTests };
} else {
    runTests();
}
