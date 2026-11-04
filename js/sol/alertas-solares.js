/*
 * MeteoArchidona · Componente «Alertas solares»
 *
 * Alertas, avisos y vigilancias del Centro de Predicción del Tiempo
 * Espacial de la NOAA, traducidos al español (tipo, escala y titular),
 * con el texto original en inglés desplegable.
 *
 *     <div data-componente="sol-alertas"></div>
 *     <div data-componente="sol-alertas" data-horas="48" data-anteriores="si"></div>
 *
 *     import {montarAlertasSolares} from "/js/sol/alertas-solares.js?v=…";
 *     montarAlertasSolares(hueco);
 *
 * Opciones:
 *   - data-horas: cuántas horas atrás se enseñan (72 por defecto).
 *   - data-anteriores="si": las más viejas, plegadas en «Anteriores».
 *     La página Sol lo usa; en un dashboard sobra.
 *
 * Se renueva solo cada 5 minutos. Puede haber varios en una página.
 */

import {
    FUENTES, DATOS_CADA_MS,
    crear, vaciar, aviso, prepararRaiz, ponerPie,
    pedir, fechaUTC, fechaHora, cadaRato
} from "./comun.js?v=20261104-componentes1";


const TIPOS_ALERTA = [
    [/^CANCEL/i, "Cancelado", "cancelada"],
    [/^EXTENDED WARNING/i, "Aviso prolongado", "aviso"],
    [/^CONTINUED ALERT/i, "Alerta continuada", "alerta"],
    [/^ALERT/i, "Alerta", "alerta"],
    [/^WARNING/i, "Aviso", "aviso"],
    [/^WATCH/i, "Vigilancia", "vigilancia"],
    [/^SUMMARY/i, "Resumen", "resumen"]
];

/* Traducción de los titulares más habituales. Lo que no esté aquí
 * se deja en inglés. */
const TITULARES = [
    [/Geomagnetic K-index of (\d)/i, m => `Índice K geomagnético de ${m[1]}`],
    [/Geomagnetic Storm Category G(\d)/i, m => `Tormenta geomagnética de categoría G${m[1]}`],
    [/Geomagnetic Sudden Impulse/i, () => "Impulso geomagnético repentino"],
    [/Electron 2MeV Integral Flux.*?(\d+)\s*pfu/i, m => `Flujo de electrones de 2 MeV por encima de ${m[1]} pfu`],
    [/Proton 10MeV Integral Flux.*?(\d+)\s*pfu/i, m => `Flujo de protones de 10 MeV por encima de ${m[1]} pfu`],
    [/Proton 100MeV Integral Flux.*?(\d+)\s*pfu/i, m => `Flujo de protones de 100 MeV por encima de ${m[1]} pfu`],
    [/X-ray Flux exceeded (M\d|X\d+)/i, m => `Rayos X por encima de ${m[1]}`],
    [/X-ray Event exceeded (M\d|X\d+)/i, m => `Fulguración por encima de ${m[1]}`],
    [/Type II Radio Emission/i, () => "Emisión de radio de tipo II (señal de eyección de masa coronal)"],
    [/Type IV Radio Emission/i, () => "Emisión de radio de tipo IV (fulguración intensa)"],
    [/10cm Radio Burst/i, () => "Ráfaga de radio en 10 cm"],
    [/Interplanetary Shock/i, () => "Llegada de un choque interplanetario"]
];


export function montarAlertasSolares(raiz) {
    const horas = Math.max(1, parseInt(raiz.dataset.horas, 10) || 72);
    const conAnteriores = raiz.dataset.anteriores === "si";

    prepararRaiz(raiz, "sol-alertas");

    const caja = crear("div", "sol-alertas-caja");
    caja.setAttribute("aria-live", "polite");
    aviso(caja, "Cargando alertas…");
    raiz.appendChild(caja);

    cadaRato(async () => {
        const correcto = await pintar(caja, horas, conAnteriores);
        ponerPie(raiz, correcto);
    }, DATOS_CADA_MS);
}


function analizarAlerta(entrada) {
    const mensaje = String(entrada.message || "").replace(/\r/g, "");
    const lineas = mensaje.split("\n").map(l => l.trim()).filter(Boolean);

    let tipo = ["Mensaje", "resumen"];
    let titular = "";
    for (const linea of lineas) {
        const encontrado = TIPOS_ALERTA.find(([patron]) => patron.test(linea));
        if (encontrado && linea.includes(":")) {
            tipo = [encontrado[1], encontrado[2]];
            titular = linea.slice(linea.indexOf(":") + 1).trim();
            break;
        }
    }

    let traducido = titular;
    for (const [patron, traducir] of TITULARES) {
        const m = patron.exec(titular);
        if (m) { traducido = traducir(m); break; }
    }

    const escala = /NOAA Scale:\s*([GRS])(\d)/i.exec(mensaje);

    return {
        fecha: fechaUTC(entrada.issue_datetime),
        tipo: tipo[0],
        claseTipo: tipo[1],
        titular: traducido || "Mensaje de la NOAA",
        escala: escala ? `${escala[1].toUpperCase()}${escala[2]}` : null,
        nivelEscala: escala ? parseInt(escala[2], 10) : 0,
        original: mensaje
    };
}


async function pintar(caja, horas, conAnteriores) {
    let datos;
    try {
        datos = await pedir(FUENTES.alertas);
    } catch (error) {
        aviso(caja, "Las alertas de la NOAA no están disponibles ahora.");
        return false;
    }

    const limite = Date.now() - horas * 3600 * 1000;
    const alertas = (Array.isArray(datos) ? datos : [])
        .map(analizarAlerta)
        .filter(a => a.fecha)
        .sort((a, b) => b.fecha - a.fecha);

    vaciar(caja);

    const recientes = alertas.filter(a => a.fecha.getTime() >= limite);
    const anteriores = alertas.filter(a => a.fecha.getTime() < limite);

    if (recientes.length === 0) {
        caja.appendChild(crear("p", "sol-aviso sol-calma",
            `Ninguna alerta en las últimas ${horas} horas: el tiempo espacial está en calma.`));
    } else {
        const lista = crear("ol", "sol-alertas-lista");
        recientes.forEach(a => lista.appendChild(tarjetaAlerta(a)));
        caja.appendChild(lista);
    }

    if (conAnteriores && anteriores.length > 0) {
        const mas = crear("details", "sol-alertas-anteriores");
        mas.appendChild(crear("summary", null, `Anteriores (${anteriores.length})`));
        const lista = crear("ol", "sol-alertas-lista");
        anteriores.forEach(a => lista.appendChild(tarjetaAlerta(a)));
        mas.appendChild(lista);
        caja.appendChild(mas);
    }

    return true;
}


function tarjetaAlerta(alerta) {
    const item = crear("li", `sol-alerta tipo-${alerta.claseTipo}`);

    const cabecera = crear("div", "sol-alerta-cabecera");
    cabecera.appendChild(crear("span", "sol-alerta-tipo", alerta.tipo));
    if (alerta.escala) {
        cabecera.appendChild(crear("span",
            `sol-marca nivel-${Math.max(0, Math.min(5, alerta.nivelEscala))}`,
            alerta.escala));
    }
    const cuando = crear("time", "sol-alerta-fecha", fechaHora(alerta.fecha));
    cuando.dateTime = alerta.fecha.toISOString();
    cabecera.appendChild(cuando);
    item.appendChild(cabecera);

    item.appendChild(crear("p", "sol-alerta-titular", alerta.titular));

    const original = crear("details", "sol-alerta-original");
    original.appendChild(crear("summary", null, "Texto original (inglés)"));
    original.appendChild(crear("pre", null, alerta.original));
    item.appendChild(original);

    return item;
}

/* Fin de fichero: js/sol/alertas-solares.js */
