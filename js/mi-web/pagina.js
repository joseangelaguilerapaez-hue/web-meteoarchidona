/*
 * MeteoArchidona · Mi web · página de una pestaña
 *
 * /mi-web?pestana=1, 2 o 3. José, 22-11-2026: la pestaña del menú enseña
 * lo que ha creado como una sección más de la web, sin configuración:
 * título (la descripción de la pestaña) y el dashboard fijado para el
 * formato de la pantalla. Elegir, fijar, crear y editar se hace en
 * Mi cuenta → Mi web (js/mi-web/gestion.js y js/mi-web/configurar.js).
 *
 * - Formato de la pantalla: móvil por debajo de 850 px (el mismo corte
 *   de la versión de prueba de Actualidad).
 * - Sin nada fijado: una línea con el enlace a Mi cuenta → Mi web.
 *
 * El texto nunca se mete como HTML.
 */

import {crear, llamar} from "./comun.js?v=20261117-miweb1";
import {pintarDashboard} from "../dashboards/pintor.js?v=20261121-llenar1";


const CORTE_MOVIL = "(max-width: 850px)";
const NOMBRE_FORMATO = {PC: "PC", MOVIL: "móvil"};
const DIRECCION_CONFIGURAR = "/mi-cuenta#miweb";

const estado = {
    orden: 1,
    pestana: null,
    formato: "PC",
    fijado: null
};

let cargando = null;


function $(id) {
    return document.getElementById(id);
}


function formatoActual() {
    return window.matchMedia(CORTE_MOVIL).matches ? "MOVIL" : "PC";
}


function avisar(texto, tipo) {
    const nodo = $("estadoMiWeb");
    nodo.textContent = texto || "";
    nodo.dataset.tipo = tipo || "";
}


function leerOrden() {
    const numero = Number(new URLSearchParams(window.location.search).get("pestana"));
    return Number.isInteger(numero) && numero >= 1 && numero <= 3 ? numero : 1;
}


function enlaceConfigurar() {
    const enlace = crear("a", null, "Mi cuenta → Mi web");
    enlace.href = DIRECCION_CONFIGURAR;
    return enlace;
}


function pintarCabecera() {
    const pestana = estado.pestana;
    $("etiquetaMiWeb").textContent = `METEOARCHIDONA · ${pestana.nombre.toUpperCase()}`;
    $("tituloMiWeb").textContent = pestana.descripcion;
    document.title = `${pestana.nombre} · MeteoArchidona`;
}


/* ==========================================================
   PINTAR Y CARGAR
   ========================================================== */

function pintar() {
    const contenido = $("miWebContenido");
    contenido.replaceChildren();
    pintarCabecera();

    const zona = crear("div", "mi-web-dashboard");
    contenido.appendChild(zona);
    if (!estado.fijado) {
        const vacia = crear("div", "mi-web-bloque mi-web-vacia");
        const texto = crear("p");
        texto.append(
            document.createTextNode(`Esta pestaña aún no tiene dashboard de ${NOMBRE_FORMATO[estado.formato]}. Configúrala en `),
            enlaceConfigurar(),
            document.createTextNode(".")
        );
        vacia.appendChild(texto);
        zona.appendChild(vacia);
        return;
    }
    pintarDashboard(zona, estado.fijado).catch(error => {
        console.error("Mi web", error);
        zona.replaceChildren(crear("p", "mi-web-bloque", "No se ha podido pintar el dashboard."));
    });
}


async function cargarTodo() {
    estado.orden = leerOrden();
    estado.formato = formatoActual();

    let pestanas;
    try {
        pestanas = await llamar("GET", "/usuarios/mi-web");
    } catch (error) {
        if (error.codigoHttp === 401) {
            $("miWebContenido").hidden = true;
            $("miWebSinSesion").hidden = false;
            $("tituloMiWeb").textContent = "Mi web";
            avisar("");
            return;
        }
        avisar(error.message, "error");
        return;
    }

    $("miWebSinSesion").hidden = true;
    estado.pestana = pestanas.find(p => p.orden === estado.orden) || null;
    if (!estado.pestana) {
        $("miWebContenido").hidden = true;
        $("tituloMiWeb").textContent = "Mi web";
        const aviso = $("estadoMiWeb");
        aviso.dataset.tipo = "";
        aviso.replaceChildren(
            document.createTextNode(`No tienes la pestaña ${estado.orden}. Créala en `),
            enlaceConfigurar(),
            document.createTextNode(".")
        );
        return;
    }

    const contenido = await llamar(
        "GET", `/usuarios/mi-web/${estado.pestana.identificador}/contenido?formato=${estado.formato}`);
    estado.fijado = contenido.dashboard;

    $("miWebContenido").hidden = false;
    avisar("");
    pintar();
}


function cargar() {
    if (cargando === null) {
        cargando = cargarTodo()
            .catch(error => avisar(error.message || "No se ha podido cargar la pestaña.", "error"))
            .finally(() => { cargando = null; });
    }
    return cargando;
}


function arrancar() {
    // js/cuenta.js avisa al entrar y al salir.
    document.addEventListener("meteoarchidona:cuenta", () => void cargar());
    // Al cruzar el corte de móvil, el otro formato.
    window.matchMedia(CORTE_MOVIL).addEventListener("change", () => void cargar());
    void cargar();
}


arrancar();


/* Fin de fichero: js/mi-web/pagina.js */
