/*
 * MeteoArchidona · Componente «Especies de orquídeas»
 *
 * El catálogo de la comarca: cada especie con su foto, sus nombres, su
 * calendario de floración y cuántas veces se ha visto. Los híbridos van
 * en un apartado propio (José, 25-11-2026). Un buscador filtra por
 * nombre. Tocar una abre su ficha.
 *
 *     <div data-componente="orquideas-especies" data-radio="50"></div>
 *
 * API: GET /orquideas/especies?radio=50 (privada).
 */

import {
    pedir, crear, aviso, vaciar, prepararRaiz, titulo, pie, numero, leerRadio, textoError,
    nombreEspecie, figuraFoto, sinFoto, calendario, elegirEspecie, mesesTexto, PAGINA
} from "./comun.js?v=20261125-orquideas1";


function sinAcentos(texto) {
    return (texto || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}


function ficha(especie, enPagina, mes) {
    const tarjeta = crear(enPagina ? "button" : "a", "orq-especie");
    if (enPagina) {
        tarjeta.type = "button";
        tarjeta.addEventListener("click", () => elegirEspecie(especie.id));
    } else {
        tarjeta.href = `${PAGINA}?especie=${especie.id}#ficha`;
    }
    tarjeta.dataset.busqueda = sinAcentos(`${especie.nombre_cientifico} ${especie.nombre_comun || ""} ${especie.genero}`);

    tarjeta.appendChild(especie.foto
        ? figuraFoto(especie.foto, { tamano: "small", clase: "orq-foto orq-foto-especie" })
        : sinFoto("orq-foto orq-foto-especie orq-foto-vacia"));

    const texto = crear("div", "orq-especie-texto");
    texto.appendChild(nombreEspecie(especie));
    const cal = calendario(especie.meses, mes);
    cal.title = mesesTexto(especie.meses);
    texto.appendChild(cal);
    const datos = [
        `${numero(especie.observaciones)} ${especie.observaciones === 1 ? "observación" : "observaciones"}`,
        `${numero(especie.cuadriculas)} ${especie.cuadriculas === 1 ? "cuadrícula" : "cuadrículas"}`
    ];
    if (especie.proteccion) datos.push(especie.proteccion);
    texto.appendChild(crear("span", "orq-especie-datos", datos.join(" · ")));
    tarjeta.appendChild(texto);
    return tarjeta;
}


export async function montarEspeciesOrquideas(raiz) {
    prepararRaiz(raiz, "orq-especies");
    const radio = leerRadio(raiz);
    const enPagina = document.body.dataset.seccion === "orquideas";
    const mes = new Date().getMonth() + 1;
    titulo(raiz, "ESPECIES", "Las orquídeas de la comarca");

    const cuerpo = crear("div", "orq-cuerpo");
    raiz.appendChild(cuerpo);
    aviso(cuerpo, "Cargando…");

    let datos;
    try {
        datos = await pedir(`/orquideas/especies?radio=${radio}`);
    } catch (error) {
        aviso(cuerpo, textoError(error), true);
        return;
    }

    if (!datos.especies.length && !datos.hibridos.length) {
        aviso(cuerpo, "Todavía no hay especies cargadas.");
        return;
    }

    vaciar(cuerpo);

    const buscador = crear("label", "orq-buscador");
    buscador.appendChild(crear("span", null, "Buscar"));
    const caja = document.createElement("input");
    caja.type = "search";
    caja.placeholder = "Ophrys, abeja, mariposa…";
    caja.autocomplete = "off";
    buscador.appendChild(caja);
    cuerpo.appendChild(buscador);

    const grupos = [];
    const apartados = [
        ["Especies", datos.especies, "Ordenadas de más a menos observadas."],
        ["Híbridos", datos.hibridos, "Cruces naturales entre dos especies. En la Sierra Norte de Málaga y en Archidona se han descrito varios nuevos para la ciencia."]
    ];
    for (const [nombre, lista, explicacion] of apartados) {
        if (!lista.length) continue;
        const apartado = crear("section", "orq-apartado");
        apartado.appendChild(crear("h4", "orq-apartado-titulo", `${nombre} (${lista.length})`));
        apartado.appendChild(crear("p", "orq-apartado-nota", explicacion));
        const rejilla = crear("div", "orq-especies-rejilla");
        lista.forEach(especie => rejilla.appendChild(ficha(especie, enPagina, mes)));
        apartado.appendChild(rejilla);
        cuerpo.appendChild(apartado);
        grupos.push({ apartado, rejilla });
    }

    const vacio = crear("p", "orq-aviso", "Ninguna coincide con la búsqueda.");
    vacio.hidden = true;
    cuerpo.appendChild(vacio);

    caja.addEventListener("input", () => {
        const buscado = sinAcentos(caja.value.trim());
        let visibles = 0;
        for (const { apartado, rejilla } of grupos) {
            let enGrupo = 0;
            for (const tarjeta of rejilla.children) {
                const coincide = !buscado || tarjeta.dataset.busqueda.includes(buscado);
                tarjeta.hidden = !coincide;
                if (coincide) enGrupo += 1;
            }
            apartado.hidden = enGrupo === 0;
            visibles += enGrupo;
        }
        vacio.hidden = visibles > 0;
    });

    const notas = [];
    if (datos.sin_especie) {
        notas.push(`${numero(datos.sin_especie)} observaciones más solo llegan al género o a la familia.`);
    }
    notas.push("En el calendario, en color los meses de floración; recuadrado, el mes actual.");
    pie(raiz, notas.join(" "));
}


/* Fin de fichero: js/orquideas/especies.js */
