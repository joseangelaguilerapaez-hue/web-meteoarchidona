/*
 * MeteoArchidona · Componente «Óvalo de auroras»
 *
 * Previsión a corto plazo de la NOAA (modelo OVATION) de dónde se pueden
 * ver auroras en el hemisferio norte.
 *
 *     <div data-componente="sol-auroras"></div>
 *
 * Opción data-archidona="si" (sección Luna, decisión de José del
 * 11-11-2026): una línea debajo con la posibilidad de verlas desde
 * Archidona según el índice Kp de la NOAA, el observado y el máximo
 * previsto para las próximas 24 horas. A nuestra latitud solo se ven con
 * tormentas muy fuertes (como en mayo de 2024, con Kp 9):
 *     Kp hasta 6  → nula
 *     Kp 7        → muy baja (solo en fotos de larga exposición, mirando al norte)
 *     Kp 8        → posible en fotos; a simple vista, un resplandor rojizo con suerte
 *     Kp 9        → alta: se pueden ver a simple vista hacia el norte, lejos de las luces
 *
 *     import {montarAuroras} from "/js/sol/auroras.js?v=20261111-auroras1";
 *     montarAuroras(hueco);
 *
 * La imagen se renueva cada 15 minutos.
 */

import {
    DATOS_CADA_MS, FUENTES, IMAGENES_CADA_MS,
    crear, prepararRaiz, cadaRato, conMarca, prepararImagen, pedir, comoObjetos, numero, fechaUTC
} from "./comun.js?v=20261104-componentes2";


const URL = "https://services.swpc.noaa.gov/images/animations/ovation/north/latest.jpg";


export function montarAuroras(raiz) {
    prepararRaiz(raiz, "sol-auroras");

    const figura = crear("figure", "sol-figura sol-figura-ancha");
    const enlace = crear("a");
    enlace.href = URL;
    enlace.target = "_blank";
    enlace.rel = "noopener noreferrer";
    const img = crear("img");
    img.alt = "Previsión del óvalo de auroras del hemisferio norte";
    img.width = 800;
    img.height = 800;
    img.decoding = "async";
    img.loading = "lazy";
    img.dataset.imagen = URL;
    prepararImagen(img);
    enlace.appendChild(img);
    figura.appendChild(enlace);
    raiz.append(figura, crear("p", "sol-pie-componente", "NOAA · se renueva cada 15 minutos"));

    cadaRato(() => {
        img.src = conMarca(URL);
    }, IMAGENES_CADA_MS);

    if (raiz.dataset.archidona === "si") lineaArchidona(raiz);
}



/* Posibilidad de ver auroras desde Archidona según el Kp (José, 11-11-2026). */
export function auroraArchidona(kp) {
    if (kp === null || kp === undefined) return { nivel: "sin-dato", texto: "sin dato" };
    if (kp >= 9) return { nivel: "alta", texto: "alta: se pueden ver a simple vista hacia el norte, lejos de las luces" };
    if (kp >= 8) return { nivel: "posible", texto: "posible en fotos; a simple vista, con suerte, un resplandor rojizo al norte" };
    if (kp >= 7) return { nivel: "muy-baja", texto: "muy baja: solo en fotos de larga exposición, mirando al norte" };
    return { nivel: "nula", texto: "nula" };
}


function lineaArchidona(raiz) {
    const linea = crear("p", "sol-pie-componente sol-aurora-archidona", "Desde Archidona: calculando…");
    raiz.appendChild(linea);

    cadaRato(async () => {
        let datos;
        try {
            datos = comoObjetos(await pedir(FUENTES.kpPrevision));
        } catch (error) {
            linea.textContent = "Desde Archidona: sin dato del índice Kp ahora.";
            return;
        }
        const ahora = Date.now();
        const tramos = datos
            .map(d => ({ fecha: fechaUTC(d.time_tag), kp: numero(d.kp ?? d.Kp), prevision: /predicted/i.test(String(d.observed || "")) }))
            .filter(t => t.fecha && t.kp !== null);
        const observados = tramos.filter(t => !t.prevision && t.fecha.getTime() <= ahora);
        const ultimo = observados.length ? observados[observados.length - 1].kp : null;
        const proximas = tramos.filter(t => t.fecha.getTime() > ahora - 3 * 3600000 && t.fecha.getTime() <= ahora + 24 * 3600000);
        const maximo = proximas.length ? Math.max(...proximas.map(t => t.kp)) : null;

        const actual = auroraArchidona(ultimo);
        const prevista = auroraArchidona(maximo);
        linea.className = `sol-pie-componente sol-aurora-archidona sol-aurora-${prevista.nivel === "nula" ? actual.nivel : prevista.nivel}`;
        const kp = (valor) => (valor === null ? "—" : valor.toFixed(1).replace(".", ","));
        linea.textContent = `Desde Archidona, ahora (Kp ${kp(ultimo)}): ${actual.texto}.`
            + (maximo !== null && prevista.nivel !== actual.nivel ? ` En las próximas 24 horas (Kp hasta ${kp(maximo)}): ${prevista.texto}.` : "");
    }, DATOS_CADA_MS);
}


/* Fin de fichero: js/sol/auroras.js */
