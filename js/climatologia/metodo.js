/*
 * MeteoArchidona · Componente «Cómo se hace»
 *
 * Explica, con palabras sencillas, cómo se reconstruye el clima de cada
 * pueblo: de dónde salen los datos (el reanálisis ERA5 de Copernicus, la
 * rejilla de AEMET y nuestras estaciones), qué correcciones se aplican y
 * qué fiabilidad tiene cada pueblo. Lleva siempre la cita a Copernicus.
 *
 *     <div data-componente="clima-metodo"></div>
 *
 * API: GET /climatologia/metodo
 */

import {
    pedir, crear, aviso, prepararRaiz, titulo, pie, decimal, fechaLarga, textoError,
    NOMBRES_FIABILIDAD, EXPLICACION_FIABILIDAD, MESES
} from "./comun.js?v=20261113-clima1";


const PASOS = [
    [
        "La base: un reanálisis",
        "ERA5 y ERA5-Land son reconstrucciones del tiempo de cada día desde 1940, hechas por el " +
        "Centro Europeo (ECMWF) para el programa Copernicus de la Unión Europea, juntando todas las " +
        "observaciones que había con un modelo meteorológico. ERA5-Land (desde 1950) tiene una " +
        "cuadrícula de unos 9 km; para 1940-1949 se usa ERA5, de unos 25 km, empalmado con la " +
        "anterior: esos años salen marcados como menos fiables."
    ],
    [
        "El problema: suaviza",
        "Una celda de 9 km es una media: no ve las heladas del fondo de un valle ni las tormentas de " +
        "un solo pueblo, y su altura no es la del casco urbano. Por eso los extremos se quedan cortos."
    ],
    [
        "Primera corrección: la rejilla de AEMET",
        "AEMET ha interpolado a 5 km los datos de miles de estaciones de toda España desde 1951. Mes a " +
        "mes se ajusta la distribución de ERA5 (de los días más fríos a los más cálidos, y la lluvia) a " +
        "la de esa rejilla. Así se corrigen a la vez la altura y los extremos."
    ],
    [
        "Segunda corrección: nuestras estaciones",
        "En Archidona, además, se compara cada día con lo que mide nuestra estación de El Silo y se " +
        "calcula cuánto se aparta, mes a mes. Con pocos años de estación el ajuste es suave; se irá " +
        "afinando con cada mes nuevo."
    ],
    [
        "Lo que no es",
        "Es una reconstrucción: sirve para comparar años, ver tendencias y saber qué es normal en cada " +
        "pueblo, pero no son datos oficiales ni récords oficiales. Para eso están las estaciones de AEMET."
    ]
];

const NOMBRES_ORIGEN = {
    EMPALME_ERA5: "empalme de ERA5 (1940-1949)",
    ROCIO: "rejilla de AEMET",
    ESTACION_PROPIA: "estación propia",
    AEMET: "estación de AEMET",
    JUNTA: "estación de la Junta"
};


function ajusteEstacion(punto) {
    const maximas = punto.ajustes.filter(a => a.origen === "ESTACION_PROPIA" && a.variable === "TEMPERATURA_MAXIMA");
    const minimas = punto.ajustes.filter(a => a.origen === "ESTACION_PROPIA" && a.variable === "TEMPERATURA_MINIMA");
    if (!maximas.length || !minimas.length) return null;
    const media = lista => lista.reduce((suma, a) => suma + a.valor, 0) / lista.length;
    const enero = lista => (lista.find(a => a.mes === 1) || {}).valor;
    const julio = lista => (lista.find(a => a.mes === 7) || {}).valor;
    const primero = maximas[0];
    return `Ajuste con ${punto.punto.estacion || "la estación"} (${primero.dias} días comparados, ` +
        `${fechaLarga(primero.desde)} a ${fechaLarga(primero.hasta)}): máximas ${signo(media(maximas))} °C de media ` +
        `(${MESES[0]} ${signo(enero(maximas))}, ${MESES[6]} ${signo(julio(maximas))}), ` +
        `mínimas ${signo(media(minimas))} °C (${MESES[0]} ${signo(enero(minimas))}, ${MESES[6]} ${signo(julio(minimas))}).`;
}


function signo(valor) {
    if (valor === null || valor === undefined) return "—";
    return `${valor > 0 ? "+" : ""}${decimal(valor)}`;
}


function tarjetaPunto(punto) {
    const tarjeta = crear("li", `cli-punto fiabilidad-${punto.punto.fiabilidad}`);
    const cabeza = crear("div", "cli-punto-cabeza");
    cabeza.appendChild(crear("strong", null, punto.punto.nombre));
    cabeza.appendChild(crear("span", "cli-fiabilidad", `Fiabilidad ${NOMBRES_FIABILIDAD[punto.punto.fiabilidad] || punto.punto.fiabilidad}`));
    tarjeta.appendChild(cabeza);

    let texto = `${punto.punto.altitud} m. ${EXPLICACION_FIABILIDAD[punto.punto.fiabilidad] || ""}`;
    if (punto.punto.altitud_celda) {
        texto += `. La celda de ERA5-Land está a ${punto.punto.altitud_celda} m de media`;
    }
    const origenes = punto.origenes.map(o => NOMBRES_ORIGEN[o] || o);
    if (origenes.length) {
        texto += `. Correcciones: ${origenes.join(", ")}`;
    }
    if (punto.punto.primer_dia) {
        texto += `. Serie del ${fechaLarga(punto.punto.primer_dia)} al ${fechaLarga(punto.punto.ultimo_dia)}`;
    }
    tarjeta.appendChild(crear("p", null, `${texto}.`));

    const estacion = ajusteEstacion(punto);
    if (estacion) {
        tarjeta.appendChild(crear("p", "cli-nota", estacion));
    }
    return tarjeta;
}


export async function montarMetodoClima(raiz) {
    prepararRaiz(raiz, "clima-metodo");
    titulo(raiz, "CLIMATOLOGÍA · CÓMO SE HACE", "Cómo se reconstruye el clima de cada pueblo");

    const pasos = crear("ol", "cli-pasos");
    for (const [nombre, texto] of PASOS) {
        const paso = crear("li");
        paso.appendChild(crear("strong", null, nombre));
        paso.appendChild(crear("p", null, texto));
        pasos.appendChild(paso);
    }
    raiz.appendChild(pasos);

    let datos;
    try {
        datos = await pedir("/climatologia/metodo");
    } catch (error) {
        aviso(raiz, textoError(error), true);
        pie(raiz);
        return;
    }

    if (datos.puntos && datos.puntos.length) {
        raiz.appendChild(crear("h4", "cli-subtitulo", "Pueblo a pueblo"));
        const lista = crear("ul", "cli-puntos");
        for (const punto of datos.puntos) {
            lista.appendChild(tarjetaPunto(punto));
        }
        raiz.appendChild(lista);
    }

    const fuentes = crear("p", "cli-nota");
    fuentes.appendChild(document.createTextNode("Fuentes: "));
    const enlaces = [
        ["ERA5 y ERA5-Land (Copernicus, C3S)", "https://cds.climate.copernicus.eu/datasets/reanalysis-era5-land"],
        ["Open-Meteo", "https://open-meteo.com/"],
        ["Rejilla ROCIO de AEMET", "https://www.aemet.es/es/serviciosclimaticos/cambio_climat/datos_diarios"]
    ];
    enlaces.forEach(([texto, url], indice) => {
        const enlace = crear("a", null, texto);
        enlace.href = url;
        enlace.target = "_blank";
        enlace.rel = "noopener noreferrer";
        fuentes.appendChild(enlace);
        fuentes.appendChild(document.createTextNode(indice < enlaces.length - 1 ? " · " : ". Datos de AEMET citando a AEMET como autora."));
    });
    raiz.appendChild(fuentes);
    pie(raiz);
}


/* Fin de fichero: js/climatologia/metodo.js */
