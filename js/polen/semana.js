/*
 * MeteoArchidona · Componente «Polen medido esta semana»
 *
 * La última semana medida por el captador de la Universidad de Granada:
 * una barra por tipo de polen con el color de su nivel, su media de la
 * semana y una marca con lo normal (la media de esa semana en otros
 * años). Ordenado de más a menos nivel.
 *
 *     <div data-componente="polen-semana"></div>                   (Granada)
 *     <div data-componente="polen-semana" data-estacion="JAEN"></div>
 *     <div data-componente="polen-semana" data-maximo="5" data-titulo="no"></div>
 *
 * data-maximo deja solo los N tipos más altos (para un dashboard).
 *
 * Granada está a unos 70 km de Archidona, en la provincia vecina: José
 * la da por buena como referencia medida de la zona (6-11-2026). La UGR
 * publica en temporada, más o menos de febrero a septiembre.
 *
 * API: GET /polen/recuentos/ultima-semana?estacion y GET /polen/tipos.
 */

import {
    pedir, crear, aviso, prepararRaiz, titulo, pie, pastillaNivel,
    leerEstacion, granos, textoSemana, NIVELES, FUENTE_UGR
} from "./comun.js?v=20261106-polen1";


/* Escala logarítmica: el ciprés pasa de 2.000 y la artemisa de 10, y
 * los dos tienen que verse. El final de la barra es cuatro veces el
 * umbral de «alto» de cada tipo. */
function largo(valor, umbrales) {
    if (!valor || valor < 0 || !umbrales) return 0;
    const tope = Math.log10(1 + umbrales.alto * 4);
    return Math.max(2, Math.min(100, (Math.log10(1 + valor) / tope) * 100));
}


function veces(media, normal) {
    if (media === null || media === undefined || !normal || normal < 1) return "";
    const razon = media / normal;
    if (razon >= 1.5) return ` · ${razon.toLocaleString("es-ES", { maximumFractionDigits: 1 })} veces lo normal`;
    if (razon <= 0.67) return " · por debajo de lo normal";
    return " · como lo normal";
}


export async function montarPolenSemana(raiz) {
    prepararRaiz(raiz, "polen-semana");
    aviso(raiz, "Leyendo lo medido en Granada…");

    const estacion = leerEstacion(raiz);
    let datos;
    let tipos;

    try {
        [datos, tipos] = await Promise.all([
            pedir(`/polen/recuentos/ultima-semana?estacion=${encodeURIComponent(estacion)}`),
            pedir("/polen/tipos")
        ]);
    } catch (error) {
        aviso(raiz, error.estado === 404
            ? "Esa estación no existe."
            : "No se han podido leer los recuentos de polen. Se puede volver a intentar más tarde.", true);
        return;
    }

    raiz.textContent = "";
    titulo(raiz, "Polen medido", datos.nombre_estacion);

    if (!datos.semana || !datos.tipos.length) {
        raiz.appendChild(crear("p", "pol-aviso", `Todavía no hay recuentos de ${datos.nombre_estacion}.`));
        pie(raiz, FUENTE_UGR);
        return;
    }

    const umbrales = Object.fromEntries(tipos.map(tipo => [tipo.codigo, tipo.umbrales]));

    const cabeza = crear("div", "pol-semana-cabeza");
    const cuando = crear("span", "pol-semana-cuando", `${datos.anio}, ${textoSemana(datos.anio, datos.semana)}`);
    cabeza.appendChild(cuando);
    cabeza.appendChild(pastillaNivel(datos.nivel));
    raiz.appendChild(cabeza);

    const orden = [...datos.tipos].sort((a, b) =>
        NIVELES.indexOf(b.nivel) - NIVELES.indexOf(a.nivel) || (b.media || 0) - (a.media || 0));
    const maximo = parseInt(raiz.dataset.maximo, 10);
    const lista = crear("ul", "pol-barras");

    for (const tipo of maximo > 0 ? orden.slice(0, maximo) : orden) {
        const fila = crear("li", `pol-barra-fila nivel-${tipo.nivel || "NINGUNO"}`);
        fila.title = `${tipo.nombre}: ${granos(tipo.media)} de media; lo normal esa semana, ${granos(tipo.media_historica)}${veces(tipo.media, tipo.media_historica)}`;

        fila.appendChild(crear("span", "pol-barra-nombre", tipo.nombre));

        const barra = crear("div", "pol-barra");
        const relleno = crear("span");
        relleno.style.setProperty("--pol-largo", `${largo(tipo.media, umbrales[tipo.codigo])}%`);
        barra.appendChild(relleno);

        if (tipo.media_historica !== null && tipo.media_historica !== undefined) {
            const marca = crear("i");
            marca.style.setProperty("--pol-marca", `${largo(tipo.media_historica, umbrales[tipo.codigo])}%`);
            barra.appendChild(marca);
        }

        fila.appendChild(barra);
        fila.appendChild(crear("span", "pol-barra-cifra pol-cifra", granos(tipo.media, false)));
        fila.appendChild(pastillaNivel(tipo.nivel));
        lista.appendChild(fila);
    }

    raiz.appendChild(lista);

    const leyenda = crear("p", "pol-leyenda");
    leyenda.appendChild(crear("span", "pol-leyenda-normal", "Lo normal esa semana (otros años)"));
    leyenda.appendChild(crear("span", null, "Media de la semana en g/m³; escala logarítmica"));
    raiz.appendChild(leyenda);

    pie(raiz, `Captador de ${datos.nombre_estacion} · ${FUENTE_UGR}`);
}


/* Fin de fichero: js/polen/semana.js */
