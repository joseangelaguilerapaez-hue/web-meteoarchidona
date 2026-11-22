/*
 * MeteoArchidona · Mi web · menú
 *
 * Las pestañas «Mi web» del registrado en el menú principal, con su nombre
 * corto, después de las secciones fijas (delante de Información) y con
 * una marca para que se note que son suyas (José, 17-11-2026). Sin sesión
 * no sale nada.
 *
 * Lo carga js/cabecera.js. Sabe si hay sesión por el aviso
 * «meteoarchidona:cuenta» de js/cuenta.js o, si ese aviso ya pasó, por la
 * zona de la cuenta ya pintada. Se vuelve a pintar con
 * «meteoarchidona:mi-web» (al crear, renombrar o borrar una pestaña).
 */

import {EVENTO_CAMBIO, direccionPestana, llamar} from "./comun.js?v=20261117-miweb1";


const HOJA = "/css/mi-web.css?v=20261122-miweb2";

let conSesion = false;
let pintando = null;


function asegurarHoja() {
    if (document.querySelector('link[rel="stylesheet"][href*="/css/mi-web.css"]')) {
        return;
    }
    const enlace = document.createElement("link");
    enlace.rel = "stylesheet";
    enlace.href = HOJA;
    document.head.appendChild(enlace);
}


function quitar(menu) {
    menu.querySelectorAll("a[data-mi-web]").forEach(enlace => enlace.remove());
}


async function pintar() {
    const menu = document.getElementById("navegacion-principal");
    if (!menu) {
        return;
    }

    if (!conSesion) {
        quitar(menu);
        return;
    }

    let pestanas = [];
    try {
        pestanas = await llamar("GET", "/usuarios/mi-web");
    } catch (error) {
        // 401 u otro fallo: el menú se queda con las secciones de siempre.
        quitar(menu);
        return;
    }

    quitar(menu);
    asegurarHoja();

    const delante = menu.querySelector('a[data-seccion="informacion"]');
    const enPagina = document.body.dataset.seccion === "mi-web"
        ? Number(new URLSearchParams(window.location.search).get("pestana")) || 1
        : null;

    for (const pestana of [...pestanas].sort((a, b) => a.orden - b.orden)) {
        const enlace = document.createElement("a");
        enlace.href = direccionPestana(pestana.orden);
        enlace.dataset.miWeb = String(pestana.orden);
        enlace.className = "nav-mi-web";
        enlace.title = pestana.descripcion;
        enlace.textContent = pestana.nombre;
        if (enPagina === pestana.orden) {
            enlace.classList.add("activo");
            enlace.setAttribute("aria-current", "page");
        }
        menu.insertBefore(enlace, delante);
    }
}


function repintar() {
    // Una a la vez; si llega otro aviso mientras tanto, otra vuelta al final.
    const anterior = pintando || Promise.resolve();
    pintando = anterior.then(pintar).catch(() => {}).finally(() => {
        pintando = null;
    });
    return pintando;
}


export function montarMenuMiWeb() {
    document.addEventListener("meteoarchidona:cuenta", evento => {
        conSesion = Boolean(evento.detail?.conSesion);
        void repintar();
    });

    document.addEventListener(EVENTO_CAMBIO, () => void repintar());

    // Si js/cuenta.js ya pintó la zona antes de que llegara este módulo.
    const zona = document.getElementById("cuenta-zona");
    if (zona && !zona.hidden) {
        conSesion = Boolean(zona.querySelector('[data-cuenta-accion="cuenta"]'));
        void repintar();
    }
}


/* Fin de fichero: js/mi-web/menu.js */
