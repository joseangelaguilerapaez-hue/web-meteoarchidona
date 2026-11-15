/*
 * MeteoArchidona · Componente «Cómo se hace» (predicción estacional)
 *
 * Explica con palabras sencillas de dónde sale la predicción estacional,
 * qué es un escenario, por qué acierta más con la temperatura que con la
 * lluvia y con qué se compara lo normal. Lleva siempre la cita a
 * Copernicus, los modelos usados y la fecha de la salida.
 *
 *     <div data-componente="estacional-nota"></div>
 *     data-titulo="no"     sin título
 *
 * API: GET /estacional/ultima (solo para los modelos y la salida)
 */

import {
    pedirUltima, crear, prepararRaiz, titulo, pie
} from "./comun.js?v=20261115-estacional1";


const PASOS = [
    [
        "De dónde sale",
        "Del Servicio de Cambio Climático de Copernicus, el programa de observación de la Tierra de la " +
        "Unión Europea. Cada mes junta las predicciones estacionales de varios centros meteorológicos " +
        "(europeo, británico, francés, alemán, italiano, americano, japonés, canadiense y australiano). " +
        "El europeo publica el día 6 y el resto el 10; aquí se actualiza en cuanto están."
    ],
    [
        "Qué es un escenario",
        "Cada modelo simula los próximos meses decenas de veces, con pequeñas diferencias de partida. " +
        "Se cuenta cuántas de esas simulaciones salen más frías, normales o más cálidas (y más secas, " +
        "normales o más lluviosas) que lo normal de ese modelo, y se hace la media de todos los modelos, " +
        "cada uno con el mismo peso. La barra lo dibuja: cuanto más largo el tramo, más probable el escenario."
    ],
    [
        "Temperatura mejor que lluvia",
        "Estas predicciones aciertan bastante más con la temperatura que con la lluvia. La lluvia de un " +
        "mes en Archidona depende de unas pocas borrascas que nadie puede ver con meses de antelación: " +
        "cuando los modelos no se deciden, se dice «sin señal clara»."
    ],
    [
        "Lo normal",
        "Cada modelo se compara con sus propias simulaciones de 1993 a 2016, como en Copernicus: con el " +
        "calentamiento de los últimos años, «más cálido de lo normal» sale más a menudo. Los grados y " +
        "litros de Archidona son orientativos: la normal 1991-2020 de nuestra Climatología, movida con " +
        "lo que dicen los modelos."
    ],
    [
        "Lo que no es",
        "Los modelos ven una celda de unos 100 km: hablan de la comarca, no del casco urbano, y de meses " +
        "enteros, no del tiempo de un día. No es una predicción oficial."
    ]
];


export async function montarEstacionalNota(raiz) {
    prepararRaiz(raiz, "est-nota");
    titulo(raiz, "PREDICCIÓN ESTACIONAL · COPERNICUS", "Cómo se hace");

    const lista = crear("dl", "est-pasos");
    for (const [nombre, texto] of PASOS) {
        lista.appendChild(crear("dt", null, nombre));
        lista.appendChild(crear("dd", null, texto));
    }
    raiz.appendChild(lista);

    let datos = null;
    try {
        datos = await pedirUltima(raiz);
        raiz.insertBefore(
            crear("p", "est-detalle", `Modelos de esta salida: ${datos.modelos.join(", ")}.`),
            null
        );
    } catch (error) {
        // La explicación vale igual sin datos.
    }

    pie(raiz, datos);
}


/* Fin de fichero: js/estacional/nota.js */
