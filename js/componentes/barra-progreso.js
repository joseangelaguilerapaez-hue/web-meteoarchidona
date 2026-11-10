/*
 * MeteoArchidona · Componente «Barra de progreso»
 *
 * Barra reutilizable para cualquier proceso del pool de procesos
 * (decisión de José del 10-11-2026; docs/procesos.md de la API): enseña el
 * porcentaje, el paso en curso y, al terminar, el resultado con el color
 * de su estado. No sabe de qué proceso se trata: pinta lo que recibe.
 *
 *     import {crearBarraProgreso, seguirProceso}
 *         from "/js/componentes/barra-progreso.js?v=…";
 *
 *     const barra = crearBarraProgreso({compacta: false});
 *     hueco.append(barra.elemento);
 *     barra.actualizar(progreso);                // un objeto ProgresoProceso
 *
 *     const detener = seguirProceso(barra, () => pedirProgreso(id), {
 *         cadaMs: 3000,
 *         alTerminar: progreso => …
 *     });
 *
 * `progreso` es lo que devuelve GET /admin/procesos/{id}/progreso:
 * estado, estado_nombre, porcentaje (vacío si aún no se sabe el total),
 * pasos_hechos, pasos_total, paso_actual, terminado, mensaje y
 * cancelacion_solicitada. `seguirProceso` pregunta cada pocos segundos
 * hasta que termina y entonces llama a `alTerminar`.
 *
 * Sin id fijos: admite varias en la misma página. El texto nunca se mete
 * como HTML.
 */

import {asegurarHoja} from "./comun.js?v=20261104-componentes1";


const HOJA = "/css/barra-progreso.css?v=20261110-procesos1";

const FORMATO = new Intl.NumberFormat("es-ES", {maximumFractionDigits: 0});


function crear(etiqueta, clase, texto){

    const elemento = document.createElement(etiqueta);

    if(clase){
        elemento.className = clase;
    }
    if(texto !== undefined && texto !== null){
        elemento.textContent = texto;
    }
    return elemento;
}


export function crearBarraProgreso({compacta = false} = {}){

    asegurarHoja(HOJA);

    const elemento = crear("div", "barra-progreso" + (compacta ? " barra-progreso-compacta" : ""));
    elemento.setAttribute("role", "progressbar");
    elemento.setAttribute("aria-valuemin", "0");
    elemento.setAttribute("aria-valuemax", "100");

    const cabecera = crear("div", "barra-progreso-cabecera");
    const estado = crear("span", "barra-progreso-estado");
    const cifra = crear("span", "barra-progreso-cifra");
    cabecera.append(estado, cifra);

    const pista = crear("div", "barra-progreso-pista");
    const relleno = crear("div", "barra-progreso-relleno");
    pista.append(relleno);

    const texto = crear("p", "barra-progreso-texto");

    elemento.append(cabecera, pista, texto);


    function actualizar(progreso){

        if(!progreso){
            return;
        }

        const porcentaje = progreso.porcentaje;
        const conCifra = porcentaje !== null && porcentaje !== undefined;

        elemento.dataset.estado = progreso.estado || "";
        elemento.classList.toggle("indeterminada", !conCifra && !progreso.terminado);

        estado.textContent = progreso.cancelacion_solicitada && !progreso.terminado
            ? "Cancelando…"
            : (progreso.estado_nombre || progreso.estado || "");

        cifra.textContent = conCifra
            ? `${FORMATO.format(porcentaje)} %`
                + (progreso.pasos_total ? ` · ${progreso.pasos_hechos} de ${progreso.pasos_total}` : "")
            : "";

        relleno.style.width = conCifra ? `${Math.max(0, Math.min(100, porcentaje))}%` : "";

        if(conCifra){
            elemento.setAttribute("aria-valuenow", String(Math.round(porcentaje)));
        }else{
            elemento.removeAttribute("aria-valuenow");
        }

        texto.textContent = progreso.terminado
            ? (progreso.mensaje || "")
            : (progreso.paso_actual || "");
        texto.hidden = !texto.textContent;
    }


    return {elemento, actualizar};
}


export function seguirProceso(barra, consultar, {cadaMs = 3000, alTerminar = null, alFallar = null} = {}){

    let detenido = false;
    let temporizador = null;

    async function vuelta(){

        if(detenido){
            return;
        }

        try{
            const progreso = await consultar();
            if(detenido){
                return;
            }
            barra.actualizar(progreso);
            if(progreso.terminado){
                detenido = true;
                alTerminar?.(progreso);
                return;
            }
        }catch(error){
            alFallar?.(error);
        }

        if(!detenido){
            temporizador = setTimeout(vuelta, cadaMs);
        }
    }

    vuelta();

    return function detener(){
        detenido = true;
        clearTimeout(temporizador);
    };
}


/* Fin de fichero: js/componentes/barra-progreso.js */
