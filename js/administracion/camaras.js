
/*
 * MeteoArchidona · Administración de cámaras y presets PTZ.
 *
 * La API es la fuente de verdad. MeteoCam sincronizará los datos
 * técnicos; desde Administración únicamente se modifican los
 * nombres públicos, la habilitación y el preset activo de cámara.
 *
 * GET   /admin/camaras
 * PATCH /admin/camaras/{id}
 * GET   /admin/camaras/{id}/presets
 * PATCH /admin/camaras/{id}/presets/{preset_id}
 *
 * La selección administrativa de un preset NO mueve la cámara.
 */

import {
    $,
    estadoAdministracion,
    mostrarEstado
} from "./estado.js";

import {
    peticionJson
} from "./api.js";

const RUTA_CAMARAS = "/admin/camaras";

let camaras = [];
let camaraSeleccionadaId = null;
let presets = [];
let cargandoPresets = false;
let errorCargaPresets = null;
let solicitudPresets = 0;
let eventosConfigurados = false;
let guardando = false;
let guardandoPresetId = null;


/* ==========================================================
   UTILIDADES
   ========================================================== */

function nombreEstacion(estacionId){
    const estacion = estadoAdministracion.estaciones.find(
        item => item.id === estacionId
    );
    return estacion
        ? (estacion.nombre_publico || estacion.codigo)
        : `Estación ${estacionId}`;
}

function nombreCamara(camara){
    return camara.nombre_publico
        || camara.nombre_tecnico
        || `${camara.tipo_vista} · Cámara ${camara.id}`;
}

function nombrePreset(preset){
    return preset.nombre_publico
        || preset.nombre_tecnico
        || `Preset ${preset.identificador_preset}`;
}

function admitePresets(camara){
    return Boolean(
        camara
        && camara.tipo_vista === "PTZ"
        && camara.capacidad_preset === true
    );
}

function camaraSeleccionada(){
    return camaras.find(
        item => item.id === camaraSeleccionadaId
    ) || null;
}

function textoFecha(valor){
    if(!valor){
        return "—";
    }
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime())
        ? "—"
        : fecha.toLocaleString("es-ES");
}

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

function agregarChip(contenedor, texto, clase = ""){
    contenedor.appendChild(
        crearElemento("span", `chip ${clase}`.trim(), texto)
    );
}

function mostrarElemento(elemento, visible){
    if(!elemento){
        return;
    }
    elemento.hidden = !visible;
    elemento.classList.toggle("oculto", !visible);
}


/* ==========================================================
   FILTROS Y LISTADO DE CÁMARAS
   ========================================================== */

function actualizarFiltroEstaciones(){
    const selector = $("filtroCamaraEstacion");
    if(!selector){
        return;
    }
    const valorAnterior = selector.value;
    selector.replaceChildren(
        new Option("Todas las estaciones", "")
    );
    for(const estacion of estadoAdministracion.estaciones){
        selector.appendChild(
            new Option(
                estacion.nombre_publico || estacion.codigo,
                String(estacion.id)
            )
        );
    }
    if([...selector.options].some(
        opcion => opcion.value === valorAnterior
    )){
        selector.value = valorAnterior;
    }
}

function obtenerCamarasFiltradas(){
    const texto = ($("filtroCamaraTexto")?.value || "")
        .trim().toLocaleLowerCase("es-ES");
    const estacion = $("filtroCamaraEstacion")?.value || "";
    const habilitacion = $("filtroCamaraHabilitada")?.value || "";

    return camaras.filter(camara => {
        if(estacion && String(camara.estacion_id) !== estacion){
            return false;
        }
        if(habilitacion === "si" && !camara.habilitada){
            return false;
        }
        if(habilitacion === "no" && camara.habilitada){
            return false;
        }
        if(!texto){
            return true;
        }
        const datos = [
            camara.id,
            nombreCamara(camara),
            camara.nombre_tecnico,
            camara.identificador_dispositivo,
            camara.identificador_vista,
            camara.modelo,
            nombreEstacion(camara.estacion_id)
        ];
        return datos.some(valor => String(valor ?? "")
            .toLocaleLowerCase("es-ES").includes(texto));
    });
}

function renderizarListado(){
    const contenedor = $("listaCamaras");
    if(!contenedor){
        return;
    }
    contenedor.replaceChildren();
    const resultado = obtenerCamarasFiltradas();
    if(!resultado.length){
        contenedor.appendChild(
            crearElemento(
                "div", "lista-vacia",
                camaras.length
                    ? "No hay cámaras que coincidan con los filtros."
                    : "Todavía no hay cámaras registradas."
            )
        );
        return;
    }

    for(const camara of resultado){
        const boton = crearElemento(
            "button",
            "estacion-card" + (
                camara.id === camaraSeleccionadaId ? " seleccionada" : ""
            )
        );
        boton.type = "button";
        boton.disabled = guardando;
        boton.append(
            crearElemento(
                "div", "estacion-codigo",
                `#${camara.id} · ${nombreEstacion(camara.estacion_id)}`
            ),
            crearElemento("div", "estacion-nombre", nombreCamara(camara))
        );
        const chips = crearElemento("div", "chips");
        agregarChip(chips, camara.tipo_vista);
        agregarChip(
            chips,
            camara.habilitada ? "Habilitada" : "Deshabilitada",
            camara.habilitada ? "chip-activa" : "chip-inactiva"
        );
        agregarChip(
            chips,
            camara.en_linea ? "En línea" : "Sin conexión",
            camara.en_linea ? "chip-activa" : "chip-inactiva"
        );
        boton.appendChild(chips);
        boton.addEventListener("click", () => seleccionarCamara(camara.id));
        contenedor.appendChild(boton);
    }
}


/* ==========================================================
   DETALLES TÉCNICOS
   ========================================================== */

function renderizarDetalles(camara){
    const contenedor = $("datosTecnicosCamara");
    if(!contenedor){
        return;
    }
    contenedor.replaceChildren();
    if(!camara){
        contenedor.appendChild(
            crearElemento("div", "lista-vacia", "Selecciona una cámara.")
        );
        return;
    }

    const activo = camara.preset_activo_id;
    const presetActivo = presets.find(item => item.id === activo);
    const detalles = [
        ["Estación", nombreEstacion(camara.estacion_id)],
        ["Integración", camara.codigo_integracion],
        ["Dispositivo", camara.identificador_dispositivo],
        ["Vista", camara.identificador_vista],
        ["Tipo de vista", camara.tipo_vista],
        ["Fabricante", camara.fabricante],
        ["Modelo", camara.modelo],
        ["N.º de serie", camara.numero_serie],
        ["Firmware", camara.firmware],
        ["Agente MeteoCam", camara.identificador_agente],
        ["Captura", camara.capacidad_captura ? "Sí" : "No"],
        ["Streaming", camara.capacidad_stream ? "Sí" : "No"],
        ["PTZ", camara.capacidad_ptz ? "Sí" : "No"],
        ["Presets", camara.capacidad_preset ? "Sí" : "No"],
        ["Preset activo", !admitePresets(camara)
            ? "No aplicable"
            : activo == null
                ? "Sin asignar"
                : presetActivo
                    ? `${nombrePreset(presetActivo)} (#${activo})`
                    : `#${activo}`],
        ["Conexión informada", camara.en_linea ? "En línea" : "Sin conexión"],
        ["Última detección", textoFecha(camara.fecha_ultima_deteccion)],
        ["Última sincronización", textoFecha(camara.fecha_ultima_sincronizacion)]
    ];

    for(const [etiqueta, valor] of detalles){
        const ficha = crearElemento("div", "metadato");
        ficha.append(
            crearElemento("div", "metadato-etiqueta", etiqueta),
            crearElemento("div", "metadato-valor", valor ?? "—")
        );
        contenedor.appendChild(ficha);
    }
}


/* ==========================================================
   SELECTOR DEL PRESET ACTIVO
   ========================================================== */

function renderizarSelectorPreset(camara){
    const visible = admitePresets(camara);
    mostrarElemento($("bloqueCamaraPresetActivo"), visible);
    mostrarElemento($("seccionPresetsCamara"), visible);

    const selector = $("campoCamaraPresetActivo");
    if(!selector){
        return;
    }
    selector.replaceChildren();
    selector.disabled = true;

    if(!visible){
        selector.add(new Option("No aplicable", ""));
        return;
    }
    if(cargandoPresets){
        selector.add(new Option("Cargando presets...", ""));
        return;
    }
    if(errorCargaPresets){
        selector.add(new Option("Error al consultar los presets", ""));
        return;
    }

    const disponibles = presets.filter(preset => preset.disponible);
    if(!disponibles.length){
        selector.add(new Option("No hay presets disponibles", ""));
        return;
    }

    const activo = camara.preset_activo_id;
    const activoValido = disponibles.some(preset => preset.id === activo);
    if(!activoValido){
        const etiqueta = activo == null
            ? "Selecciona el preset activo"
            : `Preset anterior no disponible (#${activo})`;
        const opcion = new Option(etiqueta, "");
        opcion.disabled = true;
        selector.add(opcion);
    }

    for(const preset of disponibles){
        selector.add(new Option(
            `${nombrePreset(preset)} · ${preset.identificador_preset}`,
            String(preset.id)
        ));
    }

    if(activoValido){
        selector.value = String(activo);
    }else if(disponibles.length === 1 && activo == null){
        // Facilita establecer el primer y único preset mediante
        // Guardar cambios, pero NO persiste sin la acción del usuario.
        selector.value = String(disponibles[0].id);
    }else{
        selector.value = "";
    }

    selector.disabled = guardando;
}


/* ==========================================================
   CATÁLOGO Y EDICIÓN DE PRESETS
   ========================================================== */

function renderizarPresets(){
    const contenedor = $("listaPresetsCamara");
    if(!contenedor){
        return;
    }
    contenedor.replaceChildren();
    const camara = camaraSeleccionada();
    if(!admitePresets(camara)){
        return;
    }
    if(cargandoPresets){
        contenedor.appendChild(
            crearElemento("div", "lista-vacia", "Cargando catálogo de presets...")
        );
        return;
    }
    if(errorCargaPresets){
        contenedor.appendChild(
            crearElemento("div", "lista-vacia", "No se han podido cargar los presets.")
        );
        return;
    }
    if(!presets.length){
        contenedor.appendChild(
            crearElemento(
                "div", "lista-vacia",
                "No hay presets registrados. Los sincronizará MeteoCam."
            )
        );
        return;
    }

    for(const preset of presets){
        const tarjeta = crearElemento("div", "estacion-card");
        tarjeta.append(
            crearElemento(
                "div", "estacion-codigo",
                `#${preset.id} · Identificador técnico: ${preset.identificador_preset}`
            ),
            crearElemento("div", "estacion-nombre", nombrePreset(preset))
        );

        const chips = crearElemento("div", "chips");
        agregarChip(
            chips,
            preset.disponible ? "Disponible" : "No disponible",
            preset.disponible ? "chip-activa" : "chip-inactiva"
        );
        if(preset.id === camara.preset_activo_id){
            agregarChip(chips, "Preset activo", "chip-activa");
        }
        tarjeta.appendChild(chips);

        const campo = crearElemento("div", "campo");
        const idCampo = `nombre-publico-preset-${preset.id}`;
        const etiqueta = crearElemento("label", "", "Nombre público del preset");
        etiqueta.htmlFor = idCampo;
        const entrada = crearElemento("input");
        entrada.id = idCampo;
        entrada.type = "text";
        entrada.maxLength = 250;
        entrada.autocomplete = "off";
        entrada.value = preset.nombre_publico || "";
        entrada.placeholder = preset.nombre_tecnico || "Nombre público opcional";
        entrada.disabled = guardandoPresetId !== null;
        campo.append(
            etiqueta,
            entrada,
            crearElemento(
                "div", "campo-ayuda",
                `Nombre técnico: ${preset.nombre_tecnico || "—"}. `
                + "Solo se modifica el nombre público."
            )
        );

        const acciones = crearElemento("div", "acciones-formulario");
        const boton = crearElemento(
            "button", "boton boton-secundario", "Guardar nombre"
        );
        boton.type = "button";
        boton.disabled = guardandoPresetId !== null;
        const estado = crearElemento("div", "estado-formulario");
        estado.setAttribute("role", "status");
        estado.setAttribute("aria-live", "polite");
        boton.addEventListener("click", () => {
            void guardarNombrePreset(camara.id, preset, entrada, boton, estado);
        });
        acciones.appendChild(boton);
        tarjeta.append(campo, acciones, estado);
        contenedor.appendChild(tarjeta);
    }
}

async function guardarNombrePreset(camaraId, preset, entrada, boton, estado){
    if(guardandoPresetId !== null || camaraSeleccionadaId !== camaraId){
        return;
    }
    const nombre = entrada.value.trim();
    if(nombre === (preset.nombre_publico || "")){
        mostrarEstado(estado, "No hay cambios que guardar.", "info");
        return;
    }
    guardandoPresetId = preset.id;
    entrada.disabled = true;
    boton.disabled = true;
    mostrarEstado(estado, "Guardando nombre del preset...", "info");

    try{
        const actualizado = await peticionJson(
            `${RUTA_CAMARAS}/${camaraId}/presets/${preset.id}`,
            {
                method: "PATCH",
                body: JSON.stringify({nombre_publico: nombre || null})
            }
        );
        if(camaraSeleccionadaId !== camaraId){
            return;
        }
        presets = presets.map(
            item => item.id === actualizado.id ? actualizado : item
        );
        guardandoPresetId = null;
        mostrarEstado(
            $("estadoPresetsCamara"),
            `Nombre del preset #${preset.id} actualizado.`,
            "ok"
        );
        renderizarPresets();
        renderizarDetalles(camaraSeleccionada());
    }catch(error){
        if(camaraSeleccionadaId === camaraId){
            mostrarEstado(
                estado,
                error.message || "No se ha podido actualizar el preset.",
                "error"
            );
        }
    }finally{
        guardandoPresetId = null;
        if(camaraSeleccionadaId === camaraId){
            entrada.disabled = false;
            boton.disabled = false;
            // Rehabilitar también las tarjetas si la selección cambió
            // mientras estaba en curso esta petición.
            for(const elemento of $("listaPresetsCamara")?.querySelectorAll(
                "input, button"
            ) || []){
                elemento.disabled = false;
            }
        }
    }
}


/* ==========================================================
   CARGA DE PRESETS DE LA CÁMARA SELECCIONADA
   ========================================================== */

function descartarPresetsPendientes(){
    solicitudPresets += 1;
    presets = [];
    cargandoPresets = false;
    errorCargaPresets = null;
}

async function cargarPresetsCamara(camaraId){
    const camara = camaraSeleccionada();
    if(!camara || camara.id !== camaraId || !admitePresets(camara)){
        return;
    }
    const solicitud = ++solicitudPresets;
    cargandoPresets = true;
    errorCargaPresets = null;
    presets = [];
    renderizarSelectorPreset(camara);
    renderizarPresets();
    mostrarEstado($("estadoPresetsCamara"), "Cargando presets...", "info");

    try{
        const resultado = await peticionJson(
            `${RUTA_CAMARAS}/${camaraId}/presets`
        );
        if(solicitud !== solicitudPresets || camaraSeleccionadaId !== camaraId){
            return;
        }
        if(!Array.isArray(resultado) || resultado.some(
            item => item.camara_id !== camaraId
        )){
            throw new Error("La API no ha devuelto un catálogo válido de presets.");
        }
        presets = resultado;
        cargandoPresets = false;
        renderizarSelectorPreset(camaraSeleccionada());
        renderizarPresets();
        renderizarDetalles(camaraSeleccionada());
        mostrarEstado(
            $("estadoPresetsCamara"),
            `${presets.length} presets registrados para esta cámara.`,
            "ok"
        );
    }catch(error){
        if(solicitud !== solicitudPresets || camaraSeleccionadaId !== camaraId){
            return;
        }
        cargandoPresets = false;
        errorCargaPresets = error;
        renderizarSelectorPreset(camaraSeleccionada());
        renderizarPresets();
        mostrarEstado(
            $("estadoPresetsCamara"),
            error.message || "No se han podido cargar los presets.",
            "error"
        );
    }
}


/* ==========================================================
   FORMULARIO DE CÁMARA
   ========================================================== */

function renderizarSeleccion(){
    const camara = camaraSeleccionada();
    const nombre = $("campoCamaraNombrePublico");
    const habilitada = $("campoCamaraHabilitada");
    const guardar = $("botonGuardarCamara");
    const titulo = $("tituloFormularioCamara");

    if(titulo){
        titulo.textContent = camara
            ? `Cámara #${camara.id} · ${camara.tipo_vista}`
            : "Selecciona una cámara";
    }
    if(nombre){
        nombre.value = camara?.nombre_publico || "";
        nombre.disabled = !camara || guardando;
    }
    if(habilitada){
        habilitada.checked = camara?.habilitada === true;
        habilitada.disabled = !camara || guardando;
    }
    if(guardar){
        guardar.disabled = !camara || guardando;
    }
    renderizarSelectorPreset(camara);
    renderizarDetalles(camara);
    renderizarPresets();
}

function seleccionarCamara(camaraId){
    if(guardando){
        return;
    }
    camaraSeleccionadaId = camaraId;
    descartarPresetsPendientes();
    renderizarListado();
    renderizarSeleccion();
    mostrarEstado($("estadoFormularioCamara"), "");
    mostrarEstado($("estadoPresetsCamara"), "");
    const camara = camaraSeleccionada();
    if(admitePresets(camara)){
        void cargarPresetsCamara(camaraId);
    }
}

async function guardarCamara(evento){
    evento.preventDefault();
    if(guardando){
        return;
    }
    const camara = camaraSeleccionada();
    if(!camara){
        return;
    }
    const campoNombre = $("campoCamaraNombrePublico");
    const campoHabilitada = $("campoCamaraHabilitada");
    if(!campoNombre || !campoHabilitada){
        return;
    }
    const nombre = campoNombre.value.trim();
    const habilitada = campoHabilitada.checked;
    const cambios = {};
    if(nombre !== (camara.nombre_publico || "")){
        cambios.nombre_publico = nombre || null;
    }
    if(habilitada !== camara.habilitada){
        cambios.habilitada = habilitada;
    }

    const selector = $("campoCamaraPresetActivo");
    if(admitePresets(camara) && selector && !selector.disabled){
        const idSeleccionado = Number(selector.value);
        if(
            selector.value !== ""
            && Number.isSafeInteger(idSeleccionado)
            && idSeleccionado > 0
            && presets.some(preset => preset.id === idSeleccionado && preset.disponible)
            && idSeleccionado !== camara.preset_activo_id
        ){
            cambios.preset_activo_id = idSeleccionado;
        }
    }

    if(!Object.keys(cambios).length){
        mostrarEstado(
            $("estadoFormularioCamara"), "No hay cambios que guardar.", "info"
        );
        return;
    }

    guardando = true;
    const idCamara = camara.id;
    const boton = $("botonGuardarCamara");
    if(boton){
        boton.disabled = true;
    }
    campoNombre.disabled = true;
    campoHabilitada.disabled = true;
    if(selector){
        selector.disabled = true;
    }
    renderizarListado();
    mostrarEstado($("estadoFormularioCamara"), "Guardando cambios...", "info");

    let correcto = false;
    try{
        const actualizada = await peticionJson(
            `${RUTA_CAMARAS}/${idCamara}`,
            {method: "PATCH", body: JSON.stringify(cambios)}
        );
        camaras = camaras.map(
            item => item.id === actualizada.id ? actualizada : item
        );
        correcto = true;
        mostrarEstado($("estadoFormularioCamara"), "Cámara actualizada.", "ok");
    }catch(error){
        mostrarEstado(
            $("estadoFormularioCamara"),
            error.message || "No se ha podido actualizar la cámara.",
            "error"
        );
    }finally{
        guardando = false;
        renderizarListado();
        if(correcto){
            renderizarSeleccion();
        }else{
            campoNombre.disabled = false;
            campoHabilitada.disabled = false;
            if(boton){
                boton.disabled = false;
            }
            // Conservar lo que el usuario había seleccionado para
            // permitir reintentar el guardado tras un error.
            if(selector){
                selector.disabled = !admitePresets(camara)
                    || cargandoPresets || Boolean(errorCargaPresets)
                    || !presets.some(preset => preset.disponible);
            }
        }
    }
}


/* ==========================================================
   CARGA DE CÁMARAS
   ========================================================== */

export async function cargarCamaras(){
    try{
        const resultado = await peticionJson(RUTA_CAMARAS);
        if(!Array.isArray(resultado)){
            throw new Error("La API no ha devuelto un catálogo válido de cámaras.");
        }
        camaras = resultado;
        if(!camaras.some(item => item.id === camaraSeleccionadaId)){
            camaraSeleccionadaId = null;
        }
        descartarPresetsPendientes();
        actualizarFiltroEstaciones();
        renderizarListado();
        renderizarSeleccion();
        mostrarEstado(
            $("estadoCamaras"), `${camaras.length} cámaras registradas.`, "ok"
        );
        mostrarEstado($("estadoPresetsCamara"), "");
        const camara = camaraSeleccionada();
        if(admitePresets(camara)){
            await cargarPresetsCamara(camara.id);
        }
    }catch(error){
        mostrarEstado(
            $("estadoCamaras"),
            error.message || "No se ha podido cargar el catálogo de cámaras.",
            "error"
        );
        throw error;
    }
}


/* ==========================================================
   EVENTOS Y LIMPIEZA
   ========================================================== */

export function configurarEventosCamaras(){
    if(eventosConfigurados || !$("listaCamaras")){
        return;
    }
    eventosConfigurados = true;
    for(const id of [
        "filtroCamaraTexto",
        "filtroCamaraEstacion",
        "filtroCamaraHabilitada"
    ]){
        $(id)?.addEventListener("input", renderizarListado);
    }
    $("botonRecargarCamaras")?.addEventListener("click", () => {
        void cargarCamaras().catch(() => {});
    });
    $("botonRecargarPresetsCamara")?.addEventListener("click", () => {
        const camara = camaraSeleccionada();
        if(admitePresets(camara)){
            void cargarPresetsCamara(camara.id);
        }
    });
    $("formularioCamara")?.addEventListener("submit", guardarCamara);
    renderizarSeleccion();
}

export function limpiarCamaras(){
    camaras = [];
    camaraSeleccionadaId = null;
    descartarPresetsPendientes();
    guardando = false;
    guardandoPresetId = null;
    $("listaCamaras")?.replaceChildren();
    $("listaPresetsCamara")?.replaceChildren();
    mostrarEstado($("estadoCamaras"), "");
    mostrarEstado($("estadoFormularioCamara"), "");
    mostrarEstado($("estadoPresetsCamara"), "");
    renderizarSeleccion();
}


// Fin de fichero: js/administracion/camaras.js
