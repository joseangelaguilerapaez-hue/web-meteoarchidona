/*
 * MeteoArchidona · Componente «Modelos numéricos»
 *
 * Predicciones por conjuntos (ensembles) de Open-Meteo que descarga y
 * guarda la API cada hora (docs/predicciones-conjuntos.md de la API).
 * Pestaña «Modelos numéricos» de Predicción desde el 2-11-2026; se puede
 * poner en cualquier otra página o dashboard:
 *
 *     <div data-componente="modelos-numericos"
 *          data-punto="EL_SILO"            (opcional; o LOS_LLANOS)
 *          data-vista="modelo"             (opcional; o «comparar»)
 *          data-modelo="ecmwf_ifs025"      (opcional)
 *          data-variable="TEMPERATURA_850_HPA"  (opcional)
 *          data-resumen="no"               (opcional; sin el texto)
 *     ></div>
 *
 *     import {montarModelosNumericos} from "/js/modelos-numericos.js?v=…";
 *     montarModelosNumericos(hueco);
 *
 * Qué enseña:
 *
 * - El resumen automático (GET /prediccion-conjuntos/resumen): texto
 *   redactado por IA a partir de las cifras del consenso de los modelos.
 * - «Por modelo»: el penacho de un modelo, una línea por escenario
 *   (miembro), la media, la franja 10-90 y la salida operativa del
 *   mismo centro (la determinista de alta resolución; Google no tiene)
 *   y el control (el escenario sin perturbar), los dos que miran los
 *   aficionados (decisiones de José del 2-11-2026)
 *   (GET /prediccion-conjuntos/{punto}?modelo=…).
 * - «Comparar modelos»: la media de cada modelo y el consenso
 *   (…?miembros=false, solo los resúmenes: pesa poco).
 * - Debajo, la lluvia media en tramos de 6 horas y, si la hay, la nieve.
 *
 * Todavía no está en el catálogo de auditoría: cuando se dé de alta (API),
 * se le pone data-auditoria-visualizacion como a las tarjetas de AEMET.
 *
 * Niveles: 2 m (superficie, orientativa) y 925, 850, 700 o 500 hPa (en
 * altura, no la de Archidona); la nota de la gráfica lo dice. Gráficas en SVG propio, sin
 * librerías. Horas siempre en hora de Madrid.
 */

const ZONA = "Europe/Madrid";
const REFRESCO_MS = 30 * 60 * 1000;
const NS = "http://www.w3.org/2000/svg";

// Nivel por defecto: 850 hPa. «2 m» es la de superficie y 925 hPa, el
// nivel de presión de las estaciones (decisión de José del 2-11-2026).
const VARIABLES_TEMPERATURA = [
    {codigo: "TEMPERATURA_2M", nombre: "2 m", detalle: "superficie", superficie: true},
    {codigo: "TEMPERATURA_925_HPA", nombre: "925 hPa", detalle: "unos 750 m"},
    {codigo: "TEMPERATURA_850_HPA", nombre: "850 hPa", detalle: "unos 1500 m"},
    {codigo: "TEMPERATURA_700_HPA", nombre: "700 hPa", detalle: "unos 3000 m"},
    {codigo: "TEMPERATURA_500_HPA", nombre: "500 hPa", detalle: "unos 5500 m"}
];

// Orden fijo de colores por modelo (validado sobre el fondo oscuro de las
// tarjetas): el color sigue al modelo, no a su posición en la lista.
const COLORES_MODELO = {
    ecmwf_ifs025: "#3987e5",
    ecmwf_aifs025: "#d95926",
    gfs05: "#199e70",
    google_weathernext2_ensemble: "#c98500",
    gem_global: "#d55181"
};

// Control: discontinua y en un tono propio, para no confundirla con la
// operativa (ámbar) ni con la media (blanca).
const COLOR_CONTROL = "#e66767";

const HORAS_TRAMO_LLUVIA = 6;

function textoNivel(variable) {
    return variable.superficie
        ? "Temperatura a 2 m del suelo según los modelos, orientativa: son modelos globales de unos 25 km que no ven los microclimas."
        : "Temperatura en altura, en el aire libre, no la de Archidona.";
}

// Diferencia entre modelos a partir de la cual se sombrea el desacuerdo
// (la misma que usa el resumen automático).
const UMBRAL_DESACUERDO_C = 2;


/* ------------------------------------------------------------
   Utilidades
   ------------------------------------------------------------ */

function crear(etiqueta, clase, texto) {
    const elemento = document.createElement(etiqueta);
    if (clase) elemento.className = clase;
    if (texto !== undefined && texto !== null) elemento.textContent = texto;
    return elemento;
}

function svg(etiqueta, atributos = {}, texto) {
    const elemento = document.createElementNS(NS, etiqueta);
    for (const [nombre, valor] of Object.entries(atributos)) {
        elemento.setAttribute(nombre, String(valor));
    }
    if (texto !== undefined) elemento.textContent = texto;
    return elemento;
}

const esNumero = (valor) => typeof valor === "number" && Number.isFinite(valor);

const formatoHora = new Intl.DateTimeFormat("es-ES", {hour: "2-digit", minute: "2-digit", timeZone: ZONA});
const formatoDia = new Intl.DateTimeFormat("es-ES", {weekday: "short", day: "numeric", timeZone: ZONA});
const formatoDiaLargo = new Intl.DateTimeFormat("es-ES", {weekday: "long", day: "numeric", month: "long", timeZone: ZONA});
const formatoHoraLocal = new Intl.DateTimeFormat("en-GB", {hour: "2-digit", hourCycle: "h23", timeZone: ZONA});
const formatoFecha = new Intl.DateTimeFormat("en-CA", {year: "numeric", month: "2-digit", day: "2-digit", timeZone: ZONA});

const horaLocal = (fecha) => Number(formatoHoraLocal.format(fecha));

function etiquetaDia(fecha, corta) {
    const texto = formatoDia.format(fecha).replace(".", "");
    const larga = texto.charAt(0).toUpperCase() + texto.slice(1);
    // En el móvil, «L 2», «M 3», «X 4»… para que quepan todos los días.
    return corta ? `${"DLMXJVS"[new Date(fecha.toLocaleString("en-US", {timeZone: ZONA})).getDay()]} ${larga.split(" ").pop()}` : larga;
}

function cifra(valor, decimales = 1) {
    return esNumero(valor) ? valor.toLocaleString("es-ES", {maximumFractionDigits: decimales, minimumFractionDigits: decimales}) : "--";
}

async function pedir(ruta) {
    const base = window.API_BASE || "/api";
    const respuesta = await fetch(`${base}${ruta}`, {cache: "no-store"});
    if (!respuesta.ok) {
        const error = new Error(`HTTP ${respuesta.status}`);
        error.estado = respuesta.status;
        throw error;
    }
    return respuesta.json();
}

function media(valores) {
    const validos = valores.filter(esNumero);
    return validos.length ? validos.reduce((a, b) => a + b, 0) / validos.length : null;
}


/* ------------------------------------------------------------
   Preparación de los datos para dibujar
   ------------------------------------------------------------ */

// Eje común: todas las horas que aparezcan, ordenadas.
function ejeHoras(modelos) {
    const instantes = new Set();
    for (const modelo of modelos) {
        for (const hora of modelo.horas) instantes.add(Date.parse(hora));
    }
    return [...instantes].sort((a, b) => a - b);
}

// Serie de un modelo colocada sobre el eje común.
function alinear(modelo, valores, eje) {
    const posicion = new Map(modelo.horas.map((hora, indice) => [Date.parse(hora), indice]));
    return eje.map((instante) => {
        const indice = posicion.get(instante);
        return indice === undefined ? null : (valores[indice] ?? null);
    });
}

// Lluvia horaria (media del conjunto) sumada en tramos de 6 horas locales.
function tramosLluvia(eje, porHora) {
    const tramos = [];
    let actual = null;

    eje.forEach((instante, indice) => {
        const fecha = new Date(instante);
        const inicioTramo = horaLocal(fecha) % HORAS_TRAMO_LLUVIA === 0;

        if (!actual || inicioTramo) {
            actual = {desde: indice, hasta: indice, total: 0, conDato: false};
            tramos.push(actual);
        }

        actual.hasta = indice;
        if (esNumero(porHora[indice])) {
            actual.total += porHora[indice];
            actual.conDato = true;
        }
    });

    return tramos.filter((tramo) => tramo.conDato);
}


/* ------------------------------------------------------------
   Gráfica
   ------------------------------------------------------------ */

function dibujar(contenedor, datos) {
    contenedor.textContent = "";

    const ancho = Math.max(300, Math.round(contenedor.clientWidth || 600));
    const estrecho = ancho < 560;
    const margen = {izquierda: estrecho ? 34 : 44, derecha: 10, arriba: 12};
    const altoTemperatura = estrecho ? 240 : 320;
    const separacion = 34;
    const altoLluvia = estrecho ? 70 : 90;
    const altoDias = 22;
    const alto = margen.arriba + altoTemperatura + separacion + altoLluvia + altoDias;

    const {eje} = datos;
    const n = eje.length;
    const anchoUtil = ancho - margen.izquierda - margen.derecha;
    const x = (indice) => margen.izquierda + (n > 1 ? anchoUtil * indice / (n - 1) : 0);

    // Escala de temperatura con márgenes redondos.
    const todos = datos.lineas.flatMap((linea) => linea.valores).concat(
        datos.banda ? datos.banda.inferior.concat(datos.banda.superior) : []
    ).filter(esNumero);
    let minimo = Math.floor(Math.min(...todos) - 1);
    let maximo = Math.ceil(Math.max(...todos) + 1);
    if (!Number.isFinite(minimo)) { minimo = 0; maximo = 10; }
    const paso = maximo - minimo > 24 ? 4 : 2;
    minimo = Math.floor(minimo / paso) * paso;
    maximo = Math.ceil(maximo / paso) * paso;
    const yT = (valor) => margen.arriba + altoTemperatura * (maximo - valor) / (maximo - minimo);

    const arribaLluvia = margen.arriba + altoTemperatura + separacion;
    const maximoLluvia = Math.max(2, ...datos.lluvia.map((tramo) => tramo.total), ...datos.nieve.map((tramo) => tramo.total));
    const escalaLluvia = maximoLluvia <= 4 ? 4 : Math.ceil(maximoLluvia / 5) * 5;
    const yP = (valor) => arribaLluvia + altoLluvia * (1 - Math.min(valor, escalaLluvia) / escalaLluvia);

    const lienzo = svg("svg", {
        class: "mn-grafica",
        viewBox: `0 0 ${ancho} ${alto}`,
        width: ancho,
        height: alto,
        role: "img",
        "aria-label": datos.descripcion
    });

    // Rejilla de temperatura.
    for (let valor = minimo; valor <= maximo; valor += paso) {
        lienzo.append(svg("line", {
            class: valor === 0 ? "mn-rejilla mn-rejilla-cero" : "mn-rejilla",
            x1: margen.izquierda, x2: ancho - margen.derecha, y1: yT(valor), y2: yT(valor)
        }));
        lienzo.append(svg("text", {class: "mn-eje", x: margen.izquierda - 6, y: yT(valor) + 4, "text-anchor": "end"}, String(valor)));
    }

    // Días: separador a medianoche local y etiqueta.
    const ultimaEtiqueta = {x: -Infinity};
    eje.forEach((instante, indice) => {
        const fecha = new Date(instante);
        if (horaLocal(fecha) !== 0) return;
        const posicion = x(indice);
        lienzo.append(svg("line", {class: "mn-dia", x1: posicion, x2: posicion, y1: margen.arriba, y2: arribaLluvia + altoLluvia}));
        if (posicion - ultimaEtiqueta.x >= (estrecho ? 24 : 44) && posicion < ancho - (estrecho ? 16 : 30)) {
            lienzo.append(svg("text", {class: "mn-eje", x: posicion + 2, y: arribaLluvia + altoLluvia + 15}, etiquetaDia(fecha, estrecho)));
            ultimaEtiqueta.x = posicion;
        }
    });

    // Desacuerdo entre modelos (solo «Comparar»).
    if (datos.desacuerdo) {
        let inicio = null;
        datos.desacuerdo.concat([false]).forEach((hay, indice) => {
            if (hay && inicio === null) inicio = indice;
            if (!hay && inicio !== null) {
                lienzo.append(svg("rect", {
                    class: "mn-desacuerdo",
                    x: x(inicio), y: margen.arriba,
                    width: Math.max(x(indice - 1) - x(inicio), 2), height: altoTemperatura
                }));
                inicio = null;
            }
        });
    }

    // Franja 10-90.
    if (datos.banda) {
        const arriba = [];
        const abajo = [];
        datos.banda.superior.forEach((valor, indice) => {
            if (esNumero(valor) && esNumero(datos.banda.inferior[indice])) {
                arriba.push(`${x(indice).toFixed(1)},${yT(valor).toFixed(1)}`);
                abajo.unshift(`${x(indice).toFixed(1)},${yT(datos.banda.inferior[indice]).toFixed(1)}`);
            }
        });
        if (arriba.length) {
            lienzo.append(svg("polygon", {class: "mn-banda", points: arriba.concat(abajo).join(" "), fill: datos.banda.color}));
        }
    }

    // Líneas: de fondo a primer plano.
    for (const linea of datos.lineas) {
        const tramos = [];
        let actual = [];
        linea.valores.forEach((valor, indice) => {
            if (esNumero(valor)) {
                actual.push(`${x(indice).toFixed(1)},${yT(valor).toFixed(1)}`);
            } else if (actual.length) {
                tramos.push(actual);
                actual = [];
            }
        });
        if (actual.length) tramos.push(actual);

        for (const puntos of tramos) {
            if (linea.realce) {
                lienzo.append(svg("polyline", {class: "mn-linea-realce", points: puntos.join(" ")}));
            }
            lienzo.append(svg("polyline", {
                class: `mn-linea ${linea.clase || ""}`,
                points: puntos.join(" "),
                stroke: linea.color
            }));
        }
    }

    // Lluvia y nieve.
    lienzo.append(svg("text", {class: "mn-eje mn-eje-titulo", x: margen.izquierda, y: arribaLluvia - 8},
        estrecho
            ? (datos.nieve.length ? "Lluvia (mm) y nieve (cm) cada 6 h" : "Lluvia cada 6 h (mm)")
            : (datos.nieve.length ? "Lluvia (mm) y nieve (cm) cada 6 h, media de los escenarios" : "Lluvia cada 6 h (mm), media de los escenarios")));
    lienzo.append(svg("line", {class: "mn-rejilla mn-rejilla-cero", x1: margen.izquierda, x2: ancho - margen.derecha, y1: yP(0), y2: yP(0)}));
    lienzo.append(svg("text", {class: "mn-eje", x: margen.izquierda - 6, y: yP(escalaLluvia) + 4, "text-anchor": "end"}, String(escalaLluvia)));

    const anchoBarra = (tramo) => Math.max(1.5, x(tramo.hasta) - x(tramo.desde) + (n > 1 ? anchoUtil / (n - 1) : 0) - 1.5);
    for (const tramo of datos.lluvia) {
        if (tramo.total < 0.05) continue;
        lienzo.append(svg("rect", {
            class: "mn-lluvia",
            x: x(tramo.desde), y: yP(tramo.total),
            width: anchoBarra(tramo), height: Math.max(yP(0) - yP(tramo.total), 1),
            rx: 1.5
        }));
    }
    for (const tramo of datos.nieve) {
        if (tramo.total < 0.05) continue;
        lienzo.append(svg("rect", {
            class: "mn-nieve",
            x: x(tramo.desde) + anchoBarra(tramo) * 0.25, y: yP(tramo.total),
            width: anchoBarra(tramo) * 0.5, height: Math.max(yP(0) - yP(tramo.total), 1),
            rx: 1.5
        }));
    }

    // Capa para el valor al pasar el ratón o el dedo.
    const guia = svg("line", {class: "mn-guia", x1: 0, x2: 0, y1: margen.arriba, y2: arribaLluvia + altoLluvia, visibility: "hidden"});
    const zona = svg("rect", {class: "mn-zona", x: margen.izquierda, y: 0, width: anchoUtil, height: alto});
    lienzo.append(guia, zona);

    const ficha = crear("div", "mn-ficha");
    ficha.hidden = true;

    function enseñar(evento) {
        const caja = lienzo.getBoundingClientRect();
        const escala = ancho / caja.width;
        const posicion = (evento.clientX - caja.left) * escala;
        const indice = Math.max(0, Math.min(n - 1, Math.round((posicion - margen.izquierda) / anchoUtil * (n - 1))));

        guia.setAttribute("x1", x(indice));
        guia.setAttribute("x2", x(indice));
        guia.setAttribute("visibility", "visible");

        const fecha = new Date(eje[indice]);
        ficha.textContent = "";
        ficha.append(crear("strong", null, `${formatoDiaLargo.format(fecha)}, ${formatoHora.format(fecha)}`));

        for (const fila of datos.ficha(indice)) {
            const linea = crear("div", "mn-ficha-fila");
            if (fila.color) {
                const muestra = crear("span", "mn-muestra");
                muestra.style.background = fila.color;
                linea.append(muestra);
            }
            linea.append(crear("span", null, fila.texto));
            ficha.append(linea);
        }

        const tramo = datos.lluvia.find((t) => indice >= t.desde && indice <= t.hasta);
        if (tramo) {
            ficha.append(crear("div", "mn-ficha-fila mn-ficha-lluvia", `Lluvia en el tramo: ${cifra(tramo.total)} mm`));
        }
        const tramoNieve = datos.nieve.find((t) => indice >= t.desde && indice <= t.hasta && t.total >= 0.05);
        if (tramoNieve) {
            ficha.append(crear("div", "mn-ficha-fila mn-ficha-lluvia", `Nieve en el tramo: ${cifra(tramoNieve.total)} cm`));
        }

        ficha.hidden = false;
        const izquierda = (x(indice) / escala) + (x(indice) > ancho / 2 ? -ficha.offsetWidth - 12 : 12);
        ficha.style.left = `${Math.max(0, izquierda)}px`;
    }

    function ocultar() {
        guia.setAttribute("visibility", "hidden");
        ficha.hidden = true;
    }

    zona.addEventListener("pointermove", enseñar);
    zona.addEventListener("pointerdown", enseñar);
    zona.addEventListener("pointerleave", ocultar);

    contenedor.append(lienzo, ficha);
}


/* ------------------------------------------------------------
   Componente
   ------------------------------------------------------------ */

export function montarModelosNumericos(raiz) {

    const opciones = raiz.dataset;
    const estado = {
        punto: (opciones.punto || "EL_SILO").toUpperCase(),
        vista: opciones.vista === "comparar" ? "comparar" : "modelo",
        modelo: opciones.modelo || "ecmwf_ifs025",
        variable: opciones.variable || "TEMPERATURA_850_HPA",
        catalogo: null
    };

    raiz.classList.add("mn");
    raiz.textContent = "";

    // Resumen.
    const resumen = crear("section", "pred-tarjeta mn-resumen");
    resumen.setAttribute("aria-label", "Tendencia de los próximos quince días");
    resumen.hidden = true;

    // Gráfica y controles.
    const tarjeta = crear("section", "pred-tarjeta mn-tarjeta");
    const titulo = crear("h2", "pred-titulo", "Modelos por conjuntos · 15 días");
    const controles = crear("div", "mn-controles");
    const leyenda = crear("div", "mn-leyenda");
    const lienzo = crear("div", "mn-lienzo");
    const nota = crear("p", "mn-nota");
    const aviso = crear("p", "pred-vacio mn-aviso");
    aviso.hidden = true;
    tarjeta.append(titulo, controles, leyenda, aviso, lienzo, nota);

    const pie = crear("p", "mn-fuente");
    pie.append(
        "Datos de los modelos: ",
        Object.assign(crear("a", null, "Open-Meteo"), {href: "https://open-meteo.com/", target: "_blank", rel: "noopener"}),
        " (CC BY 4.0). MeteoArchidona no predice: enseña lo que dicen los modelos."
    );

    raiz.append(resumen, tarjeta, pie);

    // Controles: grupos de botones y un desplegable de modelo.
    function grupo(etiqueta, opcionesGrupo, valorActual, alCambiar) {
        const caja = crear("div", "mn-grupo");
        caja.setAttribute("role", "group");
        caja.setAttribute("aria-label", etiqueta);
        caja.append(crear("span", "mn-grupo-etiqueta", etiqueta));
        for (const opcion of opcionesGrupo) {
            const boton = crear("button", "mn-opcion", opcion.nombre);
            boton.type = "button";
            boton.setAttribute("aria-pressed", String(opcion.valor === valorActual()));
            if (opcion.titulo) boton.title = opcion.titulo;
            boton.addEventListener("click", () => {
                alCambiar(opcion.valor);
                pintarControles();
                cargarGrafica();
            });
            caja.append(boton);
        }
        return caja;
    }

    function pintarControles() {
        controles.textContent = "";

        const puntos = estado.catalogo?.puntos || [{codigo: estado.punto, nombre: estado.punto}];
        if (puntos.length > 1) {
            controles.append(grupo("Punto", puntos.map((p) => ({valor: p.codigo, nombre: p.nombre})),
                () => estado.punto, (valor) => { estado.punto = valor; }));
        }

        controles.append(grupo("Vista", [
            {valor: "modelo", nombre: "Por modelo"},
            {valor: "comparar", nombre: "Comparar modelos"}
        ], () => estado.vista, (valor) => { estado.vista = valor; }));

        controles.append(grupo("Nivel", VARIABLES_TEMPERATURA.map((v) => ({valor: v.codigo, nombre: v.nombre, titulo: v.detalle})),
            () => estado.variable, (valor) => { estado.variable = valor; }));

        if (estado.vista === "modelo" && estado.catalogo) {
            const caja = crear("label", "mn-grupo");
            caja.append(crear("span", "mn-grupo-etiqueta", "Modelo"));
            const lista = crear("select", "mn-selector");
            for (const modelo of estado.catalogo.modelos) {
                const opcion = crear("option", null, `${modelo.nombre} · ${modelo.miembros} escenarios`);
                opcion.value = modelo.codigo;
                opcion.selected = modelo.codigo === estado.modelo;
                if (!modelo.variables.includes(estado.variable)) {
                    opcion.textContent += " (sin este nivel)";
                }
                lista.append(opcion);
            }
            lista.addEventListener("change", () => {
                estado.modelo = lista.value;
                cargarGrafica();
            });
            caja.append(lista);
            controles.append(caja);
        }
    }

    function nombreModelo(codigo) {
        return estado.catalogo?.modelos.find((m) => m.codigo === codigo)?.nombre || codigo;
    }

    function pintarLeyenda(elementos) {
        leyenda.textContent = "";
        for (const elemento of elementos) {
            const item = crear("span", "mn-leyenda-item");
            const muestra = crear("span", `mn-muestra ${elemento.clase || ""}`);
            muestra.style.background = elemento.color;
            item.append(muestra, crear("span", null, elemento.texto));
            leyenda.append(item);
        }
    }

    let ultimoDibujo = null;

    async function cargarGrafica() {
        const variable = VARIABLES_TEMPERATURA.find((v) => v.codigo === estado.variable) || VARIABLES_TEMPERATURA[0];
        const punto = encodeURIComponent(estado.punto);
        aviso.hidden = true;
        lienzo.classList.add("mn-cargando");

        try {
            if (estado.vista === "modelo") {
                const modelo = encodeURIComponent(estado.modelo);
                const [temperatura, lluvia, nieve] = await Promise.all([
                    pedir(`/prediccion-conjuntos/${punto}?variable=${variable.codigo}&modelo=${modelo}`),
                    pedir(`/prediccion-conjuntos/${punto}?variable=PRECIPITACION&modelo=${modelo}&miembros=false`),
                    pedir(`/prediccion-conjuntos/${punto}?variable=NEVADA&modelo=${modelo}&miembros=false`).catch(() => ({modelos: []}))
                ]);

                const datos = temperatura.modelos[0];
                if (!datos) {
                    throw Object.assign(new Error("sin datos"), {
                        mensaje: `${nombreModelo(estado.modelo)} no tiene temperatura a ${variable.nombre}. Elige otro modelo u otro nivel.`
                    });
                }

                const eje = ejeHoras([datos]);
                const color = COLORES_MODELO[datos.modelo] || "#3987e5";
                const miembros = datos.miembros || [];
                const lluviaPorHora = lluvia.modelos[0] ? alinear(lluvia.modelos[0], lluvia.modelos[0].resumen.media, eje) : [];
                const nievePorHora = nieve.modelos[0] ? alinear(nieve.modelos[0], nieve.modelos[0].resumen.media, eje) : [];

                titulo.textContent = `${datos.nombre} · temperatura a ${variable.nombre} (${variable.detalle})`;
                pintarLeyenda([
                    {color, clase: "mn-muestra-fina", texto: `Escenarios (${miembros.length})`},
                    {color, clase: "mn-muestra-banda", texto: "Franja del 80 % central"},
                    {color: "var(--text)", texto: "Media de los escenarios"},
                    ...(datos.operativa ? [{color: "var(--amber)", texto: "Operativa (alta resolución)"}] : []),
                    ...(miembros.length ? [{color: COLOR_CONTROL, clase: "mn-muestra-discontinua", texto: "Control"}] : [])
                ]);

                ultimoDibujo = {
                    eje,
                    descripcion: `Penacho del modelo ${datos.nombre}: temperatura a ${variable.nombre} para ${miembros.length} escenarios, con su media.`,
                    banda: {
                        inferior: alinear(datos, datos.resumen.percentil_10, eje),
                        superior: alinear(datos, datos.resumen.percentil_90, eje),
                        color
                    },
                    lineas: [
                        ...miembros.slice(1).map((serie) => ({valores: alinear(datos, serie, eje), color, clase: "mn-linea-miembro"})),
                        ...(miembros.length ? [{valores: alinear(datos, miembros[0], eje), color: COLOR_CONTROL, clase: "mn-linea-control"}] : []),
                        // La operativa debajo de la media: lo más probable es la media.
                        ...(datos.operativa ? [{valores: alinear(datos.operativa, datos.operativa.valores, eje), color: "var(--amber)", clase: "mn-linea-operativa", realce: true}] : []),
                        {valores: alinear(datos, datos.resumen.media, eje), color: "var(--text)", clase: "mn-linea-media", realce: true}
                    ],
                    lluvia: tramosLluvia(eje, lluviaPorHora),
                    nieve: tramosLluvia(eje, nievePorHora).filter((t) => t.total >= 0.05),
                    ficha(indice) {
                        const m = datos.resumen;
                        const i = datos.horas.indexOf(datos.horas.find((h) => Date.parse(h) === eje[indice]));
                        const operativa = datos.operativa
                            ? alinear(datos.operativa, datos.operativa.valores, eje)[indice]
                            : null;
                        return [
                            {color: "var(--text)", texto: `Media de los escenarios: ${cifra(m.media[i])} °C`},
                            {color, texto: `El 80 % de los escenarios entre ${cifra(m.percentil_10[i])} y ${cifra(m.percentil_90[i])} °C`},
                            ...(esNumero(operativa) ? [{color: "var(--amber)", texto: `Operativa: ${cifra(operativa)} °C`}] : []),
                            ...(esNumero(miembros[0]?.[i]) ? [{color: COLOR_CONTROL, texto: `Control: ${cifra(miembros[0][i])} °C`}] : [])
                        ];
                    }
                };

                const pasada = datos.pasada ? new Date(datos.pasada) : null;
                nota.textContent =
                    `${textoNivel(variable)} Pasada de las ${pasada ? formatoHora.format(pasada) : "--"} del ${pasada ? formatoDiaLargo.format(pasada) : "--"}; ` +
                    "cada línea fina es un escenario del mismo modelo. " +
                    (datos.operativa
                        ? "La amarilla es su salida operativa, de más resolución, y la discontinua, el control (el escenario sin perturbar). Ninguna de las dos es la más probable: lo más probable es la media."
                        : "La discontinua es el control (el escenario sin perturbar). Este modelo no publica salida operativa. Lo más probable es la media.");

            } else {
                const [temperatura, lluvia] = await Promise.all([
                    pedir(`/prediccion-conjuntos/${punto}?variable=${variable.codigo}&miembros=false`),
                    pedir(`/prediccion-conjuntos/${punto}?variable=PRECIPITACION&miembros=false`)
                ]);

                if (!temperatura.modelos.length) {
                    throw Object.assign(new Error("sin datos"), {mensaje: "Todavía no hay datos de los modelos."});
                }

                const eje = ejeHoras(temperatura.modelos);
                const medias = temperatura.modelos.map((m) => ({modelo: m, valores: alinear(m, m.resumen.media, eje)}));
                const consenso = eje.map((_, i) => {
                    const valores = medias.map((m) => m.valores[i]).filter(esNumero);
                    return valores.length >= Math.min(3, medias.length) ? media(valores) : null;
                });
                const desacuerdo = eje.map((_, i) => {
                    const valores = medias.map((m) => m.valores[i]).filter(esNumero);
                    return valores.length >= 3 && Math.max(...valores) - Math.min(...valores) > UMBRAL_DESACUERDO_C;
                });
                const lluviaModelos = lluvia.modelos.map((m) => alinear(m, m.resumen.media, eje));
                const lluviaConsenso = eje.map((_, i) => media(lluviaModelos.map((serie) => serie[i])));

                titulo.textContent = `Comparar modelos · temperatura a ${variable.nombre} (${variable.detalle})`;
                pintarLeyenda([
                    ...medias.map((m) => ({color: COLORES_MODELO[m.modelo.modelo] || "#888", texto: m.modelo.nombre})),
                    {color: "var(--text)", texto: "Consenso"},
                    {color: "rgba(239, 68, 68, 0.35)", clase: "mn-muestra-banda", texto: `Discrepan más de ${UMBRAL_DESACUERDO_C} °C`}
                ]);

                ultimoDibujo = {
                    eje,
                    descripcion: `Media de cada modelo y consenso de la temperatura a ${variable.nombre}.`,
                    desacuerdo,
                    lineas: [
                        ...medias.map((m) => ({valores: m.valores, color: COLORES_MODELO[m.modelo.modelo] || "#888", clase: "mn-linea-modelo"})),
                        {valores: consenso, color: "var(--text)", clase: "mn-linea-media", realce: true}
                    ],
                    lluvia: tramosLluvia(eje, lluviaConsenso),
                    nieve: [],
                    ficha(indice) {
                        return [
                            {color: "var(--text)", texto: `Consenso: ${cifra(consenso[indice])} °C`},
                            ...medias.map((m) => ({color: COLORES_MODELO[m.modelo.modelo], texto: `${m.modelo.nombre}: ${cifra(m.valores[indice])} °C`}))
                        ];
                    }
                };

                nota.textContent = `${textoNivel(variable)} Cada línea es la media de los escenarios de un modelo; la blanca, el consenso de todos.`;
            }

            dibujar(lienzo, ultimoDibujo);

        } catch (error) {
            ultimoDibujo = null;
            lienzo.textContent = "";
            leyenda.textContent = "";
            aviso.textContent = error.mensaje || "Los modelos no están disponibles en este momento. Lo volvemos a intentar en unos minutos.";
            aviso.hidden = false;
        } finally {
            lienzo.classList.remove("mn-cargando");
        }
    }

    async function cargarResumen() {
        if (opciones.resumen === "no") return;

        try {
            const datos = await pedir("/prediccion-conjuntos/resumen");
            if (!datos.texto) throw new Error("sin texto");

            resumen.textContent = "";
            resumen.append(crear("h2", "pred-hoy-titulo", "Tendencia de los próximos 15 días"));
            for (const parrafo of datos.texto.split(/\n\s*\n/)) {
                if (parrafo.trim()) resumen.append(crear("p", "pred-presentador-texto", parrafo.trim()));
            }
            const generado = new Date(datos.generado);
            const pasada = new Date(datos.pasada_referencia);
            resumen.append(crear("p", "pred-presentador-nota",
                `Texto redactado automáticamente el ${formatoDiaLargo.format(generado)} a las ${formatoHora.format(generado)}, ` +
                `a partir del consenso de los modelos por conjuntos (pasada del Europeo de las ${formatoHora.format(pasada)}).`));
            resumen.hidden = false;
        } catch (error) {
            // Sin resumen, el bloque no aparece.
            resumen.hidden = true;
        }
    }

    async function iniciar() {
        try {
            estado.catalogo = await pedir("/prediccion-conjuntos");
            if (!estado.catalogo.puntos.some((p) => p.codigo === estado.punto) && estado.catalogo.puntos[0]) {
                estado.punto = estado.catalogo.puntos[0].codigo;
            }
        } catch (error) {
            estado.catalogo = null;
        }

        pintarControles();
        cargarResumen();
        cargarGrafica();
    }

    // Redibujar al cambiar el ancho (girar el móvil, ventana).
    if ("ResizeObserver" in window) {
        let anchoAnterior = 0;
        new ResizeObserver(() => {
            const anchoActual = Math.round(lienzo.clientWidth);
            if (ultimoDibujo && Math.abs(anchoActual - anchoAnterior) > 8) {
                anchoAnterior = anchoActual;
                dibujar(lienzo, ultimoDibujo);
            }
        }).observe(lienzo);
    }

    setInterval(() => {
        if (!document.hidden && raiz.isConnected && raiz.offsetParent !== null) {
            cargarResumen();
            cargarGrafica();
        }
    }, REFRESCO_MS);

    iniciar();
}


/* Fin de fichero: js/modelos-numericos.js */
