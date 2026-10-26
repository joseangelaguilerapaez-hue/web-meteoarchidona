
/*
 * MeteoArchidona
 * Administración · Programaciones de timelapse de cámara.
 *
 * GET   /admin/timelapses/programaciones
 * GET   /admin/timelapses/programaciones/{id}
 * POST  /admin/timelapses/programaciones
 * PATCH /admin/timelapses/programaciones/{id}
 *
 * Las programaciones son recetas de configuración.
 * Este módulo NO captura fotogramas, NO genera vídeos
 * y NO mueve físicamente las cámaras ni sus presets.
 */

import {
    $,
    estadoAdministracion,
    mostrarEstado
} from "./estado.js?v=20261026-cache1";

import {
    peticionJson
} from "./api.js?v=20261026-cache1";

const RUTA_PROGRAMACIONES = "/admin/timelapses/programaciones";
const RUTA_CAMARAS = "/admin/camaras";

const TIPOS = {
    EVENTO_SOLAR: "Evento solar",
    HORA_FIJA: "Hora fija",
    PERIODICA: "Periódica",
    MANUAL: "Manual"
};

const CAMPOS = {
    codigo: "campoTimelapseCodigo",
    nombre: "campoTimelapseNombre",
    descripcion: "campoTimelapseDescripcion",
    camara_id: "campoTimelapseCamara",
    camara_preset_id: "campoTimelapsePreset",
    nivel_zoom: "campoTimelapseZoom",
    tipo_programacion: "campoTimelapseTipo",
    evento_solar: "campoTimelapseEventoSolar",
    zona_horaria: "campoTimelapseZonaHoraria",
    hora_local: "campoTimelapseHoraLocal",
    regla_recurrencia: "campoTimelapseReglaRecurrencia",
    desfase_inicio_segundos: "campoTimelapseDesfaseInicioSegundos",
    duracion_segundos: "campoTimelapseDuracionSegundos",
    intervalo_captura_segundos: "campoTimelapseIntervaloCapturaSegundos",
    fps_salida: "campoTimelapseFpsSalida",
    retencion_dias: "campoTimelapseRetencionDias",
    activa: "campoTimelapseActiva"
};

let programaciones = [];
let camaras = [];
let presets = [];
let programacionSeleccionada = null;
let idSeleccionado = null;
let editorAbierto = false;
let guardando = false;
let eventosConfigurados = false;
let secuenciaCarga = 0;
let secuenciaSeleccion = 0;
let secuenciaPresets = 0;

/* ==========================================================
   UTILIDADES
   ========================================================== */

function valorCampo(nombre){
    return $(CAMPOS[nombre]);
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

function enteroObligatorio(valor, etiqueta, minimo = 1){
    const texto = String(valor ?? "").trim();
    const numero = Number(texto);
    if(!texto || !Number.isSafeInteger(numero) || numero < minimo){
        throw new Error(`${etiqueta}: introduce un número entero de al menos ${minimo}.`);
    }
    return numero;
}

function enteroOpcional(valor, etiqueta){
    const texto = String(valor ?? "").trim();
    return texto ? enteroObligatorio(texto, etiqueta) : null;
}

function enteroOpcionalDesde(valor, etiqueta, minimo){
    const texto = String(valor ?? "").trim();
    return texto ? enteroObligatorio(texto, etiqueta, minimo) : null;
}

function textoOpcional(valor){
    return String(valor ?? "").trim() || null;
}

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
        || `Cámara ${camara.id}`;
}

/*
 * Construye el nombre visible de la cámara.
 *
 * Si el nombre público ya coincide con el tipo
 * de vista, no se repite.
 *
 * Si tiene un nombre personalizado, se conserva
 * y se añade el tipo de vista para dar contexto.
 *
 * Nunca se utiliza PTZ como denominación pública.
 */
function etiquetaCamara(camara){
    const vista = camara.tipo_vista === "PTZ"
        ? "Vista específica"
        : camara.tipo_vista === "PANORAMICA"
            ? "Vista panorámica"
            : (camara.tipo_vista || "Cámara");

    const nombre = nombreCamara(camara).trim();

    if(
        nombre.localeCompare(
            vista,
            "es",
            {sensitivity: "base"}
        ) === 0
    ){
        return vista;
    }

    return `${nombre} · ${vista}`;
}

/*
 * Identifica de forma inequívoca cada cámara.
 *
 * Cuando varias cámaras de una misma estación
 * tienen la misma etiqueta, se añade el ID.
 *
 * Así se permiten dos o más vistas panorámicas
 * sin crear opciones indistinguibles.
 */
function descripcionCamara(camara){
    const etiqueta = etiquetaCamara(camara);

    const repetida = camaras.some(otra =>
        otra.id !== camara.id
        &&
        otra.estacion_id === camara.estacion_id
        &&
        etiquetaCamara(otra).localeCompare(
            etiqueta,
            "es",
            {sensitivity: "base"}
        ) === 0
    );

    const identificador = repetida
        ? ` · #${camara.id}`
        : "";

    return (
        `${nombreEstacion(camara.estacion_id)} · `
        +
        etiqueta
        +
        identificador
    );
}

function camaraPorId(id){
    return camaras.find(item => item.id === Number(id)) || null;
}

function nombrePreset(preset){
    return preset.nombre_publico
        || preset.nombre_tecnico
        || `Preset ${preset.identificador_preset}`;
}

function admitePreset(camara){
    return Boolean(
        camara &&
        camara.tipo_vista === "PTZ" &&
        camara.capacidad_preset === true
    );
}

function horaParaInput(hora){
    return hora ? String(hora).slice(0, 5) : "";
}

/* ==========================================================
   CATÁLOGO DE CÁMARAS Y PRESETS
   ========================================================== */

function actualizarSelectCamaras(){
    const selector = valorCampo("camara_id");
    const filtro = $("filtroTimelapseCamara");
    const valorAnterior = selector?.value || "";
    const filtroAnterior = filtro?.value || "";

    if(selector){
        selector.replaceChildren(new Option("Selecciona una cámara", ""));
    }
    if(filtro){
        filtro.replaceChildren(new Option("Todas las cámaras", ""));
    }

    for(const camara of camaras){
        const nombre = descripcionCamara(camara);
        if(selector){
            const opcion = new Option(
                camara.habilitada ? nombre : `${nombre} (deshabilitada)`,
                String(camara.id)
            );
            selector.add(opcion);
        }
        if(filtro){
            filtro.add(new Option(nombre, String(camara.id)));
        }
    }

    if(selector && [...selector.options].some(op => op.value === valorAnterior)){
        selector.value = valorAnterior;
    }
    if(filtro && [...filtro.options].some(op => op.value === filtroAnterior)){
        filtro.value = filtroAnterior;
    }
}

async function cargarPresetsSeleccionados(camaraId, presetId = null){
    const solicitud = ++secuenciaPresets;
    const selector = valorCampo("camara_preset_id");
    if(!selector){
        return;
    }

    presets = [];
    selector.replaceChildren(new Option("Sin cambio de posición", ""));
    selector.disabled = true;

    const camara = camaraPorId(camaraId);
    const admite = admitePreset(camara);
    mostrarElemento("bloqueTimelapsePreset", admite);
    mostrarElemento("bloqueTimelapseZoom", admite);

    if(!admite){
        return;
    }

    selector.replaceChildren(new Option("Cargando presets...", ""));

    try{
        const resultado = await peticionJson(
            `${RUTA_CAMARAS}/${camara.id}/presets`
        );
        if(solicitud !== secuenciaPresets){
            return;
        }
        if(!Array.isArray(resultado)){
            throw new Error("La API no ha devuelto un catálogo válido de presets.");
        }

        presets = resultado;
        selector.replaceChildren(new Option("Sin cambio de posición", ""));
        for(const preset of presets){
            if(preset.disponible !== true){
                continue;
            }
            selector.add(new Option(
                `${nombrePreset(preset)} · ${preset.identificador_preset}`,
                String(preset.id)
            ));
        }

        if(presetId !== null && presetId !== undefined){
            const existe = [...selector.options].some(
                opcion => opcion.value === String(presetId)
            );
            if(!existe){
                const opcion = new Option(
                    `Preset #${presetId} no disponible (selecciona otro)`,
                    String(presetId)
                );
                opcion.disabled = true;
                selector.add(opcion);
            }
            selector.value = String(presetId);
        }
        selector.disabled = guardando;
    }catch(error){
        if(solicitud !== secuenciaPresets){
            return;
        }
        selector.replaceChildren(new Option("Error al cargar presets", ""));
        mostrarEstado($("estadoFormularioTimelapse"), textoError(error), "error");
    }
}

/* ==========================================================
   VISIBILIDAD DE CAMPOS SEGÚN PROGRAMACIÓN
   ========================================================== */

function actualizarCamposTipo(){
    const tipo = valorCampo("tipo_programacion")?.value || "";
    mostrarElemento("bloqueTimelapseEventoSolar", tipo === "EVENTO_SOLAR");
    mostrarElemento("bloqueTimelapseDesfaseInicio", tipo === "EVENTO_SOLAR");
    mostrarElemento("bloqueTimelapseHoraLocal", tipo === "HORA_FIJA");
    mostrarElemento("bloqueTimelapseRecurrencia", tipo === "PERIODICA");
}

/* ==========================================================
   LISTADO
   ========================================================== */

function programacionesFiltradas(){
    const busqueda = ($("filtroTimelapseTexto")?.value || "")
        .trim().toLocaleLowerCase("es-ES");
    const camaraId = $("filtroTimelapseCamara")?.value || "";
    const estado = $("filtroTimelapseEstado")?.value || "";

    return programaciones.filter(programacion => {
        if(camaraId && String(programacion.camara_id) !== camaraId){
            return false;
        }
        if(estado === "activas" && !programacion.activa){
            return false;
        }
        if(estado === "inactivas" && programacion.activa){
            return false;
        }
        if(!busqueda){
            return true;
        }
        const camara = camaraPorId(programacion.camara_id);
        return [
            programacion.codigo,
            programacion.nombre,
            programacion.descripcion,
            programacion.tipo_programacion,
            camara ? descripcionCamara(camara) : programacion.camara_id
        ].some(valor => String(valor ?? "")
            .toLocaleLowerCase("es-ES").includes(busqueda));
    });
}

function renderizarListado(){
    const contenedor = $("listaProgramacionesTimelapse");
    if(!contenedor){
        return;
    }
    contenedor.replaceChildren();

    const resultado = programacionesFiltradas();
    if(!resultado.length){
        contenedor.appendChild(crearElemento(
            "div", "lista-vacia",
            programaciones.length
                ? "No hay programaciones que coincidan con los filtros."
                : "Todavía no hay programaciones de timelapse."
        ));
        return;
    }

    for(const programacion of resultado){
        const camara = camaraPorId(programacion.camara_id);
        const tarjeta = crearElemento(
            "button",
            `estacion-card${programacion.id === idSeleccionado ? " seleccionada" : ""}`
        );
        tarjeta.type = "button";
        tarjeta.disabled = guardando;
        tarjeta.append(
            crearElemento("div", "estacion-codigo", programacion.codigo),
            crearElemento("div", "estacion-nombre", programacion.nombre),
            crearElemento(
                "div", "estacion-localizacion",
                camara ? descripcionCamara(camara) : `Cámara #${programacion.camara_id}`
            )
        );
        const chips = crearElemento("div", "chips");
        chips.append(
            crearElemento("span", "chip", TIPOS[programacion.tipo_programacion]
                || programacion.tipo_programacion),
            crearElemento(
                "span",
                `chip ${programacion.activa ? "chip-activa" : "chip-inactiva"}`,
                programacion.activa ? "Activa" : "Inactiva"
            )
        );
        tarjeta.appendChild(chips);
        tarjeta.addEventListener("click", () => void seleccionarProgramacion(programacion.id));
        contenedor.appendChild(tarjeta);
    }
}

/* ==========================================================
   EDICIÓN
   ========================================================== */

function mostrarEditor(visible){
    mostrarElemento("panelFormularioTimelapse", visible);
    editorAbierto = visible;
}

function rellenarFormulario(datos){
    for(const [nombre, id] of Object.entries(CAMPOS)){
        const campo = $(id);
        if(!campo){
            continue;
        }
        if(nombre === "activa"){
            campo.checked = datos.activa ?? true;
        }else if(nombre === "hora_local"){
            campo.value = horaParaInput(datos.hora_local);
        }else{
            campo.value = datos[nombre] ?? "";
        }
    }
    actualizarCamposTipo();
}

function nuevoFormulario(){
    if(guardando){
        return;
    }
    ++secuenciaSeleccion;
    ++secuenciaPresets;
    idSeleccionado = null;
    programacionSeleccionada = null;
    presets = [];

    rellenarFormulario({
        zona_horaria: "Europe/Madrid",
        tipo_programacion: "EVENTO_SOLAR",
        evento_solar: "AMANECER",
        desfase_inicio_segundos: 0,
        duracion_segundos: 1800,
        intervalo_captura_segundos: 10,
        fps_salida: 25,
        activa: true
    });
    valorCampo("camara_preset_id")?.replaceChildren(
        new Option("Sin cambio de posición", "")
    );
    mostrarElemento("bloqueTimelapsePreset", false);
    mostrarElemento("bloqueTimelapseZoom", false);
    $("tituloFormularioTimelapse").textContent = "Nueva programación";
    $("botonGuardarProgramacionTimelapse").textContent = "Crear programación";
    $("botonGuardarProgramacionTimelapse").disabled = false;
    mostrarEstado($("estadoFormularioTimelapse"), "");
    mostrarEditor(true);
    renderizarListado();
}

async function seleccionarProgramacion(id){
    if(guardando){
        return;
    }
    const solicitud = ++secuenciaSeleccion;
    idSeleccionado = id;
    programacionSeleccionada = null;
    renderizarListado();
    mostrarEditor(true);
    $("tituloFormularioTimelapse").textContent = "Cargando programación...";
    $("botonGuardarProgramacionTimelapse").disabled = true;
    mostrarEstado($("estadoFormularioTimelapse"), "Consultando programación...", "info");

    try{
        const datos = await peticionJson(`${RUTA_PROGRAMACIONES}/${id}`);
        if(solicitud !== secuenciaSeleccion){
            return;
        }
        programacionSeleccionada = datos;
        rellenarFormulario(datos);
        $("botonGuardarProgramacionTimelapse").disabled = false;
        $("tituloFormularioTimelapse").textContent = "Editar programación";
        $("botonGuardarProgramacionTimelapse").textContent = "Guardar cambios";
        mostrarEditor(true);
        mostrarEstado($("estadoFormularioTimelapse"), "");
        await cargarPresetsSeleccionados(datos.camara_id, datos.camara_preset_id);
    }catch(error){
        if(solicitud !== secuenciaSeleccion){
            return;
        }
        $("botonGuardarProgramacionTimelapse").disabled = true;
        mostrarEstado($("estadoFormularioTimelapse"), textoError(error), "error");
    }
}

function leerFormulario(){
    const codigo = (valorCampo("codigo")?.value || "").trim();
    const nombre = (valorCampo("nombre")?.value || "").trim();
    const camaraId = enteroObligatorio(
        valorCampo("camara_id")?.value, "Cámara"
    );
    const camara = camaraPorId(camaraId);
    const tipo = valorCampo("tipo_programacion")?.value;

    if(!codigo || !nombre){
        throw new Error("Código y nombre son obligatorios.");
    }
    if(!camara){
        throw new Error("Selecciona una cámara registrada.");
    }
    if(!TIPOS[tipo]){
        throw new Error("Selecciona un tipo de programación válido.");
    }
    if(tipo === "PERIODICA"){
        throw new Error(
            "La periodicidad queda pendiente de definir: todavía no podemos guardar una regla sin su sintaxis acordada."
        );
    }

    const duracion = enteroObligatorio(
        valorCampo("duracion_segundos")?.value, "Duración"
    );
    const intervalo = enteroObligatorio(
        valorCampo("intervalo_captura_segundos")?.value,
        "Intervalo de captura"
    );
    if(intervalo > duracion){
        throw new Error("El intervalo de captura no puede superar la duración.");
    }

    const presetId = textoOpcional(valorCampo("camara_preset_id")?.value);
    if(presetId && !admitePreset(camara)){
        throw new Error("La cámara seleccionada no admite presets.");
    }
    if(presetId && !presets.some(p => String(p.id) === presetId && p.disponible)){
        throw new Error("Selecciona un preset disponible para esa cámara.");
    }

    const zoom = enteroOpcionalDesde(valorCampo("nivel_zoom")?.value, "Zoom", 0);
    if(zoom !== null && !presetId){
        throw new Error("El zoom solo se aplica junto a un preset.");
    }

    const solar = tipo === "EVENTO_SOLAR";
    const fija = tipo === "HORA_FIJA";
    const evento = solar ? valorCampo("evento_solar")?.value : null;
    const hora = fija ? textoOpcional(valorCampo("hora_local")?.value) : null;
    if(solar && !["AMANECER", "ATARDECER"].includes(evento)){
        throw new Error("Selecciona amanecer o atardecer.");
    }
    if(fija && !/^([01]\d|2[0-3]):[0-5]\d$/.test(hora || "")){
        throw new Error("Introduce una hora local válida.");
    }

    return {
        codigo,
        nombre,
        descripcion: textoOpcional(valorCampo("descripcion")?.value),
        camara_id: camaraId,
        camara_preset_id: presetId ? Number(presetId) : null,
        nivel_zoom: zoom,
        tipo_programacion: tipo,
        evento_solar: evento,
        zona_horaria: (valorCampo("zona_horaria")?.value || "").trim(),
        hora_local: hora,
        regla_recurrencia: null,
        desfase_inicio_segundos: solar
            ? enteroObligatorio(
                valorCampo("desfase_inicio_segundos")?.value,
                "Desfase solar", Number.MIN_SAFE_INTEGER
            )
            : 0,
        duracion_segundos: duracion,
        intervalo_captura_segundos: intervalo,
        fps_salida: enteroObligatorio(valorCampo("fps_salida")?.value, "FPS"),
        retencion_dias: enteroOpcional(
            valorCampo("retencion_dias")?.value, "Retención"
        ),
        activa: Boolean(valorCampo("activa")?.checked)
    };
}

async function guardarProgramacion(evento){
    evento.preventDefault();
    if(guardando || !editorAbierto){
        return;
    }
    try{
        const datos = leerFormulario();
        const actual = programacionSeleccionada;
        const cambios = {};
        if(actual){
            for(const [clave, valor] of Object.entries(datos)){
                const anterior = actual[clave] ?? null;
                if(anterior !== valor && !(clave === "hora_local" &&
                    horaParaInput(anterior) === horaParaInput(valor))){
                    cambios[clave] = valor;
                }
            }
            if(!Object.keys(cambios).length){
                mostrarEstado($("estadoFormularioTimelapse"),
                    "No hay cambios pendientes.", "info");
                return;
            }
        }

        guardando = true;
        $("botonGuardarProgramacionTimelapse").disabled = true;
        mostrarEstado($("estadoFormularioTimelapse"), "Guardando programación...", "info");
        const ruta = actual
            ? `${RUTA_PROGRAMACIONES}/${actual.id}`
            : RUTA_PROGRAMACIONES;
        await peticionJson(ruta, {
            method: actual ? "PATCH" : "POST",
            body: JSON.stringify(actual ? cambios : datos)
        });
        mostrarEstado($("estadoFormularioTimelapse"), "Programación guardada.", "ok");
        await cargarTimelapses();
        guardando = false;
        if(actual){
            await seleccionarProgramacion(actual.id);
        }else{
            cerrarEditor();
        }
    }catch(error){
        mostrarEstado($("estadoFormularioTimelapse"), textoError(error), "error");
    }finally{
        guardando = false;
        const boton = $("botonGuardarProgramacionTimelapse");
        if(boton){
            boton.disabled = false;
        }
        renderizarListado();
    }
}

function cerrarEditor(){
    if(guardando){
        return;
    }
    ++secuenciaSeleccion;
    ++secuenciaPresets;
    idSeleccionado = null;
    programacionSeleccionada = null;
    mostrarEditor(false);
    mostrarEstado($("estadoFormularioTimelapse"), "");
    renderizarListado();
}

/* ==========================================================
   CARGA, EVENTOS Y LIMPIEZA
   ========================================================== */

export async function cargarTimelapses(){
    if(!$("modulo-timelapses")){
        return;
    }
    const solicitud = ++secuenciaCarga;
    mostrarEstado($("estadoTimelapses"), "Cargando programaciones...", "info");
    try{
        const [datosCamaras, datosProgramaciones] = await Promise.all([
            peticionJson(RUTA_CAMARAS),
            peticionJson(RUTA_PROGRAMACIONES)
        ]);
        if(solicitud !== secuenciaCarga){
            return;
        }
        if(!Array.isArray(datosCamaras) || !Array.isArray(datosProgramaciones)){
            throw new Error("La API no ha devuelto catálogos válidos.");
        }
        camaras = datosCamaras;
        programaciones = datosProgramaciones;
        actualizarSelectCamaras();
        renderizarListado();
        mostrarEstado($("estadoTimelapses"),
            `${programaciones.length} programaciones registradas.`, "ok");
    }catch(error){
        if(solicitud !== secuenciaCarga){
            return;
        }
        mostrarEstado($("estadoTimelapses"), textoError(error), "error");
        throw error;
    }
}

export function configurarEventosTimelapses(){
    if(eventosConfigurados || !$("modulo-timelapses")){
        return;
    }
    eventosConfigurados = true;
    for(const id of [
        "filtroTimelapseTexto",
        "filtroTimelapseCamara",
        "filtroTimelapseEstado"
    ]){
        $(id)?.addEventListener("input", renderizarListado);
    }
    $("botonRecargarTimelapses")?.addEventListener(
        "click", () => void cargarTimelapses().catch(console.error)
    );
    $("botonNuevaProgramacionTimelapse")?.addEventListener("click", nuevoFormulario);
    $("botonCancelarProgramacionTimelapse")?.addEventListener("click", cerrarEditor);
    $("formularioProgramacionTimelapse")?.addEventListener("submit",
        evento => void guardarProgramacion(evento));
    valorCampo("tipo_programacion")?.addEventListener("change", actualizarCamposTipo);
    valorCampo("camara_id")?.addEventListener("change", () => {
        void cargarPresetsSeleccionados(valorCampo("camara_id")?.value);
    });
    mostrarEditor(false);
}

export function limpiarTimelapses(){
    ++secuenciaCarga;
    ++secuenciaSeleccion;
    ++secuenciaPresets;
    programaciones = [];
    camaras = [];
    presets = [];
    programacionSeleccionada = null;
    idSeleccionado = null;
    guardando = false;
    editorAbierto = false;
    $("formularioProgramacionTimelapse")?.reset();
    mostrarEditor(false);
    $("listaProgramacionesTimelapse")?.replaceChildren();
    mostrarEstado($("estadoTimelapses"), "");
    mostrarEstado($("estadoFormularioTimelapse"), "");
}

// Fin de fichero: js/administracion/timelapses.js
