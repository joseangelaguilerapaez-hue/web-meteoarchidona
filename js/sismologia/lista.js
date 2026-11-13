/*
 * MeteoArchidona · Componente «Últimos terremotos»
 *
 * Lista de los sismos más recientes cerca de Archidona: fecha y hora de
 * Madrid, magnitud, profundidad, lugar, distancia e intensidad si se
 * sintió. Los provisionales del EMSC van marcados.
 *
 *     <div data-componente="sismologia-lista"></div>
 *     <div data-componente="sismologia-lista" data-radio="100" data-dias="30"
 *          data-limite="10" data-magnitud="2" data-titulo="no"></div>
 *
 * data-radio: km (150; 300 como mucho). data-dias: días hacia atrás (30).
 * data-limite: cuántos (15). data-magnitud: mínima (todas).
 *
 * API: GET /sismologia/terremotos?radio_km&dias&limite
 */

import {
    pedir, crear, aviso, prepararRaiz, esVigente, titulo, pie, leerRadio, leerNumero, rutaTerremotos,
    pastillaMagnitud, kilometros, fechaHora, lugar, enlaceFicha, horaActualizacion, FUENTE
} from "./comun.js?v=20261109-heli1";


function fila(sismo) {
    const elemento = crear("li", `sis-fila${sismo.sentido ? " sentido" : ""}${sismo.provisional ? " provisional" : ""}`);

    elemento.appendChild(pastillaMagnitud(sismo));

    const centro = crear("div", "sis-fila-centro");
    const lugarTexto = crear("span", "sis-fila-lugar", lugar(sismo));
    centro.appendChild(lugarTexto);

    const detalle = [fechaHora(sismo), `prof. ${kilometros(sismo.profundidad_km)}`];
    if (sismo.intensidad) detalle.push(`sentido (${sismo.intensidad})`);
    if (sismo.provisional) detalle.push("provisional (EMSC)");
    centro.appendChild(crear("span", "sis-fila-detalle", detalle.join(" · ")));
    elemento.appendChild(centro);

    const derecha = crear("div", "sis-fila-derecha");
    derecha.appendChild(crear("span", "sis-fila-distancia", kilometros(sismo.distancia_km)));
    const enlace = enlaceFicha(sismo);
    if (enlace) derecha.appendChild(enlace);
    elemento.appendChild(derecha);

    return elemento;
}


export async function montarListaTerremotos(raiz) {
    const turno = prepararRaiz(raiz, "sismologia-lista");

    const radio = leerRadio(raiz, 150);
    const dias = Math.round(leerNumero(raiz, "dias", 30, 1, 3650));
    const limite = Math.round(leerNumero(raiz, "limite", 15, 1, 200));
    const minima = raiz.dataset.magnitud ? leerNumero(raiz, "magnitud", 0, 0, 9) : null;

    aviso(raiz, "Buscando los últimos terremotos…");

    let datos;

    try {
        datos = await pedir(rutaTerremotos({ radio, dias, limite, magnitud: minima }));
    } catch (error) {
        if (!esVigente(raiz, turno)) return;
        aviso(raiz, "No se han podido leer los terremotos. Se puede volver a intentar más tarde.", true);
        return;
    }

    if (!esVigente(raiz, turno)) return;
    raiz.textContent = "";
    titulo(raiz, "Últimos terremotos", `A menos de ${radio} km de Archidona`);

    if (!datos.terremotos.length) {
        raiz.appendChild(crear("p", "sis-aviso-texto",
            `No hay terremotos a menos de ${radio} km en los últimos ${dias} días.`));
    } else {
        const lista = crear("ul", "sis-lista");
        for (const sismo of datos.terremotos) lista.appendChild(fila(sismo));
        raiz.appendChild(lista);
    }

    const actualizado = horaActualizacion(datos.actualizado);
    pie(raiz, `Hora de Madrid · distancia al centro de Archidona · ${FUENTE}${actualizado ? ` · ${actualizado}` : ""}`);
}


/* Fin de fichero: js/sismologia/lista.js */
