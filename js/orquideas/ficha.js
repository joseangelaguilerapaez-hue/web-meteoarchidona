/*
 * MeteoArchidona · Componente «Ficha de una orquídea»
 *
 * Todo lo que hay de una especie: nombres, si es híbrido, protección,
 * calendario de floración con las observaciones de cada mes, altitudes,
 * primera y última vez que se vio, en cuántas cuadrículas, sus textos y
 * hasta 24 fotos, cada una con su autor y su licencia.
 *
 *     <div data-componente="orquideas-ficha" data-especie="2808646"></div>
 *
 * Sin data-especie, en la página Orquídeas sigue a la especie elegida en
 * el catálogo (o ?especie= en la dirección); fuera de ella no enseña nada.
 *
 * Desde el 26-11-2026 trae también las publicaciones que tratan de la
 * especie, y el editor de orquídeas puede corregir sus textos desde aquí.
 *
 * API: GET /orquideas/especies/{id}?radio=50 y, para el editor,
 * PATCH /orquideas/editor/especies/{id}.
 */

import {
    pedir, olvidar, crear, aviso, vaciar, prepararRaiz, titulo, pie, numero, fechaCorta, leerRadio, textoError,
    figuraFoto, mesesTexto, especieDeLaDireccion, EVENTO_ESPECIE, MESES, INICIALES
} from "./comun.js?v=20261126-jornadas1";
import {esEditor, alCambiarEditor, enviar, formulario, botonEditor} from "./editor.js?v=20261126-jornadas1";
import {tarjetaPublicacion} from "./publicaciones.js?v=20261126-jornadas1";


const SI_NO = [
    { valor: "", texto: "Sin saber" },
    { valor: "true", texto: "Sí" },
    { valor: "false", texto: "No" }
];

function siNo(valor) {
    return valor === null || valor === undefined ? "" : String(valor);
}

function deSiNo(texto) {
    return texto === null || texto === "" ? null : texto === "true";
}

async function editarFicha(datos, alCambiar) {
    const especie = datos.especie;
    const resultado = await formulario({
        titulo: `Editar la ficha · ${especie.nombre_cientifico}`,
        explicacion: "Lo que cambies aquí no lo pisa la carga semanal de GBIF.",
        campos: [
            { nombre: "nombre_comun", etiqueta: "Nombre común", maximo: 120 },
            { nombre: "hibrido", etiqueta: "Es un híbrido", tipo: "checkbox" },
            { nombre: "autoctona", etiqueta: "Autóctona", tipo: "select", opciones: SI_NO },
            { nombre: "endemica", etiqueta: "Endémica", tipo: "select", opciones: SI_NO },
            { nombre: "proteccion", etiqueta: "Protección", maximo: 80,
              ayuda: "Categoría del catálogo andaluz o español: «Vulnerable», «En peligro»…" },
            { nombre: "descripcion", etiqueta: "Cómo es", tipo: "textarea", filas: 5, maximo: 8000 },
            { nombre: "habitat", etiqueta: "Dónde vive", tipo: "textarea", filas: 4, maximo: 4000 },
            { nombre: "visible", etiqueta: "Visible en la web", tipo: "checkbox" }
        ],
        valores: {
            nombre_comun: especie.nombre_comun,
            hibrido: especie.hibrido,
            autoctona: siNo(especie.autoctona),
            endemica: siNo(especie.endemica),
            proteccion: especie.proteccion,
            descripcion: datos.descripcion,
            habitat: datos.habitat,
            visible: true
        },
        guardar: valores => enviar("PATCH", `/orquideas/editor/especies/${especie.id}`, {
            ...valores,
            autoctona: deSiNo(valores.autoctona),
            endemica: deSiNo(valores.endemica)
        })
    });
    if (resultado) alCambiar();
}


function grafica(porMes, meses) {
    const maximo = Math.max(1, ...porMes);
    const caja = crear("div", "orq-meses");
    porMes.forEach((cuantas, indice) => {
        const columna = crear("div", "orq-mes");
        if (meses.includes(indice + 1)) columna.classList.add("en-flor");
        columna.title = `${MESES[indice]}: ${numero(cuantas)} ${cuantas === 1 ? "observación" : "observaciones"}`;
        const barra = crear("span", "orq-mes-barra");
        barra.style.height = `${Math.round((cuantas / maximo) * 100)}%`;
        columna.appendChild(crear("span", "orq-mes-cifra", cuantas ? numero(cuantas) : ""));
        const hueco = crear("span", "orq-mes-hueco");
        hueco.appendChild(barra);
        columna.appendChild(hueco);
        columna.appendChild(crear("span", "orq-mes-inicial", INICIALES[indice]));
        caja.appendChild(columna);
    });
    return caja;
}


function dato(etiqueta, valor) {
    const caja = crear("div", "orq-dato");
    caja.appendChild(crear("span", "orq-dato-etiqueta", etiqueta));
    caja.appendChild(crear("strong", "orq-dato-valor", valor));
    return caja;
}


function pintarFicha(cuerpo, datos, alCambiar) {
    vaciar(cuerpo);
    const especie = datos.especie;

    if (esEditor()) {
        const barra = crear("div", "orq-editor-barra");
        barra.appendChild(crear("span", "orq-editor-aviso", "Modo editor de orquídeas"));
        barra.appendChild(botonEditor("Editar la ficha", () => editarFicha(datos, alCambiar), "orq-editor-principal"));
        cuerpo.appendChild(barra);
    }

    const cabeza = crear("div", "orq-ficha-cabeza");
    cabeza.appendChild(crear("h4", "orq-ficha-cientifico", especie.nombre_cientifico));
    if (especie.nombre_comun) cabeza.appendChild(crear("p", "orq-ficha-comun", especie.nombre_comun));
    const marcas = crear("div", "orq-marcas");
    if (especie.hibrido) marcas.appendChild(crear("span", "orq-marca", "Híbrido"));
    if (especie.endemica) marcas.appendChild(crear("span", "orq-marca", "Endémica"));
    if (especie.autoctona === false) marcas.appendChild(crear("span", "orq-marca", "No autóctona"));
    if (especie.proteccion) marcas.appendChild(crear("span", "orq-marca protegida", especie.proteccion));
    if (marcas.childNodes.length) cabeza.appendChild(marcas);
    cuerpo.appendChild(cabeza);

    const datosCaja = crear("div", "orq-datos");
    datosCaja.append(
        dato("Florece", mesesTexto(especie.meses)),
        dato("Observaciones", numero(especie.observaciones)),
        dato("Cuadrículas de 10 km", numero(especie.cuadriculas)),
        dato("Altitud", especie.altitud_minima !== null
            ? (especie.altitud_minima === especie.altitud_maxima
                ? `${numero(especie.altitud_minima)} m`
                : `${numero(especie.altitud_minima)} a ${numero(especie.altitud_maxima)} m`)
            : "Sin datos"),
        dato("Primera vez", fechaCorta(especie.primera_fecha)),
        dato("Última vez", fechaCorta(especie.ultima_fecha))
    );
    cuerpo.appendChild(datosCaja);

    cuerpo.appendChild(crear("h5", "orq-subtitulo", "Observaciones por mes"));
    cuerpo.appendChild(grafica(datos.observaciones_por_mes, especie.meses));

    if (datos.descripcion) {
        cuerpo.appendChild(crear("h5", "orq-subtitulo", "Cómo es"));
        cuerpo.appendChild(crear("p", "orq-texto", datos.descripcion));
    }
    if (datos.habitat) {
        cuerpo.appendChild(crear("h5", "orq-subtitulo", "Dónde vive"));
        cuerpo.appendChild(crear("p", "orq-texto", datos.habitat));
    }

    if (datos.fotos.length) {
        cuerpo.appendChild(crear("h5", "orq-subtitulo", `Fotos (${datos.fotos.length})`));
        const galeria = crear("div", "orq-galeria");
        datos.fotos.forEach(foto => galeria.appendChild(figuraFoto(foto, { tamano: "medium", clase: "orq-foto orq-foto-galeria" })));
        cuerpo.appendChild(galeria);
    }

    if (datos.publicaciones?.length) {
        cuerpo.appendChild(crear("h5", "orq-subtitulo", "Publicado en"));
        const lista = crear("div", "orq-publicaciones-lista");
        datos.publicaciones.forEach(publicacion => lista.appendChild(tarjetaPublicacion(publicacion, { conTaxones: false })));
        cuerpo.appendChild(lista);
    }

    if (datos.cuadriculas.length) {
        cuerpo.appendChild(crear("h5", "orq-subtitulo", "Cuadrículas donde se ha visto"));
        cuerpo.appendChild(crear(
            "p", "orq-cuadriculas",
            datos.cuadriculas.map(c => `${c.codigo} (${numero(c.observaciones)})`).join(" · ")
        ));
    }
}


export async function montarFichaOrquideas(raiz) {
    prepararRaiz(raiz, "orq-ficha");
    const radio = leerRadio(raiz);
    const enPagina = document.body.dataset.seccion === "orquideas";
    titulo(raiz, "FICHA", "Ficha de la especie");
    const cuerpo = crear("div", "orq-cuerpo");
    raiz.appendChild(cuerpo);
    const nota = crear("p", "orq-pie");
    raiz.appendChild(nota);

    async function pintar(id) {
        if (!id) {
            aviso(cuerpo, "Elige una especie en el catálogo para ver su ficha.");
            nota.textContent = "";
            return;
        }
        aviso(cuerpo, "Cargando…");
        try {
            const datos = await pedir(`/orquideas/especies/${id}?radio=${radio}`);
            pintarFicha(cuerpo, datos, () => {
                olvidar("/orquideas/");
                void pintar(id);
            });
            nota.textContent = `Datos a menos de ${datos.radio} km de Archidona. ${datos.cita.texto} Toca una foto para ver su registro.`;
        } catch (error) {
            aviso(cuerpo, error.estado === 404 ? "No hay ninguna especie con ese número." : textoError(error), true);
            nota.textContent = "";
        }
    }

    const fija = Number(raiz.dataset.especie) || null;
    let actual = fija || (enPagina ? especieDeLaDireccion() : null);
    alCambiarEditor(() => void pintar(actual));
    if (!fija && enPagina) {
        document.addEventListener(EVENTO_ESPECIE, evento => {
            actual = evento.detail?.id || null;
            void pintar(actual).then(() => {
                raiz.scrollIntoView({ behavior: "smooth", block: "start" });
            });
        });
    }
    await pintar(actual);
}


/* Fin de fichero: js/orquideas/ficha.js */
