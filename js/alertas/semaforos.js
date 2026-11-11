/*
 * MeteoArchidona · Componente «Semáforos de alertas»
 *
 * Brazo de semáforo curvado con seis semáforos de cinco luces, uno por
 * fenómeno (Lluvia, Tormenta, Viento, Calor, Frío y Nieve), con su
 * cartelito encima. Decisiones de José del 11-11-2026
 * (docs/alertas-meteorologicas.md de la API):
 *
 * - Luces de arriba abajo: rojo, fucsia, naranja, amarillo y verde. El
 *   fucsia es propio de MeteoArchidona, entre el naranja y el rojo.
 * - Dibujado, sin fondo, con brillo y luz interna en las encendidas.
 * - Solo aparece si algún semáforo no está en verde; entonces salen los 6.
 *   Se enciende en cuanto AEMET publica el aviso, aunque empiece mañana.
 * - Con data-fijo="si" (Actualidad) va fijo arriba de lado a lado, bajo
 *   la cabecera, siempre del mismo tamaño, y el contenido se ve por los
 *   huecos. Sin él, se pinta en su sitio (dashboards).
 * - Al tocar un semáforo sale una ficha con los avisos de ese fenómeno
 *   (puede haber varios). Si lo ha ajustado MeteoArchidona, solo nuestro
 *   nivel, la nota y hasta cuándo dura; en verde, «Sin aviso».
 *
 *     <div data-componente="alertas-semaforos" data-fijo="si"></div>
 *
 *     import {montarSemaforosAlertas} from "/js/alertas/semaforos.js?v=…";
 *     montarSemaforosAlertas(hueco);
 *
 * API: GET /alertas/semaforos. Se refresca cada 5 minutos.
 */

const HOJA = "/css/alertas.css?v=20261111-alertas1";

const MINUTOS_REFRESCO = 5;

const NS = "http://www.w3.org/2000/svg";

const ALTO = 190;

/* Escala del dibujo: en PC algo más grande que en el móvil. */
const CORTE_MOVIL = "(max-width: 850px)";

/* De abajo arriba, en el orden de la escala. */
const NIVELES = ["SIN_AVISO", "AMARILLO", "NARANJA", "FUCSIA", "ROJO"];

const LUCES = {
    SIN_AVISO: {nombre: "Verde", luz: "#22C24A", borde: "#0E7A2A", centro: "#D9FFE2"},
    AMARILLO: {nombre: "Amarillo", luz: "#FFD21F", borde: "#B88A00", centro: "#FFFBD6"},
    NARANJA: {nombre: "Naranja", luz: "#FF8A1A", borde: "#B04E00", centro: "#FFE9CC"},
    FUCSIA: {nombre: "Fucsia", luz: "#F0259F", borde: "#9A0A62", centro: "#FFD6EE"},
    ROJO: {nombre: "Rojo", luz: "#F2262B", borde: "#9A0B0E", centro: "#FFD9D2"},
};

const HORA = new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
});

let contador = 0;


function asegurarHoja() {
    const nombre = HOJA.split("?")[0].split("/").pop();
    if (document.querySelector(`link[rel="stylesheet"][href*="${nombre}"]`)) {
        return;
    }
    const enlace = document.createElement("link");
    enlace.rel = "stylesheet";
    enlace.href = HOJA;
    document.head.appendChild(enlace);
}


function el(nombre, atributos = {}, padre = null) {
    const nodo = document.createElementNS(NS, nombre);
    for (const [clave, valor] of Object.entries(atributos)) {
        nodo.setAttribute(clave, valor);
    }
    if (padre) {
        padre.appendChild(nodo);
    }
    return nodo;
}


function crear(etiqueta, clase, texto) {
    const nodo = document.createElement(etiqueta);
    if (clase) nodo.className = clase;
    if (texto !== undefined && texto !== null) nodo.textContent = texto;
    return nodo;
}


function hora(texto) {
    if (!texto) return null;
    const fecha = new Date(texto);
    return Number.isNaN(fecha.getTime()) ? null : HORA.format(fecha);
}


async function pedirSemaforos() {
    const base = window.API_BASE || "/api";
    const respuesta = await fetch(`${base}/alertas/semaforos`, {cache: "no-store"});
    if (!respuesta.ok) {
        throw new Error(`HTTP ${respuesta.status}`);
    }
    return respuesta.json();
}


/* ----------------------------------------------------------------------
   Dibujo
   ---------------------------------------------------------------------- */

function definiciones(svg, id) {
    const defs = el("defs", {}, svg);

    const lineal = (nombre, paradas, vertical = false) => {
        const g = el("linearGradient", {
            id: `${id}-${nombre}`, x1: 0, y1: 0, x2: vertical ? 0 : 1, y2: vertical ? 1 : 0,
        }, defs);
        for (const [offset, color] of paradas) {
            el("stop", {offset, "stop-color": color}, g);
        }
    };

    const radial = (nombre, paradas, cx = "0.5", cy = "0.5", r = "0.5") => {
        const g = el("radialGradient", {id: `${id}-${nombre}`, cx, cy, r}, defs);
        for (const [offset, color, opacidad] of paradas) {
            const parada = el("stop", {offset, "stop-color": color}, g);
            if (opacidad !== undefined) parada.setAttribute("stop-opacity", opacidad);
        }
    };

    lineal("carcasa", [["0", "#34373C"], ["0.3", "#1C1E21"], ["0.75", "#151619"], ["1", "#2E3135"]]);
    lineal("poste", [["0", "#22252A"], ["0.45", "#6B7078"], ["1", "#2A2D32"]]);
    radial("apagada", [["0", "#3B4352"], ["0.7", "#1A1F28"], ["1", "#0D1015"]], "0.4", "0.35", "0.75");
    radial("brillo", [["0", "#FFFFFF", "0.85"], ["1", "#FFFFFF", "0"]]);

    for (const nivel of NIVELES) {
        const luz = LUCES[nivel];
        radial(`on-${nivel}`, [["0", luz.centro], ["0.28", luz.luz], ["0.85", luz.luz], ["1", luz.borde]], "0.45", "0.42", "0.62");
        radial(`halo-${nivel}`, [["0", luz.luz, "0.75"], ["0.45", luz.luz, "0.28"], ["1", luz.luz, "0"]]);
    }

    const leds = el("pattern", {id: `${id}-leds`, width: 2.4, height: 2.4, patternUnits: "userSpaceOnUse"}, defs);
    el("circle", {cx: 1.2, cy: 1.2, r: 0.55, fill: "#000000", "fill-opacity": 0.22}, leds);
}


function dibujarSemaforo(svg, id, cx, semaforo, alPulsar) {
    const grupo = el("g", {
        class: "alertas-semaforo",
        tabindex: 0,
        role: "button",
        "aria-label": `${semaforo.nombre}: ${LUCES[semaforo.nivel]?.nombre || "sin datos"}. Ver detalle`,
    }, svg);

    el("rect", {x: cx - 1.5, y: 18, width: 3, height: 10, fill: "#2A2D32"}, grupo);
    el("rect", {x: cx - 27, y: 28, width: 54, height: 17, rx: 3, fill: "#1D4F91", stroke: "#FFFFFF", "stroke-width": 1.2}, grupo);
    const cartel = el("text", {x: cx, y: 40.5, "text-anchor": "middle", class: "alertas-cartel"}, grupo);
    cartel.textContent = semaforo.nombre;
    el("rect", {x: cx - 1.5, y: 45, width: 3, height: 5, fill: "#2A2D32"}, grupo);
    el("rect", {x: cx - 16, y: 50, width: 32, height: 125, rx: 5, fill: `url(#${id}-carcasa)`, stroke: "#0B0C0E", "stroke-width": 0.8}, grupo);
    el("rect", {x: cx - 14.5, y: 51.5, width: 3, height: 122, rx: 1.5, fill: "#FFFFFF", "fill-opacity": 0.06}, grupo);

    // De arriba abajo: rojo, fucsia, naranja, amarillo, verde.
    for (let posicion = 0; posicion < NIVELES.length; posicion++) {
        const nivel = NIVELES[NIVELES.length - 1 - posicion];
        const cy = 63 + 24 * posicion;
        const encendida = nivel === semaforo.nivel;

        if (encendida) {
            el("circle", {cx, cy, r: 22, fill: `url(#${id}-halo-${nivel})`, class: "alertas-halo"}, grupo);
        }
        el("circle", {cx, cy, r: 10.5, fill: "#0A0B0D"}, grupo);
        el("circle", {cx, cy, r: 9, fill: encendida ? `url(#${id}-on-${nivel})` : `url(#${id}-apagada)`}, grupo);
        if (encendida) {
            el("circle", {cx, cy, r: 9, fill: `url(#${id}-leds)`}, grupo);
        }
        el("ellipse", {cx: cx - 3, cy: cy - 3.5, rx: 4, ry: 2.4, fill: `url(#${id}-brillo)`, opacity: 0.55}, grupo);
        el("path", {
            d: `M${cx - 12} ${cy - 3} Q${cx - 12} ${cy - 13.5} ${cx} ${cy - 13.5} Q${cx + 12} ${cy - 13.5} ${cx + 12} ${cy - 3} `
                + `L${cx + 10} ${cy - 5} Q${cx} ${cy - 11} ${cx - 10} ${cy - 5} Z`,
            fill: "#0B0C0E",
        }, grupo);
    }

    grupo.addEventListener("click", () => alPulsar(semaforo));
    grupo.addEventListener("keydown", evento => {
        if (evento.key === "Enter" || evento.key === " ") {
            evento.preventDefault();
            alPulsar(semaforo);
        }
    });
}


function dibujar(raiz, datos, alPulsar) {
    const id = raiz.dataset.alertasId;
    const escala = window.matchMedia(CORTE_MOVIL).matches ? 1 : 1.15;
    const ancho = Math.max(380, Math.round((raiz.clientWidth || window.innerWidth) / escala));

    const svg = el("svg", {
        class: "alertas-brazo",
        viewBox: `0 0 ${ancho} ${ALTO}`,
        role: "group",
        "aria-label": "Semáforos de alertas meteorológicas",
    });
    definiciones(svg, id);

    // Poste a la izquierda y brazo curvado de lado a lado.
    el("path", {d: `M12 ${ALTO} L12 44 Q12 16 40 16 L${ancho - 8} 16`, fill: "none", stroke: "#1E2024", "stroke-width": 7, "stroke-linecap": "round"}, svg);
    el("path", {d: `M11 ${ALTO} L11 44 Q11 15 40 15 L${ancho - 8} 15`, fill: "none", stroke: "#5E636B", "stroke-width": 2.5, "stroke-linecap": "round"}, svg);
    el("rect", {x: 5, y: ALTO - 14, width: 14, height: 14, rx: 2, fill: `url(#${id}-poste)`}, svg);

    const semaforos = datos.semaforos || [];
    const inicio = 62;
    const paso = semaforos.length > 1
        ? Math.max(57, (ancho - inicio - 34) / (semaforos.length - 1))
        : 0;

    semaforos.forEach((semaforo, indice) => {
        dibujarSemaforo(svg, id, inicio + paso * indice, semaforo, alPulsar);
    });

    raiz.querySelector(".alertas-brazo")?.remove();
    raiz.prepend(svg);
}


/* ----------------------------------------------------------------------
   Ficha emergente
   ---------------------------------------------------------------------- */

function pastilla(nivel) {
    const luz = LUCES[nivel] || LUCES.SIN_AVISO;
    const nodo = crear("span", `alertas-pastilla alertas-nivel-${nivel}`, luz.nombre);
    return nodo;
}


function abrirFicha(raiz, semaforo) {
    let dialogo = raiz.querySelector(".alertas-ficha");

    if (!dialogo) {
        dialogo = crear("dialog", "alertas-ficha");
        dialogo.addEventListener("click", evento => {
            if (evento.target === dialogo) dialogo.close();
        });
        raiz.appendChild(dialogo);
    }

    dialogo.textContent = "";

    const cabecera = crear("div", "alertas-ficha-cabecera");
    cabecera.appendChild(crear("h2", "alertas-ficha-titulo", semaforo.nombre));
    cabecera.appendChild(pastilla(semaforo.nivel));
    const cerrar = crear("button", "alertas-ficha-cerrar", "×");
    cerrar.type = "button";
    cerrar.setAttribute("aria-label", "Cerrar");
    cerrar.addEventListener("click", () => dialogo.close());
    cabecera.appendChild(cerrar);
    dialogo.appendChild(cabecera);

    const cuerpo = crear("div", "alertas-ficha-cuerpo");

    if (semaforo.corregido) {
        cuerpo.appendChild(crear("p", "alertas-ficha-nota", semaforo.nota || "Nivel ajustado por MeteoArchidona"));
        const hasta = hora(semaforo.hasta);
        if (hasta) cuerpo.appendChild(crear("p", "alertas-ficha-horas", `Hasta ${hasta}`));
    } else if (semaforo.avisos && semaforo.avisos.length) {
        for (const aviso of semaforo.avisos) {
            const bloque = crear("article", `alertas-aviso alertas-borde-${aviso.nivel}`);
            const titulo = crear("div", "alertas-aviso-titulo");
            titulo.appendChild(pastilla(aviso.nivel));
            titulo.appendChild(crear("strong", null, aviso.titulo));
            bloque.appendChild(titulo);

            const desde = hora(aviso.inicio);
            const hasta = hora(aviso.fin);
            if (desde) {
                bloque.appendChild(crear("p", "alertas-ficha-horas", hasta ? `Desde ${desde} hasta ${hasta}` : `Desde ${desde}`));
            }
            if (aviso.descripcion) bloque.appendChild(crear("p", null, aviso.descripcion));
            if (aviso.instrucciones) bloque.appendChild(crear("p", "alertas-aviso-instrucciones", aviso.instrucciones));
            cuerpo.appendChild(bloque);
        }
        cuerpo.appendChild(crear("p", "alertas-ficha-fuente", "Fuente: AEMET (zona Antequera)"));
    } else {
        cuerpo.appendChild(crear("p", "alertas-ficha-nota", "Sin aviso."));
    }

    dialogo.appendChild(cuerpo);
    dialogo.showModal();
}


/* ----------------------------------------------------------------------
   Montaje
   ---------------------------------------------------------------------- */

function colocarBajoCabecera(raiz) {
    const cabecera = document.getElementById("cabecera");
    const alto = cabecera ? Math.round(cabecera.getBoundingClientRect().height) : 0;
    raiz.style.setProperty("--alertas-arriba", `${Math.max(0, alto)}px`);
}


export async function montarSemaforosAlertas(raiz) {
    asegurarHoja();
    contador += 1;
    raiz.dataset.alertasId = `alertas-${contador}`;
    raiz.classList.add("alertas-semaforos");
    raiz.hidden = true;

    const fijo = raiz.dataset.fijo === "si";
    if (fijo) {
        raiz.classList.add("alertas-fijo");
        colocarBajoCabecera(raiz);
        window.addEventListener("resize", () => colocarBajoCabecera(raiz));
        document.addEventListener("cabecera:montada", () => colocarBajoCabecera(raiz));
    }

    let ultimos = null;
    const alPulsar = semaforo => abrirFicha(raiz, semaforo);

    async function actualizar() {
        try {
            ultimos = await pedirSemaforos();
        } catch (error) {
            console.warn("Alertas: no se han podido leer los semáforos.", error);
            return;
        }

        if (!ultimos.hay_alertas) {
            raiz.hidden = true;
            return;
        }

        raiz.hidden = false;
        if (fijo) colocarBajoCabecera(raiz);
        dibujar(raiz, ultimos, alPulsar);
    }

    let espera = null;
    window.addEventListener("resize", () => {
        clearTimeout(espera);
        espera = setTimeout(() => {
            if (ultimos && ultimos.hay_alertas) dibujar(raiz, ultimos, alPulsar);
        }, 200);
    });

    await actualizar();
    setInterval(actualizar, MINUTOS_REFRESCO * 60 * 1000);
}


/* Fin de fichero: js/alertas/semaforos.js */
