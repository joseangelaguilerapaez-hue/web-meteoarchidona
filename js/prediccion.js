/*
 * MeteoArchidona · Predicción
 *
 * Pide GET /prediccion/archidona a nuestra API y pinta la página:
 * hoy, próximas horas, próximos 7 días, avisos y procedencia. El
 * formato está en docs/prediccion-endpoint.md.
 *
 * Mientras la API no tenga esa ruta (404) o falle, pinta datos de
 * muestra generados aquí y enseña el aviso #pred-muestra. No son una
 * previsión y la página lo dice; en cuanto la ruta responda, se usan
 * los datos reales sin tocar nada.
 */

(function () {
    "use strict";

    const MUNICIPIO = "archidona";
    const ZONA = "Europe/Madrid";

    // La predicción cambia pocas veces al día: basta con recargar cada 30 min.
    const REFRESCO_MS = 30 * 60 * 1000;

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
       Datos de muestra
       ------------------------------------------------------------ */

    /*
     * Solo para ver la página mientras no exista la ruta de la API.
     * Van fechados desde hoy para que se lea bien, pero las cifras son
     * inventadas y la página lo dice con el aviso #pred-muestra.
     */
    function datosDeMuestra() {
        const ahora = new Date();
        const hoy = fechaLocal(ahora);
        const condiciones = [
            ["poco_nuboso", "Poco nuboso"], ["intervalos_nubosos", "Intervalos nubosos"],
            ["chubascos", "Chubascos"], ["tormenta", "Tormenta"], ["nuboso", "Nuboso"],
            ["despejado", "Despejado"], ["despejado", "Despejado"]
        ];
        const maximas = [27, 25, 21, 19, 22, 25, 26];
        const minimas = [14, 14, 13, 12, 11, 12, 13];
        const lluvia = [5, 20, 70, 80, 30, 0, 0];
        const vientos = [["SE", 15], ["S", 20], ["SO", 25], ["O", 30], ["NO", 20], ["N", 10], ["NE", 10]];

        const diaria = condiciones.map(([condicion, descripcion], i) => ({
            fecha: fechaLocal(new Date(desdeFechaIso(hoy).valueOf() + i * 86400000)),
            condicion,
            descripcion,
            temperatura_max_c: maximas[i],
            temperatura_min_c: minimas[i],
            prob_precipitacion_pct: lluvia[i],
            viento_direccion: vientos[i][0],
            viento_kmh: vientos[i][1],
            racha_max_kmh: vientos[i][1] * 2,
            uv_max: [6, 5, 3, 2, 4, 6, 6][i]
        }));

        const inicio = new Date(ahora);
        inicio.setMinutes(0, 0, 0);

        const horaria = Array.from({ length: 48 }, (_, i) => {
            const instante = new Date(inicio.valueOf() + i * 3600000);
            const hora = Number(formatoSoloHora.format(instante));
            const dia = Math.min(6, Math.floor((instante - desdeFechaIso(hoy)) / 86400000 + 0.5));
            const d = diaria[Math.max(0, dia)];
            const onda = (1 - Math.cos(((hora - 6 + 24) % 24) / 24 * 2 * Math.PI)) / 2;
            const noche = hora < 8 || hora >= 21;

            return {
                instante: instante.toISOString(),
                condicion: noche && d.condicion === "chubascos" ? "nuboso" : d.condicion,
                descripcion: d.descripcion,
                es_noche: noche,
                temperatura_c: d.temperatura_min_c + (d.temperatura_max_c - d.temperatura_min_c) * onda,
                sensacion_c: null,
                prob_precipitacion_pct: d.prob_precipitacion_pct,
                precipitacion_mm: null,
                viento_direccion: d.viento_direccion,
                viento_kmh: d.viento_kmh,
                racha_kmh: null,
                humedad_pct: null
            };
        });

        return {
            municipio: { codigo: MUNICIPIO, nombre: "Archidona", codigo_ine: null },
            fuente: { nombre: "Datos de muestra", url: null, emitida: null, obtenida: null },
            desactualizada: false,
            diaria,
            horaria,
            avisos: [],
            muestra: true
        };
    }


    /* ------------------------------------------------------------
       Pintado
       ------------------------------------------------------------ */

    function pintarFuente(datos) {
        const fuente = document.getElementById("pred-fuente");
        const muestra = document.getElementById("pred-muestra");

        muestra.hidden = !datos.muestra;
        fuente.textContent = "";
        fuente.classList.toggle("pred-fuente-antigua", Boolean(datos.desactualizada));

        if (datos.muestra) {
            fuente.textContent = "Previsión de ejemplo mientras se conecta AEMET";
            return;
        }

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

        const noche = hora ? Boolean(hora.es_noche) : false;
        const condicion = hora ? hora.condicion : dia.condicion;
        const descripcion = hora ? hora.descripcion : dia.descripcion;

        const principal = crear("div", "pred-hoy-principal");
        const dibujo = crear("div", "pred-hoy-icono");
        dibujo.innerHTML = icono(condicion, noche);

        const texto = crear("div", "pred-hoy-texto");
        texto.append(
            crear("h2", "pred-hoy-titulo", "Ahora en Archidona"),
            crear("div", "pred-hoy-temperatura", hora ? numero(hora.temperatura_c, "°") : "--"),
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
       Carga
       ------------------------------------------------------------ */

    async function cargar() {
        const base = window.API_BASE || "https://api-meteoarchidona.onrender.com";

        try {
            const respuesta = await fetch(`${base}/prediccion/${MUNICIPIO}`, { cache: "no-store" });

            if (!respuesta.ok) {
                throw new Error(`HTTP ${respuesta.status}`);
            }

            const datos = await respuesta.json();

            if (!Array.isArray(datos.diaria) || datos.diaria.length === 0) {
                throw new Error("respuesta sin predicción diaria");
            }

            pintar(datos);

        } catch (error) {
            // Sin ruta de predicción todavía: se enseña la muestra, avisada.
            pintar(datosDeMuestra());
        }
    }

    cargar();

    setInterval(() => {
        if (!document.hidden) {
            cargar();
        }
    }, REFRESCO_MS);
})();

/* Fin de fichero: js/prediccion.js */
