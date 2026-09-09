/*
============================================================
PLANTILLA BASE DE JS DE PÁGINA
============================================================

Acompaña a pages/home.html. Al crear una página nueva se copia
como js/<pagina>.js y solo hay que cambiar SECCION_ACTIVA.

La cabecera, el pie, la navegación y el reloj los monta
js/pagina.js, que se carga antes que este archivo.
============================================================
*/

// Id de esta sección en js/rutas.js. Cambiar al copiar.
// Si la página no figura en rutas.js, dejarlo como null.
const SECCION_ACTIVA = null;

montarCabeceraYPie(SECCION_ACTIVA);
