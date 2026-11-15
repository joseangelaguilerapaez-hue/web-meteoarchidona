/*
 * MeteoArchidona · Componente «Qué significa el riesgo de incendio»
 *
 * Apartado divulgativo: qué es cada nivel de peligro, de dónde salen los
 * datos (AEMET y EFFIS; MeteoArchidona no calcula un índice propio), qué
 * es un foco de calor visto por satélite y consejos de prevención.
 *
 *     <div data-componente="incendios-divulgacion"></div>
 *
 * API: GET /incendios/niveles
 */

import {
    pedir, crear, aviso, prepararRaiz, titulo, tintaSobre, textoError
} from "./comun.js?v=20261115-incendios1";


const FUENTES = [
    ["AEMET", "La Agencia Estatal de Meteorología calcula cada día el nivel de peligro meteorológico de incendios " +
        "forestales en una rejilla de 1 km, para hoy y los siete días siguientes. Combina el índice canadiense FWI " +
        "(temperatura, humedad, viento y lluvia de los días anteriores) con el estado de la vegetación y del suelo. " +
        "Es la referencia oficial en España y la que da el color de cada pueblo."],
    ["EFFIS", "El Sistema Europeo de Información sobre Incendios Forestales, del programa Copernicus de la Unión " +
        "Europea, publica el mismo índice FWI para toda Europa, con el modelo de Météo-France, para hoy y dos días " +
        "más. Sirve para comparar y para ver los veranos pasados. Su clase más baja junta «muy bajo» y «bajo»."]
];

const FOCO =
    "Los satélites de la NASA (VIIRS y MODIS) pasan varias veces al día y detectan puntos mucho más calientes que " +
    "lo que los rodea: los llamamos focos de calor. Un foco no siempre es un incendio forestal: también salen las " +
    "quemas agrícolas, algunas industrias y hasta tejados muy calientes. Por eso MeteoArchidona los clasifica y solo " +
    "avisa de los que pueden ser un incendio forestal.";

const CONSEJOS = [
    "No hagas fuego en el campo ni en el monte, y respeta siempre la época de peligro y sus prohibiciones.",
    "No tires colillas ni cristales: una botella puede hacer de lupa.",
    "Ten limpia de pasto seco y de restos la parcela alrededor de la casa de campo.",
    "Si trabajas con maquinaria que hace chispas, hazlo a primera hora y lejos del pasto seco, con agua a mano.",
    "Si ves humo o fuego, llama al 112 y di dónde estás con la mayor precisión posible.",
    "Si el fuego se acerca, no intentes huir por caminos que no conoces y sigue las indicaciones de los servicios de emergencia."
];


export async function montarDivulgacionIncendios(raiz) {
    prepararRaiz(raiz, "inc-divulgacion");
    titulo(raiz, "Para entenderlo", "Qué significa el riesgo de incendio");

    let niveles;
    try {
        niveles = await pedir("/incendios/niveles");
    } catch (error) {
        aviso(raiz, textoError(error), true);
        return;
    }

    raiz.appendChild(crear("h4", "inc-subtitulo", "Los niveles de peligro"));
    const lista = crear("ul", "inc-niveles");
    for (const nivel of niveles) {
        const elemento = crear("li");
        const nombre = crear("span", "inc-niveles-nombre", nivel.nombre);
        nombre.style.background = nivel.color;
        nombre.style.color = tintaSobre(nivel.color);
        elemento.appendChild(nombre);
        elemento.appendChild(crear("span", "inc-niveles-texto", nivel.significado));
        lista.appendChild(elemento);
    }
    raiz.appendChild(lista);
    raiz.appendChild(crear("p", "inc-nota", "«Muy extremo» solo lo usa EFFIS; la escala de AEMET llega hasta «extremo»."));

    raiz.appendChild(crear("h4", "inc-subtitulo", "De dónde salen los datos"));
    for (const [nombre, texto] of FUENTES) {
        const parrafo = crear("p", "inc-texto");
        parrafo.appendChild(crear("strong", null, `${nombre}. `));
        parrafo.appendChild(document.createTextNode(texto));
        raiz.appendChild(parrafo);
    }
    raiz.appendChild(crear("p", "inc-texto",
        "Es un peligro meteorológico: dice lo fácil que sería que un fuego prendiera y se extendiera con el tiempo " +
        "que hace, no que vaya a haber un incendio. MeteoArchidona no calcula un índice propio con sus estaciones."));

    raiz.appendChild(crear("h4", "inc-subtitulo", "Qué es un foco de calor"));
    raiz.appendChild(crear("p", "inc-texto", FOCO));

    raiz.appendChild(crear("h4", "inc-subtitulo", "Consejos de prevención"));
    const consejos = crear("ul", "inc-lista");
    for (const consejo of CONSEJOS) consejos.appendChild(crear("li", null, consejo));
    raiz.appendChild(consejos);

    const urgencia = crear("p", "inc-urgencia");
    urgencia.appendChild(crear("strong", null, "112"));
    urgencia.appendChild(document.createTextNode(" Emergencias: ante cualquier humo o fuego, llama cuanto antes."));
    raiz.appendChild(urgencia);
}


/* Fin de fichero: js/incendios/divulgacion.js */
