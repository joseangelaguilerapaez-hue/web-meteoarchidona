/*
 * MeteoArchidona
 * Cuenta de usuario: registrarse, iniciar y cerrar sesión
 *
 * Lo carga js/cabecera.js al montar la cabecera. Pinta en
 * #cuenta-zona los botones «Iniciar sesión» y «Registrarse» (o el
 * nombre de quien ha entrado y «Salir») y abre los formularios en una
 * ventana (<dialog>) sobre la página, sin crear páginas nuevas.
 *
 * Habla con /usuarios de la API (docs/usuarios.md de api-meteoarchidona):
 *
 *   POST   /usuarios/alta     registrarse (manda un correo de confirmación)
 *   POST   /usuarios/sesion   iniciar sesión (pone la cookie ma_sesion)
 *   DELETE /usuarios/sesion   cerrar sesión
 *   GET    /usuarios/yo       quién ha entrado (401 si nadie)
 *
 * La cookie es HttpOnly: este script nunca la ve. Solo sabe si hay
 * sesión preguntándoselo a la API.
 *
 * El enlace del correo lo atiende la API y devuelve al visitante a
 * la web con ?cuenta=activada o ?cuenta=enlace-no-valido; aquí se
 * muestra el aviso y se limpia la dirección.
 *
 * INTERRUPTOR: mientras CUENTAS_ABIERTAS sea false los botones no se
 * ven y no se hace ninguna petición. Para probarlo antes de abrirlo a
 * todos, entra en cualquier página con ?cuentas=ver (queda guardado en
 * ese navegador); con ?cuentas=ocultar se quita.
 */

(function () {

"use strict";


const CUENTAS_ABIERTAS = false;

const CLAVE_VISTA_PREVIA = "ma_cuentas_vista_previa";

const LONGITUD_MAXIMA_NOMBRE = 60;


/* ==========================================================
   INTERRUPTOR
   ========================================================== */


function leerVistaPrevia() {

    try {

        return window.localStorage.getItem(CLAVE_VISTA_PREVIA) === "1";

    } catch (error) {

        return false;

    }

}


function aplicarParametroVistaPrevia() {

    const parametros = new URLSearchParams(window.location.search);

    const orden = parametros.get("cuentas");

    if (orden !== "ver" && orden !== "ocultar") {

        return;

    }

    try {

        if (orden === "ver") {

            window.localStorage.setItem(CLAVE_VISTA_PREVIA, "1");

        } else {

            window.localStorage.removeItem(CLAVE_VISTA_PREVIA);

        }

    } catch (error) {

        // Sin almacenamiento no hay vista previa: no pasa nada.

    }

    parametros.delete("cuentas");

    limpiarDireccion(parametros);

}


function cuentasVisibles() {

    return CUENTAS_ABIERTAS || leerVistaPrevia();

}


function limpiarDireccion(parametros) {

    const consulta = parametros.toString();

    const nueva =
        window.location.pathname
        + (consulta ? `?${consulta}` : "")
        + window.location.hash;

    window.history.replaceState(null, "", nueva);

}


/* ==========================================================
   LLAMADAS A LA API
   ========================================================== */


function direccionApi(ruta) {

    return `${window.API_BASE || "/api"}/usuarios${ruta}`;

}


async function llamar(metodo, ruta, cuerpo) {

    const opciones = {
        method: metodo,
        credentials: "same-origin",
        headers: {},
    };

    if (cuerpo !== undefined) {

        opciones.headers["Content-Type"] = "application/json";

        opciones.body = JSON.stringify(cuerpo);

    }

    let respuesta;

    try {

        respuesta = await fetch(direccionApi(ruta), opciones);

    } catch (error) {

        throw new Error("No hay conexión con MeteoArchidona. Inténtalo de nuevo.");

    }

    if (respuesta.status === 204) {

        return null;

    }

    let datos = null;

    try {

        datos = await respuesta.json();

    } catch (error) {

        datos = null;

    }

    if (!respuesta.ok) {

        throw new ErrorCuenta(
            mensajeDeError(respuesta.status, datos),
            respuesta.status
        );

    }

    return datos;

}


class ErrorCuenta extends Error {

    constructor(mensaje, estado) {

        super(mensaje);

        this.estado = estado;

    }

}


function mensajeDeError(estado, datos) {

    const detalle = datos && datos.detail;

    // Los errores nuestros traen el texto ya redactado para la persona.
    if (typeof detalle === "string" && detalle) {

        return detalle;

    }

    // Los de validación de FastAPI traen una lista: no es para leer.
    if (estado === 422) {

        return "Revisa los datos: alguno no es válido.";

    }

    if (estado === 429) {

        return "Demasiados intentos. Espera unos minutos.";

    }

    return "No se ha podido completar la operación. Inténtalo más tarde.";

}


/* ==========================================================
   ESTADO Y BOTONES DE LA CABECERA
   ========================================================== */


let usuario = null;


function crear(etiqueta, atributos, texto) {

    const nodo = document.createElement(etiqueta);

    for (const [nombre, valor] of Object.entries(atributos || {})) {

        if (valor === true) {

            nodo.setAttribute(nombre, "");

        } else if (valor !== false && valor !== null && valor !== undefined) {

            nodo.setAttribute(nombre, valor);

        }

    }

    if (texto !== undefined) {

        nodo.textContent = texto;

    }

    return nodo;

}


function pintarZona() {

    const zona = document.getElementById("cuenta-zona");

    if (!zona) {

        return;

    }

    zona.replaceChildren();

    if (usuario) {

        zona.appendChild(
            crear("span", { class: "cuenta-nombre", title: usuario.correo }, usuario.nombre_visible)
        );

        const salir = crear(
            "button",
            { type: "button", class: "cuenta-boton", "data-cuenta-accion": "salir" },
            "Salir"
        );

        zona.appendChild(salir);

    } else {

        zona.appendChild(
            crear(
                "button",
                { type: "button", class: "cuenta-boton", "data-cuenta-accion": "entrar" },
                "Iniciar sesión"
            )
        );

        zona.appendChild(
            crear(
                "button",
                { type: "button", class: "cuenta-boton cuenta-boton-principal", "data-cuenta-accion": "registrar" },
                "Registrarse"
            )
        );

    }

    zona.hidden = false;

}


async function averiguarUsuario() {

    try {

        usuario = await llamar("GET", "/yo");

    } catch (error) {

        // 401: nadie ha entrado. Cualquier otro fallo, lo mismo: la web
        // sigue siendo pública y no se molesta con errores de cuenta.
        usuario = null;

    }

    pintarZona();

}


/* ==========================================================
   VENTANA
   ========================================================== */


let ventana = null;


function abrirVentana(titulo, contenido) {

    if (!ventana) {

        ventana = crear("dialog", { class: "cuenta-ventana", "aria-labelledby": "cuenta-titulo" });

        ventana.addEventListener("click", (evento) => {

            // Un clic en el fondo oscuro (el propio <dialog>) la cierra.
            if (evento.target === ventana) {

                ventana.close();

            }

        });

        document.body.appendChild(ventana);

    }

    const cabecera = crear("header", { class: "cuenta-ventana-cabecera" });

    cabecera.appendChild(crear("h2", { id: "cuenta-titulo" }, titulo));

    const cerrar = crear(
        "button",
        { type: "button", class: "cuenta-cerrar", "aria-label": "Cerrar" },
        "×"
    );

    cerrar.addEventListener("click", () => ventana.close());

    cabecera.appendChild(cerrar);

    ventana.replaceChildren(cabecera, contenido);

    if (!ventana.open) {

        ventana.showModal();

    }

    const primero = ventana.querySelector("input, button.cuenta-enviar");

    if (primero) {

        primero.focus();

    }

}


function cerrarVentana() {

    if (ventana && ventana.open) {

        ventana.close();

    }

}


/* ==========================================================
   FORMULARIOS
   ========================================================== */


function campo(etiqueta, atributos, ayuda) {

    const bloque = crear("label", { class: "cuenta-campo" });

    bloque.appendChild(crear("span", { class: "cuenta-etiqueta" }, etiqueta));

    bloque.appendChild(crear("input", atributos));

    if (ayuda) {

        bloque.appendChild(crear("span", { class: "cuenta-ayuda" }, ayuda));

    }

    return bloque;

}


function casilla(texto, atributos) {

    const bloque = crear("label", { class: "cuenta-casilla" });

    bloque.appendChild(crear("input", { type: "checkbox", ...atributos }));

    bloque.appendChild(crear("span", {}, texto));

    return bloque;

}


function atributosPin(nuevo) {

    return {
        type: "password",
        inputmode: "numeric",
        pattern: "[0-9]{6}",
        minlength: "6",
        maxlength: "6",
        autocomplete: nuevo ? "new-password" : "current-password",
        required: true,
    };

}


function construirFormulario(alEnviar) {

    const formulario = crear("form", { class: "cuenta-formulario", novalidate: true });

    const mensaje = crear("p", { class: "cuenta-mensaje", role: "alert", hidden: true });

    formulario.mostrarMensaje = (texto) => {

        mensaje.textContent = texto;

        mensaje.hidden = !texto;

    };

    formulario.addEventListener("submit", async (evento) => {

        evento.preventDefault();

        formulario.mostrarMensaje("");

        if (!formulario.checkValidity()) {

            formulario.reportValidity();

            return;

        }

        const boton = formulario.querySelector(".cuenta-enviar");

        boton.disabled = true;

        try {

            await alEnviar(new FormData(formulario), formulario);

        } catch (error) {

            formulario.mostrarMensaje(error.message);

        } finally {

            boton.disabled = false;

        }

    });

    /*
     * El mensaje de error va justo encima del botón, no arriba del
     * todo: en el móvil, con el teclado abierto, lo de arriba queda
     * fuera de la vista.
     */
    formulario.agregarPie = (textoBoton, ...despues) => {

        formulario.append(
            mensaje,
            crear("button", { type: "submit", class: "cuenta-enviar" }, textoBoton),
            ...despues
        );

    };

    return formulario;

}


function abrirRegistro() {

    const formulario = construirFormulario(async (datos, este) => {

        const pin = datos.get("pin");

        if (pin !== datos.get("pin2")) {

            este.mostrarMensaje("Los dos PIN no coinciden.");

            return;

        }

        const respuesta = await llamar("POST", "/alta", {
            nombre_visible: datos.get("nombre").trim(),
            correo: datos.get("correo").trim(),
            pin,
            confirma_edad: datos.get("edad") === "on",
        });

        mostrarResultado(
            "Revisa tu correo",
            (respuesta && respuesta.mensaje)
                || "Te hemos enviado un correo para confirmar tu cuenta."
        );

    });

    formulario.append(
        campo("Nombre que se verá", {
            name: "nombre",
            type: "text",
            maxlength: String(LONGITUD_MAXIMA_NOMBRE),
            autocomplete: "nickname",
            required: true,
        }),
        campo("Correo electrónico", {
            name: "correo",
            type: "email",
            autocomplete: "email",
            maxlength: "320",
            required: true,
        }),
        campo(
            "PIN de 6 cifras",
            { name: "pin", ...atributosPin(true) },
            "Evita fechas, series (123456) y repeticiones: se rechazan."
        ),
        campo("Repite el PIN", { name: "pin2", ...atributosPin(true) }),
        casilla("Tengo 14 años o más.", { name: "edad", required: true })
    );

    const nota = crear("p", { class: "cuenta-nota" });

    nota.append(
        "Tu correo y tu PIN solo sirven para tu cuenta. Más en el ",
        crear("button", { type: "button", class: "cuenta-enlace", "data-privacidad": true }, "aviso de privacidad"),
        "."
    );

    formulario.agregarPie("Crear cuenta", nota);

    abrirVentana("Registrarse", formulario);

}


function abrirEntrada() {

    const formulario = construirFormulario(async (datos) => {

        usuario = await llamar("POST", "/sesion", {
            correo: datos.get("correo").trim(),
            pin: datos.get("pin"),
            recordar: datos.get("recordar") === "on",
        });

        pintarZona();

        cerrarVentana();

    });

    formulario.append(
        campo("Correo electrónico", {
            name: "correo",
            type: "email",
            autocomplete: "email",
            maxlength: "320",
            required: true,
        }),
        campo("PIN", { name: "pin", ...atributosPin(false) }),
        casilla("Recordarme en este dispositivo (30 días).", { name: "recordar" })
    );

    const cambio = crear("p", { class: "cuenta-nota" });

    cambio.append(
        "¿Todavía no tienes cuenta? ",
        crear("button", { type: "button", class: "cuenta-enlace", "data-cuenta-accion": "registrar" }, "Regístrate")
    );

    formulario.agregarPie("Entrar", cambio);

    abrirVentana("Iniciar sesión", formulario);

}


function mostrarResultado(titulo, texto) {

    const contenido = crear("div", { class: "cuenta-resultado" });

    contenido.appendChild(crear("p", {}, texto));

    const cerrar = crear("button", { type: "button", class: "cuenta-enviar" }, "Entendido");

    cerrar.addEventListener("click", cerrarVentana);

    contenido.appendChild(cerrar);

    abrirVentana(titulo, contenido);

}


async function salir() {

    try {

        await llamar("DELETE", "/sesion");

    } catch (error) {

        // Aunque falle la llamada, en esta pantalla se deja de mostrar
        // la sesión; la API la caducará sola.

    }

    usuario = null;

    pintarZona();

}


/* ==========================================================
   AVISOS DEL ENLACE DEL CORREO
   ========================================================== */


function atenderAvisoDeCuenta() {

    const parametros = new URLSearchParams(window.location.search);

    const aviso = parametros.get("cuenta");

    if (!aviso) {

        return;

    }

    parametros.delete("cuenta");

    limpiarDireccion(parametros);

    if (aviso === "activada") {

        mostrarResultado(
            "Cuenta activada",
            "Tu cuenta ya está activa. Entra con tu correo y tu PIN."
        );

    } else if (aviso === "enlace-no-valido") {

        mostrarResultado(
            "Enlace no válido",
            "El enlace no es válido o ha caducado. Regístrate otra vez para recibir uno nuevo."
        );

    }

}


/* ==========================================================
   ARRANQUE
   ========================================================== */


function alPulsar(evento) {

    const boton = evento.target.closest("[data-cuenta-accion]");

    if (!boton) {

        return;

    }

    const accion = boton.dataset.cuentaAccion;

    if (accion === "entrar") {

        abrirEntrada();

    } else if (accion === "registrar") {

        abrirRegistro();

    } else if (accion === "salir") {

        salir();

    }

}


function arrancar() {

    aplicarParametroVistaPrevia();

    if (!cuentasVisibles()) {

        return;

    }

    document.addEventListener("click", alPulsar);

    averiguarUsuario();

    atenderAvisoDeCuenta();

}


arrancar();

})();


// Fin de fichero: js/cuenta.js
