/*
 * MeteoArchidona · Componente «El Sol en directo»
 *
 * La imagen más reciente del Sol del Observatorio de Dinámica Solar
 * (SDO) de la NASA, con botones para cambiar de filtro y una
 * explicación de lo que enseña cada uno. Tocando la imagen se abre en
 * grande (2048 px).
 *
 *     <div data-componente="sol-directo"></div>
 *     <div data-componente="sol-directo" data-filtro="HMIIC"></div>
 *
 *     import {montarSolDirecto} from "/js/sol/sol-directo.js?v=…";
 *     montarSolDirecto(hueco);
 *
 * data-filtro: el filtro con el que abre (0193 corona, por defecto;
 * 0171, 0304, 0131, HMIIC manchas, HMIB magnetismo).
 *
 * La imagen se renueva cada 15 minutos, que es lo que pide la NASA.
 * Puede haber varios en una página, cada uno con su filtro.
 */

import {
    IMAGENES_CADA_MS,
    crear, prepararRaiz, conMarca, prepararImagen, cadaRato
} from "./comun.js?v=20261104-componentes1";


const SDO = "https://sdo.gsfc.nasa.gov/assets/img/latest";

const FILTROS = [
    {
        id: "0193",
        nombre: "Corona",
        texto: "AIA 193 Å. La corona a un millón y medio de grados: los huecos oscuros son agujeros coronales, de donde sale el viento solar rápido."
    },
    {
        id: "0171",
        nombre: "Arcos",
        texto: "AIA 171 Å. Los arcos de plasma que dibuja el campo magnético sobre las regiones activas."
    },
    {
        id: "0304",
        nombre: "Protuberancias",
        texto: "AIA 304 Å. La cromosfera, a unos 50 000 grados: se ven bien las protuberancias en el borde del disco y los filamentos."
    },
    {
        id: "0131",
        nombre: "Fulguraciones",
        texto: "AIA 131 Å. El plasma más caliente, a más de diez millones de grados: donde brilla con fuerza hay o ha habido una fulguración."
    },
    {
        id: "HMIIC",
        nombre: "Manchas",
        texto: "HMI, luz visible. El Sol como se vería con un filtro solar: las manchas solares son los puntos oscuros."
    },
    {
        id: "HMIB",
        nombre: "Magnetismo",
        texto: "HMI, magnetograma. Polaridad del campo magnético: blanco y negro son polos opuestos. Las regiones con los dos muy juntos son las que más fulguraciones dan."
    }
];


export function montarSolDirecto(raiz) {
    prepararRaiz(raiz, "sol-directo");

    const selector = crear("div", "sol-selector");
    selector.setAttribute("role", "tablist");
    selector.setAttribute("aria-label", "Filtro de la imagen del Sol");

    const figura = crear("figure", "sol-visor");
    const enlace = crear("a", "sol-visor-enlace");
    enlace.target = "_blank";
    enlace.rel = "noopener noreferrer";
    const imagen = crear("img", "sol-visor-imagen");
    imagen.width = 1024;
    imagen.height = 1024;
    imagen.decoding = "async";
    imagen.loading = "lazy";
    prepararImagen(imagen);
    enlace.appendChild(imagen);
    const texto = crear("figcaption", "sol-visor-texto");
    figura.append(enlace, texto);

    const pie = crear("p", "sol-pie-componente",
        "NASA/SDO · se renueva cada 15 minutos; toca la imagen para verla en grande.");

    raiz.append(selector, figura, pie);

    const estado = {
        filtro: (FILTROS.find(f => f.id === raiz.dataset.filtro) || FILTROS[0]).id
    };

    function ponerFiltro(id) {
        const filtro = FILTROS.find(f => f.id === id) || FILTROS[0];
        estado.filtro = filtro.id;

        for (const boton of selector.querySelectorAll(".sol-selector-boton")) {
            const activo = boton.dataset.filtro === filtro.id;
            boton.classList.toggle("activo", activo);
            boton.setAttribute("aria-selected", activo ? "true" : "false");
        }

        imagen.src = conMarca(`${SDO}/latest_1024_${filtro.id}.jpg`);
        imagen.alt = `El Sol ahora: ${filtro.nombre.toLowerCase()} (${filtro.texto.split(".")[0]})`;
        enlace.href = `${SDO}/latest_2048_${filtro.id}.jpg`;
        texto.textContent = filtro.texto;
    }

    for (const filtro of FILTROS) {
        const boton = crear("button", "sol-selector-boton", filtro.nombre);
        boton.type = "button";
        boton.setAttribute("role", "tab");
        boton.dataset.filtro = filtro.id;
        boton.addEventListener("click", () => ponerFiltro(filtro.id));
        selector.appendChild(boton);
    }

    cadaRato(() => ponerFiltro(estado.filtro), IMAGENES_CADA_MS);
}

/* Fin de fichero: js/sol/sol-directo.js */
