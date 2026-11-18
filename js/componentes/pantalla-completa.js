/*
 * MeteoArchidona · Componentes · pantalla completa
 *
 * Botón de maximizar compartido por la «Comparación visual» suelta y el
 * «Vistazo general» (José, 18-11-2026):
 *
 * - pantalla completa de verdad donde el navegador la deja (PC, Android,
 *   iPad) y, en el móvil, giro a horizontal mientras dure (Android; el
 *   iPhone no deja forzarlo: se gira a mano y la vista se adapta);
 * - donde no la deja (Safari del iPhone), plan B: el componente ocupa
 *   toda la ventana.
 *
 * Se sale con el mismo botón o con Esc. El componente lleva la clase
 * `clases.ampliado` mientras está maximizado (de una forma o de otra) y
 * `clases.maximizado` solo en el plan B.
 *
 *     prepararPantallaCompleta(raiz, boton, {
 *         ampliado: "vg-ampliado", maximizado: "vg-maximizado",
 *         alCambiar: dentro => …
 *     });
 */


function elementoPantallaCompleta() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
}


function girarHorizontal() {
    try {
        const promesa = screen.orientation?.lock?.("landscape");
        promesa?.catch?.(() => {});
    } catch (error) {
        // Sin bloqueo de orientación (PC, iPhone): no pasa nada.
    }
}


function soltarGiro() {
    try {
        screen.orientation?.unlock?.();
    } catch (error) {
        // Nada que soltar.
    }
}


export function prepararPantallaCompleta(raiz, boton, clases) {

    const {ampliado, maximizado, alCambiar} = clases;
    let estabaDentro = false;

    const ponerEstado = () => {
        const dentro = elementoPantallaCompleta() === raiz || raiz.classList.contains(maximizado);
        raiz.classList.toggle(ampliado, dentro);
        boton.setAttribute("aria-pressed", dentro ? "true" : "false");
        boton.setAttribute("aria-label", dentro ? "Salir de pantalla completa" : "Pantalla completa");
        boton.title = dentro ? "Salir de pantalla completa (Esc)" : "Pantalla completa";
        boton.textContent = dentro ? "✕" : "⛶";
        if (estabaDentro && !dentro) {
            soltarGiro();
        }
        if (dentro !== estabaDentro) {
            estabaDentro = dentro;
            if (alCambiar) {
                alCambiar(dentro);
            }
        }
    };

    const ampliarEnVentana = activar => {
        raiz.classList.toggle(maximizado, activar);
        document.documentElement.classList.toggle("pc-sin-scroll", activar);
        ponerEstado();
    };

    boton.addEventListener("click", async () => {
        if (raiz.classList.contains(maximizado)) {
            ampliarEnVentana(false);
            return;
        }
        if (elementoPantallaCompleta()) {
            try {
                await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
            } catch (error) {
                console.warn("Pantalla completa: no se pudo salir", error);
            }
            return;
        }
        const pedirPantalla = raiz.requestFullscreen || raiz.webkitRequestFullscreen;
        if (pedirPantalla && (document.fullscreenEnabled || document.webkitFullscreenEnabled)) {
            try {
                await pedirPantalla.call(raiz);
                girarHorizontal();
                return;
            } catch (error) {
                console.warn("Pantalla completa denegada; se amplía en la ventana", error);
            }
        }
        ampliarEnVentana(true);
    });

    document.addEventListener("fullscreenchange", ponerEstado);
    document.addEventListener("webkitfullscreenchange", ponerEstado);
    document.addEventListener("keydown", evento => {
        if (evento.key === "Escape" && raiz.classList.contains(maximizado)) {
            ampliarEnVentana(false);
        }
    });

    ponerEstado();
}


/* Fin de fichero: js/componentes/pantalla-completa.js */
