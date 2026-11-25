/*
 * MeteoArchidona · Componente «Mapa de las orquídeas»
 *
 * Cuadrículas UTM de 10 × 10 km coloreadas por el número de especies
 * observadas en cada una (José, 25-11-2026). Nunca hay puntos: la API no
 * da la posición de ninguna orquídea, para no dar pistas a quien las
 * arranca. Un desplegable deja ver solo una especie; el círculo marca el
 * radio elegido alrededor de Archidona.
 *
 *     <div data-componente="orquideas-mapa" data-radio="50"></div>
 *     <div data-componente="orquideas-mapa" data-especie="2808646" data-selector="no"></div>
 *
 * data-especie: solo esa especie. data-selector="no": sin desplegable.
 * data-altura: alto del mapa en píxeles (460).
 *
 * Leaflet se carga solo si hay mapa (js/vendor/leaflet-1.9.4.js), con el
 * mapa de OpenStreetMap de fondo.
 *
 * API: GET /orquideas/mapa?radio=50&especie= y /orquideas/especies (privadas).
 */

import {
    pedir, crear, aviso, vaciar, prepararRaiz, titulo, pie, numero, leerRadio, textoError,
    colorEspecies, cargarLeaflet, TRAMOS_ESPECIES, EVENTO_ESPECIE
} from "./comun.js?v=20261125-orquideas1";


const FONDO = {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    opciones: {
        maxNativeZoom: 18,
        maxZoom: 14,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> · Datos: GBIF.org'
    }
};

const ALTURA_DEFECTO = 460;


function leerAltura(raiz) {
    const valor = parseInt(raiz.dataset.altura, 10);
    return Number.isFinite(valor) ? Math.min(Math.max(valor, 240), 900) : ALTURA_DEFECTO;
}


function textoCuadricula(cuadricula) {
    const ficha = crear("div", "orq-mapa-ficha");
    ficha.appendChild(crear("strong", null, `Cuadrícula ${cuadricula.codigo}`));
    ficha.appendChild(crear(
        "span", null,
        `${numero(cuadricula.especies)} ${cuadricula.especies === 1 ? "especie" : "especies"} · `
        + `${numero(cuadricula.observaciones)} ${cuadricula.observaciones === 1 ? "observación" : "observaciones"}`
    ));
    if (cuadricula.principales.length) {
        const lista = crear("ul", "orq-mapa-lista");
        cuadricula.principales.forEach(nombre => lista.appendChild(crear("li", null, nombre)));
        ficha.appendChild(lista);
    }
    return ficha;
}


function leyenda() {
    const caja = crear("div", "orq-leyenda");
    caja.appendChild(crear("span", "orq-leyenda-titulo", "Especies por cuadrícula"));
    for (const tramo of TRAMOS_ESPECIES) {
        const muestra = crear("span", "orq-leyenda-tramo", tramo.texto);
        muestra.style.setProperty("--orq-tramo", tramo.color);
        caja.appendChild(muestra);
    }
    return caja;
}


export async function montarMapaOrquideas(raiz) {
    prepararRaiz(raiz, "orq-mapa-componente");
    const radio = leerRadio(raiz);
    titulo(raiz, "MAPA", "Dónde se han visto");

    let especie = Number(raiz.dataset.especie) || null;
    const mandos = crear("div", "orq-mandos");
    raiz.appendChild(mandos);
    const contenedor = crear("div", "orq-mapa");
    contenedor.style.height = `${leerAltura(raiz)}px`;
    raiz.appendChild(contenedor);
    raiz.appendChild(leyenda());
    const nota = crear("p", "orq-pie");
    raiz.appendChild(nota);

    let selector = null;
    if (raiz.dataset.selector !== "no") {
        const etiqueta = crear("label", "orq-mando");
        etiqueta.appendChild(crear("span", null, "Especie"));
        selector = document.createElement("select");
        selector.appendChild(Object.assign(crear("option", null, "Todas"), { value: "" }));
        etiqueta.appendChild(selector);
        mandos.appendChild(etiqueta);
        pedir(`/orquideas/especies?radio=${radio}`)
            .then(catalogo => {
                for (const grupo of [["Especies", catalogo.especies], ["Híbridos", catalogo.hibridos]]) {
                    if (!grupo[1].length) continue;
                    const opciones = document.createElement("optgroup");
                    opciones.label = grupo[0];
                    for (const item of [...grupo[1]].sort((a, b) => a.nombre_cientifico.localeCompare(b.nombre_cientifico))) {
                        const opcion = crear("option", null, item.nombre_comun ? `${item.nombre_cientifico} · ${item.nombre_comun}` : item.nombre_cientifico);
                        opcion.value = String(item.id);
                        if (item.id === especie) opcion.selected = true;
                        opciones.appendChild(opcion);
                    }
                    selector.appendChild(opciones);
                }
            })
            .catch(() => {});
        selector.addEventListener("change", () => {
            especie = Number(selector.value) || null;
            void pintar();
        });
    }

    let L;
    try {
        L = await cargarLeaflet();
    } catch (error) {
        aviso(contenedor, "No se ha podido cargar el mapa.", true);
        return;
    }

    // Con vista desde el principio: Leaflet no deja añadir círculos a un mapa sin centro.
    const mapa = L.map(contenedor, { scrollWheelZoom: false, zoomSnap: 0.5 }).setView([37.0965, -4.3886], 9);
    L.tileLayer(FONDO.url, FONDO.opciones).addTo(mapa);
    const capa = L.layerGroup().addTo(mapa);
    let encuadrado = false;

    async function pintar() {
        let datos;
        try {
            datos = await pedir(`/orquideas/mapa?radio=${radio}${especie ? `&especie=${especie}` : ""}`);
        } catch (error) {
            capa.clearLayers();
            nota.textContent = textoError(error);
            nota.classList.add("error");
            return;
        }
        nota.classList.remove("error");
        capa.clearLayers();

        L.circle(datos.centro, {
            radius: datos.radio * 1000,
            color: "#5f7a3a",
            weight: 1.5,
            dashArray: "6 6",
            fill: false,
            interactive: false
        }).addTo(capa);
        L.circleMarker(datos.centro, {
            radius: 4, color: "#ffffff", weight: 1.5, fillColor: "#5f7a3a", fillOpacity: 1, interactive: false
        }).bindTooltip("Archidona", { permanent: false }).addTo(capa);

        for (const cuadricula of datos.cuadriculas) {
            L.polygon(cuadricula.esquinas, {
                color: "#ffffff",
                weight: 1,
                fillColor: colorEspecies(cuadricula.especies),
                fillOpacity: 0.78
            })
                .bindPopup(() => textoCuadricula(cuadricula))
                .addTo(capa);
        }

        if (!encuadrado) {
            mapa.fitBounds(L.latLng(datos.centro).toBounds(datos.radio * 2000), { padding: [8, 8] });
            encuadrado = true;
        }

        const total = datos.cuadriculas.reduce((suma, c) => suma + c.observaciones, 0);
        nota.textContent = `${numero(datos.cuadriculas.length)} cuadrículas con ${numero(total)} observaciones.`
            + (datos.fuera_del_mapa ? ` ${numero(datos.fuera_del_mapa)} más no se pintan por tener la posición demasiado imprecisa.` : "")
            + " Por respeto a las plantas, MeteoArchidona no publica dónde está cada orquídea: solo la cuadrícula de 10 km.";
    }

    // En la página, elegir una especie en el catálogo también la filtra aquí.
    document.addEventListener(EVENTO_ESPECIE, evento => {
        if (raiz.dataset.selector === "no" || !selector) return;
        especie = evento.detail?.id || null;
        selector.value = especie ? String(especie) : "";
        void pintar();
    });

    await pintar();
}


/* Fin de fichero: js/orquideas/mapa.js */
