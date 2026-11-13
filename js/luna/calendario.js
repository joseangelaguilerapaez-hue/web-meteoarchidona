/*
 * MeteoArchidona · Componente «Calendario lunar»
 *
 * El mes con la Luna de cada día (a las 00:00), las cuatro fases
 * principales con su hora y las superlunas. Se puede pasar de mes.
 *
 *     <div data-componente="luna-calendario"></div>
 *
 * Opciones:
 *     data-selector="no"   sin los botones de mes anterior y siguiente.
 */

import {
    FUENTE_CALCULO,
    aviso, crear, dibujarFase, entero, hora, hoyMadrid, nombreMes, pedir, prepararRaiz, pie, textoError, vaciar
} from "./comun.js?v=20261111-luna5";


const SEMANA = ["L", "M", "X", "J", "V", "S", "D"];

const PRINCIPALES = {
    NUEVA: "Nueva",
    CUARTO_CRECIENTE: "C. creciente",
    LLENA: "Llena",
    CUARTO_MENGUANTE: "C. menguante"
};


function pintar(cuerpo, datos) {
    vaciar(cuerpo);
    const hoy = hoyMadrid();

    const rejilla = crear("div", "lun-calendario");
    for (const dia of SEMANA) {
        rejilla.appendChild(crear("div", "lun-calendario-semana", dia));
    }

    const primero = new Date(Date.UTC(datos.anio, datos.mes - 1, 1));
    const hueco = (primero.getUTCDay() + 6) % 7;
    for (let i = 0; i < hueco; i++) {
        rejilla.appendChild(crear("div", "lun-calendario-vacio"));
    }

    for (const dia of datos.dias) {
        const celda = crear("div", "lun-calendario-dia");
        if (dia.fecha === hoy) celda.classList.add("lun-hoy");
        if (dia.fase_principal) celda.classList.add("lun-principal");
        if (dia.superluna) celda.classList.add("lun-superluna");

        celda.appendChild(crear("span", "lun-calendario-numero", String(Number(dia.fecha.slice(8)))));
        celda.appendChild(dibujarFase(dia.angulo_fase, 30));

        if (dia.fase_principal) {
            celda.appendChild(crear("span", "lun-calendario-principal", PRINCIPALES[dia.fase_principal] || dia.nombre_fase));
            celda.appendChild(crear("span", "lun-calendario-hora lun-cifra", hora(dia.momento_fase)));
        } else {
            celda.appendChild(crear("span", "lun-calendario-iluminacion lun-cifra", `${entero(dia.iluminacion)} %`));
        }
        if (dia.superluna) {
            celda.appendChild(crear("span", "lun-calendario-super", "Superluna"));
        }

        celda.title = `${dia.nombre_fase}, ${entero(dia.iluminacion)} % iluminada`;
        rejilla.appendChild(celda);
    }

    cuerpo.appendChild(rejilla);
}


export function montarCalendarioLuna(raiz) {
    prepararRaiz(raiz, "luna-calendario");

    const [anioHoy, mesHoy] = hoyMadrid().split("-").map(Number);
    let anio = anioHoy;
    let mes = mesHoy;

    const cabeza = crear("div", "lun-controles");
    const titulo = crear("strong", "lun-calendario-titulo");
    const cuerpo = crear("div");

    const cargar = async () => {
        titulo.textContent = nombreMes(anio, mes);
        aviso(cuerpo, "Cargando…");
        try {
            pintar(cuerpo, await pedir(`/luna/calendario?anio=${anio}&mes=${mes}`));
        } catch (error) {
            aviso(cuerpo, textoError(error), true);
        }
    };

    const mover = (paso) => {
        mes += paso;
        if (mes < 1) { mes = 12; anio -= 1; }
        if (mes > 12) { mes = 1; anio += 1; }
        cargar();
    };

    if (raiz.dataset.selector !== "no") {
        const anterior = crear("button", "lun-boton", "‹");
        anterior.type = "button";
        anterior.setAttribute("aria-label", "Mes anterior");
        anterior.addEventListener("click", () => mover(-1));
        const siguiente = crear("button", "lun-boton", "›");
        siguiente.type = "button";
        siguiente.setAttribute("aria-label", "Mes siguiente");
        siguiente.addEventListener("click", () => mover(1));
        cabeza.append(anterior, titulo, siguiente);
    } else {
        cabeza.appendChild(titulo);
    }

    raiz.append(cabeza, cuerpo);
    pie(raiz, `La Luna de cada día a las 00:00; las fases principales, con su hora de Madrid. ${FUENTE_CALCULO}.`);
    cargar();
}


/* Fin de fichero: js/luna/calendario.js */
