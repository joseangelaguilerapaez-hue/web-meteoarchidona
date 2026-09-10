/* ============================================================
   TESTS - Gráficos de la portada
   ============================================================

   Solo las funciones que convierten la respuesta de la API en
   puntos y la escala del eje. El dibujo del SVG necesita DOM y
   aquí no hay.
   ============================================================ */

import { extremosTemperatura, registrosATemperaturas, registrosALluvia } from "../js/graficos.js";

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
    console.log("🧪 Gráficos - Ejecutando tests...\n");

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

    if (failed > 0 && typeof process !== "undefined") {
        process.exitCode = 1;
    }
}

// ============================================================
// TESTS
// ============================================================

test("registrosATemperaturas: convierte un registro bueno", () => {
    const puntos = registrosATemperaturas([
        { instante: "2026-09-10T08:00:00Z", temperatura_c: 21.5 },
    ]);

    assertEqual(puntos.length, 1, "debería quedar un punto");
    assertEqual(puntos[0].valor, 21.5, "valor");
    assertEqual(puntos[0].instante, Date.parse("2026-09-10T08:00:00Z"), "instante");
});

test("registrosATemperaturas: salta null sin convertirlo en 0", () => {
    const puntos = registrosATemperaturas([
        { instante: "2026-09-10T08:00:00Z", temperatura_c: null },
        { instante: "2026-09-10T09:00:00Z", temperatura_c: 22 },
    ]);

    assertEqual(puntos.length, 1, "el null se descarta, no vale como 0 °C");
    assertEqual(puntos[0].valor, 22, "sobrevive el bueno");
});

test("registrosATemperaturas: salta el campo ausente", () => {
    const puntos = registrosATemperaturas([{ instante: "2026-09-10T08:00:00Z" }]);

    assertEqual(puntos.length, 0, "sin temperatura no hay punto");
});

test("registrosATemperaturas: salta el instante ilegible", () => {
    const puntos = registrosATemperaturas([{ instante: "ayer por la tarde", temperatura_c: 20 }]);

    assertEqual(puntos.length, 0, "sin instante no se puede colocar en el eje");
});

test("registrosATemperaturas: acepta bajo cero", () => {
    const puntos = registrosATemperaturas([
        { instante: "2026-01-10T06:00:00Z", temperatura_c: -3.4 },
    ]);

    assertEqual(puntos[0].valor, -3.4, "una helada es un dato válido");
});

test("extremosTemperatura: mínimo y máximo de varias series", () => {
    const extremos = extremosTemperatura([
        [{ valor: 12 }, { valor: 25 }],
        [{ valor: 9 }, { valor: 21 }],
    ]);

    assertEqual(extremos.minimo, 9, "mínimo");
    assertEqual(extremos.maximo, 25, "máximo");
});

test("extremosTemperatura: sin datos devuelve null", () => {
    assertEqual(extremosTemperatura([]), null, "series vacías");
    assertEqual(extremosTemperatura([[], []]), null, "series sin puntos");
});

test("extremosTemperatura: abre el rango cuando es plano", () => {
    const extremos = extremosTemperatura([[{ valor: 20 }, { valor: 20 }]]);

    assertTrue(
        extremos.maximo - extremos.minimo >= 2,
        "un rango de 0 daría una división por cero al escalar",
    );
});

test("registrosALluvia: pasa el día seco como 0", () => {
    const dias = registrosALluvia([{ instante: "2026-09-10T00:00:00Z", lluvia_mm: 0 }]);

    assertEqual(dias.length, 1, "un día sin lluvia sigue siendo un día medido");
    assertEqual(dias[0].valor, 0, "valor");
});

test("registrosALluvia: descarta negativos", () => {
    const dias = registrosALluvia([{ instante: "2026-09-10T00:00:00Z", lluvia_mm: -2 }]);

    assertEqual(dias.length, 0, "no se puede desllover");
});

test("registrosALluvia: descarta null", () => {
    const dias = registrosALluvia([{ instante: "2026-09-10T00:00:00Z", lluvia_mm: null }]);

    assertEqual(dias.length, 0, "null no es 0 mm");
});

test("registrosALluvia: mantiene el orden que manda la API", () => {
    const dias = registrosALluvia([
        { instante: "2026-09-08T00:00:00Z", lluvia_mm: 1 },
        { instante: "2026-09-09T00:00:00Z", lluvia_mm: 5 },
        { instante: "2026-09-10T00:00:00Z", lluvia_mm: 0 },
    ]);

    assertEqual(dias.length, 3, "tres días");
    assertTrue(
        dias[0].instante < dias[1].instante && dias[1].instante < dias[2].instante,
        "las barras se dibujan en el orden del array",
    );
});

runTests();
