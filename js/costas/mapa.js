/*
 * MeteoArchidona · Componente «Mapa de la costa andaluza»
 *
 * Lo medido y lo previsto en el mismo mapa (José, 17-11-2026):
 *
 *   - Boyas y mareógrafos de Puertos del Estado, con un icono propio
 *     (rombo la boya, cuadrado el mareógrafo) y su último dato. Los que
 *     no tienen datos recientes salen en gris: su estado lo dice la hora
 *     del último dato, no la ficha de Portus.
 *   - Playas, en círculos con el color de la ola prevista ahora: son del
 *     modelo. Al tocar una sale su ola, el agua y el enlace a su ficha.
 *
 *     <div data-componente="costas-mapa"></div>
 *     <div data-componente="costas-mapa" data-provincia="Almería" data-titulo="no"></div>
 *
 * data-provincia: encuadra solo esa provincia (vacía: toda la costa).
 * data-altura: alto del mapa en píxeles (420).
 *
 * Leaflet se carga solo si hay un mapa (js/vendor/leaflet-1.9.4.js), con
 * el mapa de OpenStreetMap de fondo.
 *
 * API: GET /costas/mapa
 */

import {
    pedir, crear, aviso, prepararRaiz, titulo, pie, metros, segundos, grados, colorOla, cargarLeaflet,
    hora, enlaceFicha, NOMBRES_ESTADO, TRAMOS_OLA, SIN_DATO, CITA
} from "./comun.js?v=20261118-costas1";


const FONDO = {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    opciones: {
        maxNativeZoom: 18,
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> · Datos: Puertos del Estado, Open-Meteo'
    }
};

/* Toda la costa andaluza, de Ayamonte a Garrucha. */
const COSTA = [[35.95, -7.45], [37.3, -1.7]];

const ALTURA_DEFECTO = 420;


function leerAltura(raiz) {
    const valor = parseInt(raiz.dataset.altura, 10);
    return Number.isFinite(valor) ? Math.min(Math.max(valor, 220), 900) : ALTURA_DEFECTO;
}


function textoEstacion(estacion) {
    const ficha = crear("div", "cos-mapa-ficha");
    ficha.appendChild(crear("strong", null, estacion.nombre));
    ficha.appendChild(crear("span", "cos-mapa-ficha-tipo",
        `${estacion.tipo === "BOYA" ? "Boya" : "Mareógrafo"} · ${NOMBRES_ESTADO[estacion.estado] || "Sin datos"}`));
    const ultima = estacion.ultima;
    if (!ultima) {
        ficha.appendChild(crear("span", null, "Todavía no hay ningún dato guardado."));
        return ficha;
    }
    if (estacion.tipo === "BOYA") {
        if (ultima.altura_significativa !== null) {
            ficha.appendChild(crear("span", null,
                `Ola ${metros(ultima.altura_significativa, 2)} (máxima ${metros(ultima.altura_maxima, 2)}) · ${ultima.estado_mar || ""}`));
        }
        if (ultima.periodo_pico !== null || ultima.rumbo) {
            ficha.appendChild(crear("span", null,
                `Periodo ${segundos(ultima.periodo_pico)}${ultima.rumbo ? ` · del ${ultima.rumbo}` : ""}`));
        }
        if (ultima.temperatura_agua !== null) {
            ficha.appendChild(crear("span", null, `Agua ${grados(ultima.temperatura_agua)}`));
        }
    } else if (ultima.nivel_mar !== null) {
        ficha.appendChild(crear("span", null, `Nivel del mar ${metros(ultima.nivel_mar, 2)} (sobre el cero del puerto)`));
    }
    ficha.appendChild(crear("small", null, `Dato de las ${hora(ultima.fecha)}`));
    return ficha;
}


function textoPlaya(playa) {
    const ficha = crear("div", "cos-mapa-ficha");
    ficha.appendChild(crear("strong", null, playa.nombre));
    ficha.appendChild(crear("span", "cos-mapa-ficha-tipo",
        `${playa.municipio ? `${playa.municipio} · ` : ""}${playa.provincia}`));
    if (playa.altura_significativa !== null && playa.altura_significativa !== undefined) {
        ficha.appendChild(crear("span", null,
            `Ola prevista ${metros(playa.altura_significativa)}${playa.rumbo ? ` del ${playa.rumbo}` : ""} · ${playa.estado_mar || ""}`));
    } else {
        ficha.appendChild(crear("span", null, "Sin previsión de oleaje ahora."));
    }
    if (playa.temperatura_agua !== null && playa.temperatura_agua !== undefined) {
        ficha.appendChild(crear("span", null, `Agua ${grados(playa.temperatura_agua)} (modelo)`));
    }
    const enlace = crear("a", "cos-mapa-ficha-enlace", "Ver la playa");
    enlace.href = enlaceFicha(playa.id);
    ficha.appendChild(enlace);
    return ficha;
}


function iconoEstacion(L, estacion) {
    const activa = estacion.estado === "ACTIVA";
    const ola = estacion.ultima?.altura_significativa;
    const color = !activa ? SIN_DATO : (estacion.tipo === "BOYA" ? colorOla(ola) : "#c9a26a");
    const texto = estacion.tipo === "BOYA" && activa && ola !== null && ola !== undefined
        ? metros(ola)
        : "";
    const forma = estacion.tipo === "BOYA" ? "cos-icono-boya" : "cos-icono-mareografo";
    return L.divIcon({
        className: `cos-icono ${forma}${activa ? "" : " apagada"}`,
        html: `<span class="cos-icono-forma" style="background:${color}"></span>${texto ? `<span class="cos-icono-texto">${texto}</span>` : ""}`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
        popupAnchor: [0, -10]
    });
}


function leyenda(raiz, datos) {
    const caja = crear("div", "cos-leyenda");
    for (const tramo of TRAMOS_OLA) {
        const elemento = crear("span", "cos-leyenda-tramo");
        const muestra = crear("i");
        muestra.style.background = tramo.color;
        elemento.appendChild(muestra);
        elemento.appendChild(document.createTextNode(tramo.nombre));
        caja.appendChild(elemento);
    }
    const formas = crear("span", "cos-leyenda-formas");
    formas.appendChild(crear("span", "cos-leyenda-forma boya", "Boya (medido)"));
    formas.appendChild(crear("span", "cos-leyenda-forma mareografo", "Mareógrafo (medido)"));
    formas.appendChild(crear("span", "cos-leyenda-forma playa", "Playa (modelo)"));
    formas.appendChild(crear("span", "cos-leyenda-forma apagada", "Sin datos recientes"));
    caja.appendChild(formas);
    const activas = datos.estaciones.filter(e => e.estado === "ACTIVA").length;
    caja.appendChild(crear("span", "cos-leyenda-total",
        `${activas} de ${datos.estaciones.length} estaciones midiendo · ${datos.playas.length} playas`));
    raiz.appendChild(caja);
}


export async function montarMapaCostas(raiz) {
    prepararRaiz(raiz, "costas-mapa");
    aviso(raiz, "Cargando el mapa de la costa…");

    let datos;
    let L;

    try {
        [datos, L] = await Promise.all([pedir("/costas/mapa"), cargarLeaflet()]);
    } catch (error) {
        aviso(raiz, "No se ha podido cargar el mapa de la costa. Se puede volver a intentar más tarde.", true);
        return;
    }

    raiz.textContent = "";
    titulo(raiz, "Costas de Andalucía", "Boyas, mareógrafos y playas");

    const provincia = (raiz.dataset.provincia || "").trim();
    const playas = provincia ? datos.playas.filter(p => p.provincia === provincia) : datos.playas;
    const estaciones = provincia ? datos.estaciones.filter(e => e.provincia === provincia) : datos.estaciones;

    const contenedor = crear("div", "cos-mapa");
    contenedor.style.height = `${leerAltura(raiz)}px`;
    raiz.appendChild(contenedor);

    const mapa = L.map(contenedor, { scrollWheelZoom: false, zoomSnap: 0.5 });
    L.tileLayer(FONDO.url, FONDO.opciones).addTo(mapa);

    const puntos = [];

    for (const playa of playas) {
        const posicion = [playa.latitud, playa.longitud];
        puntos.push(posicion);
        L.circleMarker(posicion, {
            radius: 6,
            color: "#ffffff",
            weight: 1.5,
            fillColor: colorOla(playa.altura_significativa),
            fillOpacity: 0.95
        })
            .bindPopup(() => textoPlaya(playa))
            .bindTooltip(playa.nombre, { direction: "top", offset: [0, -6] })
            .addTo(mapa);
    }

    for (const estacion of estaciones) {
        const posicion = [estacion.latitud, estacion.longitud];
        puntos.push(posicion);
        L.marker(posicion, { icon: iconoEstacion(L, estacion), zIndexOffset: 500 })
            .bindPopup(() => textoEstacion(estacion))
            .addTo(mapa);
    }

    if (provincia && puntos.length) {
        mapa.fitBounds(L.latLngBounds(puntos).pad(0.15));
    } else {
        mapa.fitBounds(COSTA);
    }

    // En un dashboard el hueco puede cambiar de ancho después de pintarse.
    if (window.ResizeObserver) {
        new ResizeObserver(() => mapa.invalidateSize()).observe(contenedor);
    }

    leyenda(raiz, { estaciones, playas });

    const conHora = playas.find(p => p.hora);
    pie(raiz, `Ola de las playas: previsión de ${conHora ? `las ${hora(conHora.hora)}` : "ahora"} · ${CITA}`);
}


/* Fin de fichero: js/costas/mapa.js */
