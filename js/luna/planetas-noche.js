/*
 * MeteoArchidona · Componente «Planetas esta noche»
 *
 * Qué planetas se ven esta noche (de madrugada, la que está en curso) desde Archidona (a más de 5° de altura
 * con el cielo ya oscuro, desde el fin del crepúsculo civil hasta el
 * principio del de mañana): desde qué hora y hasta cuándo, por dónde
 * aparecen, cuándo están más altos y con qué brillo.
 *
 *     <div data-componente="luna-planetas-noche"></div>
 *
 * Opciones:
 *     data-todos="no"   no lista los que no se ven.
 */

import {
    FUENTE_CALCULO, RUMBOS,
    aviso, cadaRato, crear, dato, decimal, gradosAngulo, hora, nocheActual,
    pedir, prepararRaiz, pie, textoError, vaciar
} from "./comun.js?v=20261111-luna4";


const CADA_MS = 60 * 60 * 1000;

/* Lo que ve el ojo: con magnitud 6 o menos, a simple vista con buen cielo. */
function brillo(magnitud) {
    if (magnitud === null || magnitud === undefined) return "—";
    let texto = "solo con prismáticos o telescopio";
    if (magnitud <= -2) texto = "brillantísimo";
    else if (magnitud <= 0) texto = "muy brillante";
    else if (magnitud <= 2) texto = "brillante";
    else if (magnitud <= 6) texto = "a simple vista con cielo oscuro";
    return `${decimal(magnitud)} (${texto})`;
}


function tarjeta(planeta) {
    const caja = crear("article", `lun-planeta lun-planeta-${planeta.cuerpo.toLowerCase()}`);
    const cabeza = crear("div", "lun-planeta-cabeza");
    cabeza.appendChild(crear("span", "lun-planeta-punto"));
    cabeza.appendChild(crear("strong", null, planeta.nombre));
    cabeza.appendChild(crear("span", "lun-planeta-cuando", planeta.nombre_cuando));
    caja.appendChild(cabeza);

    const lista = crear("dl", "lun-datos");
    dato(lista, "Se ve", `de ${hora(planeta.desde)} a ${hora(planeta.hasta)}`);
    dato(lista, "Aparece por el", RUMBOS[planeta.direccion_desde] || planeta.direccion_desde || "—");
    dato(
        lista,
        "Más alto",
        `${hora(planeta.momento_maximo)}, a ${gradosAngulo(planeta.altura_maxima)} hacia el ${RUMBOS[planeta.direccion_maximo] || planeta.direccion_maximo}`
    );
    dato(lista, "Brillo", brillo(planeta.magnitud));
    dato(lista, "Constelación", planeta.constelacion_nombre || "—");
    caja.appendChild(lista);
    return caja;
}


function pintar(raiz, datos, todos) {
    vaciar(raiz);
    raiz.appendChild(crear("p", "lun-nota", `Cielo oscuro de ${hora(datos.inicio)} a ${hora(datos.fin)}.`));

    const visibles = datos.planetas.filter(p => p.visible);
    const ocultos = datos.planetas.filter(p => !p.visible);

    if (visibles.length) {
        const rejilla = crear("div", "lun-planetas");
        visibles.forEach(p => rejilla.appendChild(tarjeta(p)));
        raiz.appendChild(rejilla);
    } else {
        raiz.appendChild(crear("p", "lun-aviso", "Esta noche no se ve ningún planeta por encima de 5°."));
    }

    if (todos && ocultos.length) {
        raiz.appendChild(crear(
            "p", "lun-nota",
            `No se ven esta noche: ${ocultos.map(p => p.nombre).join(", ")} (de día o demasiado cerca del Sol).`
        ));
    }

    pie(raiz, `Urano y Neptuno solo se ven con prismáticos o telescopio. Hora de Madrid. ${FUENTE_CALCULO}.`);
}


export function montarPlanetasNoche(raiz) {
    prepararRaiz(raiz, "luna-planetas-noche");
    const todos = raiz.dataset.todos !== "no";
    aviso(raiz, "Cargando…");

    cadaRato(raiz, async () => {
        try {
            pintar(raiz, await pedir(`/luna/planetas?fecha=${nocheActual()}`), todos);
        } catch (error) {
            aviso(raiz, textoError(error), true);
        }
    }, CADA_MS);
}


/* Fin de fichero: js/luna/planetas-noche.js */
