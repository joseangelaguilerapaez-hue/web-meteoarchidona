/*
 * MeteoArchidona · Fauna y Flora · marco
 *
 * La cabecera, el menú y el pie propios de la página «Fauna y Flora»
 * (José, 25-11-2026): una página hermana de MeteoArchidona, dentro del
 * mismo sitio, con sus secciones (Orquídeas y las que vengan). Cada
 * página de Fauna y Flora lleva <div id="ff-cabecera"> y <div id="ff-pie">
 * y carga este módulo, que:
 *
 *   - mete componentes/fauna-flora-cabecera.html y fauna-flora-pie.html;
 *   - marca la sección de <body data-ff-seccion="...">;
 *   - pone el reloj en hora de Madrid;
 *   - abre y cierra el menú en el móvil;
 *   - carga la cuenta (js/cuenta.js) y los lanzamientos (js/lanzamientos.js):
 *     una sección con lanzamiento (data-lanzamiento, como Orquídeas, que
 *     sale el 24-12-2026) se enseña en el menú cuando ya ha salido o a quien
 *     puede verla antes (administradores, amigos y editores de orquídeas,
 *     con el candado); las primeras 48 horas lleva el cartelito de obras.
 */

const RUTA_CABECERA = "/componentes/fauna-flora-cabecera.html?v=20261126-jornadas1";

const RUTA_PIE = "/componentes/fauna-flora-pie.html?v=20261125-fauna1";

const RUTA_CUENTA_CSS = "/css/cuenta.css?v=20261026-cuenta3";

const RUTA_CUENTA_JS = "/js/cuenta.js?v=20261126-jornadas1";

const RUTA_LANZAMIENTOS_JS = "/js/lanzamientos.js?v=20261115-lanzamientos2";

const ZONA = "Europe/Madrid";

export const EVENTO_CUENTA = "meteoarchidona:cuenta";


async function traer(ruta) {
    const respuesta = await fetch(ruta);
    if (!respuesta.ok) {
        throw new Error(`${ruta} respondió ${respuesta.status}`);
    }
    return respuesta.text();
}


function ponerReloj() {
    const fecha = document.getElementById("ff-fecha");
    const hora = document.getElementById("ff-hora");
    if (!fecha || !hora) return;
    const ahora = new Date();
    fecha.textContent = ahora.toLocaleDateString("es-ES", {
        timeZone: ZONA, day: "2-digit", month: "2-digit", year: "numeric"
    });
    hora.textContent = ahora.toLocaleTimeString("es-ES", {
        timeZone: ZONA, hour: "2-digit", minute: "2-digit"
    });
}


function marcarSeccion() {
    const seccion = document.body.dataset.ffSeccion;
    if (!seccion) return;
    const enlace = document.querySelector(`.ff-menu a[data-ff-seccion="${seccion}"]`);
    if (enlace) {
        enlace.classList.add("activo");
        enlace.setAttribute("aria-current", "page");
    }
}


function configurarMenu() {
    const boton = document.getElementById("ff-boton-menu");
    const menu = document.getElementById("ff-menu");
    if (!boton || !menu) return;
    boton.addEventListener("click", () => {
        const abierto = !menu.classList.contains("abierto");
        menu.classList.toggle("abierto", abierto);
        boton.setAttribute("aria-expanded", String(abierto));
        boton.setAttribute("aria-label", abierto ? "Cerrar el menú de secciones" : "Abrir el menú de secciones");
    });
}


/*
 * Secciones con lanzamiento: visibles si ya han salido (o no hay datos de
 * lanzamientos), o antes a quien puede verlas (js/cuenta.js lo avisa).
 */
const estado = { veAntes: false, lanzamientos: null };

function mostrarSecciones() {
    document.querySelectorAll(".ff-menu a[data-lanzamiento]").forEach(enlace => {
        const lanzamiento = estado.lanzamientos?.find(l => l.clave === enlace.dataset.lanzamiento);
        const oculto = lanzamiento ? lanzamiento.estado === "OCULTO" : estado.lanzamientos === null;
        enlace.hidden = oculto && !estado.veAntes;
        enlace.classList.toggle("ff-antes", oculto);
        enlace.classList.toggle("ff-obras", lanzamiento?.estado === "EN_OBRAS");
        if (oculto && lanzamiento) {
            enlace.title = `Se estrena el ${new Date(lanzamiento.fecha).toLocaleDateString("es-ES", { timeZone: ZONA })}`;
        } else {
            enlace.removeAttribute("title");
        }
    });
}

async function cargarLanzamientos() {
    try {
        const modulo = await import(RUTA_LANZAMIENTOS_JS);
        const datos = await modulo.cargarLanzamientos();
        estado.lanzamientos = datos.lanzamientos || [];
    } catch (error) {
        console.error("Fauna y Flora: no se han podido leer los lanzamientos:", error);
        estado.lanzamientos = [];
    }
    mostrarSecciones();
}


function cargarCuenta() {
    const hoja = document.createElement("link");
    hoja.rel = "stylesheet";
    hoja.href = RUTA_CUENTA_CSS;
    document.head.appendChild(hoja);

    const guion = document.createElement("script");
    guion.src = RUTA_CUENTA_JS;
    guion.defer = true;
    document.head.appendChild(guion);
}


async function montarCabecera() {
    const hueco = document.getElementById("ff-cabecera");
    if (!hueco) return;

    try {
        hueco.innerHTML = await traer(RUTA_CABECERA);
    } catch (error) {
        // Sin cabecera, al menos la vuelta a MeteoArchidona.
        hueco.innerHTML = '<header class="ff-cabecera"><div class="ff-cabecera-fila">'
            + '<a href="/" class="ff-volver">Volver a MeteoArchidona</a></div></header>';
        console.error("Fauna y Flora: no se ha podido cargar la cabecera:", error);
        return;
    }

    marcarSeccion();
    configurarMenu();
    ponerReloj();
    window.setInterval(ponerReloj, 30000);

    // Antes de cargar la cuenta, para no perder su primer aviso.
    document.addEventListener(EVENTO_CUENTA, evento => {
        estado.veAntes = Boolean(evento.detail?.veOrquideas);
        mostrarSecciones();
    });
    cargarCuenta();
    void cargarLanzamientos();
}


async function montarPie() {
    const hueco = document.getElementById("ff-pie");
    if (!hueco) return;

    try {
        hueco.innerHTML = await traer(RUTA_PIE);
    } catch (error) {
        console.error("Fauna y Flora: no se ha podido cargar el pie:", error);
        return;
    }

    const anio = document.getElementById("ff-pie-anio");
    if (anio) anio.textContent = String(new Date().getFullYear());
}


export async function montarMarcoFaunaFlora() {
    await Promise.all([montarCabecera(), montarPie()]);
}


/* Fin de fichero: js/fauna-flora/marco.js */
