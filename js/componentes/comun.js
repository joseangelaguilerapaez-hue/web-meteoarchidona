/*
 * MeteoArchidona · Componentes · piezas comunes
 *
 * Lo que comparten los componentes sacados de Actualidad y En vivo
 * (js/componentes/*.js): cargar su hoja de estilos y los scripts clásicos
 * de los que dependen (iconos del tiempo, sol y luna) si la página no los
 * tiene, y preparar el hueco.
 */

/* Carga una hoja si la página no tiene ya una con ese nombre. */
export function asegurarHoja(ruta) {
    const nombre = ruta.split("?")[0].split("/").pop();
    if (document.querySelector(`link[rel="stylesheet"][href*="${nombre}"]`)) {
        return;
    }
    const enlace = document.createElement("link");
    enlace.rel = "stylesheet";
    enlace.href = ruta;
    document.head.appendChild(enlace);
}

/*
 * Espera a que exista window[global], cargando el script clásico si la
 * página no lo trae. Si la página lo trae con defer y aún no se ha
 * ejecutado, espera a su carga. Nunca falla: si no llega, resuelve null.
 */
export function asegurarScript(ruta, global) {
    if (window[global]) {
        return Promise.resolve(window[global]);
    }
    const nombre = ruta.split("?")[0].split("/").pop();
    let script = document.querySelector(`script[src*="${nombre}"]`);
    if (!script) {
        script = document.createElement("script");
        script.src = ruta;
        document.head.appendChild(script);
    }
    return new Promise(resolver => {
        const listo = () => resolver(window[global] || null);
        script.addEventListener("load", listo, { once: true });
        script.addEventListener("error", () => resolver(null), { once: true });
        // Por si ya se había ejecutado entre la comprobación y aquí.
        setTimeout(() => { if (window[global]) listo(); }, 0);
    });
}

/* El hueco pasa a ser la tarjeta: sus clases y su contenido. */
export function prepararTarjeta(raiz, clases, marcado) {
    raiz.classList.add(...clases);
    raiz.innerHTML = marcado;
}


/* Fin de fichero: js/componentes/comun.js */
