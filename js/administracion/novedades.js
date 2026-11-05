/*
 * MeteoArchidona
 * Administración · Novedades.
 *
 * Diseño: docs/novedades.md de api-meteoarchidona (José, 5-11-2026).
 *
 * GET    /admin/novedades
 * POST   /admin/novedades          {titulo, inicio, caducidad, activa, bloques: [{imagen, texto}]}
 * PUT    /admin/novedades/{id}     (guardar reemplaza los bloques)
 * DELETE /admin/novedades/{id}
 *
 * Lista de novedades con su estado (vigente, programada, caducada o
 * desactivada) y un editor: título, visible desde, caduca el (con
 * botones de 1, 3, 7 y 15 días), activa y los bloques en orden, cada uno
 * con su imagen (/assets/...) con vista previa y su texto. «Vista previa»
 * abre la misma ventana que verá el visitante en la portada.
 *
 * Las fechas se escriben y se enseñan en hora de Madrid.
 */

import {
    $,
    mostrarEstado
} from "./estado.js?v=20261026-cache1";

import {
    peticionJson,
    peticionAdministrativa
} from "./api.js?v=20261026-cache1";

import {
    abrirVentana
} from "../novedades.js?v=20261105-novedades1";


const RUTA = "/admin/novedades";
const ZONA = "Europe/Madrid";

const ESTADOS = {
    VIGENTE: "Vigente",
    PROGRAMADA: "Programada",
    CADUCADA: "Caducada",
    DESACTIVADA: "Desactivada"
};

const PATRON_IMAGEN = /^\/assets\/[A-Za-z0-9_\-./]+\.(png|jpe?g|webp|gif|svg|avif)$/i;

let novedades = [];
let editando = null;
let eventosConfigurados = false;


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

function fechaLocal(valor){
    if(!valor){
        return "—";
    }
    return new Date(valor).toLocaleString("es-ES", {
        timeZone: ZONA,
        dateStyle: "medium",
        timeStyle: "short"
    });
}

/* Partes de una fecha en hora de Madrid. */
function partesMadrid(fecha){
    const partes = {};
    new Intl.DateTimeFormat("en-GB", {
        timeZone: ZONA,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
    }).formatToParts(fecha).forEach(parte => { partes[parte.type] = parte.value; });
    return partes;
}

/* Fecha → valor de un <input type="datetime-local"> en hora de Madrid. */
function aCampo(fecha){
    const p = partesMadrid(fecha);
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/* Valor de un <input type="datetime-local"> en hora de Madrid → Date. */
function deCampo(valor){
    if(!valor){
        return null;
    }
    const [dia, hora] = valor.split("T");
    const [anio, mes, d] = dia.split("-").map(Number);
    const [h, m] = hora.split(":").map(Number);
    const comoUtc = Date.UTC(anio, mes - 1, d, h, m);
    // Desfase de Madrid en ese momento (una o dos horas), en dos pasadas
    // por si la fecha cae en el cambio de hora.
    let instante = comoUtc;
    for(let vuelta = 0; vuelta < 2; vuelta++){
        const p = partesMadrid(new Date(instante));
        const visto = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
        instante = comoUtc - (visto - instante);
    }
    return new Date(instante);
}


/* ==========================================================
   LISTA
   ========================================================== */

function ficha(novedad){

    const tarjeta = crear("article", "novedades-admin-ficha");

    const cabecera = crear("div", "novedades-admin-cabecera");
    cabecera.append(
        crear("h3", "novedades-admin-titulo", novedad.titulo),
        crear(
            "span",
            `novedades-admin-estado estado-${novedad.estado.toLowerCase()}`,
            ESTADOS[novedad.estado] || novedad.estado
        )
    );
    tarjeta.append(cabecera);

    const imagenes = novedad.bloques.filter(b => b.imagen).length;
    tarjeta.append(
        crear(
            "p",
            "novedades-admin-datos",
            `Desde ${fechaLocal(novedad.inicio)} · caduca ${fechaLocal(novedad.caducidad)} · `
            + `${novedad.bloques.length} bloque${novedad.bloques.length === 1 ? "" : "s"}`
            + (imagenes ? `, ${imagenes} con imagen` : "")
        )
    );

    const acciones = crear("div", "acciones");
    const editar = crear("button", "boton boton-secundario boton-mini", "Editar");
    editar.type = "button";
    editar.addEventListener("click", () => abrirEditor(novedad));
    const previa = crear("button", "boton boton-secundario boton-mini", "Vista previa");
    previa.type = "button";
    previa.addEventListener("click", () => abrirVentana([novedad]));
    acciones.append(editar, previa);
    tarjeta.append(acciones);

    return tarjeta;
}

function renderizarLista(){

    const lista = $("listaNovedades");
    if(!lista){
        return;
    }
    lista.textContent = "";

    if(!novedades.length){
        lista.append(crear("p", "lista-vacia", "Todavía no hay novedades."));
        return;
    }

    for(const novedad of novedades){
        lista.append(ficha(novedad));
    }
}

export async function cargarNovedades(){

    mostrarEstado($("estadoNovedades"), "Cargando…", "info");

    novedades = await peticionJson(RUTA);
    renderizarLista();

    const vigentes = novedades.filter(n => n.estado === "VIGENTE").length;
    mostrarEstado(
        $("estadoNovedades"),
        `${novedades.length} novedad${novedades.length === 1 ? "" : "es"}; `
        + `${vigentes} en la portada ahora.`,
        "ok"
    );
}


/* ==========================================================
   EDITOR
   ========================================================== */

function bloqueEditor(bloque = {imagen: null, texto: null}){

    const caja = crear("div", "novedades-admin-bloque");

    const cabeza = crear("div", "novedades-admin-bloque-cabeza");
    const numero = crear("span", "novedades-admin-bloque-numero", "Bloque");
    const botones = crear("div", "acciones");

    const subir = crear("button", "boton boton-secundario boton-mini", "↑");
    subir.type = "button";
    subir.title = "Subir";
    subir.addEventListener("click", () => {
        if(caja.previousElementSibling){
            caja.parentElement.insertBefore(caja, caja.previousElementSibling);
            numerarBloques();
        }
    });

    const bajar = crear("button", "boton boton-secundario boton-mini", "↓");
    bajar.type = "button";
    bajar.title = "Bajar";
    bajar.addEventListener("click", () => {
        if(caja.nextElementSibling){
            caja.parentElement.insertBefore(caja.nextElementSibling, caja);
            numerarBloques();
        }
    });

    const quitar = crear("button", "boton boton-peligro boton-mini", "Quitar");
    quitar.type = "button";
    quitar.addEventListener("click", () => {
        caja.remove();
        numerarBloques();
    });

    botones.append(subir, bajar, quitar);
    cabeza.append(numero, botones);
    caja.append(cabeza);

    const campoImagen = crear("div", "campo");
    const etiquetaImagen = crear("label", null, "Imagen (opcional)");
    const imagen = crear("input", "novedades-admin-imagen");
    imagen.type = "text";
    imagen.placeholder = "/assets/novedades/nombre.png";
    imagen.value = bloque.imagen || "";
    imagen.autocomplete = "off";
    const ayuda = crear("div", "campo-ayuda", "Solo imágenes nuestras: ruta que empieza por /assets/.");
    campoImagen.append(etiquetaImagen, imagen, ayuda);

    const previa = crear("img", "novedades-admin-previa");
    previa.alt = "";
    previa.hidden = true;

    function verPrevia(){
        const ruta = imagen.value.trim();
        if(ruta && PATRON_IMAGEN.test(ruta) && !ruta.includes("..")){
            previa.src = ruta;
            previa.hidden = false;
            ayuda.textContent = "Solo imágenes nuestras: ruta que empieza por /assets/.";
        }else{
            previa.hidden = true;
            previa.removeAttribute("src");
            if(ruta){
                ayuda.textContent = "Esa ruta no vale: tiene que ser como /assets/novedades/nombre.png.";
            }
        }
    }

    previa.addEventListener("error", () => {
        previa.hidden = true;
        ayuda.textContent = "No se encuentra esa imagen en la web (¿falta el git pull?).";
    });
    imagen.addEventListener("change", verPrevia);
    imagen.addEventListener("input", () => {
        clearTimeout(imagen.espera);
        imagen.espera = setTimeout(verPrevia, 400);
    });

    const campoTexto = crear("div", "campo");
    const etiquetaTexto = crear("label", null, "Texto (opcional)");
    const texto = crear("textarea", "novedades-admin-texto");
    texto.rows = 4;
    texto.value = bloque.texto || "";
    campoTexto.append(etiquetaTexto, texto);

    caja.append(campoImagen, previa, campoTexto);
    verPrevia();

    return caja;
}

function numerarBloques(){
    const cajas = $("bloquesNovedad").querySelectorAll(".novedades-admin-bloque");
    cajas.forEach((caja, indice) => {
        caja.querySelector(".novedades-admin-bloque-numero").textContent = `Bloque ${indice + 1}`;
    });
}

function leerBloques(){
    return Array.from($("bloquesNovedad").querySelectorAll(".novedades-admin-bloque")).map(caja => ({
        imagen: caja.querySelector(".novedades-admin-imagen").value.trim() || null,
        texto: caja.querySelector(".novedades-admin-texto").value.trim() || null
    }));
}

function leerFormulario(){
    const inicio = deCampo($("inicioNovedad").value);
    const caducidad = deCampo($("caducidadNovedad").value);
    return {
        titulo: $("tituloNovedad").value.trim(),
        inicio: inicio ? inicio.toISOString() : null,
        caducidad: caducidad ? caducidad.toISOString() : null,
        activa: $("activaNovedad").checked,
        bloques: leerBloques()
    };
}

function abrirEditor(novedad = null){

    editando = novedad;
    const editor = $("editorNovedad");
    editor.hidden = false;

    $("tituloEditorNovedad").textContent = novedad ? "Editar novedad" : "Nueva novedad";
    $("tituloNovedad").value = novedad ? novedad.titulo : "";

    const ahora = new Date();
    $("inicioNovedad").value = aCampo(novedad ? new Date(novedad.inicio) : ahora);
    $("caducidadNovedad").value = aCampo(
        novedad ? new Date(novedad.caducidad) : new Date(ahora.getTime() + 7 * 86400000)
    );
    $("activaNovedad").checked = novedad ? novedad.activa : true;

    const bloques = $("bloquesNovedad");
    bloques.textContent = "";
    for(const bloque of (novedad ? novedad.bloques : [{imagen: null, texto: null}])){
        bloques.append(bloqueEditor(bloque));
    }
    numerarBloques();

    $("botonBorrarNovedad").hidden = !novedad;
    mostrarEstado($("estadoEditorNovedad"), "", "info");
    editor.scrollIntoView({behavior: "smooth", block: "start"});
}

function cerrarEditor(){
    editando = null;
    $("editorNovedad").hidden = true;
}

function ponerCaducidad(dias){
    const base = deCampo($("inicioNovedad").value) || new Date();
    const desde = base > new Date() ? base : new Date();
    $("caducidadNovedad").value = aCampo(new Date(desde.getTime() + dias * 86400000));
}

async function guardar(){

    const datos = leerFormulario();
    const estado = $("estadoEditorNovedad");

    if(!datos.titulo){
        mostrarEstado(estado, "Falta el título.", "error");
        return;
    }
    if(!datos.caducidad){
        mostrarEstado(estado, "Falta la fecha de caducidad.", "error");
        return;
    }

    mostrarEstado(estado, "Guardando…", "info");

    try{
        const guardada = await peticionJson(
            editando ? `${RUTA}/${editando.id}` : RUTA,
            {
                method: editando ? "PUT" : "POST",
                body: JSON.stringify(datos)
            }
        );
        cerrarEditor();
        await cargarNovedades();
        mostrarEstado(
            $("estadoNovedades"),
            `Guardada «${guardada.titulo}»: ${ESTADOS[guardada.estado] || guardada.estado}.`,
            "ok"
        );
    }catch(error){
        mostrarEstado(estado, error.message || "No se ha podido guardar.", "error");
    }
}

async function borrar(){

    if(!editando || !window.confirm(`¿Borrar la novedad «${editando.titulo}»? No se puede deshacer.`)){
        return;
    }

    try{
        await peticionAdministrativa(`${RUTA}/${editando.id}`, {method: "DELETE"});
        cerrarEditor();
        await cargarNovedades();
    }catch(error){
        mostrarEstado($("estadoEditorNovedad"), error.message || "No se ha podido borrar.", "error");
    }
}

function vistaPrevia(){
    const datos = leerFormulario();
    const bloques = datos.bloques.filter(b => b.imagen || b.texto);
    if(!bloques.length){
        mostrarEstado($("estadoEditorNovedad"), "Pon al menos una imagen o un texto.", "error");
        return;
    }
    abrirVentana([{
        id: 0,
        titulo: datos.titulo || "(sin título)",
        inicio: datos.inicio,
        bloques
    }]);
}


/* ==========================================================
   EVENTOS
   ========================================================== */

export function configurarEventosNovedades(){

    if(eventosConfigurados){
        return;
    }
    eventosConfigurados = true;

    $("botonNuevaNovedad")?.addEventListener("click", () => abrirEditor(null));
    $("botonRecargarNovedades")?.addEventListener("click", () => {
        void cargarNovedades().catch(error =>
            mostrarEstado($("estadoNovedades"), error.message || "No se han podido cargar.", "error")
        );
    });
    $("botonAnadirBloque")?.addEventListener("click", () => {
        $("bloquesNovedad").append(bloqueEditor());
        numerarBloques();
    });
    $("botonGuardarNovedad")?.addEventListener("click", () => void guardar());
    $("botonPreviaNovedad")?.addEventListener("click", vistaPrevia);
    $("botonCancelarNovedad")?.addEventListener("click", cerrarEditor);
    $("botonBorrarNovedad")?.addEventListener("click", () => void borrar());

    document.querySelectorAll("[data-dias-novedad]").forEach(boton => {
        boton.addEventListener("click", () => ponerCaducidad(Number(boton.dataset.diasNovedad)));
    });
}


/* Fin de fichero: js/administracion/novedades.js */
