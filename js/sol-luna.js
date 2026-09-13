/*
 * MeteoArchidona · Sol y luna
 *
 * Rellena en Actualidad el amanecer y el atardecer de la tarjeta
 * «Condiciones actuales» y la tarjeta «Sol y luna»: duración del día,
 * fase de la luna con su dibujo y fechas de la próxima luna llena y
 * nueva.
 *
 * Todo sale de cálculo astronómico en el propio navegador (las
 * fórmulas de SunCalc, de Vladimir Agafonkin, que siguen las de
 * astronomy.stackexchange y el «Astronomical Algorithms» de Meeus):
 * no se pide nada a ningún servicio. La precisión es de un minuto o
 * dos, de sobra para mostrar horas redondeadas.
 *
 * Coordenadas: centro de Archidona.
 */

(function () {
    "use strict";

    const LATITUD = 37.0967;
    const LONGITUD = -4.3886;
    const ZONA = "Europe/Madrid";

    const RAD = Math.PI / 180;
    const DIA_MS = 86400000;
    const J1970 = 2440588;
    const J2000 = 2451545;
    const OBLICUIDAD = RAD * 23.4397;

    // Altura del sol al amanecer: -0,833° por la refracción y el radio del disco.
    const ALTURA_ORTO = RAD * -0.833;


    /* ------------------------------------------------------------
       Astronomía
       ------------------------------------------------------------ */

    function aDias(fecha) {
        return fecha.valueOf() / DIA_MS - 0.5 + J1970 - J2000;
    }

    function desdeJuliano(juliano) {
        return new Date((juliano + 0.5 - J1970) * DIA_MS);
    }

    function declinacion(longitud, latitud) {
        return Math.asin(
            Math.sin(latitud) * Math.cos(OBLICUIDAD) +
            Math.cos(latitud) * Math.sin(OBLICUIDAD) * Math.sin(longitud)
        );
    }

    function ascensionRecta(longitud, latitud) {
        return Math.atan2(
            Math.sin(longitud) * Math.cos(OBLICUIDAD) -
            Math.tan(latitud) * Math.sin(OBLICUIDAD),
            Math.cos(longitud)
        );
    }

    function anomaliaSolar(dias) {
        return RAD * (357.5291 + 0.98560028 * dias);
    }

    function longitudEcliptica(anomalia) {
        const centro = RAD * (
            1.9148 * Math.sin(anomalia) +
            0.02 * Math.sin(2 * anomalia) +
            0.0003 * Math.sin(3 * anomalia)
        );

        return anomalia + centro + RAD * 102.9372 + Math.PI;
    }

    function coordenadasSol(dias) {
        const longitud = longitudEcliptica(anomaliaSolar(dias));

        return {
            dec: declinacion(longitud, 0),
            ra: ascensionRecta(longitud, 0)
        };
    }

    function coordenadasLuna(dias) {
        const longitudMedia = RAD * (218.316 + 13.176396 * dias);
        const anomalia = RAD * (134.963 + 13.064993 * dias);
        const distanciaMedia = RAD * (93.272 + 13.22935 * dias);

        const longitud = longitudMedia + RAD * 6.289 * Math.sin(anomalia);
        const latitud = RAD * 5.128 * Math.sin(distanciaMedia);

        return {
            ra: ascensionRecta(longitud, latitud),
            dec: declinacion(longitud, latitud),
            dist: 385001 - 20905 * Math.cos(anomalia)
        };
    }

    /*
     * Amanecer y atardecer del día que contiene a «mediodia». Hay que
     * pasar un instante cercano al mediodía solar: el cálculo busca el
     * mediodía más próximo, y de madrugada daría el del día anterior.
     */
    function horasDelSol(mediodia) {
        const oeste = RAD * -LONGITUD;
        const fi = RAD * LATITUD;
        const dias = aDias(mediodia);

        const ciclo = Math.round(dias - 0.0009 - oeste / (2 * Math.PI));
        const aproximado = 0.0009 + oeste / (2 * Math.PI) + ciclo;

        const anomalia = anomaliaSolar(aproximado);
        const longitud = longitudEcliptica(anomalia);
        const dec = declinacion(longitud, 0);

        const correccion =
            0.0053 * Math.sin(anomalia) -
            0.0069 * Math.sin(2 * longitud);

        const transito = J2000 + aproximado + correccion;

        const angulo = Math.acos(
            (Math.sin(ALTURA_ORTO) - Math.sin(fi) * Math.sin(dec)) /
            (Math.cos(fi) * Math.cos(dec))
        );

        const ocaso =
            J2000 +
            0.0009 + (angulo + oeste) / (2 * Math.PI) + ciclo +
            correccion;

        return {
            amanecer: desdeJuliano(transito - (ocaso - transito)),
            atardecer: desdeJuliano(ocaso)
        };
    }

    /*
     * fase: 0 luna nueva, 0,25 cuarto creciente, 0,5 llena,
     * 0,75 cuarto menguante. fraccion: parte iluminada, de 0 a 1.
     */
    function iluminacionLunar(fecha) {
        const dias = aDias(fecha);
        const sol = coordenadasSol(dias);
        const luna = coordenadasLuna(dias);
        const distanciaSol = 149598000;

        const elongacion = Math.acos(
            Math.sin(sol.dec) * Math.sin(luna.dec) +
            Math.cos(sol.dec) * Math.cos(luna.dec) * Math.cos(sol.ra - luna.ra)
        );

        const incidencia = Math.atan2(
            distanciaSol * Math.sin(elongacion),
            luna.dist - distanciaSol * Math.cos(elongacion)
        );

        const angulo = Math.atan2(
            Math.cos(sol.dec) * Math.sin(sol.ra - luna.ra),
            Math.sin(sol.dec) * Math.cos(luna.dec) -
            Math.cos(sol.dec) * Math.sin(luna.dec) * Math.cos(sol.ra - luna.ra)
        );

        return {
            fraccion: (1 + Math.cos(incidencia)) / 2,
            fase: 0.5 + 0.5 * incidencia * (angulo < 0 ? -1 : 1) / Math.PI
        };
    }

    /* Próxima luna llena y nueva, buscando de hora en hora. */
    function proximasLunas(desde) {
        const resultado = { llena: null, nueva: null };
        let anterior = iluminacionLunar(desde).fase;

        for (let hora = 1; hora <= 24 * 32; hora++) {
            const instante = new Date(desde.valueOf() + hora * 3600000);
            const fase = iluminacionLunar(instante).fase;

            if (!resultado.llena && anterior < 0.5 && fase >= 0.5) {
                resultado.llena = instante;
            }

            if (!resultado.nueva && fase < anterior - 0.5) {
                resultado.nueva = instante;
            }

            if (resultado.llena && resultado.nueva) {
                break;
            }

            anterior = fase;
        }

        return resultado;
    }


    /* ------------------------------------------------------------
       Presentación
       ------------------------------------------------------------ */

    const formatoHora = new Intl.DateTimeFormat("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: ZONA
    });

    const formatoFecha = new Intl.DateTimeFormat("es-ES", {
        day: "numeric",
        month: "short",
        timeZone: ZONA
    });

    /* Mediodía (12:00 UTC) del día de hoy en Archidona. */
    function mediodiaDeHoy(ahora) {
        const partes = {};

        new Intl.DateTimeFormat("en-CA", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            timeZone: ZONA
        })
            .formatToParts(ahora)
            .forEach(parte => {
                partes[parte.type] = parte.value;
            });

        return new Date(Date.UTC(
            Number(partes.year),
            Number(partes.month) - 1,
            Number(partes.day),
            12
        ));
    }

    function nombreFase(fase) {
        if (fase < 0.03 || fase > 0.97) return "Luna nueva";
        if (fase < 0.22) return "Luna creciente";
        if (fase < 0.28) return "Cuarto creciente";
        if (fase < 0.47) return "Gibosa creciente";
        if (fase < 0.53) return "Luna llena";
        if (fase < 0.72) return "Gibosa menguante";
        if (fase < 0.78) return "Cuarto menguante";
        return "Luna menguante";
    }

    /*
     * Parte iluminada del disco para un círculo de radio 46 centrado en
     * el origen. Visto desde el hemisferio norte: crece por la derecha.
     * Un arco sigue el borde del disco y el otro, una semielipse, la
     * línea entre luz y sombra.
     */
    function caminoLuna(fase) {
        const radio = 46;
        const ancho = Math.abs(Math.cos(2 * Math.PI * fase)) * radio;
        const creciente = fase < 0.5;

        const borde = creciente ? 1 : 0;
        const terminador = creciente
            ? (fase < 0.25 ? 0 : 1)
            : (fase > 0.75 ? 1 : 0);

        return [
            `M 0 ${-radio}`,
            `A ${radio} ${radio} 0 0 ${borde} 0 ${radio}`,
            `A ${ancho.toFixed(2)} ${radio} 0 0 ${terminador} 0 ${-radio}`,
            "Z"
        ].join(" ");
    }

    function duracion(ms) {
        const minutos = Math.round(ms / 60000);
        return `${Math.floor(minutos / 60)} h ${String(minutos % 60).padStart(2, "0")} min`;
    }

    function poner(id, texto) {
        const elemento = document.getElementById(id);

        if (elemento) {
            elemento.textContent = texto;
        }
    }

    function actualizar() {
        const ahora = new Date();
        const hoy = horasDelSol(mediodiaDeHoy(ahora));
        const ayer = horasDelSol(new Date(mediodiaDeHoy(ahora).valueOf() - DIA_MS));

        poner("sol-amanecer", formatoHora.format(hoy.amanecer));
        poner("sol-atardecer", formatoHora.format(hoy.atardecer));

        const largoHoy = hoy.atardecer - hoy.amanecer;
        const cambio = Math.round((largoHoy - (ayer.atardecer - ayer.amanecer)) / 60000);

        poner("sol-duracion", duracion(largoHoy));
        poner(
            "sol-diferencia",
            cambio === 0
                ? "Igual que ayer"
                : `${cambio > 0 ? "+" : "−"}${Math.abs(cambio)} min respecto a ayer`
        );

        const luna = iluminacionLunar(ahora);

        poner("luna-fase", nombreFase(luna.fase));
        poner("luna-iluminada", `${Math.round(luna.fraccion * 100)} % iluminada`);

        const luz = document.getElementById("luna-luz");

        if (luz) {
            luz.setAttribute("d", caminoLuna(luna.fase));
        }

        const proximas = proximasLunas(ahora);

        poner("luna-proxima-llena", proximas.llena ? formatoFecha.format(proximas.llena) : "--");
        poner("luna-proxima-nueva", proximas.nueva ? formatoFecha.format(proximas.nueva) : "--");
    }

    actualizar();

    // Cada diez minutos basta: la luna cambia despacio y el día, una vez.
    setInterval(() => {
        if (!document.hidden) {
            actualizar();
        }
    }, 10 * 60 * 1000);

    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
            actualizar();
        }
    });
})();

/* Fin de fichero: js/sol-luna.js */
