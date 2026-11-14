/*
 * MeteoArchidona · Página Embalses
 *
 * Decisión de José del 5-11-2026: la sección de embalses de su antigua
 * web, con datos propios del Ministerio y a nivel nacional, toda en
 * componentes que se puedan poner en los dashboards, y con un aspecto
 * propio de agua (blanco y azules) frente al oscuro del resto del sitio.
 *
 * Componentes (cada uno en su módulo, con su hoja
 * css/embalses-componentes.css):
 *
 *     data-componente="embalses-resumen"            → js/embalses/resumen.js
 *     data-componente="embalses-cuencas"            → js/embalses/cuencas.js
 *     data-componente="embalses-anio-hidrologico"   → js/embalses/anio-hidrologico.js
 *     data-componente="embalses-lista"              → js/embalses/lista.js
 *     data-componente="embalses-ficha"              → js/embalses/ficha.js
 *     data-componente="embalses-comarca"            → js/embalses/comarca.js
 *
 * Este script solo monta los componentes y lleva el selector de ámbito:
 * Andalucía por defecto; España, cualquier comunidad, cuenca o provincia.
 * Los huecos con data-sigue-ambito cambian con el selector. La dirección
 * guarda la elección, para poder compartirla:
 *
 *     /embalses?ambito=CUENCA&codigo=GUADALQUIVIR
 *     /embalses?embalse=GUADALQUIVIR-IZNAJAR       (con la ficha abierta)
 *
 * Detalle en docs/embalses.md.
 *
 * Agua y sequía (José, 14-11-2026; docs/agua-sequia.md de la API): la
 * página se llama ahora «Agua y sequía» y va en pestañas, como
 * Predicción: Embalses (por defecto), Sequía y Ríos. La pestaña abierta
 * queda en la dirección (/embalses#sequia). Los componentes de Sequía
 * (js/sequia/*.js) se cargan la primera vez que se abre su pestaña:
 *
 *     data-componente="sequia-suelo"         → js/sequia/suelo.js
 *     data-componente="sequia-lluvia-anio"   → js/sequia/lluvia-anio.js
 *     data-componente="sequia-indices"       → js/sequia/indices.js
 */

import {montarResumenEmbalses} from "./embalses/resumen.js?v=20261105-embalses1";
import {montarCuencasEmbalses} from "./embalses/cuencas.js?v=20261105-embalses1";
import {montarAnioHidrologico} from "./embalses/anio-hidrologico.js?v=20261105-embalses1";
import {montarListaEmbalses} from "./embalses/lista.js?v=20261105-embalses1";
import {montarFichaEmbalse} from "./embalses/ficha.js?v=20261105-embalses1";
import {montarComarcaEmbalses} from "./embalses/comarca.js?v=20261105-embalses1";
import {AMBITO_DEFECTO, CODIGO_DEFECTO, pedir, crear} from "./embalses/comun.js?v=20261105-embalses1";


export const COMPONENTES_EMBALSES = {
    "embalses-resumen": montarResumenEmbalses,
    "embalses-cuencas": montarCuencasEmbalses,
    "embalses-anio-hidrologico": montarAnioHidrologico,
    "embalses-lista": montarListaEmbalses,
    "embalses-ficha": montarFichaEmbalse,
    "embalses-comarca": montarComarcaEmbalses
};


const COMPONENTES_SEQUIA = {
    "sequia-suelo": ["./sequia/suelo.js?v=20261114-sequia1", "montarSueloSequia"],
    "sequia-lluvia-anio": ["./sequia/lluvia-anio.js?v=20261114-sequia1", "montarLluviaAnioSequia"],
    "sequia-indices": ["./sequia/indices.js?v=20261114-sequia1", "montarIndicesSequia"]
};

const PESTANA_POR_DEFECTO = "embalses";

const pestanas = [...document.querySelectorAll(".agua-pestana[data-pestana]")];
const montadosSequia = new WeakSet();

const selector = document.querySelector(".embalses-selector select");
const titulo = document.querySelector(".embalses-titulo-ambito");
const bloqueFicha = document.querySelector(".embalses-bloque-ficha");

let ambitoActual = { ambito: AMBITO_DEFECTO, codigo: CODIGO_DEFECTO, nombre: CODIGO_DEFECTO };


function montar(hueco) {
    const montarComponente = COMPONENTES_EMBALSES[hueco.dataset.componente];
    if (!montarComponente) return;
    try {
        const promesa = montarComponente(hueco);
        if (promesa && promesa.catch) {
            promesa.catch(error => console.error(`Embalses: falló ${hueco.dataset.componente}`, error));
        }
    } catch (error) {
        console.error(`Embalses: no se pudo montar ${hueco.dataset.componente}`, error);
    }
}

async function montarSequia(hueco) {
    const definicion = COMPONENTES_SEQUIA[hueco.dataset.componente];
    if (!definicion || montadosSequia.has(hueco)) return;
    montadosSequia.add(hueco);
    try {
        const modulo = await import(definicion[0]);
        await modulo[definicion[1]](hueco);
    } catch (error) {
        console.error(`Sequía: falló ${hueco.dataset.componente}`, error);
    }
}

function abrirPestana(nombre, { foco = false, guardar = true } = {}) {
    if (!pestanas.length) return;
    const elegida = pestanas.find(p => p.dataset.pestana === nombre)
        || pestanas.find(p => p.dataset.pestana === PESTANA_POR_DEFECTO);
    for (const pestana of pestanas) {
        const activa = pestana === elegida;
        const panel = document.getElementById(pestana.getAttribute("aria-controls"));
        pestana.setAttribute("aria-selected", String(activa));
        pestana.tabIndex = activa ? 0 : -1;
        pestana.classList.toggle("activa", activa);
        if (panel) panel.hidden = !activa;
        if (activa && panel) {
            for (const hueco of panel.querySelectorAll("[data-componente]")) montarSequia(hueco);
        }
    }
    if (foco) elegida.focus();
    if (guardar) {
        const hash = elegida.dataset.pestana === PESTANA_POR_DEFECTO ? "" : `#${elegida.dataset.pestana}`;
        history.replaceState(null, "", `${location.pathname}${location.search}${hash}`);
    }
}

function iniciarPestanas() {
    for (const pestana of pestanas) {
        pestana.addEventListener("click", () => abrirPestana(pestana.dataset.pestana));
        pestana.addEventListener("keydown", evento => {
            const indice = pestanas.indexOf(pestana);
            let destino = null;
            if (evento.key === "ArrowRight") destino = pestanas[(indice + 1) % pestanas.length];
            if (evento.key === "ArrowLeft") destino = pestanas[(indice - 1 + pestanas.length) % pestanas.length];
            if (evento.key === "Home") destino = pestanas[0];
            if (evento.key === "End") destino = pestanas[pestanas.length - 1];
            if (destino) {
                evento.preventDefault();
                abrirPestana(destino.dataset.pestana, { foco: true });
            }
        });
    }
    window.addEventListener("hashchange", () => abrirPestana(location.hash.slice(1) || PESTANA_POR_DEFECTO, { guardar: false }));
    abrirPestana(location.hash.slice(1) || PESTANA_POR_DEFECTO, { guardar: false });
}

function valorSelector({ ambito, codigo }) {
    return ambito === "ESPANA" ? "ESPANA|" : `${ambito}|${codigo}`;
}

function leerDireccion() {
    const parametros = new URLSearchParams(window.location.search);
    const ambito = (parametros.get("ambito") || AMBITO_DEFECTO).toUpperCase();
    return {
        ambito,
        codigo: ambito === "ESPANA" ? "" : (parametros.get("codigo") || (ambito === AMBITO_DEFECTO ? CODIGO_DEFECTO : "")),
        embalse: (parametros.get("embalse") || "").toUpperCase()
    };
}

function guardarDireccion(ambito, embalse) {
    const parametros = new URLSearchParams();
    if (embalse) {
        parametros.set("embalse", embalse);
    } else if (!(ambito.ambito === AMBITO_DEFECTO && ambito.codigo === CODIGO_DEFECTO)) {
        parametros.set("ambito", ambito.ambito);
        if (ambito.codigo) parametros.set("codigo", ambito.codigo);
    }
    const consulta = parametros.toString();
    const direccion = `${window.location.pathname}${consulta ? `?${consulta}` : ""}${window.location.hash}`;
    if (direccion !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
        history.pushState(null, "", direccion);
    }
}

function nombreAmbito({ ambito, codigo }) {
    const opcion = selector && selector.querySelector(`option[value="${CSS.escape(valorSelector({ ambito, codigo }))}"]`);
    if (opcion) return opcion.dataset.nombre || opcion.textContent;
    return ambito === "ESPANA" ? "España" : codigo;
}

function ponerAmbito(ambito) {
    ambitoActual = { ambito: ambito.ambito, codigo: ambito.codigo, nombre: nombreAmbito(ambito) };

    if (titulo) ponerTitulo();

    if (selector) selector.value = valorSelector(ambitoActual);

    for (const hueco of document.querySelectorAll("[data-sigue-ambito]")) {
        hueco.dataset.ambito = ambitoActual.ambito;
        if (ambitoActual.codigo) {
            hueco.dataset.codigo = ambitoActual.codigo;
        } else {
            delete hueco.dataset.codigo;
        }
        montar(hueco);
    }
}

function abrirFicha(codigo, desplazar = true) {
    if (!bloqueFicha) return;
    const hueco = bloqueFicha.querySelector('[data-componente="embalses-ficha"]');
    if (!codigo) {
        bloqueFicha.hidden = true;
        return;
    }
    bloqueFicha.hidden = false;
    hueco.dataset.embalse = codigo;
    montar(hueco);
    if (desplazar) bloqueFicha.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function llenarSelector() {
    if (!selector) return;
    let ambitos;
    try {
        ambitos = await pedir("/embalses/ambitos");
    } catch (error) {
        console.error("Embalses: no se pudieron leer los ámbitos", error);
        return;
    }

    selector.textContent = "";
    const espana = crear("option", null, "Toda España");
    espana.value = "ESPANA|";
    espana.dataset.nombre = "España";
    selector.appendChild(espana);

    const grupos = [
        ["Comunidades autónomas", ambitos.comunidades.map(nombre => ["COMUNIDAD", nombre, nombre])],
        ["Cuencas hidrográficas", ambitos.cuencas.map(cuenca => ["CUENCA", cuenca.codigo, cuenca.nombre])],
        ["Provincias", ambitos.provincias.map(provincia => ["PROVINCIA", provincia.nombre, provincia.nombre])]
    ];

    for (const [etiqueta, opciones] of grupos) {
        if (!opciones.length) continue;
        const grupo = crear("optgroup");
        grupo.label = etiqueta;
        for (const [ambito, codigo, nombre] of opciones) {
            const opcion = crear("option", null, nombre);
            opcion.value = `${ambito}|${codigo}`;
            opcion.dataset.nombre = nombre;
            grupo.appendChild(opcion);
        }
        selector.appendChild(grupo);
    }

    selector.value = valorSelector(ambitoActual);
    // El título, con el nombre bonito de la cuenca que ya conocemos.
    if (titulo) ponerTitulo();
}

function ponerTitulo() {
    const nombre = nombreAmbito(ambitoActual);
    ambitoActual.nombre = nombre;
    if (ambitoActual.ambito === "ESPANA") {
        titulo.textContent = "toda España";
    } else if (ambitoActual.ambito === "CUENCA") {
        titulo.textContent = `la cuenca: ${nombre}`;
    } else {
        titulo.textContent = nombre;
    }
}

function iniciar() {
    iniciarPestanas();
    const direccion = leerDireccion();

    // Lo fijo (la comarca) se monta una vez.
    for (const hueco of document.querySelectorAll("[data-componente]:not([data-sigue-ambito])")) {
        if (hueco.dataset.componente !== "embalses-ficha") montar(hueco);
    }

    ponerAmbito(direccion);
    abrirFicha(direccion.embalse, Boolean(direccion.embalse) && !location.hash);

    llenarSelector();

    if (selector) {
        selector.addEventListener("change", () => {
            const [ambito, codigo] = selector.value.split("|");
            const nuevo = { ambito, codigo };
            guardarDireccion(nuevo, "");
            abrirFicha("");
            ponerAmbito(nuevo);
        });
    }

    // Una tarjeta de cuenca: cambia el ámbito sin salir de la página.
    document.addEventListener("embalses:ambito", evento => {
        evento.preventDefault();
        const nuevo = { ambito: evento.detail.ambito, codigo: evento.detail.codigo };
        guardarDireccion(nuevo, "");
        abrirFicha("");
        ponerAmbito(nuevo);
        window.scrollTo({ top: 0, behavior: "smooth" });
    });

    // Un embalse de la lista o de la comarca: abre su ficha arriba.
    document.addEventListener("embalses:embalse", evento => {
        evento.preventDefault();
        guardarDireccion(ambitoActual, evento.detail.codigo);
        abrirFicha(evento.detail.codigo);
    });

    const cerrar = bloqueFicha && bloqueFicha.querySelector(".embalses-cerrar");
    if (cerrar) {
        cerrar.addEventListener("click", () => {
            guardarDireccion(ambitoActual, "");
            abrirFicha("");
        });
    }

    window.addEventListener("popstate", () => {
        const nueva = leerDireccion();
        ponerAmbito(nueva);
        abrirFicha(nueva.embalse, false);
    });
}


iniciar();

/* Fin de fichero: js/embalses.js */
