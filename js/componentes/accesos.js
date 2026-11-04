/*
 * MeteoArchidona · Componente «Accesos»
 *
 * Las tarjetas que llevan a las demás secciones de la web. Sacado de
 * Actualidad el 4-11-2026.
 *
 *     <div data-componente="accesos"></div>
 *
 *     import {montarAccesos} from "/js/componentes/accesos.js?v=…";
 *     montarAccesos(hueco);
 *
 * Sin datos: solo enlaces. Puede haber varios en una página.
 */

import {asegurarHoja, prepararTarjeta} from "./comun.js?v=20261104-componentes1";


const MARCADO = `
<a
    href="/prediccion"
    class="acceso"
>


<div class="acceso-icono" aria-hidden="true">
    <svg viewBox="0 0 24 24">
        <circle cx="8.5" cy="8.5" r="3.5" />
        <path d="M8.5 2v1.6M8.5 13.4V15M2 8.5h1.6M13.4 8.5H15M4 4l1.1 1.1M11.9 11.9L13 13M13 4l-1.1 1.1M5.1 11.9L4 13" />
        <path d="M9.5 20.5h7.8a3.2 3.2 0 0 0 0-6.4 4.6 4.6 0 0 0-8.7-1 3.4 3.4 0 0 0 .9 7.4z" />
    </svg>
</div>


<div>


<div class="acceso-titulo">
    PREDICCIÓN
</div>


<div class="acceso-subtitulo">
    Siete días y por horas
</div>


</div>


</a>


<a
    href="/observaciones"
    class="acceso"
>


<div class="acceso-icono" aria-hidden="true">
    <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="2" />
        <path d="M12 12 18.4 5.6" />
        <path d="M12 5.5a6.5 6.5 0 1 0 6.5 6.5" />
        <path d="M12 2a10 10 0 1 0 10 10" />
    </svg>
</div>


<div>


<div class="acceso-titulo">
    SEGUIMIENTO
</div>


<div class="acceso-subtitulo">
    Radar y satélite
</div>


</div>


</a>


<a
    href="/en-vivo"
    class="acceso"
>


<div class="acceso-icono" aria-hidden="true">
    <svg viewBox="0 0 24 24">
        <path d="M3.5 7.5h3.2l1.6-2.2h7.4l1.6 2.2h3.2v11H3.5z" />
        <circle cx="12" cy="13" r="3.6" />
    </svg>
</div>


<div>


<div class="acceso-titulo">
    CÁMARAS
</div>


<div class="acceso-subtitulo">
    Imágenes en directo
</div>


</div>


</a>


<a
    href="#estaciones"
    class="acceso"
>


<div class="acceso-icono" aria-hidden="true">
    <svg viewBox="0 0 24 24">
        <path d="M12 13.5V21M8.5 21h7" />
        <circle cx="12" cy="10.5" r="2" />
        <path d="M8.3 14.2a5.3 5.3 0 0 1 0-7.4M15.7 6.8a5.3 5.3 0 0 1 0 7.4" />
        <path d="M5.6 16.9a9 9 0 0 1 0-12.8M18.4 4.1a9 9 0 0 1 0 12.8" />
    </svg>
</div>


<div>


<div class="acceso-titulo">
    ESTACIONES
</div>


<div class="acceso-subtitulo">
    Nuestras lecturas
</div>


</div>


</a>


<a
    href="/informacion"
    class="acceso"
>


<div class="acceso-icono" aria-hidden="true">
    <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5.5" />
        <path d="M12 7.6v.9" />
    </svg>
</div>


<div>


<div class="acceso-titulo">
    INFORMACIÓN
</div>


<div class="acceso-subtitulo">
    El proyecto y las estaciones
</div>


</div>


</a>
`;


export function montarAccesos(raiz) {
    asegurarHoja("/css/componentes-actualidad.css?v=20261104-componentes1");
    prepararTarjeta(raiz, ["tarjeta", "accesos"], MARCADO);
}


/* Fin de fichero: js/componentes/accesos.js */
