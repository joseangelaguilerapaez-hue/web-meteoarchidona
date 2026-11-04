/*
 * MeteoArchidona · Componente «Corona y eyecciones»
 *
 * Las imágenes más recientes de los coronógrafos LASCO C2 y C3 del
 * satélite SOHO (ESA/NASA), donde se ven las eyecciones de masa coronal.
 *
 *     <div data-componente="sol-coronografos"></div>
 *     <div data-componente="sol-coronografos" data-camaras="C2"></div>
 *
 *     import {montarCoronografos} from "/js/sol/coronografos.js?v=20261104-componentes2";
 *     montarCoronografos(hueco);
 *
 * Opciones: data-camaras, «C2», «C3» o «C2,C3» (las dos por defecto).
 * Las imágenes se renuevan cada 15 minutos.
 */

import {
    IMAGENES_CADA_MS,
    crear, prepararRaiz, cadaRato, conMarca, prepararImagen
} from "./comun.js?v=20261104-componentes2";


const CAMARAS = {
    C2: {
        url: "https://soho.nascom.nasa.gov/data/realtime/c2/1024/latest.jpg",
        nombre: "LASCO C2",
        texto: "Corona cercana, hasta unos 6 radios solares."
    },
    C3: {
        url: "https://soho.nascom.nasa.gov/data/realtime/c3/1024/latest.jpg",
        nombre: "LASCO C3",
        texto: "Campo amplio, hasta unos 30 radios solares."
    }
};


export function montarCoronografos(raiz) {
    const pedidas = String(raiz.dataset.camaras || "C2,C3")
        .split(",")
        .map(c => c.trim().toUpperCase())
        .filter(c => c in CAMARAS);
    const camaras = pedidas.length ? pedidas : ["C2", "C3"];

    prepararRaiz(raiz, "sol-coronografos");

    const pareja = crear("div", camaras.length > 1 ? "sol-pareja" : "");
    const imagenes = camaras.map(codigo => {
        const camara = CAMARAS[codigo];
        const figura = crear("figure", "sol-figura");
        const enlace = crear("a");
        enlace.href = camara.url;
        enlace.target = "_blank";
        enlace.rel = "noopener noreferrer";
        const img = crear("img");
        img.alt = `Coronógrafo ${camara.nombre}, imagen más reciente`;
        img.width = 1024;
        img.height = 1024;
        img.decoding = "async";
        img.loading = "lazy";
        img.dataset.imagen = camara.url;
        prepararImagen(img);
        enlace.appendChild(img);
        const pie = crear("figcaption");
        pie.append(crear("strong", null, camara.nombre), camara.texto);
        figura.append(enlace, pie);
        pareja.appendChild(figura);
        return img;
    });
    raiz.appendChild(pareja);
    raiz.appendChild(crear("p", "sol-pie-componente", "SOHO (ESA/NASA) · se renueva cada 15 minutos"));

    cadaRato(() => {
        for (const img of imagenes) {
            img.src = conMarca(img.dataset.imagen);
        }
    }, IMAGENES_CADA_MS);
}


/* Fin de fichero: js/sol/coronografos.js */
