/*
 * MeteoArchidona
 * Dirección de la API
 *
 * Un solo sitio donde se decide a quién se le piden los datos.
 * Publica window.API_BASE, que leen js/actualidad.js,
 * js/administracion.js y visores/radar.js.
 *
 * En producción se habla directamente con la API en Render, que manda
 * las cabeceras CORS para meteoarchidona.com.
 *
 * En local no: la API no autoriza a localhost, así que el navegador
 * descarta sus respuestas aunque lleguen bien, y las estaciones salen
 * con guiones. Pidiendo a /api se habla con servidor.py, que es el
 * mismo origen —nada que bloquear— y él reenvía la petición a la API.
 *
 * Por eso en local hay que levantar el sitio con:
 *
 *     python servidor.py
 *
 * Abriendo los ficheros a pelo, o con python -m http.server, no hay
 * quien reenvíe y no habrá datos.
 */


/* Dentro de una función anónima: lo único que sale de aquí es
 * window.API_BASE. */

(function () {

"use strict";



const API_REMOTA = "https://api-meteoarchidona.onrender.com";

const API_LOCAL = "/api";

const MAQUINAS_LOCALES = [
    "localhost",
    "127.0.0.1",
    "[::1]",
    "",
];


window.API_BASE =
    MAQUINAS_LOCALES.includes(window.location.hostname)
        ? API_LOCAL
        : API_REMOTA;

})();


// Fin de fichero: js/api.js
