/*
 * MeteoArchidona · Componente «Óvalo de auroras»
 *
 * Previsión a corto plazo de la NOAA (modelo OVATION) de dónde se pueden
 * ver auroras en el hemisferio norte.
 *
 *     <div data-componente="sol-auroras"></div>
 *
 *     import {montarAuroras} from "/js/sol/auroras.js?v=20261104-componentes2";
 *     montarAuroras(hueco);
 *
 * La imagen se renueva cada 15 minutos.
 */

import {
    IMAGENES_CADA_MS,
    crear, prepararRaiz, cadaRato, conMarca, prepararImagen
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
}


/* Fin de fichero: js/sol/auroras.js */
