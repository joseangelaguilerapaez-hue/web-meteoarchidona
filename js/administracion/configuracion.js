/*
 * MeteoArchidona
 * Administración · Configuración de la web.
 *
 * Diseño: docs/configuracion.md de api-meteoarchidona.
 *
 * GET   /admin/configuracion
 * GET   /admin/configuracion/apartados
 * PATCH /admin/configuracion/{codigo}
 *
 * Los parámetros se agrupan en pestañas por apartado (Apariencia, Otros…),
 * en el orden del catálogo; se recuerda la última pestaña abierta.
 *
 * Una ficha por parámetro: interruptor, un control por cada valor que use
 * (desplegable, color, número o texto) y botón de guardar. Las opciones
 * y qué valores admite cada icono los manda la API (factoría del
 * catálogo): con el monigote se ocultan el color y el texto del día.
 *
 * El cambio se guarda al momento; el directo lo lee cada minuto.
 */

import {
    $,
    mostrarEstado
} from "./estado.js?v=20261026-cache1";

import {
    peticionJson
} from "./api.js?v=20261026-cache1";


const RUTA = "/admin/configuracion";
const ZONA = "Europe/Madrid";

const AMBITOS = {
    ADMINISTRATIVO: "Administrativo · solo administradores",
    PUBLICO: "Público · cada usuario puede cambiarlo para sí"
};

const CLAVE_PESTANA = "meteoarchidona_configuracion_pestana";

let parametros = [];
let apartados = [];
let pestanaActiva = null;
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


function opcionesDe(valor, icono){

    if(valor.opciones_por_icono && icono){
        return valor.opciones_por_icono[icono] || [];
    }

    return valor.opciones || [];
}


function admitidos(parametro, icono){

    if(!parametro.valores_por_icono){
        return parametro.valores.map(valor => valor.numero);
    }

    return parametro.valores_por_icono[icono] || [1];
}


/* ==========================================================
   FICHA DE UN PARÁMETRO
   ========================================================== */

function controlDeValor(parametro, valor){

    const id = `configuracion-${parametro.codigo}-${valor.numero}`;
    const campo = crear("div", valor.tipo === "TEXTO" ? "campo campo-ancho" : "campo");
    campo.dataset.numero = String(valor.numero);

    const etiqueta = crear("label", "", valor.etiqueta);
    etiqueta.htmlFor = id;
    campo.append(etiqueta);

    let control;

    if(valor.tipo === "OPCION"){

        control = document.createElement("select");

        if(!valor.obligatorio){
            control.append(new Option("—", ""));
        }

    }else if(valor.tipo === "COLOR"){

        control = document.createElement("input");
        control.type = "color";

    }else if(valor.tipo === "NUMERO"){

        control = document.createElement("input");
        control.type = "number";
        control.step = "any";

        if(valor.minimo !== null && valor.minimo !== undefined){
            control.min = String(valor.minimo);
        }
        if(valor.maximo !== null && valor.maximo !== undefined){
            control.max = String(valor.maximo);
        }

    }else{

        control = document.createElement("input");
        control.type = "text";
        control.autocomplete = "off";

        if(valor.largo_maximo){
            control.maxLength = valor.largo_maximo;
            control.placeholder = `Opcional, hasta ${valor.largo_maximo} caracteres`;
        }
    }

    control.id = id;
    control.dataset.numero = String(valor.numero);
    campo.append(control);

    if(valor.tipo === "OPCION"){
        const ayuda = crear("p", "campo-ayuda configuracion-significado");
        campo.append(ayuda);
    }

    return campo;
}


function rellenarOpciones(select, opciones, seleccionado, obligatorio){

    const anterior = seleccionado ?? select.value;
    select.replaceChildren();

    if(!obligatorio){
        select.append(new Option("—", ""));
    }

    for(const opcion of opciones){
        const elemento = new Option(opcion.nombre, opcion.codigo);
        elemento.dataset.color = opcion.color_hex || "";
        elemento.dataset.significado = opcion.significado || "";
        select.append(elemento);
    }

    select.value = opciones.some(o => o.codigo === anterior) ? anterior : (
        obligatorio && opciones.length ? opciones[0].codigo : ""
    );
}


function actualizarSignificado(campo){

    const select = campo.querySelector("select");
    const ayuda = campo.querySelector(".configuracion-significado");

    if(!select || !ayuda){
        return;
    }

    const opcion = select.selectedOptions[0];
    const color = opcion?.dataset.color || "";
    const significado = opcion?.dataset.significado || "";

    ayuda.replaceChildren();

    if(color){
        const muestra = crear("span", "configuracion-muestra");
        muestra.style.background = color;
        ayuda.append(muestra);
    }

    if(significado){
        ayuda.append(document.createTextNode(significado));
    }
}


/*
 * Aplica el icono elegido: opciones de color de ese icono y valores
 * visibles (con el monigote, ni color ni texto del día).
 */
function aplicarIcono(ficha, parametro, valoresIniciales){

    const selectorIcono = ficha.querySelector('select[data-numero="1"]');
    const icono = selectorIcono ? selectorIcono.value : null;
    const visibles = admitidos(parametro, icono);

    for(const valor of parametro.valores){

        const campo = ficha.querySelector(`.campo[data-numero="${valor.numero}"]`);
        const control = campo.querySelector("[data-numero]:not(.campo)");
        const visible = visibles.includes(valor.numero);

        campo.hidden = !visible;
        control.disabled = !visible;

        if(valor.tipo === "OPCION" && valor.numero !== 1){
            rellenarOpciones(
                control,
                opcionesDe(valor, icono),
                valoresIniciales ? valor.valor : null,
                valor.obligatorio
            );
        }

        actualizarSignificado(campo);
    }
}


function crearFicha(parametro){

    const ficha = crear("article", "configuracion-ficha");
    ficha.dataset.codigo = parametro.codigo;

    const cabecera = crear("div", "configuracion-cabecera");
    const titulo = crear("h3", "configuracion-titulo", parametro.nombre);
    const ambito = crear(
        "span",
        `configuracion-ambito configuracion-ambito-${parametro.ambito.toLowerCase()}`,
        AMBITOS[parametro.ambito] || parametro.ambito
    );
    cabecera.append(titulo, ambito);
    ficha.append(cabecera);

    if(parametro.descripcion){
        ficha.append(crear("p", "modulo-intro", parametro.descripcion));
    }

    const formulario = crear("form", "configuracion-formulario");
    formulario.noValidate = true;

    const linea = crear("div", "check-linea");
    const interruptor = document.createElement("input");
    interruptor.type = "checkbox";
    interruptor.id = `configuracion-${parametro.codigo}-activo`;
    interruptor.checked = Boolean(parametro.activo);
    interruptor.dataset.campo = "activo";
    const etiquetaInterruptor = crear("label", "", "Activo");
    etiquetaInterruptor.htmlFor = interruptor.id;
    linea.append(interruptor, etiquetaInterruptor);
    formulario.append(linea);

    const rejilla = crear("div", "formulario-grid");

    for(const valor of parametro.valores){
        rejilla.append(controlDeValor(parametro, valor));
    }

    formulario.append(rejilla);

    // Valores iniciales.
    for(const valor of parametro.valores){

        const control = rejilla.querySelector(`[id="configuracion-${parametro.codigo}-${valor.numero}"]`);

        if(valor.tipo === "OPCION" && valor.numero === 1){
            rellenarOpciones(control, valor.opciones, valor.valor, valor.obligatorio);
        }else if(valor.tipo !== "OPCION"){
            control.value = valor.valor ?? (valor.tipo === "COLOR" ? "#000000" : "");
        }
    }

    aplicarIcono(formulario, parametro, true);

    const pie = crear("div", "configuracion-pie");
    const ultimo = crear(
        "span",
        "campo-ayuda",
        `Último cambio: ${fechaLocal(parametro.fecha_actualizacion)}`
    );
    const guardar = crear("button", "boton boton-principal", "Guardar");
    guardar.type = "submit";
    pie.append(ultimo, guardar);
    formulario.append(pie);

    const estado = crear("div", "estado");
    estado.setAttribute("role", "status");
    estado.setAttribute("aria-live", "polite");
    formulario.append(estado);

    formulario.addEventListener("change", evento => {

        const objetivo = evento.target;

        if(objetivo.matches('select[data-numero="1"]')){
            aplicarIcono(formulario, parametro, false);
        }else if(objetivo.matches("select")){
            actualizarSignificado(objetivo.closest(".campo"));
        }
    });

    formulario.addEventListener("submit", evento => {
        evento.preventDefault();
        guardarParametro(parametro, formulario, estado, guardar);
    });

    ficha.append(formulario);
    return ficha;
}


/* ==========================================================
   GUARDAR
   ========================================================== */

async function guardarParametro(parametro, formulario, estado, boton){

    const cuerpo = {
        activo: formulario.querySelector('[data-campo="activo"]').checked,
        valores: {}
    };

    for(const valor of parametro.valores){

        const control = formulario.querySelector(
            `[id="configuracion-${parametro.codigo}-${valor.numero}"]`
        );

        // Los que el icono no admite van vacíos; la API los vacía igual.
        const texto = control.disabled ? "" : String(control.value || "").trim();
        cuerpo.valores[valor.numero] = texto === "" ? null : texto;
    }

    boton.disabled = true;
    mostrarEstado(estado, "Guardando…");

    try{

        const actualizado = await peticionJson(
            `${RUTA}/${encodeURIComponent(parametro.codigo)}`,
            {
                method: "PATCH",
                body: JSON.stringify(cuerpo)
            }
        );

        const indice = parametros.findIndex(p => p.codigo === actualizado.codigo);
        if(indice >= 0){
            parametros[indice] = actualizado;
        }

        const ficha = formulario.closest(".configuracion-ficha");
        const nueva = crearFicha(actualizado);
        ficha.replaceWith(nueva);

        mostrarEstado(
            nueva.querySelector(".configuracion-formulario > .estado"),
            "Guardado. El directo lo aplicará en menos de un minuto.",
            "ok"
        );

    }catch(error){

        mostrarEstado(
            estado,
            error.message || "No se ha podido guardar.",
            "error"
        );

    }finally{
        boton.disabled = false;
    }
}


/* ==========================================================
   CARGA
   ========================================================== */

function leerPestanaGuardada(){

    try{
        return sessionStorage.getItem(CLAVE_PESTANA);
    }catch(error){
        return null;
    }
}


function guardarPestana(codigo){

    try{
        sessionStorage.setItem(CLAVE_PESTANA, codigo);
    }catch(error){
        // Sin almacenamiento: la pestaña no se recuerda, nada más.
    }
}


function renderizarPestanas(){

    const lista = $("listaConfiguracion");
    let barra = $("pestanasConfiguracion");

    if(!barra){
        barra = crear("div", "acciones configuracion-pestanas");
        barra.id = "pestanasConfiguracion";
        barra.setAttribute("role", "tablist");
        lista.before(barra);
    }

    barra.replaceChildren();

    for(const apartado of apartados){

        const cuantos = parametros.filter(p => p.apartado === apartado.codigo).length;
        const boton = crear("button", "boton boton-secundario", `${apartado.nombre} (${cuantos})`);
        boton.type = "button";
        boton.dataset.apartado = apartado.codigo;
        boton.setAttribute("role", "tab");
        boton.setAttribute("aria-controls", "listaConfiguracion");

        boton.addEventListener("click", () => {
            pestanaActiva = apartado.codigo;
            guardarPestana(pestanaActiva);
            renderizarLista();
        });

        barra.append(boton);
    }
}


function renderizarLista(){

    const lista = $("listaConfiguracion");

    for(const boton of document.querySelectorAll("#pestanasConfiguracion [data-apartado]")){
        const seleccionada = boton.dataset.apartado === pestanaActiva;
        boton.setAttribute("aria-selected", String(seleccionada));
        boton.tabIndex = seleccionada ? 0 : -1;
        boton.classList.toggle("activo", seleccionada);
    }

    const visibles = parametros.filter(p => p.apartado === pestanaActiva);
    lista.replaceChildren(...visibles.map(crearFicha));

    if(!visibles.length){
        const nombre = apartados.find(a => a.codigo === pestanaActiva)?.nombre || "este apartado";
        lista.append(crear("p", "modulo-intro", `Todavía no hay parámetros en ${nombre}.`));
    }
}


function renderizar(){

    const lista = $("listaConfiguracion");

    if(!lista){
        return;
    }

    const codigos = apartados.map(a => a.codigo);
    const guardada = leerPestanaGuardada();

    if(!codigos.includes(pestanaActiva)){
        pestanaActiva = codigos.includes(guardada)
            ? guardada
            // Si no hay ninguna recordada, la primera que tenga parámetros.
            : (codigos.find(c => parametros.some(p => p.apartado === c)) || codigos[0] || null);
    }

    renderizarPestanas();
    renderizarLista();
}


export async function cargarConfiguracion(){

    const estado = $("estadoConfiguracion");
    mostrarEstado(estado, "Cargando…");

    try{
        [apartados, parametros] = await Promise.all([
            peticionJson(`${RUTA}/apartados`),
            peticionJson(RUTA)
        ]);
        renderizar();
        mostrarEstado(estado, "");
    }catch(error){
        mostrarEstado(
            estado,
            error.message || "No se ha podido cargar la configuración.",
            "error"
        );
        throw error;
    }
}


export function configurarEventosConfiguracion(){

    if(eventosConfigurados){
        return;
    }

    eventosConfigurados = true;

    $("botonRecargarConfiguracion")?.addEventListener("click", () => {
        cargarConfiguracion().catch(() => {});
    });
}


export function limpiarConfiguracion(){

    parametros = [];
    apartados = [];
    pestanaActiva = null;
    $("pestanasConfiguracion")?.remove();
    $("listaConfiguracion")?.replaceChildren();
    mostrarEstado($("estadoConfiguracion"), "");
}


// Fin de fichero: js/administracion/configuracion.js
