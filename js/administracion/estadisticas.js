/*
 * MeteoArchidona
 * Administración · Estadísticas
 *
 * Configurador de informes y estadísticas (docs/informes-estadisticas.md
 * de la API, secciones 3 y 4):
 *
 * - cabecera: nombre, descripción, presentación, periodo y agrupación,
 *   comunes a todas las series;
 * - series: estación, variable, cálculo, desplazamiento, etiqueta,
 *   color, trazo y eje;
 * - vista previa con el visor (js/visor-estadisticas.js), que se
 *   redibuja sola al cambiar cualquier opción.
 *
 * Las opciones salen de GET /estadisticas/opciones: la pantalla no
 * decide qué es válido. Si un cambio deja una opción de abajo sin
 * sentido (una variable que la estación nueva no mide, un cálculo que
 * no vale con la agrupación), vuelve a su valor por defecto.
 *
 * «Añadir serie» copia la última: casi siempre solo cambia la estación.
 * El color y la etiqueta se recalculan solos salvo que se hayan
 * cambiado a mano.
 *
 * Guardar llegará con las tablas de definiciones (fase 1, paso 3).
 */

import {
    $,
    mostrarEstado
} from "./estado.js?v=20261026-cache1";

import {
    URL_API,
    peticionJson
} from "./api.js?v=20261026-cache1";

import {
    crearVisorEstadisticas
} from "../visor-estadisticas.js?v=20261027-visor1";


const PALETA = [
    "#E8463A", "#2E86EB", "#2BB673", "#F2A33A",
    "#8E5BD9", "#14B8C4", "#E25DA4", "#7A8B99",
];

const MAXIMO_SERIES = 8;

const ESPERA_VISTA_PREVIA_MS = 600;


let opciones = null;

let definicion = null;

let visor = null;

let temporizador = null;

let peticionActual = 0;

let eventosConfigurados = false;


/* ==========================================================
   UTILIDADES
   ========================================================== */

function nodo(etiqueta, atributos = {}, hijos = []){

    const elementoNuevo = document.createElement(etiqueta);

    for(const [clave, valor] of Object.entries(atributos)){
        if(valor === undefined || valor === null || valor === false){
            continue;
        }
        if(clave === "texto"){
            elementoNuevo.textContent = valor;
        }else if(clave === "clase"){
            elementoNuevo.className = valor;
        }else if(clave.startsWith("on")){
            elementoNuevo.addEventListener(clave.slice(2), valor);
        }else{
            elementoNuevo.setAttribute(clave, valor === true ? "" : valor);
        }
    }

    for(const hijo of [].concat(hijos)){
        if(hijo !== null && hijo !== undefined){
            elementoNuevo.append(hijo);
        }
    }

    return elementoNuevo;
}


function selector(valores, actual, alCambiar, atributos = {}){

    const select = nodo("select", atributos);

    for(const {codigo, nombre} of valores){
        const opcion = nodo("option", {value: codigo, texto: nombre});
        if(codigo === actual){
            opcion.selected = true;
        }
        select.append(opcion);
    }

    select.addEventListener("change", () => alCambiar(select.value));

    return select;
}


function campo(etiqueta, control, {ancho = false, ayuda} = {}){

    const id = control.id || `est-${Math.random().toString(36).slice(2, 9)}`;
    control.id = id;

    return nodo("div", {clase: ancho ? "campo campo-ancho" : "campo"}, [
        nodo("label", {for: id, texto: etiqueta}),
        control,
        ayuda ? nodo("div", {clase: "campo-ayuda", texto: ayuda}) : null,
    ]);
}


function variable(codigo){
    return opciones.variables.find(v => v.codigo === codigo);
}


function estacion(codigo){
    return opciones.estaciones.find(e => e.codigo === codigo);
}


function calculosPermitidos(codigoVariable){
    return variable(codigoVariable)
        ?.calculos_por_agrupacion[definicion.agrupacion]
        || {permitidos: [], por_defecto: null};
}


function nombreCalculo(codigo){
    return opciones.calculos.find(c => c.codigo === codigo)?.nombre || codigo;
}


/* ==========================================================
   ESTADO DE LA DEFINICIÓN
   ========================================================== */

function serieInicial(){

    const primera = opciones.estaciones[0];
    const codigoVariable = primera.variables.includes("TEMPERATURA")
        ? "TEMPERATURA"
        : primera.variables[0];

    return {
        estacion: primera.codigo,
        variable: codigoVariable,
        calculo: null,
        desplazamiento: {unidad: "ANIO", cantidad: 0},
        etiqueta: "",
        color: null,
        trazo: "",
        eje: "AUTOMATICO",
    };
}


function definicionInicial(){

    return {
        nombre: "Nueva estadística",
        descripcion: "",
        presentacion: "AMBAS",
        periodo: {tipo: "RELATIVO", relativo: "ULTIMOS_7_DIAS", desde: "", hasta: ""},
        agrupacion: "DIA",
        series: [serieInicial()],
    };
}


/*
 * Deja cada serie coherente con las opciones: la variable, medida por
 * su estación; el cálculo, válido para la variable y la agrupación.
 */
function normalizarSeries(){

    for(const serie of definicion.series){

        const disponible = estacion(serie.estacion);

        if(!disponible){
            serie.estacion = opciones.estaciones[0].codigo;
        }

        const variables = estacion(serie.estacion).variables;

        if(!variables.includes(serie.variable)){
            serie.variable = variables.includes("TEMPERATURA") ? "TEMPERATURA" : variables[0];
            serie.calculo = null;
        }

        const {permitidos, por_defecto: porDefecto} = calculosPermitidos(serie.variable);

        if(!permitidos.includes(serie.calculo)){
            serie.calculo = porDefecto;
        }
    }
}


function unidadesDistintas(){
    return [...new Set(definicion.series.map(s => variable(s.variable)?.unidad))];
}


/* El cuerpo que espera POST /estadisticas/vista-previa. */
function cuerpoPeticion(){

    const periodo = definicion.periodo.tipo === "RELATIVO"
        ? {relativo: definicion.periodo.relativo}
        : {desde: definicion.periodo.desde || null, hasta: definicion.periodo.hasta || null};

    return {
        nombre: definicion.nombre.trim() || "Sin nombre",
        descripcion: definicion.descripcion.trim() || null,
        presentacion: definicion.presentacion,
        periodo,
        agrupacion: definicion.agrupacion,
        series: definicion.series.map(serie => ({
            estacion: serie.estacion,
            variable: serie.variable,
            calculo: serie.calculo,
            desplazamiento: serie.desplazamiento,
            etiqueta: serie.etiqueta.trim() || null,
            color: serie.color,
            trazo: serie.trazo || null,
            eje: serie.eje,
        })),
    };
}


/* ==========================================================
   CABECERA
   ========================================================== */

function pintarCabecera(){

    const contenedor = $("cabeceraEstadistica");
    contenedor.replaceChildren();

    const nombre = nodo("input", {
        type: "text", maxlength: "150", value: definicion.nombre, autocomplete: "off",
    });
    nombre.addEventListener("input", () => {
        definicion.nombre = nombre.value;
        programarVistaPrevia();
    });

    const descripcion = nodo("textarea", {rows: "2", maxlength: "2000"});
    descripcion.value = definicion.descripcion;
    descripcion.addEventListener("input", () => {
        definicion.descripcion = descripcion.value;
        programarVistaPrevia();
    });

    const presentacion = selector(opciones.presentaciones, definicion.presentacion, valor => {
        definicion.presentacion = valor;
        programarVistaPrevia(0);
    });

    const tipoPeriodo = selector(
        [{codigo: "RELATIVO", nombre: "Relativo (se actualiza solo)"}, {codigo: "FIJO", nombre: "Fechas fijas"}],
        definicion.periodo.tipo,
        valor => {
            definicion.periodo.tipo = valor;
            pintarCabecera();
            programarVistaPrevia(0);
        }
    );

    const relativo = selector(opciones.periodos_relativos, definicion.periodo.relativo, valor => {
        definicion.periodo.relativo = valor;
        programarVistaPrevia(0);
    });

    const desde = nodo("input", {type: "date", value: definicion.periodo.desde});
    const hasta = nodo("input", {type: "date", value: definicion.periodo.hasta});

    for(const [control, clave] of [[desde, "desde"], [hasta, "hasta"]]){
        control.addEventListener("change", () => {
            definicion.periodo[clave] = control.value;
            programarVistaPrevia(0);
        });
    }

    const agrupacion = selector(opciones.agrupaciones, definicion.agrupacion, valor => {
        definicion.agrupacion = valor;
        normalizarSeries();
        pintarSeries();
        programarVistaPrevia(0);
    });

    const fijo = definicion.periodo.tipo === "FIJO";

    contenedor.append(
        nodo("div", {clase: "formulario-grid"}, [
            campo("Nombre", nombre, {ancho: true}),
            campo("Descripción", descripcion, {ancho: true, ayuda: "Sale en la pantalla y en el PDF."}),
            campo("Mostrar como", presentacion),
            campo("Agrupación", agrupacion, {ayuda: "Común a todas las series."}),
            campo("Periodo", tipoPeriodo),
            fijo ? campo("Desde", desde) : campo("Periodo relativo", relativo),
            fijo ? campo("Hasta (incluido)", hasta) : null,
        ])
    );
}


/* ==========================================================
   SERIES
   ========================================================== */

function pintarSeries(){

    const contenedor = $("seriesEstadistica");
    contenedor.replaceChildren();

    definicion.series.forEach((serie, indice) => {
        contenedor.append(tarjetaSerie(serie, indice));
    });

    $("botonAnadirSerieEstadistica").disabled = definicion.series.length >= MAXIMO_SERIES;

    const unidades = unidadesDistintas();
    const aviso = $("avisoUnidadesEstadistica");

    if(unidades.length > 2){
        aviso.hidden = false;
        aviso.textContent =
            `Hay ${unidades.length} unidades distintas (${unidades.join(", ")}); ` +
            "una gráfica admite dos, una por eje. Quita alguna serie o cambia su variable.";
    }else{
        aviso.hidden = true;
        aviso.textContent = "";
    }
}


function tarjetaSerie(serie, indice){

    const cambiar = (repintar = false) => {
        normalizarSeries();
        if(repintar){
            pintarSeries();
        }
        programarVistaPrevia();
    };

    const estaciones = selector(
        opciones.estaciones.map(e => ({codigo: e.codigo, nombre: e.nombre})),
        serie.estacion,
        valor => { serie.estacion = valor; cambiar(true); }
    );

    const variables = selector(
        estacion(serie.estacion).variables.map(codigo => ({
            codigo, nombre: `${variable(codigo).nombre}${variable(codigo).unidad ? ` (${variable(codigo).unidad})` : ""}`,
        })),
        serie.variable,
        valor => { serie.variable = valor; serie.calculo = null; serie.trazo = ""; cambiar(true); }
    );

    const {permitidos} = calculosPermitidos(serie.variable);

    const calculo = selector(
        permitidos.map(codigo => ({codigo, nombre: nombreCalculo(codigo)})),
        serie.calculo,
        valor => { serie.calculo = valor; cambiar(); }
    );

    const cantidad = nodo("input", {
        type: "number", min: "0", max: "20", step: "1", value: String(serie.desplazamiento.cantidad),
    });
    cantidad.addEventListener("change", () => {
        serie.desplazamiento.cantidad = Math.max(0, Math.min(20, Number(cantidad.value) || 0));
        cantidad.value = String(serie.desplazamiento.cantidad);
        cambiar();
    });

    const unidadDesplazamiento = selector(
        opciones.unidades_desplazamiento,
        serie.desplazamiento.unidad,
        valor => { serie.desplazamiento.unidad = valor; cambiar(); }
    );

    const etiqueta = nodo("input", {
        type: "text", maxlength: "120", value: serie.etiqueta,
        placeholder: "Automática", autocomplete: "off",
    });
    etiqueta.addEventListener("input", () => { serie.etiqueta = etiqueta.value; programarVistaPrevia(); });

    const color = nodo("input", {type: "color", value: serie.color || PALETA[indice % PALETA.length]});
    color.addEventListener("input", () => { serie.color = color.value.toUpperCase(); programarVistaPrevia(); });

    const trazo = selector(
        [{codigo: "", nombre: "El sugerido"}, ...opciones.trazos],
        serie.trazo,
        valor => { serie.trazo = valor; cambiar(); }
    );

    const eje = selector(opciones.ejes, serie.eje, valor => { serie.eje = valor; cambiar(); });

    const botonDuplicar = nodo("button", {
        type: "button", clase: "boton boton-mini", texto: "Duplicar",
        disabled: definicion.series.length >= MAXIMO_SERIES,
        onclick: () => {
            definicion.series.splice(indice + 1, 0, copiaDeSerie(serie));
            pintarSeries();
            programarVistaPrevia(0);
        },
    });

    const botonQuitar = nodo("button", {
        type: "button", clase: "boton boton-mini boton-peligro", texto: "Quitar",
        disabled: definicion.series.length <= 1,
        onclick: () => {
            definicion.series.splice(indice, 1);
            pintarSeries();
            programarVistaPrevia(0);
        },
    });

    const unaSolaOpcion = permitidos.length <= 1;

    const tarjeta = nodo("article", {clase: "serie-estadistica"}, [
        nodo("div", {clase: "serie-estadistica-cabecera"}, [
            nodo("span", {clase: "serie-estadistica-color"}),
            nodo("strong", {texto: `Serie ${indice + 1}`}),
            nodo("span", {clase: "serie-estadistica-acciones"}, [botonDuplicar, botonQuitar]),
        ]),
        nodo("div", {clase: "formulario-grid"}, [
            campo("Estación", estaciones),
            campo("Variable", variables),
            unaSolaOpcion
                ? null
                : campo("Cálculo", calculo, {
                    ayuda: opciones.calculos.find(c => c.codigo === serie.calculo)?.descripcion,
                }),
            campo("Desplazar (cantidad)", cantidad, {ayuda: "0 = el propio periodo; 1 año = el mismo periodo del año anterior."}),
            campo("Desplazar (unidad)", unidadDesplazamiento),
            campo("Etiqueta", etiqueta),
            campo("Color", color),
            campo("Trazo", trazo),
            campo("Eje", eje, {ayuda: "Automático: la primera unidad a la izquierda y la segunda a la derecha."}),
        ]),
    ]);

    tarjeta.style.setProperty("--color-serie", serie.color || PALETA[indice % PALETA.length]);
    color.addEventListener("input", () => tarjeta.style.setProperty("--color-serie", color.value));

    return tarjeta;
}


/* «Añadir serie» y «Duplicar»: misma configuración; color y etiqueta nuevos. */
function copiaDeSerie(serie){

    return {
        ...serie,
        desplazamiento: {...serie.desplazamiento},
        etiqueta: "",
        color: null,
    };
}


/* ==========================================================
   VISTA PREVIA
   ========================================================== */

function programarVistaPrevia(espera = ESPERA_VISTA_PREVIA_MS){

    clearTimeout(temporizador);
    temporizador = setTimeout(actualizarVistaPrevia, espera);
}


async function actualizarVistaPrevia(){

    if(!definicion || !visor){
        return;
    }

    if(unidadesDistintas().length > 2){
        visor.mostrarError("Corrige las unidades para ver la vista previa.");
        return;
    }

    if(definicion.periodo.tipo === "FIJO" && (!definicion.periodo.desde || !definicion.periodo.hasta)){
        visor.mostrarError("Elige las dos fechas del periodo.");
        return;
    }

    const numero = ++peticionActual;
    visor.mostrarCargando();

    try{
        const resultado = await peticionJson("/estadisticas/vista-previa", {
            method: "POST",
            body: JSON.stringify(cuerpoPeticion()),
        });

        if(numero !== peticionActual){
            return;
        }

        // Los colores automáticos se fijan en la pantalla para que el
        // selector de color muestre el que se está usando.
        resultado.series.forEach((serieResultado, i) => {
            const serie = definicion.series[i];
            if(serie && !serie.color){
                const tarjeta = $("seriesEstadistica")
                    ?.querySelectorAll(".serie-estadistica")[i];
                tarjeta?.style.setProperty("--color-serie", serieResultado.color);
                const selectorColor = $("seriesEstadistica")
                    ?.querySelectorAll('input[type="color"]')[i];
                if(selectorColor){ selectorColor.value = serieResultado.color; }
            }
        });

        visor.mostrar(resultado);

    }catch(error){
        if(numero === peticionActual){
            visor.mostrarError(error.message || "No se ha podido calcular la vista previa.");
        }
    }
}


/* ==========================================================
   ENTRADA DEL MÓDULO
   ========================================================== */

export function configurarEventosEstadisticas(){

    if(eventosConfigurados){
        return;
    }

    eventosConfigurados = true;

    $("botonAnadirSerieEstadistica")?.addEventListener("click", () => {
        if(!definicion || definicion.series.length >= MAXIMO_SERIES){
            return;
        }
        definicion.series.push(copiaDeSerie(definicion.series[definicion.series.length - 1]));
        pintarSeries();
        programarVistaPrevia(0);
    });

    $("botonActualizarEstadistica")?.addEventListener("click", () => programarVistaPrevia(0));

    $("botonNuevaEstadistica")?.addEventListener("click", () => {
        if(!opciones){
            return;
        }
        definicion = definicionInicial();
        pintarCabecera();
        pintarSeries();
        programarVistaPrevia(0);
    });
}


export async function cargarEstadisticas(){

    const estado = $("estadoEstadisticas");

    const respuesta = await fetch(`${URL_API}/estadisticas/opciones`, {cache: "no-store"});

    if(!respuesta.ok){
        throw new Error(`No se han podido cargar las opciones (HTTP ${respuesta.status}).`);
    }

    opciones = await respuesta.json();

    if(!opciones.estaciones.length){
        mostrarEstado(estado, "Ninguna estación tiene datos recientes.", "error");
        return;
    }

    mostrarEstado(estado, "");

    if(!visor){
        visor = crearVisorEstadisticas($("visorEstadistica"));
    }

    if(!definicion){
        definicion = definicionInicial();
    }

    normalizarSeries();
    pintarCabecera();
    pintarSeries();
    programarVistaPrevia(0);
}


export function limpiarEstadisticas(){

    clearTimeout(temporizador);
    peticionActual++;
    definicion = null;
    visor?.vaciar();
}


// Fin de fichero: js/administracion/estadisticas.js
