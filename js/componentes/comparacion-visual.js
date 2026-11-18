/*
 * MeteoArchidona · Componente «Comparación visual»
 *
 * Los instrumentos del directo de las cámaras (termómetro, probeta y
 * barra de humedad), uno de cada por estación, para comparar de un
 * vistazo (José, 18-11-2026):
 *
 * - fila alta: los termómetros de todas las estaciones y, a continuación,
 *   las probetas con la lluvia de hoy;
 * - fila más baja: las barras de humedad.
 *
 * Las estaciones no están escritas aquí: se leen de GET /estaciones y
 * sale un instrumento de cada tipo por estación. Cada una se rellena con
 * GET /condiciones-actuales/{codigo} (temperatura_c, lluvia_dia_mm y
 * humedad_pct) y se renueva cada minuto.
 *
 * Mismas escalas y colores que la superposición del directo
 * (api-meteoarchidona, servicios/superposicion_meteorologica_fotograma.py):
 * −20 a 50 °C, 0 a 150 mm con la altura (mm / 150) ^ 0,6 y 0 a 100 %.
 *
 * Botón de maximizar (solo en este componente): pantalla completa de
 * verdad donde el navegador la deja y, donde no (Safari del iPhone),
 * ampliado a toda la ventana. Se sale con el mismo botón o con Esc.
 *
 *     <div data-componente="comparacion-visual"></div>
 *
 *     import {montarComparacionVisual} from "/js/componentes/comparacion-visual.js?v=…";
 *     montarComparacionVisual(hueco);
 *
 * Sin id: se puede poner más de una vez en la misma página.
 *
 * data-incrustado="si": va dentro de otro componente que ya pone la
 * tarjeta y el título (el «Vistazo general», vista Gráfico): sin marco
 * propio y sin el título «Comparación visual».
 */

import {asegurarHoja} from "./comun.js?v=20261104-componentes1";


const HOJA = "/css/comparacion-visual.css?v=20261118-comparacion2";

const CONDICIONES_CADA_MS = 60 * 1000;
const ESTACIONES_CADA_MS = 5 * 60 * 1000;
const ESPERA_MAXIMA_MS = 20000;

const TEMPERATURA_MINIMA = -20;
const TEMPERATURA_MAXIMA = 50;
const LLUVIA_MAXIMA = 150;
const EXPONENTE_LLUVIA = 0.6;
const MARCAS_LLUVIA = [0, 5, 10, 20, 30, 50, 75, 100, 125, 150];

const SVG = "http://www.w3.org/2000/svg";


/* ------------------------------------------------------------
   Utilidades
   ------------------------------------------------------------ */

function crear(etiqueta, clase, texto) {
    const nodo = document.createElement(etiqueta);
    if (clase) nodo.className = clase;
    if (texto !== undefined && texto !== null) nodo.textContent = texto;
    return nodo;
}

function numero(valor) {
    if (valor === null || valor === undefined || valor === "") {
        return null;
    }
    const n = Number(valor);
    return Number.isFinite(n) ? n : null;
}

function proporcion(valor, minimo, maximo) {
    return Math.max(0, Math.min(1, (valor - minimo) / (maximo - minimo)));
}

function formato(valor, unidad, decimales = 1) {
    if (valor === null) {
        return `-- ${unidad}`;
    }
    return `${valor.toFixed(decimales).replace(".", ",")} ${unidad}`;
}

function escapar(texto) {
    return String(texto ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

async function pedir(ruta) {
    const control = new AbortController();
    const reloj = setTimeout(() => control.abort(), ESPERA_MAXIMA_MS);
    try {
        const respuesta = await fetch(`${window.API_BASE || "/api"}${ruta}`, {
            cache: "no-store",
            signal: control.signal
        });
        if (!respuesta.ok) {
            throw new Error(`HTTP ${respuesta.status}`);
        }
        return await respuesta.json();
    } finally {
        clearTimeout(reloj);
    }
}


/*
 * Nombres cortos, como en la tabla del Vistazo general: solo para que
 * quepan bajo cada instrumento. Una estación nueva sin alias sale con su
 * nombre público.
 */
function nombreCorto(nombre) {
    const clave = String(nombre ?? "")
        .trim()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/\s+/g, " ")
        .toUpperCase();
    if (clave.startsWith("EL SILO")) return "El Silo";
    if (clave.startsWith("LOS LLANOS")) return "Los Llanos";
    if (clave.startsWith("SALINAS")) return "Salinas";
    if (clave.includes("PUERTA DE LA HOYA")) return "La Hoya";
    if (clave.startsWith("LA VEGA")) return "La Vega";
    return String(nombre ?? "").trim();
}

/* Letra del nombre según su largo, para que no se salga del instrumento. */
function letraNombre(nombre, normal, ancho) {
    const largo = nombre.length || 1;
    return Math.min(normal, Math.floor(ancho / (largo * 0.58)));
}


/* ------------------------------------------------------------
   Dibujos (SVG con viewBox: se escalan solos al maximizar)
   ------------------------------------------------------------ */

const TEXTO = 'fill="rgba(246,249,252,0.9)" stroke="rgba(7,17,25,0.75)" stroke-width="3" paint-order="stroke" font-family="Arial, sans-serif"';
const VIDRIO = 'fill="rgba(232,243,250,0.19)" stroke="rgba(233,242,248,0.67)"';


function termometro(nombre, temperatura) {
    const cx = 42;
    const arriba = 58;
    const abajo = 372;
    const alto = abajo - arriba;
    const letra = letraNombre(nombre, 16, 112);

    const marcas = [];
    for (let valor = -20; valor <= 50; valor += 5) {
        const y = abajo - (valor - TEMPERATURA_MINIMA) / (TEMPERATURA_MAXIMA - TEMPERATURA_MINIMA) * alto;
        const mayor = valor % 10 === 0;
        marcas.push(
            `<line x1="${cx + 18}" y1="${y}" x2="${cx + 18 + (mayor ? 12 : 6)}" y2="${y}" ` +
            `stroke="${mayor ? "rgba(246,249,252,0.86)" : "rgba(235,246,251,0.52)"}" stroke-width="1.5"/>`
        );
        if (mayor) {
            marcas.push(
                `<text x="${cx + 35}" y="${y}" font-size="13" dominant-baseline="middle" ${TEXTO}>${valor}</text>`
            );
        }
    }

    let mercurio = "";
    if (temperatura !== null) {
        const nivel = abajo - proporcion(temperatura, TEMPERATURA_MINIMA, TEMPERATURA_MAXIMA) * alto;
        mercurio =
            `<rect x="${cx - 6}" y="${nivel}" width="12" height="${abajo + 12 - nivel}" fill="rgba(226,34,31,0.9)"/>` +
            `<line x1="${cx - 4}" y1="${nivel}" x2="${cx - 4}" y2="${abajo + 8}" stroke="rgba(252,119,107,0.65)" stroke-width="2"/>`;
    }

    const bulbo = abajo + 24;

    return `
<svg class="cv-instrumento" viewBox="0 0 120 480" preserveAspectRatio="xMidYMid meet" role="img"
     aria-label="${escapar(`${nombre}: ${formato(temperatura, "°C")}`)}">
    <text x="60" y="24" font-size="${letra}" font-weight="bold" text-anchor="middle" ${TEXTO}>${escapar(nombre)}</text>
    <text x="${cx + 35}" y="${arriba - 20}" font-size="13" dominant-baseline="middle" ${TEXTO}>°C</text>
    <rect x="${cx - 14}" y="${arriba - 8}" width="28" height="${alto + 16}" rx="14" ${VIDRIO} stroke-width="2"/>
    <rect x="${cx - 10}" y="${arriba}" width="20" height="${alto}" rx="10"
          fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.58)" stroke-width="1"/>
    ${mercurio}
    <circle cx="${cx}" cy="${bulbo}" r="24" fill="rgba(230,240,247,0.35)" stroke="rgba(233,242,248,0.67)" stroke-width="3"/>
    <circle cx="${cx}" cy="${bulbo}" r="19" fill="${temperatura !== null ? "rgba(226,34,31,0.9)" : "rgba(150,152,155,0.6)"}"/>
    <ellipse cx="${cx - 8}" cy="${bulbo - 6}" rx="5" ry="6" fill="rgba(255,240,231,0.6)"/>
    ${marcas.join("")}
    <text x="60" y="458" font-size="21" font-weight="bold" text-anchor="middle" ${TEXTO}>${formato(temperatura, "°C")}</text>
</svg>`;
}


function pluviometro(nombre, lluvia) {
    const cx = 70;
    const arriba = 70;
    const abajo = 400;
    const alto = abajo - arriba;
    const radioFondo = 26 * 0.74;
    const radioBoca = 26 * 1.16;
    const letra = letraNombre(nombre, 16, 112);

    const semiancho = (y, margen = 0) => {
        const fraccion = Math.max(0, Math.min(1, (abajo - y) / alto));
        return radioFondo + (radioBoca - radioFondo) * fraccion - margen;
    };
    const yDe = mm => abajo - Math.pow(proporcion(mm, 0, LLUVIA_MAXIMA), EXPONENTE_LLUVIA) * alto;

    let agua = "";
    if (lluvia !== null && lluvia > 0) {
        const fondoAgua = abajo - 4;
        // Con muy poca lluvia, como poco una lámina en el fondo.
        const nivel = Math.min(yDe(lluvia), fondoAgua - 1.5);
        const anchoNivel = semiancho(nivel, 4);
        const anchoFondo = semiancho(fondoAgua, 4);
        const anchoLinea = semiancho(nivel, 5);
        agua =
            `<polygon points="${cx - anchoNivel},${nivel} ${cx + anchoNivel},${nivel} ` +
            `${cx + anchoFondo},${fondoAgua} ${cx - anchoFondo},${fondoAgua}" fill="rgba(37,161,235,0.62)"/>` +
            `<line x1="${cx - anchoLinea}" y1="${nivel}" x2="${cx + anchoLinea}" y2="${nivel}" ` +
            `stroke="rgba(148,232,253,0.91)" stroke-width="2"/>`;
    }

    const marcas = MARCAS_LLUVIA.map(valor => {
        const y = yDe(valor);
        const borde = cx - semiancho(y);
        return (
            `<line x1="${borde + 7}" y1="${y}" x2="${borde + 20}" y2="${y}" stroke="rgba(246,249,252,0.86)" stroke-width="1.3"/>` +
            `<text x="${borde - 8}" y="${y}" font-size="12" text-anchor="end" dominant-baseline="middle" ${TEXTO}>${valor}</text>`
        );
    }).join("");

    return `
<svg class="cv-instrumento" viewBox="0 0 120 480" preserveAspectRatio="xMidYMid meet" role="img"
     aria-label="${escapar(`${nombre}: ${formato(lluvia, "mm")} hoy`)}">
    <text x="60" y="24" font-size="${letra}" font-weight="bold" text-anchor="middle" ${TEXTO}>${escapar(nombre)}</text>
    <polygon points="${cx - radioBoca},${arriba} ${cx + radioBoca},${arriba} ${cx + radioFondo},${abajo} ${cx - radioFondo},${abajo}"
             ${VIDRIO} stroke-width="3" stroke-linejoin="round"/>
    <ellipse cx="${cx}" cy="${arriba + 2}" rx="${radioBoca + 4}" ry="10" fill="rgba(246,249,251,0.23)"
             stroke="rgba(233,242,248,0.67)" stroke-width="2"/>
    <ellipse cx="${cx}" cy="${abajo + 4}" rx="${radioFondo + 6}" ry="10" fill="rgba(220,233,241,0.3)"
             stroke="rgba(233,242,248,0.67)" stroke-width="2"/>
    ${agua}
    ${marcas}
    <text x="${cx}" y="${arriba + 24}" font-size="12" text-anchor="middle" ${TEXTO}>mm</text>
    <text x="60" y="458" font-size="21" font-weight="bold" text-anchor="middle" ${TEXTO}>${formato(lluvia, "mm")}</text>
</svg>`;
}


function barraHumedad(nombre, humedad) {
    const x1 = 34;
    const x2 = 300;
    const y1 = 36;
    const y2 = 58;
    const letra = letraNombre(nombre, 16, 160);

    let relleno = "";
    if (humedad !== null && humedad > 0) {
        const ancho = (x2 - x1) * proporcion(humedad, 0, 100);
        relleno = `<rect x="${x1}" y="${y1}" width="${ancho}" height="${y2 - y1}" rx="${Math.min(10, ancho / 2)}" fill="rgba(61,197,65,0.8)"/>`;
        if (ancho >= 10) {
            relleno += `<line x1="${x1 + 4}" y1="${y1 + 4}" x2="${x1 + ancho - 4}" y2="${y1 + 4}" stroke="rgba(210,255,186,0.6)" stroke-width="2"/>`;
        }
    }

    const marcas = [0, 20, 40, 60, 80, 100].map(valor => {
        const x = x1 + (x2 - x1) * valor / 100;
        return (
            `<line x1="${x}" y1="${y2 + 5}" x2="${x}" y2="${y2 + 11}" stroke="rgba(246,249,252,0.86)" stroke-width="2"/>` +
            `<text x="${x}" y="${y2 + 25}" font-size="12" text-anchor="middle" ${TEXTO}>${valor}</text>`
        );
    }).join("");

    return `
<svg class="cv-instrumento cv-instrumento-humedad" viewBox="0 0 320 96" preserveAspectRatio="xMidYMid meet" role="img"
     aria-label="${escapar(`${nombre}: humedad ${formato(humedad, "%", 0)}`)}">
    <text x="${x1}" y="22" font-size="${letra}" font-weight="bold" ${TEXTO}>${escapar(nombre)}</text>
    <text x="${x2}" y="22" font-size="19" font-weight="bold" text-anchor="end" ${TEXTO}>${formato(humedad, "%", 0)}</text>
    <rect x="${x1 - 3}" y="${y1 - 3}" width="${x2 - x1 + 6}" height="${y2 - y1 + 6}" rx="14"
          fill="rgba(225,234,243,0.23)" stroke="rgba(233,242,248,0.67)" stroke-width="2"/>
    ${relleno}
    <text x="${x1 - 10}" y="${(y1 + y2) / 2}" font-size="16" font-weight="bold" text-anchor="end" dominant-baseline="middle" ${TEXTO}>%</text>
    ${marcas}
</svg>`;
}


/* ------------------------------------------------------------
   Maximizar
   ------------------------------------------------------------ */

function elementoPantallaCompleta() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
}

function prepararMaximizar(raiz, boton) {

    const ponerEstado = () => {
        const dentro = elementoPantallaCompleta() === raiz || raiz.classList.contains("cv-maximizado");
        raiz.classList.toggle("cv-ampliado", dentro);
        boton.setAttribute("aria-pressed", dentro ? "true" : "false");
        boton.setAttribute("aria-label", dentro ? "Salir de pantalla completa" : "Pantalla completa");
        boton.title = dentro ? "Salir de pantalla completa (Esc)" : "Pantalla completa";
        boton.textContent = dentro ? "✕" : "⛶";
    };

    // Plan B: ampliado a toda la ventana (iPhone y navegadores sin la API).
    const ampliarEnVentana = activar => {
        raiz.classList.toggle("cv-maximizado", activar);
        document.documentElement.classList.toggle("cv-sin-scroll", activar);
        ponerEstado();
    };

    boton.addEventListener("click", async () => {
        if (raiz.classList.contains("cv-maximizado")) {
            ampliarEnVentana(false);
            return;
        }
        if (elementoPantallaCompleta()) {
            try {
                await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
            } catch (error) {
                console.warn("Comparación visual: no se pudo salir de pantalla completa", error);
            }
            return;
        }
        const pedirPantalla = raiz.requestFullscreen || raiz.webkitRequestFullscreen;
        if (pedirPantalla && (document.fullscreenEnabled || document.webkitFullscreenEnabled)) {
            try {
                await pedirPantalla.call(raiz);
                return;
            } catch (error) {
                console.warn("Comparación visual: pantalla completa denegada; se amplía en la ventana", error);
            }
        }
        ampliarEnVentana(true);
    });

    document.addEventListener("fullscreenchange", ponerEstado);
    document.addEventListener("webkitfullscreenchange", ponerEstado);
    document.addEventListener("keydown", evento => {
        if (evento.key === "Escape" && raiz.classList.contains("cv-maximizado")) {
            ampliarEnVentana(false);
        }
    });

    ponerEstado();
}


/* ------------------------------------------------------------
   Montaje y datos
   ------------------------------------------------------------ */

export function montarComparacionVisual(raiz) {

    asegurarHoja(HOJA);

    const incrustado = String(raiz.dataset.incrustado || "").toLowerCase() === "si";

    raiz.classList.add("cv-componente");
    raiz.classList.toggle("cv-incrustado", incrustado);
    raiz.textContent = "";
    raiz.setAttribute("aria-label", "Comparación visual de las estaciones");

    const cabecera = crear("div", "cv-cabecera");
    const textos = crear("div", "cv-textos");
    if (!incrustado) {
        textos.append(crear("h2", "cv-titulo", "Comparación visual"));
    }
    textos.append(
        crear("p", "cv-subtitulo", "Temperatura, lluvia de hoy y humedad de cada estación")
    );
    const boton = crear("button", "cv-boton-maximizar");
    boton.type = "button";
    cabecera.append(textos, boton);

    const filaAlta = crear("div", "cv-fila cv-fila-alta");
    const termometros = crear("div", "cv-grupo cv-grupo-termometros");
    const probetas = crear("div", "cv-grupo cv-grupo-probetas");
    filaAlta.append(termometros, probetas);

    const filaHumedad = crear("div", "cv-fila cv-fila-humedad");

    const estado = crear("p", "cv-estado", "Cargando estaciones…");

    raiz.append(cabecera, filaAlta, filaHumedad, estado);

    prepararMaximizar(raiz, boton);

    let estaciones = [];
    let ultimaLista = 0;

    const pintar = (lecturas) => {
        raiz.style.setProperty("--cv-estaciones", String(Math.max(1, lecturas.length)));
        termometros.innerHTML = lecturas.map(l => termometro(l.nombre, l.temperatura)).join("");
        probetas.innerHTML = lecturas.map(l => pluviometro(l.nombre, l.lluvia)).join("");
        filaHumedad.innerHTML = lecturas.map(l => barraHumedad(l.nombre, l.humedad)).join("");
    };

    const leerEstaciones = async () => {
        const datos = await pedir("/estaciones");
        const vistos = new Set();
        estaciones = (Array.isArray(datos?.estaciones) ? datos.estaciones : [])
            .map(e => ({
                codigo: String(e?.codigo ?? "").trim().toUpperCase(),
                nombre: nombreCorto(e?.nombre_publico || e?.codigo)
            }))
            .filter(e => e.codigo && !vistos.has(e.codigo) && vistos.add(e.codigo));
        ultimaLista = Date.now();
    };

    const renovar = async () => {
        try {
            if (!estaciones.length || Date.now() - ultimaLista >= ESTACIONES_CADA_MS) {
                await leerEstaciones();
            }
        } catch (error) {
            console.error("Comparación visual: no se pudo leer el catálogo de estaciones", error);
            if (!estaciones.length) {
                estado.textContent = "Las estaciones no están disponibles en este momento.";
                estado.hidden = false;
                return;
            }
        }

        if (!estaciones.length) {
            estado.textContent = "No hay estaciones que mostrar.";
            estado.hidden = false;
            return;
        }

        const lecturas = await Promise.all(estaciones.map(async estacion => {
            try {
                const datos = await pedir(`/condiciones-actuales/${encodeURIComponent(estacion.codigo)}`);
                return {
                    nombre: estacion.nombre,
                    temperatura: numero(datos?.temperatura_c),
                    lluvia: numero(datos?.lluvia_dia_mm),
                    humedad: numero(datos?.humedad_pct)
                };
            } catch (error) {
                console.error(`Comparación visual: sin datos de ${estacion.codigo}`, error);
                return {nombre: estacion.nombre, temperatura: null, lluvia: null, humedad: null};
            }
        }));

        estado.hidden = true;
        pintar(lecturas);
    };

    renovar();
    setInterval(renovar, CONDICIONES_CADA_MS);
}


/* Fin de fichero: js/componentes/comparacion-visual.js */
