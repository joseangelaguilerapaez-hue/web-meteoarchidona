/*
 * MeteoArchidona · Predicción
 *
 * Dos fuentes, sin mezclarlas (docs/prediccion.md, 2 bis):
 *
 * - «Ahora en Archidona»: observación real de la estación El Silo,
 *   GET /condiciones-actuales/EL_SILO. No es predicción.
 * - Todo lo demás: predicción de AEMET, GET /prediccion/archidona
 *   (formato en docs/prediccion-endpoint.md): hoy, próximas horas,
 *   próximos 7 días, avisos y procedencia.
 *
 * MeteoArchidona no predice ni inventa: si la predicción de AEMET no
 * llega, se avisa con #pred-error y se conserva la última buena que se
 * hubiera pintado.
 */

(function () {
    "use strict";

    const MUNICIPIO = "archidona";
    const ESTACION_AHORA = "EL_SILO";
    const ZONA = "Europe/Madrid";

    // La predicción cambia pocas veces al día: basta con recargar cada 30 min.
    const REFRESCO_MS = 30 * 60 * 1000;

    // La observación de El Silo, más a menudo.
    const REFRESCO_AHORA_MS = 5 * 60 * 1000;

    const RUMBOS = {
        N: 0, NE: 45, E: 90, SE: 135, S: 180, SO: 225, O: 270, NO: 315,
        SW: 225, W: 270, NW: 315
    };


    /* ------------------------------------------------------------
       Utilidades
       ------------------------------------------------------------ */

    function crear(etiqueta, clase, texto) {
        const elemento = document.createElement(etiqueta);

        if (clase) {
            elemento.className = clase;
        }

        if (texto !== undefined && texto !== null) {
            elemento.textContent = texto;
        }

        return elemento;
    }

    function numero(valor, sufijo) {
        return typeof valor === "number" && Number.isFinite(valor)
            ? `${Math.round(valor)}${sufijo || ""}`
            : "--";
    }

    const formatoHora = new Intl.DateTimeFormat("es-ES", {
        hour: "2-digit", minute: "2-digit", timeZone: ZONA
    });

    const formatoSoloHora = new Intl.DateTimeFormat("es-ES", {
        hour: "numeric", hourCycle: "h23", timeZone: ZONA
    });

    const formatoDiaSemana = new Intl.DateTimeFormat("es-ES", {
        weekday: "short", day: "numeric", timeZone: ZONA
    });

    const formatoDiaLargo = new Intl.DateTimeFormat("es-ES", {
        weekday: "long", day: "numeric", month: "long", timeZone: ZONA
    });

    const formatoFechaIso = new Intl.DateTimeFormat("en-CA", {
        year: "numeric", month: "2-digit", day: "2-digit", timeZone: ZONA
    });

    function fechaLocal(fecha) {
        return formatoFechaIso.format(fecha);
    }

    /* «AAAA-MM-DD» como mediodía de ese día, para formatearlo sin saltos de zona. */
    function desdeFechaIso(texto) {
        return new Date(`${texto}T12:00:00Z`);
    }

    function nombreDia(textoFecha, hoy) {
        const manana = fechaLocal(new Date(desdeFechaIso(hoy).valueOf() + 86400000));

        if (textoFecha === hoy) return "Hoy";
        if (textoFecha === manana) return "Mañana";

        const texto = formatoDiaSemana.format(desdeFechaIso(textoFecha)).replace(".", "");
        return texto.charAt(0).toUpperCase() + texto.slice(1);
    }

    function cuandoEmitida(fecha) {
        const hoy = fechaLocal(new Date());
        const ayer = fechaLocal(new Date(Date.now() - 86400000));
        const dia = fechaLocal(fecha);
        const hora = formatoHora.format(fecha);

        if (dia === hoy) return `hoy a las ${hora}`;
        if (dia === ayer) return `ayer a las ${hora}`;
        return `el ${formatoDiaLargo.format(fecha)} a las ${hora}`;
    }


    /* ------------------------------------------------------------
       Iconos (SVG propios, sin dependencias)
       ------------------------------------------------------------ */

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

    function icono(condicion, noche) {
        const astro = noche ? LUNA : SOL;
        const astroPequeno = noche ? LUNA_PEQUENA : SOL_PEQUENO;
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

    function flechaViento(direccion) {
        const grados = RUMBOS[String(direccion || "").toUpperCase()];
        const flecha = crear("span", "pred-flecha", "↓");

        // La flecha señala hacia dónde sopla: el viento del N baja hacia el S.
        if (grados === undefined) {
            flecha.hidden = true;
        } else {
            flecha.style.transform = `rotate(${grados}deg)`;
        }

        flecha.setAttribute("aria-hidden", "true");
        return flecha;
    }


    /* ------------------------------------------------------------
       Pintado
       ------------------------------------------------------------ */

    function pintarFuente(datos) {
        const fuente = document.getElementById("pred-fuente");

        fuente.textContent = "";
        fuente.classList.toggle("pred-fuente-antigua", Boolean(datos.desactualizada));

        const nombre = datos.fuente && datos.fuente.nombre ? datos.fuente.nombre : "AEMET";
        const emitida = datos.fuente && datos.fuente.emitida ? new Date(datos.fuente.emitida) : null;

        if (datos.fuente && datos.fuente.url) {
            const enlace = crear("a", null, nombre);
            enlace.href = datos.fuente.url;
            enlace.target = "_blank";
            enlace.rel = "noopener";
            fuente.append("Fuente: ", enlace);
        } else {
            fuente.append(`Fuente: ${nombre}`);
        }

        if (emitida && !Number.isNaN(emitida.valueOf())) {
            fuente.append(` · emitida ${cuandoEmitida(emitida)}`);
        }

        if (datos.desactualizada) {
            fuente.append(" · puede estar desactualizada");
        }
    }

    function pintarAvisos(avisos) {
        const zona = document.getElementById("pred-avisos");
        zona.textContent = "";
        zona.hidden = !avisos || avisos.length === 0;

        (avisos || []).forEach(aviso => {
            const nivel = ["amarillo", "naranja", "rojo"].includes(aviso.nivel) ? aviso.nivel : "amarillo";
            const caja = crear("article", `pred-aviso pred-aviso-${nivel}`);
            const titulo = crear("strong", "pred-aviso-titulo",
                `Aviso ${nivel} por ${aviso.fenomeno || "fenómenos adversos"}`);
            caja.append(titulo);

            const inicio = aviso.inicio ? new Date(aviso.inicio) : null;
            const fin = aviso.fin ? new Date(aviso.fin) : null;

            if (inicio && fin) {
                caja.append(crear("span", "pred-aviso-periodo",
                    `${cuandoEmitida(inicio)} – ${cuandoEmitida(fin)}`.replace(/^./, c => c.toUpperCase())));
            }

            if (aviso.descripcion) {
                caja.append(crear("p", "pred-aviso-texto", aviso.descripcion));
            }

            caja.append(crear("span", "pred-aviso-fuente",
                `${aviso.fuente || "AEMET"}${aviso.zona ? " · " + aviso.zona : ""}`));
            zona.append(caja);
        });
    }

    function pintarHoy(datos) {
        const zona = document.getElementById("pred-hoy");
        const dia = (datos.diaria || [])[0];
        const hora = (datos.horaria || [])[0];
        zona.textContent = "";

        if (!dia) {
            zona.append(crear("p", "pred-vacio", "No hay predicción para hoy."));
            return;
        }

        // Cielo de la hora en curso si AEMET lo da; si no, el del día.
        const noche = hora ? Boolean(hora.es_noche) : false;
        const condicion = hora ? hora.condicion : dia.condicion;
        const descripcion = dia.descripcion || (hora ? hora.descripcion : "");

        const principal = crear("div", "pred-hoy-principal");
        const dibujo = crear("div", "pred-hoy-icono");
        dibujo.innerHTML = icono(condicion, noche);

        const texto = crear("div", "pred-hoy-texto");
        texto.append(
            crear("h2", "pred-hoy-titulo", "Hoy · predicción de AEMET"),
            crear("div", "pred-hoy-descripcion", descripcion || "")
        );
        principal.append(dibujo, texto);

        const cifras = crear("dl", "pred-hoy-cifras");
        const filas = [
            ["Máxima", numero(dia.temperatura_max_c, " °C"), "pred-max"],
            ["Mínima", numero(dia.temperatura_min_c, " °C"), "pred-min"],
            ["Prob. de lluvia", numero(dia.prob_precipitacion_pct, " %"), "pred-lluvia"],
            ["Viento", dia.viento_kmh === null || dia.viento_kmh === undefined
                ? "--"
                : `${dia.viento_direccion || ""} ${numero(dia.viento_kmh, " km/h")}`.trim(), ""],
            ["Racha máxima", numero(dia.racha_max_kmh, " km/h"), ""],
            ["Índice UV", numero(dia.uv_max), ""]
        ];

        filas.forEach(([etiqueta, valor, clase]) => {
            const bloque = crear("div", "pred-cifra");
            bloque.append(crear("dt", null, etiqueta), crear("dd", clase, valor));
            cifras.append(bloque);
        });

        zona.append(principal, cifras);
    }

    function pintarHoras(horaria) {
        const zona = document.getElementById("pred-horas");
        zona.textContent = "";
        let diaAnterior = null;

        (horaria || []).forEach((hora, i) => {
            const instante = new Date(hora.instante);
            const dia = fechaLocal(instante);
            const celda = crear("div", "pred-hora");

            if (diaAnterior !== null && dia !== diaAnterior) {
                celda.classList.add("pred-hora-nuevo-dia");
                celda.dataset.dia = nombreDia(dia, fechaLocal(new Date()));
            }

            diaAnterior = dia;

            const etiqueta = i === 0 ? "Ahora" : `${formatoSoloHora.format(instante)} h`;
            const dibujo = crear("div", "pred-hora-icono");
            dibujo.innerHTML = icono(hora.condicion, hora.es_noche);
            dibujo.title = hora.descripcion || "";

            const viento = crear("div", "pred-hora-viento");
            viento.append(flechaViento(hora.viento_direccion), numero(hora.viento_kmh));

            celda.append(
                crear("div", "pred-hora-etiqueta", etiqueta),
                dibujo,
                crear("div", "pred-hora-temperatura", numero(hora.temperatura_c, "°")),
                crear("div", "pred-hora-lluvia", numero(hora.prob_precipitacion_pct, "%")),
                viento
            );
            zona.append(celda);
        });
    }

    function pintarDias(diaria) {
        const lista = document.getElementById("pred-dias");
        const hoy = fechaLocal(new Date());
        lista.textContent = "";

        const conDato = (diaria || []).filter(d =>
            typeof d.temperatura_min_c === "number" && typeof d.temperatura_max_c === "number");
        const minimo = Math.min(...conDato.map(d => d.temperatura_min_c));
        const maximo = Math.max(...conDato.map(d => d.temperatura_max_c));
        const rango = Math.max(1, maximo - minimo);

        (diaria || []).forEach(dia => {
            const fila = crear("li", "pred-dia");
            const dibujo = crear("div", "pred-dia-icono");
            dibujo.innerHTML = icono(dia.condicion, false);

            const barra = crear("div", "pred-dia-barra");
            const tramo = crear("span", "pred-dia-tramo");

            if (typeof dia.temperatura_min_c === "number" && typeof dia.temperatura_max_c === "number") {
                tramo.style.left = `${((dia.temperatura_min_c - minimo) / rango) * 100}%`;
                tramo.style.right = `${((maximo - dia.temperatura_max_c) / rango) * 100}%`;
            } else {
                tramo.hidden = true;
            }

            barra.append(tramo);

            const viento = crear("div", "pred-dia-viento");
            viento.append(flechaViento(dia.viento_direccion), numero(dia.viento_kmh, " km/h"));

            fila.append(
                crear("div", "pred-dia-nombre", nombreDia(dia.fecha, hoy)),
                dibujo,
                crear("div", "pred-dia-descripcion", dia.descripcion || ""),
                crear("div", "pred-dia-lluvia", numero(dia.prob_precipitacion_pct, "%")),
                crear("div", "pred-dia-min", numero(dia.temperatura_min_c, "°")),
                barra,
                crear("div", "pred-dia-max", numero(dia.temperatura_max_c, "°")),
                viento
            );
            lista.append(fila);
        });
    }

    function pintar(datos) {
        pintarFuente(datos);
        pintarAvisos(datos.avisos);
        pintarHoy(datos);
        pintarHoras(datos.horaria);
        pintarDias(datos.diaria);
    }


    /* ------------------------------------------------------------
       Ahora en Archidona (observación de El Silo)
       ------------------------------------------------------------ */

    const RUMBOS_8 = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];

    function rumbo(grados) {
        return typeof grados === "number" && Number.isFinite(grados)
            ? RUMBOS_8[Math.round((((grados % 360) + 360) % 360) / 45) % 8]
            : null;
    }

    function hoyEnMadrid() {
        return new Intl.DateTimeFormat("es-ES", {
            day: "2-digit", month: "2-digit", year: "numeric", timeZone: ZONA
        }).format(new Date());
    }

    function pintarAhora(datos) {
        const zona = document.getElementById("pred-ahora");
        zona.textContent = "";

        const titulo = crear("h2", "pred-hoy-titulo", "Ahora en Archidona");

        if (!datos) {
            zona.append(titulo, crear("p", "pred-vacio",
                "Los datos de la estación no están disponibles en este momento."));
            return;
        }

        const fecha = datos.fecha_observacion_exterior || datos.fecha_observacion;
        const hora = datos.hora_observacion_exterior || datos.hora_observacion;
        const cuando = fecha && fecha !== hoyEnMadrid()
            ? `dato del ${fecha.slice(0, 5)} a las ${hora}`
            : `dato de las ${hora}`;

        const principal = crear("div", "pred-hoy-principal");
        const texto = crear("div", "pred-hoy-texto");
        texto.append(
            titulo,
            crear("div", "pred-hoy-temperatura", numero(datos.temperatura_c, "°")),
            crear("div", "pred-ahora-estacion",
                `Estación ${datos.nombre_estacion || "El Silo"} · MeteoArchidona · ${cuando}`)
        );
        principal.append(texto);

        const direccion = rumbo(datos.direccion_viento_grados);
        const velocidad = datos.viento_medio_10_min_kmh ?? datos.viento_actual_kmh;

        const cifras = crear("dl", "pred-hoy-cifras");
        [
            ["Humedad", numero(datos.humedad_pct, " %")],
            ["Viento", velocidad === null || velocidad === undefined
                ? "--"
                : `${direccion || ""} ${numero(velocidad, " km/h")}`.trim()],
            ["Racha", numero(datos.racha_10_min_kmh, " km/h")],
            ["Lluvia hoy", typeof datos.lluvia_dia_mm === "number"
                ? `${datos.lluvia_dia_mm.toLocaleString("es-ES", { maximumFractionDigits: 1 })} mm`
                : "--"],
            ["Presión", numero(datos.presion_hpa, " hPa")],
            ["Índice UV", numero(datos.indice_uv)]
        ].forEach(([etiqueta, valor]) => {
            const bloque = crear("div", "pred-cifra");
            bloque.append(crear("dt", null, etiqueta), crear("dd", null, valor));
            cifras.append(bloque);
        });

        zona.append(principal, cifras);
    }

    async function cargarAhora() {
        const base = window.API_BASE || "/api";

        try {
            const respuesta = await fetch(
                `${base}/condiciones-actuales/${ESTACION_AHORA}`,
                { cache: "no-store" }
            );

            if (!respuesta.ok) {
                throw new Error(`HTTP ${respuesta.status}`);
            }

            pintarAhora(await respuesta.json());
        } catch (error) {
            pintarAhora(null);
        }
    }


    /* ------------------------------------------------------------
       Carga de la predicción
       ------------------------------------------------------------ */

    let hayPrediccion = false;

    function avisarSinPrediccion() {
        document.getElementById("pred-error").hidden = false;

        if (hayPrediccion) {
            // Se mantiene la última predicción buena, marcada como antigua.
            document.getElementById("pred-fuente").classList.add("pred-fuente-antigua");
            return;
        }

        document.getElementById("pred-fuente").textContent = "Fuente: AEMET";

        for (const id of ["pred-hoy", "pred-horas", "pred-dias"]) {
            const zona = document.getElementById(id);
            zona.textContent = "";
            zona.append(crear(id === "pred-dias" ? "li" : "p", "pred-vacio",
                "Predicción no disponible."));
        }
    }

    async function cargar() {
        const base = window.API_BASE || "/api";

        try {
            const respuesta = await fetch(`${base}/prediccion/${MUNICIPIO}`, { cache: "no-store" });

            if (!respuesta.ok) {
                throw new Error(`HTTP ${respuesta.status}`);
            }

            const datos = await respuesta.json();

            if (!Array.isArray(datos.diaria) || datos.diaria.length === 0) {
                throw new Error("respuesta sin predicción diaria");
            }

            document.getElementById("pred-error").hidden = true;
            pintar(datos);
            hayPrediccion = true;
        } catch (error) {
            // Nunca se inventa: se avisa y, si la había, se deja la última.
            avisarSinPrediccion();
        }
    }

    cargarAhora();
    cargar();

    setInterval(() => {
        if (!document.hidden) {
            cargarAhora();
        }
    }, REFRESCO_AHORA_MS);

    setInterval(() => {
        if (!document.hidden) {
            cargar();
        }
    }, REFRESCO_MS);
})();

/* Fin de fichero: js/prediccion.js */
