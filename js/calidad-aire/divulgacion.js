/*
 * MeteoArchidona · Componente «Qué respiramos»
 *
 * Apartado divulgativo de la calidad del aire: qué es cada contaminante
 * y de dónde sale, qué es la calima y la lluvia de barro, y qué hacer
 * según la categoría del índice, para todo el mundo y para las personas
 * sensibles. Texto fijo, sin petición a la API.
 *
 *     <div data-componente="aire-divulgacion"></div>
 *     <div data-componente="aire-divulgacion" data-apartado="consejos"></div>
 *
 * data-apartado: «contaminantes», «calima» o «consejos» para enseñar
 * solo uno; por defecto, los tres.
 *
 * Consejos basados en las recomendaciones del Índice Nacional de
 * Calidad del Aire (Ministerio para la Transición Ecológica). Es
 * información orientativa: ante síntomas, lo que diga el médico.
 */

import { crear, prepararRaiz, titulo, pie, pastillaCategoria } from "./comun.js?v=20261111-aire1";


const CONTAMINANTES = [
    ["PM10", "Partículas de menos de 10 micras: polvo, polen roto, humo, sal marina y, en Archidona sobre todo, el polvo del Sáhara. Llegan a la garganta y los bronquios."],
    ["PM2,5", "Partículas finas, de menos de 2,5 micras, casi siempre de combustiones (tráfico, calefacciones, quemas agrícolas). Entran hasta los pulmones y la sangre: son las que más daño hacen."],
    ["Ozono (O₃)", "No sale de ningún tubo: se forma con el sol a partir de otros gases. Por eso sube en las tardes de verano y en el campo, lejos de las ciudades. Irrita los ojos y los bronquios."],
    ["Dióxido de nitrógeno (NO₂)", "Sobre todo del tráfico. En un pueblo como Archidona suele ser bajo; sube junto a carreteras con mucho tráfico."]
];

const CALIMA = [
    ["La calima", "Polvo fino del Sáhara que los vientos del sur suben hasta miles de metros y traen a la península. El cielo se vuelve blanquecino o amarillento, se ve menos lejos y el sol pierde fuerza."],
    ["La lluvia de barro", "Cuando llueve con calima, las gotas arrastran el polvo y dejan barro en coches, ventanas y ropa tendida."],
    ["Cómo se mide aquí", "Con el polvo en superficie que prevé el modelo CAMS, en media del día: calima leve desde 20 µg/m³, moderada desde 50, fuerte desde 100 y muy fuerte desde 200."],
    ["La turbidez (AOD)", "El espesor óptico de aerosoles mide cuánto tapan las partículas el sol en toda la columna de aire: por debajo de 0,1 el cielo está limpio; con calima intensa pasa de 1."]
];

const CONSEJOS = [
    ["BUENA", "Aire limpio. Buen momento para hacer deporte al aire libre.", "Sin precauciones."],
    ["RAZONABLEMENTE_BUENA", "Se puede hacer vida normal al aire libre.", "Quien sea muy sensible puede notar algo si hace mucho esfuerzo."],
    ["REGULAR", "Se puede salir con normalidad.", "Mejor rebajar el ejercicio intenso fuera, sobre todo si se notan síntomas."],
    ["DESFAVORABLE", "Rebajar el ejercicio intenso al aire libre.", "Evitar el esfuerzo fuera y tener a mano la medicación (asma, corazón)."],
    ["MUY_DESFAVORABLE", "Evitar el ejercicio intenso fuera.", "Quedarse en casa con las ventanas cerradas en lo posible."],
    ["EXTREMADAMENTE_DESFAVORABLE", "Evitar actividades al aire libre.", "No salir si no es necesario y consultar al médico ante cualquier síntoma."]
];


function definiciones(pares) {
    const lista = crear("dl", "air-glosario");
    for (const [termino, texto] of pares) {
        lista.appendChild(crear("dt", null, termino));
        lista.appendChild(crear("dd", null, texto));
    }
    return lista;
}


export function montarAireDivulgacion(raiz) {
    prepararRaiz(raiz, "aire-divulgacion");
    titulo(raiz, "Qué respiramos", "Contaminantes, calima y consejos");

    const apartado = raiz.dataset.apartado || "";
    const todos = !apartado;

    if (todos || apartado === "contaminantes") {
        raiz.appendChild(crear("h4", "air-subtitulo", "Qué es cada contaminante"));
        raiz.appendChild(definiciones(CONTAMINANTES));
    }

    if (todos || apartado === "calima") {
        raiz.appendChild(crear("h4", "air-subtitulo", "La calima"));
        raiz.appendChild(definiciones(CALIMA));
    }

    if (todos || apartado === "consejos") {
        raiz.appendChild(crear("h4", "air-subtitulo", "Qué hacer según el índice"));
        const desliza = crear("div", "air-desliza");
        const tabla = crear("table", "air-consejos");
        const cabeza = crear("thead");
        const filaCabeza = crear("tr");
        for (const texto of ["Índice", "Para todos", "Personas sensibles"]) filaCabeza.appendChild(crear("th", null, texto));
        cabeza.appendChild(filaCabeza);
        tabla.appendChild(cabeza);

        const cuerpo = crear("tbody");
        for (const [categoria, general, sensibles] of CONSEJOS) {
            const fila = crear("tr");
            const celda = crear("td");
            celda.appendChild(pastillaCategoria(categoria));
            fila.appendChild(celda);
            fila.appendChild(crear("td", null, general));
            fila.appendChild(crear("td", null, sensibles));
            cuerpo.appendChild(fila);
        }
        tabla.appendChild(cuerpo);
        desliza.appendChild(tabla);
        raiz.appendChild(desliza);
        raiz.appendChild(crear("p", "air-nota",
            "Personas sensibles: niños, mayores, embarazadas y quien tenga asma, otras enfermedades respiratorias o del corazón. Los días de calima, además, ventilar a primera hora y limpiar con paño húmedo."));
    }

    pie(raiz, "Información orientativa, basada en el Índice Nacional de Calidad del Aire. Ante síntomas, lo que diga el médico.");
}


/* Fin de fichero: js/calidad-aire/divulgacion.js */
