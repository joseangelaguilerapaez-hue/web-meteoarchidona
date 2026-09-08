/*
============================================================
CARGADOR DE COMPONENTES
============================================================

Inserta en el DOM los fragmentos HTML de cabecera, navbar,
footer y paneles estáticos, y solo entonces arranca app.js
(iniciarAplicacion), ya que ese script necesita que los
elementos con id (reloj, veletas, enlaces de navegación...)
existan en la página.
============================================================
*/

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

async function cargarComponentes() {
    await cargarComponente("#cabecera-contenedor", "../componentes/cabecera.html");

    await Promise.all([
        cargarComponente("#navbar-contenedor", "../componentes/navbar.html"),

        cargarComponente("#footer-contenedor", "../componentes/footer.html"),

        cargarComponente("#panel-prediccion-contenedor", "../componentes/panel-prediccion.html"),

        cargarTarjetasEstacion(),
    ]);
}

cargarComponentes().then(() => {
    if (typeof window.iniciarAplicacion === "function") {
        window.iniciarAplicacion();
    }
});
