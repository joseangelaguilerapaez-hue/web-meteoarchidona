/*
 * MeteoArchidona · Componente «El olivar hoy»
 *
 * El Silo y Los Llanos lado a lado (José, 9-11-2026: todo por estación y
 * comparable, porque en Los Llanos hace más frío y en El Silo llueve
 * más). Por cada estación:
 *
 *   - horas y unidades de frío de la temporada, con lo que llevaba la
 *     temporada anterior a la misma fecha;
 *   - heladas de la temporada (días, primera y la más fuerte);
 *   - la mínima prevista para esta noche, con aviso si hiela.
 *
 *     <div data-componente="olivar-resumen"></div>
 *     <div data-componente="olivar-resumen" data-estacion="LOS_LLANOS" data-titulo="no"></div>
 *
 * API: GET /olivar/resumen?estacion=
 */

import {
    pedir, crear, aviso, prepararRaiz, titulo, pie, leerEstaciones, pastillaNivel,
    entero, grados, horas, fechaCorta, cuando, NOMBRES_NIVEL, FUENTE_ESTACIONES
} from "./comun.js?v=20261109-olivar1";


function cifra(lista, etiqueta, valor, nota, clase) {
    const caja = crear("div", clase);
    caja.appendChild(crear("dt", null, etiqueta));
    const dato = crear("dd", null, valor);
    if (nota) dato.appendChild(crear("small", null, nota));
    caja.appendChild(dato);
    lista.appendChild(caja);
}


function comparacionFrio(frio) {
    const anterior = frio.misma_fecha_anterior;
    if (!anterior) return "Sin temporada anterior con la que comparar";
    const diferencia = Math.round(frio.horas_frio - anterior.horas_frio);
    if (diferencia === 0) return `Igual que en ${anterior.temporada} a estas alturas`;
    return `${diferencia > 0 ? "+" : "−"}${entero(Math.abs(diferencia))} h que en ${anterior.temporada} a estas alturas`;
}


function tarjeta(estacion) {
    const caja = crear("article", "oli-estacion");
    const cabeza = crear("h4", null, estacion.nombre);
    const dia = estacion.ultimo_dia;
    cabeza.appendChild(crear("small", null, dia ? `DATOS HASTA EL ${fechaCorta(dia.fecha).toUpperCase()}` : "SIN DATOS TODAVÍA"));
    caja.appendChild(cabeza);

    const lista = crear("dl", "oli-cifras");
    const frio = estacion.frio;

    if (frio) {
        cifra(lista, `Frío ${frio.temporada}`, horas(frio.horas_frio), comparacionFrio(frio));
        cifra(lista, "Unidades de frío", entero(frio.unidades_frio), "De Melo-Abreu, desde el 1 de octubre");
    } else {
        cifra(lista, "Frío", "—", "La temporada empieza el 1 de octubre");
    }

    const heladas = estacion.heladas;
    if (heladas && heladas.dias_helada) {
        const notas = [`primera el ${fechaCorta(heladas.primera)}`];
        if (heladas.minima_absoluta !== null && heladas.minima_absoluta < 0) {
            notas.push(`la más fuerte, ${grados(heladas.minima_absoluta)} el ${fechaCorta(heladas.fecha_minima)}`);
        }
        cifra(lista, `Heladas ${heladas.temporada}`, entero(heladas.dias_helada), notas.join("; "), "oli-cifra-helada");
    } else {
        const anterior = estacion.heladas_anterior;
        const nota = anterior && anterior.primera
            ? `En ${anterior.temporada} la primera fue el ${fechaCorta(anterior.primera)}`
            : "Ninguna en lo que va de temporada";
        cifra(lista, "Heladas", "0", nota, "oli-cifra-helada");
    }

    if (dia) {
        cifra(
            lista,
            "Mínima del día",
            grados(dia.temperatura_minima),
            dia.hora_minima ? `a las ${dia.hora_minima}, ${fechaCorta(dia.fecha)}` : fechaCorta(dia.fecha)
        );
    }

    caja.appendChild(lista);

    const noche = estacion.proxima_noche;
    const fila = crear("div", `oli-noche${noche && noche.nivel ? ` nivel-${noche.nivel}` : ""}`);

    if (noche && noche.temperatura_minima_corregida !== null) {
        fila.appendChild(document.createTextNode("Mínima prevista para mañana:"));
        fila.appendChild(crear("strong", null, grados(noche.temperatura_minima_corregida)));
        if (noche.nivel) fila.appendChild(pastillaNivel(noche.nivel));
    } else {
        fila.appendChild(document.createTextNode("Sin previsión de mínimas todavía."));
    }

    caja.appendChild(fila);

    // Más heladas previstas después de mañana.
    const siguientes = (estacion.avisos || []).filter(otro => !noche || otro.fecha !== noche.fecha);
    for (const otro of siguientes) {
        const linea = crear("div", `oli-noche nivel-${otro.nivel}`);
        linea.appendChild(document.createTextNode(`${NOMBRES_NIVEL[otro.nivel]} ${cuando(otro.fecha)}:`));
        linea.appendChild(crear("strong", null, grados(otro.temperatura_prevista)));
        caja.appendChild(linea);
    }

    if (dia && !dia.completo) {
        caja.appendChild(crear("p", "oli-incompleto", `El último día tiene datos del ${entero(dia.cobertura)} % del tiempo: puede faltar algo.`));
    }

    return caja;
}


export async function montarResumenOlivar(raiz) {
    prepararRaiz(raiz, "olivar-resumen");
    aviso(raiz, "Mirando el campo…");

    const estaciones = leerEstaciones(raiz);
    let datos;

    try {
        datos = await pedir(`/olivar/resumen?estacion=${estaciones.join(",")}`);
    } catch (error) {
        aviso(raiz, "No se ha podido leer el resumen del olivar. Se puede volver a intentar más tarde.", true);
        return;
    }

    raiz.textContent = "";
    titulo(raiz, "El olivar hoy", estaciones.length > 1 ? "El Silo y Los Llanos" : datos.estaciones[0]?.nombre || "");

    const rejilla = crear("div", "oli-estaciones");
    for (const estacion of datos.estaciones) rejilla.appendChild(tarjeta(estacion));
    raiz.appendChild(rejilla);

    pie(raiz, `Horas de frío: por debajo de 7,2 °C · ${FUENTE_ESTACIONES} · mínimas previstas de Open-Meteo, corregidas`);
}


/* Fin de fichero: js/olivar/resumen.js */
