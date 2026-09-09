/*
============================================================
CARGADOR DE COMPONENTES
============================================================

Inserta en el DOM los fragmentos HTML de cabecera, footer y
paneles estáticos, y solo entonces arranca la aplicación
(window.iniciarAplicacion), que necesita que existan los
elementos con id (reloj, veletas, enlaces de navegación...).

app.min.js es un módulo, así que puede evaluarse antes o
después de que terminen estos fetch. Por eso se espera al
evento "app-lista" si la función aún no está publicada.

cargarComponente() viene de js/pagina.js, que se carga antes
que este archivo. El reloj no se arranca aquí: de eso ya se
encarga iniciarAplicacion() a través de ui.js.
============================================================
*/

function esperarAplicacion() {
    if (typeof window.iniciarAplicacion === "function") {
        return Promise.resolve();
    }

    return new Promise((resolver) => {
        window.addEventListener("app-lista", () => resolver(), { once: true });
    });
}

async function cargarComponentes() {
    await Promise.all([
        cargarComponente("#cabecera-contenedor", "/componentes/cabecera.html"),

        cargarComponente("#footer-contenedor", "/componentes/footer.html"),

        typeof cargarTarjetasEstacion === "function"
            ? cargarTarjetasEstacion()
            : Promise.resolve(),
    ]);

    if (typeof construirNavegacion === "function") {
        construirNavegacion(window.location.hash.replace("#", ""));
    }

    if (typeof actualizarAnioPie === "function") {
        actualizarAnioPie();
    }

    if (typeof publicarAltoCabecera === "function") {
        publicarAltoCabecera();
    }

    await esperarAplicacion();

    window.iniciarAplicacion();
}

cargarComponentes();
