/*
 * MeteoArchidona · Componente «Directos del cielo»
 *
 * Emisiones en directo de otros: la Estación Espacial (NASA y Sen) y las
 * cámaras del cielo de Mauna Kea (Hawái) y ALMA (Chile). Decisión de José
 * (11-11-2026): solo se incrustan (el reproductor de YouTube sin cookies,
 * que no se carga hasta que se pulsa) o se enlazan; nunca se graban ni se
 * hacen timelapses de emisiones de terceros sin permiso.
 *
 * Para las cámaras del cielo se dice qué hora es allí y si es de noche:
 * cuando aquí es de día, en Hawái es de noche.
 *
 *     <div data-componente="luna-directos"></div>
 *
 * Opciones:
 *     data-solo   códigos separados por comas (ISS_NASA, ISS_SEN,
 *                 MAUNAKEA_OESTE, MAUNAKEA_ESTE, ALMA).
 */

import {
    aviso, cadaRato, crear, pedir, prepararRaiz, pie, textoError, vaciar
} from "./comun.js?v=20261111-luna5";


const CADA_MS = 10 * 60 * 1000;


function horaAlli(directo) {
    if (!directo.hora_local) return null;
    // La API da la hora con la zona de allí: se enseña tal cual.
    const [, horaMinuto] = directo.hora_local.match(/T(\d{2}:\d{2})/) || [];
    if (!horaMinuto) return null;
    if (directo.de_noche === true) return `Allí son las ${horaMinuto}: es de noche.`;
    if (directo.de_noche === false) return `Allí son las ${horaMinuto}: es de día (mejor de noche).`;
    return `Allí son las ${horaMinuto}.`;
}


function tarjeta(directo) {
    const caja = crear("article", `lun-directo${directo.de_noche ? " lun-directo-noche" : ""}`);
    const cabeza = crear("div", "lun-directo-cabeza");
    cabeza.appendChild(crear("strong", null, directo.nombre));
    cabeza.appendChild(crear("span", "lun-directo-proveedor", directo.proveedor));
    caja.appendChild(cabeza);
    caja.appendChild(crear("p", null, directo.descripcion));
    const alli = horaAlli(directo);
    if (alli) caja.appendChild(crear("p", "lun-directo-hora", alli));

    const pantalla = crear("div", "lun-directo-pantalla");
    const acciones = crear("div", "lun-lugar-enlaces");
    if (directo.incrustar) {
        const boton = crear("button", "lun-boton", "Ver aquí");
        boton.type = "button";
        boton.addEventListener("click", () => {
            vaciar(pantalla);
            const marco = crear("iframe", "lun-directo-video");
            marco.src = `${directo.incrustar}${directo.incrustar.includes("?") ? "&" : "?"}autoplay=1&mute=1`;
            marco.title = directo.nombre;
            marco.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
            marco.allowFullscreen = true;
            marco.loading = "lazy";
            marco.referrerPolicy = "strict-origin-when-cross-origin";
            pantalla.appendChild(marco);
            boton.remove();
        });
        acciones.appendChild(boton);
    }
    const enlace = crear("a", "lun-enlace", directo.incrustar ? "Abrir en su página" : "Ver en su página");
    enlace.href = directo.enlace;
    enlace.target = "_blank";
    enlace.rel = "noopener noreferrer";
    acciones.appendChild(enlace);

    caja.append(pantalla, acciones);
    return caja;
}


export function montarDirectos(raiz) {
    prepararRaiz(raiz, "luna-directos");
    const solo = (raiz.dataset.solo || "").split(",").map(c => c.trim().toUpperCase()).filter(Boolean);
    aviso(raiz, "Cargando…");

    // Las tarjetas se pintan una vez (para no cortar un vídeo en marcha);
    // después solo se actualiza la hora de allí.
    let pintado = false;
    const horas = new Map();

    cadaRato(raiz, async () => {
        try {
            const datos = await pedir("/luna/directos", CADA_MS - 1000);
            const directos = datos.directos.filter(d => !solo.length || solo.includes(d.codigo));
            if (!pintado) {
                vaciar(raiz);
                const lista = crear("div", "lun-directos");
                for (const d of directos) {
                    const caja = tarjeta(d);
                    horas.set(d.codigo, caja);
                    lista.appendChild(caja);
                }
                raiz.appendChild(lista);
                pie(raiz, `${datos.aviso} Si un vídeo no carga, la emisión ha cambiado de dirección: usa el enlace a su página.`);
                pintado = true;
                return;
            }
            for (const d of directos) {
                const caja = horas.get(d.codigo);
                const linea = caja && caja.querySelector(".lun-directo-hora");
                const texto = horaAlli(d);
                if (linea && texto) linea.textContent = texto;
                if (caja) caja.classList.toggle("lun-directo-noche", Boolean(d.de_noche));
            }
        } catch (error) {
            if (!pintado) aviso(raiz, textoError(error), true);
        }
    }, CADA_MS);
}


/* Fin de fichero: js/luna/directos.js */
