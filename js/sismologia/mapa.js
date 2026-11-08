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
 * data-altura: alto del mapa en píxeles (380). data-fondo: «satelite»
 * (por defecto) o «mapa». data-forma: «rectangulo» (por defecto) o
 * «redondo»: el propio mapa es el círculo del radio, como una pantalla
 * de radar (prueba pedida por José el 8-11-2026); los botones van encima
 * y las atribuciones, debajo.
 *
 * Leaflet se carga solo si hay un mapa (js/vendor/leaflet-1.9.4.js).
 * Fondo (José, 8-11-2026): las ortofotos PNOA del IGN, las mismas del
 * visor de seguimiento, con un botón para pasar al mapa de
 * OpenStreetMap; zoom hasta el nivel de calle. Todo lo que queda fuera
 * del radio se oscurece (la API solo da los sismos de dentro).
 *
 * API: GET /sismologia/terremotos?radio_km&dias&limite=1000
 */

import {
    pedir, crear, aviso, prepararRaiz, esVigente, titulo, pie, leerRadio, leerNumero, rutaTerremotos,
    cargarLeaflet, colorTramo, magnitud, kilometros, fechaHora, lugar, enlaceFicha,
    horaActualizacion, TRAMOS, NOMBRES_TRAMO, ARCHIDONA, PIZARRA, MAGMA, FUENTE
} from "./comun.js?v=20261108-sismo3";


const FONDOS = {
    satelite: {
        nombre: "Satélite",
        url: "https://tms-pnoa-ma.idee.es/1.0.0/pnoa-ma/{z}/{x}/{-y}.jpeg",
        opciones: {
            maxNativeZoom: 19,
            maxZoom: 19,
            attribution: 'Ortofotos: &copy; <a href="https://www.ign.es/" target="_blank" rel="noopener">IGN/CNIG</a> · PNOA · Datos: IGN, EMSC'
        }
    },
    mapa: {
        nombre: "Mapa",
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        opciones: {
            maxNativeZoom: 19,
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> · Datos: IGN, EMSC'
        }
    }
};

const RADIO_TIERRA_KM = 6371;


/* Puntos del círculo de radio km alrededor de un centro (sobre la esfera). */
function puntosCirculo(centro, radioKm, pasos = 180) {
    const lat1 = centro[0] * Math.PI / 180;
    const lon1 = centro[1] * Math.PI / 180;
    const angular = radioKm / RADIO_TIERRA_KM;
    const puntos = [];

    for (let paso = 0; paso < pasos; paso += 1) {
        const rumbo = (paso / pasos) * 2 * Math.PI;
        const lat2 = Math.asin(Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(rumbo));
        const lon2 = lon1 + Math.atan2(
            Math.sin(rumbo) * Math.sin(angular) * Math.cos(lat1),
            Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2)
        );
        puntos.push([lat2 * 180 / Math.PI, lon2 * 180 / Math.PI]);
    }

    return puntos;
}


/* Velo oscuro sobre todo el mapa menos el círculo (polígono con agujero). */
function veloFuera(L, centro, radioKm) {
    const mundo = [[-85, -180], [-85, 180], [85, 180], [85, -180]];
    return L.polygon([mundo, puntosCirculo(centro, radioKm)], {
        stroke: false,
        fillColor: "#0b1015",
        fillOpacity: 0.55,
        interactive: false
    });
}


function botonesFondo(marco, alCambiar, inicial, mapa = null) {
    const caja = crear("div", "sis-mapa-fondos");
    caja.setAttribute("role", "group");
    caja.setAttribute("aria-label", "Fondo del mapa");
    const botones = {};

    for (const [clave, fondo] of Object.entries(FONDOS)) {
        const boton = crear("button", "sis-mapa-fondo", fondo.nombre);
        boton.type = "button";
        boton.setAttribute("aria-pressed", String(clave === inicial));
        boton.addEventListener("click", () => {
            for (const [otra, otro] of Object.entries(botones)) {
                otro.setAttribute("aria-pressed", String(otra === clave));
            }
            alCambiar(clave);
        });
        botones[clave] = boton;
        caja.appendChild(boton);
    }

    // En el mapa redondo el zoom de Leaflet quedaría cortado por el borde:
    // va aquí, con los botones de fondo.
    if (mapa) {
        const zoom = crear("div", "sis-mapa-zoom");
        for (const [texto, etiqueta, accion] of [["+", "Acercar", () => mapa.zoomIn()], ["−", "Alejar", () => mapa.zoomOut()]]) {
            const boton = crear("button", "sis-mapa-fondo", texto);
            boton.type = "button";
            boton.setAttribute("aria-label", etiqueta);
            boton.addEventListener("click", accion);
            zoom.appendChild(boton);
        }
        const barra = crear("div", "sis-mapa-barra");
        barra.appendChild(zoom);
        barra.appendChild(caja);
        marco.prepend(barra);
        return;
    }

    marco.appendChild(caja);
}


function radioPunto(valor) {
    if (valor === null || valor === undefined) return 4;
    return Math.max(3.5, Math.min(22, 3 + valor * valor * 0.9));
}


/* Tamaño en pantalla según el zoom (José, 8-11-2026: al acercar casi a
 * pie de calle, los círculos se quedaban muy pequeños para tocarlos con
 * el dedo). Crecen con cada nivel de zoom por encima del inicial y nunca
 * bajan de un mínimo cómodo para el dedo. */
const MINIMO_DEDO = 11;

function radioConZoom(valor, zoom, zoomInicial) {
    const base = radioPunto(valor);
    const factor = Math.min(2.6, 1 + Math.max(0, zoom - zoomInicial) * 0.22);
    const minimo = zoom > zoomInicial + 1 ? MINIMO_DEDO : 0;
    return Math.max(minimo, base * factor);
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
    // Al volver a montarlo (p. ej. al cambiar el radio en la página), fuera
    // el mapa anterior.
    if (raiz._sisMapa) {
        raiz._sisMapa.remove();
        raiz._sisMapa = null;
    }
    if (raiz._sisObservador) {
        raiz._sisObservador.disconnect();
        raiz._sisObservador = null;
    }

    const turno = prepararRaiz(raiz, "sismologia-mapa");

    const radio = leerRadio(raiz, 150);
    const dias = Math.round(leerNumero(raiz, "dias", 30, 1, 3650));
    const minima = raiz.dataset.magnitud ? leerNumero(raiz, "magnitud", 0, 0, 9) : null;
    const altura = Math.round(leerNumero(raiz, "altura", 380, 200, 900));

    titulo(raiz, "Terremotos", `Últimos ${dias} días a menos de ${radio} km`);

    const fondoInicial = raiz.dataset.fondo === "mapa" ? "mapa" : "satelite";
    const redondo = raiz.dataset.forma === "redondo";

    const marco = crear("div", redondo ? "sis-mapa-marco redondo" : "sis-mapa-marco");
    const lienzo = crear("div", redondo ? "sis-mapa redondo" : "sis-mapa");
    if (!redondo) lienzo.style.height = `${altura}px`;
    lienzo.setAttribute("role", "region");
    lienzo.setAttribute("aria-label", `Mapa de terremotos a menos de ${radio} km de Archidona`);
    marco.appendChild(lienzo);
    raiz.appendChild(marco);

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
        if (!esVigente(raiz, turno)) return;
        aviso(estado, "No se han podido cargar los terremotos. Se puede volver a intentar más tarde.", true);
        return;
    }

    estado.remove();

    // Si mientras llegaban los datos se ha vuelto a montar, este ya sobra.
    if (!esVigente(raiz, turno) || !lienzo.isConnected) return;

    // La vista antes que las capas: el círculo necesita un mapa ya situado.
    const zona = L.latLng(ARCHIDONA).toBounds(radio * 2000);
    const mapa = L.map(lienzo, {
        scrollWheelZoom: true,
        attributionControl: !redondo,
        zoomControl: !redondo,
        zoomSnap: redondo ? 0.25 : 1,
        maxZoom: 19
    });
    // En el redondo el círculo del radio llena justo el mapa.
    mapa.fitBounds(zona, { padding: redondo ? [0, 0] : [8, 8] });

    let capaFondo = null;
    const ponerFondo = (clave) => {
        if (capaFondo) capaFondo.remove();
        capaFondo = L.tileLayer(FONDOS[clave].url, FONDOS[clave].opciones).addTo(mapa);
        capaFondo.bringToBack();
        lienzo.dataset.fondo = clave;
    };
    ponerFondo(fondoInicial);
    botonesFondo(marco, ponerFondo, fondoInicial, redondo ? mapa : null);

    veloFuera(L, ARCHIDONA, radio).addTo(mapa);

    L.circle(ARCHIDONA, {
        radius: radio * 1000,
        color: MAGMA,
        weight: 2,
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

    const zoomInicial = mapa.getZoom();
    const puntos = [];

    for (const sismo of sismos) {
        const punto = L.circleMarker([sismo.latitud, sismo.longitud], {
            radius: radioPunto(sismo.magnitud),
            // Borde blanco para que se vean sobre el satélite.
            color: sismo.sentido ? MAGMA : "#ffffff",
            weight: sismo.sentido ? 2.5 : 1,
            dashArray: sismo.provisional ? "3 3" : null,
            fillColor: colorTramo(sismo.tramo_magnitud),
            fillOpacity: 0.82
        }).bindPopup(ficha(sismo)).addTo(mapa);
        puntos.push([punto, sismo.magnitud]);
    }

    mapa.on("zoomend", () => {
        const zoom = mapa.getZoom();
        for (const [punto, valor] of puntos) punto.setRadius(radioConZoom(valor, zoom, zoomInicial));
    });

    // En un dashboard el hueco puede cambiar de tamaño tras montarse.
    raiz._sisMapa = mapa;

    if (window.ResizeObserver) {
        raiz._sisObservador = new ResizeObserver(() => mapa.invalidateSize());
        raiz._sisObservador.observe(lienzo);
    }

    raiz.appendChild(leyenda(datos, radio, dias));

    const actualizado = horaActualizacion(datos.actualizado);
    const creditos = redondo ? " · Ortofotos PNOA © IGN/CNIG · Mapa © OpenStreetMap · Leaflet" : "";
    pie(raiz, `${FUENTE}${actualizado ? ` · actualizado ${actualizado}` : ""}${creditos}`);
}


/* Fin de fichero: js/sismologia/mapa.js */
