/*
 * MeteoArchidona · Componente «Tiempo espacial ahora»
 *
 * Las escalas de la NOAA (R apagones de radio, S tormenta de radiación,
 * G tormenta geomagnética) en semáforo y el índice Kp. Es el resumen:
 * de un vistazo dice si hay algo o está todo tranquilo.
 *
 *     <div data-componente="sol-tiempo-espacial"></div>
 *     <div data-componente="sol-tiempo-espacial" data-modo="ampliado"></div>
 *
 *     import {montarTiempoEspacial} from "/js/sol/tiempo-espacial.js?v=…";
 *     montarTiempoEspacial(hueco);
 *
 * Modos:
 *   - compacto (por defecto): las tres escalas y el Kp, pensado para un
 *     hueco pequeño de un dashboard.
 *   - ampliado: además viento solar, campo Bz, rayos X y flujo F10.7.
 *     Es el que usa la página Sol.
 *
 * Se renueva solo cada 5 minutos. Puede haber varios en una página.
 */

import {
    FUENTES, DATOS_CADA_MS, NOMBRES_ESCALA,
    crear, vaciar, aviso, prepararRaiz, ponerPie,
    pedir, comoObjetos, numero, fechaUTC, hora, formatoDia,
    textoKp, claseKp, nivelEscala, nivelFulguracion, cadaRato
} from "./comun.js?v=20261104-componentes2";


/* Letra, nombre y nombre corto (el del modo compacto). */
const ESCALAS = [
    ["R", "Apagones de radio", "Radio"],
    ["S", "Tormenta de radiación", "Radiación"],
    ["G", "Tormenta geomagnética", "Geomagnética"]
];


export function montarTiempoEspacial(raiz) {
    const ampliado = raiz.dataset.modo === "ampliado";

    prepararRaiz(raiz, "sol-tiempo-espacial");
    raiz.classList.toggle("ampliado", ampliado);

    const escalas = crear("div", "sol-escalas");
    const indices = crear("div", "sol-indices");
    aviso(escalas, "Cargando escalas…");
    aviso(indices, "Cargando índices…");
    raiz.append(escalas, indices);

    cadaRato(async () => {
        const [okEscalas, okIndices] = await Promise.all([
            pintarEscalas(escalas, ampliado),
            pintarIndices(indices, ampliado)
        ]);
        ponerPie(raiz, okEscalas || okIndices);
    }, DATOS_CADA_MS);
}


async function pintarEscalas(caja, ampliado) {
    let datos;
    try {
        datos = await pedir(FUENTES.escalas);
    } catch (error) {
        aviso(caja, "Las escalas de la NOAA no están disponibles ahora.");
        return false;
    }

    const ahora = datos["0"] || {};
    vaciar(caja);
    for (const [letra, nombre, corto] of ESCALAS) {
        const nivel = nivelEscala((ahora[letra] || {}).Scale);
        const ficha = crear("div", `sol-escala nivel-${nivel}`);
        ficha.title = `${nombre}: ${NOMBRES_ESCALA[nivel].toLowerCase()}`;
        ficha.appendChild(crear("span", "sol-escala-letra", `${letra}${nivel}`));
        const textos = crear("span", "sol-escala-textos");
        textos.appendChild(crear("span", "sol-escala-nombre", ampliado ? nombre : corto));
        textos.appendChild(crear("span", "sol-escala-estado", NOMBRES_ESCALA[nivel]));
        ficha.appendChild(textos);
        caja.appendChild(ficha);
    }
    return true;
}


async function pintarIndices(caja, ampliado) {
    const pedidos = [pedir(FUENTES.kp)];
    if (ampliado) {
        pedidos.push(
            pedir(FUENTES.viento),
            pedir(FUENTES.campo),
            pedir(FUENTES.rayosX),
            pedir(FUENTES.flujo)
        );
    }

    const resultados = await Promise.allSettled(pedidos);
    const valor = i => resultados[i] && resultados[i].status === "fulfilled" ? resultados[i].value : null;

    vaciar(caja);

    /* Kp */
    const kps = comoObjetos(valor(0));
    const ultimoKp = kps[kps.length - 1];
    const kp = ultimoKp ? numero(ultimoKp.Kp ?? ultimoKp.kp) : null;
    caja.appendChild(ficha({
        nombre: "Índice Kp",
        valor: kp === null ? "—" : String(Math.round(kp * 100) / 100).replace(".", ","),
        estado: textoKp(kp),
        clase: claseKp(kp),
        cuando: ultimoKp ? `Tramo de las ${hora(fechaUTC(ultimoKp.time_tag))}` : ""
    }));

    if (!ampliado) {
        return resultados.some(r => r.status === "fulfilled");
    }

    /* Viento solar */
    const viento = comoObjetos(valor(1))[0];
    const velocidad = viento ? numero(viento.proton_speed) : null;
    let estadoViento = "Sin dato";
    let claseViento = "nivel-0";
    if (velocidad !== null) {
        if (velocidad >= 700) { estadoViento = "Muy rápido"; claseViento = "nivel-1"; }
        else if (velocidad >= 500) { estadoViento = "Rápido"; claseViento = "nivel-activo"; }
        else if (velocidad >= 350) { estadoViento = "Normal"; }
        else { estadoViento = "Lento"; }
    }
    caja.appendChild(ficha({
        nombre: "Viento solar",
        valor: velocidad === null ? "—" : String(Math.round(velocidad)),
        unidad: "km/s",
        estado: estadoViento,
        clase: claseViento,
        cuando: viento ? `A las ${hora(fechaUTC(viento.time_tag))}` : ""
    }));

    /* Campo magnético interplanetario */
    const campo = comoObjetos(valor(2))[0];
    const bz = campo ? numero(campo.bz_gsm) : null;
    const bt = campo ? numero(campo.bt) : null;
    let estadoBz = "Sin dato";
    let claseBz = "nivel-0";
    if (bz !== null) {
        if (bz <= -10) { estadoBz = "Muy al sur"; claseBz = "nivel-1"; }
        else if (bz <= -5) { estadoBz = "Hacia el sur"; claseBz = "nivel-activo"; }
        else if (bz < 0) { estadoBz = "Algo al sur"; }
        else { estadoBz = "Hacia el norte"; }
    }
    caja.appendChild(ficha({
        nombre: "Campo Bz",
        valor: bz === null ? "—" : String(bz).replace(".", ","),
        unidad: "nT",
        estado: bt === null ? estadoBz : `${estadoBz} · Bt ${String(bt).replace(".", ",")} nT`,
        clase: claseBz,
        cuando: campo ? `A las ${hora(fechaUTC(campo.time_tag))}` : ""
    }));

    /* Rayos X */
    const rayos = valor(3);
    const ultima = Array.isArray(rayos) ? rayos[rayos.length - 1] : rayos;
    const claseActual = ultima ? (ultima.current_class || null) : null;
    const cuandoRayos = ultima ? fechaUTC(ultima.current_time || ultima.time_tag) : null;
    const nivelRayos = nivelFulguracion(claseActual);
    caja.appendChild(ficha({
        nombre: "Rayos X",
        valor: claseActual || "—",
        estado: claseActual
            ? { x: "Fulguración X", m: "Fulguración M", c: "Actividad moderada", b: "Tranquilo" }[nivelRayos]
            : "Sin dato",
        clase: { x: "nivel-2", m: "nivel-1", c: "nivel-activo", b: "nivel-0" }[nivelRayos],
        cuando: cuandoRayos ? `A las ${hora(cuandoRayos)}` : ""
    }));

    /* Flujo solar F10.7 */
    const flujos = comoObjetos(valor(4));
    const ultimoFlujo = flujos[flujos.length - 1];
    const f107 = ultimoFlujo ? numero(ultimoFlujo.flux ?? ultimoFlujo.f10_7) : null;
    let estadoFlujo = "Sin dato";
    if (f107 !== null) {
        if (f107 >= 200) estadoFlujo = "Actividad muy alta";
        else if (f107 >= 150) estadoFlujo = "Actividad alta";
        else if (f107 >= 100) estadoFlujo = "Actividad moderada";
        else estadoFlujo = "Actividad baja";
    }
    const fechaFlujo = ultimoFlujo ? fechaUTC(ultimoFlujo.time_tag) : null;
    caja.appendChild(ficha({
        nombre: "Flujo F10.7",
        valor: f107 === null ? "—" : String(Math.round(f107)),
        unidad: "sfu",
        estado: estadoFlujo,
        clase: "nivel-0",
        cuando: fechaFlujo ? formatoDia.format(fechaFlujo) : ""
    }));

    return resultados.some(r => r.status === "fulfilled");
}


function ficha({ nombre, valor, unidad, estado, clase, cuando }) {
    const nodo = crear("div", `sol-indice ${clase || ""}`);
    nodo.appendChild(crear("span", "sol-indice-nombre", nombre));
    const linea = crear("span", "sol-indice-valor", valor);
    if (unidad) linea.appendChild(crear("small", null, ` ${unidad}`));
    nodo.appendChild(linea);
    nodo.appendChild(crear("span", "sol-indice-estado", estado));
    if (cuando) nodo.appendChild(crear("span", "sol-indice-cuando", cuando));
    return nodo;
}

/* Fin de fichero: js/sol/tiempo-espacial.js */
