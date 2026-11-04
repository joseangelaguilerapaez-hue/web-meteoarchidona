/*
 * MeteoArchidona
 * Página «Mi cuenta» (pages/mi-cuenta.html).
 *
 * Diseño: docs/usuarios.md de api-meteoarchidona, 8.5 y 8.6 (José,
 * 4-11-2026). Tres pestañas:
 *
 *   Mis datos        GET /usuarios/yo. Cambiar el PIN, cerrar sesión y
 *                    borrar la cuenta usan las ventanas de js/cuenta.js
 *                    (botones con data-cuenta-accion).
 *   Suscripciones    GET  /usuarios/suscripciones/catalogo
 *                    GET  /usuarios/suscripciones
 *                    POST /usuarios/suscripciones
 *                    PATCH y DELETE /usuarios/suscripciones/{id}
 *   Preferencias     GET    /configuracion/usuario
 *                    PATCH  /configuracion/usuario/{codigo}
 *                    DELETE /configuracion/usuario/{codigo}
 *
 * La sesión va en la cookie HttpOnly: aquí solo se pregunta a la API.
 * Al entrar o salir, js/cuenta.js avisa con «meteoarchidona:cuenta» y
 * la página se vuelve a pintar.
 */

const ZONA = "Europe/Madrid";

const PESTANAS = ["datos", "suscripciones", "preferencias"];

const CLAVE_PESTANA = "meteoarchidona_mi_cuenta_pestana";

const euros = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
});

let usuario = null;
let catalogo = {servicios: [], localidades: []};
let suscripciones = [];
let preferencias = [];
let cargando = null;


/* ==========================================================
   UTILIDADES
   ========================================================== */

function $(id){

    return document.getElementById(id);
}


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


function direccion(ruta){

    return `${window.API_BASE || "/api"}${ruta}`;
}


async function llamar(metodo, ruta, cuerpo){

    const opciones = {
        method: metodo,
        credentials: "same-origin",
        cache: "no-store",
        headers: {}
    };

    if(cuerpo !== undefined){
        opciones.headers["Content-Type"] = "application/json";
        opciones.body = JSON.stringify(cuerpo);
    }

    const respuesta = await fetch(direccion(ruta), opciones);

    if(respuesta.status === 204){
        return null;
    }

    let datos = null;

    try{
        datos = await respuesta.json();
    }catch{
        datos = null;
    }

    if(!respuesta.ok){

        let mensaje = "No se ha podido completar. Inténtalo de nuevo.";

        if(typeof datos?.detail === "string"){
            mensaje = datos.detail;
        }else if(respuesta.status === 401){
            mensaje = "Tu sesión ha terminado. Vuelve a iniciar sesión.";
        }

        const error = new Error(mensaje);
        error.codigoHttp = respuesta.status;
        throw error;
    }

    return datos;
}


function fecha(valor){

    if(!valor){
        return "—";
    }

    return new Date(valor).toLocaleDateString("es-ES", {
        timeZone: ZONA,
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}


/* Precio en euros: 0 se enseña como «Gratis · 0,00 €» (José, 4-11-2026). */
function precio(valor){

    const numero = Number(valor) || 0;

    return numero === 0
        ? `Gratis · ${euros.format(0)}`
        : euros.format(numero);
}


function mostrarEstado(elemento, mensaje, tipo){

    if(!elemento){
        return;
    }

    elemento.textContent = mensaje || "";
    elemento.dataset.tipo = tipo || "";
}


/* ==========================================================
   PESTAÑAS
   ========================================================== */

function leerPestana(){

    const desdeDireccion = window.location.hash.replace("#", "");

    if(PESTANAS.includes(desdeDireccion)){
        return desdeDireccion;
    }

    try{
        const guardada = sessionStorage.getItem(CLAVE_PESTANA);
        if(PESTANAS.includes(guardada)){
            return guardada;
        }
    }catch{
    }

    return "datos";
}


function activarPestana(nombre){

    if(!PESTANAS.includes(nombre)){
        nombre = "datos";
    }

    document.querySelectorAll(".mi-cuenta-pestana").forEach(boton => {
        const activa = boton.dataset.pestana === nombre;
        boton.classList.toggle("activa", activa);
        boton.setAttribute("aria-selected", activa ? "true" : "false");
    });

    for(const pestana of PESTANAS){
        const panel = $(`pestana-${pestana}`);
        if(panel){
            panel.hidden = pestana !== nombre;
        }
    }

    try{
        sessionStorage.setItem(CLAVE_PESTANA, nombre);
    }catch{
    }

    const deseado = `#${nombre}`;
    if(window.location.hash !== deseado){
        history.replaceState(null, "", `${window.location.pathname}${window.location.search}${deseado}`);
    }
}


/* ==========================================================
   MIS DATOS
   ========================================================== */

function pintarDatos(){

    $("datoNombre").textContent = usuario.nombre_visible;
    $("datoCorreo").textContent = usuario.correo;
    $("datoAlta").textContent = fecha(usuario.fecha_creacion);
    $("datoAdministrador").hidden = !usuario.es_administrador;
    $("tituloMiCuenta").textContent = `Hola, ${usuario.nombre_visible}`;
}


/* ==========================================================
   SUSCRIPCIONES
   ========================================================== */

function servicioElegido(){

    const codigo = $("campoServicio")?.value;

    return catalogo.servicios.find(s => s.codigo === codigo) || null;
}


function actualizarFormulario(){

    const servicio = servicioElegido();
    const bloque = $("bloqueLocalidad");

    if(bloque){
        bloque.hidden = !servicio?.con_localidad;
    }

    $("descripcionServicio").textContent = servicio
        ? `${servicio.descripcion || ""} ${precio(servicio.precio)}.`.trim()
        : "";
}


function pintarFormulario(){

    const servicios = $("campoServicio");
    const localidades = $("campoLocalidad");

    if(!servicios || !localidades){
        return;
    }

    const anteriorServicio = servicios.value;
    const anteriorLocalidad = localidades.value;

    servicios.replaceChildren(
        ...catalogo.servicios.map(s => new Option(`${s.nombre} · ${precio(s.precio)}`, s.codigo))
    );

    localidades.replaceChildren(
        ...catalogo.localidades.map(l => new Option(l.nombre, l.codigo))
    );

    if(anteriorServicio){
        servicios.value = anteriorServicio;
    }

    // Por defecto, Archidona.
    localidades.value = anteriorLocalidad || "29017";

    actualizarFormulario();
}


function fichaSuscripcion(suscripcion){

    const ficha = crear("article", "mi-cuenta-ficha");
    ficha.classList.toggle("pausada", !suscripcion.activa);

    const cabecera = crear("div", "mi-cuenta-ficha-cabecera");

    const titulo = crear("h3", "", suscripcion.servicio.nombre);
    cabecera.append(titulo);

    const etiquetas = crear("div", "mi-cuenta-etiquetas");
    etiquetas.append(crear("span", "mi-cuenta-precio", precio(suscripcion.precio)));
    etiquetas.append(
        crear(
            "span",
            suscripcion.activa ? "mi-cuenta-etiqueta-estado activa" : "mi-cuenta-etiqueta-estado",
            suscripcion.activa ? "Activa" : "En pausa"
        )
    );
    if(!suscripcion.servicio_disponible){
        etiquetas.append(crear("span", "mi-cuenta-etiqueta-estado retirada", "Ya no disponible"));
    }
    cabecera.append(etiquetas);
    ficha.append(cabecera);

    if(suscripcion.localidad){
        ficha.append(crear("p", "mi-cuenta-localidad", suscripcion.localidad.nombre));
    }

    ficha.append(crear("p", "mi-cuenta-nota", `Desde el ${fecha(suscripcion.fecha_creacion)}`));

    const acciones = crear("div", "mi-cuenta-acciones");

    const pausar = crear(
        "button",
        "mi-cuenta-boton",
        suscripcion.activa ? "Pausar" : "Reanudar"
    );
    pausar.type = "button";
    pausar.disabled = !suscripcion.activa && !suscripcion.servicio_disponible;

    const borrar = crear("button", "mi-cuenta-boton mi-cuenta-boton-peligro", "Borrar");
    borrar.type = "button";

    const estado = crear("div", "mi-cuenta-estado");
    estado.setAttribute("role", "status");

    pausar.addEventListener("click", async () => {
        pausar.disabled = true;
        borrar.disabled = true;
        try{
            const actualizada = await llamar(
                "PATCH",
                `/usuarios/suscripciones/${encodeURIComponent(suscripcion.identificador)}`,
                {activa: !suscripcion.activa}
            );
            suscripciones = suscripciones.map(s =>
                s.identificador === actualizada.identificador ? actualizada : s
            );
            pintarSuscripciones();
        }catch(error){
            mostrarEstado(estado, error.message, "error");
            pausar.disabled = false;
            borrar.disabled = false;
        }
    });

    borrar.addEventListener("click", async () => {
        const nombre = suscripcion.localidad
            ? `${suscripcion.servicio.nombre} de ${suscripcion.localidad.nombre}`
            : suscripcion.servicio.nombre;

        if(!window.confirm(`¿Borrar la suscripción «${nombre}»?`)){
            return;
        }

        pausar.disabled = true;
        borrar.disabled = true;
        try{
            await llamar(
                "DELETE",
                `/usuarios/suscripciones/${encodeURIComponent(suscripcion.identificador)}`
            );
            suscripciones = suscripciones.filter(s => s.identificador !== suscripcion.identificador);
            pintarSuscripciones();
        }catch(error){
            mostrarEstado(estado, error.message, "error");
            pausar.disabled = false;
            borrar.disabled = false;
        }
    });

    acciones.append(pausar, borrar);
    ficha.append(acciones, estado);

    return ficha;
}


function pintarSuscripciones(){

    const lista = $("listaSuscripciones");

    if(!lista){
        return;
    }

    if(!suscripciones.length){
        lista.replaceChildren(
            crear("p", "mi-cuenta-vacio", "Todavía no tienes ninguna suscripción.")
        );
        return;
    }

    lista.replaceChildren(...suscripciones.map(fichaSuscripcion));
}


async function suscribirse(evento){

    evento.preventDefault();

    const estado = $("estadoSuscripcion");
    const servicio = servicioElegido();

    if(!servicio){
        mostrarEstado(estado, "Elige un servicio.", "error");
        return;
    }

    const cuerpo = {servicio: servicio.codigo};

    if(servicio.con_localidad){
        cuerpo.localidad = $("campoLocalidad").value;
    }

    const boton = evento.target.querySelector("[type=submit]");
    boton.disabled = true;
    mostrarEstado(estado, "Guardando…", "info");

    try{
        const nueva = await llamar("POST", "/usuarios/suscripciones", cuerpo);
        suscripciones = [...suscripciones, nueva];
        pintarSuscripciones();
        mostrarEstado(
            estado,
            nueva.localidad
                ? `Suscrito a ${nueva.servicio.nombre} de ${nueva.localidad.nombre}.`
                : `Suscrito a ${nueva.servicio.nombre}.`,
            "ok"
        );
    }catch(error){
        mostrarEstado(estado, error.message, "error");
    }finally{
        boton.disabled = false;
    }
}


/* ==========================================================
   PREFERENCIAS DE LA WEB
   ========================================================== */

function controlDeValor(parametro, valor){

    const campo = crear("label", "mi-cuenta-campo");
    campo.append(crear("span", "", valor.etiqueta));

    let control;

    if(valor.tipo === "OPCION"){

        control = document.createElement("select");

        if(!valor.obligatorio){
            control.append(new Option("—", ""));
        }

        for(const opcion of valor.opciones || []){
            control.append(new Option(opcion.nombre, opcion.codigo));
        }

    }else{

        control = document.createElement("input");
        control.type = valor.tipo === "NUMERO" ? "number" : valor.tipo === "COLOR" ? "color" : "text";

        if(valor.minimo !== null && valor.minimo !== undefined){
            control.min = String(valor.minimo);
        }
        if(valor.maximo !== null && valor.maximo !== undefined){
            control.max = String(valor.maximo);
        }
        if(valor.largo_maximo){
            control.maxLength = valor.largo_maximo;
        }
    }

    control.value = valor.valor ?? "";
    control.dataset.numero = String(valor.numero);
    campo.append(control);

    return campo;
}


function fichaPreferencia(parametro){

    const ficha = crear("form", "mi-cuenta-ficha");
    ficha.noValidate = true;

    const cabecera = crear("div", "mi-cuenta-ficha-cabecera");
    cabecera.append(crear("h3", "", parametro.nombre));
    cabecera.append(
        crear(
            "span",
            parametro.personalizado ? "mi-cuenta-etiqueta-estado activa" : "mi-cuenta-etiqueta-estado",
            parametro.personalizado ? "Elegido por ti" : "Por defecto"
        )
    );
    ficha.append(cabecera);

    if(parametro.descripcion){
        ficha.append(crear("p", "mi-cuenta-nota", parametro.descripcion));
    }

    const campos = crear("div", "mi-cuenta-campos");
    for(const valor of parametro.valores){
        campos.append(controlDeValor(parametro, valor));
    }
    ficha.append(campos);

    const acciones = crear("div", "mi-cuenta-acciones");
    const guardar = crear("button", "mi-cuenta-boton mi-cuenta-boton-principal", "Guardar");
    guardar.type = "submit";
    acciones.append(guardar);

    if(parametro.personalizado){
        const defecto = crear("button", "mi-cuenta-boton", "Volver a lo de por defecto");
        defecto.type = "button";
        defecto.addEventListener("click", () => void restablecer(parametro, ficha));
        acciones.append(defecto);
    }

    const estado = crear("div", "mi-cuenta-estado");
    estado.setAttribute("role", "status");
    ficha.append(acciones, estado);

    ficha.addEventListener("submit", async evento => {
        evento.preventDefault();

        const valores = {};
        ficha.querySelectorAll("[data-numero]").forEach(control => {
            valores[control.dataset.numero] = control.value === "" ? null : control.value;
        });

        guardar.disabled = true;
        mostrarEstado(estado, "Guardando…", "info");

        try{
            const actualizado = await llamar(
                "PATCH",
                `/configuracion/usuario/${encodeURIComponent(parametro.codigo)}`,
                {activo: true, valores}
            );
            sustituirPreferencia(actualizado);
        }catch(error){
            mostrarEstado(estado, error.message, "error");
            guardar.disabled = false;
        }
    });

    return ficha;
}


async function restablecer(parametro, ficha){

    const estado = ficha.querySelector(".mi-cuenta-estado");

    try{
        const actualizado = await llamar(
            "DELETE",
            `/configuracion/usuario/${encodeURIComponent(parametro.codigo)}`
        );
        sustituirPreferencia(actualizado);
    }catch(error){
        mostrarEstado(estado, error.message, "error");
    }
}


function sustituirPreferencia(actualizado){

    preferencias = preferencias.map(p => p.codigo === actualizado.codigo ? actualizado : p);
    pintarPreferencias();
}


function pintarPreferencias(){

    const lista = $("listaPreferencias");

    if(!lista){
        return;
    }

    if(!preferencias.length){
        lista.replaceChildren(
            crear("p", "mi-cuenta-vacio", "Todavía no hay nada que puedas personalizar.")
        );
        return;
    }

    lista.replaceChildren(...preferencias.map(fichaPreferencia));
}


/* ==========================================================
   CARGA
   ========================================================== */

function mostrarSinSesion(){

    usuario = null;
    $("miCuentaContenido").hidden = true;
    $("miCuentaSinSesion").hidden = false;
    $("tituloMiCuenta").textContent = "Mi cuenta";
    mostrarEstado($("miCuentaEstado"), "");
}


async function cargarTodo(){

    const estado = $("miCuentaEstado");
    mostrarEstado(estado, "Cargando…", "info");

    try{
        usuario = await llamar("GET", "/usuarios/yo");
    }catch(error){
        if(error.codigoHttp === 401){
            mostrarSinSesion();
            return;
        }
        mostrarEstado(estado, error.message, "error");
        return;
    }

    $("miCuentaSinSesion").hidden = true;
    $("miCuentaContenido").hidden = false;
    pintarDatos();
    activarPestana(leerPestana());

    // Cada apartado por su lado: si uno falla, los demás se ven.
    const [resCatalogo, resSuscripciones, resPreferencias] = await Promise.allSettled([
        llamar("GET", "/usuarios/suscripciones/catalogo"),
        llamar("GET", "/usuarios/suscripciones"),
        llamar("GET", "/configuracion/usuario")
    ]);

    if(resCatalogo.status === "fulfilled"){
        catalogo = resCatalogo.value;
        pintarFormulario();
    }else{
        mostrarEstado($("estadoSuscripcion"), resCatalogo.reason.message, "error");
    }

    if(resSuscripciones.status === "fulfilled"){
        suscripciones = resSuscripciones.value;
        pintarSuscripciones();
    }else{
        $("listaSuscripciones").replaceChildren(
            crear("p", "mi-cuenta-vacio", resSuscripciones.reason.message)
        );
    }

    if(resPreferencias.status === "fulfilled"){
        preferencias = resPreferencias.value;
        pintarPreferencias();
    }else{
        $("listaPreferencias").replaceChildren(
            crear("p", "mi-cuenta-vacio", resPreferencias.reason.message)
        );
    }

    mostrarEstado(estado, "");
}


function recargar(){

    if(cargando === null){
        cargando = cargarTodo().finally(() => {
            cargando = null;
        });
    }

    return cargando;
}


function arrancar(){

    document.querySelectorAll(".mi-cuenta-pestana").forEach(boton => {
        boton.addEventListener("click", () => activarPestana(boton.dataset.pestana));
    });

    $("campoServicio")?.addEventListener("change", actualizarFormulario);
    $("formularioSuscripcion")?.addEventListener("submit", evento => void suscribirse(evento));

    // js/cuenta.js avisa al entrar, al salir y al pedir la baja.
    document.addEventListener("meteoarchidona:cuenta", evento => {
        const conSesion = Boolean(evento.detail?.conSesion);
        if(!conSesion){
            mostrarSinSesion();
        }else if(!usuario){
            void recargar();
        }
    });

    void recargar();
}


arrancar();


// Fin de fichero: js/mi-cuenta.js
