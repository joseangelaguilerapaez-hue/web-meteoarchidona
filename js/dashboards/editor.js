/*
 * MeteoArchidona · Dashboards · editor
 *
 * Editor de la rejilla de un dashboard (docs/dashboards.md de la API, 8.2;
 * José, 17-11-2026). Pieza común: lo usa Administración → Dashboards y lo
 * usarán las pestañas «Mi web» de cada registrado.
 *
 *     import {abrirEditor} from "/js/dashboards/editor.js?v=…";
 *     abrirEditor(contenedor, {
 *         dashboard,          // el de la API (GET …/{id}) o null para uno nuevo
 *         formato: "PC",      // solo para uno nuevo
 *         copia: false,       // true: parte de `dashboard`, pero se guarda como nuevo
 *         guardar: async datos => {…},   // {titulo, descripcion, formato, filas}
 *         cancelar: () => {…}
 *     });
 *
 * - Título, descripción y formato; el formato no cambia después.
 * - Filas que se suben, se bajan y se borran; en PC, de una o de dos
 *   columnas; en móvil, siempre de una. Con botones, sin arrastrar, para
 *   que vaya también en el móvil.
 * - El «+» de cada recuadro abre los componentes agrupados por sección, con
 *   buscador; al elegir uno salen sus parámetros, descritos por la API
 *   (GET /dashboards/componentes): desplegables, números y sí/no. Las
 *   listas de la base se piden a GET /dashboards/valores/{lista}.
 * - Los componentes de las secciones sin lanzar no salen en el «+».
 * - Vista previa con el pintor, tal como quedará. Se pinta al pedirla y
 *   con «Actualizar la vista previa», no con cada cambio: los componentes
 *   piden sus datos al montarse.
 *
 * El texto de la API nunca se mete como HTML.
 */

import {pintarDashboard} from "./pintor.js?v=20261117-camara1";
import {componenteOculto} from "../lanzamientos.js?v=20261115-lanzamientos1";


const HOJA = "/css/dashboards-editor.css?v=20261117-editor2";

const MAXIMO_FILAS = 50;

let promesaCatalogo = null;
const listas = new Map();


/* ==========================================================
   API pública
   ========================================================== */

function urlApi(ruta) {
    return `${window.API_BASE || "/api"}${ruta}`;
}


async function pedir(ruta) {
    const respuesta = await fetch(urlApi(ruta), {credentials: "same-origin", cache: "no-store"});
    if (!respuesta.ok) {
        throw new Error(`No se ha podido leer ${ruta} (${respuesta.status}).`);
    }
    return respuesta.json();
}


/** Componentes montables con sus parámetros, una vez por página. */
export function cargarCatalogo() {
    if (!promesaCatalogo) {
        promesaCatalogo = pedir("/dashboards/componentes").catch(error => {
            promesaCatalogo = null;
            throw error;
        });
    }
    return promesaCatalogo;
}


/** Valores de una lista de la base (ESTACIONES, CAMARAS…), una vez por página. */
function cargarLista(lista) {
    if (!listas.has(lista)) {
        listas.set(lista, pedir(`/dashboards/valores/${encodeURIComponent(lista)}`).catch(error => {
            listas.delete(lista);
            throw error;
        }));
    }
    return listas.get(lista);
}


/* ==========================================================
   Utilidades
   ========================================================== */

function asegurarHoja() {
    if (document.querySelector('link[rel="stylesheet"][href*="dashboards-editor.css"]')) {
        return;
    }
    const enlace = document.createElement("link");
    enlace.rel = "stylesheet";
    enlace.href = HOJA;
    document.head.appendChild(enlace);
}


function crear(etiqueta, clase, texto) {
    const nodo = document.createElement(etiqueta);
    if (clase) nodo.className = clase;
    if (texto !== undefined && texto !== null) nodo.textContent = texto;
    return nodo;
}


function boton(texto, clase, accion, titulo) {
    const nodo = crear("button", `boton ${clase || "boton-secundario"}`, texto);
    nodo.type = "button";
    if (titulo) {
        nodo.title = titulo;
        nodo.setAttribute("aria-label", titulo);
    }
    nodo.addEventListener("click", accion);
    return nodo;
}


function sinAcentos(texto) {
    return String(texto || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}


function copiarRecuadro(recuadro) {
    return recuadro && recuadro.componente
        ? {componente: recuadro.componente, parametros: {...(recuadro.parametros || {})}}
        : null;
}


/* ==========================================================
   Editor
   ========================================================== */

export async function abrirEditor(contenedor, opciones = {}) {

    asegurarHoja();

    const original = opciones.dashboard || null;
    const nuevo = !original || Boolean(opciones.copia);

    const estado = {
        titulo: original ? (opciones.copia ? `Copia de ${original.titulo}` : original.titulo).slice(0, 100) : "",
        descripcion: original ? original.descripcion || "" : "",
        formato: original ? original.formato : (opciones.formato === "MOVIL" ? "MOVIL" : "PC"),
        filas: (original ? original.filas || [] : []).map(fila => ({
            columnas: fila.columnas === 2 ? 2 : 1,
            primera: copiarRecuadro(fila.primera),
            segunda: fila.columnas === 2 ? copiarRecuadro(fila.segunda) : null
        })),
        // Recuadro con el «+» o los parámetros abiertos: {fila, lado, paso, codigo}.
        abierto: null,
        busqueda: "",
        guardando: false,
        previa: false
    };

    contenedor.textContent = "";
    const raiz = crear("div", "dash-editor");
    contenedor.appendChild(raiz);

    const mensaje = crear("div", "dash-editor-mensaje");
    mensaje.setAttribute("role", "status");
    mensaje.setAttribute("aria-live", "polite");

    function avisar(texto, tipo = "error") {
        mensaje.textContent = texto || "";
        mensaje.dataset.tipo = tipo;
    }

    let catalogo = [];
    const porCodigo = new Map();
    const ocultos = new Set();

    try {
        catalogo = await cargarCatalogo();
        for (const componente of catalogo) {
            porCodigo.set(componente.codigo, componente);
        }
        const oculto = await Promise.all(
            catalogo.map(c => componenteOculto(c.etiqueta).catch(() => false))
        );
        catalogo.forEach((c, i) => { if (oculto[i]) ocultos.add(c.codigo); });
    } catch (error) {
        raiz.appendChild(crear("p", "dash-editor-error", error.message || "No se ha podido cargar el catálogo de componentes."));
        return;
    }

    // Las listas de la base de los recuadros que ya hay, para los resúmenes.
    const listasUsadas = new Set();
    for (const fila of estado.filas) {
        for (const recuadro of [fila.primera, fila.segunda]) {
            const componente = recuadro && porCodigo.get(recuadro.componente);
            for (const parametro of (componente && componente.parametros) || []) {
                if (parametro.lista && recuadro.parametros[parametro.atributo]) {
                    listasUsadas.add(parametro.lista);
                }
            }
        }
    }
    const nombresLista = new Map();
    await Promise.all([...listasUsadas].map(async lista => {
        try {
            nombresLista.set(lista, new Map((await cargarLista(lista)).map(v => [v.valor, v.nombre])));
        } catch (error) {
            // Sin la lista, el resumen enseña el código.
        }
    }));


    /* ---------- resumen de un recuadro ---------- */

    function nombreValor(parametro, valor) {
        const nombres = parametro.lista
            ? nombresLista.get(parametro.lista)
            : new Map((parametro.valores || []).map(v => [v.valor, v.nombre]));
        if (parametro.tipo === "SI_NO") {
            return valor === "si" ? "sí" : "no";
        }
        return String(valor)
            .split(",")
            .map(parte => (nombres && nombres.get(parte.trim())) || parte.trim())
            .join(", ");
    }

    function resumen(recuadro) {
        const componente = porCodigo.get(recuadro.componente);
        if (!componente) {
            return "";
        }
        return componente.parametros
            .filter(p => recuadro.parametros[p.atributo])
            .map(p => `${p.nombre}: ${nombreValor(p, recuadro.parametros[p.atributo])}`)
            .join(" · ");
    }


    /* ---------- cabecera ---------- */

    function pintarCabecera() {
        const bloque = crear("div", "dash-editor-cabecera formulario-grid");

        const campoTitulo = crear("div", "campo campo-ancho");
        const etiquetaTitulo = crear("label", null, "Título");
        const titulo = crear("input");
        titulo.type = "text";
        titulo.maxLength = 100;
        titulo.value = estado.titulo;
        titulo.id = "dashEditorTitulo";
        etiquetaTitulo.htmlFor = titulo.id;
        titulo.addEventListener("input", () => { estado.titulo = titulo.value; });
        campoTitulo.append(etiquetaTitulo, titulo);

        const campoDescripcion = crear("div", "campo campo-ancho");
        const etiquetaDescripcion = crear("label", null, "Descripción (se ve en el selector)");
        const descripcion = crear("input");
        descripcion.type = "text";
        descripcion.maxLength = 150;
        descripcion.value = estado.descripcion;
        descripcion.id = "dashEditorDescripcion";
        etiquetaDescripcion.htmlFor = descripcion.id;
        descripcion.addEventListener("input", () => { estado.descripcion = descripcion.value; });
        campoDescripcion.append(etiquetaDescripcion, descripcion);

        const campoFormato = crear("div", "campo");
        const etiquetaFormato = crear("label", null, "Formato");
        const formato = crear("select");
        formato.id = "dashEditorFormato";
        etiquetaFormato.htmlFor = formato.id;
        formato.append(new Option("PC (filas de una o dos columnas)", "PC"), new Option("Móvil (una columna)", "MOVIL"));
        formato.value = estado.formato;
        // El formato no cambia después de crearlo; en uno nuevo, solo mientras no tenga filas de dos.
        formato.disabled = !nuevo || (original && opciones.copia);
        formato.addEventListener("change", () => {
            if (formato.value === "MOVIL" && estado.filas.some(f => f.columnas === 2)) {
                formato.value = "PC";
                avisar("Para pasarlo a móvil, deja antes todas las filas de una columna.");
                return;
            }
            estado.formato = formato.value;
            pintar();
        });
        campoFormato.append(etiquetaFormato, formato);
        if (formato.disabled) {
            campoFormato.appendChild(crear("div", "campo-ayuda", "El formato no se cambia después de crearlo."));
        }

        bloque.append(campoTitulo, campoDescripcion, campoFormato);
        return bloque;
    }


    /* ---------- filas ---------- */

    function mover(indice, desplazamiento) {
        const destino = indice + desplazamiento;
        if (destino < 0 || destino >= estado.filas.length) {
            return;
        }
        const [fila] = estado.filas.splice(indice, 1);
        estado.filas.splice(destino, 0, fila);
        estado.abierto = null;
        pintar();
    }

    function borrarFila(indice) {
        const fila = estado.filas[indice];
        if ((fila.primera || fila.segunda) && !window.confirm(`¿Quitar la fila ${indice + 1} con sus componentes?`)) {
            return;
        }
        estado.filas.splice(indice, 1);
        estado.abierto = null;
        pintar();
    }

    function cambiarColumnas(indice, columnas) {
        const fila = estado.filas[indice];
        if (columnas === 1 && fila.segunda) {
            if (!window.confirm("Al pasarla a una columna se quita el componente de la derecha. ¿Seguir?")) {
                pintar();
                return;
            }
        }
        fila.columnas = columnas;
        if (columnas === 1) {
            fila.segunda = null;
        }
        estado.abierto = null;
        pintar();
    }

    function anadirFila(columnas) {
        if (estado.filas.length >= MAXIMO_FILAS) {
            avisar(`Como mucho ${MAXIMO_FILAS} filas.`);
            return;
        }
        estado.filas.push({columnas: estado.formato === "MOVIL" ? 1 : columnas, primera: null, segunda: null});
        estado.abierto = {fila: estado.filas.length - 1, lado: "primera", paso: "elegir", codigo: null};
        estado.busqueda = "";
        pintar();
    }

    function pintarFila(fila, indice) {
        const tarjeta = crear("div", "dash-editor-fila");

        const barra = crear("div", "dash-editor-fila-barra");
        barra.appendChild(crear("span", "dash-editor-fila-numero", `Fila ${indice + 1}`));

        if (estado.formato === "PC") {
            const columnas = crear("select", "dash-editor-columnas");
            columnas.setAttribute("aria-label", `Columnas de la fila ${indice + 1}`);
            columnas.append(new Option("Una columna", "1"), new Option("Dos columnas", "2"));
            columnas.value = String(fila.columnas);
            columnas.addEventListener("change", () => cambiarColumnas(indice, Number(columnas.value)));
            barra.appendChild(columnas);
        }

        const acciones = crear("div", "dash-editor-fila-acciones");
        const subir = boton("▲", "boton-secundario boton-mini", () => mover(indice, -1), `Subir la fila ${indice + 1}`);
        subir.disabled = indice === 0;
        const bajar = boton("▼", "boton-secundario boton-mini", () => mover(indice, 1), `Bajar la fila ${indice + 1}`);
        bajar.disabled = indice === estado.filas.length - 1;
        acciones.append(subir, bajar, boton("✕", "boton-peligro boton-mini", () => borrarFila(indice), `Quitar la fila ${indice + 1}`));
        barra.appendChild(acciones);
        tarjeta.appendChild(barra);

        const recuadros = crear("div", `dash-editor-recuadros dash-editor-recuadros-${fila.columnas}`);
        const lados = fila.columnas === 2 ? ["primera", "segunda"] : ["primera"];
        for (const lado of lados) {
            recuadros.appendChild(pintarRecuadro(fila, indice, lado));
        }
        tarjeta.appendChild(recuadros);

        const abierto = estado.abierto;
        if (abierto && abierto.fila === indice) {
            tarjeta.appendChild(abierto.paso === "elegir" ? pintarSelector(abierto) : pintarParametros(abierto));
        }

        return tarjeta;
    }

    function pintarRecuadro(fila, indice, lado) {
        const recuadro = fila[lado];
        const caja = crear("div", "dash-editor-recuadro");
        const abierto = estado.abierto && estado.abierto.fila === indice && estado.abierto.lado === lado;
        if (abierto) {
            caja.classList.add("dash-editor-recuadro-abierto");
        }

        if (!recuadro) {
            caja.classList.add("dash-editor-recuadro-vacio");
            caja.appendChild(boton("+ Añadir componente", "boton-secundario", () => {
                estado.abierto = {fila: indice, lado, paso: "elegir", codigo: null};
                estado.busqueda = "";
                pintar();
            }));
            return caja;
        }

        const componente = porCodigo.get(recuadro.componente);
        caja.appendChild(crear("div", "dash-editor-recuadro-nombre", componente ? componente.nombre : recuadro.componente));
        if (componente) {
            caja.appendChild(crear("div", "dash-editor-recuadro-seccion", componente.seccion));
            const texto = resumen(recuadro);
            if (texto) {
                caja.appendChild(crear("div", "dash-editor-recuadro-resumen", texto));
            }
        } else {
            caja.appendChild(crear("div", "dash-editor-recuadro-resumen", "Ya no está en el catálogo: quítalo o cámbialo."));
        }

        const acciones = crear("div", "dash-editor-recuadro-acciones");
        if (componente && componente.parametros.length) {
            acciones.appendChild(boton("Parámetros", "boton-secundario boton-mini", () => {
                estado.abierto = {fila: indice, lado, paso: "parametros", codigo: recuadro.componente};
                pintar();
            }));
        }
        acciones.appendChild(boton("Cambiar", "boton-secundario boton-mini", () => {
            estado.abierto = {fila: indice, lado, paso: "elegir", codigo: null};
            estado.busqueda = "";
            pintar();
        }));
        acciones.appendChild(boton("Quitar", "boton-peligro boton-mini", () => {
            fila[lado] = null;
            estado.abierto = null;
            pintar();
        }));
        caja.appendChild(acciones);
        return caja;
    }


    /* ---------- el «+»: componentes por sección ---------- */

    function pintarSelector(abierto) {
        const panel = crear("div", "dash-editor-panel");
        panel.appendChild(crear("h4", "dash-editor-panel-titulo",
            `Elegir componente · fila ${abierto.fila + 1}${abierto.lado === "segunda" ? ", derecha" : (estado.filas[abierto.fila].columnas === 2 ? ", izquierda" : "")}`));

        const buscador = crear("input", "dash-editor-buscador");
        buscador.type = "search";
        buscador.placeholder = "Buscar (cámara, lluvia, polen…)";
        buscador.setAttribute("aria-label", "Buscar componente");
        buscador.value = estado.busqueda;
        panel.appendChild(buscador);

        const lista = crear("div", "dash-editor-secciones");
        panel.appendChild(lista);

        function llenar() {
            lista.textContent = "";
            const texto = sinAcentos(estado.busqueda.trim());
            const grupos = new Map();
            for (const componente of catalogo) {
                if (ocultos.has(componente.codigo)) {
                    continue;
                }
                const buscable = sinAcentos(`${componente.nombre} ${componente.seccion} ${componente.descripcion}`);
                if (texto && !buscable.includes(texto)) {
                    continue;
                }
                if (!grupos.has(componente.seccion)) {
                    grupos.set(componente.seccion, []);
                }
                grupos.get(componente.seccion).push(componente);
            }

            if (!grupos.size) {
                lista.appendChild(crear("p", "dash-editor-vacio", "Ningún componente coincide con la búsqueda."));
                return;
            }

            for (const [seccion, componentes] of grupos) {
                const grupo = crear("details", "dash-editor-seccion");
                grupo.open = Boolean(texto) || grupos.size === 1;
                grupo.appendChild(crear("summary", null, `${seccion} (${componentes.length})`));
                const opcionesGrupo = crear("div", "dash-editor-opciones");
                for (const componente of componentes) {
                    const opcion = crear("button", "dash-editor-opcion");
                    opcion.type = "button";
                    opcion.appendChild(crear("span", "dash-editor-opcion-nombre", componente.nombre));
                    opcion.appendChild(crear("span", "dash-editor-opcion-descripcion", componente.descripcion));
                    opcion.addEventListener("click", () => elegir(abierto, componente));
                    opcionesGrupo.appendChild(opcion);
                }
                grupo.appendChild(opcionesGrupo);
                lista.appendChild(grupo);
            }
        }

        buscador.addEventListener("input", () => {
            estado.busqueda = buscador.value;
            llenar();
        });
        llenar();

        panel.appendChild(crear("div", "dash-editor-panel-acciones")).appendChild(
            boton("Cancelar", "boton-secundario", () => { estado.abierto = null; pintar(); })
        );

        requestAnimationFrame(() => buscador.focus({preventScroll: true}));
        return panel;
    }

    function elegir(abierto, componente) {
        const fila = estado.filas[abierto.fila];
        const anterior = fila[abierto.lado];
        // Si es el mismo componente, conserva sus parámetros.
        const parametros = anterior && anterior.componente === componente.codigo ? anterior.parametros : {};
        fila[abierto.lado] = {componente: componente.codigo, parametros: {...parametros}};
        avisar("");
        if (componente.parametros.length) {
            estado.abierto = {...abierto, paso: "parametros", codigo: componente.codigo};
        } else {
            estado.abierto = null;
        }
        pintar();
    }


    /* ---------- parámetros ---------- */

    function textoDefecto(parametro) {
        if (parametro.defecto === null || parametro.defecto === undefined || parametro.defecto === "") {
            return "Por defecto";
        }
        return `Por defecto (${nombreValor(parametro, parametro.defecto)})`;
    }

    function control(parametro, valor) {
        const id = `dashParam-${parametro.atributo}`;

        if (parametro.tipo === "SI_NO") {
            const selector = crear("select");
            selector.id = id;
            selector.append(new Option(textoDefecto(parametro), ""), new Option("Sí", "si"), new Option("No", "no"));
            selector.value = valor || "";
            return {nodo: selector, leer: () => selector.value};
        }

        if (parametro.tipo === "NUMERO") {
            const numero = crear("input");
            numero.id = id;
            numero.type = "number";
            numero.inputMode = parametro.decimales ? "decimal" : "numeric";
            if (parametro.minimo !== null) numero.min = String(parametro.minimo);
            if (parametro.maximo !== null) numero.max = String(parametro.maximo);
            numero.step = parametro.decimales ? "any" : "1";
            numero.placeholder = textoDefecto(parametro);
            numero.value = valor || "";
            return {nodo: numero, leer: () => numero.value.trim()};
        }

        if (parametro.tipo === "TEXTO") {
            const texto = crear("input");
            texto.id = id;
            texto.type = "text";
            if (parametro.maximo !== null) texto.maxLength = parametro.maximo;
            texto.placeholder = textoDefecto(parametro);
            texto.value = valor || "";
            return {nodo: texto, leer: () => texto.value.trim()};
        }

        // LISTA: fija o de la base.
        const elegidos = new Set(String(valor || "").split(",").map(v => v.trim()).filter(Boolean));

        if (parametro.multiple && !parametro.lista) {
            const casillas = crear("div", "dash-editor-casillas");
            casillas.id = id;
            const marcas = [];
            for (const opcion of parametro.valores) {
                const linea = crear("label", "check-linea");
                const marca = crear("input");
                marca.type = "checkbox";
                marca.value = opcion.valor;
                marca.checked = elegidos.has(opcion.valor);
                linea.append(marca, document.createTextNode(` ${opcion.nombre}`));
                casillas.appendChild(linea);
                marcas.push(marca);
            }
            return {nodo: casillas, leer: () => marcas.filter(m => m.checked).map(m => m.value).join(",")};
        }

        const selector = crear("select");
        selector.id = id;
        selector.multiple = parametro.multiple;
        if (parametro.multiple) {
            selector.size = 8;
        } else {
            selector.appendChild(new Option(parametro.obligatorio ? "Elige uno…" : textoDefecto(parametro), ""));
        }

        function poner(valores) {
            for (const opcion of valores) {
                const elemento = new Option(opcion.nombre, opcion.valor);
                elemento.selected = elegidos.has(opcion.valor);
                selector.appendChild(elemento);
            }
            // Un valor guardado que ya no está en la lista se conserva a la vista.
            for (const guardado of elegidos) {
                if (!valores.some(v => v.valor === guardado)) {
                    const elemento = new Option(`${guardado} (ya no está en la lista)`, guardado);
                    elemento.selected = true;
                    selector.appendChild(elemento);
                }
            }
        }

        if (parametro.lista) {
            selector.disabled = true;
            const cargando = new Option("Cargando…", "");
            selector.appendChild(cargando);
            cargarLista(parametro.lista)
                .then(valores => {
                    cargando.remove();
                    poner(valores);
                    nombresLista.set(parametro.lista, new Map(valores.map(v => [v.valor, v.nombre])));
                    selector.disabled = false;
                })
                .catch(error => {
                    cargando.textContent = "No se ha podido cargar la lista";
                    console.error(error);
                });
        } else {
            poner(parametro.valores);
        }

        return {
            nodo: selector,
            leer: () => [...selector.selectedOptions].map(o => o.value).filter(Boolean).join(",")
        };
    }

    function pintarParametros(abierto) {
        const fila = estado.filas[abierto.fila];
        const recuadro = fila[abierto.lado];
        const componente = porCodigo.get(abierto.codigo);
        const panel = crear("div", "dash-editor-panel");
        panel.appendChild(crear("h4", "dash-editor-panel-titulo", `${componente.nombre} · parámetros`));

        const formulario = crear("div", "formulario-grid");
        const lectores = [];
        for (const parametro of componente.parametros) {
            const campo = crear("div", "campo");
            const etiqueta = crear("label", null, parametro.nombre + (parametro.obligatorio ? " *" : ""));
            const {nodo, leer} = control(parametro, recuadro.parametros[parametro.atributo]);
            etiqueta.htmlFor = nodo.id;
            campo.append(etiqueta, nodo);
            const ayudas = [];
            if (parametro.ayuda) ayudas.push(parametro.ayuda);
            if (parametro.tipo === "NUMERO" && parametro.minimo !== null && parametro.maximo !== null) {
                ayudas.push(`De ${parametro.minimo} a ${parametro.maximo}.`);
            }
            if (parametro.multiple && parametro.lista) {
                ayudas.push("Varios: mantén pulsado Ctrl (o ⌘) al elegir; en el móvil, toca cada uno.");
            }
            if (ayudas.length) {
                campo.appendChild(crear("div", "campo-ayuda", ayudas.join(" ")));
            }
            formulario.appendChild(campo);
            lectores.push([parametro, leer]);
        }
        panel.appendChild(formulario);

        const acciones = crear("div", "dash-editor-panel-acciones");
        acciones.appendChild(boton("Aceptar", "boton-principal", () => {
            const parametros = {};
            for (const [parametro, leer] of lectores) {
                const valor = leer();
                if (!valor && parametro.obligatorio) {
                    avisar(`${componente.nombre}: falta ${parametro.nombre.toLowerCase()}.`);
                    return;
                }
                if (valor) {
                    parametros[parametro.atributo] = valor;
                }
            }
            recuadro.parametros = parametros;
            estado.abierto = null;
            avisar("");
            pintar();
        }));
        acciones.appendChild(boton("Cancelar", "boton-secundario", () => {
            // Recién elegido y con algo obligatorio sin poner: no se queda a medias.
            if (componente.parametros.some(p => p.obligatorio && !recuadro.parametros[p.atributo])) {
                fila[abierto.lado] = null;
            }
            estado.abierto = null;
            avisar("");
            pintar();
        }));
        panel.appendChild(acciones);
        return panel;
    }


    /* ---------- vista previa y guardar ---------- */

    function datos() {
        const salida = recuadro => recuadro ? {componente: recuadro.componente, parametros: {...recuadro.parametros}} : null;
        return {
            titulo: estado.titulo.trim(),
            descripcion: estado.descripcion.trim(),
            formato: estado.formato,
            filas: estado.filas.map(fila => ({
                columnas: fila.columnas,
                primera: salida(fila.primera),
                segunda: fila.columnas === 2 ? salida(fila.segunda) : null
            }))
        };
    }

    const previa = crear("div", "dash-editor-previa");

    async function pintarPrevia() {
        previa.textContent = "";
        if (!estado.previa) {
            previa.hidden = true;
            return;
        }
        previa.hidden = false;
        previa.dataset.formato = estado.formato;
        previa.appendChild(crear("h4", "dash-editor-panel-titulo", estado.formato === "MOVIL" ? "Vista previa · móvil" : "Vista previa · PC"));
        const lienzo = crear("div", "dash-editor-lienzo");
        previa.appendChild(lienzo);
        const recuadro = r => {
            const componente = r && porCodigo.get(r.componente);
            return componente ? {etiqueta: componente.etiqueta, parametros: r.parametros} : null;
        };
        const dashboard = {
            formato: estado.formato,
            filas: estado.filas.map((fila, indice) => ({
                orden: indice + 1,
                columnas: fila.columnas,
                primera: recuadro(fila.primera),
                segunda: fila.columnas === 2 ? recuadro(fila.segunda) : null
            }))
        };
        if (!dashboard.filas.some(f => f.primera || f.segunda)) {
            lienzo.appendChild(crear("p", "dash-editor-vacio", "Todavía no hay componentes."));
            return;
        }
        await pintarDashboard(lienzo, dashboard);
    }

    async function guardar() {
        const salida = datos();
        if (!salida.titulo || !salida.descripcion) {
            avisar("Pon el título y la descripción.");
            return;
        }
        if (estado.filas.some(f => [f.primera, f.segunda].some(r => r && !porCodigo.has(r.componente)))) {
            avisar("Hay componentes que ya no están en el catálogo: quítalos o cámbialos antes de guardar.");
            return;
        }
        estado.guardando = true;
        pintar();
        avisar("Guardando…", "info");
        try {
            await opciones.guardar(salida);
            avisar("Guardado.", "ok");
        } catch (error) {
            avisar(error.message || "No se ha podido guardar.");
        } finally {
            estado.guardando = false;
            pintar();
        }
    }


    /* ---------- pintar todo ---------- */

    function pintar(conPrevia = false) {
        raiz.textContent = "";
        raiz.appendChild(pintarCabecera());

        const rejilla = crear("div", "dash-editor-rejilla");
        rejilla.dataset.formato = estado.formato;
        if (!estado.filas.length) {
            rejilla.appendChild(crear("p", "dash-editor-vacio", "Todavía no hay filas: añade la primera."));
        }
        estado.filas.forEach((fila, indice) => rejilla.appendChild(pintarFila(fila, indice)));
        raiz.appendChild(rejilla);

        const anadir = crear("div", "dash-editor-anadir");
        if (estado.formato === "PC") {
            anadir.append(
                boton("+ Fila de una columna", "boton-secundario", () => anadirFila(1)),
                boton("+ Fila de dos columnas", "boton-secundario", () => anadirFila(2))
            );
        } else {
            anadir.appendChild(boton("+ Añadir fila", "boton-secundario", () => anadirFila(1)));
        }
        raiz.appendChild(anadir);

        const pie = crear("div", "dash-editor-pie");
        const botonPrevia = boton(estado.previa ? "Ocultar la vista previa" : "Vista previa", "boton-secundario", () => {
            estado.previa = !estado.previa;
            pintar(true);
        });
        const botonActualizar = estado.previa ? boton("Actualizar la vista previa", "boton-secundario", () => pintar(true)) : null;
        const botonGuardar = boton(estado.guardando ? "Guardando…" : "Guardar", "boton-principal", guardar);
        botonGuardar.disabled = estado.guardando;
        const botonCancelar = boton("Cancelar", "boton-secundario", () => {
            if (opciones.cancelar) opciones.cancelar();
        });
        pie.append(...[botonPrevia, botonActualizar, botonGuardar, botonCancelar].filter(Boolean));
        raiz.appendChild(pie);
        raiz.appendChild(mensaje);
        raiz.appendChild(previa);

        if (conPrevia) {
            pintarPrevia().catch(error => console.error("Vista previa", error));
        }
    }

    pintar(true);
    return {datos};
}


/* Fin de fichero: js/dashboards/editor.js */
