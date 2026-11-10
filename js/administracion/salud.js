/*
 * MeteoArchidona
 * Administración · Salud de estaciones.
 *
 * Decisiones de José del 10-11-2026 (docs/salud-estaciones.md de la API):
 *
 * - Una tarjeta por estación con su semáforo (verde, ámbar, rojo) y los
 *   indicadores: datos recientes, radio del ISS, recepción de la última
 *   hora, wifi de la consola y batería del transmisor. Umbrales fijos en
 *   la API; aquí solo se pinta lo que llega.
 * - Gráficas de radio, wifi y recepción de 24 horas o 7 días, una por
 *   medida, con las líneas de ámbar y rojo, y el valor al pasar el ratón.
 * - Alertas de los últimos 7 días (las abiertas, primero).
 * - Se pone al día solo cada minuto mientras el apartado está a la vista.
 *
 * GET /admin/salud · /admin/salud/{codigo}/series?horas=24|168
 *
 * Las horas, en hora de Madrid. El texto nunca se mete como HTML.
 */

import {
    $,
    mostrarEstado
} from "./estado.js?v=20261026-cache1";

import {
    peticionJson
} from "./api.js?v=20261026-cache1";


const RUTA = "/admin/salud";
const ZONA = "Europe/Madrid";
const REFRESCO_MS = 60 * 1000;
const SVG = "http://www.w3.org/2000/svg";

const NIVELES = {
    VERDE: "Todo bien",
    AMBAR: "Algo falla",
    ROJO: "Hay que mirarla",
    SIN_DATO: "Sin información"
};

/*
 * Una gráfica por medida (nunca dos escalas en la misma). Los umbrales
 * son los de dominio/salud_estaciones.py de la API: si cambian allí,
 * cambian aquí.
 */
const MEDIDAS = [
    {
        clave: "radio_dbm",
        titulo: "Radio del ISS",
        unidad: "dBm",
        ambar: -80,
        rojo: -85,
        minimo: -100,
        maximo: -40,
        decimales: 0
    },
    {
        clave: "recepcion_pct",
        titulo: "Recepción",
        unidad: "%",
        ambar: 95,
        rojo: 80,
        minimo: 70,
        maximo: 100,
        decimales: 1
    },
    {
        clave: "wifi_dbm",
        titulo: "Wifi de la consola",
        unidad: "dBm",
        ambar: -70,
        rojo: -80,
        minimo: -95,
        maximo: -40,
        decimales: 0
    }
];

let datos = null;
let seleccionada = "";
let horas = 24;
let serie = [];
let eventosConfigurados = false;
let temporizador = null;
let peticionSerie = 0;
let anchoPintado = 0;


/* ==========================================================
   UTILIDADES
   ========================================================== */

function crear(etiqueta, clase, texto){

    const elemento = document.createElement(etiqueta);

    if(clase){
        elemento.className = clase;
    }
    if(texto !== undefined && texto !== null){
        elemento.textContent = texto;
    }
    return elemento;
}


function crearSvg(etiqueta, atributos = {}){

    const elemento = document.createElementNS(SVG, etiqueta);

    for(const [nombre, valor] of Object.entries(atributos)){
        elemento.setAttribute(nombre, valor);
    }
    return elemento;
}


function hora(valor, opciones = {hour: "2-digit", minute: "2-digit"}){

    return new Date(valor).toLocaleString("es-ES", {timeZone: ZONA, ...opciones});
}


function fechaHora(valor){

    if(!valor){
        return "—";
    }

    return hora(valor, {day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"});
}


function hace(valor){

    if(!valor){
        return "sin datos";
    }

    const minutos = Math.max(0, Math.round((Date.now() - new Date(valor)) / 60000));

    if(minutos < 1){
        return "ahora mismo";
    }
    if(minutos < 60){
        return `hace ${minutos} min`;
    }

    const horasPasadas = Math.floor(minutos / 60);

    if(horasPasadas < 48){
        return `hace ${horasPasadas} h ${minutos % 60} min`;
    }
    return `hace ${Math.floor(horasPasadas / 24)} días`;
}


function numero(valor, decimales){

    return valor.toLocaleString("es-ES", {
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales
    }).replace("-", "−");
}


function luz(nivel){

    const punto = crear("span", "salud-luz");
    punto.dataset.nivel = nivel;
    punto.setAttribute("aria-hidden", "true");
    return punto;
}


function moduloVisible(){

    return Boolean($("modulo-salud")?.classList.contains("activo"));
}


/* ==========================================================
   TARJETAS
   ========================================================== */

function tarjeta(estacion){

    const caja = crear("article", "salud-tarjeta");
    caja.dataset.nivel = estacion.nivel;
    caja.classList.toggle("seleccionada", estacion.codigo === seleccionada);

    const cabecera = crear("header", "salud-tarjeta-cabecera");
    const nombre = crear("div", "salud-tarjeta-nombre");
    nombre.append(
        crear("strong", null, estacion.nombre),
        crear("span", "salud-tarjeta-proveedor", estacion.proveedor || "")
    );

    const chip = crear("span", "salud-chip");
    chip.dataset.nivel = estacion.nivel;
    chip.append(luz(estacion.nivel), crear("span", null, estacion.nivel_nombre || NIVELES[estacion.nivel]));

    cabecera.append(nombre, chip);

    const ultimo = crear(
        "p",
        "salud-tarjeta-ultimo",
        estacion.ultimo_dato
            ? `Último dato: ${fechaHora(estacion.ultimo_dato)} (${hace(estacion.ultimo_dato)})`
            : "Sin datos todavía"
    );

    const lista = crear("ul", "salud-indicadores");

    for(const indicador of estacion.indicadores){
        const linea = crear("li", "salud-indicador");
        linea.dataset.nivel = indicador.nivel;
        linea.append(
            luz(indicador.nivel),
            crear("span", "salud-indicador-nombre", indicador.nombre),
            crear("span", "salud-indicador-texto", indicador.texto)
        );
        lista.appendChild(linea);
    }

    caja.append(cabecera, ultimo, lista);

    if(estacion.alertas_abiertas.length){
        const alertas = crear("ul", "salud-tarjeta-alertas");
        for(const alerta of estacion.alertas_abiertas){
            alertas.appendChild(
                crear("li", null, `${alerta.indicador} desde ${fechaHora(alerta.desde)}`)
            );
        }
        caja.appendChild(alertas);
    }

    const ver = crear("button", "boton boton-mini boton-secundario salud-ver", "Ver gráficas");
    ver.type = "button";
    ver.addEventListener("click", () => {
        elegirEstacion(estacion.codigo);
        $("graficasSalud")?.scrollIntoView({behavior: "smooth", block: "start"});
    });
    caja.appendChild(ver);

    return caja;
}


function pintarTarjetas(){

    const zona = $("tarjetasSalud");

    if(!zona || !datos){
        return;
    }

    if(!datos.estaciones.length){
        zona.replaceChildren(crear("p", "modulo-intro", "No hay estaciones activas."));
        return;
    }

    zona.replaceChildren(...datos.estaciones.map(tarjeta));
}


function pintarSelector(){

    const selector = $("estacionGraficasSalud");

    if(!selector || !datos){
        return;
    }

    selector.replaceChildren(
        ...datos.estaciones.map(estacion => new Option(estacion.nombre, estacion.codigo))
    );
    selector.value = seleccionada;
}


function pintarAlertas(){

    const lista = $("alertasSalud");

    if(!lista || !datos){
        return;
    }

    if(!datos.alertas_recientes.length){
        lista.replaceChildren(crear("li", "salud-alertas-vacia", "Ninguna alerta en los últimos 7 días."));
        return;
    }

    lista.replaceChildren(...datos.alertas_recientes.map(alerta => {
        const linea = crear("li", "salud-alerta");
        linea.dataset.abierta = alerta.hasta ? "no" : "si";

        const cuando = alerta.hasta
            ? `${fechaHora(alerta.desde)} → ${fechaHora(alerta.hasta)}`
            : `desde ${fechaHora(alerta.desde)} · sigue abierta`;

        linea.append(
            luz(alerta.hasta ? "SIN_DATO" : "ROJO"),
            crear("span", "salud-alerta-mensaje", alerta.mensaje),
            crear("span", "salud-alerta-cuando", cuando)
        );
        return linea;
    }));
}


/* ==========================================================
   GRÁFICAS
   ========================================================== */

function marcasTiempo(inicio, fin){

    // Cada 3 horas en 24 h; a las 00:00 de cada día en 7 días.
    const paso = 3600 * 1000;
    const marcas = [];

    for(let t = Math.ceil(inicio / paso) * paso; t <= fin; t += paso){
        const horaMadrid = Number(hora(t, {hour: "2-digit", hourCycle: "h23"}));
        if(horas <= 48 ? horaMadrid % 3 === 0 : horaMadrid === 0){
            marcas.push(t);
        }
    }
    return marcas;
}


function etiquetaTiempo(t){

    return horas <= 48
        ? hora(t)
        : hora(t, {weekday: "short", day: "numeric"});
}


function grafica(medida, ancho){

    const caja = crear("figure", "salud-grafica");
    const titulo = crear("figcaption", "salud-grafica-titulo");
    titulo.append(
        crear("strong", null, medida.titulo),
        crear("span", null, ` (${medida.unidad})`)
    );
    caja.appendChild(titulo);

    const puntos = serie
        .filter(tramo => tramo[medida.clave] !== null && tramo[medida.clave] !== undefined)
        .map(tramo => ({t: new Date(tramo.instante).getTime(), v: Number(tramo[medida.clave])}));

    if(!puntos.length){
        caja.appendChild(crear("p", "salud-grafica-vacia", "Sin datos de esta medida en el periodo."));
        return caja;
    }

    const alto = 170;
    const margen = {arriba: 10, derecha: 64, abajo: 24, izquierda: 40};
    const anchoUtil = Math.max(120, ancho - margen.izquierda - margen.derecha);
    const altoUtil = alto - margen.arriba - margen.abajo;

    const fin = Date.now();
    const inicio = fin - horas * 3600 * 1000;

    const valores = puntos.map(punto => punto.v);
    let minimo = Math.min(medida.minimo, ...valores);
    let maximo = Math.max(medida.maximo, ...valores);
    minimo = Math.floor(minimo / 10) * 10;
    maximo = Math.ceil(maximo / 10) * 10;
    if(maximo === minimo){
        maximo = minimo + 10;
    }

    const x = t => margen.izquierda + (t - inicio) / (fin - inicio) * anchoUtil;
    const y = v => margen.arriba + (maximo - v) / (maximo - minimo) * altoUtil;
    // Las líneas de 1 px, en medio píxel para que salgan nítidas.
    const yNitida = v => Math.round(y(v)) + 0.5;

    const lienzo = crearSvg("svg", {
        width: ancho,
        height: alto,
        viewBox: `0 0 ${ancho} ${alto}`,
        role: "img",
        "aria-label": `${medida.titulo} de las últimas ${horas === 24 ? "24 horas" : "7 días"}`
    });
    lienzo.classList.add("salud-svg");

    // Rejilla y eje de valores.
    const pasoY = (maximo - minimo) / 10 > 3 ? 10 : 5;
    for(let v = minimo; v <= maximo; v += pasoY){
        if((maximo - minimo) > 40 && (v - minimo) % 20 !== 0){
            continue;
        }
        // Donde cae un umbral, solo el umbral: la rejilla lo apagaría.
        if(v !== medida.ambar && v !== medida.rojo){
            lienzo.appendChild(
                crearSvg("line", {class: "salud-rejilla", x1: margen.izquierda, x2: margen.izquierda + anchoUtil, y1: yNitida(v), y2: yNitida(v)})
            );
        }
        lienzo.append(
            Object.assign(crearSvg("text", {class: "salud-eje", x: margen.izquierda - 6, y: y(v) + 3, "text-anchor": "end"}), {textContent: numero(v, 0)})
        );
    }

    // Eje del tiempo.
    for(const t of marcasTiempo(inicio, fin)){
        lienzo.append(
            crearSvg("line", {class: "salud-rejilla salud-rejilla-tiempo", x1: x(t), x2: x(t), y1: margen.arriba, y2: margen.arriba + altoUtil}),
            Object.assign(crearSvg("text", {class: "salud-eje", x: x(t), y: alto - 6, "text-anchor": "middle"}), {textContent: etiquetaTiempo(t)})
        );
    }

    // Umbrales, con su nombre a la derecha.
    for(const [nivel, valor, nombre] of [["AMBAR", medida.ambar, "ámbar"], ["ROJO", medida.rojo, "rojo"]]){
        if(valor < minimo || valor > maximo){
            continue;
        }
        const linea = crearSvg("line", {class: "salud-umbral", x1: margen.izquierda, x2: margen.izquierda + anchoUtil, y1: yNitida(valor), y2: yNitida(valor)});
        linea.dataset.nivel = nivel;
        const texto = crearSvg("text", {class: "salud-umbral-texto", x: margen.izquierda + anchoUtil + 6, y: y(valor) + 3});
        texto.textContent = `${numero(valor, 0)} ${nombre}`;
        lienzo.append(linea, texto);
    }

    // La línea, cortada donde faltan tramos.
    const tramo = (horas <= 48 ? 600 : 3600) * 1000;
    let d = "";
    let anterior = null;
    for(const punto of puntos){
        const corte = anterior === null || punto.t - anterior.t > tramo * 2.5;
        d += `${corte ? "M" : "L"}${x(punto.t).toFixed(1)},${y(punto.v).toFixed(1)}`;
        anterior = punto;
    }
    lienzo.appendChild(crearSvg("path", {class: "salud-linea", d}));

    // Puntos sueltos (sin vecinos) para que no desaparezcan.
    puntos.forEach((punto, i) => {
        const antes = puntos[i - 1];
        const despues = puntos[i + 1];
        const solo = (!antes || punto.t - antes.t > tramo * 2.5) && (!despues || despues.t - punto.t > tramo * 2.5);
        if(solo){
            lienzo.appendChild(crearSvg("circle", {class: "salud-punto-suelto", cx: x(punto.t), cy: y(punto.v), r: 2.5}));
        }
    });

    // Capa del ratón: guía vertical, punto y globo con el valor.
    const guia = crearSvg("line", {class: "salud-guia", y1: margen.arriba, y2: margen.arriba + altoUtil});
    const marca = crearSvg("circle", {class: "salud-marca", r: 4});
    guia.style.display = "none";
    marca.style.display = "none";
    const zona = crearSvg("rect", {class: "salud-zona", x: margen.izquierda, y: margen.arriba, width: anchoUtil, height: altoUtil});
    lienzo.append(guia, marca, zona);

    const globo = crear("div", "salud-globo");
    globo.hidden = true;

    const esconder = () => {
        guia.style.display = "none";
        marca.style.display = "none";
        globo.hidden = true;
    };

    zona.addEventListener("pointermove", evento => {
        const caja = lienzo.getBoundingClientRect();
        const t = inicio + (evento.clientX - caja.left - margen.izquierda) / anchoUtil * (fin - inicio);
        let cerca = puntos[0];
        for(const punto of puntos){
            if(Math.abs(punto.t - t) < Math.abs(cerca.t - t)){
                cerca = punto;
            }
        }
        if(Math.abs(cerca.t - t) > tramo * 3){
            esconder();
            return;
        }
        const px = x(cerca.t);
        const py = y(cerca.v);
        guia.setAttribute("x1", px);
        guia.setAttribute("x2", px);
        marca.setAttribute("cx", px);
        marca.setAttribute("cy", py);
        guia.style.display = "";
        marca.style.display = "";
        globo.replaceChildren(
            crear("strong", null, `${numero(cerca.v, medida.decimales)} ${medida.unidad}`),
            crear("span", null, horas <= 48 ? hora(cerca.t) : fechaHora(cerca.t))
        );
        globo.hidden = false;
        globo.style.left = `${px}px`;
        globo.style.top = `${py}px`;
        globo.classList.toggle("a-la-izquierda", px > ancho * 0.7);
    });
    zona.addEventListener("pointerleave", esconder);

    const marco = crear("div", "salud-grafica-marco");
    marco.append(lienzo, globo);
    caja.appendChild(marco);

    return caja;
}


function pintarGraficas(){

    const zona = $("graficasSalud");

    if(!zona){
        return;
    }

    const estacion = datos?.estaciones.find(item => item.codigo === seleccionada);
    const titulo = $("tituloGraficasSalud");
    if(titulo){
        titulo.textContent = estacion ? `Gráficas · ${estacion.nombre}` : "Gráficas";
    }

    if(!estacion){
        zona.replaceChildren();
        return;
    }

    const ancho = Math.max(280, Math.floor(zona.clientWidth || 600));
    anchoPintado = zona.clientWidth;
    zona.replaceChildren(...MEDIDAS.map(medida => grafica(medida, ancho)));
}


async function cargarSerie(){

    if(!seleccionada){
        serie = [];
        pintarGraficas();
        return;
    }

    const numeroPeticion = ++peticionSerie;

    try{
        const respuesta = await peticionJson(
            `${RUTA}/${encodeURIComponent(seleccionada)}/series?horas=${horas}`
        );
        if(numeroPeticion !== peticionSerie){
            return;
        }
        serie = respuesta;
        pintarGraficas();
    }catch(error){
        if(numeroPeticion !== peticionSerie){
            return;
        }
        serie = [];
        $("graficasSalud")?.replaceChildren(
            crear("p", "salud-grafica-vacia", error.message || "No se han podido cargar las gráficas.")
        );
    }
}


function elegirEstacion(codigo){

    seleccionada = codigo;
    const selector = $("estacionGraficasSalud");
    if(selector){
        selector.value = codigo;
    }
    pintarTarjetas();
    cargarSerie();
}


/* ==========================================================
   CARGA
   ========================================================== */

export async function cargarSalud(){

    if(!$("modulo-salud")){
        return;
    }

    const estado = $("estadoSalud");

    try{
        datos = await peticionJson(RUTA);

        if(!datos.estaciones.some(estacion => estacion.codigo === seleccionada)){
            // La primera en rojo, o la primera de la lista.
            const roja = datos.estaciones.find(estacion => estacion.nivel === "ROJO");
            seleccionada = (roja || datos.estaciones[0])?.codigo || "";
        }

        pintarTarjetas();
        pintarSelector();
        pintarAlertas();

        const horaSalud = $("horaSalud");
        if(horaSalud){
            horaSalud.textContent = `Actualizado a las ${hora(Date.now())}`;
        }

        mostrarEstado(estado, "", "info");
        vigilar();
        await cargarSerie();
    }catch(error){
        mostrarEstado(
            estado,
            error.message || "No se ha podido cargar la salud de las estaciones.",
            "error"
        );
        throw error;
    }
}


/* Cada minuto, solo con el apartado a la vista. */
function vigilar(){

    if(temporizador !== null){
        return;
    }

    temporizador = setInterval(() => {
        if(moduloVisible() && document.visibilityState === "visible"){
            recargar();
        }
    }, REFRESCO_MS);
}


function recargar(){

    cargarSalud().catch(() => {});
}


export function configurarEventosSalud(){

    if(eventosConfigurados){
        return;
    }

    eventosConfigurados = true;

    $("botonRecargarSalud")?.addEventListener("click", recargar);

    $("estacionGraficasSalud")?.addEventListener("change", evento => {
        elegirEstacion(evento.target.value);
    });

    document.querySelectorAll("#modulo-salud .salud-periodo [data-horas]").forEach(boton => {
        boton.addEventListener("click", () => {
            horas = Number(boton.dataset.horas);
            document.querySelectorAll("#modulo-salud .salud-periodo [data-horas]").forEach(otro => {
                const pulsado = otro === boton;
                otro.setAttribute("aria-pressed", String(pulsado));
                otro.classList.toggle("boton-secundario", !pulsado);
            });
            cargarSerie();
        });
    });

    // Al volver al apartado, todo al día.
    window.addEventListener("hashchange", () => {
        if(moduloVisible()){
            recargar();
        }
    });

    // Las gráficas se ajustan al ancho (también al aparecer el apartado,
    // que hasta entonces mide 0).
    const zona = $("graficasSalud");
    if(zona && "ResizeObserver" in window){
        let espera = null;
        new ResizeObserver(() => {
            clearTimeout(espera);
            espera = setTimeout(() => {
                if(zona.clientWidth && Math.abs(zona.clientWidth - anchoPintado) > 20){
                    pintarGraficas();
                }
            }, 150);
        }).observe(zona);
    }
}


export function limpiarSalud(){

    peticionSerie++;
    clearInterval(temporizador);
    temporizador = null;
    datos = null;
    serie = [];
    seleccionada = "";
    $("tarjetasSalud")?.replaceChildren();
    $("graficasSalud")?.replaceChildren();
    $("alertasSalud")?.replaceChildren();
    $("estacionGraficasSalud")?.replaceChildren();
    const horaSalud = $("horaSalud");
    if(horaSalud){
        horaSalud.textContent = "";
    }
}


/* Fin de fichero: js/administracion/salud.js */
