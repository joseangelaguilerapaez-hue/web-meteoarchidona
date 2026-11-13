/*
 * MeteoArchidona
 * Administración · Usuarios · Ficha de mantenimiento de una cuenta.
 *
 * Diseño: docs/usuarios.md de api-meteoarchidona, 2.8 (José, 8-11-2026).
 *
 * Se abre al pulsar una cuenta de la lista. Se ve todo (datos,
 * suscripciones, sesiones abiertas, registro de seguridad, «Mi web» y
 * dashboards) y se puede cambiar el estado y las suscripciones, mandar
 * el cambio de PIN, cerrar sus sesiones, reenviar la activación y borrar
 * la cuenta. Nombre y correo no se cambian desde aquí.
 *
 * GET    /admin/usuarios/{id}
 * POST   /admin/usuarios/{id}/estado              {"estado"}
 * POST   /admin/usuarios/{id}/enviar-cambio-pin
 * POST   /admin/usuarios/{id}/cerrar-sesiones
 * POST   /admin/usuarios/{id}/reenviar-activacion
 * POST   /admin/usuarios/{id}/borrar              {"correo"}
 * POST   /admin/usuarios/{id}/suscripciones       {"servicio", "localidad"}
 * PATCH  /admin/usuarios/{id}/suscripciones/{s}   {"activa"}
 * DELETE /admin/usuarios/{id}/suscripciones/{s}
 * GET    /usuarios/suscripciones/catalogo
 */

import {
    mostrarEstado
} from "./estado.js?v=20261026-cache1";

import {
    peticionAdministrativa,
    peticionJson
} from "./api.js?v=20261026-cache1";


const RUTA = "/admin/usuarios";
const RUTA_CATALOGO = "/usuarios/suscripciones/catalogo";
const ZONA = "Europe/Madrid";

const ESTADOS = {
    PENDIENTE: "Sin confirmar el correo",
    ACTIVO: "Activa",
    BAJA_SOLICITADA: "Baja solicitada"
};

const SUCESOS = {
    ALTA: "Alta",
    CORREO_VERIFICADO: "Correo confirmado",
    ACCESO: "Entrada",
    ACCESO_FALLIDO: "Entrada fallida",
    BLOQUEO: "Bloqueo",
    CIERRE_SESION: "Cierre de sesión",
    CAMBIO_PIN: "Cambio de PIN",
    PIN_OLVIDADO: "Enlace de PIN nuevo",
    BAJA_SOLICITADA: "Baja",
    BAJA_CANCELADA: "Baja cancelada",
    CUENTA_BORRADA: "Cuenta borrada",
    ACCESO_ADMINISTRACION: "Entrada en Administración",
    CAMBIO_ADMINISTRADOR: "Cambio de administrador"
};

let dialogo = null;
let catalogo = null;
let actual = null;
let alCambiar = () => {};


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


function boton(texto, clase, accion){

    const elemento = crear("button", `boton boton-mini ${clase || "boton-secundario"}`, texto);
    elemento.type = "button";
    elemento.addEventListener("click", accion);
    return elemento;
}


function bloque(titulo, ...contenido){

    const seccion = crear("section", "ficha-usuario-bloque");
    seccion.append(crear("h4", "ficha-usuario-titulo", titulo), ...contenido);
    return seccion;
}


function vacio(texto){
    return crear("p", "ficha-usuario-vacio", texto);
}


function ruta(sufijo = ""){
    return `${RUTA}/${encodeURIComponent(actual.usuario.identificador)}${sufijo}`;
}


/* ==========================================================
   DIÁLOGO
   ========================================================== */

function preparar(){

    if(dialogo){
        return dialogo;
    }

    dialogo = crear("dialog", "ficha-usuario");
    dialogo.setAttribute("aria-labelledby", "fichaUsuarioNombre");

    const cabecera = crear("div", "ficha-usuario-cabecera");
    const titulo = crear("h3", "usuarios-nombre");
    titulo.id = "fichaUsuarioNombre";
    const cerrar = boton("Cerrar", "boton-secundario", () => dialogo.close());
    cabecera.append(titulo, cerrar);

    const estado = crear("div", "estado");
    estado.id = "estadoFichaUsuario";
    estado.setAttribute("role", "status");
    estado.setAttribute("aria-live", "polite");

    const cuerpo = crear("div", "ficha-usuario-cuerpo");
    cuerpo.id = "cuerpoFichaUsuario";

    dialogo.append(cabecera, estado, cuerpo);

    // Pulsar fuera de la ficha la cierra.
    dialogo.addEventListener("click", evento => {
        if(evento.target === dialogo){
            dialogo.close();
        }
    });

    document.body.append(dialogo);
    return dialogo;
}


function estadoFicha(){
    return document.getElementById("estadoFichaUsuario");
}


async function cargarCatalogo(){

    if(catalogo){
        return catalogo;
    }

    catalogo = await peticionJson(RUTA_CATALOGO);
    return catalogo;
}


async function recargar(mensaje){

    actual = await peticionJson(ruta());
    pintar();
    alCambiar(actual.usuario);

    if(mensaje){
        mostrarEstado(estadoFicha(), mensaje, "ok");
    }
}


/*
 * Ejecuta una acción con confirmación, la deja en espera mientras va y
 * vuelve a cargar la ficha al terminar.
 */
async function ejecutar(elemento, pregunta, accion){

    if(pregunta && !window.confirm(pregunta)){
        return;
    }

    elemento.disabled = true;
    mostrarEstado(estadoFicha(), "Un momento…", "info");

    try{
        const mensaje = await accion();
        await recargar(mensaje);
    }catch(error){
        mostrarEstado(estadoFicha(), error.message || "No se ha podido hacer.", "error");
        elemento.disabled = false;
    }
}


/* ==========================================================
   PINTADO
   ========================================================== */

function pintarDatos(usuario){

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

    const datos = crear("div", "usuarios-datos");
    datos.append(
        dato("Correo", usuario.correo),
        dato("Alta", fechaLocal(usuario.fecha_creacion)),
        dato("Correo confirmado", fechaLocal(usuario.fecha_verificacion_correo)),
        dato("Último acceso", fechaLocal(usuario.fecha_ultimo_acceso)),
        dato("Última modificación", fechaLocal(actual.fecha_actualizacion))
    );
    if(usuario.fecha_solicitud_baja){
        datos.append(dato("Baja pedida", fechaLocal(usuario.fecha_solicitud_baja)));
    }

    return bloque("Cuenta", etiquetas, datos);
}


function pintarAcciones(usuario){

    const fila = crear("div", "ficha-usuario-acciones");

    if(usuario.estado === "PENDIENTE"){
        fila.append(
            boton("Activar sin el enlace", "boton-principal", evento => ejecutar(
                evento.currentTarget,
                `¿Activar la cuenta de ${usuario.correo} sin que confirme el correo?`,
                async () => {
                    await peticionJson(ruta("/estado"), {method: "POST", body: JSON.stringify({estado: "ACTIVO"})});
                    return "Cuenta activada.";
                }
            )),
            boton("Reenviar activación", "", evento => ejecutar(
                evento.currentTarget,
                `¿Reenviar el correo de activación a ${usuario.correo}?`,
                async () => {
                    const respuesta = await peticionJson(ruta("/reenviar-activacion"), {method: "POST"});
                    return `${respuesta.mensaje} Que mire también en correo no deseado.`;
                }
            ))
        );
    }

    if(usuario.estado === "ACTIVO"){
        fila.append(
            boton("Enviar cambio de PIN", "", evento => ejecutar(
                evento.currentTarget,
                `¿Mandar a ${usuario.correo} el correo para elegir un PIN nuevo? Su PIN actual sigue valiendo hasta que lo cambie.`,
                async () => (await peticionJson(ruta("/enviar-cambio-pin"), {method: "POST"})).mensaje
            )),
            boton("Dar de baja", "boton-peligro", evento => ejecutar(
                evento.currentTarget,
                `¿Dar de baja la cuenta de ${usuario.correo}? Se cierran sus sesiones, se le avisa por correo y se borrará pasados los días de baja, salvo que entre antes.`,
                async () => {
                    await peticionJson(ruta("/estado"), {method: "POST", body: JSON.stringify({estado: "BAJA_SOLICITADA"})});
                    return "Cuenta dada de baja.";
                }
            ))
        );
    }

    if(usuario.estado === "BAJA_SOLICITADA"){
        fila.append(
            boton("Cancelar la baja", "boton-principal", evento => ejecutar(
                evento.currentTarget,
                `¿Cancelar la baja de ${usuario.correo}? La cuenta vuelve a estar activa.`,
                async () => {
                    await peticionJson(ruta("/estado"), {method: "POST", body: JSON.stringify({estado: "ACTIVO"})});
                    return "Baja cancelada.";
                }
            ))
        );
    }

    if(actual.sesiones.length){
        fila.append(
            boton("Cerrar sus sesiones", "", evento => ejecutar(
                evento.currentTarget,
                `¿Cerrar todas las sesiones de ${usuario.nombre_visible}? Tendrá que volver a entrar en todos sus dispositivos.`,
                async () => (await peticionJson(ruta("/cerrar-sesiones"), {method: "POST"})).mensaje
            ))
        );
    }

    fila.append(boton("Borrar la cuenta", "boton-peligro", evento => borrar(evento.currentTarget)));

    return bloque("Acciones", fila);
}


async function borrar(elemento){

    const usuario = actual.usuario;
    const escrito = window.prompt(
        `Borrar la cuenta ahora, sin días de baja: se pierde todo (suscripciones, «Mi web», dashboards). `
        + `No se puede deshacer.\n\nPara confirmar, escribe su correo: ${usuario.correo}`
    );

    if(escrito === null){
        return;
    }

    elemento.disabled = true;
    mostrarEstado(estadoFicha(), "Borrando…", "info");

    try{
        const respuesta = await peticionJson(ruta("/borrar"), {
            method: "POST",
            body: JSON.stringify({correo: escrito.trim()})
        });
        alCambiar(null, usuario.identificador);
        dialogo.close();
        window.alert(respuesta.mensaje);
    }catch(error){
        mostrarEstado(estadoFicha(), error.message || "No se ha podido borrar.", "error");
        elemento.disabled = false;
    }
}


function pintarSuscripciones(){

    const lista = crear("div", "ficha-usuario-lista");

    if(!actual.suscripciones.length){
        lista.append(vacio("No tiene ninguna suscripción."));
    }

    for(const suscripcion of actual.suscripciones){

        const fila = crear("div", "ficha-usuario-fila");
        const texto = crear("div", "ficha-usuario-fila-texto");
        texto.append(
            crear("strong", "", suscripcion.servicio.nombre),
            crear(
                "span",
                "ficha-usuario-detalle",
                [
                    suscripcion.localidad ? suscripcion.localidad.nombre : null,
                    suscripcion.activa ? "activa" : "en pausa",
                    suscripcion.servicio_disponible ? null : "servicio retirado",
                    `desde ${fechaLocal(suscripcion.fecha_creacion)}`
                ].filter(Boolean).join(" · ")
            )
        );

        const base = ruta(`/suscripciones/${encodeURIComponent(suscripcion.identificador)}`);
        const botones = crear("div", "ficha-usuario-acciones");
        botones.append(
            boton(suscripcion.activa ? "Pausar" : "Reanudar", "", evento => ejecutar(
                evento.currentTarget,
                null,
                async () => {
                    await peticionJson(base, {method: "PATCH", body: JSON.stringify({activa: !suscripcion.activa})});
                    return suscripcion.activa ? "Suscripción en pausa." : "Suscripción reanudada.";
                }
            )),
            boton("Quitar", "boton-peligro", evento => ejecutar(
                evento.currentTarget,
                `¿Quitar la suscripción «${suscripcion.servicio.nombre}»${suscripcion.localidad ? ` de ${suscripcion.localidad.nombre}` : ""}?`,
                async () => {
                    await peticionAdministrativa(base, {method: "DELETE"});
                    return "Suscripción quitada.";
                }
            ))
        );

        fila.append(texto, botones);
        lista.append(fila);
    }

    return bloque("Suscripciones", lista, formularioSuscripcion());
}


function formularioSuscripcion(){

    const formulario = crear("form", "ficha-usuario-nueva");
    formulario.noValidate = true;

    const servicio = document.createElement("select");
    servicio.setAttribute("aria-label", "Servicio");
    const localidad = document.createElement("select");
    localidad.setAttribute("aria-label", "Localidad");
    const anadir = crear("button", "boton boton-mini boton-principal", "Añadir");
    anadir.type = "submit";

    servicio.append(new Option("Servicio…", ""));
    localidad.append(new Option("Localidad…", ""));

    for(const s of catalogo?.servicios || []){
        servicio.append(new Option(s.nombre, s.codigo));
    }
    for(const l of catalogo?.localidades || []){
        localidad.append(new Option(l.nombre, l.codigo));
    }

    const conLocalidad = () => {
        const elegido = (catalogo?.servicios || []).find(s => s.codigo === servicio.value);
        return Boolean(elegido?.con_localidad);
    };

    const ajustar = () => {
        localidad.hidden = !conLocalidad();
    };
    servicio.addEventListener("change", ajustar);
    ajustar();

    formulario.append(servicio, localidad, anadir);

    formulario.addEventListener("submit", evento => {
        evento.preventDefault();

        if(!servicio.value){
            mostrarEstado(estadoFicha(), "Elige un servicio.", "error");
            return;
        }
        if(conLocalidad() && !localidad.value){
            mostrarEstado(estadoFicha(), "Elige una localidad.", "error");
            return;
        }

        void ejecutar(anadir, null, async () => {
            const cuerpo = {servicio: servicio.value};
            if(conLocalidad()){
                cuerpo.localidad = localidad.value;
            }
            await peticionJson(ruta("/suscripciones"), {method: "POST", body: JSON.stringify(cuerpo)});
            return "Suscripción añadida.";
        });
    });

    return formulario;
}


function pintarSesiones(){

    const lista = crear("div", "ficha-usuario-lista");

    if(!actual.sesiones.length){
        lista.append(vacio("Ninguna sesión abierta."));
    }

    for(const sesion of actual.sesiones){
        const fila = crear("div", "ficha-usuario-fila");
        const texto = crear("div", "ficha-usuario-fila-texto");
        texto.append(
            crear("strong", "", `Último uso ${fechaLocal(sesion.fecha_ultimo_uso)}`),
            crear(
                "span",
                "ficha-usuario-detalle",
                [
                    `abierta ${fechaLocal(sesion.fecha_creacion)}`,
                    `caduca ${fechaLocal(sesion.fecha_expiracion)}`,
                    sesion.recordar ? "recordada" : null,
                    sesion.direccion_ip ? `IP ${sesion.direccion_ip}` : null
                ].filter(Boolean).join(" · ")
            )
        );
        fila.append(texto);
        lista.append(fila);
    }

    return bloque("Sesiones abiertas", lista);
}


function textoDetalle(detalle){

    if(!detalle){
        return null;
    }

    const partes = [];
    if(detalle.administracion){
        partes.push("desde Administración");
    }
    if(detalle.reenvio){
        partes.push("reenvío");
    }
    if(detalle.motivo){
        partes.push(String(detalle.motivo).toLowerCase());
    }
    if(detalle.sesiones !== undefined){
        partes.push(`${detalle.sesiones} sesiones`);
    }
    if(detalle.es_admin !== undefined){
        partes.push(detalle.es_admin ? "le da administrador" : "le quita administrador");
    }
    return partes.join(", ") || null;
}


function pintarSucesos(){

    const lista = crear("div", "ficha-usuario-lista ficha-usuario-registro");

    if(!actual.sucesos.length){
        lista.append(vacio("Sin sucesos."));
    }

    for(const suceso of actual.sucesos){
        const fila = crear("div", "ficha-usuario-fila");
        const texto = crear("div", "ficha-usuario-fila-texto");
        texto.append(
            crear("strong", "", SUCESOS[suceso.tipo] || suceso.tipo),
            crear(
                "span",
                "ficha-usuario-detalle",
                [
                    fechaLocal(suceso.fecha),
                    textoDetalle(suceso.detalle),
                    suceso.direccion_ip ? `IP ${suceso.direccion_ip}` : null
                ].filter(Boolean).join(" · ")
            )
        );
        fila.append(texto);
        lista.append(fila);
    }

    return bloque(`Registro de seguridad (últimos ${actual.sucesos.length})`, lista);
}


function pintarMiWeb(){

    const lista = crear("div", "ficha-usuario-lista");

    if(!actual.mi_web.length){
        lista.append(vacio("No ha creado ninguna pestaña."));
    }

    for(const pestana of actual.mi_web){
        const fila = crear("div", "ficha-usuario-fila");
        const texto = crear("div", "ficha-usuario-fila-texto");
        texto.append(
            crear("strong", "", pestana.nombre),
            crear(
                "span",
                "ficha-usuario-detalle",
                [
                    pestana.descripcion,
                    `móvil: ${pestana.dashboard_movil || "—"}`,
                    `PC: ${pestana.dashboard_pc || "—"}`
                ].join(" · ")
            )
        );
        fila.append(texto);
        lista.append(fila);
    }

    return bloque("Mi web", lista);
}


function pintarDashboards(){

    const lista = crear("div", "ficha-usuario-lista");

    if(!actual.dashboards.length){
        lista.append(vacio("No ha creado ningún dashboard."));
    }

    for(const dashboard of actual.dashboards){
        const fila = crear("div", "ficha-usuario-fila");
        const texto = crear("div", "ficha-usuario-fila-texto");
        texto.append(
            crear("strong", "", dashboard.titulo),
            crear(
                "span",
                "ficha-usuario-detalle",
                [
                    dashboard.descripcion,
                    dashboard.formato === "PC" ? "PC" : "móvil",
                    `cambiado ${fechaLocal(dashboard.fecha_actualizacion)}`
                ].filter(Boolean).join(" · ")
            )
        );
        fila.append(texto);
        lista.append(fila);
    }

    return bloque("Dashboards", lista);
}


function pintar(){

    document.getElementById("fichaUsuarioNombre").textContent = actual.usuario.nombre_visible;

    document.getElementById("cuerpoFichaUsuario").replaceChildren(
        pintarDatos(actual.usuario),
        pintarAcciones(actual.usuario),
        pintarSuscripciones(),
        pintarSesiones(),
        pintarSucesos(),
        pintarMiWeb(),
        pintarDashboards()
    );
}


/* ==========================================================
   ENTRADA
   ========================================================== */

/*
 * Abre la ficha de una cuenta. «cambiado(usuario, borrado)» avisa a la
 * lista para que se actualice: con la cuenta nueva, o con null y el
 * identificador si se ha borrado.
 */
export async function abrirFichaUsuario(identificador, cambiado){

    alCambiar = cambiado || (() => {});
    const ventana = preparar();

    document.getElementById("fichaUsuarioNombre").textContent = "Cargando…";
    document.getElementById("cuerpoFichaUsuario").replaceChildren();
    mostrarEstado(estadoFicha(), "Cargando…", "info");

    if(!ventana.open){
        ventana.showModal();
    }

    try{
        actual = {usuario: {identificador}};
        try{
            await cargarCatalogo();
        }catch(error){
            // Sin catálogo la ficha se ve igual; solo no se pueden añadir suscripciones.
            catalogo = null;
        }
        actual = await peticionJson(ruta());
        pintar();
        mostrarEstado(estadoFicha(), "");
    }catch(error){
        mostrarEstado(estadoFicha(), error.message || "No se ha podido cargar la ficha.", "error");
    }
}


export function cerrarFichaUsuario(){

    if(dialogo?.open){
        dialogo.close();
    }
    actual = null;
}


// Fin de fichero: js/administracion/ficha-usuario.js
