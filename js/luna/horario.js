/*
 * MeteoArchidona · Componente «Salida y puesta de la Luna»
 *
 * Día a día desde hoy: a qué hora sale la Luna y por dónde, cuándo pasa
 * por el sur y a qué altura, cuándo se pone, y su fase. Algún día no sale
 * o no se pone: la Luna se retrasa unos 50 minutos cada día.
 *
 *     <div data-componente="luna-horario"></div>
 *
 * Opciones:
 *     data-dias   cuántos días (7 por defecto, de 1 a 31).
 */

import {
    FUENTE_CALCULO,
    aviso, cadaRato, crear, diaCorto, dibujarFase, entero, gradosAngulo, hora, hoyMadrid,
    pedir, prepararRaiz, pie, textoError, vaciar
} from "./comun.js?v=20261111-luna2";


const CADA_MS = 30 * 60 * 1000;

const ANGULOS = {
    NUEVA: 0, CRECIENTE: 45, CUARTO_CRECIENTE: 90, GIBOSA_CRECIENTE: 135,
    LLENA: 180, GIBOSA_MENGUANTE: 225, CUARTO_MENGUANTE: 270, MENGUANTE: 315
};


function celdaHora(instante, detalle) {
    const celda = crear("td", "lun-cifra");
    if (!instante) {
        celda.textContent = "—";
        celda.classList.add("lun-tenue");
        return celda;
    }
    celda.appendChild(document.createTextNode(hora(instante)));
    if (detalle) {
        celda.appendChild(crear("span", "lun-detalle", detalle));
    }
    return celda;
}


function pintar(raiz, datos) {
    vaciar(raiz);
    const hoy = hoyMadrid();

    const tabla = crear("table", "lun-tabla");
    const cabeza = crear("tr");
    for (const texto of ["Día", "Sale", "Pasa por el sur", "Se pone", "Fase"]) {
        cabeza.appendChild(crear("th", null, texto));
    }
    tabla.appendChild(crear("thead")).appendChild(cabeza);
    const cuerpo = tabla.appendChild(crear("tbody"));

    for (const dia of datos.dias) {
        const fila = crear("tr", dia.fecha === hoy ? "lun-hoy" : null);
        fila.appendChild(crear("th", null, dia.fecha === hoy ? "Hoy" : diaCorto(dia.fecha)));
        fila.appendChild(celdaHora(dia.salida, dia.direccion_salida));
        fila.appendChild(celdaHora(dia.transito, dia.altura_transito === null ? null : gradosAngulo(dia.altura_transito)));
        fila.appendChild(celdaHora(dia.puesta, dia.direccion_puesta));

        const fase = crear("td", "lun-celda-fase");
        fase.appendChild(dibujarFase(ANGULOS[dia.fase] ?? 0, 20));
        fase.appendChild(crear("span", "lun-cifra", `${entero(dia.iluminacion)} %`));
        fase.title = dia.nombre_fase;
        fila.appendChild(fase);

        cuerpo.appendChild(fila);
    }

    const envoltorio = crear("div", "lun-tabla-envoltorio");
    envoltorio.appendChild(tabla);
    raiz.appendChild(envoltorio);
    pie(raiz, `Hora de Madrid. Rumbo de salida y puesta, y altura al pasar por el sur. ${FUENTE_CALCULO}.`);
}


export function montarHorarioLuna(raiz) {
    prepararRaiz(raiz, "luna-horario");
    const dias = Math.min(31, Math.max(1, parseInt(raiz.dataset.dias || "7", 10) || 7));
    aviso(raiz, "Cargando…");

    cadaRato(raiz, async () => {
        try {
            pintar(raiz, await pedir(`/luna/horario?desde=${hoyMadrid()}&dias=${dias}`));
        } catch (error) {
            aviso(raiz, textoError(error), true);
        }
    }, CADA_MS);
}


/* Fin de fichero: js/luna/horario.js */
