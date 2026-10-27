/*
 * MeteoArchidona
 * Visor de estadísticas e informes
 *
 * Componente reutilizable: recibe el resultado del motor de la API
 * (POST /estadisticas/vista-previa, y más adelante las definiciones
 * guardadas) y lo dibuja como gráfica, tabla o ambas. La API no dibuja
 * nada: solo devuelve datos (docs/informes-estadisticas.md, 3.4).
 *
 * Se puede poner en cualquier página o dashboard:
 *
 *     import {crearVisorEstadisticas} from "/js/visor-estadisticas.js?v=…";
 *     const visor = crearVisorEstadisticas(contenedor);
 *     visor.mostrar(resultado);
 *
 * Gráfica en SVG propio, sin librerías de terceros:
 *
 * - líneas, barras, áreas y puntos;
 * - dos ejes, uno por unidad;
 * - huecos donde no hay datos (valor nulo);
 * - los grupos incompletos con marca hueca o barra atenuada;
 * - al pasar el dedo o el ratón, los valores de todas las series.
 *
 * El PDF se hace con la impresión del navegador («Guardar como PDF»):
 * cabecera con el logotipo y la ficha, y en el pie de cada página el
 * aviso de carácter informativo y el código de referencia.
 */


export const AVISO_INFORMATIVO =
    "Documento generado automáticamente por MeteoArchidona con datos de " +
    "estaciones meteorológicas particulares. Tiene carácter exclusivamente " +
    "informativo: los datos no están validados por ningún organismo oficial " +
    "y este documento no tiene validez como prueba, certificado ni " +
    "acreditación de ningún tipo. Para datos oficiales, consulte la Agencia " +
    "Estatal de Meteorología (AEMET).";


const ZONA = "Europe/Madrid";

const SVG = "http://www.w3.org/2000/svg";

const RUMBOS = [
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO",
];

const NOMBRES_AGRUPACION = {
    SIN_AGRUPAR: "Sin agrupar",
    HORA: "Por hora",
    DIA: "Por día",
    SEMANA: "Por semana",
    MES: "Por mes",
    ANIO: "Por año",
};

const NOMBRES_RESUMEN = {
    TOTAL: "total",
    ACUMULADO: "final",
    MAXIMA_ABSOLUTA: "máxima",
    MAXIMA_DIARIA: "máxima",
    MINIMA_ABSOLUTA: "mínima",
    DOMINANTE: "más frecuente",
    VALOR: "media",
    MEDIA: "media",
    MEDIA_MAXIMAS: "media",
    MEDIA_MINIMAS: "media",
};


/* ==========================================================
   PETICIÓN
   ========================================================== */

/*
 * Pide al motor una definición sin guardar.
 *
 * Administración pasa su cabecera Authorization; un usuario registrado
 * usa su cookie de sesión (conCookie). Devuelve el resultado o lanza un
 * Error con el mensaje de la API.
 */
export async function pedirVistaPrevia(
    urlApi,
    definicion,
    {cabeceras = {}, conCookie = false} = {}
){
    const respuesta = await fetch(`${urlApi}/estadisticas/vista-previa`, {
        method: "POST",
        headers: {"Content-Type": "application/json", ...cabeceras},
        body: JSON.stringify(definicion),
        credentials: conCookie ? "include" : "same-origin",
        cache: "no-store",
    });

    if(respuesta.ok){
        return respuesta.json();
    }

    throw new Error(await mensajeDeError(respuesta));
}


export async function mensajeDeError(respuesta){

    try{
        const datos = await respuesta.json();

        if(typeof datos.detail === "string"){
            return datos.detail;
        }

        if(Array.isArray(datos.detail) && datos.detail.length){
            return "Revisa la definición: " +
                datos.detail.map(e => e.msg).join("; ");
        }
    }catch{
        // Respuesta sin JSON.
    }

    return `No se ha podido calcular (HTTP ${respuesta.status}).`;
}


/* ==========================================================
   FORMATOS
   ========================================================== */

function formatoFecha(opciones){
    return new Intl.DateTimeFormat("es-ES", {timeZone: ZONA, ...opciones});
}

const FORMATOS = {
    hora: formatoFecha({hour: "2-digit", minute: "2-digit"}),
    diaHora: formatoFecha({day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit"}),
    dia: formatoFecha({day: "numeric", month: "numeric"}),
    diaLargo: formatoFecha({day: "numeric", month: "numeric", year: "numeric"}),
    mes: formatoFecha({month: "short", year: "2-digit"}),
    mesLargo: formatoFecha({month: "long", year: "numeric"}),
    anio: formatoFecha({year: "numeric"}),
    completo: formatoFecha({
        day: "numeric", month: "numeric", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    }),
};


function etiquetaInstante(fecha, agrupacion, variosDias, larga = false){

    switch(agrupacion){
    case "HORA":
        return variosDias || larga
            ? FORMATOS.diaHora.format(fecha)
            : FORMATOS.hora.format(fecha);
    case "DIA":
    case "SEMANA":
        return larga ? FORMATOS.diaLargo.format(fecha) : FORMATOS.dia.format(fecha);
    case "MES":
        return larga ? FORMATOS.mesLargo.format(fecha) : FORMATOS.mes.format(fecha);
    case "ANIO":
        return FORMATOS.anio.format(fecha);
    default:
        return variosDias || larga
            ? FORMATOS.diaHora.format(fecha)
            : FORMATOS.hora.format(fecha);
    }
}


export function formatearValor(valor, serie){

    if(valor === null || valor === undefined){
        return "—";
    }

    if(serie.variable === "DIRECCION_VIENTO"){
        const rumbo = RUMBOS[Math.round(valor / 22.5) % 16];
        return `${rumbo} (${Math.round(valor)}°)`;
    }

    return valor.toLocaleString("es-ES", {
        minimumFractionDigits: serie.decimales,
        maximumFractionDigits: serie.decimales,
    });
}


function conUnidad(texto, serie){
    if(texto === "—" || !serie.unidad || serie.variable === "DIRECCION_VIENTO"){
        return texto;
    }
    return `${texto} ${serie.unidad}`;
}


function textoPeriodo(resultado){

    const desde = new Date(resultado.desde);
    const hasta = new Date(resultado.hasta);
    const madrugada = f => FORMATOS.hora.format(f) === "00:00";

    if(madrugada(desde) && madrugada(hasta)){
        const ultimo = new Date(hasta.getTime() - 1);
        const a = FORMATOS.diaLargo.format(desde);
        const b = FORMATOS.diaLargo.format(ultimo);
        return a === b ? a : `${a} – ${b}`;
    }

    return `${FORMATOS.completo.format(desde)} – ${FORMATOS.completo.format(hasta)}`;
}


function codigoReferencia(resultado){

    if(resultado.codigo_referencia){
        return resultado.codigo_referencia;
    }

    const partes = Object.fromEntries(
        formatoFecha({
            year: "numeric", month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit", hourCycle: "h23",
        }).formatToParts(new Date(resultado.generado_en))
            .map(p => [p.type, p.value])
    );

    return `VP-${partes.year}${partes.month}${partes.day}-${partes.hour}${partes.minute}`;
}


/* ==========================================================
   UTILIDADES DE DOM
   ========================================================== */

function elemento(etiqueta, clase, texto){
    const nodo = document.createElement(etiqueta);
    if(clase){ nodo.className = clase; }
    if(texto !== undefined){ nodo.textContent = texto; }
    return nodo;
}


function svg(etiqueta, atributos = {}, texto){
    const nodo = document.createElementNS(SVG, etiqueta);
    for(const [clave, valor] of Object.entries(atributos)){
        nodo.setAttribute(clave, valor);
    }
    if(texto !== undefined){ nodo.textContent = texto; }
    return nodo;
}


/* ==========================================================
   ESCALAS
   ========================================================== */

function marcasBonitas(minimo, maximo, cantidad = 5){

    if(minimo === maximo){
        const margen = Math.abs(minimo) * 0.1 || 1;
        minimo -= margen;
        maximo += margen;
    }

    const bruto = (maximo - minimo) / cantidad;
    const potencia = 10 ** Math.floor(Math.log10(bruto));
    const paso = [1, 2, 2.5, 5, 10].map(f => f * potencia).find(p => p >= bruto);

    const inicio = Math.floor(minimo / paso) * paso;
    const fin = Math.ceil(maximo / paso) * paso;
    const marcas = [];

    for(let v = inicio; v <= fin + paso / 2; v += paso){
        marcas.push(Math.round(v / paso) * paso);
    }

    let decimales = 0;
    while(decimales < 4 && Math.abs(Math.round(paso * 10 ** decimales) - paso * 10 ** decimales) > 1e-9){
        decimales++;
    }

    return {minimo: inicio, maximo: fin, marcas, paso, decimales};
}


function escalaEje(series){

    const valores = series.flatMap(s => s.puntos.map(p => p.valor))
        .filter(v => v !== null && v !== undefined);

    if(!valores.length){
        return null;
    }

    let minimo = Math.min(...valores);
    let maximo = Math.max(...valores);

    if(series.some(s => s.trazo === "BARRAS" || s.trazo === "AREA")){
        minimo = Math.min(minimo, 0);
        maximo = Math.max(maximo, 0);
    }

    if(series.every(s => s.unidad === "%")){
        minimo = Math.max(minimo, 0);
        maximo = Math.min(Math.max(maximo, 1), 100);
    }

    return marcasBonitas(minimo, maximo);
}


/* ==========================================================
   GRÁFICA
   ========================================================== */

function dibujarGrafica(contenedor, resultado, tooltip){

    contenedor.replaceChildren();

    const series = resultado.series;
    const agrupada = resultado.agrupacion !== "SIN_AGRUPAR";
    const ancho = Math.max(320, Math.round(contenedor.clientWidth || 720));
    const alto = ancho < 560 ? 260 : 340;

    const izquierda = series.filter(s => s.eje !== "DERECHO");
    const derecha = series.filter(s => s.eje === "DERECHO");
    const escalas = {
        IZQUIERDO: escalaEje(izquierda),
        DERECHO: escalaEje(derecha),
    };

    if(!escalas.IZQUIERDO && !escalas.DERECHO){
        contenedor.append(elemento("p", "visor-est-vacio", "Sin datos en este periodo."));
        return;
    }

    const margen = {
        izquierda: escalas.IZQUIERDO ? 56 : 16,
        derecha: escalas.DERECHO ? 56 : 16,
        arriba: 28,
        abajo: 34,
    };

    const anchoUtil = ancho - margen.izquierda - margen.derecha;
    const altoUtil = alto - margen.arriba - margen.abajo;

    /* Eje X: ranuras iguales si está agrupado; tiempo real si no. */

    const referencia = series.reduce(
        (a, s) => (s.puntos.length > a.puntos.length ? s : a),
        series[0]
    );
    const instantes = referencia.puntos.map(p => new Date(p.instante));
    const n = Math.max(instantes.length, 1);
    const ranura = anchoUtil / n;

    const tiempos = series.flatMap(s => s.puntos.map(p => Date.parse(p.instante)));
    const tMin = Math.min(...tiempos);
    const tMax = Math.max(...tiempos);

    const xIndice = i => margen.izquierda + (i + 0.5) * ranura;
    const xTiempo = t => margen.izquierda +
        (tMax === tMin ? anchoUtil / 2 : (t - tMin) / (tMax - tMin) * anchoUtil);

    const xPunto = (punto, i) => agrupada ? xIndice(i) : xTiempo(Date.parse(punto.instante));

    const y = (valor, eje) => {
        const e = escalas[eje] || escalas.IZQUIERDO || escalas.DERECHO;
        return margen.arriba + altoUtil - (valor - e.minimo) / (e.maximo - e.minimo) * altoUtil;
    };

    const lienzo = svg("svg", {
        viewBox: `0 0 ${ancho} ${alto}`,
        class: "visor-est-svg",
        role: "img",
        "aria-label": resultado.nombre,
    });

    /* Rejilla y ejes Y */

    for(const lado of ["IZQUIERDO", "DERECHO"]){
        const e = escalas[lado];
        if(!e){ continue; }

        const serieEje = series.find(s => (s.eje === "DERECHO") === (lado === "DERECHO"));
        const xTexto = lado === "IZQUIERDO" ? margen.izquierda - 8 : ancho - margen.derecha + 8;

        for(const marca of e.marcas){
            const yy = y(marca, lado);

            if(lado === "IZQUIERDO" || !escalas.IZQUIERDO){
                lienzo.append(svg("line", {
                    x1: margen.izquierda, x2: ancho - margen.derecha, y1: yy, y2: yy,
                    class: marca === 0 ? "visor-est-cero" : "visor-est-rejilla",
                }));
            }

            lienzo.append(svg("text", {
                x: xTexto, y: yy + 4,
                "text-anchor": lado === "IZQUIERDO" ? "end" : "start",
                class: "visor-est-marca",
            }, marca.toLocaleString("es-ES", {
                minimumFractionDigits: e.decimales,
                maximumFractionDigits: e.decimales,
            })));
        }

        lienzo.append(svg("text", {
            x: lado === "IZQUIERDO" ? margen.izquierda - 8 : ancho - margen.derecha + 8,
            y: 12,
            "text-anchor": lado === "IZQUIERDO" ? "start" : "end",
            class: "visor-est-unidad",
        }, serieEje?.unidad || ""));
    }

    /* Eje X: unas seis etiquetas repartidas */

    const variosDias = instantes.length > 1 &&
        FORMATOS.diaLargo.format(instantes[0]) !==
        FORMATOS.diaLargo.format(instantes[instantes.length - 1]);

    const cada = Math.max(1, Math.ceil(instantes.length / Math.max(2, Math.floor(anchoUtil / 90))));

    instantes.forEach((fecha, i) => {
        if(i % cada !== 0){ return; }
        const xx = agrupada ? xIndice(i) : xTiempo(fecha.getTime());
        lienzo.append(svg("text", {
            x: xx, y: alto - 12, "text-anchor": "middle", class: "visor-est-marca",
        }, etiquetaInstante(fecha, resultado.agrupacion, variosDias)));
    });

    /* Barras: varias series de barras se ponen una al lado de otra */

    const barras = series.filter(s => s.trazo === "BARRAS");

    /* Orden de dibujo: barras y áreas al fondo, líneas y puntos encima. */
    const capa = s => (s.trazo === "BARRAS" ? 0 : s.trazo === "AREA" ? 1 : 2);
    const ordenDibujo = [...series].sort((a, b) => capa(a) - capa(b));

    for(const serie of ordenDibujo){

        const eje = serie.eje === "DERECHO" ? "DERECHO" : "IZQUIERDO";
        const grupo = svg("g", {class: "visor-est-serie"});
        grupo.style.setProperty("--color-serie", serie.color);

        if(serie.trazo === "BARRAS"){
            const posicion = barras.indexOf(serie);
            const anchoGrupo = agrupada ? ranura * 0.8 : Math.max(1, anchoUtil / n * 0.8);
            const anchoBarra = Math.max(1, anchoGrupo / (agrupada ? barras.length : 1));
            const base = y(Math.max(0, (escalas[eje] || escalas.IZQUIERDO).minimo), eje);

            serie.puntos.forEach((p, i) => {
                if(p.valor === null){ return; }
                const x0 = xPunto(p, i) - anchoGrupo / 2 + (agrupada ? posicion * anchoBarra : 0);
                const yy = y(p.valor, eje);
                grupo.append(svg("rect", {
                    x: x0, width: anchoBarra,
                    y: Math.min(yy, base), height: Math.max(1, Math.abs(base - yy)),
                    class: p.incompleto ? "visor-est-barra incompleta" : "visor-est-barra",
                }));
            });

        }else{
            const tramos = [];
            let actual = [];

            serie.puntos.forEach((p, i) => {
                if(p.valor === null){
                    if(actual.length){ tramos.push(actual); actual = []; }
                    return;
                }
                actual.push([xPunto(p, i), y(p.valor, eje), p]);
            });
            if(actual.length){ tramos.push(actual); }

            if(serie.trazo === "AREA"){
                const base = y(Math.max(0, (escalas[eje] || escalas.IZQUIERDO).minimo), eje);
                for(const tramo of tramos){
                    const d = `M${tramo[0][0]},${base} ` +
                        tramo.map(([x, yy]) => `L${x},${yy}`).join(" ") +
                        ` L${tramo[tramo.length - 1][0]},${base} Z`;
                    grupo.append(svg("path", {d, class: "visor-est-area"}));
                }
            }

            if(serie.trazo !== "PUNTOS"){
                for(const tramo of tramos){
                    if(tramo.length === 1){
                        grupo.append(svg("circle", {
                            cx: tramo[0][0], cy: tramo[0][1], r: 2.5, class: "visor-est-punto",
                        }));
                        continue;
                    }
                    grupo.append(svg("path", {
                        d: tramo.map(([x, yy], i) => `${i ? "L" : "M"}${x},${yy}`).join(" "),
                        class: "visor-est-linea",
                    }));
                }
            }

            for(const tramo of tramos){
                for(const [x, yy, p] of tramo){
                    if(serie.trazo === "PUNTOS"){
                        grupo.append(svg("circle", {
                            cx: x, cy: yy, r: 2.8,
                            class: p.incompleto ? "visor-est-punto incompleto" : "visor-est-punto",
                        }));
                    }else if(p.incompleto){
                        grupo.append(svg("circle", {cx: x, cy: yy, r: 3.2, class: "visor-est-punto incompleto"}));
                    }
                }
            }
        }

        lienzo.append(grupo);
    }

    /* Cursor y ventana de valores */

    const cursor = svg("line", {
        y1: margen.arriba, y2: margen.arriba + altoUtil, class: "visor-est-cursor", visibility: "hidden",
    });
    lienzo.append(cursor);

    const zona = svg("rect", {
        x: margen.izquierda, y: margen.arriba, width: anchoUtil, height: altoUtil,
        class: "visor-est-zona",
    });
    lienzo.append(zona);

    const mostrarEn = evento => {
        const caja = lienzo.getBoundingClientRect();
        const xx = (evento.clientX - caja.left) * (ancho / caja.width);

        let indice;
        let fecha;

        if(agrupada){
            indice = Math.min(n - 1, Math.max(0, Math.floor((xx - margen.izquierda) / ranura)));
            fecha = instantes[indice];
        }else{
            const t = tMin + (xx - margen.izquierda) / anchoUtil * (tMax - tMin);
            fecha = new Date(t);
        }

        if(!fecha){ return; }

        const filas = series.map(serie => {
            let punto;
            if(agrupada){
                punto = serie.puntos[indice];
            }else{
                punto = serie.puntos.reduce((mejor, p) =>
                    !mejor || Math.abs(Date.parse(p.instante) - fecha.getTime()) <
                    Math.abs(Date.parse(mejor.instante) - fecha.getTime()) ? p : mejor, null);
            }
            return [serie, punto];
        });

        const xCursor = agrupada ? xIndice(indice) : xTiempo(fecha.getTime());
        cursor.setAttribute("x1", xCursor);
        cursor.setAttribute("x2", xCursor);
        cursor.setAttribute("visibility", "visible");

        const fechaPunto = agrupada ? fecha : new Date(filas[0][1]?.instante || fecha);
        tooltip.replaceChildren(
            elemento("div", "visor-est-tooltip-fecha",
                etiquetaInstante(fechaPunto, resultado.agrupacion, true, true))
        );

        for(const [serie, punto] of filas){
            const fila = elemento("div", "visor-est-tooltip-fila");
            const muestra = elemento("span", "visor-est-muestra");
            muestra.style.setProperty("--color-serie", serie.color);
            fila.append(
                muestra,
                elemento("span", "", serie.etiqueta),
                elemento("strong", "",
                    conUnidad(formatearValor(punto?.valor ?? null, serie), serie) +
                    (punto?.incompleto ? " *" : ""))
            );
            tooltip.append(fila);
        }

        tooltip.hidden = false;
        const proporcion = xCursor / ancho;
        tooltip.classList.toggle("a-la-izquierda", proporcion > 0.55);
        tooltip.style.setProperty("--x", `${proporcion * 100}%`);
    };

    const ocultar = () => {
        cursor.setAttribute("visibility", "hidden");
        tooltip.hidden = true;
    };

    zona.addEventListener("pointermove", mostrarEn);
    zona.addEventListener("pointerdown", mostrarEn);
    zona.addEventListener("pointerleave", ocultar);

    contenedor.append(lienzo);
}


/* ==========================================================
   LEYENDA
   ========================================================== */

function dibujarLeyenda(contenedor, resultado){

    contenedor.replaceChildren();

    const dosEjes = resultado.series.some(s => s.eje === "DERECHO") &&
        resultado.series.some(s => s.eje !== "DERECHO");

    for(const serie of resultado.series){
        const item = elemento("span", "visor-est-leyenda-item");
        const muestra = elemento("span", `visor-est-muestra trazo-${serie.trazo.toLowerCase()}`);
        muestra.style.setProperty("--color-serie", serie.color);

        item.append(muestra, document.createTextNode(serie.etiqueta));

        if(dosEjes){
            item.append(elemento("small", "",
                serie.eje === "DERECHO" ? " (eje dcho.)" : " (eje izdo.)"));
        }

        contenedor.append(item);
    }
}


/* ==========================================================
   TABLA
   ========================================================== */

function dibujarTabla(contenedor, resultado){

    contenedor.replaceChildren();

    const series = resultado.series;
    const claves = new Map();

    for(const serie of series){
        for(const p of serie.puntos){
            if(!claves.has(p.instante)){
                claves.set(p.instante, Date.parse(p.instante));
            }
        }
    }

    const filasOrdenadas = [...claves.entries()].sort((a, b) => a[1] - b[1]).map(e => e[0]);
    const indices = series.map(s => new Map(s.puntos.map(p => [p.instante, p])));

    const tabla = elemento("table", "visor-est-tabla");
    const cabecera = elemento("tr");
    cabecera.append(elemento("th", "", "Fecha"));

    for(const serie of series){
        const th = elemento("th");
        th.append(document.createTextNode(serie.etiqueta));
        if(serie.unidad && serie.variable !== "DIRECCION_VIENTO"){
            th.append(elemento("small", "", ` (${serie.unidad})`));
        }
        cabecera.append(th);
    }

    const thead = elemento("thead");
    thead.append(cabecera);

    const cuerpo = elemento("tbody");
    const variosDias = filasOrdenadas.length > 1 &&
        FORMATOS.diaLargo.format(new Date(filasOrdenadas[0])) !==
        FORMATOS.diaLargo.format(new Date(filasOrdenadas[filasOrdenadas.length - 1]));

    let hayIncompletos = false;

    for(const clave of filasOrdenadas){
        const tr = elemento("tr");
        tr.append(elemento("td", "",
            etiquetaInstante(new Date(clave), resultado.agrupacion, variosDias, true)));

        series.forEach((serie, i) => {
            const punto = indices[i].get(clave);
            let texto = formatearValor(punto?.valor ?? null, serie);
            if(punto?.incompleto){
                texto += " *";
                hayIncompletos = true;
            }
            tr.append(elemento("td", "numero", texto));
        });

        cuerpo.append(tr);
    }

    const pie = elemento("tfoot");
    const resumen = elemento("tr");
    resumen.append(elemento("th", "", "Resumen"));

    for(const serie of series){
        const td = elemento("td", "numero");
        td.append(document.createTextNode(formatearValor(serie.resumen, serie)));
        td.append(elemento("small", "", ` ${NOMBRES_RESUMEN[serie.calculo] || ""}`));
        resumen.append(td);
    }

    pie.append(resumen);
    tabla.append(thead, cuerpo, pie);

    const marco = elemento("div", "visor-est-tabla-marco");
    marco.append(tabla);
    contenedor.append(marco);

    if(hayIncompletos){
        contenedor.append(elemento("p", "visor-est-nota",
            "* Datos incompletos: faltan más del 20 % de los registros de ese periodo."));
    }
}


/* ==========================================================
   COMPONENTE
   ========================================================== */

export function crearVisorEstadisticas(contenedor){

    const raiz = elemento("div", "visor-est");

    /* Cabecera de impresión: logotipo y ficha */
    const impresion = elemento("div", "visor-est-impresion");
    const logo = elemento("img", "visor-est-logo");
    logo.src = "/assets/logo-meteoarchidona.png";
    logo.alt = "MeteoArchidona";
    const fichaImpresion = elemento("div", "visor-est-ficha-impresion");
    impresion.append(logo, fichaImpresion);

    const barra = elemento("div", "visor-est-barra");
    const titulos = elemento("div", "visor-est-titulos");
    const titulo = elemento("h3", "visor-est-titulo");
    const descripcion = elemento("p", "visor-est-descripcion");
    const ficha = elemento("p", "visor-est-ficha");
    titulos.append(titulo, descripcion, ficha);

    const acciones = elemento("div", "visor-est-acciones");
    const botonPdf = elemento("button", "boton visor-est-pdf", "Descargar PDF");
    botonPdf.type = "button";
    acciones.append(botonPdf);
    barra.append(titulos, acciones);

    const estado = elemento("p", "visor-est-estado");
    const leyenda = elemento("div", "visor-est-leyenda");
    const marcoGrafica = elemento("div", "visor-est-marco-grafica");
    const grafica = elemento("div", "visor-est-grafica");
    const tooltip = elemento("div", "visor-est-tooltip");
    tooltip.hidden = true;
    marcoGrafica.append(grafica, tooltip);
    const tabla = elemento("div", "visor-est-tabla-zona");

    const pie = elemento("footer", "visor-est-pie");
    const aviso = elemento("p", "visor-est-aviso", AVISO_INFORMATIVO);
    const referencia = elemento("p", "visor-est-referencia");
    pie.append(aviso, referencia);

    raiz.append(impresion, barra, estado, leyenda, marcoGrafica, tabla, pie);
    contenedor.replaceChildren(raiz);

    let resultadoActual = null;

    const redibujar = () => {
        if(resultadoActual && !marcoGrafica.hidden){
            dibujarGrafica(grafica, resultadoActual, tooltip);
        }
    };

    if(typeof ResizeObserver === "function"){
        let ultimoAncho = 0;
        new ResizeObserver(entradas => {
            const nuevo = Math.round(entradas[0].contentRect.width);
            if(Math.abs(nuevo - ultimoAncho) > 8){
                ultimoAncho = nuevo;
                redibujar();
            }
        }).observe(grafica);
    }

    /*
     * Se imprime una copia del visor colgada del <body>, con todo lo
     * demás retirado (css): así no quedan páginas en blanco por el
     * espacio que ocupa el resto de la página.
     */
    botonPdf.addEventListener("click", () => {
        if(!resultadoActual){ return; }

        document.querySelector(".visor-est-hoja-impresion")?.remove();

        const hoja = elemento("div", "visor-est-hoja-impresion");
        const copia = raiz.cloneNode(true);
        copia.classList.add("imprimiendo");
        copia.querySelector(".visor-est-tooltip")?.setAttribute("hidden", "");
        hoja.append(copia);
        document.body.append(hoja);
        document.body.classList.add("imprimiendo-estadistica");

        const terminar = () => {
            document.body.classList.remove("imprimiendo-estadistica");
            hoja.remove();
            window.removeEventListener("afterprint", terminar);
        };

        window.addEventListener("afterprint", terminar);
        window.print();
    });

    function vaciarZonas(){
        leyenda.replaceChildren();
        grafica.replaceChildren();
        tabla.replaceChildren();
        tooltip.hidden = true;
    }

    return {

        mostrar(resultado){
            resultadoActual = resultado;
            raiz.classList.remove("con-error", "cargando");
            estado.textContent = "";

            titulo.textContent = resultado.nombre;
            descripcion.textContent = resultado.descripcion || "";
            descripcion.hidden = !resultado.descripcion;

            const estaciones = resultado.estaciones.map(e => e.nombre).join(", ");
            const textoFicha = `${textoPeriodo(resultado)} · ` +
                `${NOMBRES_AGRUPACION[resultado.agrupacion] || resultado.agrupacion}` +
                (estaciones ? ` · ${estaciones}` : "");
            ficha.textContent = textoFicha;

            fichaImpresion.replaceChildren(
                elemento("strong", "", resultado.nombre),
                elemento("span", "", textoFicha),
                elemento("span", "", `Generado el ${FORMATOS.completo.format(new Date(resultado.generado_en))}`)
            );

            referencia.textContent = `meteoarchidona.com · Ref. ${codigoReferencia(resultado)}`;

            const conGrafica = resultado.presentacion !== "TABLA";
            const conTabla = resultado.presentacion !== "GRAFICA";

            marcoGrafica.hidden = !conGrafica;
            leyenda.hidden = !conGrafica;
            tabla.hidden = !conTabla;

            vaciarZonas();

            if(conGrafica){
                dibujarLeyenda(leyenda, resultado);
                dibujarGrafica(grafica, resultado, tooltip);
            }

            if(conTabla){
                dibujarTabla(tabla, resultado);
            }

            botonPdf.disabled = false;
        },

        mostrarCargando(){
            raiz.classList.add("cargando");
            estado.textContent = "Calculando…";
        },

        mostrarError(mensaje){
            raiz.classList.add("con-error");
            raiz.classList.remove("cargando");
            estado.textContent = mensaje;
        },

        vaciar(){
            resultadoActual = null;
            titulo.textContent = "";
            ficha.textContent = "";
            descripcion.textContent = "";
            estado.textContent = "";
            botonPdf.disabled = true;
            vaciarZonas();
        },
    };
}


// Fin de fichero: js/visor-estadisticas.js
