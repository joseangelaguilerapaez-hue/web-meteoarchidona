/*
 * MeteoArchidona · Componente «Época de peligro en Andalucía»
 *
 * Época de peligro de incendios vigente en Andalucía (Plan INFOCA): hasta
 * cuándo dura, cuál viene después, la franja del año con el día de hoy y
 * las restricciones de uso del fuego. Las fechas son las del calendario
 * (Decreto 247/2001) salvo que los administradores las corrijan, p. ej.
 * cuando la Junta alarga la época alta por orden en el BOJA.
 *
 *     <div data-componente="incendios-epoca"></div>
 *
 * API: GET /incendios/epoca
 */

import {
    pedir, crear, aviso, prepararRaiz, titulo, fechaLarga, textoError
} from "./comun.js?v=20261115-incendios1";


function dias(desde, hasta) {
    return (Date.parse(hasta) - Date.parse(desde)) / 86400000 + 1;
}


export async function montarEpocaIncendios(raiz) {
    prepararRaiz(raiz, "inc-epoca");
    titulo(raiz, "Plan INFOCA · Andalucía", "Época de peligro de incendios");

    let datos;
    try {
        datos = await pedir("/incendios/epoca");
    } catch (error) {
        aviso(raiz, textoError(error), true);
        return;
    }

    const vigente = datos.vigente;
    const portada = crear("div", "inc-epoca-vigente");
    portada.style.borderColor = vigente.color;
    const nombre = crear("strong", "inc-epoca-nombre", vigente.nombre);
    nombre.style.color = vigente.color;
    portada.appendChild(nombre);
    portada.appendChild(crear("span", "inc-epoca-hasta", `Hasta el ${fechaLarga(vigente.fin)}`));
    if (vigente.origen === "ADMINISTRACION") {
        portada.appendChild(crear("span", "inc-epoca-cambio",
            vigente.motivo ? `Fechas cambiadas: ${vigente.motivo}` : "Fechas cambiadas por la Junta"));
    }
    if (datos.siguiente) {
        portada.appendChild(crear("span", "inc-epoca-siguiente",
            `Después: ${datos.siguiente.nombre.toLowerCase()}, desde el ${fechaLarga(datos.siguiente.inicio)}`));
    }
    raiz.appendChild(portada);

    // Franja del año, con el día de hoy marcado.
    const total = dias(datos.tramos[0].inicio, datos.tramos[datos.tramos.length - 1].fin);
    const franja = crear("div", "inc-epoca-franja");
    franja.setAttribute("role", "img");
    franja.setAttribute("aria-label", "Épocas de peligro del año");
    for (const tramo of datos.tramos) {
        const trozo = crear("span", "inc-epoca-trozo");
        trozo.style.flexGrow = String(dias(tramo.inicio, tramo.fin));
        trozo.style.background = tramo.color;
        trozo.title = `${tramo.nombre}: del ${fechaLarga(tramo.inicio)} al ${fechaLarga(tramo.fin)}`;
        franja.appendChild(trozo);
    }
    const marca = crear("span", "inc-epoca-hoy");
    marca.style.left = `${(dias(datos.tramos[0].inicio, datos.hoy) - 0.5) / total * 100}%`;
    marca.title = "Hoy";
    franja.appendChild(marca);
    raiz.appendChild(franja);

    const meses = crear("div", "inc-epoca-meses");
    for (const mes of ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]) {
        meses.appendChild(crear("span", null, mes));
    }
    raiz.appendChild(meses);

    raiz.appendChild(crear("h4", "inc-subtitulo", "Qué se puede hacer con el fuego"));
    const lista = crear("ul", "inc-lista");
    for (const texto of datos.restricciones) {
        lista.appendChild(crear("li", null, texto));
    }
    raiz.appendChild(lista);

    const norma = crear("p", "inc-pie");
    norma.appendChild(document.createTextNode(`${datos.norma} `));
    const enlace = crear("a", null, "Incendios forestales en la web de la Junta");
    enlace.href = datos.enlace;
    enlace.target = "_blank";
    enlace.rel = "noopener";
    norma.appendChild(enlace);
    raiz.appendChild(norma);
}


/* Fin de fichero: js/incendios/epoca.js */
