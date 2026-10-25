/*
 * MeteoArchidona · Iconos del tiempo
 *
 * Los dibujos del estado del cielo, en SVG propio y sin dependencias.
 * Nacieron en js/prediccion.js y ahora viven aquí porque los usan dos
 * páginas: Predicción y la tarjeta «Condiciones actuales» de Actualidad.
 *
 * Se publica como window.IconosTiempo en vez de como módulo porque
 * js/prediccion.js es un script clásico; así lo usan igual los dos sin
 * tener que convertir aquella página a módulos.
 *
 * Los colores están en css/iconos-tiempo.css, que hay que cargar en
 * cualquier página que pinte estos iconos.
 *
 * De noche, si está cargado js/sol-luna.js, la luna se dibuja con su
 * fase de verdad. Si no, con una luna genérica.
 */

(function () {
    "use strict";

    const SOL = '<circle class="ic-sol" cx="24" cy="24" r="9"/>' +
        '<g class="ic-rayos">' +
        [0, 45, 90, 135, 180, 225, 270, 315].map(g =>
            `<line x1="24" y1="6" x2="24" y2="10" transform="rotate(${g} 24 24)"/>`).join("") +
        "</g>";

    const SOL_PEQUENO = '<circle class="ic-sol" cx="17" cy="17" r="7"/>' +
        '<g class="ic-rayos">' +
        [0, 60, 120, 180, 240, 300].map(g =>
            `<line x1="17" y1="4" x2="17" y2="7" transform="rotate(${g} 17 17)"/>`).join("") +
        "</g>";

    const LUNA = '<path class="ic-luna" d="M30 8a13 13 0 1 0 10 21A11 11 0 0 1 30 8z"/>';
    const LUNA_PEQUENA = '<path class="ic-luna" d="M20 5a10 10 0 1 0 8 16A8.5 8.5 0 0 1 20 5z"/>';

    function nube(clase, desplazamiento) {
        const y = desplazamiento || 0;
        return `<path class="${clase || "ic-nube"}" d="M14 ${36 + y}h22a7 7 0 0 0 0-14 ` +
            `a10 10 0 0 0-19-2 7.5 7.5 0 0 0-3 16z"/>`;
    }

    function gotas(n) {
        const xs = n === 1 ? [24] : n === 2 ? [19, 29] : [16, 24, 32];
        return xs.map(x => `<line class="ic-gota" x1="${x}" y1="40" x2="${x - 2}" y2="45"/>`).join("");
    }

    const RAYO = '<path class="ic-rayo" d="M25 36l-5 7h4l-2 5 7-8h-4l3-4z"/>';
    const COPOS = [17, 24, 31].map(x => `<circle class="ic-copo" cx="${x}" cy="43" r="1.8"/>`).join("");
    const NIEBLA = [30, 36, 42].map((y, i) =>
        `<line class="ic-niebla" x1="${8 + i * 3}" y1="${y}" x2="${40 - i * 2}" y2="${y}"/>`).join("");


    /*
     * Luna con la fase de esta noche.
     *
     * js/sol-luna.js calcula la parte iluminada para un disco de radio
     * 46 centrado en el origen; aquí se encoge y se lleva a su sitio del
     * dibujo. Sin ese fichero, luna genérica y a seguir.
     */
    function lunaDeHoy(radio, cx, cy) {
        const luna = window.MeteoLuna;

        if (!luna || typeof luna.caminoLuna !== "function") {
            return null;
        }

        const fase = luna.iluminacionLunar(new Date()).fase;
        const escala = radio / 46;

        /*
         * El disco apagado va detrás: caminoLuna solo dibuja la parte
         * iluminada, y en cuarto creciente quedaría una raja flotando.
         */
        return `<g transform="translate(${cx} ${cy}) scale(${escala.toFixed(3)})">` +
            '<circle class="ic-luna-sombra" r="46"/>' +
            `<path class="ic-luna" d="${luna.caminoLuna(fase)}"/>` +
            "</g>";
    }


    /*
     * condicion: el valor que manda la API (despejado, intervalos_nubosos,
     * lluvia, tormenta…). noche: si toca luna en vez de sol.
     */
    function icono(condicion, noche) {
        const astro = noche
            ? (lunaDeHoy(13, 30, 21) || LUNA)
            : SOL;

        const astroPequeno = noche
            ? (lunaDeHoy(10, 20, 15) || LUNA_PEQUENA)
            : SOL_PEQUENO;

        let cuerpo;

        switch (condicion) {
            case "despejado":
                cuerpo = astro;
                break;
            case "poco_nuboso":
            case "nubes_altas":
                cuerpo = astroPequeno + nube("ic-nube ic-nube-clara", 4);
                break;
            case "intervalos_nubosos":
                cuerpo = astroPequeno + nube();
                break;
            case "muy_nuboso":
            case "cubierto":
                cuerpo = nube("ic-nube ic-nube-fondo", -6) + nube("ic-nube ic-nube-oscura");
                break;
            case "lluvia_escasa":
                cuerpo = nube() + gotas(1);
                break;
            case "lluvia":
                cuerpo = nube("ic-nube ic-nube-oscura") + gotas(3);
                break;
            case "chubascos":
                cuerpo = astroPequeno + nube() + gotas(2);
                break;
            case "tormenta":
                cuerpo = nube("ic-nube ic-nube-oscura") + RAYO;
                break;
            case "nieve":
                cuerpo = nube() + COPOS;
                break;
            case "niebla":
            case "bruma":
            case "calima":
                cuerpo = nube("ic-nube ic-nube-clara", -8) + NIEBLA;
                break;
            default:
                cuerpo = nube();
        }

        return `<svg class="ic" viewBox="0 0 48 48" aria-hidden="true">${cuerpo}</svg>`;
    }


    window.IconosTiempo = {
        icono: icono
    };

})();

/* Fin de fichero: js/iconos-tiempo.js */
