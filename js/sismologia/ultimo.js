/*
 * MeteoArchidona · Componente «Último terremoto cercano»
 *
 * Ficha pequeña del sismo más reciente cerca de Archidona: magnitud
 * grande, cuándo, dónde, a qué distancia y a qué profundidad. Pensado
 * para Actualidad y los dashboards.
 *
 *     <div data-componente="sismologia-ultimo"></div>
 *     <div data-componente="sismologia-ultimo" data-radio="100" data-magnitud="1.5"></div>
 *
 * data-radio: km (100). data-magnitud: mínima (todas).
 *
 * API: GET /sismologia/terremotos?radio_km&dias=365&limite=1
 */

import {
    pedir, crear, aviso, prepararRaiz, titulo, pie, leerRadio, leerNumero, rutaTerremotos,
    magnitud, kilometros, fechaLarga, horaExacta, haceCuanto, lugar, enlaceFicha, FUENTE
} from "./comun.js?v=20261108-sismo1";


export async function montarUltimoTerremoto(raiz) {
    prepararRaiz(raiz, "sismologia-ultimo");

    const radio = leerRadio(raiz, 100);
    const minima = raiz.dataset.magnitud ? leerNumero(raiz, "magnitud", 0, 0, 9) : null;

    aviso(raiz, "Buscando el último terremoto…");

    let datos;

    try {
        datos = await pedir(rutaTerremotos({ radio, dias: 365, limite: 1, magnitud: minima }));
    } catch (error) {
        aviso(raiz, "No se ha podido leer el último terremoto.", true);
        return;
    }

    raiz.textContent = "";
    titulo(raiz, "Último terremoto", `A menos de ${radio} km`);

    const sismo = datos.terremotos[0];

    if (!sismo) {
        raiz.appendChild(crear("p", "sis-aviso-texto", `Ningún terremoto a menos de ${radio} km en el último año.`));
        pie(raiz, FUENTE);
        return;
    }

    const caja = crear("div", "sis-ultimo");

    const sello = crear("div", `sis-ultimo-sello tramo-${sismo.tramo_magnitud || "NINGUNO"}`);
    sello.appendChild(crear("small", null, "Magnitud"));
    sello.appendChild(crear("strong", null, magnitud(sismo.magnitud)));
    if (sismo.tipo_magnitud) sello.appendChild(crear("small", null, sismo.tipo_magnitud));
    caja.appendChild(sello);

    const datosTexto = crear("dl", "sis-ultimo-datos");
    const pares = [
        ["Cuándo", `${haceCuanto(sismo)} · ${fechaLarga(sismo)}, ${horaExacta(sismo)}`],
        ["Dónde", lugar(sismo)],
        ["Distancia", `${kilometros(sismo.distancia_km)} de Archidona`],
        ["Profundidad", kilometros(sismo.profundidad_km)],
        ["Intensidad", sismo.intensidad ? `${sismo.intensidad} (sentido)` : "No consta que se sintiera"]
    ];

    for (const [nombre, valor] of pares) {
        datosTexto.appendChild(crear("dt", null, nombre));
        datosTexto.appendChild(crear("dd", null, valor));
    }

    caja.appendChild(datosTexto);
    raiz.appendChild(caja);

    const enlace = enlaceFicha(sismo, sismo.codigo_ign ? "Ficha en el IGN" : "Ficha en el EMSC (provisional)");
    if (enlace) raiz.appendChild(enlace);

    pie(raiz, `Hora de Madrid · ${FUENTE}`);
}


/* Fin de fichero: js/sismologia/ultimo.js */
