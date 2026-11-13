/*
 * MeteoArchidona · Componente «Balance hídrico»
 *
 * Lo que llueve frente a lo que el campo podría evaporar y transpirar
 * (ET0), por estación (José, 9-11-2026), como orientación para el riego:
 *
 *   - barras de los últimos días: la lluvia hacia arriba, en azul, y la
 *     ET0 hacia abajo, en ámbar (más clara si ese día salió por
 *     Hargreaves porque faltaba algún dato);
 *   - el año hidrológico (desde el 1 de octubre): lluvia, ET0 y balance,
 *     con lo que llevaba el año anterior a la misma fecha;
 *   - la ET0 y la lluvia previstas para los próximos días.
 *
 * La ET0 es la de un césped de referencia bien regado (FAO-56); la del
 * olivar sale de multiplicarla por su coeficiente de cultivo, que depende
 * de la plantación: eso lo dice el técnico.
 *
 *     <div data-componente="olivar-balance"></div>                    (El Silo, 30 días)
 *     <div data-componente="olivar-balance" data-estacion="LOS_LLANOS" data-dias="60"></div>
 *
 * API: GET /olivar/balance?estacion&dias
 */

import {
    pedir, crear, vaciar, aviso, prepararRaiz, pie, leerEstacion,
    diaCorto, fechaCorta, fechaLarga, ESTACIONES, NOMBRES_ESTACION, FUENTE_ESTACIONES
} from "./comun.js?v=20261109-olivar2";


const NS = "http://www.w3.org/2000/svg";

const formatoMm = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function mm(valor, signo = false) {
    if (valor === null || valor === undefined) return "—";
    const texto = formatoMm.format(Math.abs(valor));
    if (!signo) return `${valor < 0 ? "−" : ""}${texto} mm`;
    return `${valor > 0 ? "+" : valor < 0 ? "−" : ""}${texto} mm`;
}

function svg(etiqueta, atributos = {}, clase) {
    const nodo = document.createElementNS(NS, etiqueta);
    for (const [clave, valor] of Object.entries(atributos)) nodo.setAttribute(clave, valor);
    if (clase) nodo.setAttribute("class", clase);
    return nodo;
}


export function dibujarBalance(datos, ancho) {
    const alto = Math.round(Math.max(200, Math.min(280, ancho * 0.42)));
    const margen = { arriba: 12, derecha: 10, abajo: 22, izquierda: 40 };
    const anchoUtil = ancho - margen.izquierda - margen.derecha;
    const altoUtil = alto - margen.arriba - margen.abajo;
    const dias = datos.dias;

    let arriba = 2;
    let abajo = 2;
    for (const dia of dias) {
        arriba = Math.max(arriba, dia.lluvia || 0);
        abajo = Math.max(abajo, dia.evapotranspiracion || 0);
    }
    arriba *= 1.1;
    abajo *= 1.1;

    const cero = margen.arriba + altoUtil * arriba / (arriba + abajo);
    const escala = altoUtil / (arriba + abajo);
    const paso = anchoUtil / Math.max(1, dias.length);

    const lienzo = svg("svg", {
        viewBox: `0 0 ${ancho} ${alto}`,
        role: "img",
        "aria-label": `Lluvia y evapotranspiración diarias en ${datos.nombre}`
    });

    // Rejilla: rayas arriba (lluvia) y abajo (ET0), en la misma escala.
    // Si un lado se queda estrecho (mucha lluvia y poca ET0, o al
    // revés), solo lleva la raya del máximo, para que no se pisen.
    for (const [maximo, sentido] of [[arriba / 1.1, -1], [abajo / 1.1, 1]]) {
        const pixeles = maximo * escala;
        if (pixeles < 14) continue;
        const fracciones = pixeles < 60 ? [1] : [0.5, 1];
        for (const fraccion of fracciones) {
            const posicion = cero + sentido * maximo * fraccion * escala;
            lienzo.appendChild(svg("line", { x1: margen.izquierda, x2: ancho - margen.derecha, y1: posicion, y2: posicion }, "rejilla"));
            const texto = svg("text", { x: margen.izquierda - 6, y: posicion + 3, "text-anchor": "end" }, "texto-eje");
            texto.textContent = formatoMm.format(maximo * fraccion);
            lienzo.appendChild(texto);
        }
    }

    dias.forEach((dia, indice) => {
        const izquierda = margen.izquierda + indice * paso + paso * 0.14;
        const anchoBarra = Math.max(1, paso * 0.72);

        if (dia.lluvia) {
            const barra = svg("rect", {
                x: izquierda.toFixed(1), y: (cero - dia.lluvia * escala).toFixed(1),
                width: anchoBarra.toFixed(1), height: (dia.lluvia * escala).toFixed(1), rx: 1.5
            }, "barra-lluvia");
            const ayuda = svg("title");
            ayuda.textContent = `${fechaLarga(dia.fecha)}: llovió ${mm(dia.lluvia)}`;
            barra.appendChild(ayuda);
            lienzo.appendChild(barra);
        }

        if (dia.evapotranspiracion) {
            const barra = svg("rect", {
                x: izquierda.toFixed(1), y: cero.toFixed(1),
                width: anchoBarra.toFixed(1), height: (dia.evapotranspiracion * escala).toFixed(1), rx: 1.5
            }, dia.metodo === "HARGREAVES" ? "barra-evapo hargreaves" : "barra-evapo");
            const ayuda = svg("title");
            ayuda.textContent = `${fechaLarga(dia.fecha)}: ET0 ${mm(dia.evapotranspiracion)}${dia.metodo === "HARGREAVES" ? " (Hargreaves)" : ""}; balance ${mm(dia.balance, true)}`;
            barra.appendChild(ayuda);
            lienzo.appendChild(barra);
        }
    });

    lienzo.appendChild(svg("line", { x1: margen.izquierda, x2: ancho - margen.derecha, y1: cero, y2: cero }, "cero"));

    // Unas pocas fechas debajo.
    const cada = Math.max(1, Math.ceil(dias.length / 6));
    dias.forEach((dia, indice) => {
        if (indice % cada !== 0) return;
        const texto = svg("text", { x: margen.izquierda + (indice + 0.5) * paso, y: alto - 6, "text-anchor": "middle" }, "texto-eje");
        texto.textContent = fechaCorta(dia.fecha);
        lienzo.appendChild(texto);
    });

    return lienzo;
}


const pintadas = new WeakMap();

function pintarGrafica(caja, datos) {
    const primera = !pintadas.has(caja);
    pintadas.set(caja, datos);

    const dibujar = () => {
        const ancho = Math.max(280, Math.round(caja.clientWidth || 600));
        vaciar(caja);
        caja.appendChild(dibujarBalance(pintadas.get(caja), ancho));
    };

    dibujar();

    if (primera && "ResizeObserver" in window) {
        let espera = null;
        new ResizeObserver(() => {
            clearTimeout(espera);
            espera = setTimeout(dibujar, 120);
        }).observe(caja);
    }
}


function cifraAgua(lista, clase, etiqueta, valor, nota) {
    const caja = crear("div", clase);
    caja.appendChild(crear("dt", null, etiqueta));
    const dato = crear("dd", null, valor);
    if (nota) dato.appendChild(crear("small", null, nota));
    caja.appendChild(dato);
    lista.appendChild(caja);
}


function cifrasTemporada(datos) {
    const temporada = datos.temporada;
    const anterior = datos.anterior_misma_fecha;
    const lista = crear("dl", "oli-agua");
    const nota = campo => (anterior ? `${anterior.temporada}: ${mm(anterior[campo], campo === "balance")}` : null);

    cifraAgua(lista, "oli-agua-lluvia", `Lluvia ${temporada.temporada}`, mm(temporada.lluvia), nota("lluvia"));
    cifraAgua(lista, "oli-agua-evapo", "ET0", mm(temporada.evapotranspiracion), nota("evapotranspiracion"));
    cifraAgua(
        lista,
        `oli-agua-balance ${temporada.balance < 0 ? "negativo" : "positivo"}`,
        "Balance",
        mm(temporada.balance, true),
        nota("balance")
    );
    return lista;
}


function tablaPrevision(prevision) {
    const contenedor = crear("div", "oli-tabla-desliza");
    const tabla = crear("table", "oli-prevision");
    const cabeza = crear("tr");
    const fila = crear("tr");

    for (const dia of prevision) {
        const th = crear("th", null, diaCorto(dia.fecha));
        th.appendChild(crear("small", null, fechaCorta(dia.fecha)));
        cabeza.appendChild(th);

        const td = crear("td", dia.lluvia >= 1 ? "oli-con-lluvia" : null, dia.evapotranspiracion === null ? "—" : formatoMm.format(dia.evapotranspiracion));
        td.appendChild(crear("small", null, dia.lluvia ? `lluvia ${formatoMm.format(dia.lluvia)}` : "sin lluvia"));
        td.title = `ET0 prevista ${mm(dia.evapotranspiracion)}; lluvia prevista ${mm(dia.lluvia)}`;
        fila.appendChild(td);
    }

    const thead = crear("thead");
    thead.appendChild(cabeza);
    const tbody = crear("tbody");
    tbody.appendChild(fila);
    tabla.appendChild(thead);
    tabla.appendChild(tbody);
    contenedor.appendChild(tabla);
    return contenedor;
}


function resumenDias(datos) {
    const conEt0 = datos.dias.filter(dia => dia.evapotranspiracion !== null);
    if (!conEt0.length) return "Todavía no hay evapotranspiración calculada en esta estación.";

    const lluvia = datos.dias.reduce((suma, dia) => suma + (dia.lluvia || 0), 0);
    const et0 = conEt0.reduce((suma, dia) => suma + dia.evapotranspiracion, 0);
    const hargreaves = conEt0.filter(dia => dia.metodo === "HARGREAVES").length;
    let texto = `En los últimos ${datos.dias.length} días: ${mm(lluvia)} de lluvia frente a ${mm(et0)} de ET0 (balance ${mm(lluvia - et0, true)})`;
    if (hargreaves) texto += `. ${hargreaves} ${hargreaves === 1 ? "día salió" : "días salieron"} por Hargreaves porque faltaba algún dato`;
    return `${texto}.`;
}


export async function montarBalanceOlivar(raiz) {
    prepararRaiz(raiz, "olivar-balance");
    aviso(raiz, "Cargando el balance hídrico…");

    let estacion = leerEstacion(raiz);
    const dias = Math.max(7, Math.min(366, parseInt(raiz.dataset.dias, 10) || 30));
    const conSelector = raiz.dataset.selector !== "no";

    raiz.textContent = "";
    const cabeza = crear("div");
    raiz.appendChild(cabeza);

    if (conSelector) {
        const controles = crear("div", "oli-controles");
        const etiqueta = crear("label", null, "Estación");
        const selector = crear("select");
        for (const codigo of ESTACIONES) {
            const opcion = crear("option", null, NOMBRES_ESTACION[codigo]);
            opcion.value = codigo;
            selector.appendChild(opcion);
        }
        selector.value = estacion;
        selector.addEventListener("change", () => { estacion = selector.value; pintar(); });
        etiqueta.appendChild(selector);
        controles.appendChild(etiqueta);
        raiz.appendChild(controles);
    }

    const cuerpo = crear("div");
    cuerpo.style.display = "grid";
    cuerpo.style.gap = "14px";
    raiz.appendChild(cuerpo);
    pie(raiz, `ET0 FAO-56 Penman-Monteith con la radiación, la humedad y el viento de la estación · año hidrológico desde el 1 de octubre · ${FUENTE_ESTACIONES} · previsión de Open-Meteo`);

    async function pintar() {
        let datos;
        try {
            datos = await pedir(`/olivar/balance?estacion=${estacion}&dias=${dias}`);
        } catch (error) {
            aviso(cuerpo, "No se ha podido leer el balance hídrico. Se puede volver a intentar más tarde.", true);
            return;
        }

        vaciar(cabeza);
        if (raiz.dataset.titulo !== "no") {
            cabeza.appendChild(crear("div", "oli-etiqueta", `Balance hídrico · ${datos.nombre}`));
            cabeza.appendChild(crear("h3", "oli-titulo", "Lluvia frente a evapotranspiración"));
        }

        vaciar(cuerpo);

        if (datos.temporada) cuerpo.appendChild(cifrasTemporada(datos));

        cuerpo.appendChild(crear("p", "oli-aviso", resumenDias(datos)));

        if (datos.dias.length) {
            const caja = crear("div", "oli-grafica");
            cuerpo.appendChild(caja);
            pintarGrafica(caja, datos);

            const leyenda = crear("p", "oli-leyenda");
            const lluvia = crear("span", "oli-leyenda-barra", "Lluvia");
            lluvia.style.setProperty("--oli-color", "var(--oli-lluvia)");
            const evapo = crear("span", "oli-leyenda-barra", "ET0 (Penman-Monteith)");
            evapo.style.setProperty("--oli-color", "var(--oli-evapo)");
            const hargreaves = crear("span", "oli-leyenda-barra", "ET0 por Hargreaves");
            hargreaves.style.setProperty("--oli-color", "var(--oli-oro-claro)");
            leyenda.append(lluvia, evapo, hargreaves);
            cuerpo.appendChild(leyenda);
        }

        if (datos.prevision.length) {
            cuerpo.appendChild(crear("h4", "oli-subtitulo", "ET0 prevista (mm) y lluvia de los próximos días"));
            cuerpo.appendChild(tablaPrevision(datos.prevision));
        }
    }

    await pintar();
}


/* Fin de fichero: js/olivar/balance.js */
