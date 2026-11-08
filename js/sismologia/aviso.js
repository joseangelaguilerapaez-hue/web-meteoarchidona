/*
 * MeteoArchidona · Componente «Aviso de terremoto»
 *
 * Banda destacada cuando hay un terremoto sentido, o de magnitud 3 o
 * más, cerca de Archidona en las últimas horas. Si no hay ninguno, el
 * componente no ocupa sitio (salvo con data-silencio="mostrar", que deja
 * una línea tranquila; así va en la página Sismología).
 *
 *     <div data-componente="sismologia-aviso"></div>
 *     <div data-componente="sismologia-aviso" data-radio="100" data-horas="48"
 *          data-magnitud="3" data-silencio="mostrar"></div>
 *
 * Por defecto: 100 km, 48 horas y magnitud 3 (docs/sismologia.md).
 *
 * API: GET /sismologia/aviso?radio_km&horas&magnitud_minima
 */

import {
    pedir, crear, prepararRaiz, leerRadio, leerNumero, pastillaMagnitud, magnitud,
    kilometros, fechaHora, haceCuanto, lugar, enlaceFicha, FUENTE
} from "./comun.js?v=20261108-sismo2";


export async function montarAvisoTerremoto(raiz) {
    const radio = leerRadio(raiz, 100);
    const horas = Math.round(leerNumero(raiz, "horas", 48, 1, 720));
    const minima = leerNumero(raiz, "magnitud", 3, 0, 9);
    const mostrarSilencio = raiz.dataset.silencio === "mostrar";

    let datos;

    try {
        datos = await pedir(`/sismologia/aviso?radio_km=${radio}&horas=${horas}&magnitud_minima=${minima}`);
    } catch (error) {
        // Un aviso que no se puede leer no debe asustar: no se enseña nada.
        raiz.hidden = true;
        return;
    }

    if (!datos.hay_aviso) {
        if (!mostrarSilencio) {
            raiz.hidden = true;
            return;
        }

        prepararRaiz(raiz, "sismologia-aviso");
        raiz.classList.add("tranquilo");
        raiz.appendChild(crear("p", "sis-aviso-tranquilo",
            `Sin terremotos sentidos ni de magnitud ${magnitud(minima)} o más a menos de ${radio} km en las últimas ${horas} horas.`));
        return;
    }

    const sismo = datos.terremoto;
    prepararRaiz(raiz, "sismologia-aviso");
    raiz.classList.add("activo");
    raiz.setAttribute("role", "status");

    raiz.appendChild(pastillaMagnitud(sismo));

    const texto = crear("div", "sis-aviso-cuerpo");
    texto.appendChild(crear("strong", null, sismo.sentido
        ? `Terremoto sentido ${haceCuanto(sismo)}`
        : `Terremoto de magnitud ${magnitud(sismo.magnitud)} ${haceCuanto(sismo)}`));

    const partes = [
        `${lugar(sismo)}, a ${kilometros(sismo.distancia_km)} de Archidona`,
        fechaHora(sismo),
        `profundidad ${kilometros(sismo.profundidad_km)}`
    ];
    if (sismo.intensidad) partes.push(`intensidad máxima ${sismo.intensidad}`);
    if (sismo.provisional) partes.push("dato provisional del EMSC");
    texto.appendChild(crear("span", null, partes.join(" · ")));

    const enlace = enlaceFicha(sismo, "Ver ficha");
    if (enlace) texto.appendChild(enlace);
    texto.appendChild(crear("small", null, FUENTE));

    raiz.appendChild(texto);
}


/* Fin de fichero: js/sismologia/aviso.js */
