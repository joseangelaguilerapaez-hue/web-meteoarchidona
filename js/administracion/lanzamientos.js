/*
 * MeteoArchidona
 * Administración · Novedades y avisos · Lanzamientos.
 *
 * Diseño: docs/lanzamientos.md de api-meteoarchidona (José, 15-11-2026).
 *
 * GET  /admin/lanzamientos
 * PUT  /admin/lanzamientos/{clave}          {fecha}
 * POST /admin/lanzamientos/{clave}/lanzar
 *
 * El calendario de lo que se suelta, con su estado (oculta, en obras o
 * publicada), su fecha y su novedad. Cada fila deja cambiar la fecha
 * (la novedad se corre lo mismo) o lanzarla ya. Fechas en hora de Madrid.
 */

import {
    $,
    mostrarEstado
} from "./estado.js?v=20261026-cache1";

import {
    peticionJson
} from "./api.js?v=20261026-cache1";


const RUTA = "/admin/lanzamientos";
const ZONA = "Europe/Madrid";

const ESTADOS = {
    OCULTO: "Oculta",
    EN_OBRAS: "En obras",
    PUBLICADO: "Publicada"
};

const TIPOS = {
    SECCION: "Sección",
    PESTANA: "Pestaña",
    COMPONENTE: "Componente"
};

let lanzamientos = [];
let eventosConfigurados = false;


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

function fechaLocal(valor){
    return new Date(valor).toLocaleString("es-ES", {
        timeZone: ZONA,
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
    });
}

/* "2026-11-18T08:00" en hora de Madrid, para un <input type="datetime-local">. */
function aCampo(valor){
    const partes = Object.fromEntries(
        new Intl.DateTimeFormat("en-CA", {
            timeZone: ZONA,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23"
        }).formatToParts(new Date(valor)).map(p => [p.type, p.value])
    );
    return `${partes.year}-${partes.month}-${partes.day}T${partes.hour}:${partes.minute}`;
}

/* La hora escrita en Madrid, pasada a un instante (ISO con zona). */
function deCampo(texto){
    const [dia, hora] = texto.split("T");
    const [anio, mes, d] = dia.split("-").map(Number);
    const [h, m] = hora.split(":").map(Number);
    const supuesto = Date.UTC(anio, mes - 1, d, h, m);
    // Lo que marca Madrid en ese instante supuesto da su desfase con UTC.
    const enMadrid = new Date(aCampo(supuesto) + ":00Z").getTime();
    return new Date(supuesto - (enMadrid - supuesto)).toISOString();
}


async function guardarFecha(clave, campo){
    if(!campo.value){
        return;
    }
    mostrarEstado($("estadoLanzamientos"), "Guardando…", "info");
    try{
        await peticionJson(`${RUTA}/${encodeURIComponent(clave)}`, {
            method: "PUT",
            body: JSON.stringify({fecha: deCampo(campo.value)})
        });
        await cargarLanzamientos();
    }catch(error){
        mostrarEstado($("estadoLanzamientos"), error.message || "No se ha podido guardar.", "error");
    }
}

async function lanzarYa(item){
    if(!window.confirm(`¿Lanzar «${item.nombre}» ahora mismo? El público la verá ya y saldrá su novedad.`)){
        return;
    }
    mostrarEstado($("estadoLanzamientos"), "Lanzando…", "info");
    try{
        await peticionJson(`${RUTA}/${encodeURIComponent(item.clave)}/lanzar`, {method: "POST"});
        await cargarLanzamientos();
    }catch(error){
        mostrarEstado($("estadoLanzamientos"), error.message || "No se ha podido lanzar.", "error");
    }
}


function fila(item){

    const caja = crear("article", "lanzamiento-admin-fila");
    caja.dataset.estado = item.estado;

    const cabecera = crear("div", "lanzamiento-admin-cabecera");
    cabecera.append(
        crear("span", "lanzamiento-admin-orden", String(item.orden)),
        crear("strong", "lanzamiento-admin-nombre", item.nombre),
        crear("span", "lanzamiento-admin-tipo", TIPOS[item.tipo] || item.tipo),
        crear("span", `lanzamiento-admin-estado estado-${item.estado.toLowerCase()}`, ESTADOS[item.estado] || item.estado)
    );

    const detalle = crear("p", "lanzamiento-admin-detalle",
        `Sale el ${fechaLocal(item.fecha)} · `
        + (item.novedad_titulo ? `Novedad: «${item.novedad_titulo}»` : "Sin novedad todavía")
    );

    caja.append(cabecera, detalle);

    if(item.estado === "OCULTO"){
        const acciones = crear("div", "lanzamiento-admin-acciones");

        const campo = crear("input");
        campo.type = "datetime-local";
        campo.value = aCampo(item.fecha);
        campo.setAttribute("aria-label", `Fecha de lanzamiento de ${item.nombre} (hora de Madrid)`);

        const guardar = crear("button", "boton boton-secundario", "Cambiar fecha");
        guardar.type = "button";
        guardar.addEventListener("click", () => guardarFecha(item.clave, campo));

        const ya = crear("button", "boton boton-principal", "Lanzar ya");
        ya.type = "button";
        ya.addEventListener("click", () => lanzarYa(item));

        acciones.append(campo, guardar, ya);
        caja.appendChild(acciones);
    }

    return caja;
}


export async function cargarLanzamientos(){

    if(!$("listaLanzamientos")){
        return;
    }

    mostrarEstado($("estadoLanzamientos"), "Cargando…", "info");

    lanzamientos = await peticionJson(RUTA);

    $("listaLanzamientos").replaceChildren(...lanzamientos.map(fila));

    const ocultos = lanzamientos.filter(l => l.estado === "OCULTO");
    const siguiente = ocultos[0];

    mostrarEstado(
        $("estadoLanzamientos"),
        siguiente
            ? `${ocultos.length} por salir; la próxima, «${siguiente.nombre}», el ${fechaLocal(siguiente.fecha)}.`
            : "Ya ha salido todo.",
        "ok"
    );
}


export function configurarEventosLanzamientos(){

    if(eventosConfigurados || !$("botonRecargarLanzamientos")){
        return;
    }

    eventosConfigurados = true;

    $("botonRecargarLanzamientos").addEventListener("click", () => {
        cargarLanzamientos().catch(error => {
            mostrarEstado($("estadoLanzamientos"), error.message || "No se han podido cargar.", "error");
        });
    });
}


/* Fin de fichero: js/administracion/lanzamientos.js */
