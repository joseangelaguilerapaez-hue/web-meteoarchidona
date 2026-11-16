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
 * - Se enciende en cuanto AEMET publica la alerta, aunque empiece mañana.
 * - Sale siempre, aunque esté todo en verde, para que la gente se acostumbre
 *   a mirarlo (José, 16-11-2026; antes solo salía con alguna alerta).
 *   Mientras llegan los datos se dibuja con las luces apagadas, para que la
 *   página no dé un salto.
 * - En Actualidad (data-portada="si") va en su sección, entre la cabecera y
 *   el cuerpo, y se va con el scroll como el resto (antes iba fijo arriba y
 *   tapaba datos). Al perderse de vista, si hay alguna alerta, queda bajo la
 *   cabecera una tira fina («⚠ Alerta naranja · Viento») que al tocarla
 *   sube al semáforo. Con todo en verde no sale tira (José, 16-11-2026).
 * - Al tocar un semáforo sale una ficha con las alertas de ese fenómeno
 *   (puede haber varios). Si lo ha ajustado MeteoArchidona, solo nuestro
 *   nivel, la nota y hasta cuándo dura; en verde, «Sin alerta». (Los «avisos» de la web
 *   —eclipses, tormentas próximas…— son otra cosa.)
 *
 *     <div data-componente="alertas-semaforos" data-portada="si"></div>
 *
 *     import {montarSemaforosAlertas} from "/js/alertas/semaforos.js?v=…";
 *     montarSemaforosAlertas(hueco);
 *
 * API: GET /alertas/semaforos. Se refresca cada 5 minutos.
 */

const HOJA = "/css/alertas.css?v=20261116-portada1";

// Fuente que se cita en la ficha (los de AEMET-Meteoalerta, la de por defecto).
const FUENTES = {
    INCENDIO: "Fuente: AEMET (peligro meteorológico de incendios; el peor de los pueblos de la comarca)",
    AIRE: "Fuente: CAMS de Copernicus (previsión para Archidona: índice nacional de calidad del aire y calima)",
};

// Nombre de la sección a la que lleva el enlace de la ficha.
const SECCIONES = {INCENDIO: "Incendios", AIRE: "Calidad del aire"};

const MINUTOS_REFRESCO = 5;

/* Mientras llegan los datos: los seis de AEMET con las luces apagadas. */
const APAGADOS = {
    hay_alertas: false,
    semaforos: ["Lluvia", "Tormenta", "Viento", "Calor", "Frío", "Nieve"]
        .map(nombre => ({fenomeno: null, nombre, nivel: null})),
};

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
    // Con siete u ocho semáforos (Incendios y Aire, 15-11-2026) no caben en un móvil a 57
    // de paso: el dibujo se hace más ancho y el navegador lo encoge.
    let ancho = Math.max(380, Math.round((raiz.clientWidth || window.innerWidth) / escala));
    const total = (datos.semaforos || []).length;
    ancho = Math.max(ancho, 62 + 57 * Math.max(0, total - 1) + 34);

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
        // Alerta propia o corrección de MeteoArchidona (José, 12-11-2026).
        cuerpo.appendChild(crear("p", "alertas-ficha-nota", semaforo.nota || "Alerta de MeteoArchidona"));
        if (semaforo.texto) cuerpo.appendChild(crear("p", "alertas-ficha-texto", semaforo.texto));
        const hasta = hora(semaforo.hasta);
        const empieza = semaforo.desde && new Date(semaforo.desde) > new Date() ? hora(semaforo.desde) : null;
        if (empieza && hasta) {
            cuerpo.appendChild(crear("p", "alertas-ficha-horas", `Desde ${empieza} hasta ${hasta}`));
        } else if (hasta) {
            cuerpo.appendChild(crear("p", "alertas-ficha-horas", `Hasta ${hasta}`));
        }
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
        cuerpo.appendChild(crear("p", "alertas-ficha-fuente",
            FUENTES[semaforo.fenomeno] || "Fuente: AEMET (zona Antequera)"));
    } else {
        cuerpo.appendChild(crear("p", "alertas-ficha-nota", "Sin alerta."));
    }

    // Incendios y Aire llevan a su sección (15-11-2026).
    if (semaforo.enlace) {
        const enlace = crear("a", "alertas-ficha-enlace", `Ver la sección ${SECCIONES[semaforo.fenomeno] || semaforo.nombre}`);
        enlace.href = semaforo.enlace;
        cuerpo.appendChild(enlace);
    }

    dialogo.appendChild(cuerpo);
    dialogo.showModal();
}


/* ----------------------------------------------------------------------
   Montaje
   ---------------------------------------------------------------------- */

/*
 * Los semáforos de Incendios y de Aire no salen mientras su sección esté
 * oculta por los lanzamientos (salvo a los administradores).
 */
const LANZAMIENTO_DEL_SEMAFORO = {INCENDIO: "incendios", AIRE: "calidad-aire"};

async function quitarOcultos(datos) {
    let lanzamientos;
    try {
        const modulo = await import("/js/lanzamientos.js?v=20261115-lanzamientos2");
        lanzamientos = await modulo.cargarLanzamientos();
    } catch {
        return datos;
    }

    if (lanzamientos.administrador) {
        return datos;
    }

    const ocultos = new Set((lanzamientos.lanzamientos || [])
        .filter(l => l.estado === "OCULTO")
        .map(l => l.clave));
    const semaforos = (datos.semaforos || []).filter(s => !ocultos.has(LANZAMIENTO_DEL_SEMAFORO[s.fenomeno]));
    if (semaforos.length === (datos.semaforos || []).length) {
        return datos;
    }
    return {
        ...datos,
        semaforos,
        hay_alertas: semaforos.some(s => s.nivel !== "SIN_AVISO"),
    };
}


/* Hasta dónde llega la cabecera en pantalla (en PC va fija; en el móvil se
   va con el scroll), para la tira y para subir al semáforo sin taparlo. */
function colocarBajoCabecera() {
    const cabecera = document.getElementById("cabecera");
    const alto = cabecera ? Math.round(cabecera.getBoundingClientRect().bottom) : 0;
    document.documentElement.style.setProperty("--alertas-arriba", `${Math.max(0, alto)}px`);
    return Math.max(0, alto);
}


/* «Alerta amarilla», «alerta roja»… (concuerda con «alerta»). */
const COLOR_ALERTA = {AMARILLO: "amarilla", NARANJA: "naranja", FUCSIA: "fucsia", ROJO: "roja"};

/* Texto de la tira: el peor nivel y los fenómenos que lo tienen. */
function textoTira(datos) {
    const conAlerta = (datos.semaforos || []).filter(s => s.nivel && s.nivel !== "SIN_AVISO");
    if (!conAlerta.length) return null;
    const peor = conAlerta.reduce((a, b) => NIVELES.indexOf(b.nivel) > NIVELES.indexOf(a.nivel) ? b : a).nivel;
    const delPeor = conAlerta.filter(s => s.nivel === peor).map(s => s.nombre);
    const resto = conAlerta.length - delPeor.length;
    return {
        nivel: peor,
        texto: `Alerta ${COLOR_ALERTA[peor]} · ${delPeor.join(", ")}${resto ? ` · +${resto}` : ""}`,
    };
}


/*
 * Tira fina bajo la cabecera (José, 16-11-2026): sale cuando el semáforo se
 * pierde de vista por arriba y hay alguna alerta; al tocarla sube a él.
 */
function crearTira(raiz) {
    const tira = crear("button", "alertas-tira");
    tira.type = "button";
    tira.hidden = true;
    const icono = crear("span", "alertas-tira-icono", "⚠");
    icono.setAttribute("aria-hidden", "true");
    const texto = crear("span", "alertas-tira-texto");
    tira.append(icono, texto);
    raiz.appendChild(tira);

    let datos = null;
    let fuera = false;

    function pintar() {
        const resumen = datos ? textoTira(datos) : null;
        const ver = Boolean(resumen) && fuera;
        if (resumen) {
            texto.textContent = resumen.texto;
            tira.setAttribute("aria-label", `${resumen.texto}. Ir a los semáforos de alertas`);
            for (const nivel of NIVELES) tira.classList.toggle(`alertas-nivel-${nivel}`, nivel === resumen.nivel);
        }
        if (ver) {
            tira.hidden = false;
            requestAnimationFrame(() => tira.classList.add("alertas-tira-visible"));
        } else {
            tira.classList.remove("alertas-tira-visible");
        }
    }

    tira.addEventListener("transitionend", () => {
        if (!tira.classList.contains("alertas-tira-visible")) tira.hidden = true;
    });

    tira.addEventListener("click", () => {
        const seccion = raiz.closest(".portada-alertas") || raiz;
        const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        seccion.scrollIntoView({behavior: quieto ? "auto" : "smooth", block: "start"});
    });

    let pendiente = false;
    function comprobar() {
        pendiente = false;
        const brazo = raiz.querySelector(".alertas-brazo");
        if (!brazo || raiz.offsetParent === null) {
            fuera = false;
        } else {
            fuera = brazo.getBoundingClientRect().bottom < colocarBajoCabecera() + 8;
        }
        pintar();
    }
    function alMover() {
        if (pendiente) return;
        pendiente = true;
        requestAnimationFrame(comprobar);
    }
    window.addEventListener("scroll", alMover, {passive: true});
    window.addEventListener("resize", alMover);

    return {
        actualizar(nuevos) {
            datos = nuevos;
            comprobar();
        },
    };
}


export async function montarSemaforosAlertas(raiz) {
    asegurarHoja();
    contador += 1;
    raiz.dataset.alertasId = `alertas-${contador}`;
    raiz.classList.add("alertas-semaforos");
    raiz.hidden = false;

    let ultimos = null;
    const alPulsar = semaforo => {
        if (semaforo.fenomeno) abrirFicha(raiz, semaforo);
    };

    // Luces apagadas hasta que lleguen los datos.
    dibujar(raiz, APAGADOS, alPulsar);

    const tira = raiz.dataset.portada === "si" ? crearTira(raiz) : null;
    if (tira) {
        colocarBajoCabecera();
        document.addEventListener("cabecera:montada", () => colocarBajoCabecera());
    }

    async function actualizar() {
        try {
            ultimos = await quitarOcultos(await pedirSemaforos());
        } catch (error) {
            console.warn("Alertas: no se han podido leer los semáforos.", error);
            // Sin ningún dato todavía no se deja el semáforo apagado a la vista.
            if (!ultimos) raiz.hidden = true;
            return;
        }

        raiz.hidden = false;
        dibujar(raiz, ultimos, alPulsar);
        if (tira) tira.actualizar(ultimos);
    }

    let espera = null;
    window.addEventListener("resize", () => {
        clearTimeout(espera);
        espera = setTimeout(() => dibujar(raiz, ultimos || APAGADOS, alPulsar), 200);
    });

    await actualizar();
    setInterval(actualizar, MINUTOS_REFRESCO * 60 * 1000);
}


/* Fin de fichero: js/alertas/semaforos.js */
