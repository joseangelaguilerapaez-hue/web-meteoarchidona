/*
 * MeteoArchidona · Mi web · página de una pestaña
 *
 * /mi-web?pestana=1, 2 o 3 (José, 5 y 17-11-2026; docs/dashboards.md de
 * la API):
 *
 * - Título: la descripción de la pestaña; el lápiz cambia nombre y
 *   descripción sin salir de ella.
 * - Formato de la pantalla: móvil por debajo de 850 px (el mismo corte
 *   de la versión de prueba de Actualidad).
 * - Selector con los dashboards de ese formato (los de MeteoArchidona y
 *   los suyos) y «Fijar»; «Quitar» deja la pestaña vacía.
 * - «Crear dashboard» y «Copiar» el elegido; «Editar» y «Borrar» si es
 *   suyo. El editor común (js/dashboards/editor.js) se abre en la misma
 *   página. Uno nuevo se fija en esta pestaña al guardarlo.
 * - Sin nada fijado, la pestaña sale vacía, con el selector y «Crear».
 *
 * Límites de la API: tres pestañas y 20 dashboards suyos.
 * El texto nunca se mete como HTML.
 */

import {avisarCambio, crear, llamar} from "./comun.js?v=20261117-miweb1";
import {pintarDashboard} from "../dashboards/pintor.js?v=20261121-llenar1";
import {abrirEditor} from "../dashboards/editor.js?v=20261121-llenar1";


const CORTE_MOVIL = "(max-width: 850px)";
const NOMBRE_FORMATO = {PC: "PC", MOVIL: "móvil"};

const estado = {
    orden: 1,
    pestana: null,
    formato: "PC",
    disponibles: [],
    fijado: null,
    elegido: "",
    renombrando: false,
    editando: false
};

let cargando = null;


function $(id) {
    return document.getElementById(id);
}


function formatoActual() {
    return window.matchMedia(CORTE_MOVIL).matches ? "MOVIL" : "PC";
}


function avisar(texto, tipo) {
    const nodo = $("estadoMiWeb");
    nodo.textContent = texto || "";
    nodo.dataset.tipo = tipo || "";
}


function boton(texto, clase, accion) {
    const nodo = crear("button", `mi-web-boton ${clase || ""}`.trim(), texto);
    nodo.type = "button";
    nodo.addEventListener("click", accion);
    return nodo;
}


function leerOrden() {
    const numero = Number(new URLSearchParams(window.location.search).get("pestana"));
    return Number.isInteger(numero) && numero >= 1 && numero <= 3 ? numero : 1;
}


/* ==========================================================
   CABECERA Y RENOMBRAR
   ========================================================== */

function pintarCabecera() {
    const pestana = estado.pestana;
    $("etiquetaMiWeb").textContent = `METEOARCHIDONA · MI WEB · ${pestana.nombre.toUpperCase()}`;
    const titulo = $("tituloMiWeb");
    titulo.replaceChildren(document.createTextNode(pestana.descripcion));
    const lapiz = boton("✎", "mi-web-lapiz", () => {
        estado.renombrando = !estado.renombrando;
        pintar();
    });
    lapiz.title = "Cambiar el nombre y la descripción";
    lapiz.setAttribute("aria-label", lapiz.title);
    titulo.appendChild(lapiz);
    document.title = `${pestana.nombre} · Mi web · MeteoArchidona`;
}


function formularioRenombrar() {
    const form = crear("form", "mi-web-bloque mi-web-renombrar");
    form.noValidate = true;

    const nombre = crear("input");
    nombre.type = "text";
    nombre.maxLength = 30;
    nombre.value = estado.pestana.nombre;
    nombre.id = "miWebNombre";
    const descripcion = crear("input");
    descripcion.type = "text";
    descripcion.maxLength = 150;
    descripcion.value = estado.pestana.descripcion;
    descripcion.id = "miWebDescripcion";

    const etiquetaNombre = crear("label", "mi-web-campo", "Nombre en el menú (hasta 30)");
    etiquetaNombre.htmlFor = nombre.id;
    const etiquetaDescripcion = crear("label", "mi-web-campo", "Descripción (el título)");
    etiquetaDescripcion.htmlFor = descripcion.id;

    const acciones = crear("div", "mi-web-acciones");
    const guardar = crear("button", "mi-web-boton mi-web-boton-principal", "Guardar");
    guardar.type = "submit";
    acciones.append(guardar, boton("Cancelar", "", () => { estado.renombrando = false; pintar(); }));

    form.append(etiquetaNombre, nombre, etiquetaDescripcion, descripcion, acciones);
    form.addEventListener("submit", async evento => {
        evento.preventDefault();
        const datos = {nombre: nombre.value.trim(), descripcion: descripcion.value.trim()};
        if (!datos.nombre || !datos.descripcion) {
            avisar("Pon el nombre y la descripción.", "error");
            return;
        }
        try {
            await llamar("PATCH", `/usuarios/mi-web/${estado.pestana.identificador}`, datos);
            estado.renombrando = false;
            avisarCambio();
            await cargar();
            avisar("Guardado.", "ok");
        } catch (error) {
            avisar(error.message, "error");
        }
    });
    return form;
}


/* ==========================================================
   BARRA: SELECTOR, FIJAR Y ACCIONES
   ========================================================== */

function elegidoActual() {
    return estado.disponibles.find(d => d.identificador === estado.elegido) || null;
}


function pintarBarra() {
    const barra = crear("div", "mi-web-bloque mi-web-barra");

    const etiqueta = crear("label", "mi-web-campo", `Dashboard de ${NOMBRE_FORMATO[estado.formato]}`);
    const selector = crear("select");
    selector.id = "miWebSelector";
    etiqueta.htmlFor = selector.id;
    selector.appendChild(new Option("Elige un dashboard…", ""));

    const grupos = [
        ["De MeteoArchidona", estado.disponibles.filter(d => !d.propio)],
        ["Míos", estado.disponibles.filter(d => d.propio)]
    ];
    for (const [nombre, lista] of grupos) {
        if (!lista.length) continue;
        const grupo = document.createElement("optgroup");
        grupo.label = nombre;
        for (const dashboard of lista) {
            const marca = estado.fijado && dashboard.identificador === estado.fijado.identificador ? " (fijado)" : "";
            grupo.appendChild(new Option(`${dashboard.titulo} — ${dashboard.descripcion}${marca}`, dashboard.identificador));
        }
        selector.appendChild(grupo);
    }
    selector.value = estado.elegido;
    selector.addEventListener("change", () => {
        estado.elegido = selector.value;
        pintar();
    });

    const elegido = elegidoActual();
    const acciones = crear("div", "mi-web-acciones");

    const fijar = boton("Fijar", "mi-web-boton-principal", () => fijarEn(estado.elegido));
    fijar.disabled = !elegido || (estado.fijado && elegido.identificador === estado.fijado.identificador);
    acciones.appendChild(fijar);
    if (estado.fijado) {
        acciones.appendChild(boton("Quitar", "", () => fijarEn(null)));
    }
    acciones.appendChild(boton("Crear dashboard", "", () => editar(null, false)));
    if (elegido) {
        acciones.appendChild(boton("Copiar", "", () => editar(elegido.identificador, true)));
    }
    if (elegido && elegido.propio) {
        acciones.appendChild(boton("Editar", "", () => editar(elegido.identificador, false)));
        acciones.appendChild(boton("Borrar", "mi-web-boton-peligro", () => borrar(elegido)));
    }

    barra.append(etiqueta, selector, acciones);
    return barra;
}


async function fijarEn(identificador) {
    try {
        await llamar("PUT", `/usuarios/mi-web/${estado.pestana.identificador}/dashboard`, {
            formato: estado.formato,
            dashboard: identificador || null
        });
        avisarCambio();
        await cargar();
        avisar(identificador ? "Fijado en esta pestaña." : "La pestaña se queda vacía.", "ok");
    } catch (error) {
        avisar(error.message, "error");
    }
}


async function borrar(dashboard) {
    if (!window.confirm(`¿Borrar «${dashboard.titulo}»? No se puede deshacer; las pestañas que lo tengan fijado se quedarán vacías.`)) {
        return;
    }
    try {
        await llamar("DELETE", `/dashboards/${dashboard.identificador}`);
        estado.elegido = "";
        avisarCambio();
        await cargar();
        avisar(`Borrado «${dashboard.titulo}».`, "ok");
    } catch (error) {
        avisar(error.message, "error");
    }
}


/* ==========================================================
   EDITOR
   ========================================================== */

async function editar(identificador, copia) {
    let dashboard = null;
    try {
        if (identificador) {
            dashboard = await llamar("GET", `/dashboards/${identificador}`);
        }
    } catch (error) {
        avisar(error.message, "error");
        return;
    }

    estado.editando = true;
    avisar("");
    const contenido = $("miWebContenido");
    contenido.replaceChildren();
    const panel = crear("section", "mi-web-bloque mi-web-editor");
    panel.appendChild(crear("h2", "mi-web-subtitulo",
        !dashboard ? "Nuevo dashboard" : copia ? `Copia de «${dashboard.titulo}»` : `Editar «${dashboard.titulo}»`));
    const hueco = crear("div");
    panel.appendChild(hueco);
    contenido.appendChild(panel);

    await abrirEditor(hueco, {
        dashboard,
        copia,
        formato: estado.formato,
        guardar: async datos => {
            if (dashboard && !copia) {
                const {formato: _, ...cambio} = datos;
                await llamar("PUT", `/dashboards/${dashboard.identificador}`, cambio);
                estado.elegido = dashboard.identificador;
            } else {
                const nuevo = await llamar("POST", "/dashboards", datos);
                // Uno nuevo se fija en esta pestaña al guardarlo.
                await llamar("PUT", `/usuarios/mi-web/${estado.pestana.identificador}/dashboard`, {
                    formato: nuevo.formato,
                    dashboard: nuevo.identificador
                });
                estado.elegido = nuevo.identificador;
                avisarCambio();
            }
            estado.editando = false;
            await cargar();
            avisar(`Guardado «${datos.titulo}».`, "ok");
        },
        cancelar: () => {
            estado.editando = false;
            pintar();
        }
    });
    panel.scrollIntoView({behavior: "smooth", block: "start"});
}


/* ==========================================================
   PINTAR Y CARGAR
   ========================================================== */

function pintar() {
    const contenido = $("miWebContenido");
    contenido.replaceChildren();
    pintarCabecera();

    if (estado.renombrando) {
        contenido.appendChild(formularioRenombrar());
    }
    contenido.appendChild(pintarBarra());

    const zona = crear("div", "mi-web-dashboard");
    contenido.appendChild(zona);
    if (!estado.fijado) {
        const vacia = crear("div", "mi-web-bloque mi-web-vacia");
        vacia.appendChild(crear("p", null,
            `Esta pestaña no tiene dashboard de ${NOMBRE_FORMATO[estado.formato]}. ` +
            "Elige uno de la lista y pulsa «Fijar», o crea el tuyo."));
        zona.appendChild(vacia);
        return;
    }
    pintarDashboard(zona, estado.fijado).catch(error => {
        console.error("Mi web", error);
        zona.replaceChildren(crear("p", "mi-web-bloque", "No se ha podido pintar el dashboard."));
    });
}


async function cargarTodo() {
    estado.orden = leerOrden();
    estado.formato = formatoActual();

    let pestanas;
    try {
        pestanas = await llamar("GET", "/usuarios/mi-web");
    } catch (error) {
        if (error.codigoHttp === 401) {
            $("miWebContenido").hidden = true;
            $("miWebSinSesion").hidden = false;
            $("tituloMiWeb").textContent = "Mi web";
            avisar("");
            return;
        }
        avisar(error.message, "error");
        return;
    }

    $("miWebSinSesion").hidden = true;
    estado.pestana = pestanas.find(p => p.orden === estado.orden) || null;
    if (!estado.pestana) {
        $("miWebContenido").hidden = true;
        $("tituloMiWeb").textContent = "Mi web";
        const aviso = $("estadoMiWeb");
        aviso.dataset.tipo = "";
        aviso.replaceChildren(
            document.createTextNode(`No tienes la pestaña ${estado.orden}. Créala en `),
            Object.assign(crear("a", null, "Mi cuenta → Mi web"), {href: "/mi-cuenta#miweb"}),
            document.createTextNode(".")
        );
        return;
    }

    const [contenido, disponibles] = await Promise.all([
        llamar("GET", `/usuarios/mi-web/${estado.pestana.identificador}/contenido?formato=${estado.formato}`),
        llamar("GET", `/dashboards?formato=${estado.formato}`)
    ]);
    estado.fijado = contenido.dashboard;
    estado.disponibles = disponibles;
    if (!estado.elegido || !disponibles.some(d => d.identificador === estado.elegido)) {
        estado.elegido = estado.fijado ? estado.fijado.identificador : "";
    }

    $("miWebContenido").hidden = false;
    avisar("");
    if (!estado.editando) {
        pintar();
    }
}


function cargar() {
    if (cargando === null) {
        cargando = cargarTodo()
            .catch(error => avisar(error.message || "No se ha podido cargar la pestaña.", "error"))
            .finally(() => { cargando = null; });
    }
    return cargando;
}


function arrancar() {
    // js/cuenta.js avisa al entrar y al salir.
    document.addEventListener("meteoarchidona:cuenta", () => void cargar());
    // Al cruzar el corte de móvil, el otro formato.
    window.matchMedia(CORTE_MOVIL).addEventListener("change", () => {
        if (!estado.editando) {
            estado.elegido = "";
            void cargar();
        }
    });
    void cargar();
}


arrancar();


/* Fin de fichero: js/mi-web/pagina.js */
