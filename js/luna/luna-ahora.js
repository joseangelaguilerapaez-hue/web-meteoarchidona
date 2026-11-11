/*
 * MeteoArchidona · Componente «La Luna ahora»
 *
 * La imagen de la Luna de esta hora (Dial-a-Moon, NASA: no es en directo,
 * pero es exacta para cada hora), girada como se ve desde Archidona, con
 * la fase, la iluminación, la edad, la distancia, dónde está ahora, su
 * salida y puesta de hoy y las próximas fases.
 *
 *     <div data-componente="luna-ahora"></div>
 *
 * Opciones:
 *     data-modo="compacto"   solo la imagen, la fase y la iluminación
 *                            (para dashboards pequeños).
 *
 * Si la NASA no responde, se dibuja la fase. Se renueva cada 10 minutos.
 */

import {
    FUENTE_CALCULO, RUMBOS,
    aviso, cadaRato, crear, dato, decimal, diaHora, dibujarFase, entero, gradosAngulo,
    hora, km, pedir, porcentaje, prepararRaiz, pie, textoError, vaciar
} from "./comun.js?v=20261111-luna4";


const CADA_MS = 10 * 60 * 1000;

const NOMBRES_FASE_PRINCIPAL = {
    NUEVA: "Luna nueva",
    CUARTO_CRECIENTE: "Cuarto creciente",
    LLENA: "Luna llena",
    CUARTO_MENGUANTE: "Cuarto menguante"
};


function figuraLuna(datos, girar) {
    const figura = crear("figure", "lun-ahora-figura");
    const marco = crear("div", "lun-ahora-marco");
    const giro = girar ? datos.luna.giro_grados : 0;

    if (datos.imagen) {
        const img = crear("img", "lun-ahora-imagen");
        img.src = datos.imagen.url;
        img.alt = `La Luna: ${datos.luna.nombre_fase.toLowerCase()}, ${entero(datos.luna.iluminacion)} % iluminada`;
        img.width = 730;
        img.height = 730;
        img.decoding = "async";
        img.style.transform = `rotate(${giro}deg)`;
        img.addEventListener("error", () => {
            vaciar(marco);
            marco.appendChild(dibujarFase(datos.luna.angulo_fase, 240));
        });
        marco.appendChild(img);
    } else {
        const dibujo = dibujarFase(datos.luna.angulo_fase, 240);
        dibujo.style.transform = `rotate(${giro}deg)`;
        marco.appendChild(dibujo);
    }

    figura.appendChild(marco);
    return figura;
}


function proximas(datos) {
    const lista = crear("ul", "lun-proximas");

    for (const fase of datos.proximas_fases || []) {
        const elemento = crear("li");
        const angulo = { NUEVA: 0, CUARTO_CRECIENTE: 90, LLENA: 180, CUARTO_MENGUANTE: 270 }[fase.datos.fase] ?? 0;
        elemento.appendChild(dibujarFase(angulo, 26));
        const texto = crear("span");
        texto.appendChild(crear("strong", null, NOMBRES_FASE_PRINCIPAL[fase.datos.fase] || fase.titulo));
        texto.appendChild(crear("span", "lun-cifra", diaHora(fase.momento)));
        elemento.appendChild(texto);
        lista.appendChild(elemento);
    }

    return lista;
}


function pintar(raiz, datos, compacto, girar) {
    vaciar(raiz);
    const luna = datos.luna;

    const cuerpo = crear("div", "lun-ahora-cuerpo");
    cuerpo.appendChild(figuraLuna(datos, girar));

    const info = crear("div", "lun-ahora-info");
    info.appendChild(crear("div", "lun-ahora-fase", luna.nombre_fase));
    info.appendChild(crear("div", "lun-ahora-iluminacion lun-cifra", `${porcentaje(luna.iluminacion)} iluminada`));

    if (!compacto) {
        const lista = crear("dl", "lun-datos");
        dato(lista, "Edad", luna.edad_dias === null ? "—" : `${decimal(luna.edad_dias)} días`);
        dato(lista, "Distancia", km(luna.distancia_km));
        dato(lista, "Tamaño aparente", `${decimal(luna.diametro_segundos / 60)}′`);
        dato(
            lista,
            "Ahora",
            luna.sobre_horizonte
                ? `a ${gradosAngulo(luna.altura)} de altura, hacia el ${RUMBOS[luna.direccion] || luna.direccion}`
                : "bajo el horizonte"
        );
        if (datos.hoy) {
            dato(lista, "Sale hoy", datos.hoy.salida ? `${hora(datos.hoy.salida)} · ${datos.hoy.direccion_salida}` : "no sale");
            dato(lista, "Pasa por el sur", datos.hoy.transito ? `${hora(datos.hoy.transito)} · ${gradosAngulo(datos.hoy.altura_transito)}` : "—");
            dato(lista, "Se pone hoy", datos.hoy.puesta ? `${hora(datos.hoy.puesta)} · ${datos.hoy.direccion_puesta}` : "no se pone");
        }
        info.appendChild(lista);
    }

    cuerpo.appendChild(info);
    raiz.appendChild(cuerpo);

    if (!compacto) {
        raiz.appendChild(crear("h4", "lun-subtitulo", "Próximas fases"));
        raiz.appendChild(proximas(datos));

        const extra = [];
        if (datos.proxima_superluna) {
            extra.push(`Próxima superluna: ${diaHora(datos.proxima_superluna.momento)} (${km(datos.proxima_superluna.valor)}).`);
        }
        if (datos.proximo_perigeo) {
            extra.push(`Perigeo: ${diaHora(datos.proximo_perigeo.momento)} (${km(datos.proximo_perigeo.valor)}).`);
        }
        if (datos.proximo_apogeo) {
            extra.push(`Apogeo: ${diaHora(datos.proximo_apogeo.momento)} (${km(datos.proximo_apogeo.valor)}).`);
        }
        if (extra.length) {
            raiz.appendChild(crear("p", "lun-nota", extra.join(" ")));
        }

        const control = crear("label", "lun-interruptor");
        const casilla = crear("input");
        casilla.type = "checkbox";
        casilla.checked = girar;
        casilla.addEventListener("change", () => pintar(raiz, datos, compacto, casilla.checked));
        control.appendChild(casilla);
        control.appendChild(document.createTextNode(" Como se ve desde Archidona (si no, con el norte arriba)"));
        raiz.appendChild(control);
    }

    const origen = datos.imagen ? "Imagen: NASA SVS, Dial-a-Moon. " : "Dibujo de la fase (la imagen de la NASA no responde). ";
    pie(raiz, `${origen}${FUENTE_CALCULO}. ${hora(datos.momento)}.`);
}


export function montarLunaAhora(raiz) {
    prepararRaiz(raiz, "luna-ahora");
    const compacto = raiz.dataset.modo === "compacto";
    if (compacto) raiz.classList.add("lun-compacto");
    let girar = true;
    aviso(raiz, "Cargando la Luna…");

    cadaRato(raiz, async () => {
        try {
            const datos = await pedir("/luna/fase", CADA_MS - 1000);
            const casilla = raiz.querySelector(".lun-interruptor input");
            if (casilla) girar = casilla.checked;
            pintar(raiz, datos, compacto, girar);
        } catch (error) {
            aviso(raiz, textoError(error), true);
        }
    }, CADA_MS);
}


/* Fin de fichero: js/luna/luna-ahora.js */
