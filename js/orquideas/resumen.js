/*
 * MeteoArchidona · Componente «Orquídeas de la comarca» (resumen)
 *
 * Las cifras de un vistazo: especies, híbridos, observaciones, cuadrículas
 * de 10 km y cuántas están en flor este mes, en el radio elegido.
 *
 *     <div data-componente="orquideas-resumen" data-radio="50"></div>
 *
 * API: GET /orquideas/resumen?radio=50 (privada: administradores y amigos
 * de las orquídeas).
 */

import {
    pedir, crear, aviso, prepararRaiz, titulo, pie, numero, fechaCorta, leerRadio, textoError, MESES
} from "./comun.js?v=20261126-jornadas1";


function cifra(valor, texto, destacada = false) {
    const caja = crear("div", destacada ? "orq-cifra destacada" : "orq-cifra");
    caja.appendChild(crear("strong", "orq-cifra-valor", numero(valor)));
    caja.appendChild(crear("span", "orq-cifra-texto", texto));
    return caja;
}


export async function montarResumenOrquideas(raiz) {
    prepararRaiz(raiz, "orq-resumen");
    const radio = leerRadio(raiz);
    titulo(raiz, "ORQUÍDEAS", `A menos de ${radio} km de Archidona`);
    const cuerpo = crear("div", "orq-cuerpo");
    raiz.appendChild(cuerpo);
    aviso(cuerpo, "Cargando…");

    let datos;
    try {
        datos = await pedir(`/orquideas/resumen?radio=${radio}`);
    } catch (error) {
        aviso(cuerpo, textoError(error), true);
        return;
    }

    if (!datos.observaciones) {
        aviso(cuerpo, "Todavía no hay observaciones cargadas.");
        return;
    }

    const rejilla = crear("div", "orq-cifras");
    rejilla.append(
        cifra(datos.en_flor, `en flor en ${MESES[datos.mes - 1]}`, true),
        cifra(datos.especies, datos.especies === 1 ? "especie" : "especies"),
        cifra(datos.hibridos, datos.hibridos === 1 ? "híbrido" : "híbridos"),
        cifra(datos.observaciones, "observaciones"),
        cifra(datos.cuadriculas, "cuadrículas de 10 km")
    );
    vaciarYPoner(cuerpo, rejilla);

    pie(raiz, `Observaciones desde el ${fechaCorta(datos.primera_fecha)} hasta el ${fechaCorta(datos.ultima_fecha)}. ${datos.cita.texto}`);
}


function vaciarYPoner(nodo, hijo) {
    while (nodo.firstChild) nodo.removeChild(nodo.firstChild);
    nodo.appendChild(hijo);
}


/* Fin de fichero: js/orquideas/resumen.js */
