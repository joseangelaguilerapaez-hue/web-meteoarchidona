/*
 * MeteoArchidona
 * Administración · Configuración · Zonas de rayos.
 *
 * Diseño: docs/rayos.md, 12, de api-meteoarchidona (José, 20-11-2026).
 *
 * GET /admin/rayos/zonas
 * PUT /admin/rayos/zonas/{id}    {"nombre": "..."}
 *
 * Un cuadrado de 25 km centrado en El Silo, en 7 × 7 cuadros de unos 3,6 km.
 * Cada cuadro muestra su nombre (o «Sin nombre») y cuántos rayos del
 * Meteosat han caído dentro; se pulsa para ponerle o cambiarle el nombre.
 * Fondo físico, satélite o político, como el visor de seguimiento.
 */

import {
    mostrarEstado
} from "./estado.js?v=20261026-cache1";

import {
    peticionJson
} from "./api.js?v=20261026-cache1";


const RUTA = "/admin/rayos/zonas";
const LEAFLET = "/js/vendor/leaflet-1.9.4.js";
const CLAVE_FONDO = "meteoarchidona_zonas_rayos_fondo";


const FONDOS = {
    fisico: {
        nombre: "Físico",
        url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
        opciones: {
            maxNativeZoom: 17,
            maxZoom: 19,
            subdomains: "abc",
            attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)'
        }
    },
    satelite: {
        nombre: "Satélite",
        url: "https://tms-pnoa-ma.idee.es/1.0.0/pnoa-ma/{z}/{x}/{-y}.jpeg",
        opciones: {
            maxNativeZoom: 19,
            maxZoom: 19,
            attribution: 'Ortoimágenes: &copy; <a href="https://www.ign.es/" target="_blank" rel="noopener">IGN/CNIG</a> · PNOA Máxima Actualidad'
        }
    },
    politico: {
        nombre: "Político",
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        opciones: {
            maxNativeZoom: 19,
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }
    }
};

let cargaLeaflet = null;
let mapa = null;
let capaFondo = null;
let capaRejilla = null;
let datos = null;
let seleccionada = null;
let contenedor = null;


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


function cargarLeaflet(){

    if(window.L){
        return Promise.resolve(window.L);
    }

    if(!cargaLeaflet){
        cargaLeaflet = new Promise((resolver, rechazar) => {
            const guion = document.createElement("script");
            guion.src = LEAFLET;
            guion.onload = () => resolver(window.L);
            guion.onerror = () => {
                cargaLeaflet = null;
                rechazar(new Error("No se ha podido cargar el mapa."));
            };
            document.head.appendChild(guion);
        });
    }

    return cargaLeaflet;
}


// Rumbo y distancia del centro del cuadro a El Silo («Norte, 10 km»).
function posicion(zona){

    const [latitud, longitud] = datos.centro;
    const centroLatitud = (zona.sur + zona.norte) / 2;
    const centroLongitud = (zona.oeste + zona.este) / 2;
    const norte = (centroLatitud - latitud) * 111.32;
    const este = (centroLongitud - longitud) * 111.32 * Math.cos(latitud * Math.PI / 180);
    const kilometros = Math.hypot(norte, este);

    if(kilometros < 1){
        return "Centro (El Silo)";
    }

    const rumbos = ["Norte", "Noreste", "Este", "Sureste", "Sur", "Suroeste", "Oeste", "Noroeste"];
    const angulo = (Math.atan2(este, norte) * 180 / Math.PI + 360) % 360;
    const rumbo = rumbos[Math.round(angulo / 45) % 8];

    return `${rumbo}, ${Math.round(kilometros)} km de El Silo`;
}


function textoRayos(cuantos){
    return `${(cuantos || 0).toLocaleString("es-ES")} ${cuantos === 1 ? "rayo" : "rayos"}`;
}


function leerFondo(){

    try{
        const guardado = sessionStorage.getItem(CLAVE_FONDO);
        return FONDOS[guardado] ? guardado : "satelite";
    }catch(error){
        return "satelite";
    }
}


function guardarFondo(codigo){

    try{
        sessionStorage.setItem(CLAVE_FONDO, codigo);
    }catch(error){
        // Sin almacenamiento: el fondo no se recuerda, nada más.
    }
}


/* ==========================================================
   MAPA
   ========================================================== */

function cambiarFondo(codigo){

    const L = window.L;

    if(!mapa || !FONDOS[codigo]){
        return;
    }

    if(capaFondo){
        mapa.removeLayer(capaFondo);
    }

    capaFondo = L.tileLayer(FONDOS[codigo].url, FONDOS[codigo].opciones).addTo(mapa);
    guardarFondo(codigo);

    for(const boton of contenedor.querySelectorAll("[data-fondo]")){
        const activo = boton.dataset.fondo === codigo;
        boton.classList.toggle("activo", activo);
        boton.setAttribute("aria-pressed", String(activo));
    }
}


function pintarRejilla(){

    const L = window.L;

    capaRejilla.clearLayers();

    for(const zona of datos.zonas){

        const elegida = seleccionada === zona.id;
        const limites = [[zona.sur, zona.oeste], [zona.norte, zona.este]];

        const cuadro = L.rectangle(limites, {
            color: elegida ? "#ffd400" : "#ffffff",
            weight: elegida ? 4 : 2,
            // Sin relleno, para ver el terreno (José, 20-11-2026): el
            // relleno transparente se deja solo para que el cuadro se pueda
            // pulsar por dentro.
            fill: true,
            fillOpacity: 0
        });

        cuadro.on("click", () => elegir(zona.id));
        capaRejilla.addLayer(cuadro);

        const html = document.createElement("div");
        html.className = "zr-etiqueta-texto";
        html.append(
            crear("strong", zona.nombre ? "" : "zr-sin-nombre", zona.nombre || "Sin nombre"),
            crear("span", "", String(zona.rayos || 0))
        );

        capaRejilla.addLayer(L.marker(
            [(zona.sur + zona.norte) / 2, (zona.oeste + zona.este) / 2],
            {
                interactive: false,
                keyboard: false,
                icon: L.divIcon({
                    className: "zr-etiqueta",
                    html,
                    iconSize: null
                })
            }
        ));
    }

    // El Silo, en el centro.
    capaRejilla.addLayer(L.circleMarker(datos.centro, {
        radius: 4,
        color: "#ffffff",
        weight: 2,
        fillColor: "#1f4e79",
        fillOpacity: 1,
        interactive: false
    }));
}


/* ==========================================================
   EDICIÓN
   ========================================================== */

function elegir(id){

    seleccionada = id;
    pintarRejilla();
    pintarFormulario();

    contenedor.querySelector("#zonaRayosNombre")?.focus();
}


function pintarFormulario(){

    const formulario = contenedor.querySelector(".zr-formulario");
    const zona = datos.zonas.find(z => z.id === seleccionada);

    formulario.replaceChildren();

    if(!zona){
        formulario.append(crear("p", "modulo-intro", "Pulsa un cuadro del mapa para ponerle nombre."));
        return;
    }

    const titulo = crear("p", "zr-formulario-titulo");
    titulo.append(
        crear("strong", "", posicion(zona)),
        document.createTextNode(` · fila ${zona.fila}, columna ${zona.columna} · ${textoRayos(zona.rayos)}`)
    );

    const etiqueta = crear("label", "zr-formulario-etiqueta", "Nombre de la zona");
    etiqueta.htmlFor = "zonaRayosNombre";

    const entrada = crear("input", "zr-formulario-entrada");
    entrada.id = "zonaRayosNombre";
    entrada.type = "text";
    entrada.maxLength = 80;
    entrada.placeholder = "Sin nombre";
    entrada.value = zona.nombre || "";

    const guardar = crear("button", "boton", "Guardar");
    guardar.type = "submit";

    const estado = crear("div", "estado");
    estado.setAttribute("role", "status");
    estado.setAttribute("aria-live", "polite");

    const fila = crear("div", "zr-formulario-fila");
    fila.append(entrada, guardar);

    const envoltorio = crear("form", "");
    envoltorio.append(titulo, etiqueta, fila, estado);
    envoltorio.addEventListener("submit", evento => {
        evento.preventDefault();
        guardarNombre(zona.id, entrada.value, guardar, estado);
    });

    formulario.append(envoltorio);
}


async function guardarNombre(id, nombre, boton, estado){

    boton.disabled = true;
    mostrarEstado(estado, "Guardando…");

    try{
        const actualizada = await peticionJson(`${RUTA}/${id}`, {
            method: "PUT",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({nombre: nombre.trim() || null})
        });

        datos.zonas = datos.zonas.map(z => z.id === id ? actualizada : z);
        pintarRejilla();
        pintarFormulario();
        mostrarEstado(
            contenedor.querySelector(".zr-formulario .estado"),
            actualizada.nombre ? "Nombre guardado." : "Nombre quitado.",
            "ok"
        );
    }catch(error){
        mostrarEstado(estado, error.message || "No se ha podido guardar el nombre.", "error");
        boton.disabled = false;
    }
}


/* ==========================================================
   MONTAJE
   ========================================================== */

export function desmontarZonasRayos(){

    if(mapa){
        mapa.remove();
    }

    mapa = null;
    capaFondo = null;
    capaRejilla = null;
    datos = null;
    seleccionada = null;
    contenedor = null;
}


export async function montarZonasRayos(destino){

    desmontarZonasRayos();

    contenedor = crear("div", "zr");
    destino.replaceChildren(contenedor);

    const intro = crear(
        "p",
        "modulo-intro",
        "Cuadrado de 25 km alrededor de El Silo en 49 cuadros de unos 3,6 km. " +
        "Cada cuadro muestra su nombre y cuántos rayos del Meteosat han caído dentro. " +
        "El satélite sitúa cada rayo con un error de varios km: cerca de un borde puede contar en el cuadro vecino. " +
        "Pulsa un cuadro para ponerle nombre; déjalo vacío para quitárselo."
    );

    const fondos = crear("div", "acciones zr-fondos");
    fondos.setAttribute("role", "group");
    fondos.setAttribute("aria-label", "Fondo del mapa");

    for(const [codigo, fondo] of Object.entries(FONDOS)){
        const boton = crear("button", "boton boton-secundario", fondo.nombre);
        boton.type = "button";
        boton.dataset.fondo = codigo;
        boton.addEventListener("click", () => cambiarFondo(codigo));
        fondos.append(boton);
    }

    const estado = crear("div", "estado");
    estado.setAttribute("role", "status");
    estado.setAttribute("aria-live", "polite");

    const lienzo = crear("div", "zr-mapa");
    const formulario = crear("div", "zr-formulario");

    contenedor.append(intro, fondos, estado, lienzo, formulario);
    mostrarEstado(estado, "Cargando…");

    const propio = contenedor;

    try{
        const [L, respuesta] = await Promise.all([cargarLeaflet(), peticionJson(RUTA)]);

        // Si se ha cambiado de pestaña mientras cargaba, no se monta nada.
        if(contenedor !== propio || !lienzo.isConnected){
            return;
        }

        datos = respuesta;

        mapa = L.map(lienzo, {
            zoomSnap: 0.25,
            scrollWheelZoom: false
        });

        mapa.fitBounds([[datos.sur, datos.oeste], [datos.norte, datos.este]], {padding: [12, 12]});
        L.control.scale({metric: true, imperial: false, position: "bottomleft"}).addTo(mapa);

        capaRejilla = L.layerGroup().addTo(mapa);
        cambiarFondo(leerFondo());
        pintarRejilla();
        pintarFormulario();
        mostrarEstado(estado, "");
    }catch(error){
        if(contenedor === propio){
            mostrarEstado(estado, error.message || "No se han podido cargar las zonas.", "error");
        }
    }
}


// Fin de fichero: js/administracion/zonas-rayos.js
