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
    const direccion = `${window.location.pathname}${consulta ? `?${consulta}` : ""}`;
    if (direccion !== `${window.location.pathname}${window.location.search}`) {
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
    const direccion = leerDireccion();

    // Lo fijo (la comarca) se monta una vez.
    for (const hueco of document.querySelectorAll("[data-componente]:not([data-sigue-ambito])")) {
        if (hueco.dataset.componente !== "embalses-ficha") montar(hueco);
    }

    ponerAmbito(direccion);
    abrirFicha(direccion.embalse, Boolean(direccion.embalse));

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
