/*
 * MeteoArchidona · Componente «Calendario lunar del campo»
 *
 * Cuarto creciente o menguante de cada día del mes y las labores que,
 * según la tradición del campo andaluz, tocan en cada uno: qué sembrar,
 * cuándo podar, cuándo cortar la madera. Decisión de José del
 * 11-11-2026: se presenta como tradición y no como ciencia, con el aviso
 * siempre a la vista.
 *
 *     <div data-componente="luna-campo"></div>
 *
 * Opciones:
 *     data-selector="no"   sin los botones de mes anterior y siguiente.
 */

import {
    aviso, crear, dibujarFase, entero, hora, hoyMadrid, nombreMes, pedir, prepararRaiz, pie, textoError, vaciar
} from "./comun.js?v=20261111-luna3";


const SEMANA = ["L", "M", "X", "J", "V", "S", "D"];

const NOMBRES_CUARTO = { CRECIENTE: "Creciente", MENGUANTE: "Menguante" };

const CAMBIOS = {
    NUEVA: "Luna nueva",
    CUARTO_CRECIENTE: "Cuarto creciente",
    LLENA: "Luna llena",
    CUARTO_MENGUANTE: "Cuarto menguante"
};


/* Ángulo de fase aproximado a partir de la iluminación y el cuarto, para
 * el dibujo (0 nueva, 180 llena). */
function angulo(dia) {
    const a = Math.acos(Math.max(-1, Math.min(1, 1 - 2 * dia.iluminacion / 100))) * 180 / Math.PI;
    return dia.cuarto === "CRECIENTE" ? a : 360 - a;
}


function labores(datos, cuartoHoy) {
    const caja = crear("div", "lun-campo-labores");
    for (const cuarto of ["CRECIENTE", "MENGUANTE"]) {
        const bloque = crear("section", `lun-campo-cuarto lun-campo-${cuarto.toLowerCase()}${cuarto === cuartoHoy ? " lun-campo-actual" : ""}`);
        const titulo = crear("strong", null, `En ${NOMBRES_CUARTO[cuarto].toLowerCase()}`);
        bloque.appendChild(titulo);
        if (cuarto === cuartoHoy) bloque.appendChild(crear("span", "lun-lluvia-marca", "Ahora"));
        const lista = crear("ul", "lun-lista");
        (datos.labores[cuarto] || []).forEach(l => lista.appendChild(crear("li", null, l)));
        bloque.appendChild(lista);
        caja.appendChild(bloque);
    }
    return caja;
}


function rejilla(datos, hoy) {
    const caja = crear("div", "lun-calendario lun-campo-rejilla");
    for (const dia of SEMANA) caja.appendChild(crear("div", "lun-calendario-semana", dia));
    const primero = new Date(Date.UTC(datos.anio, datos.mes - 1, 1));
    for (let i = 0; i < (primero.getUTCDay() + 6) % 7; i++) caja.appendChild(crear("div", "lun-calendario-vacio"));

    for (const dia of datos.dias) {
        const celda = crear("div", `lun-calendario-dia lun-campo-dia lun-campo-${dia.cuarto.toLowerCase()}`);
        if (dia.fecha === hoy) celda.classList.add("lun-hoy");
        if (dia.cambio) celda.classList.add("lun-principal");
        celda.appendChild(crear("span", "lun-calendario-numero", String(Number(dia.fecha.slice(8)))));
        celda.appendChild(dibujarFase(angulo(dia), 26));
        celda.appendChild(crear("span", "lun-calendario-principal", dia.cambio ? (CAMBIOS[dia.cambio] || dia.nombre_fase) : NOMBRES_CUARTO[dia.cuarto]));
        if (dia.cambio && dia.momento_cambio) celda.appendChild(crear("span", "lun-calendario-hora lun-cifra", hora(dia.momento_cambio)));
        celda.title = `${NOMBRES_CUARTO[dia.cuarto]} · ${dia.nombre_fase}, ${entero(dia.iluminacion)} % iluminada`;
        caja.appendChild(celda);
    }
    return caja;
}


function pintar(cuerpo, datos) {
    vaciar(cuerpo);
    const hoy = hoyMadrid();
    const deHoy = datos.dias.find(d => d.fecha === hoy);

    cuerpo.appendChild(crear("p", "lun-campo-aviso", datos.aviso));
    if (deHoy) {
        cuerpo.appendChild(crear("p", "lun-campo-hoy", `Hoy la Luna está en ${NOMBRES_CUARTO[deHoy.cuarto].toLowerCase()}.`));
    }
    cuerpo.appendChild(rejilla(datos, hoy));
    cuerpo.appendChild(labores(datos, deHoy ? deHoy.cuarto : null));

    if (datos.refranes.length) {
        const refranes = crear("ul", "lun-campo-refranes");
        datos.refranes.forEach(r => refranes.appendChild(crear("li", null, `«${r}»`)));
        cuerpo.appendChild(refranes);
    }
}


export function montarCampo(raiz) {
    prepararRaiz(raiz, "luna-campo");

    const [anioHoy, mesHoy] = hoyMadrid().split("-").map(Number);
    let anio = anioHoy;
    let mes = mesHoy;

    const cabeza = crear("div", "lun-controles");
    const titulo = crear("strong", "lun-calendario-titulo");
    const cuerpo = crear("div", "lun-campo");

    const cargar = async () => {
        titulo.textContent = nombreMes(anio, mes);
        aviso(cuerpo, "Cargando…");
        try {
            pintar(cuerpo, await pedir(`/luna/campo?anio=${anio}&mes=${mes}`));
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
    pie(raiz, "Creciente, de luna nueva a llena; menguante, de llena a nueva. Las labores son las que recoge la tradición del campo andaluz, no recomendaciones agronómicas.");
    cargar();
}


/* Fin de fichero: js/luna/campo.js */
