/*
============================================================
RUTAS DE NAVEGACIÓN
============================================================

Único sitio donde se definen las secciones del sitio. De aquí
salen los enlaces de la cabecera y la lista de paneles válidos
que usa la aplicación.

Cada ruta tiene:

  id       Identificador de la sección. Debe coincidir con el
           atributo data-panel-contenido del <section> en
           index.html y con el data-panel de su enlace.

  etiqueta Texto visible en la barra de navegación.

  pagina   Página suelta de esa sección, en ruta absoluta
           desde la raíz del sitio: las páginas que pintan la
           navegación están a distinta profundidad (index.html
           en la raíz, el resto en pages/), y una ruta relativa
           apuntaría a un sitio distinto según quién la use.
           Se usa cuando la navegación se pinta en una página
           que no tiene paneles (info.html, prediccion.html...)
           y como destino del iframe del panel.

  enMenu   Si aparece o no en la barra de navegación.

Para añadir una sección: se añade aquí y se crea el <section>
correspondiente en index.html con su data-panel-contenido.
============================================================
*/

const RUTAS_NAVEGACION = [
    {
        id: "actualidad",
        etiqueta: "Actualidad",
        pagina: "/",
        enMenu: true,
    },

    {
        id: "prediccion",
        etiqueta: "Predicción",
        pagina: "/pages/prediccion.html",
        enMenu: true,
    },

    {
        id: "observaciones",
        etiqueta: "Observaciones",
        pagina: "/pages/observaciones.html",
        enMenu: true,
    },

    {
        id: "en-vivo",
        etiqueta: "En vivo",
        pagina: "/pages/en-vivo.html",
        enMenu: true,
    },

    {
        id: "info",
        etiqueta: "Información",
        pagina: "/pages/info.html",
        enMenu: true,
    },
];

const RUTA_POR_DEFECTO = "actualidad";

/*
Devuelve los ids de las secciones que existen como panel en el
documento actual. index.html los tiene todos; las páginas
sueltas, ninguno.
*/
function panelesDisponibles() {
    return RUTAS_NAVEGACION.filter((ruta) =>
        document.querySelector(`[data-panel-contenido="${ruta.id}"]`),
    ).map((ruta) => ruta.id);
}

/*
Pinta los enlaces dentro de cada <nav class="navegacion">.

Si la sección existe como panel en esta página el enlace apunta
al ancla (#id) y lo gestiona la aplicación; si no, apunta a la
página suelta de esa sección.

idActivo marca el enlace de la sección actual. Sin argumento se
marca RUTA_POR_DEFECTO; con null no se marca ninguno, que es lo
que necesitan las páginas que no figuran en RUTAS_NAVEGACION.
*/
function construirNavegacion(idActivo) {
    // La barra de la cabecera y la lista de secciones del pie.
    const menus = document.querySelectorAll(".navegacion, .navegacion-pie");

    if (menus.length === 0) {
        return;
    }

    const conPanel = panelesDisponibles();
    const activo = idActivo === undefined || idActivo === "" ? RUTA_POR_DEFECTO : idActivo;
    const visibles = RUTAS_NAVEGACION.filter((ruta) => ruta.enMenu);

    menus.forEach((menu) => {
        // En el pie la lista es un <ul>, así que cada enlace va
        // dentro de su <li>; en la cabecera van sueltos dentro
        // del <nav>.
        const esLista = menu.tagName === "UL";

        menu.innerHTML = visibles
            .map((ruta) => {
                const destino = conPanel.includes(ruta.id) ? `#${ruta.id}` : ruta.pagina;
                const clase = !esLista && ruta.id === activo ? ' class="activo"' : "";

                const enlace =
                    `<a href="${destino}" data-panel="${ruta.id}"${clase}>` +
                    `${ruta.etiqueta}</a>`;

                return esLista ? `<li>${enlace}</li>` : enlace;
            })
            .join("\n");
    });
}

/*
Pone el año en curso en el pie, para no tener que acordarse de
cambiarlo a mano cada enero.
*/
function actualizarAnioPie() {
    const anio = document.getElementById("pie-anio");

    if (anio) {
        anio.textContent = String(new Date().getFullYear());
    }
}

window.RUTAS_NAVEGACION = RUTAS_NAVEGACION;
window.RUTA_POR_DEFECTO = RUTA_POR_DEFECTO;
window.panelesDisponibles = panelesDisponibles;
window.construirNavegacion = construirNavegacion;
window.actualizarAnioPie = actualizarAnioPie;
