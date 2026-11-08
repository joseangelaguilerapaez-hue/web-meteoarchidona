/*
 * MeteoArchidona
 * Administración · Usuarios.
 *
 * Diseño: docs/usuarios.md de api-meteoarchidona, 2.7 (José, 4-11-2026).
 *
 * GET   /admin/usuarios
 * PATCH /admin/usuarios/{identificador}   {"es_administrador": true|false}
 * POST  /admin/usuarios/{identificador}/reenviar-activacion   (8-11-2026)
 * GET   /admin/suscripciones/servicios
 * PATCH /admin/suscripciones/servicios/{codigo}   {"precio", "disponible"}
 *
 * Una ficha por cuenta: nombre, correo, estado y fechas, con la casilla
 * «Administrador». Un administrador entra en Administración con su
 * sesión, sin el PIN. De momento es lo único que se cambia; más
 * adelante, otros datos de la cuenta (por ejemplo, permisos del foro).
 *
 * Las cuentas sin confirmar llevan además «Reenviar activación», por si
 * el correo de activación se perdió (por ejemplo, borrado en spam).
 */

import {
    $,
    mostrarEstado
} from "./estado.js?v=20261026-cache1";

import {
    peticionJson
} from "./api.js?v=20261026-cache1";


const RUTA = "/admin/usuarios";
const RUTA_SERVICIOS = "/admin/suscripciones/servicios";
const ZONA = "Europe/Madrid";

const ESTADOS = {
    PENDIENTE: "Sin confirmar el correo",
    ACTIVO: "Activa",
    BAJA_SOLICITADA: "Baja solicitada"
};

let usuarios = [];
let servicios = [];
let filtro = "";
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
        dateStyle: "short",
        timeStyle: "short"
    });
}


function dato(etiqueta, valor){

    const linea = crear("div", "usuarios-dato");
    linea.append(
        crear("span", "usuarios-dato-etiqueta", etiqueta),
        crear("span", "usuarios-dato-valor", valor)
    );
    return linea;
}


/* ==========================================================
   FICHA DE UNA CUENTA
   ========================================================== */

function ficha(usuario){

    const tarjeta = crear("article", "usuarios-ficha");

    const cabecera = crear("div", "usuarios-cabecera");
    cabecera.append(crear("h3", "usuarios-nombre", usuario.nombre_visible));

    const etiquetas = crear("div", "usuarios-etiquetas");
    etiquetas.append(
        crear(
            "span",
            `usuarios-estado usuarios-estado-${usuario.estado.toLowerCase()}`,
            ESTADOS[usuario.estado] || usuario.estado
        )
    );
    if(usuario.es_administrador){
        etiquetas.append(crear("span", "usuarios-admin", "Administrador"));
    }
    cabecera.append(etiquetas);
    tarjeta.append(cabecera);

    tarjeta.append(crear("p", "usuarios-correo", usuario.correo));

    const datos = crear("div", "usuarios-datos");
    datos.append(
        dato("Alta", fechaLocal(usuario.fecha_creacion)),
        dato("Último acceso", fechaLocal(usuario.fecha_ultimo_acceso))
    );
    if(usuario.fecha_solicitud_baja){
        datos.append(dato("Baja pedida", fechaLocal(usuario.fecha_solicitud_baja)));
    }
    tarjeta.append(datos);

    // Casilla «Administrador». Solo una cuenta activa puede serlo;
    // quitarlo siempre se puede.
    const linea = crear("div", "check-linea usuarios-permiso");
    const casilla = document.createElement("input");
    casilla.type = "checkbox";
    casilla.id = `usuario-admin-${usuario.identificador}`;
    casilla.checked = Boolean(usuario.es_administrador);
    casilla.disabled = !usuario.es_administrador && usuario.estado !== "ACTIVO";
    const etiqueta = crear("label", "", "Administrador");
    etiqueta.htmlFor = casilla.id;
    linea.append(casilla, etiqueta);
    tarjeta.append(linea);

    const estado = crear("div", "estado");
    estado.setAttribute("role", "status");
    estado.setAttribute("aria-live", "polite");
    tarjeta.append(estado);

    casilla.addEventListener("change", () => {
        void cambiarAdministrador(usuario, casilla, estado);
    });

    if(usuario.estado === "PENDIENTE"){
        const reenviar = crear("button", "boton boton-secundario boton-mini usuarios-reenviar", "Reenviar activación");
        reenviar.type = "button";
        reenviar.addEventListener("click", () => {
            void reenviarActivacion(usuario, reenviar, estado);
        });
        tarjeta.insertBefore(reenviar, estado);
    }

    return tarjeta;
}


async function cambiarAdministrador(usuario, casilla, estado){

    const nuevo = casilla.checked;

    const pregunta = nuevo
        ? `¿Hacer administrador a ${usuario.nombre_visible}? Podrá entrar en Administración sin el PIN.`
        : `¿Quitar el permiso de administrador a ${usuario.nombre_visible}?`;

    if(!window.confirm(pregunta)){
        casilla.checked = !nuevo;
        return;
    }

    casilla.disabled = true;
    mostrarEstado(estado, "Guardando…", "info");

    try{
        const actualizado = await peticionJson(
            `${RUTA}/${encodeURIComponent(usuario.identificador)}`,
            {
                method: "PATCH",
                body: JSON.stringify({es_administrador: nuevo})
            }
        );

        const posicion = usuarios.findIndex(
            u => u.identificador === actualizado.identificador
        );
        if(posicion >= 0){
            usuarios[posicion] = actualizado;
        }

        renderizarLista();
        mostrarEstado(
            $("estadoUsuarios"),
            nuevo
                ? `${actualizado.nombre_visible} ya es administrador.`
                : `${actualizado.nombre_visible} ya no es administrador.`,
            "ok"
        );

    }catch(error){
        casilla.checked = !nuevo;
        casilla.disabled = false;
        mostrarEstado(
            estado,
            error.message || "No se ha podido guardar el cambio.",
            "error"
        );
    }
}


async function reenviarActivacion(usuario, boton, estado){

    const pregunta = `¿Reenviar el correo de activación a ${usuario.correo}? `
        + "Recibirá un enlace nuevo y entrará con el PIN que eligió al registrarse.";

    if(!window.confirm(pregunta)){
        return;
    }

    boton.disabled = true;
    mostrarEstado(estado, "Enviando…", "info");

    try{
        const respuesta = await peticionJson(
            `${RUTA}/${encodeURIComponent(usuario.identificador)}/reenviar-activacion`,
            {method: "POST"}
        );
        mostrarEstado(
            estado,
            `${respuesta.mensaje} Que mire también en correo no deseado.`,
            "ok"
        );
    }catch(error){
        mostrarEstado(
            estado,
            error.message || "No se ha podido reenviar la activación.",
            "error"
        );
    }finally{
        boton.disabled = false;
    }
}


/* ==========================================================
   SERVICIOS DE SUSCRIPCIÓN (docs/usuarios.md de la API, 8.5)
   ========================================================== */

const euros = new Intl.NumberFormat("es-ES", {style: "currency", currency: "EUR"});


function fichaServicio(servicio){

    const tarjeta = crear("form", "usuarios-ficha");
    tarjeta.noValidate = true;

    const cabecera = crear("div", "usuarios-cabecera");
    cabecera.append(crear("h3", "usuarios-nombre", servicio.nombre));

    const etiquetas = crear("div", "usuarios-etiquetas");
    etiquetas.append(
        crear(
            "span",
            servicio.disponible ? "usuarios-estado usuarios-estado-activo" : "usuarios-estado",
            servicio.disponible ? "Disponible" : "Retirado"
        ),
        crear(
            "span",
            "usuarios-estado",
            `${servicio.suscripciones_activas} ${servicio.suscripciones_activas === 1 ? "suscripción activa" : "suscripciones activas"}`
        )
    );
    cabecera.append(etiquetas);
    tarjeta.append(cabecera);

    if(servicio.descripcion){
        tarjeta.append(crear("p", "usuarios-correo", servicio.descripcion));
    }

    const campo = crear("div", "campo usuarios-precio");
    const idPrecio = `servicio-precio-${servicio.codigo}`;
    const etiqueta = crear("label", "", "Precio (€)");
    etiqueta.htmlFor = idPrecio;
    const entrada = document.createElement("input");
    entrada.id = idPrecio;
    entrada.type = "number";
    entrada.min = "0";
    entrada.step = "0.01";
    entrada.inputMode = "decimal";
    entrada.value = Number(servicio.precio).toFixed(2);
    campo.append(
        etiqueta,
        entrada,
        crear(
            "p",
            "campo-ayuda",
            Number(servicio.precio) === 0 ? "Hoy: gratis." : `Hoy: ${euros.format(servicio.precio)}.`
        )
    );
    tarjeta.append(campo);

    const linea = crear("div", "check-linea usuarios-permiso");
    const casilla = document.createElement("input");
    casilla.type = "checkbox";
    casilla.id = `servicio-disponible-${servicio.codigo}`;
    casilla.checked = Boolean(servicio.disponible);
    const etiquetaCasilla = crear("label", "", "Disponible");
    etiquetaCasilla.htmlFor = casilla.id;
    linea.append(casilla, etiquetaCasilla);
    tarjeta.append(linea);

    const pie = crear("div", "configuracion-pie");
    const estado = crear("div", "estado");
    estado.setAttribute("role", "status");
    const guardar = crear("button", "boton", "Guardar");
    guardar.type = "submit";
    pie.append(estado, guardar);
    tarjeta.append(pie);

    tarjeta.addEventListener("submit", async evento => {
        evento.preventDefault();

        const valor = Number(entrada.value);

        if(!Number.isFinite(valor) || valor < 0){
            mostrarEstado(estado, "El precio no puede ser negativo.", "error");
            return;
        }

        guardar.disabled = true;
        mostrarEstado(estado, "Guardando…", "info");

        try{
            const actualizado = await peticionJson(
                `${RUTA_SERVICIOS}/${encodeURIComponent(servicio.codigo)}`,
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        precio: valor.toFixed(2),
                        disponible: casilla.checked
                    })
                }
            );
            servicios = servicios.map(s => s.codigo === actualizado.codigo ? actualizado : s);
            renderizarServicios();
            mostrarEstado($("estadoServiciosSuscripcion"), `${actualizado.nombre}: guardado.`, "ok");
        }catch(error){
            mostrarEstado(estado, error.message || "No se ha podido guardar.", "error");
            guardar.disabled = false;
        }
    });

    return tarjeta;
}


function renderizarServicios(){

    const lista = $("listaServiciosSuscripcion");

    if(!lista){
        return;
    }

    lista.replaceChildren(...servicios.map(fichaServicio));
}


async function cargarServicios(){

    const estado = $("estadoServiciosSuscripcion");

    if(!estado){
        return;
    }

    mostrarEstado(estado, "Cargando…");

    try{
        servicios = await peticionJson(RUTA_SERVICIOS);
        renderizarServicios();
        mostrarEstado(estado, "");
    }catch(error){
        mostrarEstado(
            estado,
            error.message || "No se han podido cargar los servicios.",
            "error"
        );
    }
}


/* ==========================================================
   LISTA
   ========================================================== */

function coincide(usuario){

    if(!filtro){
        return true;
    }

    const texto = `${usuario.nombre_visible} ${usuario.correo}`.toLowerCase();
    return texto.includes(filtro);
}


function renderizarLista(){

    const lista = $("listaUsuarios");

    if(!lista){
        return;
    }

    const visibles = usuarios.filter(coincide);
    lista.replaceChildren(...visibles.map(ficha));

    const resumen = $("resumenUsuarios");
    if(resumen){
        const administradores = usuarios.filter(u => u.es_administrador).length;
        resumen.textContent = usuarios.length
            ? `${usuarios.length} ${usuarios.length === 1 ? "cuenta" : "cuentas"}`
                + ` · ${administradores} ${administradores === 1 ? "administrador" : "administradores"}`
                + (filtro ? ` · ${visibles.length} con «${filtro}»` : "")
            : "Todavía no hay ninguna cuenta.";
    }
}


export async function cargarUsuarios(){

    const estado = $("estadoUsuarios");
    mostrarEstado(estado, "Cargando…");

    // Los servicios van aparte: si fallan, la lista de usuarios se ve.
    void cargarServicios();

    try{
        usuarios = await peticionJson(RUTA);
        renderizarLista();
        mostrarEstado(estado, "");
    }catch(error){
        mostrarEstado(
            estado,
            error.message || "No se han podido cargar los usuarios.",
            "error"
        );
        throw error;
    }
}


export function configurarEventosUsuarios(){

    if(eventosConfigurados){
        return;
    }

    eventosConfigurados = true;

    $("botonRecargarUsuarios")?.addEventListener("click", () => {
        cargarUsuarios().catch(() => {});
    });

    $("buscarUsuarios")?.addEventListener("input", evento => {
        filtro = evento.target.value.trim().toLowerCase();
        renderizarLista();
    });
}


export function limpiarUsuarios(){

    usuarios = [];
    servicios = [];
    filtro = "";
    $("listaServiciosSuscripcion")?.replaceChildren();
    mostrarEstado($("estadoServiciosSuscripcion"), "");
    const buscador = $("buscarUsuarios");
    if(buscador){
        buscador.value = "";
    }
    $("listaUsuarios")?.replaceChildren();
    const resumen = $("resumenUsuarios");
    if(resumen){
        resumen.textContent = "";
    }
    mostrarEstado($("estadoUsuarios"), "");
}


// Fin de fichero: js/administracion/usuarios.js
