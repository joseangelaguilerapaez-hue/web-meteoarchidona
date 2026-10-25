
/*
 * MeteoArchidona
 * Administración · Patrullas de cámara.
 *
 * Diseño: docs/patrullas.md de api-meteoarchidona.
 *
 * GET    /admin/patrullas
 * POST   /admin/patrullas
 * GET    /admin/patrullas/{id}
 * PATCH  /admin/patrullas/{id}
 * DELETE /admin/patrullas/{id}
 * PUT    /admin/patrullas/{id}/ordenes
 * POST   /admin/patrullas/{id}/activar | /desactivar | /vuelta
 * POST   /admin/patrullas/{id}/programaciones
 * PATCH  /admin/patrullas/{id}/programaciones/{programacion}
 * DELETE /admin/patrullas/{id}/programaciones/{programacion}
 *
 * Mismo esquema que timelapses.js: listado con filtros y editor.
 * Este módulo no mueve la cámara: guarda la configuración y el estado
 * que después aplicará MeteoCam en el mini PC.
 */

import {
    $,
    estadoAdministracion,
    mostrarEstado
} from "./estado.js";

import {
    peticionAdministrativa,
    peticionJson
} from "./api.js";

const RUTA_PATRULLAS = "/admin/patrullas";
const RUTA_CAMARAS = "/admin/camaras";
const ZONA = "Europe/Madrid";

const TIPOS_ORDEN = {
    MOVER_A_PRESET: "Mover a preset",
    ESPERAR: "Esperar",
    ZOOM: "Zoom (pendiente de comprobar)"
};

const MODOS_PROGRAMACION = {
    VUELTA_FECHA: {
        texto: "Una vuelta en fecha y hora concretas",
        tipo_programacion: "UNA_VUELTA",
        tipo_recurrencia: "FECHA_CONCRETA"
    },
    VUELTA_DIARIA: {
        texto: "Una vuelta cada día elegido",
        tipo_programacion: "UNA_VUELTA",
        tipo_recurrencia: "DIARIA"
    },
    ACTIVACION: {
        texto: "Activa en bucle en una franja horaria",
        tipo_programacion: "ACTIVACION_HORARIO",
        tipo_recurrencia: "DIARIA"
    }
};

const DIAS = ["L", "M", "X", "J", "V", "S", "D"];

let patrullas = [];
let camaras = [];
let presets = [];
let seleccionada = null;
let idSeleccionado = null;
let ordenes = [];
let guardando = false;
let eventosConfigurados = false;
let secuenciaCarga = 0;
let secuenciaSeleccion = 0;
let secuenciaPresets = 0;

/* ==========================================================
   UTILIDADES
   ========================================================== */

function crearElemento(etiqueta, clase, texto){
    const elemento = document.createElement(etiqueta);
    if(clase){
        elemento.className = clase;
    }
    if(texto !== undefined && texto !== null){
        elemento.textContent = String(texto);
    }
    return elemento;
}

function crearBoton(texto, clase, alPulsar){
    const boton = crearElemento("button", clase, texto);
    boton.type = "button";
    boton.addEventListener("click", alPulsar);
    return boton;
}

function mostrarElemento(id, visible){
    const elemento = $(id);
    if(!elemento){
        return;
    }
    elemento.hidden = !visible;
    elemento.classList.toggle("oculto", !visible);
}

function textoError(error){
    return error?.message || "No se ha podido completar la operación.";
}

function entero(valor, etiqueta, minimo, maximo){
    const texto = String(valor ?? "").trim();
    const numero = Number(texto);
    if(!texto || !Number.isSafeInteger(numero) || numero < minimo || numero > maximo){
        throw new Error(`${etiqueta}: introduce un número entero entre ${minimo} y ${maximo}.`);
    }
    return numero;
}

function hora(valor){
    return valor ? String(valor).slice(0, 5) : "";
}

function textoDias(dias){
    return [...String(dias || "")].map(dia => DIAS[Number(dia) - 1]).join(" ");
}

function fechaLocal(valor){
    if(!valor){
        return "";
    }
    return new Intl.DateTimeFormat("es-ES", {
        timeZone: ZONA,
        dateStyle: "short",
        timeStyle: "short"
    }).format(new Date(valor));
}

function estadoFormulario(texto, tipo){
    mostrarEstado($("estadoFormularioPatrulla"), texto, tipo);
}

/* ==========================================================
   CÁMARAS Y PRESETS
   ========================================================== */

function esPtz(camara){
    return Boolean(camara && (camara.tipo_vista === "PTZ" || camara.capacidad_ptz === true));
}

function camaraPorId(id){
    return camaras.find(item => item.id === Number(id)) || null;
}

function nombreEstacion(estacionId){
    const estacion = estadoAdministracion.estaciones.find(item => item.id === estacionId);
    return estacion ? (estacion.nombre_publico || estacion.codigo) : `Estación ${estacionId ?? "-"}`;
}

function descripcionCamara(camara){
    if(!camara){
        return "Cámara desconocida";
    }
    const nombre = camara.nombre_publico || camara.nombre_tecnico || `Cámara ${camara.id}`;
    return `${nombreEstacion(camara.estacion_id)} · ${nombre} · Vista específica · #${camara.id}`;
}

function nombrePreset(preset){
    return preset.nombre_publico
        || preset.nombre_tecnico
        || `Preset ${preset.identificador_preset}`;
}

function presetPorId(id){
    return presets.find(item => item.id === Number(id)) || null;
}

function opcionesPresets(selector, valor, textoVacio){
    selector.replaceChildren(new Option(textoVacio, ""));
    for(const preset of presets){
        if(preset.disponible === false && preset.id !== Number(valor)){
            continue;
        }
        selector.add(new Option(
            `${nombrePreset(preset)} · ${preset.identificador_preset}`
                + (preset.disponible === false ? " (no disponible)" : ""),
            String(preset.id)
        ));
    }
    if(valor !== null && valor !== undefined && valor !== ""){
        if(![...selector.options].some(opcion => opcion.value === String(valor))){
            selector.add(new Option(`Preset #${valor} (desconocido)`, String(valor)));
        }
        selector.value = String(valor);
    }
}

function actualizarSelectCamaras(){
    const selector = $("campoPatrullaCamara");
    const filtro = $("filtroPatrullaCamara");
    const anterior = selector?.value || "";
    const filtroAnterior = filtro?.value || "";

    selector?.replaceChildren(new Option("Selecciona una cámara PTZ", ""));
    filtro?.replaceChildren(new Option("Todas las cámaras", ""));

    for(const camara of camaras.filter(esPtz)){
        const texto = descripcionCamara(camara);
        selector?.add(new Option(
            camara.habilitada ? texto : `${texto} (deshabilitada)`,
            String(camara.id)
        ));
        filtro?.add(new Option(texto, String(camara.id)));
    }

    if(selector && [...selector.options].some(op => op.value === anterior)){
        selector.value = anterior;
    }
    if(filtro && [...filtro.options].some(op => op.value === filtroAnterior)){
        filtro.value = filtroAnterior;
    }
}

async function cargarPresets(camaraId, presetInicial = null){
    const solicitud = ++secuenciaPresets;
    const selector = $("campoPatrullaPresetInicial");
    presets = [];

    if(!camaraId){
        selector?.replaceChildren(new Option("Elige antes la cámara", ""));
        renderizarOrdenes();
        return;
    }

    selector?.replaceChildren(new Option("Cargando presets...", ""));

    try{
        const resultado = await peticionJson(`${RUTA_CAMARAS}/${camaraId}/presets`);
        if(solicitud !== secuenciaPresets){
            return;
        }
        if(!Array.isArray(resultado)){
            throw new Error("La API no ha devuelto un catálogo válido de presets.");
        }
        presets = resultado;
        if(selector){
            opcionesPresets(
                selector,
                presetInicial,
                presets.length ? "Selecciona el preset inicial" : "La cámara no tiene presets sincronizados"
            );
        }
        renderizarOrdenes();
    }catch(error){
        if(solicitud !== secuenciaPresets){
            return;
        }
        selector?.replaceChildren(new Option("Error al cargar presets", ""));
        estadoFormulario(textoError(error), "error");
    }
}

/* ==========================================================
   LISTADO
   ========================================================== */

function patrullasFiltradas(){
    const busqueda = ($("filtroPatrullaTexto")?.value || "").trim().toLocaleLowerCase("es-ES");
    const camaraId = $("filtroPatrullaCamara")?.value || "";
    const estado = $("filtroPatrullaEstado")?.value || "";

    return patrullas.filter(patrulla => {
        if(camaraId && String(patrulla.camara_id) !== camaraId){
            return false;
        }
        if(estado === "activas" && !patrulla.activa){
            return false;
        }
        if(estado === "habilitadas" && !patrulla.habilitada){
            return false;
        }
        if(estado === "deshabilitadas" && patrulla.habilitada){
            return false;
        }
        if(!busqueda){
            return true;
        }
        return [patrulla.codigo, patrulla.nombre, patrulla.descripcion,
            descripcionCamara(camaraPorId(patrulla.camara_id))]
            .some(valor => String(valor ?? "").toLocaleLowerCase("es-ES").includes(busqueda));
    });
}

function renderizarListado(){
    const contenedor = $("listaPatrullas");
    if(!contenedor){
        return;
    }
    contenedor.replaceChildren();

    const resultado = patrullasFiltradas();
    if(!resultado.length){
        contenedor.appendChild(crearElemento(
            "div", "lista-vacia",
            patrullas.length
                ? "No hay patrullas que coincidan con los filtros."
                : "Todavía no hay patrullas. Pulsa «+ Nueva» para crear la primera."
        ));
        return;
    }

    for(const patrulla of resultado){
        const tarjeta = crearElemento(
            "button",
            `estacion-card${patrulla.id === idSeleccionado ? " seleccionada" : ""}`
        );
        tarjeta.type = "button";
        tarjeta.disabled = guardando;
        tarjeta.append(
            crearElemento("div", "estacion-codigo", patrulla.codigo),
            crearElemento("div", "estacion-nombre", patrulla.nombre),
            crearElemento("div", "estacion-localizacion", descripcionCamara(camaraPorId(patrulla.camara_id)))
        );
        const chips = crearElemento("div", "chips");
        chips.append(
            crearElemento("span", `chip ${patrulla.activa ? "chip-activa" : "chip-inactiva"}`,
                patrulla.activa ? "Activa" : "Parada"),
            crearElemento("span", "chip", `${patrulla.ordenes.length} órdenes`),
            crearElemento("span", "chip", `${patrulla.programaciones.length} programaciones`)
        );
        if(!patrulla.habilitada){
            chips.append(crearElemento("span", "chip chip-inactiva", "Deshabilitada"));
        }
        tarjeta.appendChild(chips);
        tarjeta.addEventListener("click", () => void seleccionarPatrulla(patrulla.id));
        contenedor.appendChild(tarjeta);
    }
}

/* ==========================================================
   ÓRDENES
   ========================================================== */

function ordenNueva(tipo = "MOVER_A_PRESET"){
    return {tipo, preset_id: null, velocidad: null, segundos: tipo === "ESPERAR" ? 30 : null, nivel_zoom: tipo === "ZOOM" ? 0 : null};
}

function campoOrden(etiqueta, control){
    const campo = crearElemento("div", "campo");
    const texto = crearElemento("label", "", etiqueta);
    campo.append(texto, control);
    return campo;
}

function entradaNumero(valor, minimo, maximo, marcador, alCambiar){
    const entrada = document.createElement("input");
    entrada.type = "number";
    entrada.min = String(minimo);
    entrada.max = String(maximo);
    entrada.step = "1";
    entrada.inputMode = "numeric";
    entrada.placeholder = marcador || "";
    entrada.value = valor ?? "";
    entrada.addEventListener("input", () => alCambiar(entrada.value));
    return entrada;
}

function renderizarOrdenes(){
    const contenedor = $("listaOrdenesPatrulla");
    if(!contenedor){
        return;
    }
    contenedor.replaceChildren();

    if(!ordenes.length){
        contenedor.appendChild(crearElemento(
            "div", "lista-vacia",
            "Sin órdenes. Añade al menos un movimiento y una espera."
        ));
    }

    ordenes.forEach((orden, indice) => {
        const fila = crearElemento("div", "regla-card orden-patrulla");
        const cabecera = crearElemento("div", "regla-cabecera");
        cabecera.appendChild(crearElemento("strong", "", `${indice + 1}.`));

        const tipo = document.createElement("select");
        for(const [valor, texto] of Object.entries(TIPOS_ORDEN)){
            tipo.add(new Option(texto, valor));
        }
        tipo.value = orden.tipo;
        tipo.addEventListener("change", () => {
            ordenes[indice] = ordenNueva(tipo.value);
            renderizarOrdenes();
        });
        cabecera.appendChild(tipo);

        const acciones = crearElemento("div", "acciones");
        const subir = crearBoton("↑", "boton boton-mini", () => moverOrden(indice, -1));
        subir.title = "Subir";
        subir.disabled = indice === 0;
        const bajar = crearBoton("↓", "boton boton-mini", () => moverOrden(indice, 1));
        bajar.title = "Bajar";
        bajar.disabled = indice === ordenes.length - 1;
        const quitar = crearBoton("✕", "boton boton-mini boton-peligro", () => {
            ordenes.splice(indice, 1);
            renderizarOrdenes();
        });
        quitar.title = "Quitar orden";
        acciones.append(subir, bajar, quitar);
        cabecera.appendChild(acciones);
        fila.appendChild(cabecera);

        const datos = crearElemento("div", "formulario-grid");

        if(orden.tipo === "MOVER_A_PRESET"){
            const selector = document.createElement("select");
            opcionesPresets(selector, orden.preset_id,
                presets.length ? "Selecciona un preset" : "Elige antes la cámara");
            selector.addEventListener("change", () => {
                orden.preset_id = selector.value ? Number(selector.value) : null;
                actualizarResumenVuelta();
            });
            datos.append(
                campoOrden("Preset", selector),
                campoOrden("Velocidad (1-64)", entradaNumero(
                    orden.velocidad, 1, 64, "La de la patrulla",
                    valor => { orden.velocidad = valor === "" ? null : Number(valor); }
                ))
            );
        }else if(orden.tipo === "ESPERAR"){
            datos.append(campoOrden("Segundos", entradaNumero(
                orden.segundos, 1, 86400, "30",
                valor => {
                    orden.segundos = valor === "" ? null : Number(valor);
                    actualizarResumenVuelta();
                }
            )));
        }else{
            datos.append(campoOrden("Nivel de zoom", entradaNumero(
                orden.nivel_zoom, 0, 999, "0",
                valor => { orden.nivel_zoom = valor === "" ? null : Number(valor); }
            )));
            datos.appendChild(crearElemento(
                "div", "campo-ayuda",
                "Pendiente de comprobar que la cámara admite zoom por la API. "
                + "Hasta entonces MeteoCam ignorará esta orden."
            ));
        }

        fila.appendChild(datos);
        contenedor.appendChild(fila);
    });

    actualizarResumenVuelta();
}

function moverOrden(indice, desplazamiento){
    const destino = indice + desplazamiento;
    if(destino < 0 || destino >= ordenes.length){
        return;
    }
    [ordenes[indice], ordenes[destino]] = [ordenes[destino], ordenes[indice]];
    renderizarOrdenes();
}

function actualizarResumenVuelta(){
    const resumen = $("resumenVueltaPatrulla");
    if(!resumen){
        return;
    }
    const inicial = presetPorId($("campoPatrullaPresetInicial")?.value);
    const nombres = ordenes
        .filter(orden => orden.tipo === "MOVER_A_PRESET" && orden.preset_id)
        .map(orden => presetPorId(orden.preset_id))
        .filter(Boolean)
        .map(nombrePreset);
    const esperas = ordenes
        .filter(orden => orden.tipo === "ESPERAR")
        .reduce((total, orden) => total + (Number(orden.segundos) || 0), 0);
    const minutos = Math.floor(esperas / 60);
    const segundos = esperas % 60;

    const inicio = inicial ? nombrePreset(inicial) : "preset inicial";
    resumen.textContent =
        `Una vuelta: ${[inicio, ...nombres, inicio].join(" → ")}. `
        + `Esperas: ${minutos ? `${minutos} min ` : ""}${segundos} s (más el tiempo de los movimientos).`;
}

function leerOrdenes(){
    return ordenes.map((orden, indice) => {
        const posicion = indice + 1;
        if(orden.tipo === "MOVER_A_PRESET"){
            if(!orden.preset_id){
                throw new Error(`Orden ${posicion}: elige el preset.`);
            }
            return {
                tipo: orden.tipo,
                preset_id: Number(orden.preset_id),
                velocidad: orden.velocidad === null || orden.velocidad === ""
                    ? null
                    : entero(orden.velocidad, `Orden ${posicion}, velocidad`, 1, 64)
            };
        }
        if(orden.tipo === "ESPERAR"){
            return {
                tipo: orden.tipo,
                segundos: entero(orden.segundos, `Orden ${posicion}, segundos`, 1, 86400)
            };
        }
        return {
            tipo: orden.tipo,
            nivel_zoom: entero(orden.nivel_zoom, `Orden ${posicion}, zoom`, 0, 9999)
        };
    });
}

function ordenesDesdeApi(lista){
    return (lista || []).map(orden => ({
        tipo: orden.tipo,
        preset_id: orden.preset_id,
        velocidad: orden.velocidad,
        segundos: orden.segundos,
        nivel_zoom: orden.nivel_zoom
    }));
}

/* ==========================================================
   EDITOR DE LA PATRULLA
   ========================================================== */

function mostrarEditor(visible){
    mostrarElemento("panelFormularioPatrulla", visible);
}

function rellenarFormulario(datos){
    $("campoPatrullaCodigo").value = datos.codigo ?? "";
    $("campoPatrullaNombre").value = datos.nombre ?? "";
    $("campoPatrullaDescripcion").value = datos.descripcion ?? "";
    $("campoPatrullaCamara").value = datos.camara_id ? String(datos.camara_id) : "";
    $("campoPatrullaCamara").disabled = Boolean(datos.id);
    $("campoPatrullaVelocidad").value = datos.velocidad_defecto ?? 32;
    $("campoPatrullaHabilitada").checked = datos.habilitada ?? true;
    ordenes = ordenesDesdeApi(datos.ordenes);
}

function actualizarAcciones(){
    const editando = Boolean(seleccionada);
    mostrarElemento("bloqueAccionesPatrulla", editando);
    mostrarElemento("seccionProgramacionesPatrulla", editando);
    if(!editando){
        return;
    }
    const estado = $("estadoActivaPatrulla");
    if(estado){
        estado.textContent = seleccionada.activa
            ? "Esta patrulla está ACTIVA: MeteoCam la ejecuta en bucle en su cámara."
            : "Esta patrulla está parada.";
    }
    $("botonActivarPatrulla").textContent = seleccionada.activa ? "Desactivar" : "Activar";
    $("botonActivarPatrulla").disabled = guardando || (!seleccionada.activa && !seleccionada.habilitada);
    $("botonVueltaPatrulla").disabled = guardando || !seleccionada.habilitada;
    $("botonBorrarPatrulla").disabled = guardando || seleccionada.activa;
}

function nuevaPatrulla(){
    if(guardando){
        return;
    }
    ++secuenciaSeleccion;
    idSeleccionado = null;
    seleccionada = null;
    rellenarFormulario({velocidad_defecto: 32, habilitada: true, ordenes: []});
    ordenes = [ordenNueva("MOVER_A_PRESET"), ordenNueva("ESPERAR")];
    void cargarPresets(null);
    $("tituloFormularioPatrulla").textContent = "Nueva patrulla";
    $("botonGuardarPatrulla").textContent = "Crear patrulla";
    $("botonGuardarPatrulla").disabled = false;
    estadoFormulario("");
    actualizarAcciones();
    renderizarOrdenes();
    mostrarEditor(true);
    renderizarListado();
}

async function seleccionarPatrulla(id, mensaje = ""){
    if(guardando){
        return;
    }
    const solicitud = ++secuenciaSeleccion;
    idSeleccionado = id;
    seleccionada = null;
    renderizarListado();
    mostrarEditor(true);
    $("tituloFormularioPatrulla").textContent = "Cargando patrulla...";
    $("botonGuardarPatrulla").disabled = true;
    estadoFormulario("Consultando patrulla...", "info");

    try{
        const datos = await peticionJson(`${RUTA_PATRULLAS}/${id}`);
        if(solicitud !== secuenciaSeleccion){
            return;
        }
        seleccionada = datos;
        rellenarFormulario(datos);
        await cargarPresets(datos.camara_id, datos.preset_inicial_id);
        $("tituloFormularioPatrulla").textContent = `Patrulla ${datos.codigo}`;
        $("botonGuardarPatrulla").textContent = "Guardar cambios";
        $("botonGuardarPatrulla").disabled = false;
        actualizarAcciones();
        renderizarProgramaciones();
        estadoFormulario(mensaje, mensaje ? "ok" : undefined);
    }catch(error){
        if(solicitud !== secuenciaSeleccion){
            return;
        }
        estadoFormulario(textoError(error), "error");
    }
}

function leerFormulario(){
    const codigo = ($("campoPatrullaCodigo")?.value || "").trim();
    const nombre = ($("campoPatrullaNombre")?.value || "").trim();
    if(!codigo || !nombre){
        throw new Error("Código y nombre son obligatorios.");
    }
    const camaraId = Number($("campoPatrullaCamara")?.value);
    if(!camaraPorId(camaraId)){
        throw new Error("Selecciona una cámara PTZ.");
    }
    const presetInicial = Number($("campoPatrullaPresetInicial")?.value);
    if(!presetInicial){
        throw new Error("Selecciona el preset inicial.");
    }
    return {
        camara_id: camaraId,
        codigo: codigo.toUpperCase().replace(/\s+/g, "_"),
        nombre,
        descripcion: ($("campoPatrullaDescripcion")?.value || "").trim() || null,
        preset_inicial_id: presetInicial,
        velocidad_defecto: entero($("campoPatrullaVelocidad")?.value, "Velocidad por defecto", 1, 64),
        habilitada: Boolean($("campoPatrullaHabilitada")?.checked),
        ordenes: leerOrdenes()
    };
}

async function guardarPatrulla(evento){
    evento.preventDefault();
    if(guardando){
        return;
    }
    try{
        const datos = leerFormulario();
        const actual = seleccionada;
        guardando = true;
        $("botonGuardarPatrulla").disabled = true;
        estadoFormulario("Guardando patrulla...", "info");

        let id;
        if(!actual){
            const creada = await peticionJson(RUTA_PATRULLAS, {
                method: "POST",
                body: JSON.stringify(datos)
            });
            id = creada.id;
        }else{
            id = actual.id;
            const cambios = {};
            for(const clave of ["codigo", "nombre", "descripcion", "preset_inicial_id", "velocidad_defecto", "habilitada"]){
                if((actual[clave] ?? null) !== datos[clave]){
                    cambios[clave] = datos[clave];
                }
            }
            if(Object.keys(cambios).length){
                await peticionJson(`${RUTA_PATRULLAS}/${id}`, {
                    method: "PATCH",
                    body: JSON.stringify(cambios)
                });
            }
            if(JSON.stringify(datos.ordenes) !== JSON.stringify(leerOrdenesDe(actual.ordenes))){
                await peticionJson(`${RUTA_PATRULLAS}/${id}/ordenes`, {
                    method: "PUT",
                    body: JSON.stringify({ordenes: datos.ordenes})
                });
            }
        }
        guardando = false;
        await cargarPatrullas();
        await seleccionarPatrulla(id, "Patrulla guardada.");
    }catch(error){
        estadoFormulario(textoError(error), "error");
    }finally{
        guardando = false;
        $("botonGuardarPatrulla").disabled = false;
        actualizarAcciones();
        renderizarListado();
    }
}

function leerOrdenesDe(lista){
    const anteriores = ordenes;
    ordenes = ordenesDesdeApi(lista);
    try{
        return leerOrdenes();
    }finally{
        ordenes = anteriores;
    }
}

async function accion(ruta, opciones, mensaje){
    if(guardando || !seleccionada){
        return;
    }
    const id = seleccionada.id;
    try{
        guardando = true;
        actualizarAcciones();
        estadoFormulario("Enviando...", "info");
        await peticionAdministrativa(ruta, opciones);
        guardando = false;
        await cargarPatrullas();
        await seleccionarPatrulla(id, mensaje);
    }catch(error){
        estadoFormulario(textoError(error), "error");
    }finally{
        guardando = false;
        actualizarAcciones();
    }
}

function activarODesactivar(){
    if(!seleccionada){
        return;
    }
    const activar = !seleccionada.activa;
    if(activar && !window.confirm(
        "Al activarla, MeteoCam la ejecutará en bucle y se parará "
        + "la patrulla que estuviera activa en la misma cámara. ¿Continuar?"
    )){
        return;
    }
    void accion(
        `${RUTA_PATRULLAS}/${seleccionada.id}/${activar ? "activar" : "desactivar"}`,
        {method: "POST"},
        activar ? "Patrulla activada." : "Patrulla desactivada."
    );
}

function ejecutarVuelta(){
    if(!seleccionada || !window.confirm(
        "Se enviará a MeteoCam la orden de dar una vuelta ahora. ¿Continuar?"
    )){
        return;
    }
    void accion(
        `${RUTA_PATRULLAS}/${seleccionada.id}/vuelta`,
        {method: "POST"},
        "Orden de una vuelta enviada. MeteoCam la ejecutará cuando la recoja."
    );
}

async function borrarPatrulla(){
    if(guardando || !seleccionada || !window.confirm(
        `¿Borrar la patrulla ${seleccionada.codigo}? No se puede deshacer.`
    )){
        return;
    }
    try{
        guardando = true;
        await peticionAdministrativa(`${RUTA_PATRULLAS}/${seleccionada.id}`, {method: "DELETE"});
        guardando = false;
        cerrarEditor();
        await cargarPatrullas();
        mostrarEstado($("estadoPatrullas"), "Patrulla borrada.", "ok");
    }catch(error){
        estadoFormulario(textoError(error), "error");
    }finally{
        guardando = false;
        actualizarAcciones();
    }
}

function cerrarEditor(){
    if(guardando){
        return;
    }
    ++secuenciaSeleccion;
    ++secuenciaPresets;
    idSeleccionado = null;
    seleccionada = null;
    ordenes = [];
    mostrarEditor(false);
    estadoFormulario("");
    renderizarListado();
}

/* ==========================================================
   PROGRAMACIONES
   ========================================================== */

function describirProgramacion(programacion){
    if(programacion.tipo_recurrencia === "FECHA_CONCRETA"){
        return `Una vuelta el ${fechaLocal(programacion.fecha_hora_ejecucion)}`;
    }
    if(programacion.tipo_programacion === "UNA_VUELTA"){
        return `Una vuelta a las ${hora(programacion.hora_inicio)} · ${textoDias(programacion.dias_semana)}`;
    }
    const cruza = hora(programacion.hora_fin) <= hora(programacion.hora_inicio);
    return `Activa de ${hora(programacion.hora_inicio)} a ${hora(programacion.hora_fin)}`
        + `${cruza ? " (del día siguiente)" : ""} · ${textoDias(programacion.dias_semana)}`;
}

function renderizarProgramaciones(){
    const contenedor = $("listaProgramacionesPatrulla");
    if(!contenedor){
        return;
    }
    contenedor.replaceChildren();
    const lista = seleccionada?.programaciones || [];

    if(!lista.length){
        contenedor.appendChild(crearElemento("div", "lista-vacia", "Sin programaciones."));
    }

    for(const programacion of lista){
        const fila = crearElemento("div", "regla-card");
        const cabecera = crearElemento("div", "regla-cabecera");
        cabecera.append(
            crearElemento("span", "", describirProgramacion(programacion)),
            crearElemento("span", `chip ${programacion.habilitada ? "chip-activa" : "chip-inactiva"}`,
                programacion.habilitada ? "Habilitada" : "Deshabilitada")
        );
        const acciones = crearElemento("div", "acciones");
        acciones.append(
            crearBoton(programacion.habilitada ? "Deshabilitar" : "Habilitar", "boton boton-mini",
                () => void accion(
                    `${RUTA_PATRULLAS}/${seleccionada.id}/programaciones/${programacion.id}`,
                    {method: "PATCH", body: JSON.stringify({habilitada: !programacion.habilitada})},
                    "Programación actualizada."
                )),
            crearBoton("Borrar", "boton boton-mini boton-peligro", () => {
                if(window.confirm("¿Borrar esta programación?")){
                    void accion(
                        `${RUTA_PATRULLAS}/${seleccionada.id}/programaciones/${programacion.id}`,
                        {method: "DELETE"},
                        "Programación borrada."
                    );
                }
            })
        );
        cabecera.appendChild(acciones);
        fila.appendChild(cabecera);
        contenedor.appendChild(fila);
    }
}

function actualizarCamposProgramacion(){
    const modo = $("campoProgramacionModo")?.value || "VUELTA_FECHA";
    mostrarElemento("bloqueProgramacionFecha", modo === "VUELTA_FECHA");
    mostrarElemento("bloqueProgramacionHoraInicio", modo !== "VUELTA_FECHA");
    mostrarElemento("bloqueProgramacionHoraFin", modo === "ACTIVACION");
    mostrarElemento("bloqueProgramacionDias", modo !== "VUELTA_FECHA");
    const etiqueta = $("etiquetaProgramacionHoraInicio");
    if(etiqueta){
        etiqueta.textContent = modo === "ACTIVACION" ? "Desde" : "Hora de la vuelta";
    }
}

function leerProgramacion(){
    const modo = MODOS_PROGRAMACION[$("campoProgramacionModo")?.value];
    if(!modo){
        throw new Error("Elige el tipo de programación.");
    }
    const datos = {
        tipo_programacion: modo.tipo_programacion,
        tipo_recurrencia: modo.tipo_recurrencia,
        zona_horaria: ZONA,
        habilitada: Boolean($("campoProgramacionHabilitada")?.checked)
    };

    if(modo.tipo_recurrencia === "FECHA_CONCRETA"){
        const fecha = $("campoProgramacionFecha")?.value || "";
        if(!fecha){
            throw new Error("Indica el día y la hora de la vuelta.");
        }
        datos.fecha_hora_ejecucion = fecha;
        return datos;
    }

    const inicio = $("campoProgramacionHoraInicio")?.value || "";
    if(!/^\d{2}:\d{2}$/.test(inicio)){
        throw new Error("Indica la hora.");
    }
    const dias = [...document.querySelectorAll("#bloqueProgramacionDias input:checked")]
        .map(casilla => casilla.value).join("");
    if(!dias){
        throw new Error("Marca al menos un día de la semana.");
    }
    datos.hora_inicio = inicio;
    datos.dias_semana = dias;

    if(modo.tipo_programacion === "ACTIVACION_HORARIO"){
        const fin = $("campoProgramacionHoraFin")?.value || "";
        if(!/^\d{2}:\d{2}$/.test(fin)){
            throw new Error("Indica la hora de fin.");
        }
        if(fin === inicio){
            throw new Error("La hora de fin no puede ser igual a la de inicio.");
        }
        datos.hora_fin = fin;
    }
    return datos;
}

async function anadirProgramacion(){
    if(!seleccionada){
        return;
    }
    let datos;
    try{
        datos = leerProgramacion();
    }catch(error){
        estadoFormulario(textoError(error), "error");
        return;
    }
    await accion(
        `${RUTA_PATRULLAS}/${seleccionada.id}/programaciones`,
        {method: "POST", body: JSON.stringify(datos)},
        "Programación añadida."
    );
    if($("estadoFormularioPatrulla")?.textContent === "Programación añadida."){
        for(const id of ["campoProgramacionFecha", "campoProgramacionHoraInicio", "campoProgramacionHoraFin"]){
            if($(id)){
                $(id).value = "";
            }
        }
    }
}

/* ==========================================================
   CARGA, EVENTOS Y LIMPIEZA
   ========================================================== */

export async function cargarPatrullas(){
    if(!$("modulo-patrullas")){
        return;
    }
    const solicitud = ++secuenciaCarga;
    mostrarEstado($("estadoPatrullas"), "Cargando patrullas...", "info");
    try{
        const [datosCamaras, datosPatrullas] = await Promise.all([
            peticionJson(RUTA_CAMARAS),
            peticionJson(RUTA_PATRULLAS)
        ]);
        if(solicitud !== secuenciaCarga){
            return;
        }
        if(!Array.isArray(datosCamaras) || !Array.isArray(datosPatrullas)){
            throw new Error("La API no ha devuelto catálogos válidos.");
        }
        camaras = datosCamaras;
        patrullas = datosPatrullas;
        actualizarSelectCamaras();
        renderizarListado();
        const activas = patrullas.filter(patrulla => patrulla.activa).length;
        mostrarEstado(
            $("estadoPatrullas"),
            `${patrullas.length} patrullas registradas, ${activas} activas.`,
            "ok"
        );
    }catch(error){
        if(solicitud !== secuenciaCarga){
            return;
        }
        mostrarEstado($("estadoPatrullas"), textoError(error), "error");
        throw error;
    }
}

export function configurarEventosPatrullas(){
    if(eventosConfigurados || !$("modulo-patrullas")){
        return;
    }
    eventosConfigurados = true;

    for(const id of ["filtroPatrullaTexto", "filtroPatrullaCamara", "filtroPatrullaEstado"]){
        $(id)?.addEventListener("input", renderizarListado);
    }
    $("botonRecargarPatrullas")?.addEventListener(
        "click", () => void cargarPatrullas().catch(console.error)
    );
    $("botonNuevaPatrulla")?.addEventListener("click", nuevaPatrulla);
    $("botonCancelarPatrulla")?.addEventListener("click", cerrarEditor);
    $("formularioPatrulla")?.addEventListener("submit", evento => void guardarPatrulla(evento));
    $("campoPatrullaCamara")?.addEventListener("change", () => {
        for(const orden of ordenes){
            orden.preset_id = null;
        }
        void cargarPresets($("campoPatrullaCamara")?.value);
    });
    $("campoPatrullaPresetInicial")?.addEventListener("change", actualizarResumenVuelta);
    $("botonAnadirOrdenPatrulla")?.addEventListener("click", () => {
        ordenes.push(ordenNueva(ordenes.at(-1)?.tipo === "MOVER_A_PRESET" ? "ESPERAR" : "MOVER_A_PRESET"));
        renderizarOrdenes();
    });
    $("botonActivarPatrulla")?.addEventListener("click", activarODesactivar);
    $("botonVueltaPatrulla")?.addEventListener("click", ejecutarVuelta);
    $("botonBorrarPatrulla")?.addEventListener("click", () => void borrarPatrulla());
    $("campoProgramacionModo")?.addEventListener("change", actualizarCamposProgramacion);
    $("botonAnadirProgramacionPatrulla")?.addEventListener("click", () => void anadirProgramacion());

    actualizarCamposProgramacion();
    mostrarEditor(false);
}

export function limpiarPatrullas(){
    ++secuenciaCarga;
    ++secuenciaSeleccion;
    ++secuenciaPresets;
    patrullas = [];
    camaras = [];
    presets = [];
    ordenes = [];
    seleccionada = null;
    idSeleccionado = null;
    guardando = false;
    $("formularioPatrulla")?.reset();
    mostrarEditor(false);
    $("listaPatrullas")?.replaceChildren();
    mostrarEstado($("estadoPatrullas"), "");
    estadoFormulario("");
}

// Fin de fichero: js/administracion/patrullas.js
