/*
 * MeteoArchidona · Mi web · configurar el dashboard de una pestaña
 *
 * Va en Mi cuenta → Mi web, dentro de la ficha de cada pestaña (José,
 * 22-11-2026: la pestaña del menú solo enseña lo que ha creado, como una
 * sección más; la configuración se hace aquí):
 *
 * - Formato de la pantalla: móvil por debajo de 850 px. Desde el móvil se
 *   configura el de móvil y desde el PC el de PC (José, 5-11-2026).
 * - Selector con los dashboards de ese formato (los de MeteoArchidona y
 *   los suyos) y «Fijar»; «Quitar» deja la pestaña vacía.
 * - «Crear dashboard» y «Copiar» el elegido; «Editar» y «Borrar» si es
 *   suyo, con el editor común (js/dashboards/editor.js). Uno nuevo se fija
 *   en la pestaña al guardarlo.
 *
 * Límites de la API: tres pestañas y 20 dashboards suyos.
 * El texto nunca se mete como HTML.
 */

import {avisarCambio, crear, llamar} from "./comun.js?v=20261117-miweb1";
import {abrirEditor} from "../dashboards/editor.js?v=20261121-llenar1";


const CORTE_MOVIL = "(max-width: 850px)";
const NOMBRE_FORMATO = {PC: "PC", MOVIL: "móvil"};


function formatoActual() {
    return window.matchMedia(CORTE_MOVIL).matches ? "MOVIL" : "PC";
}


function boton(texto, clase, accion) {
    const nodo = crear("button", `mi-web-boton ${clase || ""}`.trim(), texto);
    nodo.type = "button";
    nodo.addEventListener("click", accion);
    return nodo;
}


/**
 * Monta la configuración del dashboard de una pestaña en «destino».
 * «alCambiar» se llama cuando cambia lo fijado o la lista de dashboards.
 */
export async function montarConfiguracion(destino, pestana, alCambiar) {
    const estado = {
        formato: formatoActual(),
        disponibles: [],
        fijado: null,
        elegido: "",
        editando: false
    };

    const aviso = crear("div", "mi-web-estado");
    aviso.setAttribute("role", "status");
    aviso.setAttribute("aria-live", "polite");
    const zona = crear("div", "mi-web-configurar-zona");
    destino.replaceChildren(aviso, zona);

    function avisar(texto, tipo) {
        aviso.textContent = texto || "";
        aviso.dataset.tipo = tipo || "";
    }

    function elegidoActual() {
        return estado.disponibles.find(d => d.identificador === estado.elegido) || null;
    }

    async function cambiado() {
        avisarCambio();
        if (alCambiar) {
            try {
                await alCambiar();
            } catch {
                // Solo refresca el resumen de la ficha; no es grave.
            }
        }
    }

    function pintar() {
        zona.replaceChildren();
        const barra = crear("div", "mi-web-barra");

        const etiqueta = crear("label", "mi-web-campo", `Dashboard de ${NOMBRE_FORMATO[estado.formato]}`);
        const selector = crear("select");
        selector.id = `miWebSelector${pestana.identificador}`;
        etiqueta.htmlFor = selector.id;
        selector.appendChild(new Option("Elige un dashboard…", ""));

        const grupos = [
            ["De MeteoArchidona", estado.disponibles.filter(d => !d.propio)],
            ["Míos", estado.disponibles.filter(d => d.propio)]
        ];
        for (const [nombre, lista] of grupos) {
            if (!lista.length) continue;
            const grupo = document.createElement("optgroup");
            grupo.label = nombre;
            for (const dashboard of lista) {
                const marca = estado.fijado && dashboard.identificador === estado.fijado.identificador ? " (fijado)" : "";
                grupo.appendChild(new Option(`${dashboard.titulo} — ${dashboard.descripcion}${marca}`, dashboard.identificador));
            }
            selector.appendChild(grupo);
        }
        selector.value = estado.elegido;
        selector.addEventListener("change", () => {
            estado.elegido = selector.value;
            pintar();
        });

        const elegido = elegidoActual();
        const acciones = crear("div", "mi-web-acciones");

        const fijar = boton("Fijar", "mi-web-boton-principal", () => fijarEn(estado.elegido));
        fijar.disabled = !elegido || Boolean(estado.fijado && elegido.identificador === estado.fijado.identificador);
        acciones.appendChild(fijar);
        if (estado.fijado) {
            acciones.appendChild(boton("Quitar", "", () => fijarEn(null)));
        }
        acciones.appendChild(boton("Crear dashboard", "", () => editar(null, false)));
        if (elegido) {
            acciones.appendChild(boton("Copiar", "", () => editar(elegido.identificador, true)));
        }
        if (elegido && elegido.propio) {
            acciones.appendChild(boton("Editar", "", () => editar(elegido.identificador, false)));
            acciones.appendChild(boton("Borrar", "mi-web-boton-peligro", () => borrar(elegido)));
        }

        const nota = crear("p", "mi-web-configurar-nota",
            "Desde el móvil se configura el dashboard de móvil y desde el PC el de PC.");

        barra.append(etiqueta, selector, acciones, nota);
        zona.appendChild(barra);
    }

    async function cargar() {
        const [contenido, disponibles] = await Promise.all([
            llamar("GET", `/usuarios/mi-web/${pestana.identificador}/contenido?formato=${estado.formato}`),
            llamar("GET", `/dashboards?formato=${estado.formato}`)
        ]);
        estado.fijado = contenido.dashboard;
        estado.disponibles = disponibles;
        if (!estado.elegido || !disponibles.some(d => d.identificador === estado.elegido)) {
            estado.elegido = estado.fijado ? estado.fijado.identificador : "";
        }
        if (!estado.editando) {
            pintar();
        }
    }

    async function fijarEn(identificador) {
        try {
            await llamar("PUT", `/usuarios/mi-web/${pestana.identificador}/dashboard`, {
                formato: estado.formato,
                dashboard: identificador || null
            });
            await cargar();
            await cambiado();
            avisar(identificador ? "Fijado en esta pestaña." : "La pestaña se queda vacía.", "ok");
        } catch (error) {
            avisar(error.message, "error");
        }
    }

    async function borrar(dashboard) {
        if (!window.confirm(`¿Borrar «${dashboard.titulo}»? No se puede deshacer; las pestañas que lo tengan fijado se quedarán vacías.`)) {
            return;
        }
        try {
            await llamar("DELETE", `/dashboards/${dashboard.identificador}`);
            estado.elegido = "";
            await cargar();
            await cambiado();
            avisar(`Borrado «${dashboard.titulo}».`, "ok");
        } catch (error) {
            avisar(error.message, "error");
        }
    }

    async function editar(identificador, copia) {
        let dashboard = null;
        try {
            if (identificador) {
                dashboard = await llamar("GET", `/dashboards/${identificador}`);
            }
        } catch (error) {
            avisar(error.message, "error");
            return;
        }

        estado.editando = true;
        avisar("");
        zona.replaceChildren();
        const panel = crear("section", "mi-web-editor");
        panel.appendChild(crear("h3", "mi-web-subtitulo",
            !dashboard ? "Nuevo dashboard" : copia ? `Copia de «${dashboard.titulo}»` : `Editar «${dashboard.titulo}»`));
        const hueco = crear("div");
        panel.appendChild(hueco);
        zona.appendChild(panel);

        await abrirEditor(hueco, {
            dashboard,
            copia,
            formato: estado.formato,
            guardar: async datos => {
                if (dashboard && !copia) {
                    const {formato: _, ...cambio} = datos;
                    await llamar("PUT", `/dashboards/${dashboard.identificador}`, cambio);
                    estado.elegido = dashboard.identificador;
                } else {
                    const nuevo = await llamar("POST", "/dashboards", datos);
                    // Uno nuevo se fija en esta pestaña al guardarlo.
                    await llamar("PUT", `/usuarios/mi-web/${pestana.identificador}/dashboard`, {
                        formato: nuevo.formato,
                        dashboard: nuevo.identificador
                    });
                    estado.elegido = nuevo.identificador;
                }
                estado.editando = false;
                await cargar();
                await cambiado();
                avisar(`Guardado «${datos.titulo}».`, "ok");
                destino.scrollIntoView({behavior: "smooth", block: "start"});
            },
            cancelar: () => {
                estado.editando = false;
                pintar();
            }
        });
        panel.scrollIntoView({behavior: "smooth", block: "start"});
    }

    avisar("Cargando…");
    try {
        await cargar();
        avisar("");
    } catch (error) {
        avisar(error.message || "No se ha podido cargar.", "error");
    }
}


/* Fin de fichero: js/mi-web/configurar.js */
