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
 * API: GET /orquideas/especies/{id}?radio=50 (privada).
 */

import {
    pedir, crear, aviso, vaciar, prepararRaiz, titulo, pie, numero, fechaCorta, leerRadio, textoError,
    figuraFoto, mesesTexto, especieDeLaDireccion, EVENTO_ESPECIE, MESES, INICIALES
} from "./comun.js?v=20261125-orquideas1";


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


function pintarFicha(cuerpo, datos) {
    vaciar(cuerpo);
    const especie = datos.especie;

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
            pintarFicha(cuerpo, datos);
            nota.textContent = `Datos a menos de ${datos.radio} km de Archidona. ${datos.cita.texto} Toca una foto para ver su registro.`;
        } catch (error) {
            aviso(cuerpo, error.estado === 404 ? "No hay ninguna especie con ese número." : textoError(error), true);
            nota.textContent = "";
        }
    }

    const fija = Number(raiz.dataset.especie) || null;
    if (!fija && enPagina) {
        document.addEventListener(EVENTO_ESPECIE, evento => {
            void pintar(evento.detail?.id || null).then(() => {
                raiz.scrollIntoView({ behavior: "smooth", block: "start" });
            });
        });
    }
    await pintar(fija || (enPagina ? especieDeLaDireccion() : null));
}


/* Fin de fichero: js/orquideas/ficha.js */
