/*
 * MeteoArchidona
 * Auditoría de uso y consentimiento
 *
 * Se carga en todas las páginas públicas (no en Administración).
 *
 * 0. Página vista anónima. En cada carga, acepte o no el visitante,
 *    se envía solo el código de la página a /auditoria/vistas para
 *    contar el tráfico total (decisión de José del 24-10-2026): sin
 *    identificador y sin leer ni guardar nada en el navegador.
 *
 * 1. Consentimiento. Muestra el aviso la primera vez y cada 12 meses.
 *    Mientras no se pulse «Aceptar» no se envía nada más ni se guarda
 *    nada salvo la propia elección (ma_consentimiento), que es técnica.
 *    «Privacidad» (pie) y «Más información» (aviso) abren la ventana
 *    de componentes/privacidad.html, desde la que se cambia la elección.
 *
 * 2. Envío de eventos a la API (api-meteoarchidona, docs/auditoria.md
 *    4.3): abre o reutiliza la sesión, registra ACCESO al entrar y
 *    SALIDA al irse, y manda los eventos en lotes. Al cerrar la página
 *    usa navigator.sendBeacon con texto plano.
 *
 * 3. Visualizaciones declarativas: cualquier elemento con
 *    data-auditoria-visualizacion="COMPONENTE" registra VISUALIZACION
 *    una vez por carga de página cuando ha estado visible al menos un
 *    50 % durante 5 segundos con la pestaña activa.
 *
 * Para el resto de la web (también desde los visores en iframe, que
 * son del mismo origen) queda:
 *
 *     window.MeteoAuditoria.registrar(componente, evento, datos)
 *     window.MeteoAuditoria.activa()
 *     window.MeteoAuditoria.abrirPrivacidad()
 *
 * registrar() no hace nada sin consentimiento. Un fallo de la
 * auditoría nunca debe romper la página: todo va protegido.
 */

(function () {
"use strict";

// ==========================================================
// CONFIGURACIÓN
// ==========================================================

const CLAVE_CONSENTIMIENTO = "ma_consentimiento";
const CLAVE_VISITANTE = "ma_visitor_id";
const CLAVE_SESION = "ma_session_id";

const VERSION_POLITICA = 1;
const DIAS_VALIDEZ_ELECCION = 365;

// Debe coincidir con MINUTOS_INACTIVIDAD de la API.
const MINUTOS_INACTIVIDAD = 30;

const MAXIMO_LOTE = 50;
const ENVIAR_CADA_MS = 10000;

const UMBRAL_VISIBLE = 0.5;
const SEGUNDOS_VISIBLE = 5;

const RUTA_PRIVACIDAD = "/componentes/privacidad.html";

const PAGINAS = {
    "actualidad": "ACTUALIDAD",
    "observaciones": "OBSERVACIONES",
    "prediccion": "PREDICCION",
    "informacion": "INFORMACION",
    "en-vivo": "EN_VIVO",
};

const pagina = PAGINAS[document.body?.dataset?.seccion || ""];

if (!pagina) {
    // Administración u otra página fuera de la analítica pública.
    return;
}

function api() {
    return (window.API_BASE || "/api") + "/auditoria";
}


// ==========================================================
// ALMACENAMIENTO
// ==========================================================

function leer(clave) {
    try {
        const valor = window.localStorage.getItem(clave);
        return valor ? JSON.parse(valor) : null;
    } catch (error) {
        return null;
    }
}

function guardar(clave, valor) {
    try {
        window.localStorage.setItem(clave, JSON.stringify(valor));
    } catch (error) {
        // Sin almacenamiento la web funciona igual.
    }
}

function borrar(clave) {
    try {
        window.localStorage.removeItem(clave);
    } catch (error) {
        // Nada que hacer.
    }
}


// ==========================================================
// CONSENTIMIENTO
// ==========================================================

function eleccionVigente() {
    const eleccion = leer(CLAVE_CONSENTIMIENTO);

    if (!eleccion || eleccion.version !== VERSION_POLITICA) {
        return null;
    }

    const fecha = Date.parse(eleccion.fecha);
    const caduca = fecha + DIAS_VALIDEZ_ELECCION * 86400000;

    if (!Number.isFinite(fecha) || Date.now() > caduca) {
        return null;
    }

    return eleccion.decision === "aceptado" || eleccion.decision === "rechazado"
        ? eleccion.decision
        : null;
}

function activa() {
    return eleccionVigente() === "aceptado";
}

function decidir(decision) {
    const antes = eleccionVigente();

    guardar(CLAVE_CONSENTIMIENTO, {
        decision,
        fecha: new Date().toISOString(),
        version: VERSION_POLITICA,
    });

    cerrarAviso();
    actualizarPreferencias();

    if (decision === "aceptado" && antes !== "aceptado") {
        iniciar();
    }

    if (decision === "rechazado" && antes === "aceptado") {
        retirar();
    }
}


// ==========================================================
// AVISO
// ==========================================================

let aviso = null;

function mostrarAviso() {
    if (aviso) {
        return;
    }

    aviso = document.createElement("section");
    aviso.className = "aviso-privacidad";
    aviso.setAttribute("role", "region");
    aviso.setAttribute("aria-labelledby", "aviso-privacidad-titulo");

    aviso.innerHTML = `
        <h2 id="aviso-privacidad-titulo">Tu privacidad en MeteoArchidona</h2>
        <p>
            Queremos saber cómo se usa la web para mejorarla: qué páginas y cámaras
            se consultan, desde qué tipo de dispositivo y desde qué zona aproximada.
            Para ello guardaríamos en tu navegador un identificador aleatorio y
            registraríamos tu dirección IP y tu navegación por la web. Son
            estadísticas propias: no usamos Google Analytics ni compartimos estos
            datos con nadie, ni los usamos para publicidad.
        </p>
        <p>
            Si no aceptas, la web funciona exactamente igual: solo sumamos uno al contador de visitas de cada página, sin guardar ningún dato tuyo ni nada en tu navegador.
        </p>
        <div class="aviso-privacidad-botones">
            <button type="button" class="aviso-boton" data-consentimiento="aceptar">Aceptar</button>
            <button type="button" class="aviso-boton" data-consentimiento="rechazar">Rechazar</button>
            <button type="button" class="aviso-enlace" data-privacidad>Más información</button>
        </div>
    `;

    document.body.appendChild(aviso);
}

function cerrarAviso() {
    aviso?.remove();
    aviso = null;
}


// ==========================================================
// VENTANA DE PRIVACIDAD
// ==========================================================

let ventana = null;

async function abrirPrivacidad() {
    if (!ventana) {
        ventana = document.createElement("dialog");
        ventana.className = "ventana-privacidad";
        ventana.setAttribute("aria-labelledby", "privacidad-titulo");

        try {
            const respuesta = await fetch(RUTA_PRIVACIDAD);

            if (!respuesta.ok) {
                throw new Error(`Privacidad respondió ${respuesta.status}`);
            }

            ventana.innerHTML = await respuesta.text();
        } catch (error) {
            console.error("No se ha podido cargar la privacidad:", error);
            ventana.innerHTML = `
                <p>No se ha podido cargar la información de privacidad.
                Escríbenos a infometeoarchidona@meteoarchidona.com.</p>
                <button type="button" class="aviso-boton" data-privacidad-cerrar>Cerrar</button>`;
        }

        ventana.addEventListener("click", (evento) => {
            // Un clic fuera del contenido (en el fondo) cierra.
            if (evento.target === ventana) {
                ventana.close();
            }
        });

        document.body.appendChild(ventana);
    }

    actualizarPreferencias();

    if (!ventana.open) {
        ventana.showModal();
    }
}

function actualizarPreferencias() {
    if (!ventana) {
        return;
    }

    const estado = ventana.querySelector("[data-privacidad-estado]");
    const bloque = ventana.querySelector("[data-privacidad-identificador]");
    const decision = eleccionVigente();

    if (estado) {
        estado.textContent =
            decision === "aceptado"
                ? "Has aceptado las estadísticas."
                : decision === "rechazado"
                    ? "Has rechazado las estadísticas: solo contamos la visita a cada página, de forma anónima."
                    : "Todavía no has elegido.";
    }

    const visitante = leer(CLAVE_VISITANTE);

    if (bloque) {
        bloque.hidden = !(decision === "aceptado" && visitante);
        const codigo = bloque.querySelector("code");

        if (codigo) {
            codigo.textContent = visitante || "";
        }
    }

    for (const boton of ventana.querySelectorAll("[data-consentimiento]")) {
        const valor = boton.dataset.consentimiento === "aceptar" ? "aceptado" : "rechazado";
        boton.setAttribute("aria-pressed", String(decision === valor));
    }
}

document.addEventListener("click", (evento) => {
    const objetivo = evento.target instanceof Element ? evento.target : null;

    if (!objetivo) {
        return;
    }

    const boton = objetivo.closest("[data-consentimiento]");

    if (boton) {
        decidir(boton.dataset.consentimiento === "aceptar" ? "aceptado" : "rechazado");
        return;
    }

    if (objetivo.closest("[data-privacidad]")) {
        evento.preventDefault();
        abrirPrivacidad();
        return;
    }

    if (objetivo.closest("[data-privacidad-cerrar]")) {
        ventana?.close();
    }
});


// ==========================================================
// SESIÓN
// ==========================================================

let sesion = null;
let iniciando = null;

function sesionGuardadaVigente() {
    const guardada = leer(CLAVE_SESION);

    if (!guardada || !guardada.id || !guardada.ultima) {
        return null;
    }

    const limite = guardada.ultima + MINUTOS_INACTIVIDAD * 60000;

    return Date.now() < limite ? guardada.id : null;
}

function tocarSesion() {
    if (sesion) {
        guardar(CLAVE_SESION, { id: sesion, ultima: Date.now() });
    }
}

function entorno() {
    const parametros = new URLSearchParams(window.location.search);
    const campana = {};

    for (const clave of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
        const valor = parametros.get(clave);

        if (valor) {
            campana[clave] = valor.slice(0, 100);
        }
    }

    let zona = null;

    try {
        zona = Intl.DateTimeFormat().resolvedOptions().timeZone || null;
    } catch (error) {
        zona = null;
    }

    const dimension = (valor) =>
        Number.isFinite(valor) && valor >= 0 && valor <= 20000 ? Math.round(valor) : null;

    return {
        idioma: (navigator.language || "").slice(0, 35) || null,
        zona_horaria: zona ? zona.slice(0, 64) : null,
        procedencia: (document.referrer || "").slice(0, 2048) || null,
        campana: Object.keys(campana).length ? campana : null,
        ancho_pantalla: dimension(window.screen?.width),
        alto_pantalla: dimension(window.screen?.height),
        ancho_ventana: dimension(window.innerWidth),
        alto_ventana: dimension(window.innerHeight),
        pantalla_tactil: (navigator.maxTouchPoints || 0) > 0,
        modo_oscuro: window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? null,
    };
}

async function abrirSesion() {
    const respuesta = await fetch(`${api()}/sesiones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            visitante: leer(CLAVE_VISITANTE),
            entorno: entorno(),
        }),
    });

    if (!respuesta.ok) {
        throw new Error(`La auditoría respondió ${respuesta.status}`);
    }

    const datos = await respuesta.json();

    guardar(CLAVE_VISITANTE, datos.visitante);
    sesion = datos.sesion;
    tocarSesion();
}

function asegurarSesion(forzarNueva = false) {
    if (!forzarNueva && sesion) {
        return Promise.resolve();
    }

    if (!forzarNueva) {
        const guardada = sesionGuardadaVigente();

        if (guardada) {
            sesion = guardada;
            return Promise.resolve();
        }
    }

    if (!iniciando) {
        iniciando = abrirSesion().finally(() => {
            iniciando = null;
        });
    }

    return iniciando;
}


// ==========================================================
// COLA Y ENVÍO
// ==========================================================

let cola = [];
let temporizador = null;
let enviando = false;

function registrar(componente, evento, datos) {
    try {
        if (!activa()) {
            return;
        }

        cola.push({
            pagina,
            componente: componente || null,
            evento,
            fecha: new Date().toISOString(),
            datos: datos || null,
        });

        if (cola.length >= MAXIMO_LOTE) {
            enviar();
        }
    } catch (error) {
        console.warn("Auditoría:", error);
    }
}

async function enviar(reintento = false) {
    if (enviando || !cola.length || !activa()) {
        return;
    }

    enviando = true;
    const lote = cola.splice(0, MAXIMO_LOTE);

    try {
        await asegurarSesion();

        const respuesta = await fetch(`${api()}/eventos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sesion, eventos: lote }),
        });

        if (respuesta.status === 404 || respuesta.status === 409) {
            // Sesión desconocida o caducada: se abre otra y se reintenta una vez.
            sesion = null;
            borrar(CLAVE_SESION);

            if (!reintento) {
                cola = lote.concat(cola);
                await asegurarSesion(true);
                enviando = false;
                return enviar(true);
            }
        } else if (respuesta.status === 422) {
            // Lote no válido: se descarta para no repetirlo sin fin.
            console.warn("Auditoría: lote rechazado", await respuesta.text());
        } else if (!respuesta.ok) {
            throw new Error(`La auditoría respondió ${respuesta.status}`);
        } else {
            tocarSesion();
        }
    } catch (error) {
        // Sin conexión o API caída: se devuelve a la cola para otro intento.
        cola = lote.concat(cola).slice(0, MAXIMO_LOTE * 4);
        console.warn("Auditoría:", error);
    } finally {
        enviando = false;
    }
}

function enviarAlSalir() {
    if (!activa() || !cola.length || !sesion || !navigator.sendBeacon) {
        return;
    }

    const lote = cola.splice(0, MAXIMO_LOTE);
    const cuerpo = JSON.stringify({ sesion, eventos: lote });

    // Texto plano: no necesita permiso CORS previo y la API lo admite.
    if (navigator.sendBeacon(`${api()}/eventos`, cuerpo)) {
        tocarSesion();
    } else {
        cola = lote.concat(cola);
    }
}


// ==========================================================
// VISUALIZACIONES
// ==========================================================

let observador = null;
let mutaciones = null;
const contadores = new Map();
const vistos = new WeakSet();

function alCambiarVisibilidad(entradas) {
    for (const entrada of entradas) {
        const elemento = entrada.target;

        if (vistos.has(elemento)) {
            continue;
        }

        clearTimeout(contadores.get(elemento));

        if (entrada.isIntersecting && entrada.intersectionRatio >= UMBRAL_VISIBLE) {
            contadores.set(elemento, setTimeout(() => {
                if (document.visibilityState !== "visible" || vistos.has(elemento)) {
                    return;
                }

                vistos.add(elemento);
                observador?.unobserve(elemento);
                registrar(elemento.dataset.auditoriaVisualizacion, "VISUALIZACION");
            }, SEGUNDOS_VISIBLE * 1000));
        }
    }
}

function observar(elemento) {
    if (observador && elemento.dataset?.auditoriaVisualizacion && !vistos.has(elemento)) {
        observador.observe(elemento);
    }
}

function vigilarVisualizaciones() {
    if (observador || !("IntersectionObserver" in window)) {
        return;
    }

    observador = new IntersectionObserver(alCambiarVisibilidad, {
        threshold: [0, UMBRAL_VISIBLE, 1],
    });

    document.querySelectorAll("[data-auditoria-visualizacion]").forEach(observar);

    // Elementos que se añaden después (fichas, listas que llegan de la API).
    mutaciones = new MutationObserver((cambios) => {
        for (const cambio of cambios) {
            for (const nodo of cambio.addedNodes) {
                if (!(nodo instanceof Element)) {
                    continue;
                }

                observar(nodo);
                nodo.querySelectorAll?.("[data-auditoria-visualizacion]").forEach(observar);
            }
        }
    });

    mutaciones.observe(document.body, { childList: true, subtree: true });
}

function dejarDeVigilar() {
    observador?.disconnect();
    mutaciones?.disconnect();
    observador = null;
    mutaciones = null;

    for (const temporizadorVisible of contadores.values()) {
        clearTimeout(temporizadorVisible);
    }

    contadores.clear();
}


// ==========================================================
// INICIO Y RETIRADA
// ==========================================================

let iniciada = false;

function iniciar() {
    if (iniciada || !activa()) {
        return;
    }

    iniciada = true;

    registrar(null, "ACCESO");
    enviar();

    temporizador = setInterval(enviar, ENVIAR_CADA_MS);
    vigilarVisualizaciones();
}

function retirar() {
    // Se deja de registrar en el acto. Lo enviado antes se conserva
    // hasta su plazo (política de privacidad).
    cola = [];
    clearInterval(temporizador);
    temporizador = null;
    dejarDeVigilar();
    iniciada = false;

    const actual = sesion || sesionGuardadaVigente();

    if (actual && navigator.sendBeacon) {
        navigator.sendBeacon(`${api()}/sesiones/${encodeURIComponent(actual)}/fin`);
    }

    sesion = null;
    borrar(CLAVE_SESION);
    borrar(CLAVE_VISITANTE);
}

window.addEventListener("pagehide", () => {
    if (!iniciada) {
        return;
    }

    registrar(null, "SALIDA");
    enviarAlSalir();
});

document.addEventListener("visibilitychange", () => {
    // En el móvil a menudo no llega pagehide: se envía lo pendiente al ocultar.
    if (iniciada && document.visibilityState === "hidden") {
        enviarAlSalir();
    }
});


// ==========================================================
// PÁGINA VISTA (ANÓNIMA)
// ==========================================================

function contarVista() {
    try {
        const cuerpo = JSON.stringify({ pagina });
        const destino = `${api()}/vistas`;

        // Texto plano: sin permiso CORS previo; la API lo admite.
        if (navigator.sendBeacon && navigator.sendBeacon(destino, cuerpo)) {
            return;
        }

        fetch(destino, {
            method: "POST",
            body: cuerpo,
            keepalive: true,
        }).catch(() => {});
    } catch (error) {
        // El contador nunca debe afectar a la página.
    }
}


// ==========================================================
// ARRANQUE
// ==========================================================

contarVista();

window.MeteoAuditoria = Object.freeze({
    registrar,
    activa,
    abrirPrivacidad,
});

const decision = eleccionVigente();

if (decision === "aceptado") {
    iniciar();
} else if (decision === null) {
    mostrarAviso();
}

})();

// Fin de fichero: js/auditoria.js
