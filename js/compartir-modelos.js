/*
 * MeteoArchidona · Compartir en Facebook el resumen de los modelos
 *
 * Decisiones de José del 3-11-2026:
 *
 * - Botón solo para administradores (sesión de Administración abierta en
 *   esta pestaña), en el resumen de Predicción → Modelos numéricos.
 * - Facebook no admite HTML ni deja que una web le escriba el texto: el
 *   texto del resumen se copia al portapapeles y las gráficas van como
 *   fotos. En el móvil se abre el menú de compartir del teléfono con las
 *   fotos ya puestas; se elige Facebook y se pega el texto. En el
 *   ordenador, se descargan las fotos y el texto queda copiado.
 * - Gráficas: El Silo (el punto del resumen), consenso de los modelos, la
 *   temperatura a todas las alturas (2 m, 925, 850, 700 y 500 hPa). Cada
 *   una lleva debajo la lluvia y, si la hay, la nieve, como en la web.
 *
 * Las gráficas se dibujan con el mismo componente de la web, fuera de la
 * vista, y se pasan de SVG a PNG en el navegador. Sin librerías.
 *
 * Se prepara en dos pasos (Preparar y Compartir) porque el teléfono solo
 * deja abrir el menú de compartir justo después de un toque, y dibujar
 * las cinco gráficas lleva unos segundos.
 */

import {montarModelosNumericos} from "./modelos-numericos.js?v=20261103-compartir2";


const CLAVE_TOKEN = "meteoarchidona_admin_token";
const CLAVE_EXPIRACION = "meteoarchidona_admin_expira_en";

const PUNTO = "EL_SILO";
const NOMBRE_PUNTO = "El Silo (Archidona)";

const GRAFICAS = [
    {variable: "TEMPERATURA_2M", titulo: "Temperatura a 2 m (superficie, orientativa)", fichero: "2m"},
    {variable: "TEMPERATURA_925_HPA", titulo: "Temperatura a 925 hPa (unos 750 m)", fichero: "925hpa"},
    {variable: "TEMPERATURA_850_HPA", titulo: "Temperatura a 850 hPa (unos 1500 m)", fichero: "850hpa"},
    {variable: "TEMPERATURA_700_HPA", titulo: "Temperatura a 700 hPa (unos 3000 m)", fichero: "700hpa"},
    {variable: "TEMPERATURA_500_HPA", titulo: "Temperatura a 500 hPa (unos 5500 m)", fichero: "500hpa"}
];

const ANCHO_GRAFICA = 1000;
const ESCALA = 2;
const SEGUNDOS_ESPERA = 20;

// Propiedades que hay que llevar al SVG suelto: fuera de la página no
// tiene las hojas de estilo ni las variables de color.
const PROPIEDADES_SVG = [
    "fill", "fill-opacity", "stroke", "stroke-width", "stroke-opacity",
    "stroke-dasharray", "stroke-linecap", "stroke-linejoin", "opacity",
    "font-family", "font-size", "font-weight", "text-anchor",
    "dominant-baseline", "display", "visibility"
];


function esAdministrador() {
    try {
        const token = sessionStorage.getItem(CLAVE_TOKEN);
        const expira = Number(sessionStorage.getItem(CLAVE_EXPIRACION));
        return Boolean(token) && Number.isFinite(expira) && expira > Date.now() / 1000;
    } catch {
        return false;
    }
}


function crear(etiqueta, clase, texto) {
    const elemento = document.createElement(etiqueta);
    if (clase) elemento.className = clase;
    if (texto !== undefined) elemento.textContent = texto;
    return elemento;
}


function color(variable, respaldo) {
    const valor = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
    return valor || respaldo;
}


/* ------------------------------------------------------------
   Texto
   ------------------------------------------------------------ */

function textoPublicacion(texto) {
    return [
        "Tendencia de los próximos 15 días en Archidona",
        "",
        texto.trim(),
        "",
        // Sin decir que el texto es automático (José, 3-11-2026).
        `Las gráficas, de ${NOMBRE_PUNTO}: temperatura a cada altura ` +
        "(media de cada modelo y el consenso) y, debajo, la lluvia.",
        "",
        // Aviso de José del 3-11-2026.
        "⚠️ Esta tendencia no es definitiva. Los modelos se actualizan varias veces al día, " +
        "normalmente cada 6 horas, y con cada nueva salida las cifras pueden cambiar, sobre todo " +
        "en los días más lejanos. En meteoarchidona.com/prediccion la tienes siempre al día, " +
        "con el resumen y las gráficas de la última actualización."
    ].join("\n");
}


/* ------------------------------------------------------------
   Gráficas: componente fuera de la vista y de SVG a PNG
   ------------------------------------------------------------ */

function esperarGrafica(hueco) {
    return new Promise((resolver, rechazar) => {
        const limite = Date.now() + SEGUNDOS_ESPERA * 1000;
        const mirar = () => {
            const grafica = hueco.querySelector(".mn-lienzo svg.mn-grafica");
            const aviso = hueco.querySelector(".mn-aviso:not([hidden])");
            if (grafica && !hueco.querySelector(".mn-lienzo.mn-cargando")) {
                resolver(grafica);
            } else if (aviso) {
                rechazar(new Error(aviso.textContent));
            } else if (Date.now() > limite) {
                rechazar(new Error("Las gráficas tardan demasiado en llegar."));
            } else {
                window.setTimeout(mirar, 150);
            }
        };
        mirar();
    });
}


function svgSuelto(original) {
    const copia = original.cloneNode(true);
    const originales = [original, ...original.querySelectorAll("*")];
    const copias = [copia, ...copia.querySelectorAll("*")];

    originales.forEach((elemento, indice) => {
        const calculado = getComputedStyle(elemento);
        const estilo = PROPIEDADES_SVG
            .map((propiedad) => `${propiedad}:${calculado.getPropertyValue(propiedad)}`)
            .join(";");
        copias[indice].setAttribute("style", estilo);
    });

    copia.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    return new XMLSerializer().serializeToString(copia);
}


function cargarImagen(fuente) {
    return new Promise((resolver, rechazar) => {
        const imagen = new Image();
        imagen.onload = () => resolver(imagen);
        imagen.onerror = () => rechazar(new Error("No se pudo convertir la gráfica."));
        imagen.src = fuente;
    });
}


function leyendaDe(hueco) {
    return [...hueco.querySelectorAll(".mn-leyenda-item")]
        .map((item) => {
            const muestra = item.querySelector(".mn-muestra");
            const casilla = item.querySelector("input[type=checkbox]");
            return {
                // Sin muestra (el contador de escenarios), solo el texto.
                color: muestra ? getComputedStyle(muestra).backgroundColor : null,
                // Partes con espacio entre ellas («Escenarios modelizados 161 de 161»).
                texto: ([...item.children].map((parte) => parte.textContent.trim()).filter(Boolean).join(" ")
                    || item.textContent).replace(/\s+/g, " ").trim(),
                // Los modelos desmarcados no están en la gráfica.
                apagado: Boolean(casilla && !casilla.checked)
            };
        })
        .filter((item) => item.texto && !item.apagado);
}


async function lienzoGrafica(grafica, svg, leyenda) {
    const fondo = color("--card", "#111e2e");
    const texto = color("--text", "#f6f8fb");
    const suave = color("--muted", "#aabdd0");
    const acento = color("--accent", "#f0a500");
    const fuente = getComputedStyle(document.body).fontFamily || "sans-serif";

    const anchoSvg = Number(svg.getAttribute("width")) || ANCHO_GRAFICA;
    const altoSvg = Number(svg.getAttribute("height")) || 450;
    const margen = 28;
    const ancho = anchoSvg + margen * 2;

    // Leyenda en filas.
    const medir = document.createElement("canvas").getContext("2d");
    medir.font = `15px ${fuente}`;
    const filas = [[]];
    let anchoFila = 0;
    for (const item of leyenda) {
        const anchoItem = (item.color ? 26 : 0) + medir.measureText(item.texto).width + 22;
        if (anchoFila + anchoItem > anchoSvg && filas[filas.length - 1].length) {
            filas.push([]);
            anchoFila = 0;
        }
        filas[filas.length - 1].push(item);
        anchoFila += anchoItem;
    }
    const altoLeyenda = leyenda.length ? filas.length * 24 + 8 : 0;

    const arriba = 92;
    const alto = arriba + altoLeyenda + altoSvg + 52;

    const lienzo = document.createElement("canvas");
    lienzo.width = ancho * ESCALA;
    lienzo.height = alto * ESCALA;
    const dibujo = lienzo.getContext("2d");
    dibujo.scale(ESCALA, ESCALA);

    dibujo.fillStyle = fondo;
    dibujo.fillRect(0, 0, ancho, alto);

    dibujo.textBaseline = "alphabetic";
    dibujo.fillStyle = acento;
    dibujo.font = `700 15px ${fuente}`;
    dibujo.fillText("METEOARCHIDONA · MODELOS POR CONJUNTOS · 15 DÍAS", margen, 34);
    dibujo.fillStyle = texto;
    dibujo.font = `700 24px ${fuente}`;
    dibujo.fillText(grafica.titulo, margen, 64);
    dibujo.fillStyle = suave;
    dibujo.font = `15px ${fuente}`;
    dibujo.fillText(`${NOMBRE_PUNTO} · consenso de los modelos`, margen, 84);

    let y = arriba + 14;
    for (const fila of filas) {
        let x = margen;
        for (const item of fila) {
            const sangria = item.color ? 26 : 0;
            if (item.color) {
                dibujo.fillStyle = item.color;
                dibujo.fillRect(x, y - 9, 18, 4);
            }
            dibujo.fillStyle = suave;
            dibujo.fillText(item.texto, x + sangria, y - 2);
            x += sangria + dibujo.measureText(item.texto).width + 22;
        }
        y += 24;
    }

    dibujo.font = `15px ${fuente}`;
    const blob = new Blob([svgSuelto(svg)], {type: "image/svg+xml;charset=utf-8"});
    const direccion = URL.createObjectURL(blob);
    try {
        const imagen = await cargarImagen(direccion);
        dibujo.drawImage(imagen, margen, arriba + altoLeyenda, anchoSvg, altoSvg);
    } finally {
        URL.revokeObjectURL(direccion);
    }

    dibujo.fillStyle = suave;
    dibujo.font = `14px ${fuente}`;
    dibujo.fillText(
        "Debajo, la lluvia media en tramos de 6 horas (y la nieve, si la hay). Datos: Open-Meteo (CC BY 4.0).",
        margen,
        alto - 26
    );
    dibujo.fillStyle = acento;
    dibujo.font = `700 14px ${fuente}`;
    dibujo.textAlign = "right";
    dibujo.fillText("meteoarchidona.com", ancho - margen, alto - 26);
    dibujo.textAlign = "left";

    return lienzo;
}


function aPng(lienzo) {
    return new Promise((resolver, rechazar) => {
        lienzo.toBlob((blob) => blob ? resolver(blob) : rechazar(new Error("No se pudo crear la imagen.")), "image/png");
    });
}


async function prepararGraficas(alAvanzar) {
    const taller = crear("div", "mn-compartir-taller");
    taller.setAttribute("aria-hidden", "true");
    taller.style.cssText =
        `position:fixed;left:-${ANCHO_GRAFICA * 3}px;top:0;width:${ANCHO_GRAFICA}px;` +
        "pointer-events:none;";
    document.body.append(taller);

    const fecha = new Intl.DateTimeFormat("en-CA", {timeZone: "Europe/Madrid"}).format(new Date());
    const ficheros = [];

    try {
        for (const [indice, grafica] of GRAFICAS.entries()) {
            alAvanzar(`Dibujando la gráfica ${indice + 1} de ${GRAFICAS.length}…`);

            const hueco = crear("div");
            Object.assign(hueco.dataset, {
                punto: PUNTO,
                vista: "comparar",
                variable: grafica.variable,
                resumen: "no"
            });
            taller.append(hueco);
            montarModelosNumericos(hueco);

            const svg = await esperarGrafica(hueco);
            const lienzo = await lienzoGrafica(grafica, svg, leyendaDe(hueco));
            const blob = await aPng(lienzo);
            ficheros.push(new File(
                [blob],
                `meteoarchidona-${fecha}-${indice + 1}-temperatura-${grafica.fichero}.png`,
                {type: "image/png"}
            ));
            hueco.remove();
        }
    } finally {
        taller.remove();
    }

    return ficheros;
}


/* ------------------------------------------------------------
   Copiar, compartir y descargar
   ------------------------------------------------------------ */

function copiarTexto(texto) {
    if (navigator.clipboard?.writeText) {
        return navigator.clipboard.writeText(texto);
    }
    // Respaldo para navegadores sin portapapeles moderno.
    const area = crear("textarea");
    area.value = texto;
    area.style.cssText = "position:fixed;left:-9999px;top:0;";
    document.body.append(area);
    area.select();
    const bien = document.execCommand("copy");
    area.remove();
    return bien ? Promise.resolve() : Promise.reject(new Error("No se pudo copiar."));
}


function puedeCompartirFicheros(ficheros) {
    try {
        return Boolean(navigator.canShare && navigator.share && navigator.canShare({files: ficheros}));
    } catch {
        return false;
    }
}


function descargar(ficheros) {
    ficheros.forEach((fichero, indice) => {
        window.setTimeout(() => {
            const enlace = crear("a");
            enlace.href = URL.createObjectURL(fichero);
            enlace.download = fichero.name;
            document.body.append(enlace);
            enlace.click();
            enlace.remove();
            window.setTimeout(() => URL.revokeObjectURL(enlace.href), 4000);
        }, indice * 400);
    });
}


/* ------------------------------------------------------------
   Panel en la tarjeta del resumen
   ------------------------------------------------------------ */

export function ponerBotonCompartir(tarjeta, texto) {
    if (!esAdministrador()) return;

    tarjeta.querySelector(".mn-compartir")?.remove();

    const panel = crear("div", "mn-compartir");
    const preparar = crear("button", "mn-compartir-boton", "Compartir en Facebook");
    preparar.type = "button";
    const estado = crear("p", "mn-compartir-estado");
    estado.setAttribute("role", "status");
    estado.setAttribute("aria-live", "polite");
    panel.append(preparar, estado);
    tarjeta.append(panel);

    const textoFinal = textoPublicacion(texto);

    preparar.addEventListener("click", async () => {
        preparar.disabled = true;
        panel.querySelector(".mn-compartir-listo")?.remove();

        let ficheros;
        try {
            ficheros = await prepararGraficas((mensaje) => { estado.textContent = mensaje; });
        } catch (error) {
            estado.textContent = `No se han podido preparar las gráficas: ${error.message}`;
            preparar.disabled = false;
            return;
        }

        const listo = crear("div", "mn-compartir-listo");
        const miniaturas = crear("div", "mn-compartir-miniaturas");
        for (const fichero of ficheros) {
            const imagen = crear("img");
            imagen.src = URL.createObjectURL(fichero);
            imagen.alt = fichero.name;
            miniaturas.append(imagen);
        }

        const compartir = crear("button", "mn-compartir-boton mn-compartir-principal");
        compartir.type = "button";
        const copiar = crear("button", "mn-compartir-boton mn-compartir-secundario", "Copiar solo el texto");
        copiar.type = "button";

        const movil = puedeCompartirFicheros(ficheros);
        compartir.textContent = movil
            ? "Abrir Facebook con las gráficas"
            : "Copiar el texto y descargar las gráficas";

        estado.textContent = movil
            ? "Listo. Pulsa el botón, elige Facebook y, en el texto de la publicación, mantén pulsado y «Pegar»."
            : "Listo. Pulsa el botón: el texto queda copiado y se descargan las gráficas para subirlas a Facebook.";

        compartir.addEventListener("click", async () => {
            // Las dos cosas en el mismo toque: el teléfono solo deja abrir
            // el menú de compartir justo después de pulsar.
            const copiado = copiarTexto(textoFinal).then(() => true, () => false);

            if (movil) {
                try {
                    await navigator.share({files: ficheros, text: textoFinal, title: "MeteoArchidona"});
                    estado.textContent = (await copiado)
                        ? "Hecho. Si Facebook no puso el texto, pégalo: está copiado."
                        : "Hecho. El texto no se pudo copiar: usa «Copiar solo el texto».";
                } catch (error) {
                    if (error.name !== "AbortError") {
                        estado.textContent = `No se pudo abrir el menú de compartir: ${error.message}`;
                    }
                }
            } else {
                descargar(ficheros);
                estado.textContent = (await copiado)
                    ? "Texto copiado y gráficas descargadas. En Facebook, sube las fotos y pega el texto."
                    : "Gráficas descargadas. El texto no se pudo copiar: usa «Copiar solo el texto».";
            }
        });

        copiar.addEventListener("click", async () => {
            const bien = await copiarTexto(textoFinal).then(() => true, () => false);
            estado.textContent = bien ? "Texto copiado." : "No se pudo copiar el texto.";
        });

        listo.append(miniaturas, compartir, copiar);
        panel.append(listo);
        preparar.textContent = "Volver a preparar";
        preparar.disabled = false;
    });
}


/* Fin de fichero: js/compartir-modelos.js */
