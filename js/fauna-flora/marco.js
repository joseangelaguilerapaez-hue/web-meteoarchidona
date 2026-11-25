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
 *   - carga la cuenta (js/cuenta.js), y con su aviso enseña Orquídeas en
 *     el menú solo a los administradores y los amigos de las orquídeas.
 */

const RUTA_CABECERA = "/componentes/fauna-flora-cabecera.html?v=20261125-fauna1";

const RUTA_PIE = "/componentes/fauna-flora-pie.html?v=20261125-fauna1";

const RUTA_CUENTA_CSS = "/css/cuenta.css?v=20261026-cuenta3";

const RUTA_CUENTA_JS = "/js/cuenta.js?v=20261125-orquideas1";

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


/* Orquídeas, en el menú solo para quien puede verla (js/cuenta.js lo avisa). */
function mostrarPrivadas(veOrquideas) {
    document.querySelectorAll('.ff-menu a[data-privada="orquideas"]').forEach(enlace => {
        enlace.hidden = !veOrquideas;
    });
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
        mostrarPrivadas(Boolean(evento.detail?.veOrquideas));
    });
    cargarCuenta();
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
