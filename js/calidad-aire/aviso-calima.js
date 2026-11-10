/*
 * MeteoArchidona · Componente «Aviso de calima»
 *
 * Franja con el aviso de calima (polvo del Sáhara) de los próximos días
 * en Archidona: el peor nivel previsto, el texto del aviso, la posible
 * lluvia de barro y una casilla por día. Sin calima a la vista, una
 * franja de cielo limpio.
 *
 *     <div data-componente="calima-aviso"></div>
 *     <div data-componente="calima-aviso" data-solo-aviso="si"></div>
 *
 * Con data-solo-aviso="si" no enseña nada si no hay calima (para la
 * portada o un dashboard).
 *
 * Niveles por el polvo medio del día (José, 10-11-2026): leve desde
 * 20 µg/m³, moderada desde 50, fuerte desde 100 y muy fuerte desde 200.
 *
 * API: GET /calima/aviso?localidad
 */

import {
    pedir, crear, prepararRaiz, aviso, avisoError, pie, leerLocalidad,
    pastillaCalima, microgramos, diaCorto, fechaCorta, horaActualizacion,
    NOMBRES_CALIMA, FUENTE_MODELO, PAGINA
} from "./comun.js?v=20261111-aire1";


export async function montarAvisoCalima(raiz) {
    prepararRaiz(raiz, "calima-aviso");
    const soloAviso = raiz.dataset.soloAviso === "si";

    if (!soloAviso) aviso(raiz, "Mirando si viene calima…");

    let datos;

    try {
        datos = await pedir(`/calima/aviso?localidad=${leerLocalidad(raiz)}`);
    } catch (error) {
        if (soloAviso) {
            raiz.hidden = true;
            return;
        }
        avisoError(raiz, error, "el aviso de calima");
        return;
    }

    raiz.textContent = "";

    if (soloAviso && !datos.aviso) {
        raiz.hidden = true;
        return;
    }

    raiz.hidden = false;
    raiz.classList.add(datos.aviso ? `calima-${datos.nivel}` : "calima-SIN_CALIMA");

    const franja = crear("div", "air-calima");
    franja.setAttribute("role", datos.aviso ? "alert" : "status");

    const icono = crear("span", "air-calima-icono", datos.aviso ? "≋" : "○");
    icono.setAttribute("aria-hidden", "true");
    franja.appendChild(icono);

    const texto = crear("div", "air-calima-texto");
    texto.appendChild(crear("div", "air-etiqueta", `Calima · ${datos.nombre_localidad}`));
    texto.appendChild(crear("strong", "air-calima-titulo", datos.titulo));
    texto.appendChild(crear("p", null, datos.texto));

    if (datos.lluvia_barro) {
        texto.appendChild(crear("p", "air-barro", "Ojo con la lluvia de barro: mejor no tender ropa ni lavar el coche esos días."));
    }

    if (datos.episodio && datos.aviso) {
        const episodio = datos.episodio;
        const dias = episodio.dias === 1 ? "1 día" : `${episodio.dias} días`;
        texto.appendChild(crear("p", "air-calima-episodio",
            `Episodio del ${fechaCorta(episodio.inicio)} al ${fechaCorta(episodio.fin)} (${dias}), ${NOMBRES_CALIMA[episodio.nivel].toLowerCase()}.`));
    }

    franja.appendChild(texto);
    raiz.appendChild(franja);

    if (datos.dias.length) {
        const dias = crear("ol", "air-calima-dias");
        datos.dias.forEach((dia, posicion) => {
            const elemento = crear("li", `calima-${dia.nivel}`);
            elemento.appendChild(crear("strong", null, posicion === 0 ? "Hoy" : diaCorto(dia.fecha)));
            elemento.appendChild(pastillaCalima(dia.nivel, true));
            elemento.appendChild(crear("small", "air-cifra", microgramos(dia.polvo_medio)));
            if (dia.lluvia_barro) elemento.appendChild(crear("small", "air-barro", "barro"));
            elemento.title = `Polvo medio ${microgramos(dia.polvo_medio)}, máximo ${microgramos(dia.polvo_maximo)}`
                + (dia.lluvia_prevista !== null ? `; lluvia prevista ${dia.lluvia_prevista} mm` : "");
            dias.appendChild(elemento);
        });
        raiz.appendChild(dias);
    }

    const actualizada = horaActualizacion(datos.actualizada);
    pie(raiz, `Polvo en superficie, media del día · ${FUENTE_MODELO}${actualizada ? ` · ${actualizada}` : ""}`);

    // Fuera de su página (portada, dashboards), un enlace a la sección.
    if (!location.pathname.startsWith(PAGINA)) {
        const mas = crear("a", "air-mas", "Calidad del aire en Archidona →");
        mas.href = PAGINA;
        raiz.appendChild(mas);
    }
}


/* Fin de fichero: js/calidad-aire/aviso-calima.js */
