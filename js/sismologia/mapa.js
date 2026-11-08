/*
 * MeteoArchidona · Componente «Mapa de terremotos»
 *
 * Mapa centrado en Archidona con los sismos recientes dentro de un radio:
 * cada uno es un círculo con el color de su tramo de magnitud y más
 * grande cuanto mayor es. Los sentidos llevan el borde de magma y los
 * provisionales del EMSC, el borde discontinuo. Al tocar uno sale su
 * ficha.
 *
 *     <div data-componente="sismologia-mapa"></div>
 *     <div data-componente="sismologia-mapa" data-radio="100" data-dias="7"
 *          data-magnitud="2" data-altura="320" data-titulo="no"></div>
 *
 * data-radio: km desde Archidona (150 por defecto, 300 como mucho).
 * data-dias: días hacia atrás (30). data-magnitud: mínima (todas).
 * data-altura: alto del mapa en píxeles (380).
 *
 * Leaflet se carga solo si hay un mapa (js/vendor/leaflet-1.9.4.js);
 * el fondo es el de OpenStreetMap, como en el visor del radar.
 *
 * API: GET /sismologia/terremotos?radio_km&dias&limite=1000
 */

import {
    pedir, crear, aviso, prepararRaiz, titulo, pie, leerRadio, leerNumero, rutaTerremotos,
    cargarLeaflet, colorTramo, magnitud, kilometros, fechaHora, lugar, enlaceFicha,
    horaActualizacion, TRAMOS, NOMBRES_TRAMO, ARCHIDONA, PIZARRA, MAGMA, FUENTE
} from "./comun.js?v=20261108-sismo1";


function radioPunto(valor) {
    if (valor === null || valor === undefined) return 4;
    return Math.max(3.5, Math.min(22, 3 + valor * valor * 0.9));
}


function ficha(sismo) {
    const caja = crear("div", "sis-mapa-ficha");
    caja.appendChild(crear("strong", null, `M ${magnitud(sismo.magnitud)} · ${lugar(sismo)}`));
    caja.appendChild(crear("span", null, `${fechaHora(sismo)} (hora de Madrid)`));
    caja.appendChild(crear("span", null,
        `Profundidad ${kilometros(sismo.profundidad_km)} · a ${kilometros(sismo.distancia_km)} de Archidona`));

    if (sismo.intensidad) {
        caja.appendChild(crear("span", null, `Sentido · intensidad máxima ${sismo.intensidad}`));
    }

    if (sismo.provisional) {
        caja.appendChild(crear("span", "sis-provisional", "Provisional (EMSC): falta el dato del IGN"));
    }

    const enlace = enlaceFicha(sismo, sismo.codigo_ign ? "Ficha en el IGN" : "Ficha en el EMSC");
    if (enlace) caja.appendChild(enlace);
    return caja;
}


function leyenda(datos, radio, dias) {
    const caja = crear("div", "sis-leyenda");

    for (const tramo of TRAMOS) {
        const elemento = crear("span", "sis-leyenda-tramo");
        const punto = crear("i", `sis-punto tramo-${tramo}`);
        punto.setAttribute("aria-hidden", "true");
        elemento.appendChild(punto);
        elemento.appendChild(document.createTextNode(NOMBRES_TRAMO[tramo]));
        caja.appendChild(elemento);
    }

    const total = datos.total;
    caja.appendChild(crear("span", "sis-leyenda-total",
        `${total} ${total === 1 ? "sismo" : "sismos"} a menos de ${radio} km en ${dias} ${dias === 1 ? "día" : "días"}`));
    return caja;
}


export async function montarMapaTerremotos(raiz) {
    prepararRaiz(raiz, "sismologia-mapa");

    const radio = leerRadio(raiz, 150);
    const dias = Math.round(leerNumero(raiz, "dias", 30, 1, 3650));
    const minima = raiz.dataset.magnitud ? leerNumero(raiz, "magnitud", 0, 0, 9) : null;
    const altura = Math.round(leerNumero(raiz, "altura", 380, 200, 900));

    titulo(raiz, "Terremotos", `Últimos ${dias} días a menos de ${radio} km`);

    const lienzo = crear("div", "sis-mapa");
    lienzo.style.height = `${altura}px`;
    lienzo.setAttribute("role", "region");
    lienzo.setAttribute("aria-label", `Mapa de terremotos a menos de ${radio} km de Archidona`);
    raiz.appendChild(lienzo);

    const estado = crear("div");
    raiz.appendChild(estado);
    aviso(estado, "Cargando el mapa…");

    let L;
    let datos;

    try {
        [L, datos] = await Promise.all([
            cargarLeaflet(),
            pedir(rutaTerremotos({ radio, dias, limite: 1000, magnitud: minima }))
        ]);
    } catch (error) {
        aviso(estado, "No se han podido cargar los terremotos. Se puede volver a intentar más tarde.", true);
        return;
    }

    estado.remove();

    // La vista antes que las capas: el círculo necesita un mapa ya situado.
    const zona = L.latLng(ARCHIDONA).toBounds(radio * 2000);
    const mapa = L.map(lienzo, { scrollWheelZoom: false, attributionControl: true });
    mapa.fitBounds(zona, { padding: [8, 8] });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 13,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · Datos: IGN, EMSC'
    }).addTo(mapa);

    L.circle(ARCHIDONA, {
        radius: radio * 1000,
        color: MAGMA,
        weight: 1.5,
        dashArray: "6 6",
        fill: false,
        interactive: false
    }).addTo(mapa);

    L.circleMarker(ARCHIDONA, {
        radius: 5,
        color: "#ffffff",
        weight: 2,
        fillColor: PIZARRA,
        fillOpacity: 1
    }).bindTooltip("Archidona").addTo(mapa);

    // Los pequeños primero, para que los grandes queden encima.
    const sismos = [...datos.terremotos].sort((a, b) => (a.magnitud ?? 0) - (b.magnitud ?? 0));

    for (const sismo of sismos) {
        L.circleMarker([sismo.latitud, sismo.longitud], {
            radius: radioPunto(sismo.magnitud),
            color: sismo.sentido ? MAGMA : PIZARRA,
            weight: sismo.sentido ? 2.5 : 0.8,
            dashArray: sismo.provisional ? "3 3" : null,
            fillColor: colorTramo(sismo.tramo_magnitud),
            fillOpacity: 0.82
        }).bindPopup(ficha(sismo)).addTo(mapa);
    }

    // En un dashboard el hueco puede cambiar de tamaño tras montarse.
    if (window.ResizeObserver) {
        new ResizeObserver(() => mapa.invalidateSize()).observe(lienzo);
    }

    raiz.appendChild(leyenda(datos, radio, dias));

    const actualizado = horaActualizacion(datos.actualizado);
    pie(raiz, `${FUENTE}${actualizado ? ` · actualizado ${actualizado}` : ""}`);
}


/* Fin de fichero: js/sismologia/mapa.js */
