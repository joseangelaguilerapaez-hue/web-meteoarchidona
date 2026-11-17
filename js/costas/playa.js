/*
 * MeteoArchidona · Componente «Playa: oleaje, viento, agua y mareas»
 *
 * La utilidad que propuso José el 17-11-2026: buscar una playa de
 * Andalucía por su nombre («quiero ir mañana a la playa tal») y ver sus
 * datos de hoy, mañana y pasado:
 *
 *   - por días: ola máxima y estado de la mar, viento máximo, agua y
 *     avisos de Portus;
 *   - por horas del día elegido: ola, periodo, de dónde viene, viento y
 *     agua;
 *   - las mareas del día (en el Mediterráneo, con la nota de que apenas
 *     se notan);
 *   - lo que mide ahora la boya más cercana y a cuántos km está.
 *
 *     <div data-componente="costas-playa"></div>
 *     <div data-componente="costas-playa" data-playa="35247" data-selector="no"></div>
 *
 * data-playa: id de la playa (los de Portus). data-selector="no" fija la
 * playa y quita el buscador. En la página Costas, ?playa=ID elige la
 * playa y al cambiarla se apunta en la dirección para poder compartirla.
 *
 * API: GET /costas/playas (buscador) y GET /costas/playas/{id} (ficha).
 */

import {
    pedir, pedirPlayas, crear, aviso, vaciar, prepararRaiz, titulo, pie, conSelector, apuntarEnDireccion,
    buscadorPlayas, nombrePlaya, metros, segundos, grados, kmh, kilometros, hora, diaDe, nombreDia, fechaLarga,
    flecha, colorOla, pastillaEstado, textoAlerta, horaActualizacion, CITA
} from "./comun.js?v=20261118-costas1";


function tarjetaDia(dia, elegido, alElegir) {
    const boton = crear("button", `cos-dia${elegido ? " elegido" : ""}`);
    boton.type = "button";
    boton.setAttribute("aria-pressed", elegido ? "true" : "false");
    boton.style.setProperty("--cos-ola", colorOla(dia.ola_maxima));
    boton.appendChild(crear("span", "cos-dia-nombre", nombreDia(dia.fecha)));
    boton.appendChild(crear("strong", "cos-dia-ola", metros(dia.ola_maxima)));
    boton.appendChild(crear("span", "cos-dia-estado", dia.estado_mar || "Sin previsión"));
    const detalle = crear("span", "cos-dia-detalle");
    detalle.appendChild(crear("span", null, `Viento ${kmh(dia.viento_maximo)}`));
    detalle.appendChild(crear("span", null, `Agua ${grados(dia.temperatura_agua)}`));
    boton.appendChild(detalle);
    const alerta = textoAlerta(Math.max(dia.alerta_oleaje || 0, dia.alerta_viento || 0));
    if (alerta) boton.appendChild(crear("span", "cos-dia-alerta", alerta));
    boton.addEventListener("click", () => alElegir(dia.fecha));
    return boton;
}


function tablaHoras(horas) {
    const desliza = crear("div", "cos-tabla-desliza");
    const tabla = crear("table", "cos-horas");
    const cabeza = crear("thead");
    const filaCabeza = crear("tr");
    for (const texto of ["Hora", "Ola", "Periodo", "Mar del", "Viento", "Agua"]) {
        filaCabeza.appendChild(crear("th", null, texto));
    }
    cabeza.appendChild(filaCabeza);
    tabla.appendChild(cabeza);

    const cuerpo = crear("tbody");
    for (const fila of horas) {
        const tr = crear("tr");
        tr.appendChild(crear("td", "cos-hora", hora(fila.fecha)));

        const ola = crear("td", "cos-ola");
        const pastilla = crear("span", "cos-ola-pastilla", metros(fila.altura_significativa));
        pastilla.style.setProperty("--cos-ola", colorOla(fila.altura_significativa));
        ola.appendChild(pastilla);
        if (fila.estado_mar) ola.title = fila.estado_mar;
        tr.appendChild(ola);

        tr.appendChild(crear("td", null, segundos(fila.periodo_pico)));
        const mar = crear("td");
        mar.appendChild(flecha(fila.direccion_oleaje, fila.rumbo_oleaje, "Mar de fondo procedente del"));
        tr.appendChild(mar);

        const viento = crear("td");
        viento.appendChild(crear("span", "cos-viento-cifra", kmh(fila.velocidad_viento)));
        viento.appendChild(flecha(fila.direccion_viento, fila.rumbo_viento, "Viento del"));
        const alerta = textoAlerta(fila.alerta_viento);
        if (alerta) viento.appendChild(crear("span", "cos-alerta-mini", alerta));
        tr.appendChild(viento);

        tr.appendChild(crear("td", null, grados(fila.temperatura_agua)));
        cuerpo.appendChild(tr);
    }
    tabla.appendChild(cuerpo);
    desliza.appendChild(tabla);
    return desliza;
}


function bloqueMareas(ficha, fecha) {
    const caja = crear("div", "cos-ficha-mareas");
    caja.appendChild(crear("h4", null, "Mareas"));
    const delDia = ficha.mareas.filter(marea => diaDe(marea.fecha) === fecha);
    if (!delDia.length) {
        caja.appendChild(crear("p", "cos-nota", "Sin mareas previstas para ese día."));
        return caja;
    }
    const lista = crear("ul", "cos-mareas-lista");
    for (const marea of delDia) {
        const elemento = crear("li", `cos-marea ${marea.tipo === "PLEAMAR" ? "pleamar" : "bajamar"}`);
        elemento.appendChild(crear("span", "cos-marea-tipo", marea.tipo === "PLEAMAR" ? "Pleamar" : "Bajamar"));
        elemento.appendChild(crear("strong", null, hora(marea.fecha)));
        elemento.appendChild(crear("span", "cos-marea-altura", metros(marea.altura, 2)));
        lista.appendChild(elemento);
    }
    caja.appendChild(lista);
    if (ficha.mediterraneo) {
        caja.appendChild(crear("p", "cos-nota",
            "En el Mediterráneo la marea apenas se nota: sube y baja unos centímetros. Pesan más el viento y la presión."));
    }
    return caja;
}


function bloqueEstacion(etiqueta, estacion, tipo) {
    const caja = crear("div", "cos-ficha-estacion");
    caja.appendChild(crear("h4", null, etiqueta));
    if (!estacion) {
        caja.appendChild(crear("p", "cos-nota", "No hay ninguna cerca."));
        return caja;
    }
    const cabeza = crear("div", "cos-ficha-estacion-cabeza");
    cabeza.appendChild(crear("strong", null, estacion.nombre));
    cabeza.appendChild(pastillaEstado(estacion.estado));
    caja.appendChild(cabeza);
    caja.appendChild(crear("span", "cos-nota", kilometros(estacion.distancia_km)));
    const ultima = estacion.ultima;
    if (!ultima) {
        caja.appendChild(crear("p", "cos-nota", "Todavía no hay ningún dato guardado."));
        return caja;
    }
    const cifras = crear("div", "cos-ficha-cifras");
    if (tipo === "BOYA") {
        cifras.appendChild(crear("span", null, `Ola ${metros(ultima.altura_significativa, 2)}`));
        cifras.appendChild(crear("span", null, `Máxima ${metros(ultima.altura_maxima, 2)}`));
        cifras.appendChild(crear("span", null, `Periodo ${segundos(ultima.periodo_pico)}`));
        if (ultima.temperatura_agua !== null) cifras.appendChild(crear("span", null, `Agua ${grados(ultima.temperatura_agua)}`));
    } else {
        cifras.appendChild(crear("span", null, `Nivel ${metros(ultima.nivel_mar, 2)}`));
    }
    caja.appendChild(cifras);
    caja.appendChild(crear("small", "cos-nota", `Dato de las ${hora(ultima.fecha)}`));
    return caja;
}


function pintarFicha(contenedor, ficha, raiz) {
    vaciar(contenedor);

    const cabeza = crear("div", "cos-ficha-cabeza");
    cabeza.appendChild(crear("h3", "cos-ficha-nombre", ficha.playa.nombre));
    cabeza.appendChild(crear("span", "cos-ficha-lugar",
        `${ficha.playa.municipio ? `${ficha.playa.municipio} · ` : ""}${ficha.playa.provincia}`));
    contenedor.appendChild(cabeza);

    if (!ficha.dias.length) {
        contenedor.appendChild(crear("p", "cos-aviso", "Todavía no hay previsión para esta playa. Se carga a las 07:40 y a las 19:40."));
        return;
    }

    const dias = ficha.dias.slice(0, 3);
    let elegido = raiz.dataset.dia && dias.some(d => d.fecha === raiz.dataset.dia) ? raiz.dataset.dia : dias[0].fecha;

    const tiras = crear("div", "cos-dias");
    const detalle = crear("div", "cos-ficha-detalle");
    contenedor.appendChild(tiras);
    contenedor.appendChild(detalle);

    function elegir(fecha) {
        elegido = fecha;
        raiz.dataset.dia = fecha;
        vaciar(tiras);
        for (const dia of dias) tiras.appendChild(tarjetaDia(dia, dia.fecha === elegido, elegir));
        vaciar(detalle);
        detalle.appendChild(crear("h4", "cos-ficha-dia", fechaLarga(elegido)));
        const horas = ficha.horas.filter(fila => diaDe(fila.fecha) === elegido);
        if (horas.length) {
            detalle.appendChild(tablaHoras(horas));
        } else {
            detalle.appendChild(crear("p", "cos-nota", "Sin previsión por horas para ese día."));
        }
        const columnas = crear("div", "cos-ficha-columnas");
        columnas.appendChild(bloqueMareas(ficha, elegido));
        columnas.appendChild(bloqueEstacion("Boya más cercana", ficha.boya, "BOYA"));
        detalle.appendChild(columnas);
    }

    elegir(elegido);

    const actualizado = horaActualizacion(ficha.actualizado);
    contenedor.appendChild(crear("p", "cos-pie",
        `Previsión del modelo de Puertos del Estado para el punto de mar frente a la playa · ${CITA}${actualizado ? ` · ${actualizado}` : ""}`));
}


export async function montarPlayaCostas(raiz) {
    prepararRaiz(raiz, "costas-playa");
    titulo(raiz, "Costas de Andalucía", "Tu playa");

    const contenedorFicha = crear("div", "cos-ficha");
    let playaActual = (raiz.dataset.playa || "").trim();

    async function cargarFicha(id) {
        playaActual = String(id);
        raiz.dataset.playa = playaActual;
        aviso(contenedorFicha, "Mirando la mar en esa playa…");
        try {
            const ficha = await pedir(`/costas/playas/${encodeURIComponent(id)}`);
            pintarFicha(contenedorFicha, ficha, raiz);
        } catch (error) {
            aviso(contenedorFicha, error.estado === 404
                ? "No encontramos esa playa."
                : "No se ha podido leer la previsión de la playa. Se puede volver a intentar más tarde.", true);
        }
    }

    if (conSelector(raiz)) {
        let playas = [];
        try {
            playas = await pedirPlayas();
        } catch (error) {
            aviso(raiz, "No se ha podido leer la lista de playas. Se puede volver a intentar más tarde.", true);
            return;
        }
        const inicial = playas.find(p => String(p.id) === playaActual);
        raiz.appendChild(buscadorPlayas(playas, playa => {
            apuntarEnDireccion("playa", playa.id);
            cargarFicha(playa.id);
        }, inicial ? nombrePlaya(inicial) : ""));
        if (!playas.length) {
            raiz.appendChild(crear("p", "cos-aviso", "Todavía no hay playas cargadas."));
        }
    }

    raiz.appendChild(contenedorFicha);

    if (playaActual) {
        await cargarFicha(playaActual);
    } else {
        aviso(contenedorFicha, "Escribe el nombre de una playa para ver su oleaje, el viento, el agua y las mareas de hoy, mañana y pasado.");
    }
}


/* Fin de fichero: js/costas/playa.js */
