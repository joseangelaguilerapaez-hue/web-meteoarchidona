/*
 * MeteoArchidona
 * Administración · Alertas (alertas meteorológicas). No confundir con los
 * avisos de la web (eclipses, tormentas próximas…), que son otra cosa.
 *
 * Decisiones de José del 11-11-2026 (docs/alertas-meteorologicas.md de
 * la API):
 *
 * - Una tarjeta por semáforo (Lluvia, Tormenta, Viento, Calor, Frío y
 *   Nieve) con lo que dice AEMET, vuestro nivel y lo que sale en la web.
 * - Corregir: se elige el color (verde, amarillo, naranja, fucsia o
 *   rojo), un motivo opcional (solo para Administración) y, si AEMET no
 *   tiene alerta de ese fenómeno, hasta cuándo dura (24 horas de entrada).
 *   Si AEMET lo tiene, dura hasta el fin de la alerta de AEMET.
 * - Alertas propias (José, 12-11-2026): sin alerta de AEMET, también una
 *   hora de inicio opcional. Siempre, un texto público opcional que ve el
 *   visitante en la ficha (el motivo sigue siendo interno).
 * - Regla B: la corrección manda salvo que AEMET suba después por encima
 *   del nivel que tenía al corregir y del vuestro; lo aplica la API.
 * - Historial de correcciones y últimas descargas de AEMET.
 *
 * GET /admin/alertas · POST /admin/alertas/correcciones ·
 * DELETE /admin/alertas/correcciones/{fenomeno} ·
 * GET /admin/alertas/correcciones · GET /admin/alertas/cargas
 *
 * Las horas, en hora de Madrid. El texto nunca se mete como HTML.
 */

import {
    $,
    mostrarEstado
} from "./estado.js?v=20261026-cache1";

import {
    peticionJson
} from "./api.js?v=20261026-cache1";


const RUTA = "/admin/alertas";

const NIVELES = [
    ["SIN_AVISO", "Verde"],
    ["AMARILLO", "Amarillo"],
    ["NARANJA", "Naranja"],
    ["FUCSIA", "Fucsia"],
    ["ROJO", "Rojo"],
];

const NOMBRE_NIVEL = Object.fromEntries(NIVELES);

const CIERRES = {
    QUITADA: "Quitada",
    SUPERADA_AEMET: "AEMET subió por encima",
    SUSTITUIDA: "Sustituida por otra",
};

const HORA = new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
});

let configurado = false;


function crear(etiqueta, clase, texto) {
    const nodo = document.createElement(etiqueta);
    if (clase) nodo.className = clase;
    if (texto !== undefined && texto !== null) nodo.textContent = texto;
    return nodo;
}


function hora(texto) {
    if (!texto) return "—";
    const fecha = new Date(texto);
    return Number.isNaN(fecha.getTime()) ? "—" : HORA.format(fecha);
}


function pastilla(nivel) {
    return crear("span", `adm-alertas-pastilla adm-alertas-nivel-${nivel}`, NOMBRE_NIVEL[nivel] || nivel);
}


/* Valor para <input type="datetime-local"> con la hora del navegador. */
function valorFechaLocal(fecha) {
    const desfase = fecha.getTimezoneOffset() * 60000;
    return new Date(fecha.getTime() - desfase).toISOString().slice(0, 16);
}


/* ----------------------------------------------------------------------
   Tarjetas
   ---------------------------------------------------------------------- */

function tarjeta(semaforo) {
    const caja = crear("article", "adm-alertas-tarjeta");

    const cabecera = crear("div", "adm-alertas-cabecera");
    cabecera.appendChild(crear("h3", "adm-alertas-nombre", semaforo.nombre));
    const web = crear("span", "adm-alertas-web", "En la web ");
    web.appendChild(pastilla(semaforo.nivel));
    cabecera.appendChild(web);
    caja.appendChild(cabecera);

    const aemet = crear("div", "adm-alertas-aemet");
    aemet.appendChild(crear("span", "adm-alertas-etiqueta", "AEMET"));

    if (semaforo.avisos.length) {
        for (const aviso of semaforo.avisos) {
            const linea = crear("div", "adm-alertas-aviso");
            linea.appendChild(pastilla(aviso.nivel));
            const texto = crear("div");
            texto.appendChild(crear("div", null, aviso.descripcion || aviso.titulo));
            texto.appendChild(crear("div", "adm-alertas-hora", `${hora(aviso.inicio)} → ${hora(aviso.fin)}`));
            linea.appendChild(texto);
            aemet.appendChild(linea);
        }
    } else {
        const linea = crear("div", "adm-alertas-aviso");
        linea.appendChild(pastilla("SIN_AVISO"));
        linea.appendChild(crear("span", null, "Sin alerta"));
        aemet.appendChild(linea);
    }
    caja.appendChild(aemet);

    caja.appendChild(crear("div", "adm-alertas-etiqueta", "Vuestro nivel"));
    const botones = crear("div", "adm-alertas-botones");
    const correccion = semaforo.correccion;

    for (const [nivel, nombre] of NIVELES) {
        const boton = crear("button", `adm-alertas-color adm-alertas-nivel-${nivel}`);
        boton.type = "button";
        boton.title = nombre;
        boton.setAttribute("aria-label", `Poner ${semaforo.nombre} en ${nombre.toLowerCase()}`);
        if (correccion && correccion.nivel === nivel) {
            boton.classList.add("adm-alertas-elegido");
            boton.setAttribute("aria-pressed", "true");
        }
        boton.addEventListener("click", () => abrirFormulario(caja, semaforo, nivel));
        botones.appendChild(boton);
    }

    if (correccion) {
        const quitar = crear("button", "boton boton-secundario adm-alertas-quitar", "Quitar");
        quitar.type = "button";
        quitar.addEventListener("click", () => quitarCorreccion(semaforo));
        botones.appendChild(quitar);
    }
    caja.appendChild(botones);

    if (correccion) {
        const info = crear("div", "adm-alertas-info");
        info.appendChild(crear("div", null, correccion.propia
            ? `Alerta de MeteoArchidona · ${correccion.autor}`
            : `Corregido por ${correccion.autor} · AEMET tenía `
                + `${(NOMBRE_NIVEL[correccion.nivel_aemet_al_corregir] || "").toLowerCase()}`));
        info.appendChild(crear("div", null,
            `Desde ${hora(correccion.inicio)} hasta ${hora(correccion.fin)}`
            + `${correccion.fin_manual ? "" : " (fin de la alerta de AEMET)"}`));
        if (correccion.texto_publico) {
            info.appendChild(crear("div", "adm-alertas-texto", `Público: ${correccion.texto_publico}`));
        }
        if (correccion.motivo) {
            info.appendChild(crear("div", "adm-alertas-motivo", `Motivo: ${correccion.motivo}`));
        }
        caja.appendChild(info);
    }

    caja.appendChild(crear("div", "adm-alertas-formulario-hueco"));
    return caja;
}


function abrirFormulario(caja, semaforo, nivel) {
    const hueco = caja.querySelector(".adm-alertas-formulario-hueco");
    hueco.textContent = "";

    const formulario = crear("form", "adm-alertas-formulario");

    const titulo = crear("div", "adm-alertas-form-titulo", `${semaforo.nombre} en `);
    titulo.appendChild(pastilla(nivel));
    formulario.appendChild(titulo);

    const sinAemet = semaforo.avisos.length === 0;
    let campoFin = null;

    let campoDesde = null;

    if (sinAemet) {
        formulario.appendChild(crear("div", "adm-alertas-hora", "AEMET no tiene alerta de este fenómeno: será una alerta de MeteoArchidona."));
        const etiquetaDesde = crear("label", "adm-alertas-campo", "Desde (opcional; vacío, desde ahora)");
        campoDesde = document.createElement("input");
        campoDesde.type = "datetime-local";
        etiquetaDesde.appendChild(campoDesde);
        formulario.appendChild(etiquetaDesde);

        const etiqueta = crear("label", "adm-alertas-campo", "Hasta ");
        campoFin = document.createElement("input");
        campoFin.type = "datetime-local";
        campoFin.required = true;
        campoFin.value = valorFechaLocal(new Date(Date.now() + 24 * 3600 * 1000));
        etiqueta.appendChild(campoFin);
        formulario.appendChild(etiqueta);
    } else {
        formulario.appendChild(crear("div", "adm-alertas-hora", "Hasta el fin de la alerta de AEMET (se alarga si AEMET la alarga)."));
    }

    const etiquetaTexto = crear("label", "adm-alertas-campo", "Texto para el público (opcional, sale en la ficha)");
    const textoPublico = document.createElement("textarea");
    textoPublico.rows = 2;
    textoPublico.maxLength = 1000;
    textoPublico.placeholder = "Tormentas fuertes con granizo esta tarde en la comarca";
    etiquetaTexto.appendChild(textoPublico);
    formulario.appendChild(etiquetaTexto);

    const etiquetaMotivo = crear("label", "adm-alertas-campo", "Motivo (opcional, solo Administración)");
    const motivo = document.createElement("textarea");
    motivo.rows = 2;
    motivo.maxLength = 1000;
    motivo.placeholder = "Los foros avisan de un tren convectivo";
    etiquetaMotivo.appendChild(motivo);
    formulario.appendChild(etiquetaMotivo);

    const error = crear("div", "adm-alertas-error");
    error.setAttribute("role", "alert");
    formulario.appendChild(error);

    const acciones = crear("div", "adm-alertas-acciones");
    const guardar = crear("button", "boton boton-principal", "Guardar");
    guardar.type = "submit";
    const cancelar = crear("button", "boton boton-secundario", "Cancelar");
    cancelar.type = "button";
    cancelar.addEventListener("click", () => { hueco.textContent = ""; });
    acciones.append(guardar, cancelar);
    formulario.appendChild(acciones);

    formulario.addEventListener("submit", async evento => {
        evento.preventDefault();
        error.textContent = "";

        const datos = {
            fenomeno: semaforo.fenomeno,
            nivel,
            motivo: motivo.value.trim() || null,
            texto: textoPublico.value.trim() || null,
        };

        if (campoFin) {
            const fin = new Date(campoFin.value);
            if (!campoFin.value || Number.isNaN(fin.getTime())) {
                error.textContent = "Indica hasta cuándo dura.";
                return;
            }
            if (fin.getTime() <= Date.now()) {
                error.textContent = "La hora de fin debe ser posterior a ahora.";
                return;
            }
            datos.fin = fin.toISOString();

            if (campoDesde && campoDesde.value) {
                const desde = new Date(campoDesde.value);
                if (Number.isNaN(desde.getTime())) {
                    error.textContent = "La hora de inicio no es válida.";
                    return;
                }
                if (desde >= fin) {
                    error.textContent = "La hora de fin debe ser posterior a la de inicio.";
                    return;
                }
                datos.inicio = desde.toISOString();
            }
        }

        guardar.disabled = true;
        try {
            await peticionJson(`${RUTA}/correcciones`, {method: "POST", body: JSON.stringify(datos)});
            mostrarEstado($("estadoAlertas"), `${semaforo.nombre}: corrección guardada.`, "ok");
            await cargarAlertas();
        } catch (fallo) {
            guardar.disabled = false;
            error.textContent = fallo.message || "No se ha podido guardar.";
        }
    });

    hueco.appendChild(formulario);
    (campoFin || motivo).focus();
}


async function quitarCorreccion(semaforo) {
    if (!window.confirm(`¿Quitar la corrección de ${semaforo.nombre}? Volverá a mandar AEMET.`)) {
        return;
    }
    try {
        await peticionJson(`${RUTA}/correcciones/${semaforo.fenomeno}`, {method: "DELETE"});
        mostrarEstado($("estadoAlertas"), `${semaforo.nombre}: corrección quitada.`, "ok");
        await cargarAlertas();
    } catch (error) {
        mostrarEstado($("estadoAlertas"), error.message || "No se ha podido quitar.", "error");
    }
}


/* ----------------------------------------------------------------------
   Historial y cargas
   ---------------------------------------------------------------------- */

function pintarHistorial(correcciones) {
    const lista = $("historialAlertas");
    lista.textContent = "";

    if (!correcciones.length) {
        lista.appendChild(crear("li", "adm-alertas-vacio", "Todavía no hay correcciones."));
        return;
    }

    for (const correccion of correcciones) {
        const fila = crear("li", "adm-alertas-fila");
        const nombre = correccion.fenomeno.charAt(0) + correccion.fenomeno.slice(1).toLowerCase();
        const cabecera = crear("div");
        cabecera.appendChild(crear("strong", null, `${nombre === "Frio" ? "Frío" : nombre} `));
        cabecera.appendChild(pastilla(correccion.nivel));
        cabecera.appendChild(crear("span", "adm-alertas-hora",
            ` AEMET: ${(NOMBRE_NIVEL[correccion.nivel_aemet_al_corregir] || "").toLowerCase()} · ${correccion.autor} · ${hora(correccion.inicio)}`));
        fila.appendChild(cabecera);

        const estado = correccion.cierre
            ? `${CIERRES[correccion.motivo_cierre] || correccion.motivo_cierre} · ${hora(correccion.cierre)}`
            : (new Date(correccion.fin) > new Date() ? `Vigente hasta ${hora(correccion.fin)}` : `Terminó ${hora(correccion.fin)}`);
        fila.appendChild(crear("div", "adm-alertas-hora", estado));

        if (correccion.texto_publico) {
            fila.appendChild(crear("div", "adm-alertas-texto", `Público: ${correccion.texto_publico}`));
        }
        if (correccion.motivo) {
            fila.appendChild(crear("div", "adm-alertas-motivo", correccion.motivo));
        }
        lista.appendChild(fila);
    }
}


function pintarCargas(cargas) {
    const lista = $("cargasAlertas");
    lista.textContent = "";

    for (const carga of cargas) {
        const fila = crear("li", `adm-alertas-fila adm-alertas-carga-${carga.estado}`);
        fila.appendChild(crear("div", null, `${hora(carga.inicio)} · ${carga.estado}`));
        fila.appendChild(crear("div", "adm-alertas-hora", carga.mensaje || ""));
        lista.appendChild(fila);
    }

    const ultima = cargas.find(carga => carga.estado === "CORRECTA");
    $("horaAlertas").textContent = ultima ? `AEMET leído ${hora(ultima.fin || ultima.inicio)}` : "Sin cargas correctas de AEMET";
}


/* ----------------------------------------------------------------------
   Entrada
   ---------------------------------------------------------------------- */

export async function cargarAlertas() {
    const [semaforos, correcciones, cargas] = await Promise.all([
        peticionJson(RUTA),
        peticionJson(`${RUTA}/correcciones?limite=30`),
        peticionJson(`${RUTA}/cargas?limite=5`),
    ]);

    const tarjetas = $("tarjetasAlertas");
    tarjetas.textContent = "";
    for (const semaforo of semaforos) {
        tarjetas.appendChild(tarjeta(semaforo));
    }

    pintarHistorial(correcciones);
    pintarCargas(cargas);
}


export function configurarEventosAlertas() {
    if (configurado) return;
    configurado = true;

    $("botonRecargarAlertas")?.addEventListener("click", async () => {
        try {
            await cargarAlertas();
            mostrarEstado($("estadoAlertas"), "Alertas actualizadas.", "ok");
        } catch (error) {
            mostrarEstado($("estadoAlertas"), error.message || "No se han podido cargar las alertas.", "error");
        }
    });
}


/* Fin de fichero: js/administracion/alertas.js */
