/*
 * MeteoArchidona · Componente «Próximos eventos del cielo»
 *
 * Lo que va a pasar en el cielo de Archidona: eclipses, conjunciones de
 * la Luna con planetas y estrellas, ocultaciones, oposiciones, máximas
 * elongaciones, lluvias de estrellas, cometas, superlunas, equinoccios y
 * solsticios. Todo calculado en nuestro servidor para El Silo.
 *
 *     <div data-componente="luna-eventos"></div>
 *
 * Opciones:
 *     data-dias     cuántos días hacia delante (90 por defecto, hasta 730).
 *     data-tipo     solo esos tipos, separados por comas (ECLIPSE_SOLAR,
 *                   CONJUNCION, LLUVIA_ESTRELLAS, COMETA…).
 *     data-limite   cuántos como mucho (12 por defecto).
 *     data-todos="si"   también las fases, perigeos y apogeos y lo que no
 *                   se ve desde aquí.
 */

import {
    FUENTE_CALCULO,
    aviso, cadaRato, crear, diaHora, hoyMadrid, pedir, prepararRaiz, pie, textoError, vaciar
} from "./comun.js?v=20261111-luna4";


const CADA_MS = 60 * 60 * 1000;

/* Lo que se enseña si no se pide otra cosa: lo vistoso, sin las fases de
 * cada semana ni los perigeos y apogeos de cada mes. */
const TIPOS_DESTACADOS = [
    "ECLIPSE_SOLAR", "ECLIPSE_LUNAR", "CONJUNCION", "OCULTACION", "OPOSICION",
    "ELONGACION_MAXIMA", "LLUVIA_ESTRELLAS", "COMETA", "SUPERLUNA", "EQUINOCCIO", "SOLSTICIO"
];

const ICONOS = {
    ECLIPSE_SOLAR: "◐",
    ECLIPSE_LUNAR: "◑",
    CONJUNCION: "⁘",
    OCULTACION: "●",
    OPOSICION: "↔",
    ELONGACION_MAXIMA: "∠",
    LLUVIA_ESTRELLAS: "☄",
    COMETA: "☄",
    SUPERLUNA: "○",
    MICROLUNA: "·",
    FASE_LUNAR: "◔",
    PERIGEO: "↓",
    APOGEO: "↑",
    EQUINOCCIO: "☼",
    SOLSTICIO: "☼"
};


function sumarDias(fecha, dias) {
    const d = new Date(`${fecha}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + dias);
    return d.toISOString().slice(0, 10);
}


function tarjeta(evento) {
    const familia = evento.tipo.toLowerCase().replace(/_/g, "-");
    const caja = crear("li", `lun-evento lun-evento-${familia}${evento.visible === false ? " lun-tenue" : ""}`);

    const icono = crear("span", "lun-evento-icono", ICONOS[evento.tipo] || "✦");
    icono.setAttribute("aria-hidden", "true");
    caja.appendChild(icono);

    const texto = crear("div", "lun-evento-texto");
    const cabeza = crear("div", "lun-evento-cabeza");
    cabeza.appendChild(crear("span", "lun-evento-cuando lun-cifra", diaHora(evento.momento)));
    cabeza.appendChild(crear("span", "lun-evento-tipo", evento.nombre_tipo));
    texto.appendChild(cabeza);
    texto.appendChild(crear("strong", "lun-evento-titulo", evento.titulo));
    if (evento.descripcion) {
        texto.appendChild(crear("p", null, evento.descripcion));
    }
    if (evento.visible === false) {
        texto.appendChild(crear("p", "lun-evento-nota", "No se ve desde Archidona."));
    }
    caja.appendChild(texto);
    return caja;
}


function pintar(raiz, datos, limite, todos) {
    vaciar(raiz);
    const ahora = Date.now();
    const eventos = datos.eventos
        .filter(e => todos || e.visible !== false)
        .filter(e => Date.parse(e.fin || e.momento) >= ahora)
        .slice(0, limite);

    if (!eventos.length) {
        raiz.appendChild(crear("p", "lun-aviso", "No hay eventos destacados en estas fechas."));
    } else {
        const lista = crear("ol", "lun-eventos");
        eventos.forEach(e => lista.appendChild(tarjeta(e)));
        raiz.appendChild(lista);
    }
    pie(raiz, `Horas de Madrid. ${FUENTE_CALCULO}; cometas del Minor Planet Center (su brillo es orientativo).`);
}


export function montarEventos(raiz) {
    prepararRaiz(raiz, "luna-eventos");
    const dias = Math.min(730, Math.max(1, parseInt(raiz.dataset.dias || "90", 10) || 90));
    const limite = Math.min(200, Math.max(1, parseInt(raiz.dataset.limite || "12", 10) || 12));
    const todos = raiz.dataset.todos === "si";
    const pedidos = (raiz.dataset.tipo || "").split(",").map(t => t.trim().toUpperCase()).filter(Boolean);
    const tipos = pedidos.length ? pedidos : (todos ? [] : TIPOS_DESTACADOS);
    aviso(raiz, "Cargando…");

    cadaRato(raiz, async () => {
        const desde = hoyMadrid();
        const parametros = new URLSearchParams({ desde, hasta: sumarDias(desde, dias), limite: "500" });
        tipos.forEach(t => parametros.append("tipo", t));
        try {
            pintar(raiz, await pedir(`/luna/eventos?${parametros}`, CADA_MS - 1000), limite, todos);
        } catch (error) {
            aviso(raiz, textoError(error), true);
        }
    }, CADA_MS);
}


/* Fin de fichero: js/luna/eventos.js */
