/*
 * MeteoArchidona · Orquídeas · Publicaciones
 *
 * Decisión de José y Damián Quintana del 26-11-2026: los artículos de
 * Damián y sus coautores sobre las orquídeas de Archidona y Andalucía, con
 * su revista, su DOI, su enlace o su PDF, y las especies de las que tratan
 * (cada especie del catálogo lleva a su ficha). Se filtran por año y por
 * especie. El editor de orquídeas las añade y corrige aquí mismo.
 *
 *     <div data-componente="orquideas-publicaciones"></div>
 *
 * API: GET /orquideas/publicaciones y, para el editor,
 * /orquideas/editor/publicaciones...
 */

import {
    pedir, olvidar, crear, aviso, vaciar, prepararRaiz, titulo, textoError, elegirEspecie
} from "./comun.js?v=20261126-jornadas1";
import {esEditor, alCambiarEditor, enviar, formulario, botonEditor} from "./editor.js?v=20261126-jornadas1";


const CAMPOS = [
    { nombre: "anio", etiqueta: "Año", tipo: "number", min: 1900, max: 2100, requerido: true },
    { nombre: "titulo", etiqueta: "Título", tipo: "textarea", filas: 2, requerido: true, maximo: 1000 },
    { nombre: "autores", etiqueta: "Autores", requerido: true, maximo: 2000,
      ayuda: "Como se citan: «Robles-Domínguez E, Quintana-Pozo D, Becerra-Parra M»." },
    { nombre: "revista", etiqueta: "Revista", requerido: true, maximo: 200 },
    { nombre: "referencia", etiqueta: "Volumen y páginas", maximo: 120, ayuda: "Por ejemplo, «49: 221-236»." },
    { nombre: "doi", etiqueta: "DOI", maximo: 120, ayuda: "Con o sin «https://doi.org/»." },
    { nombre: "url", etiqueta: "Enlace", tipo: "url", maximo: 500, ayuda: "Si no tiene DOI: la página o el PDF de la revista." },
    { nombre: "taxones", etiqueta: "Especies e híbridos de los que trata", tipo: "textarea", filas: 3,
      ayuda: "Uno por línea, con su nombre científico (Ophrys ×arxdominensis). Se enlazan solos con las fichas." },
    { nombre: "resumen", etiqueta: "Resumen", tipo: "textarea", filas: 4, maximo: 8000 },
    { nombre: "visible", etiqueta: "Visible en la web", tipo: "checkbox" }
];


function valoresDe(publicacion) {
    if (!publicacion) return { visible: true };
    return {
        ...publicacion,
        taxones: publicacion.taxones.map(taxon => taxon.nombre_cientifico).join("\n")
    };
}

function cuerpoDe(valores) {
    return {
        ...valores,
        taxones: (valores.taxones || "").split(/\n|;/).map(texto => texto.trim()).filter(Boolean)
    };
}

async function editar(publicacion, alCambiar) {
    const nueva = !publicacion;
    const resultado = await formulario({
        titulo: nueva ? "Nueva publicación" : "Editar la publicación",
        campos: CAMPOS,
        valores: valoresDe(publicacion),
        guardar: valores => nueva
            ? enviar("POST", "/orquideas/editor/publicaciones", cuerpoDe(valores))
            : enviar("PATCH", `/orquideas/editor/publicaciones/${publicacion.id}`, cuerpoDe(valores)),
        peligro: nueva ? null : {
            texto: "Borrar",
            confirmar: "¿Borrar esta publicación? No se puede deshacer.",
            accion: () => enviar("DELETE", `/orquideas/editor/publicaciones/${publicacion.id}`)
        }
    });
    if (resultado) alCambiar();
}

async function subirPdf(publicacion, alCambiar) {
    const resultado = await formulario({
        titulo: "Subir el PDF",
        explicacion: "Solo si la revista o los autores permiten publicarlo.",
        campos: [{ nombre: "archivo", etiqueta: "PDF", tipo: "file", acepta: "application/pdf", requerido: true }],
        textoGuardar: "Subir",
        guardar: valores => {
            const datos = new FormData();
            datos.append("archivo", valores.archivo, "publicacion.pdf");
            return enviar("POST", `/orquideas/editor/publicaciones/${publicacion.id}/pdf`, datos);
        }
    });
    if (resultado) alCambiar();
}

async function quitarPdf(publicacion, alCambiar) {
    if (!window.confirm("¿Quitar el PDF de esta publicación?")) return;
    try {
        await enviar("DELETE", `/orquideas/editor/publicaciones/${publicacion.id}/pdf`);
        alCambiar();
    } catch (error) {
        window.alert(error.message);
    }
}


function enlace(clase, texto, url) {
    const nodo = crear("a", clase, texto);
    nodo.href = url;
    nodo.target = "_blank";
    nodo.rel = "noopener noreferrer";
    return nodo;
}

/* Una publicación; también la usa la ficha de cada especie (sin taxones). */
export function tarjetaPublicacion(publicacion, { conTaxones = true, alCambiar = null } = {}) {
    const tarjeta = crear("article", "orq-publicacion");
    if (!publicacion.visible) tarjeta.classList.add("oculta");

    const referencia = [publicacion.anio, publicacion.revista, publicacion.referencia].filter(Boolean).join(" · ");
    tarjeta.appendChild(crear("span", "orq-publicacion-revista", referencia));
    tarjeta.appendChild(crear("strong", "orq-publicacion-titulo", publicacion.titulo));
    tarjeta.appendChild(crear("span", "orq-publicacion-autores", publicacion.autores));
    if (publicacion.resumen) tarjeta.appendChild(crear("p", "orq-publicacion-resumen", publicacion.resumen));

    const pie = crear("div", "orq-publicacion-pie");
    if (conTaxones) {
        for (const taxon of publicacion.taxones) {
            if (taxon.especie_id) {
                const boton = crear("button", "orq-publicacion-taxon enlazado", taxon.nombre_cientifico);
                boton.type = "button";
                boton.title = "Ver su ficha";
                boton.addEventListener("click", () => elegirEspecie(taxon.especie_id));
                pie.appendChild(boton);
            } else {
                pie.appendChild(crear("span", "orq-publicacion-taxon", taxon.nombre_cientifico));
            }
        }
    }
    const enlaces = crear("span", "orq-publicacion-enlaces");
    if (publicacion.url_doi) enlaces.appendChild(enlace("orq-publicacion-enlace", `DOI ${publicacion.doi}`, publicacion.url_doi));
    if (publicacion.url) enlaces.appendChild(enlace("orq-publicacion-enlace", "Revista", publicacion.url));
    if (publicacion.url_pdf) enlaces.appendChild(enlace("orq-publicacion-enlace", "PDF", publicacion.url_pdf));
    pie.appendChild(enlaces);
    tarjeta.appendChild(pie);

    if (alCambiar && esEditor()) {
        const botones = crear("div", "orq-editor-fila");
        if (!publicacion.visible) botones.appendChild(crear("span", "orq-marca", "Oculta"));
        botones.appendChild(botonEditor("Editar", () => editar(publicacion, alCambiar)));
        botones.appendChild(botonEditor(publicacion.url_pdf ? "Cambiar el PDF" : "Subir PDF", () => subirPdf(publicacion, alCambiar)));
        if (publicacion.url_pdf) botones.appendChild(botonEditor("Quitar el PDF", () => quitarPdf(publicacion, alCambiar)));
        tarjeta.appendChild(botones);
    }
    return tarjeta;
}


function selector(etiqueta, opciones, valor, alCambiar) {
    const caja = crear("label", "orq-selector");
    caja.appendChild(crear("span", null, etiqueta));
    const control = document.createElement("select");
    for (const opcion of opciones) {
        const nodo = document.createElement("option");
        nodo.value = opcion.valor;
        nodo.textContent = opcion.texto;
        control.appendChild(nodo);
    }
    control.value = valor;
    control.addEventListener("change", () => alCambiar(control.value));
    caja.appendChild(control);
    return caja;
}


export async function montarPublicacionesOrquideas(raiz) {
    prepararRaiz(raiz, "orq-publicaciones");
    titulo(raiz, "PUBLICACIONES", "Publicaciones científicas");
    const filtros = crear("div", "orq-publicaciones-filtros");
    const cuerpo = crear("div", "orq-cuerpo");
    raiz.append(filtros, cuerpo);

    const filtro = { anio: "", taxon: "" };
    let datos = null;

    function pintar() {
        vaciar(filtros);
        vaciar(cuerpo);

        if (esEditor()) {
            const barra = crear("div", "orq-editor-barra");
            barra.appendChild(crear("span", "orq-editor-aviso", "Modo editor de orquídeas"));
            barra.appendChild(botonEditor("Nueva publicación", () => editar(null, recargar), "orq-editor-principal"));
            cuerpo.appendChild(barra);
        }

        const taxones = [...new Set(datos.publicaciones.flatMap(p => p.taxones.map(t => t.nombre_cientifico)))].sort();
        filtros.append(
            selector("Año", [{ valor: "", texto: "Todos" }, ...datos.anios.map(a => ({ valor: String(a), texto: String(a) }))],
                filtro.anio, valor => { filtro.anio = valor; pintar(); }),
            selector("Especie", [{ valor: "", texto: "Todas" }, ...taxones.map(t => ({ valor: t, texto: t }))],
                filtro.taxon, valor => { filtro.taxon = valor; pintar(); })
        );

        const lista = datos.publicaciones.filter(publicacion =>
            (!filtro.anio || String(publicacion.anio) === filtro.anio)
            && (!filtro.taxon || publicacion.taxones.some(t => t.nombre_cientifico === filtro.taxon))
        );
        if (!lista.length) {
            cuerpo.appendChild(crear("p", "orq-aviso", "No hay publicaciones con ese filtro."));
            return;
        }
        const caja = crear("div", "orq-publicaciones-lista");
        lista.forEach(publicacion => caja.appendChild(tarjetaPublicacion(publicacion, { alCambiar: recargar })));
        cuerpo.appendChild(caja);
    }

    async function cargar() {
        const ruta = esEditor() ? "/orquideas/editor/publicaciones" : "/orquideas/publicaciones";
        try {
            datos = await pedir(ruta);
            pintar();
        } catch (error) {
            aviso(cuerpo, textoError(error), true);
        }
    }

    function recargar() {
        olvidar("/orquideas/");
        void cargar();
    }

    aviso(cuerpo, "Cargando…");
    alCambiarEditor(() => void cargar());
    await cargar();
}


/* Fin de fichero: js/orquideas/publicaciones.js */
