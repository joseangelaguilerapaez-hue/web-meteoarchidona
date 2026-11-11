
"use strict";

/*
 * MeteoArchidona
 * Actualidad
 *
 * Orquestador principal de la página Actualidad.
 *
 * Responsabilidades:
 *
 * - coordinar el arranque de los módulos de Actualidad;
 * - cargar el componente reutilizable de ficha de estación;
 * - cargar y sincronizar el catálogo público;
 * - inicializar efectos visuales y controles;
 * - cargar las condiciones meteorológicas;
 * - recalcular la disposición de las fichas al cambiar el ancho;
 * - programar las actualizaciones periódicas;
 * - inicializar independientemente los timelapses públicos.
 */


/* ==========================================================
   ESTADO
   ========================================================== */


import {
    INTERVALO_CATALOGO_MS,
    INTERVALO_CONDICIONES_MS,
    INTERVALO_GOTAS_CRISTAL_MS,
    estadoActualidad,
    establecerTemporizadorResize
} from "./estado.js?v=20260914-modular2";


/* ==========================================================
   LLUVIA VISUAL
   ========================================================== */


import {
    actualizarSistemaLluvia,
    generarGotasCristalActivas,
    inicializarLluviaVisual
} from "./efectos-lluvia.js?v=20260914-modular2";


/* ==========================================================
   SIMULACIÓN
   ========================================================== */


import {
    actualizarIndicadorSimulacion,
    configurarControlesLluvia
} from "./simulacion.js?v=20260914-modular2";


/* ==========================================================
   PATROCINIOS
   ========================================================== */


import {
    configurarPatrocinios
} from "./patrocinios.js?v=20260914-modular2";


/* ==========================================================
   ESTACIONES
   ========================================================== */


import {
    cargarPlantillaFichaEstacion,
    capturarPlantillaFichaEstacion,
    sincronizarFichasEstaciones
} from "./estaciones.js?v=20261025-viento1";


/* ==========================================================
   API
   ========================================================== */


import {
    cargarCatalogoEstaciones,
    cargarCondiciones,
    refrescarCatalogo
} from "./api.js?v=20261025-viento1";


/* ==========================================================
   TARJETA DE CONDICIONES ACTUALES
   ========================================================== */


/*
 * Desde el 4-11-2026 la tarjeta de condiciones actuales, la de sol y
 * luna, el adelanto de la predicción y los accesos son componentes
 * (js/componentes/), que se pueden poner en cualquier página o
 * dashboard. Aquí solo se montan en sus huecos; cada uno se renueva solo.
 */

import {
    montarCondicionesActuales
} from "../componentes/condiciones-actuales.js?v=20261104-componentes1";

import {
    montarSolLuna
} from "../componentes/tarjeta-sol-luna.js?v=20261104-componentes1";

import {
    montarPrediccionBreve
} from "../componentes/prediccion-breve.js?v=20261104-componentes1";

import {
    montarAccesos
} from "../componentes/accesos.js?v=20261104-componentes1";

import {
    montarSemaforosAlertas
} from "../alertas/semaforos.js?v=20261112-alertas2";


const COMPONENTES_ACTUALIDAD = {
    "condiciones-actuales": montarCondicionesActuales,
    "sol-luna": montarSolLuna,
    "prediccion-breve": montarPrediccionBreve,
    "accesos": montarAccesos
};


function montarComponentes() {

    for (const hueco of document.querySelectorAll("[data-componente]")) {

        const montar = COMPONENTES_ACTUALIDAD[hueco.dataset.componente];

        if (!montar) {
            continue;
        }

        try {
            montar(hueco);
        } catch (error) {
            console.error(
                `Actualidad: no se pudo montar ${hueco.dataset.componente}`,
                error
            );
        }
    }

}


/* ==========================================================
   ADELANTO DE LA PREDICCIÓN
   ========================================================== */





/* ==========================================================
   PLANTILLA DE ESTACIÓN
   ========================================================== */


/*
 * La vía normal es el componente externo:
 *
 *     componentes/ficha-estacion.html
 *
 * Se conserva la detección de una plantilla incrustada como
 * compatibilidad defensiva durante la transición.
 */


async function prepararPlantillaEstaciones() {

    const plantillaIncrustada =
        document.getElementById(
            "plantilla-estacion"
        );


    if (
        plantillaIncrustada
        &&
        plantillaIncrustada.tagName
        ===
        "TEMPLATE"
    ) {

        return capturarPlantillaFichaEstacion();

    }


    return await cargarPlantillaFichaEstacion();

}


/* ==========================================================
   REDIMENSIONAMIENTO
   ========================================================== */


function configurarRedimensionamiento() {

    window.addEventListener(
        "resize",
        () => {

            if (
                estadoActualidad
                    .temporizadorResize
                !==
                null
            ) {

                clearTimeout(
                    estadoActualidad
                        .temporizadorResize
                );

            }


            establecerTemporizadorResize(
                window.setTimeout(
                    () => {

                        /*
                         * sincronizarFichasEstaciones() recalcula también
                         * el modo vertical/horizontal de cada ficha.
                         *
                         * Esto es necesario para que:
                         *
                         * - escritorio con número impar:
                         *     última ficha horizontal;
                         *
                         * - móvil / una sola columna:
                         *     todas las fichas verticales.
                         *
                         * sincronizarFichasEstaciones() ya no mueve
                         * fichas existentes dentro del DOM, de modo que
                         * un resize provocado al entrar en fullscreen
                         * no desmonta ni vuelve a insertar el iframe.
                         */

                        sincronizarFichasEstaciones();


                        actualizarSistemaLluvia();


                        establecerTemporizadorResize(
                            null
                        );

                    },
                    180
                )
            );

        }
    );

}


/* ==========================================================
   TIMELAPSES PÚBLICOS
   ========================================================== */


/*
 * El componente de timelapses es independiente.
 *
 * Se carga dinámicamente para que cualquier fallo
 * del catálogo público, de sus plantillas o del módulo
 * no impida el funcionamiento de las estaciones.
 *
 * El propio componente mantiene oculta su sección
 * cuando no existen timelapses publicados.
 *
 * No descarga archivos MP4 hasta que el visitante
 * solicita reproducir uno.
 */


async function prepararTimelapses() {

    const contenedor =
        document.getElementById(
            "timelapses"
        );


    if (
        !contenedor
    ) {

        return false;

    }


    try {

        const modulo =
            await import(
                "/js/timelapses.js?v=20261104-camara1"
            );


        return await modulo.montarTimelapses(
            contenedor
        );

    } catch (
        error
    ) {

        contenedor.hidden = true;


        console.warn(
            "No se ha podido inicializar el componente de timelapses.",
            error
        );


        return false;

    }

}


/* ==========================================================
   GRÁFICAS DEL CATÁLOGO
   ========================================================== */


/*
 * Como los timelapses: se carga aparte para que un fallo de las
 * gráficas no afecte a las estaciones. La sección sigue oculta si no
 * llega ninguna (js/estadisticas-incrustadas.js).
 */


async function prepararGraficas() {

    const seccion =
        document.getElementById(
            "graficas-actualidad"
        );


    if (
        !seccion
    ) {

        return false;

    }


    try {

        const modulo =
            await import(
                "/js/estadisticas-incrustadas.js?v=20261029-actualidad1"
            );


        return await modulo.montarEstadisticas(
            seccion
        );

    } catch (
        error
    ) {

        seccion.hidden = true;


        console.warn(
            "No se han podido cargar las gráficas de Actualidad.",
            error
        );


        return false;

    }

}


/* ==========================================================
   ARRANQUE
   ========================================================== */


async function arrancarActualidad() {

    /*
     * Semáforos de alertas (José, 11-11-2026): fijos arriba, también en
     * Actualidad como dashboard. Solo se ven si hay algún aviso.
     */
    for (const hueco of document.querySelectorAll('[data-componente="alertas-semaforos"]')) {
        montarSemaforosAlertas(hueco).catch(error => {
            console.error("Actualidad: no se pudieron montar los semáforos de alertas.", error);
        });
    }

    /*
     * Actualidad como dashboard (José, 5-11-2026): de momento solo con
     * /actualidad?dashboard, para revisarla antes de sustituir esta.
     */
    if (new URLSearchParams(window.location.search).has("dashboard")) {

        document.addEventListener(
            "cabecera:montada",
            () => {
                configurarControlesLluvia();
                actualizarIndicadorSimulacion("GLOBAL");
            },
            {once: true}
        );

        try {
            const modulo = await import("/js/dashboards/actualidad.js?v=20261112-alertas2");
            await modulo.arrancarActualidadDashboard(document.getElementById("actual"));
        } catch (error) {
            console.error("Actualidad: no se ha podido montar el dashboard.", error);
        }

        return;
    }

    try {

        /*
         * Componentes: primero, para que no esperen a las fichas ni
         * caigan con ellas si algo falla.
         */
        montarComponentes();


        /* ==================================================
           CABECERA DINÁMICA
           ================================================== */

        document.addEventListener(
            "cabecera:montada",
            () => {

                configurarControlesLluvia();


                actualizarIndicadorSimulacion(
                    "GLOBAL"
                );

            },
            {
                once:
                    true
            }
        );


        /* ==================================================
           PLANTILLA
           ================================================== */

        const plantillaDisponible =
            await prepararPlantillaEstaciones();


        if (
            !plantillaDisponible
        ) {

            throw new Error(
                "No se ha podido preparar la plantilla de estaciones."
            );

        }


        /* ==================================================
           CATÁLOGO
           ================================================== */

        const catalogoCargado =
            await cargarCatalogoEstaciones();


        if (
            catalogoCargado
        ) {

            const sincronizado =
                sincronizarFichasEstaciones();


            if (
                !sincronizado
            ) {

                throw new Error(
                    "El catálogo se cargó pero no fue posible crear las fichas."
                );

            }

        }


        /* ==================================================
           EFECTOS Y CONTROLES
           ================================================== */

        inicializarLluviaVisual();


        configurarControlesLluvia();


        configurarPatrocinios();


        actualizarSistemaLluvia();


        /* ==================================================
           CONDICIONES
           ================================================== */

        await cargarCondiciones();


        /* ==================================================
           RESPONSIVE
           ================================================== */

        configurarRedimensionamiento();


        /* ==================================================
           INTERVALOS
           ================================================== */

        window.setInterval(
            cargarCondiciones,
            INTERVALO_CONDICIONES_MS
        );


        window.setInterval(
            refrescarCatalogo,
            INTERVALO_CATALOGO_MS
        );


        window.setInterval(
            generarGotasCristalActivas,
            INTERVALO_GOTAS_CRISTAL_MS
        );


        /* ==================================================
           TIMELAPSES
           ================================================== */

        /*
         * Se inicia sin bloquear Actualidad.
         *
         * Un error del componente no interrumpe
         * los temporizadores ni los demás módulos.
         */

        void prepararTimelapses();

        void prepararGraficas();


    } catch (
        error
    ) {

        console.error(
            "No ha sido posible iniciar Actualidad.",
            error
        );

    }

}


void arrancarActualidad();


// Fin de fichero: js/actualidad/principal.js
