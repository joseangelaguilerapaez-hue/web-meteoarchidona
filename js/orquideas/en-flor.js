/*
 * MeteoArchidona · Componente «En flor ahora»
 *
 * Las orquídeas que florecen este mes en la comarca, de más a menos
 * observadas en ese mes, con su foto. Un selector permite mirar otro mes.
 * Tocar una abre su ficha (en la página Orquídeas).
 *
 *     <div data-componente="orquideas-en-flor" data-radio="50"></div>
 *     <div data-componente="orquideas-en-flor" data-maximo="6" data-selector="no"></div>
 *
 * data-maximo: cuántas enseñar como mucho (todas si no se dice).
 * data-selector="no": sin selector de mes (el mes actual).
 *
 * API: GET /orquideas/en-flor?radio=50&mes=4 (privada).
 */

import {
    pedir, crear, aviso, vaciar, prepararRaiz, titulo, pie, numero, leerRadio, textoError,
    nombreEspecie, figuraFoto, sinFoto, elegirEspecie, MESES, PAGINA
} from "./comun.js?v=20261126-jornadas1";


function tarjeta(especie, enPagina) {
    const tarjeta = crear(enPagina ? "button" : "a", "orq-tarjeta");
    if (enPagina) {
        tarjeta.type = "button";
        tarjeta.addEventListener("click", () => elegirEspecie(especie.id));
    } else {
        tarjeta.href = `${PAGINA}?especie=${especie.id}#ficha`;
    }
    tarjeta.appendChild(especie.foto ? figuraFoto(especie.foto, { tamano: "small", clase: "orq-foto orq-foto-tarjeta" }) : sinFoto("orq-foto orq-foto-tarjeta orq-foto-vacia"));
    tarjeta.appendChild(nombreEspecie(especie));
    tarjeta.appendChild(crear(
        "span", "orq-tarjeta-dato",
        `${numero(especie.observaciones_mes)} ${especie.observaciones_mes === 1 ? "observación" : "observaciones"} en el mes`
    ));
    return tarjeta;
}


export async function montarEnFlorOrquideas(raiz) {
    prepararRaiz(raiz, "orq-en-flor");
    const radio = leerRadio(raiz);
    const maximo = parseInt(raiz.dataset.maximo, 10);
    const enPagina = document.body.dataset.seccion === "orquideas";
    let mes = new Date().getMonth() + 1;

    titulo(raiz, "EN FLOR", "Orquídeas en flor");

    const mando = crear("label", "orq-mando");
    if (raiz.dataset.selector !== "no") {
        mando.appendChild(crear("span", null, "Mes"));
        const selector = document.createElement("select");
        MESES.forEach((nombre, indice) => {
            const opcion = crear("option", null, nombre.charAt(0).toUpperCase() + nombre.slice(1));
            opcion.value = String(indice + 1);
            if (indice + 1 === mes) opcion.selected = true;
            selector.appendChild(opcion);
        });
        selector.addEventListener("change", () => {
            mes = Number(selector.value);
            void pintar();
        });
        mando.appendChild(selector);
        raiz.appendChild(mando);
    }

    const cuerpo = crear("div", "orq-cuerpo");
    raiz.appendChild(cuerpo);
    const nota = crear("p", "orq-pie");
    raiz.appendChild(nota);

    async function pintar() {
        aviso(cuerpo, "Cargando…");
        nota.textContent = "";
        let datos;
        try {
            datos = await pedir(`/orquideas/en-flor?radio=${radio}&mes=${mes}`);
        } catch (error) {
            aviso(cuerpo, textoError(error), true);
            return;
        }

        if (!datos.especies.length) {
            aviso(cuerpo, `En ${datos.nombre_mes} no suele haber orquídeas en flor por aquí. La temporada va de febrero a junio, con el pico en abril.`);
        } else {
            vaciar(cuerpo);
            const rejilla = crear("div", "orq-tarjetas");
            const lista = Number.isFinite(maximo) ? datos.especies.slice(0, maximo) : datos.especies;
            lista.forEach(especie => rejilla.appendChild(tarjeta(especie, enPagina)));
            cuerpo.appendChild(rejilla);
        }
        nota.textContent = `${datos.especies.length} ${datos.especies.length === 1 ? "especie suele" : "especies suelen"} estar en flor en ${datos.nombre_mes} a menos de ${datos.radio} km, según las observaciones de GBIF.`;
    }

    await pintar();
}


/* Fin de fichero: js/orquideas/en-flor.js */
