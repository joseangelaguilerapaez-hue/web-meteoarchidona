"use strict";

/*
 * MeteoArchidona
 * Actualidad
 *
 * Estado compartido y configuración común.
 *
 * Este módulo centraliza:
 *
 * - intervalos de actualización;
 * - nombres de intensidad de lluvia;
 * - catálogo público de estaciones;
 * - códigos actualmente publicados;
 * - estado meteorológico visual por estación;
 * - estado de simulación manual de lluvia;
 * - plantilla utilizada para construir fichas dinámicas.
 *
 * Los demás módulos de Actualidad trabajan sobre este único objeto
 * compartido para evitar variables globales dispersas.
 */


export const INTERVALO_CONDICIONES_MS =
    60_000;


export const INTERVALO_CATALOGO_MS =
    300_000;


export const INTERVALO_GOTAS_CRISTAL_MS =
    420;


export const NOMBRES_NIVEL_LLUVIA = {
    0: "Sin lluvia",
    1: "Débil",
    2: "Moderada",
    3: "Fuerte",
    4: "Muy fuerte"
};


export const estadoActualidad = {

    estacionesPublicas: [],

    codigosEstacion: [],

    lluviaReal: {},

    lluviaSimulada: {
        GLOBAL: 0
    },

    vientoEstacion: {},

    plantillaFichaEstacion: null,

    codigoPlantillaFicha: null,

    temporizadorResize: null
};


export function establecerEstacionesPublicas(
    estaciones
) {
    estadoActualidad.estacionesPublicas =
        Array.isArray(
            estaciones
        )
        ?
        estaciones
        :
        [];
}


export function establecerCodigosEstacion(
    codigos
) {
    estadoActualidad.codigosEstacion =
        Array.isArray(
            codigos
        )
        ?
        codigos
        :
        [];
}


export function establecerPlantillaFichaEstacion(
    plantilla,
    codigo
) {
    estadoActualidad.plantillaFichaEstacion =
        plantilla
        ||
        null;

    estadoActualidad.codigoPlantillaFicha =
        codigo
        ||
        null;
}


export function establecerTemporizadorResize(
    temporizador
) {
    estadoActualidad.temporizadorResize =
        temporizador
        ??
        null;
}


// Fin de fichero: js/actualidad/estado.js