/*
 * MeteoArchidona · Trabajador de servicio
 *
 * Lo que hace que la web se pueda instalar en el teléfono y que, sin
 * cobertura, enseñe algo en vez del dinosaurio del navegador.
 *
 * Tiene que estar en la raíz del sitio: un trabajador solo manda sobre
 * las direcciones que cuelgan de su propia carpeta, y el nuestro manda
 * sobre todo el sitio.
 *
 * Reglas, por orden de importancia:
 *
 * 1. Los datos nunca se guardan. Todo lo que va por /api/ sale a la
 *    red siempre. Una temperatura de hace dos horas enseñada como si
 *    fuera de ahora es peor que no enseñar nada, y la web ya sabe
 *    decir «sin datos» cuando la petición falla.
 *
 * 2. Las páginas, primero la red. Así se ve siempre la última versión
 *    publicada, que es lo que pide Nginx con su `no-cache`. Si no hay
 *    conexión se saca la copia guardada, y si tampoco la hay, un aviso
 *    propio.
 *
 * 3. Lo que no cambia —hojas, scripts, imágenes, fuentes— se sirve de
 *    la copia y se renueva por detrás. Van con `?v=` en la dirección,
 *    así que un cambio es una dirección nueva y nunca se queda pegada
 *    una versión vieja.
 *
 * Para publicar una versión nueva basta con cambiar VERSION: se tira
 * la caché anterior entera y se vuelve a empezar.
 */

"use strict";

const VERSION = "20261101-pwa1";

const CACHE = `meteoarchidona-${VERSION}`;

/* Lo mínimo para que la aplicación abra sin conexión. */
const BASICOS = [
    "/",
    "/manifest.webmanifest"
];

/* Sin conexión y sin copia: al menos, algo que se entienda. */
const PAGINA_SIN_CONEXION = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Sin conexión · MeteoArchidona</title>
</head>
<body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#080d14;color:#f6f8fb;font-family:system-ui,sans-serif;text-align:center">
<main style="padding:24px;max-width:420px">
<h1 style="font-size:20px;margin:0 0 10px">Sin conexión</h1>
<p style="margin:0;color:#aabdd0;line-height:1.5">
No se ha podido contactar con meteoarchidona.com. Los datos de las
estaciones se piden en directo, así que hace falta conexión para verlos.
</p>
</main>
</body>
</html>
`;


function esDeLaApi(url) {

    return url.pathname === "/api" || url.pathname.startsWith("/api/");

}


/* Hojas, scripts, imágenes y fuentes: lo que no son datos ni páginas. */
function esEstatico(url) {

    return /\.(css|js|mjs|png|jpg|jpeg|webp|svg|ico|woff2?|webmanifest|mp4|json|geojson)$/i
        .test(url.pathname);

}


async function responderPagina(peticion) {

    const cache = await caches.open(CACHE);


    try {

        const respuesta = await fetch(peticion);


        /* Solo se guarda lo que ha ido bien. */
        if (respuesta && respuesta.ok) {

            cache.put(peticion, respuesta.clone());

        }


        return respuesta;


    } catch (error) {

        const guardada =
            await cache.match(peticion)
            ||
            await cache.match("/");


        if (guardada) {

            return guardada;

        }


        return new Response(
            PAGINA_SIN_CONEXION,
            {
                status: 503,
                headers: {
                    "Content-Type": "text/html; charset=utf-8"
                }
            }
        );

    }

}


async function responderEstatico(peticion) {

    const cache = await caches.open(CACHE);

    const guardada = await cache.match(peticion);


    /*
     * Con copia se responde al momento y se renueva por detrás; sin
     * copia, a la red y se guarda para la próxima.
     */
    const dePaso = fetch(peticion)
        .then(respuesta => {

            if (respuesta && respuesta.ok) {

                cache.put(peticion, respuesta.clone());

            }


            return respuesta;

        })
        .catch(() => null);


    if (guardada) {

        return guardada;

    }


    const respuesta = await dePaso;


    if (respuesta) {

        return respuesta;

    }


    return Response.error();

}


self.addEventListener("install", evento => {

    evento.waitUntil(
        caches.open(CACHE)
            .then(cache => cache.addAll(BASICOS))
            /*
             * Si alguno falla no se aborta la instalación: el sitio
             * funciona igual, solo que sin copia de ese archivo.
             */
            .catch(() => undefined)
            .then(() => self.skipWaiting())
    );

});


self.addEventListener("activate", evento => {

    evento.waitUntil(
        caches.keys()
            .then(nombres => Promise.all(
                nombres
                    .filter(nombre => nombre !== CACHE)
                    .map(nombre => caches.delete(nombre))
            ))
            .then(() => self.clients.claim())
    );

});


self.addEventListener("fetch", evento => {

    const peticion = evento.request;


    if (peticion.method !== "GET") {

        return;

    }


    const url = new URL(peticion.url);


    /* De otros dominios no se guarda nada. */
    if (url.origin !== self.location.origin) {

        return;

    }


    /* Los datos, siempre de la red. */
    if (esDeLaApi(url)) {

        return;

    }


    if (peticion.mode === "navigate") {

        evento.respondWith(
            responderPagina(peticion)
        );


        return;

    }


    if (esEstatico(url)) {

        evento.respondWith(
            responderEstatico(peticion)
        );

    }

});


/* Fin de fichero: sw.js */
