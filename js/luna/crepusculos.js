/*
 * MeteoArchidona · Componente «Crepúsculos y horas doradas»
 *
 * Una barra de 24 horas con la luz del día en El Silo: noche, crepúsculos
 * astronómico, náutico y civil, hora azul (Sol entre −6° y −4°), hora
 * dorada (entre −4° y +6°) y día. Debajo, las horas, pensadas para
 * fotógrafos y para quien sale a observar.
 *
 *     <div data-componente="luna-crepusculos"></div>
 *
 * Opciones:
 *     data-dias   cuántos días de barras (1 por defecto, hasta 14); la
 *                 tabla de horas es siempre la del primero (hoy).
 */

import {
    FUENTE_CALCULO,
    aviso, cadaRato, crear, dato, diaCorto, duracion, hora, hoyMadrid, minutosDelDia,
    pedir, prepararRaiz, pie, textoError, vaciar
} from "./comun.js?v=20261111-luna3";


const CADA_MS = 30 * 60 * 1000;

const TRAMOS = {
    noche: "Noche",
    astronomico: "Crepúsculo astronómico",
    nautico: "Crepúsculo náutico",
    azul: "Hora azul",
    dorada: "Hora dorada",
    dia: "Día"
};


function tramos(luz) {
    const m = minutosDelDia;
    const marcas = [
        ["noche", 0],
        ["astronomico", m(luz.crepusculo_astronomico_manana.inicio)],
        ["nautico", m(luz.crepusculo_nautico_manana.inicio)],
        ["azul", m(luz.hora_azul_manana.inicio)],
        ["dorada", m(luz.hora_dorada_manana.inicio)],
        ["dia", m(luz.hora_dorada_manana.fin)],
        ["dorada", m(luz.hora_dorada_tarde.inicio)],
        ["azul", m(luz.hora_azul_tarde.inicio)],
        ["nautico", m(luz.crepusculo_nautico_tarde.inicio)],
        ["astronomico", m(luz.crepusculo_astronomico_tarde.inicio)],
        ["noche", m(luz.crepusculo_astronomico_tarde.fin)]
    ].filter(([, minuto]) => minuto !== null);

    const lista = [];
    marcas.forEach(([clase, desde], i) => {
        const hasta = i + 1 < marcas.length ? marcas[i + 1][1] : 1440;
        if (hasta > desde) lista.push({ clase, desde, hasta });
    });
    return lista;
}


function barra(luz, etiqueta) {
    const fila = crear("div", "lun-luz-fila");
    if (etiqueta) fila.appendChild(crear("span", "lun-luz-etiqueta", etiqueta));

    const pista = crear("div", "lun-luz-barra");
    pista.setAttribute("role", "img");
    pista.setAttribute(
        "aria-label",
        `Sale el Sol a las ${hora(luz.salida_sol)} y se pone a las ${hora(luz.puesta_sol)}`
    );

    for (const tramo of tramos(luz)) {
        const parte = crear("span", `lun-luz-${tramo.clase}`);
        parte.style.left = `${(tramo.desde / 1440) * 100}%`;
        parte.style.width = `${((tramo.hasta - tramo.desde) / 1440) * 100}%`;
        parte.title = `${TRAMOS[tramo.clase]}`;
        pista.appendChild(parte);
    }

    for (const instante of [luz.salida_sol, luz.puesta_sol]) {
        const minuto = minutosDelDia(instante);
        if (minuto === null) continue;
        const marca = crear("span", "lun-luz-marca");
        marca.style.left = `${(minuto / 1440) * 100}%`;
        pista.appendChild(marca);
    }

    fila.appendChild(pista);
    return fila;
}


function horasDe(franja) {
    return `${hora(franja.inicio)} – ${hora(franja.fin)}`;
}


function pintar(raiz, datos) {
    vaciar(raiz);
    const [primero] = datos.dias;
    const hoy = hoyMadrid();

    const barras = crear("div", "lun-luz");
    for (const luz of datos.dias) {
        barras.appendChild(barra(luz, datos.dias.length > 1 ? (luz.fecha === hoy ? "Hoy" : diaCorto(luz.fecha)) : null));
    }

    const horas = crear("div", "lun-luz-horas");
    for (const texto of ["0 h", "6 h", "12 h", "18 h", "24 h"]) {
        horas.appendChild(crear("span", null, texto));
    }
    barras.appendChild(horas);
    raiz.appendChild(barras);

    const leyenda = crear("ul", "lun-leyenda");
    for (const [clase, nombre] of Object.entries(TRAMOS)) {
        leyenda.appendChild(crear("li", `lun-leyenda-${clase}`, nombre));
    }
    raiz.appendChild(leyenda);

    const lista = crear("dl", "lun-datos lun-datos-dos");
    dato(lista, "Amanecer", hora(primero.salida_sol));
    dato(lista, "Atardecer", hora(primero.puesta_sol));
    dato(lista, "Duración del día", duracion(primero.duracion_dia_minutos));
    dato(lista, "Mediodía solar", hora(primero.transito_sol));
    dato(lista, "Hora azul (mañana)", horasDe(primero.hora_azul_manana));
    dato(lista, "Hora dorada (mañana)", horasDe(primero.hora_dorada_manana));
    dato(lista, "Hora dorada (tarde)", horasDe(primero.hora_dorada_tarde));
    dato(lista, "Hora azul (tarde)", horasDe(primero.hora_azul_tarde));
    dato(lista, "Crepúsculo civil", `${hora(primero.crepusculo_civil_manana.inicio)} y ${hora(primero.crepusculo_civil_tarde.fin)}`);
    dato(lista, "Crepúsculo náutico", `${hora(primero.crepusculo_nautico_manana.inicio)} y ${hora(primero.crepusculo_nautico_tarde.fin)}`);
    dato(lista, "Crepúsculo astronómico", `${hora(primero.crepusculo_astronomico_manana.inicio)} y ${hora(primero.crepusculo_astronomico_tarde.fin)}`);
    dato(lista, "Noche cerrada esta noche", duracion(primero.minutos_noche_astronomica));
    dato(lista, "Sin Luna en el cielo", duracion(primero.minutos_noche_oscura));
    raiz.appendChild(lista);

    pie(raiz, `Crepúsculos: empieza o acaba cada uno con el Sol a −18°, −12° y −6°. Hora de Madrid. ${FUENTE_CALCULO}.`);
}


export function montarCrepusculos(raiz) {
    prepararRaiz(raiz, "luna-crepusculos");
    const dias = Math.min(14, Math.max(1, parseInt(raiz.dataset.dias || "1", 10) || 1));
    aviso(raiz, "Cargando…");

    cadaRato(raiz, async () => {
        try {
            pintar(raiz, await pedir(`/luna/crepusculos?desde=${hoyMadrid()}&dias=${dias}`));
        } catch (error) {
            aviso(raiz, textoError(error), true);
        }
    }, CADA_MS);
}


/* Fin de fichero: js/luna/crepusculos.js */
