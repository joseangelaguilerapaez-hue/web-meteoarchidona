/* ============================================================
   TESTS - Funciones de validación
   ============================================================ */

import {
    esEstacionValida,
    esZonaValida,
    esNumeroValido,
    esTemperaturaValida,
    esHumedadValida,
    esPresionValida,
    esVelocidadVientoValida,
    esDireccionVientoValida,
    esLluviaValida,
    esIndiceUVValido,
    validarCondiciones,
    sanitizarString,
    esEmailValido,
} from "../js/validation.js";

// Test runner simple
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

function assertFalse(valor, mensaje) {
    if (valor) {
        throw new Error(mensaje);
    }
}

function runTests() {
    console.log("🧪 Validación - Ejecutando tests...\n");

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

test("esEstacionValida: EL_SILO válida", () => {
    assertTrue(esEstacionValida("EL_SILO"), "EL_SILO debe ser válida");
});

test("esEstacionValida: LOS_LLANOS válida", () => {
    assertTrue(esEstacionValida("LOS_LLANOS"), "LOS_LLANOS debe ser válida");
});

test("esEstacionValida: case insensitive", () => {
    assertTrue(esEstacionValida("el_silo"), "minúsculas debe funcionar");
    assertTrue(esEstacionValida("El_Silo"), "mixed case debe funcionar");
});

test("esEstacionValida: estación inválida", () => {
    assertFalse(esEstacionValida("INVALID"), "INVALID debe ser falsa");
    assertFalse(esEstacionValida(null), "null debe ser falsa");
    assertFalse(esEstacionValida(123), "número debe ser falsa");
});

test("esZonaValida: AHR válida", () => {
    assertTrue(esZonaValida("AHR"), "AHR debe ser válida");
});

test("esZonaValida: zona inválida", () => {
    assertFalse(esZonaValida("INVALID"), "INVALID debe ser falsa");
});

test("esNumeroValido: números válidos", () => {
    assertTrue(esNumeroValido(25), "entero positivo");
    assertTrue(esNumeroValido(25.5), "decimal positivo");
    assertTrue(esNumeroValido(-5), "número negativo");
    assertTrue(esNumeroValido(0), "cero");
});

test("esNumeroValido: números inválidos", () => {
    assertFalse(esNumeroValido(NaN), "NaN debe ser falsa");
    assertFalse(esNumeroValido(null), "null debe ser falsa");
    assertFalse(esNumeroValido(undefined), "undefined debe ser falsa");
    assertFalse(esNumeroValido(Infinity), "Infinity debe ser falsa");
});

test("esTemperaturaValida: rango válido", () => {
    assertTrue(esTemperaturaValida(20), "20°C válida");
    assertTrue(esTemperaturaValida(-10), "-10°C válida");
    assertTrue(esTemperaturaValida(35), "35°C válida");
});

test("esTemperaturaValida: fuera de rango", () => {
    assertFalse(esTemperaturaValida(-60), "menor que min (-50)");
    assertFalse(esTemperaturaValida(70), "mayor que max (60)");
});

test("esHumedadValida: rango válido", () => {
    assertTrue(esHumedadValida(50), "50% válida");
    assertTrue(esHumedadValida(0), "0% válida");
    assertTrue(esHumedadValida(100), "100% válida");
});

test("esHumedadValida: fuera de rango", () => {
    assertFalse(esHumedadValida(-10), "negativa");
    assertFalse(esHumedadValida(150), "mayor que 100");
});

test("esPresionValida: rango válido", () => {
    assertTrue(esPresionValida(1013), "1013 mb válida");
    assertTrue(esPresionValida(900), "900 mb válida");
});

test("esPresionValida: fuera de rango", () => {
    assertFalse(esPresionValida(850), "menor que min (870)");
    assertFalse(esPresionValida(1100), "mayor que max (1050)");
});

test("esVelocidadVientoValida: rango válido", () => {
    assertTrue(esVelocidadVientoValida(10), "10 km/h válida");
    assertTrue(esVelocidadVientoValida(0), "0 km/h válida");
});

test("esVelocidadVientoValida: fuera de rango", () => {
    assertFalse(esVelocidadVientoValida(-5), "negativa");
    assertFalse(esVelocidadVientoValida(250), "mayor que max (200)");
});

test("esDireccionVientoValida: rango válido", () => {
    assertTrue(esDireccionVientoValida(0), "0° válida");
    assertTrue(esDireccionVientoValida(180), "180° válida");
    assertTrue(esDireccionVientoValida(359), "359° válida");
});

test("esDireccionVientoValida: fuera de rango", () => {
    assertFalse(esDireccionVientoValida(-1), "negativa");
    assertFalse(esDireccionVientoValida(361), "mayor que 360");
});

test("esLluviaValida: rango válido", () => {
    assertTrue(esLluviaValida(0), "0 mm válida");
    assertTrue(esLluviaValida(25.5), "25.5 mm válida");
    assertTrue(esLluviaValida(100), "100 mm válida");
});

test("esLluviaValida: fuera de rango", () => {
    assertFalse(esLluviaValida(-5), "negativa");
    assertFalse(esLluviaValida(600), "mayor que max (500)");
});

test("esIndiceUVValido: rango válido", () => {
    assertTrue(esIndiceUVValido(0), "0 válida");
    assertTrue(esIndiceUVValido(8), "8 válida");
    assertTrue(esIndiceUVValido(20), "20 válida");
});

test("esIndiceUVValido: fuera de rango", () => {
    assertFalse(esIndiceUVValido(-1), "negativa");
    assertFalse(esIndiceUVValido(25), "mayor que max (20)");
});

test("validarCondiciones: datos válidos", () => {
    const datos = {
        estacion: "EL_SILO",
        temperatura_celsius: 20,
        humedad_relativa: 50,
    };
    const resultado = validarCondiciones(datos);
    assertEqual(resultado.valido, true, "debe ser válido");
    assertEqual(resultado.errores.length, 0, "sin errores");
});

test("validarCondiciones: estación inválida", () => {
    const datos = {
        estacion: "INVALID",
        temperatura_celsius: 20,
    };
    const resultado = validarCondiciones(datos);
    assertEqual(resultado.valido, false, "debe ser inválido");
    assertTrue(resultado.errores.includes("Estación inválida"), "debe mencionar estación");
});

test("validarCondiciones: temperatura fuera de rango", () => {
    const datos = {
        estacion: "EL_SILO",
        temperatura_celsius: 100,
    };
    const resultado = validarCondiciones(datos);
    assertEqual(resultado.valido, false, "debe ser inválido");
    assertTrue(resultado.errores.includes("Temperatura fuera de rango"), "debe mencionar temperatura");
});

test("validarCondiciones: múltiples errores", () => {
    const datos = {
        estacion: "INVALID",
        temperatura_celsius: 100,
        humedad_relativa: 150,
    };
    const resultado = validarCondiciones(datos);
    assertEqual(resultado.valido, false, "debe ser inválido");
    assertTrue(resultado.errores.length >= 2, "múltiples errores");
});

test("sanitizarString: texto normal", () => {
    assertEqual(sanitizarString("hola"), "hola", "texto simple");
});

test("sanitizarString: espacios", () => {
    assertEqual(sanitizarString("  hola  "), "hola", "trim espacios");
});

test("sanitizarString: trunca longitud", () => {
    const resultado = sanitizarString("hola mundo", 5);
    assertEqual(resultado, "hola ", "trunca a 5 caracteres");
});

test("sanitizarString: no string", () => {
    assertEqual(sanitizarString(null), "", "null devuelve string vacío");
    assertEqual(sanitizarString(123), "", "número devuelve string vacío");
});

test("esEmailValido: emails válidos", () => {
    assertTrue(esEmailValido("user@example.com"), "email estándar");
    assertTrue(esEmailValido("john.doe@example.co.uk"), "email con punto y TLD largo");
});

test("esEmailValido: emails inválidos", () => {
    assertFalse(esEmailValido("invalid"), "sin @");
    assertFalse(esEmailValido("user@"), "sin dominio");
    assertFalse(esEmailValido("user @example.com"), "espacio en usuario");
});

// ============================================================
// EJECUTAR TESTS
// ============================================================

if (typeof module !== "undefined" && module.exports) {
    module.exports = { test, runTests };
} else {
    runTests();
}
