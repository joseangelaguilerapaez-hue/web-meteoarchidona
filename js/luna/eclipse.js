/*
 * MeteoArchidona · Componente «Próximo eclipse»
 *
 * Cuenta atrás hasta el máximo del próximo eclipse que se ve desde
 * Archidona, con las horas de El Silo y, en los de Sol, cuánto se tapa
 * el disco (dibujado). Mientras dura sigue en pantalla.
 *
 *     <div data-componente="luna-eclipse"></div>
 *
 * Opciones:
 *     data-tipo    solar, lunar o todos (por defecto).
 */

import {
    FUENTE_CALCULO,
    aviso, cadaRato, crear, crearSvg, dato, decimal, diaHora, hora, pedir, prepararRaiz, pie, textoError, vaciar
} from "./comun.js?v=20261111-luna5";


const CADA_MS = 60 * 60 * 1000;


function cuentaAtras(segundos) {
    const d = Math.floor(segundos / 86400);
    const h = Math.floor((segundos % 86400) / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    const s = Math.floor(segundos % 60);
    const dos = n => String(n).padStart(2, "0");
    return [
        [d, d === 1 ? "día" : "días"],
        [dos(h), "horas"],
        [dos(m), "min"],
        [dos(s), "s"]
    ];
}


/* El Sol tapado por la Luna en el máximo. Magnitud = parte del diámetro
 * del Sol cubierta: con radio del Sol 1 y de la Luna algo mayor, la
 * separación de los centros es 1 + r − 2·magnitud. */
function dibujoSolar(datos) {
    const svg = crearSvg("svg", { viewBox: "-60 -60 120 120", class: "lun-eclipse-dibujo", role: "img" });
    svg.setAttribute("aria-label", `${decimal(datos.oscurecimiento)} % del Sol tapado`);
    const radioSol = 40;
    const radioLuna = datos.clase === "ANULAR" ? 37 : 41;
    const magnitud = Math.max(0, Math.min(1.1, datos.magnitud || 0));
    const separacion = Math.max(0, radioSol + radioLuna - 2 * magnitud * radioSol);
    svg.appendChild(crearSvg("circle", { r: radioSol + 6, class: "lun-eclipse-corona" }));
    svg.appendChild(crearSvg("circle", { r: radioSol, class: "lun-eclipse-sol" }));
    svg.appendChild(crearSvg("circle", { cx: (separacion * 0.7).toFixed(1), cy: (-separacion * 0.7).toFixed(1), r: radioLuna, class: "lun-eclipse-luna" }));
    return svg;
}


function dibujoLunar(clase) {
    const svg = crearSvg("svg", { viewBox: "-60 -60 120 120", class: "lun-eclipse-dibujo", role: "img" });
    svg.setAttribute("aria-label", "La Luna en la sombra de la Tierra");
    svg.appendChild(crearSvg("circle", { r: 52, class: "lun-eclipse-penumbra" }));
    svg.appendChild(crearSvg("circle", { r: 40, class: `lun-eclipse-luna-roja lun-eclipse-${clase.toLowerCase()}` }));
    return svg;
}


function pintar(raiz, respuesta) {
    vaciar(raiz);
    const eclipse = respuesta.eclipse;
    if (!eclipse) {
        raiz.appendChild(crear("p", "lun-aviso", "No hay ningún eclipse visible desde Archidona en los dos próximos años calculados."));
        pie(raiz, FUENTE_CALCULO + ".");
        return null;
    }

    const solar = eclipse.tipo === "ECLIPSE_SOLAR";
    const datos = eclipse.datos || {};

    const cuerpo = crear("div", "lun-eclipse");
    cuerpo.appendChild(solar ? dibujoSolar(datos) : dibujoLunar(datos.clase || "PARCIAL"));

    const texto = crear("div", "lun-eclipse-texto");
    texto.appendChild(crear("strong", "lun-eclipse-titulo", eclipse.titulo));
    texto.appendChild(crear("span", "lun-eclipse-fecha lun-cifra", diaHora(eclipse.momento)));

    const reloj = crear("div", "lun-cuenta");
    reloj.setAttribute("role", "timer");
    texto.appendChild(reloj);

    const lista = crear("dl", "lun-datos");
    if (eclipse.inicio) dato(lista, "Empieza", hora(eclipse.inicio));
    dato(lista, "Máximo", hora(eclipse.momento));
    if (eclipse.fin) dato(lista, "Termina", hora(eclipse.fin));
    if (solar && datos.oscurecimiento !== undefined) dato(lista, "Sol tapado", `${decimal(datos.oscurecimiento)} %`);
    if (datos.magnitud !== undefined) dato(lista, "Magnitud", decimal(datos.magnitud));
    if (solar && datos.altura_sol_maximo !== undefined) dato(lista, "Altura del Sol", `${decimal(datos.altura_sol_maximo)}°`);
    if (datos.inicio_total) dato(lista, "Totalidad", `${hora(datos.inicio_total)} – ${hora(datos.fin_total)}`);
    if (datos.inicio_central) dato(lista, solar && datos.clase === "ANULAR" ? "Anillo" : "Totalidad", `${hora(datos.inicio_central)} – ${hora(datos.fin_central)}`);
    texto.appendChild(lista);

    if (eclipse.descripcion) texto.appendChild(crear("p", null, eclipse.descripcion));
    if (solar) {
        texto.appendChild(crear("p", "lun-eclipse-seguridad", "Nunca mires al Sol sin gafas homologadas de eclipse (ISO 12312-2): ni con gafas de sol, ni con radiografías, ni a través de prismáticos o del móvil."));
    }
    cuerpo.appendChild(texto);
    raiz.appendChild(cuerpo);

    if (respuesta.siguientes.length) {
        raiz.appendChild(crear("p", "lun-subtitulo", "Después"));
        const despues = crear("ul", "lun-eclipse-siguientes");
        for (const e of respuesta.siguientes) {
            const li = crear("li");
            li.appendChild(crear("strong", null, e.titulo));
            li.appendChild(crear("span", "lun-cifra", diaHora(e.momento)));
            despues.appendChild(li);
        }
        raiz.appendChild(despues);
    }

    pie(raiz, `Horas de Madrid vistas desde El Silo. ${FUENTE_CALCULO}.`);
    return { reloj, maximo: Date.parse(eclipse.momento), fin: Date.parse(eclipse.fin || eclipse.momento) };
}


function moverReloj(estado) {
    const { reloj, maximo, fin } = estado;
    const ahora = Date.now();
    vaciar(reloj);
    if (ahora >= maximo) {
        reloj.appendChild(crear("span", "lun-cuenta-ahora", ahora <= fin ? "Está ocurriendo ahora" : "Acaba de terminar"));
        return;
    }
    for (const [cifra, unidad] of cuentaAtras((maximo - ahora) / 1000)) {
        const parte = crear("span", "lun-cuenta-parte");
        parte.appendChild(crear("strong", "lun-cifra", String(cifra)));
        parte.appendChild(crear("span", null, unidad));
        reloj.appendChild(parte);
    }
}


export function montarEclipse(raiz) {
    prepararRaiz(raiz, "luna-eclipse");
    const tipo = ["solar", "lunar"].includes(raiz.dataset.tipo) ? raiz.dataset.tipo : "todos";
    aviso(raiz, "Cargando…");

    let estado = null;
    const segundero = setInterval(() => {
        if (!raiz.isConnected) {
            clearInterval(segundero);
            return;
        }
        if (estado && !document.hidden) moverReloj(estado);
    }, 1000);

    cadaRato(raiz, async () => {
        try {
            estado = pintar(raiz, await pedir(`/luna/eclipse?tipo=${tipo}`, CADA_MS - 1000));
            if (estado) moverReloj(estado);
        } catch (error) {
            estado = null;
            aviso(raiz, textoError(error), true);
        }
    }, CADA_MS);
}


/* Fin de fichero: js/luna/eclipse.js */
