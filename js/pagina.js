/*
============================================================
ARRANQUE COMÚN DE PÁGINA
============================================================

Lo que necesita cualquier página del sitio: montar la cabecera
y el pie compartidos, pintar la navegación desde js/rutas.js y
poner el reloj en marcha.

Se carga con <script src="../js/pagina.js"></script> y después
el script propio de la página llama a:

    montarCabeceraYPie("prediccion");

pasando el id de la sección en js/rutas.js, o null si la página
no figura ahí.

El reloj lo lleva js/ui.js, que es el mismo que usa index.html
a través de app.js. Se trae con import() dinámico para no
tener dos reloj distintos que puedan acabar divergiendo.
============================================================
*/

/*
En local el Service Worker estorba: su caché hace que los
cambios recién guardados no se vean al recargar. Aquí se
desregistra el que hubiera quedado registrado de antes y se
borran sus cachés. En producción no se toca nada.
*/
function limpiarServiceWorkerLocal() {
    const host = window.location.hostname;
    const esLocal = host === "localhost" || host === "127.0.0.1" || host === "";

    if (!esLocal || !("serviceWorker" in navigator)) {
        return;
    }

    navigator.serviceWorker.getRegistrations().then((registros) => {
        registros.forEach((registro) => registro.unregister());
    });

    if ("caches" in window) {
        caches.keys().then((nombres) => {
            nombres.forEach((nombre) => caches.delete(nombre));
        });
    }
}

limpiarServiceWorkerLocal();

/*
Publica en --alto-cabecera lo que mide realmente la cabecera,
para que los paneles con iframe puedan ocupar exactamente el
hueco que queda y no aparezca una segunda barra de scroll.

Se mide en vez de restar una constante porque la cabecera
cambia de alto según el ancho: en pantallas estrechas la
navegación pasa a otra línea.
*/
function publicarAltoCabecera() {
    const cabecera = document.querySelector(".cabecera");

    if (!cabecera) {
        return;
    }

    const aplicar = () => {
        const alto = Math.round(cabecera.getBoundingClientRect().height);
        document.documentElement.style.setProperty("--alto-cabecera", `${alto}px`);
    };

    aplicar();

    if (typeof ResizeObserver === "function") {
        new ResizeObserver(aplicar).observe(cabecera);
    }

    window.addEventListener("resize", aplicar);

    // La primera medida se toma antes de que las fuentes acaben
    // de cargar, y con otra tipografía la navegación puede pasar
    // a otra línea y cambiar el alto.
    window.addEventListener("load", aplicar);

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(aplicar);
    }
}

async function cargarComponente(selector, url) {
    const contenedor = document.querySelector(selector);

    if (!contenedor) {
        return;
    }

    try {
        const respuesta = await fetch(url, {
            cache: "no-store",
        });

        if (!respuesta.ok) {
            throw new Error(`HTTP ${respuesta.status}`);
        }

        contenedor.innerHTML = await respuesta.text();
    } catch (error) {
        console.error(`Error cargando componente ${url}:`, error);
    }
}

/*
Cuando la página se abre dentro del iframe de un panel de
index.html, la cabecera ya la pone index.html: montarla otra vez
dejaría dos barras seguidas.
*/
function estaEmbebida() {
    return window.self !== window.top;
}

/*
Marca el documento cuando va dentro de un iframe, para que el
CSS de la página pueda dejar de reservar el hueco de la
cabecera y del pie: ahí dentro no los hay, y si los reserva
el contenido desborda y aparece una segunda barra de scroll.
*/
if (estaEmbebida()) {
    document.documentElement.classList.add("embebida");
}

/*
Arranca el reloj de la cabecera. Hay que llamarlo después de
insertar componentes/cabecera.html, porque ui.js escribe en los
ids #reloj-actual y #fecha-actual, que vienen en ese fragmento.
*/
async function iniciarRelojCabecera() {
    if (!document.getElementById("reloj-actual")) {
        return;
    }

    try {
        const ui = await import("/js/ui.js");
        ui.inicializarReloj();
    } catch (error) {
        console.error("Error iniciando el reloj:", error);
    }
}

/*
Monta cabecera y pie, pinta la navegación y arranca el reloj.

seccion: id de la sección en js/rutas.js para marcar su enlace
como activo, o null si la página no está en la navegación.
*/
async function montarCabeceraYPie(seccion) {
    const pendientes = [cargarComponente("#footer-contenedor", "/componentes/footer.html")];

    if (!estaEmbebida()) {
        pendientes.push(cargarComponente("#cabecera-contenedor", "/componentes/cabecera.html"));
    }

    await Promise.all(pendientes);

    // Después de insertar los dos: construirNavegacion rellena la
    // barra de la cabecera y la lista de secciones del pie.
    if (typeof construirNavegacion === "function") {
        construirNavegacion(seccion);
    }

    if (typeof actualizarAnioPie === "function") {
        actualizarAnioPie();
    }

    if (!estaEmbebida()) {
        await iniciarRelojCabecera();

        publicarAltoCabecera();
    }
}
