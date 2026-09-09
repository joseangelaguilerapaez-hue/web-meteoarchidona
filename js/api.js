/*
============================================================
DIRECCIÓN DE LA API
============================================================

En producción se habla directamente con la API.

En local se pasa por /api, que es el intermediario de
servidor.py. Hace falta porque la API no manda cabeceras
Access-Control-Allow-Origin: sus respuestas llegan bien, pero
el navegador las descarta por venir de otro origen. Pidiendo
a /api la petición es del mismo origen y no hay nada que
bloquear.

Esto es un apaño de desarrollo. Para que la web funcione
publicada, las cabeceras CORS las tiene que mandar la API.
============================================================
*/

const API_REMOTA = "https://api-meteoarchidona.onrender.com";

function calcularBaseApi() {
    const host = window.location.hostname;

    if (host === "localhost" || host === "127.0.0.1" || host === "") {
        return "/api";
    }

    return API_REMOTA;
}

window.API_REMOTA = API_REMOTA;
window.API_BASE = calcularBaseApi();
