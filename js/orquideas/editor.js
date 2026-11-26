/*
 * MeteoArchidona · Orquídeas · editor de orquídeas
 *
 * Decisión de José del 26-11-2026 (con Damián Quintana): una cuenta con el
 * permiso «editor de orquídeas» (o un administrador) añade y corrige desde
 * la propia página las Jornadas, las fotos del concurso, las publicaciones
 * y los textos de las fichas, con su sesión y sin PIN.
 *
 * Este módulo sabe si quien mira es editor (aviso «meteoarchidona:cuenta»
 * de js/cuenta.js, con editaOrquideas), manda los cambios a la API
 * (/orquideas/editor/...) y pinta los formularios en un <dialog>.
 *
 * Las fotos se reducen en el navegador (2.000 px de lado mayor, JPEG) antes
 * de subirlas: menos datos en el móvil y por debajo del límite de Nginx.
 */

import {crear} from "./comun.js?v=20261126-jornadas1";

const EVENTO = "orquideas:editor";

const LADO_FOTO = 2000;

let editor = false;


export function esEditor() {
    return editor;
}


/* Avisa cuando se sabe (o cambia) si quien mira es editor. */
export function alCambiarEditor(funcion) {
    document.addEventListener(EVENTO, () => funcion(editor));
}


export function vigilarCuenta() {
    document.addEventListener("meteoarchidona:cuenta", evento => {
        const nuevo = Boolean(evento.detail?.editaOrquideas);
        if (nuevo === editor) return;
        editor = nuevo;
        document.body.classList.toggle("orquideas-modo-editor", editor);
        document.dispatchEvent(new CustomEvent(EVENTO));
    });
}


/* ------------------------------------------------------------
   Peticiones que cambian algo
   ------------------------------------------------------------ */

function base() {
    return window.API_BASE || "/api";
}

export async function enviar(metodo, ruta, cuerpo) {
    const opciones = { method: metodo, credentials: "same-origin", cache: "no-store", headers: {} };
    if (cuerpo instanceof FormData) {
        opciones.body = cuerpo;
    } else if (cuerpo !== undefined) {
        opciones.headers["Content-Type"] = "application/json";
        opciones.body = JSON.stringify(cuerpo);
    }

    const respuesta = await fetch(`${base()}${ruta}`, opciones);
    if (respuesta.status === 204) return null;

    let datos = null;
    try {
        datos = await respuesta.json();
    } catch {
        datos = null;
    }

    if (!respuesta.ok) {
        const error = new Error(mensajeDeError(respuesta.status, datos));
        error.estado = respuesta.status;
        throw error;
    }
    return datos;
}

function mensajeDeError(estado, datos) {
    const detalle = datos?.detail;
    if (typeof detalle === "string") return detalle;
    if (Array.isArray(detalle) && detalle.length) {
        return detalle.map(fallo => String(fallo.msg || "").replace(/^Value error, /, "")).join(" ");
    }
    if (estado === 413) return "El fichero es demasiado grande.";
    if (estado === 401) return "Tu sesión ha caducado: vuelve a entrar.";
    if (estado === 403) return "No tienes permiso de editor de orquídeas.";
    return "No se ha podido guardar. Prueba otra vez dentro de un rato.";
}


/* ------------------------------------------------------------
   Fotos: reducir antes de subir
   ------------------------------------------------------------ */

export async function reducirFoto(fichero) {
    if (!window.createImageBitmap) return fichero;
    let imagen;
    try {
        imagen = await createImageBitmap(fichero, { imageOrientation: "from-image" });
    } catch {
        return fichero;
    }
    const escala = Math.min(1, LADO_FOTO / Math.max(imagen.width, imagen.height));
    if (escala === 1 && fichero.size < 900 * 1024) {
        imagen.close?.();
        return fichero;
    }
    const lienzo = document.createElement("canvas");
    lienzo.width = Math.round(imagen.width * escala);
    lienzo.height = Math.round(imagen.height * escala);
    lienzo.getContext("2d").drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
    imagen.close?.();
    const blob = await new Promise(resolver => lienzo.toBlob(resolver, "image/jpeg", 0.9));
    return blob || fichero;
}


/* ------------------------------------------------------------
   Botones y formularios
   ------------------------------------------------------------ */

export function botonEditor(texto, alPulsar, clase = "") {
    const boton = crear("button", `orq-editor-boton ${clase}`.trim(), texto);
    boton.type = "button";
    boton.addEventListener("click", alPulsar);
    return boton;
}


function campoFormulario(campo, valor) {
    const caja = crear("label", `orq-editor-campo orq-editor-campo-${campo.tipo || "text"}`);

    let control;
    if (campo.tipo === "textarea") {
        control = document.createElement("textarea");
        control.rows = campo.filas || 4;
        control.value = valor ?? "";
    } else if (campo.tipo === "checkbox") {
        control = document.createElement("input");
        control.type = "checkbox";
        control.checked = Boolean(valor);
    } else if (campo.tipo === "select") {
        control = document.createElement("select");
        for (const opcion of campo.opciones || []) {
            const nodo = document.createElement("option");
            nodo.value = opcion.valor;
            nodo.textContent = opcion.texto;
            control.appendChild(nodo);
        }
        control.value = valor === null || valor === undefined ? "" : String(valor);
    } else {
        control = document.createElement("input");
        control.type = campo.tipo || "text";
        if (campo.tipo === "file") {
            control.accept = campo.acepta || "";
        } else {
            control.value = valor ?? "";
        }
        if (campo.min !== undefined) control.min = campo.min;
        if (campo.max !== undefined) control.max = campo.max;
    }
    control.name = campo.nombre;
    if (campo.requerido) control.required = true;
    if (campo.maximo) control.maxLength = campo.maximo;

    if (campo.tipo === "checkbox") {
        caja.append(control, crear("span", "orq-editor-etiqueta", campo.etiqueta));
    } else {
        caja.append(crear("span", "orq-editor-etiqueta", campo.etiqueta), control);
    }
    if (campo.ayuda) caja.appendChild(crear("span", "orq-editor-ayuda", campo.ayuda));
    return caja;
}


function leerCampo(formulario, campo) {
    const control = formulario.elements[campo.nombre];
    if (campo.tipo === "checkbox") return control.checked;
    if (campo.tipo === "file") return control.files?.[0] || null;
    const texto = control.value.trim();
    if (campo.tipo === "number") return texto === "" ? null : Number(texto);
    if (campo.tipo === "select" && campo.numerico) return texto === "" ? null : Number(texto);
    if (campo.tipo === "date") return texto || null;
    return texto === "" ? null : texto;
}


/*
 * Formulario en un <dialog>. `guardar(valores)` hace la petición; si falla,
 * se enseña el error y el formulario sigue abierto. Devuelve lo que
 * devuelva `guardar`, o null si se cancela.
 */
export function formulario({ titulo, explicacion, campos, valores = {}, textoGuardar = "Guardar", guardar, peligro }) {
    return new Promise(resolver => {
        const ventana = crear("dialog", "orq-editor-dialogo");
        const forma = crear("form", "orq-editor-formulario");
        forma.method = "dialog";
        forma.noValidate = false;

        forma.appendChild(crear("h3", "orq-editor-titulo", titulo));
        if (explicacion) forma.appendChild(crear("p", "orq-editor-explicacion", explicacion));
        for (const campo of campos) forma.appendChild(campoFormulario(campo, valores[campo.nombre]));

        const error = crear("p", "orq-editor-error");
        error.hidden = true;
        error.setAttribute("role", "alert");
        forma.appendChild(error);

        const botones = crear("div", "orq-editor-botones");
        if (peligro) {
            const borrar = crear("button", "orq-editor-boton orq-editor-peligro", peligro.texto);
            borrar.type = "button";
            borrar.addEventListener("click", async () => {
                if (!window.confirm(peligro.confirmar)) return;
                try {
                    await peligro.accion();
                    cerrar({ borrado: true });
                } catch (fallo) {
                    error.textContent = fallo.message;
                    error.hidden = false;
                }
            });
            botones.appendChild(borrar);
        }
        const cancelar = crear("button", "orq-editor-boton orq-editor-secundario", "Cancelar");
        cancelar.type = "button";
        cancelar.addEventListener("click", () => cerrar(null));
        const aceptar = crear("button", "orq-editor-boton orq-editor-principal", textoGuardar);
        aceptar.type = "submit";
        botones.append(cancelar, aceptar);
        forma.appendChild(botones);

        forma.addEventListener("submit", async evento => {
            evento.preventDefault();
            if (!forma.reportValidity()) return;
            const leidos = {};
            for (const campo of campos) leidos[campo.nombre] = leerCampo(forma, campo);
            aceptar.disabled = true;
            aceptar.textContent = "Guardando…";
            error.hidden = true;
            try {
                cerrar(await guardar(leidos));
            } catch (fallo) {
                error.textContent = fallo.message;
                error.hidden = false;
                aceptar.disabled = false;
                aceptar.textContent = textoGuardar;
            }
        });

        ventana.addEventListener("cancel", evento => {
            evento.preventDefault();
            cerrar(null);
        });

        function cerrar(resultado) {
            ventana.close();
            ventana.remove();
            resolver(resultado);
        }

        ventana.appendChild(forma);
        document.body.appendChild(ventana);
        ventana.showModal();
        forma.querySelector("input:not([type=checkbox]),textarea,select")?.focus();
    });
}


/* Ventana solo para mirar (lista de inscritos, foto en grande). */
export function ventanaLectura(titulo, contenido) {
    const ventana = crear("dialog", "orq-editor-dialogo orq-dialogo-lectura");
    const cabeza = crear("div", "orq-dialogo-cabeza");
    cabeza.appendChild(crear("h3", "orq-editor-titulo", titulo));
    const cerrar = crear("button", "orq-dialogo-cerrar", "×");
    cerrar.type = "button";
    cerrar.setAttribute("aria-label", "Cerrar");
    cerrar.addEventListener("click", () => ventana.close());
    cabeza.appendChild(cerrar);
    ventana.append(cabeza, contenido);
    ventana.addEventListener("close", () => ventana.remove());
    ventana.addEventListener("click", evento => {
        if (evento.target === ventana) ventana.close();
    });
    document.body.appendChild(ventana);
    ventana.showModal();
    return ventana;
}


/* Fin de fichero: js/orquideas/editor.js */
