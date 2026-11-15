/*
 * MeteoArchidona · Lanzamientos escalonados
 *
 * Decisiones de José del 15-11-2026 (docs/lanzamientos.md de la API): las
 * secciones y pestañas publicadas sin anunciar se ocultan y se sueltan
 * una a una, cada 3 días a las 08:00, con su novedad en la portada.
 *
 * GET /lanzamientos dice el estado de cada una:
 *
 * - OCULTO: no sale en el menú ni en el pie; su página enseña
 *   «Próximamente»; su pestaña no sale; sus componentes no salen en ningún
 *   dashboard ni en Actualidad.
 * - EN_OBRAS (las primeras 24 horas): cartelito de obras junto al nombre
 *   en el menú o en el botón de la pestaña, y una franja arriba.
 * - PUBLICADO: nada.
 *
 * Los administradores (sesión con usuario administrador) lo ven todo, con
 * una marca de «oculta hasta el…».
 *
 * Lo carga js/cabecera.js en todas las páginas, y lo usa el pintor de
 * dashboards (componenteOculto). Si la API no responde, se usa lo último
 * que se supo en este navegador; si no hay nada, se enseña todo.
 *
 * Ocultar no es proteger: es cómo se presenta la web, no un control de
 * acceso.
 */

const CLAVE_CACHE = "ma_lanzamientos";
const ZONA = "Europe/Madrid";

let promesa = null;


function urlApi(ruta) {
    return `${window.API_BASE || "/api"}${ruta}`;
}


function leerCache() {
    try {
        const texto = window.localStorage.getItem(CLAVE_CACHE);
        return texto ? JSON.parse(texto) : null;
    } catch (error) {
        return null;
    }
}


function guardarCache(datos) {
    try {
        window.localStorage.setItem(CLAVE_CACHE, JSON.stringify(datos));
    } catch (error) {
        // Sin almacenamiento no pasa nada: la próxima vez se vuelve a pedir.
    }
}


/** Pide los lanzamientos una sola vez por página. */
export function cargarLanzamientos() {

    if (!promesa) {
        promesa = fetch(urlApi("/lanzamientos"), { credentials: "same-origin" })
            .then((respuesta) => {
                if (!respuesta.ok) {
                    throw new Error(`Lanzamientos: ${respuesta.status}`);
                }
                return respuesta.json();
            })
            .then((datos) => {
                guardarCache(datos);
                return datos;
            })
            .catch((error) => {
                console.error("No se han podido leer los lanzamientos:", error);
                return leerCache() || { administrador: false, lanzamientos: [] };
            });
    }

    return promesa;
}


function oculto(lanzamiento, datos) {
    return lanzamiento.estado === "OCULTO" && !datos.administrador;
}


/** ¿Hay que esconder este componente (data-componente) a quien mira? */
export async function componenteOculto(etiqueta) {

    const datos = await cargarLanzamientos();

    return datos.lanzamientos.some(
        (lanzamiento) => oculto(lanzamiento, datos) && (lanzamiento.componentes || []).includes(etiqueta)
    );
}


/* ==========================================================
   PINTAR
   ========================================================== */


function fechaCorta(valor) {
    if (!valor) {
        return "";
    }
    return new Date(valor).toLocaleString("es-ES", {
        timeZone: ZONA,
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
}


function crear(etiqueta, clase, texto) {
    const elemento = document.createElement(etiqueta);
    if (clase) {
        elemento.className = clase;
    }
    if (texto !== undefined) {
        elemento.textContent = texto;
    }
    return elemento;
}


function escaparAtributo(valor) {
    return String(valor).replace(/["\\]/g, "\\$&");
}


/*
 * Lo oculto se esconde con una hoja de estilo y no elemento a elemento:
 * así vale también para lo que se monte después (el pie, los dashboards,
 * el semáforo de Actualidad).
 */
function hojaDeOcultos(datos) {

    const reglas = [];
    // Aparte: si un navegador no entiende :has, solo pierde esta regla y no todas.
    const reglasPie = [];

    for (const lanzamiento of datos.lanzamientos) {

        if (!oculto(lanzamiento, datos)) {
            continue;
        }

        if (lanzamiento.seccion) {
            const seccion = escaparAtributo(lanzamiento.seccion);
            reglas.push(`.navegacion a[data-seccion="${seccion}"]`);
            reglasPie.push(`#pie-secciones li:has(> a[data-seccion="${seccion}"])`);
        }

        if (lanzamiento.pagina && lanzamiento.pestana) {
            reglas.push(
                `body[data-seccion="${escaparAtributo(lanzamiento.pagina)}"] [role="tab"][data-pestana="${escaparAtributo(lanzamiento.pestana)}"]`
            );
        }

        for (const etiqueta of lanzamiento.componentes || []) {
            reglas.push(`[data-componente="${escaparAtributo(etiqueta)}"]`);
        }
    }

    let hoja = document.getElementById("lanzamientos-ocultos");

    if (!hoja) {
        hoja = document.createElement("style");
        hoja.id = "lanzamientos-ocultos";
        document.head.appendChild(hoja);
    }

    hoja.textContent = [
        reglas.length ? `${reglas.join(",\n")} { display: none !important; }` : "",
        reglasPie.length ? `${reglasPie.join(",\n")} { display: none !important; }` : "",
    ].join("\n");
}


function marcar(elemento, clase, texto, titulo) {

    if (!elemento || elemento.querySelector(".lanzamiento-marca")) {
        return;
    }

    const marca = crear("span", `lanzamiento-marca ${clase}`, texto);
    marca.title = titulo;
    marca.setAttribute("aria-label", titulo);
    elemento.appendChild(marca);
}


function marcarEnlaces(lanzamiento, datos) {

    const enlaces = document.querySelectorAll(
        `.navegacion a[data-seccion="${escaparAtributo(lanzamiento.seccion)}"]`
    );

    for (const enlace of enlaces) {
        if (lanzamiento.estado === "EN_OBRAS") {
            marcar(enlace, "lanzamiento-obras", "🚧", "Recién estrenada: en obras");
        } else if (lanzamiento.estado === "OCULTO" && datos.administrador) {
            marcar(enlace, "lanzamiento-admin", "oculta", `Oculta para el público hasta el ${fechaCorta(lanzamiento.fecha)}`);
        }
    }
}


function franja(clase, icono, texto) {
    const caja = crear("div", `lanzamiento-franja ${clase}`);
    caja.setAttribute("role", "note");
    caja.append(crear("span", "lanzamiento-franja-icono", icono), crear("span", "lanzamiento-franja-texto", texto));
    return caja;
}


function franjaObras(nombre) {
    return franja(
        "lanzamiento-franja-obras",
        "🚧",
        `${nombre ? `${nombre}: r` : "R"}ecién estrenada. Seguimos dándole los últimos retoques; si ves algo raro, cuéntanoslo.`
    );
}


function franjaAdmin(lanzamiento) {
    return franja(
        "lanzamiento-franja-admin",
        "🔒",
        `Oculta para el público hasta el ${fechaCorta(lanzamiento.fecha)}. Solo la veis los administradores.`
    );
}


function ponerArriba(caja) {
    const principal = document.querySelector("main");
    if (principal) {
        principal.prepend(caja);
    } else {
        document.getElementById("cabecera")?.after(caja);
    }
}


function proximamente() {

    document.body.classList.add("lanzamiento-oculto");

    const caja = crear("section", "lanzamiento-proximamente");
    caja.setAttribute("aria-live", "polite");
    caja.append(
        crear("p", "lanzamiento-proximamente-icono", "🚧"),
        crear("h1", "lanzamiento-proximamente-titulo", "Próximamente"),
        crear(
            "p",
            "lanzamiento-proximamente-texto",
            "Estamos preparando esta sección. La anunciaremos muy pronto en la portada."
        )
    );

    const volver = crear("a", "lanzamiento-proximamente-boton", "Ir a la portada");
    volver.href = "/";
    caja.appendChild(volver);

    const principal = document.querySelector("main");
    if (principal) {
        principal.before(caja);
    } else {
        document.getElementById("cabecera")?.after(caja);
    }
}


function aplicarSeccion(lanzamiento, datos) {

    marcarEnlaces(lanzamiento, datos);

    if (document.body.dataset.seccion !== lanzamiento.seccion) {
        return;
    }

    if (oculto(lanzamiento, datos)) {
        proximamente();
    } else if (lanzamiento.estado === "EN_OBRAS") {
        ponerArriba(franjaObras(lanzamiento.nombre));
    } else if (lanzamiento.estado === "OCULTO" && datos.administrador) {
        ponerArriba(franjaAdmin(lanzamiento));
    }
}


function aplicarPestana(lanzamiento, datos) {

    if (document.body.dataset.seccion !== lanzamiento.pagina) {
        return;
    }

    const boton = document.querySelector(`[role="tab"][data-pestana="${escaparAtributo(lanzamiento.pestana)}"]`);

    if (!boton) {
        return;
    }

    const panel = document.getElementById(boton.getAttribute("aria-controls") || "");

    if (oculto(lanzamiento, datos)) {

        // Con clase y no solo con hidden: las páginas cambian hidden al abrir una pestaña.
        panel?.classList.add("lanzamiento-panel-oculto");

        // Si se había abierto (por el #… de la dirección), se pasa a la primera que se vea.
        if (boton.getAttribute("aria-selected") === "true") {
            const otra = [...boton.parentElement.querySelectorAll('[role="tab"]')]
                .find((candidata) => candidata !== boton && getComputedStyle(candidata).display !== "none");
            otra?.click();
        }

        return;
    }

    if (lanzamiento.estado === "EN_OBRAS") {
        marcar(boton, "lanzamiento-obras", "🚧", "Recién estrenada: en obras");
        panel?.prepend(franjaObras(lanzamiento.nombre));
    } else if (lanzamiento.estado === "OCULTO" && datos.administrador) {
        marcar(boton, "lanzamiento-admin", "oculta", `Oculta para el público hasta el ${fechaCorta(lanzamiento.fecha)}`);
        panel?.prepend(franjaAdmin(lanzamiento));
    }
}


/** Lo llama la cabecera, ya montada, en todas las páginas. */
export async function aplicarLanzamientos() {

    // Lo último que se supo, enseguida, para que no asome lo oculto mientras llega la respuesta.
    const cache = leerCache();

    if (cache) {
        hojaDeOcultos(cache);
    }

    const datos = await cargarLanzamientos();

    hojaDeOcultos(datos);

    for (const lanzamiento of datos.lanzamientos) {
        if (lanzamiento.tipo === "SECCION" && lanzamiento.seccion) {
            aplicarSeccion(lanzamiento, datos);
        } else if (lanzamiento.tipo === "PESTANA" && lanzamiento.pagina && lanzamiento.pestana) {
            aplicarPestana(lanzamiento, datos);
        }
    }

    document.documentElement.classList.add("lanzamientos-listos");
}


/* Fin de fichero: js/lanzamientos.js */
