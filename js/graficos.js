/*
============================================================
GRÁFICOS DE LA PORTADA CON DATOS REALES
============================================================

Dibuja los dos gráficos de la portada a partir del histórico
que sirve la API:

- Temperatura de las últimas 24 horas, una línea por estación.
- Lluvia de los últimos 7 días, una barra por día.

Los puntos que hay escritos a mano en index.html son de
muestra. Este archivo los sustituye por los reales; si la API
no puede dar el histórico, los deja como están y escribe un
aviso debajo del gráfico para que quede claro que lo que se
ve no son datos.

------------------------------------------------------------
LO QUE HACE FALTA EN LA API
------------------------------------------------------------

    GET /historico/{codigo_estacion}?desde=&hasta=&resolucion=

Público y de solo lectura. Hoy solo existe
/admin/weatherlink/historico/{station_id}, que pide clave y
no se puede llamar desde el navegador sin publicarla.

Parámetros:

  codigo_estacion  El mismo código funcional que usa
                   /condiciones-actuales: EL_SILO, LOS_LLANOS.
  desde, hasta     Instantes ISO-8601 en UTC con Z
                   ("2026-09-09T13:00:00Z"). Ambos opcionales:
                   sin ellos, las últimas 24 horas.
  resolucion       "hora" (por defecto) o "dia".

Respuesta 200:

    {
      "codigo_estacion": "EL_SILO",
      "nombre_estacion": "El Silo",
      "resolucion": "hora",
      "registros": [
        {
          "instante": "2026-09-09T13:00:00Z",
          "temperatura_c": 27.9,
          "lluvia_mm": 0.0
        }
      ]
    }

  registros    Ordenados del más antiguo al más reciente.
               Puede venir vacío (estación nueva, o hueco de
               datos): eso no es un error, es un 200 con
               "registros": [].
  instante     Con resolucion=hora, el comienzo de la hora.
               Con resolucion=dia, medianoche hora local de
               ese día.
  temperatura_c  Media del intervalo, o null si no hay dato.
  lluvia_mm      Lluvia acumulada DENTRO del intervalo, no el
                 contador del día. Con resolucion=dia es el
                 total del día. Nunca null: si no llovió, 0.

Cualquier campo que no sea instante puede faltar o venir a
null y el gráfico lo salta; así la API puede añadir métricas
(humedad, viento) sin tocar esto.

Errores: 404 si el código de estación no existe, 422 si las
fechas están mal. Nada de 200 con un cuerpo de error dentro.
============================================================
*/

const ESTACIONES_GRAFICO = [
    { codigo: "EL_SILO", clase: "linea-silo" },
    { codigo: "LOS_LLANOS", clase: "linea-llanos" },
];

// La lluvia se dibuja de una sola estación: dos juegos de barras
// en un gráfico de 500 de ancho no se leen. El Silo es la del
// casco urbano.
const ESTACION_LLUVIA = "EL_SILO";

const HORAS_TEMPERATURA = 24;
const DIAS_LLUVIA = 7;

// Márgenes dentro del viewBox del SVG, para que la línea o la
// barra no se coman el borde de la tarjeta.
const MARGEN_TEMPERATURA = { arriba: 18, abajo: 18 };
const MARGEN_LLUVIA = { arriba: 18, abajo: 8 };

const AVISO_SIN_HISTORICO = "Datos de muestra · la API todavía no sirve el histórico";

const MILISEGUNDOS_POR_HORA = 3600 * 1000;

/* ---------------------------------------------------------
   PETICIONES
   --------------------------------------------------------- */

function baseApi() {
    return window.API_BASE || "";
}

/**
 * Número, o null si no lo es.
 *
 * No vale usar Number() a secas: Number(null) y Number("") dan
 * 0, así que un "temperatura_c": null se dibujaría como 0 °C, y
 * en septiembre un cero pasa por dato bueno sin cantar nada.
 */
function numeroONulo(valor) {
    if (typeof valor !== "number") {
        return null;
    }

    return Number.isFinite(valor) ? valor : null;
}

function instanteIso(fecha) {
    return fecha.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/**
 * Pide el histórico de una estación. Devuelve el array de
 * registros, o null si no se ha podido conseguir (la API no
 * tiene el endpoint, no responde, o responde con error).
 *
 * Null y [] no son lo mismo: [] es "la API contesta y no hay
 * datos" y el gráfico se dibuja vacío; null es "no se sabe" y
 * el gráfico se queda con la muestra y el aviso.
 */
async function pedirHistorico(codigoEstacion, desde, hasta, resolucion) {
    const parametros = new URLSearchParams({
        desde: instanteIso(desde),
        hasta: instanteIso(hasta),
        resolucion,
    });

    const direccion = `${baseApi()}/historico/${codigoEstacion}?${parametros}`;

    try {
        const respuesta = await fetch(direccion, { headers: { Accept: "application/json" } });

        if (!respuesta.ok) {
            return null;
        }

        const datos = await respuesta.json();

        return Array.isArray(datos?.registros) ? datos.registros : null;
    } catch (error) {
        return null;
    }
}

/* ---------------------------------------------------------
   DIBUJO
   --------------------------------------------------------- */

function crearSvg(etiqueta, atributos) {
    const elemento = document.createElementNS("http://www.w3.org/2000/svg", etiqueta);

    for (const [nombre, valor] of Object.entries(atributos)) {
        elemento.setAttribute(nombre, String(valor));
    }

    return elemento;
}

function anchoDelSvg(svg) {
    // El viewBox es "0 0 ancho alto".
    const partes = (svg.getAttribute("viewBox") || "").split(/\s+/);

    return {
        ancho: Number(partes[2]) || 600,
        alto: Number(partes[3]) || 190,
    };
}

function dibujarRejilla(svg, ancho, alto) {
    // Tres líneas horizontales repartidas, como en la muestra.
    for (const fraccion of [0.25, 0.5, 0.75]) {
        svg.append(
            crearSvg("line", {
                class: "rejilla",
                x1: 0,
                y1: Math.round(alto * fraccion),
                x2: ancho,
                y2: Math.round(alto * fraccion),
            }),
        );
    }
}

function escribirNota(idNota, texto) {
    const nota = document.getElementById(idNota);

    if (nota) {
        nota.textContent = texto;
    }
}

/* ---------------------------------------------------------
   TEMPERATURA
   --------------------------------------------------------- */

export function extremosTemperatura(series) {
    let minimo = Infinity;
    let maximo = -Infinity;

    for (const puntos of series) {
        for (const punto of puntos) {
            minimo = Math.min(minimo, punto.valor);
            maximo = Math.max(maximo, punto.valor);
        }
    }

    if (!Number.isFinite(minimo) || !Number.isFinite(maximo)) {
        return null;
    }

    // Un día plano dejaría minimo === maximo y una división por
    // cero: se abre un grado a cada lado.
    if (maximo - minimo < 1) {
        return { minimo: minimo - 1, maximo: maximo + 1 };
    }

    return { minimo, maximo };
}

export function registrosATemperaturas(registros) {
    const puntos = [];

    for (const registro of registros) {
        const instante = Date.parse(registro?.instante);
        const valor = numeroONulo(registro?.temperatura_c);

        if (Number.isFinite(instante) && valor !== null) {
            puntos.push({ instante, valor });
        }
    }

    return puntos;
}

function dibujarTemperatura(svg, series) {
    const { ancho, alto } = anchoDelSvg(svg);
    const extremos = extremosTemperatura(series.map((serie) => serie.puntos));

    svg.replaceChildren();
    dibujarRejilla(svg, ancho, alto);

    if (!extremos) {
        return;
    }

    // El eje X va del instante más antiguo al más reciente de
    // todas las series juntas, para que las dos estaciones
    // queden alineadas entre sí.
    const instantes = series.flatMap((serie) => serie.puntos.map((punto) => punto.instante));
    const primero = Math.min(...instantes);
    const ultimo = Math.max(...instantes);
    const duracion = ultimo - primero || 1;

    const utilAlto = alto - MARGEN_TEMPERATURA.arriba - MARGEN_TEMPERATURA.abajo;
    const rango = extremos.maximo - extremos.minimo;

    for (const serie of series) {
        if (serie.puntos.length < 2) {
            continue;
        }

        const coordenadas = serie.puntos.map((punto) => {
            const x = ((punto.instante - primero) / duracion) * ancho;
            // El SVG cuenta la Y hacia abajo, así que la
            // temperatura alta tiene que dar una Y pequeña.
            const y =
                MARGEN_TEMPERATURA.arriba +
                (1 - (punto.valor - extremos.minimo) / rango) * utilAlto;

            return `${x.toFixed(1)},${y.toFixed(1)}`;
        });

        svg.append(
            crearSvg("polyline", {
                class: serie.clase,
                points: coordenadas.join(" "),
            }),
        );
    }
}

/* ---------------------------------------------------------
   LLUVIA
   --------------------------------------------------------- */

export function registrosALluvia(registros) {
    const dias = [];

    for (const registro of registros) {
        const instante = Date.parse(registro?.instante);
        const valor = numeroONulo(registro?.lluvia_mm);

        if (Number.isFinite(instante) && valor !== null && valor >= 0) {
            dias.push({ instante, valor });
        }
    }

    return dias;
}

const DIAS_SEMANA = ["D", "L", "M", "X", "J", "V", "S"];

/**
 * Iniciales de los días bajo las barras. Fuera del SVG: ese se
 * estira sin conservar la proporción y el texto saldría
 * deformado. Una columna de rejilla por barra las alinea.
 */
function dibujarDiasLluvia(contenedor, dias) {
    if (!contenedor) {
        return;
    }

    contenedor.style.gridTemplateColumns = `repeat(${dias.length}, 1fr)`;
    contenedor.replaceChildren(
        ...dias.map((dia) => {
            const etiqueta = document.createElement("span");

            etiqueta.textContent = DIAS_SEMANA[new Date(dia.instante).getDay()];
            return etiqueta;
        }),
    );
}

function dibujarLluvia(svg, dias) {
    const { ancho, alto } = anchoDelSvg(svg);

    svg.replaceChildren();
    dibujarRejilla(svg, ancho, alto);

    if (dias.length === 0) {
        return;
    }

    const utilAlto = alto - MARGEN_LLUVIA.arriba - MARGEN_LLUVIA.abajo;
    const baseY = alto - MARGEN_LLUVIA.abajo;

    // La escala se calcula sobre el día más lluvioso, con un
    // mínimo de 5 mm: si no, una semana de 0,2 mm dibujaría
    // barras enormes y parecería un diluvio.
    const maximo = Math.max(5, ...dias.map((dia) => dia.valor));

    const paso = ancho / dias.length;
    const anchoBarra = paso * 0.55;

    for (const [indice, dia] of dias.entries()) {
        const x = indice * paso + (paso - anchoBarra) / 2;
        const altoBarra = (dia.valor / maximo) * utilAlto;

        // Un día sin lluvia deja una línea fina en la base en
        // vez de nada: así se ve que el día está medido.
        const altoDibujado = dia.valor > 0 ? Math.max(2, altoBarra) : 1;

        svg.append(
            crearSvg("rect", {
                class: "barra",
                x: x.toFixed(1),
                y: (baseY - altoDibujado).toFixed(1),
                width: anchoBarra.toFixed(1),
                height: altoDibujado.toFixed(1),
            }),
        );
    }
}

/* ---------------------------------------------------------
   ARRANQUE
   --------------------------------------------------------- */

async function cargarGraficoTemperatura() {
    const svg = document.getElementById("grafico-temperatura");

    if (!svg) {
        return;
    }

    const hasta = new Date();
    const desde = new Date(hasta.getTime() - HORAS_TEMPERATURA * MILISEGUNDOS_POR_HORA);

    const respuestas = await Promise.all(
        ESTACIONES_GRAFICO.map((estacion) => pedirHistorico(estacion.codigo, desde, hasta, "hora")),
    );

    // Con que una estación conteste ya se dibuja: si una está
    // caída no se pierde la otra.
    if (respuestas.every((registros) => registros === null)) {
        escribirNota("nota-grafico-temperatura", AVISO_SIN_HISTORICO);
        return;
    }

    const series = ESTACIONES_GRAFICO.map((estacion, indice) => ({
        clase: estacion.clase,
        puntos: registrosATemperaturas(respuestas[indice] || []),
    }));

    dibujarTemperatura(svg, series);
    escribirNota("nota-grafico-temperatura", "");
}

async function cargarGraficoLluvia() {
    const svg = document.getElementById("grafico-lluvia");

    if (!svg) {
        return;
    }

    const hasta = new Date();
    const desde = new Date(hasta.getTime() - DIAS_LLUVIA * 24 * MILISEGUNDOS_POR_HORA);

    const registros = await pedirHistorico(ESTACION_LLUVIA, desde, hasta, "dia");

    if (registros === null) {
        escribirNota("nota-grafico-lluvia", AVISO_SIN_HISTORICO);
        return;
    }

    const dias = registrosALluvia(registros);

    dibujarLluvia(svg, dias);
    dibujarDiasLluvia(document.getElementById("dias-grafico-lluvia"), dias);
    escribirNota("nota-grafico-lluvia", "");
}

export function iniciarGraficos() {
    // Cada gráfico va por su cuenta: que uno falle no deja al
    // otro sin dibujar.
    cargarGraficoTemperatura();
    cargarGraficoLluvia();
}

// El guardia es para los tests: corren en Node, importan las
// funciones de cálculo y ahí no hay document.
if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciarGraficos);
    } else {
        iniciarGraficos();
    }
}
