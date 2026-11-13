/*
 * MeteoArchidona · Componente «Cielo oscuro cerca de Archidona»
 *
 * Lugares cercanos para observar con poca contaminación lumínica: a
 * cuántos kilómetros están de Archidona (en línea recta), su altitud, qué
 * los distingue y cómo llegar, con enlace al mapa y al mapa de brillo del
 * cielo. Lista elegida por José (11-11-2026); los datos están en la API
 * (/luna/lugares).
 *
 *     <div data-componente="luna-cielo-oscuro"></div>
 */

import {
    aviso, crear, decimal, entero, pedir, prepararRaiz, pie, textoError, vaciar
} from "./comun.js?v=20261111-luna5";


function enlace(texto, url) {
    const a = crear("a", "lun-enlace", texto);
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    return a;
}


function tarjeta(lugar) {
    const caja = crear("article", "lun-lugar");
    const cabeza = crear("div", "lun-lugar-cabeza");
    cabeza.appendChild(crear("strong", null, lugar.nombre));
    cabeza.appendChild(crear("span", "lun-lugar-distancia lun-cifra", `${decimal(lugar.distancia_km)} km`));
    caja.appendChild(cabeza);

    caja.appendChild(crear("p", "lun-lugar-distincion", lugar.distincion));
    caja.appendChild(crear("p", null, lugar.descripcion));
    if (lugar.altitud_m) caja.appendChild(crear("p", null, `Altitud: unos ${entero(lugar.altitud_m)} m.`));
    caja.appendChild(crear("p", null, `Cómo llegar: ${lugar.acceso}`));

    const enlaces = crear("div", "lun-lugar-enlaces");
    const coordenadas = `${lugar.latitud},${lugar.longitud}`;
    enlaces.appendChild(enlace("Ver en el mapa", `https://www.openstreetmap.org/?mlat=${lugar.latitud}&mlon=${lugar.longitud}#map=13/${coordenadas.replace(",", "/")}`));
    enlaces.appendChild(enlace("Brillo del cielo", `https://www.lightpollutionmap.info/#zoom=10.00&lat=${lugar.latitud}&lon=${lugar.longitud}&layers=B0FFFFFFFTFFFFFFFFFF`));
    if (lugar.enlace) enlaces.appendChild(enlace("Más información", lugar.enlace));
    caja.appendChild(enlaces);

    if (lugar.coordenadas_aproximadas) {
        caja.appendChild(crear("p", "lun-lugar-nota", "Situación aproximada."));
    }
    return caja;
}


export async function montarCieloOscuro(raiz) {
    prepararRaiz(raiz, "luna-cielo-oscuro");
    aviso(raiz, "Cargando…");
    try {
        const datos = await pedir("/luna/lugares", 6 * 60 * 60 * 1000);
        vaciar(raiz);
        const lista = crear("div", "lun-lugares");
        datos.lugares.forEach(l => lista.appendChild(tarjeta(l)));
        raiz.appendChild(lista);
        raiz.appendChild(crear("p", "lun-nota", datos.aviso));
        pie(raiz, "Distancias en línea recta desde la estación de El Silo. Brillo del cielo: mapa de contaminación lumínica de lightpollutionmap.info (datos de satélite).");
    } catch (error) {
        aviso(raiz, textoError(error), true);
    }
}


/* Fin de fichero: js/luna/cielo-oscuro.js */
