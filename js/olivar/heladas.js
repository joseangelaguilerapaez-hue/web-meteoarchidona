/*
 * MeteoArchidona · Componente «Heladas»
 *
 * Por estación (El Silo o Los Llanos):
 *
 *   - las mínimas previstas de los próximos días, corregidas con lo que
 *     suele fallar el modelo en esa estación, con el nivel de helada
 *     (débil de 0 a −3 °C, moderada de −3 a −5 °C y fuerte por debajo);
 *   - los avisos de helada vigentes;
 *   - el registro de la temporada (de julio a junio): días de helada,
 *     primera, última y la más fuerte, cada helada con su mínima y su
 *     hora, y la comparación con las temporadas anteriores.
 *
 *     <div data-componente="olivar-heladas"></div>                     (El Silo)
 *     <div data-componente="olivar-heladas" data-estacion="LOS_LLANOS" data-selector="no"></div>
 *
 * API: GET /olivar/prevision?estacion y /olivar/heladas?estacion
 */

import {
    pedir, crear, vaciar, aviso, prepararRaiz, pie, leerEstacion, pastillaNivel,
    entero, grados, horas, diaCorto, fechaCorta, fechaLarga, cuando,
    ESTACIONES, NOMBRES_ESTACION, NOMBRES_NIVEL, FUENTE_ESTACIONES, FUENTE_PREVISION
} from "./comun.js?v=20261109-olivar2";


const MAXIMO_HELADAS_LISTA = 15;


function tablaPrevision(prevision) {
    const contenedor = crear("div", "oli-tabla-desliza");
    const tabla = crear("table", "oli-prevision");
    const cabeza = crear("tr");
    const fila = crear("tr");

    for (const dia of prevision.dias) {
        const th = crear("th", null, diaCorto(dia.fecha));
        th.appendChild(crear("small", null, fechaCorta(dia.fecha)));
        cabeza.appendChild(th);

        const td = crear("td", dia.nivel ? `nivel-${dia.nivel}` : null, grados(dia.temperatura_minima_corregida));
        td.appendChild(crear("small", null, dia.nivel ? NOMBRES_NIVEL[dia.nivel].replace("Helada ", "") : `máx. ${grados(dia.temperatura_maxima)}`));
        td.title = `Modelo: ${grados(dia.temperatura_minima)}; corregida para ${prevision.nombre}: ${grados(dia.temperatura_minima_corregida)}`;
        fila.appendChild(td);
    }

    const cuerpoCabeza = crear("thead");
    cuerpoCabeza.appendChild(cabeza);
    const cuerpo = crear("tbody");
    cuerpo.appendChild(fila);
    tabla.appendChild(cuerpoCabeza);
    tabla.appendChild(cuerpo);
    contenedor.appendChild(tabla);
    return contenedor;
}


function notaSesgo(prevision) {
    if (prevision.sesgo === null || prevision.sesgo === undefined) {
        return "Mínimas del modelo tal cual: hasta tener un mes de comparación con lo medido no se corrigen.";
    }
    if (Math.abs(prevision.sesgo) < 0.3) {
        return "En esta estación el modelo acierta bien las mínimas: casi no hace falta corregirlas.";
    }
    const sentido = prevision.sesgo > 0 ? "por encima" : "por debajo";
    return `En ${prevision.nombre} el modelo se queda de media ${grados(Math.abs(prevision.sesgo))} ${sentido} de lo medido; las mínimas ya van corregidas.`;
}


function resumenTemporada(temporada) {
    const lista = crear("dl", "oli-temporada");
    const datos = [
        ["Días de helada", entero(temporada.dias_helada)],
        ["Primera", temporada.primera ? fechaCorta(temporada.primera) : "—"],
        ["Última", temporada.ultima ? fechaCorta(temporada.ultima) : "—"],
        ["Mínima", temporada.minima_absoluta === null ? "—" : grados(temporada.minima_absoluta)]
    ];

    for (const [etiqueta, valor] of datos) {
        const caja = crear("div");
        caja.appendChild(crear("dt", null, etiqueta));
        caja.appendChild(crear("dd", null, valor));
        lista.appendChild(caja);
    }

    return lista;
}


function listaHeladas(heladas) {
    const contenedor = crear("div", "oli-tabla-desliza");
    const tabla = crear("table", "oli-lista-heladas");
    const cabeza = crear("tr");
    for (const texto of ["Día", "Mínima", "Hora", "Bajo cero"]) cabeza.appendChild(crear("th", null, texto));
    const thead = crear("thead");
    thead.appendChild(cabeza);
    tabla.appendChild(thead);

    const cuerpo = crear("tbody");
    for (const helada of heladas.slice(0, MAXIMO_HELADAS_LISTA)) {
        const fila = crear("tr");
        fila.appendChild(crear("td", null, fechaLarga(helada.fecha)));
        fila.appendChild(crear("td", "oli-cifra oli-minima", grados(helada.temperatura_minima)));
        fila.appendChild(crear("td", "oli-cifra", helada.hora_minima || "—"));
        fila.appendChild(crear("td", "oli-cifra", helada.horas_bajo_cero >= 1 ? horas(helada.horas_bajo_cero) : "menos de 1 h"));
        cuerpo.appendChild(fila);
    }
    tabla.appendChild(cuerpo);
    contenedor.appendChild(tabla);
    return contenedor;
}


function comparacionTemporadas(temporadas) {
    const contenedor = crear("div", "oli-tabla-desliza");
    const tabla = crear("table", "oli-lista-heladas");
    const cabeza = crear("tr");
    for (const texto of ["Temporada", "Días", "Primera", "Última", "Mínima"]) cabeza.appendChild(crear("th", null, texto));
    const thead = crear("thead");
    thead.appendChild(cabeza);
    tabla.appendChild(thead);

    const cuerpo = crear("tbody");
    for (const temporada of temporadas) {
        const fila = crear("tr");
        fila.appendChild(crear("td", null, temporada.temporada));
        fila.appendChild(crear("td", "oli-cifra", entero(temporada.dias_helada)));
        fila.appendChild(crear("td", null, temporada.primera ? fechaCorta(temporada.primera) : "—"));
        fila.appendChild(crear("td", null, temporada.ultima ? fechaCorta(temporada.ultima) : "—"));
        fila.appendChild(crear("td", "oli-cifra oli-minima", temporada.minima_absoluta === null ? "—" : grados(temporada.minima_absoluta)));
        cuerpo.appendChild(fila);
    }
    tabla.appendChild(cuerpo);
    contenedor.appendChild(tabla);
    return contenedor;
}


export async function montarHeladasOlivar(raiz) {
    prepararRaiz(raiz, "olivar-heladas");
    aviso(raiz, "Cargando las heladas…");

    let estacion = leerEstacion(raiz);
    const conSelector = raiz.dataset.selector !== "no";

    raiz.textContent = "";
    const cabeza = crear("div");
    raiz.appendChild(cabeza);

    if (conSelector) {
        const controles = crear("div", "oli-controles");
        const etiqueta = crear("label", null, "Estación");
        const selector = crear("select");
        for (const codigo of ESTACIONES) {
            const opcion = crear("option", null, NOMBRES_ESTACION[codigo]);
            opcion.value = codigo;
            selector.appendChild(opcion);
        }
        selector.value = estacion;
        selector.addEventListener("change", () => { estacion = selector.value; pintar(); });
        etiqueta.appendChild(selector);
        controles.appendChild(etiqueta);
        raiz.appendChild(controles);
    }

    const cuerpo = crear("div");
    cuerpo.style.display = "grid";
    cuerpo.style.gap = "14px";
    raiz.appendChild(cuerpo);
    pie(raiz, `Helada: mínima por debajo de 0 °C, temporada de julio a junio · ${FUENTE_ESTACIONES} · ${FUENTE_PREVISION}`);

    async function pintar() {
        let prevision;
        let heladas;

        try {
            const [datosPrevision, datosHeladas] = await Promise.all([
                pedir(`/olivar/prevision?estacion=${estacion}`),
                pedir(`/olivar/heladas?estacion=${estacion}`)
            ]);
            prevision = datosPrevision.estaciones[0];
            heladas = datosHeladas;
        } catch (error) {
            aviso(cuerpo, "No se han podido leer las heladas. Se puede volver a intentar más tarde.", true);
            return;
        }

        vaciar(cabeza);
        if (raiz.dataset.titulo !== "no") {
            cabeza.appendChild(crear("div", "oli-etiqueta", `Heladas · ${heladas.nombre}`));
            cabeza.appendChild(crear("h3", "oli-titulo", "Mínimas previstas y heladas de la temporada"));
        }

        vaciar(cuerpo);

        // Avisos vigentes, lo primero.
        if (prevision && prevision.avisos.length) {
            const lista = crear("ul", "oli-avisos");
            for (const otro of prevision.avisos) {
                const linea = crear("li", `nivel-${otro.nivel}`);
                linea.appendChild(pastillaNivel(otro.nivel));
                linea.appendChild(document.createTextNode(` ${cuando(otro.fecha)} en ${heladas.nombre}: mínima prevista de ${grados(otro.temperatura_prevista)}`));
                lista.appendChild(linea);
            }
            cuerpo.appendChild(lista);
        }

        if (prevision && prevision.dias.length) {
            cuerpo.appendChild(crear("h4", "oli-subtitulo", "Mínimas de los próximos días"));
            cuerpo.appendChild(tablaPrevision(prevision));
            cuerpo.appendChild(crear("p", "oli-aviso", notaSesgo(prevision)));
        } else {
            cuerpo.appendChild(crear("p", "oli-aviso", "Todavía no hay previsión de mínimas para esta estación."));
        }

        const temporada = heladas.temporada;
        cuerpo.appendChild(crear("h4", "oli-subtitulo", temporada ? `Temporada ${temporada.temporada}` : "Esta temporada"));

        if (temporada) {
            cuerpo.appendChild(resumenTemporada(temporada));
        }

        if (heladas.heladas.length) {
            cuerpo.appendChild(listaHeladas(heladas.heladas));
            if (heladas.heladas.length > MAXIMO_HELADAS_LISTA) {
                cuerpo.appendChild(crear("p", "oli-pie", `Las ${MAXIMO_HELADAS_LISTA} más recientes de ${entero(heladas.heladas.length)}.`));
            }
        } else {
            cuerpo.appendChild(crear("p", "oli-aviso", "Ninguna helada en lo que va de temporada."));
        }

        if (heladas.temporadas.length > 1) {
            cuerpo.appendChild(crear("h4", "oli-subtitulo", "Otras temporadas"));
            cuerpo.appendChild(comparacionTemporadas(heladas.temporadas));
        }
    }

    await pintar();
}


/* Fin de fichero: js/olivar/heladas.js */
