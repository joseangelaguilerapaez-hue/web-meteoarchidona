/*
 * MeteoArchidona · Componente «Mapa del cielo»
 *
 * El cielo de Archidona (El Silo) en un círculo: el borde es el horizonte
 * y el centro, el cenit, como en «El cielo ahora». Estrellas hasta la
 * magnitud 5 (unas 1.600), las líneas y los nombres de las constelaciones,
 * la Vía Láctea y, de nuestra API, la Luna, el Sol y los planetas.
 *
 * Decisiones de José (11-11-2026): mapa interactivo en el navegador, con
 * líneas y nombres, Vía Láctea, un deslizador para mover la hora y el modo
 * «apuntar con el móvil» (la brújula del teléfono gira el mapa).
 *
 *     <div data-componente="luna-mapa-cielo"></div>
 *
 * Opciones (todas «si» por defecto):
 *     data-lineas="no"       sin las líneas de las constelaciones.
 *     data-nombres="no"      sin nombres de constelaciones ni de estrellas.
 *     data-via-lactea="no"   sin la Vía Láctea.
 *     data-controles="no"    sin deslizador ni botones (el cielo de ahora).
 *
 * Orientación: se mira de pie, con el horizonte que tienes delante abajo
 * (como un planisferio levantado sobre la cabeza). Por defecto, mirando al
 * sur: norte arriba y este a la izquierda.
 *
 * Datos: estrellas y constelaciones de d3-celestial (Olaf Frohn, licencia
 * BSD; nombres de las constelaciones en español), en datos/cielo/, que
 * genera scripts/generar_datos_cielo.py. Coordenadas J2000 (la precesión
 * desde el año 2000, unos 0,4°, no se corrige: no se nota en el mapa).
 */

import {
    FUENTE_CALCULO, RUMBOS,
    cadaRato, crear, decimal, gradosAngulo, pedir, prepararRaiz, pie, textoError
} from "./comun.js?v=20261111-luna5";


const VERSION_DATOS = "20261111-luna5";
const LATITUD = 37.0947654;
const LONGITUD = -4.3773128;
const GRADO = Math.PI / 180;
const CADA_MS = 60 * 1000;

const RUMBOS_8 = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];

/* Color aproximado de cada estrella por su índice B-V. */
function colorEstrella(bv) {
    if (bv === null || bv === undefined) return "#ffffff";
    if (bv < 0) return "#aac8ff";
    if (bv < 0.3) return "#dfe8ff";
    if (bv < 0.6) return "#fff8ec";
    if (bv < 1.0) return "#ffe6b0";
    if (bv < 1.4) return "#ffcf8a";
    return "#ffae7a";
}

const COLORES_CUERPO = {
    SOL: "#ffd54a", LUNA: "#f2f0e6", MERCURIO: "#b9b2a6", VENUS: "#fff3c4", MARTE: "#ff7a4d",
    JUPITER: "#f3d9a4", SATURNO: "#e6c77a", URANO: "#8fe3e0", NEPTUNO: "#6f8dff"
};


/* ------------------------------------------------------------
   Datos (se piden una vez por página)
   ------------------------------------------------------------ */

const ficheros = new Map();

function fichero(nombre) {
    if (!ficheros.has(nombre)) {
        const promesa = fetch(`/datos/cielo/${nombre}.json?v=${VERSION_DATOS}`).then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        });
        promesa.catch(() => ficheros.delete(nombre));
        ficheros.set(nombre, promesa);
    }
    return ficheros.get(nombre);
}


/* ------------------------------------------------------------
   Astronomía de bolsillo: de ascensión recta y declinación a altura y
   acimut para El Silo (tiempo sidéreo de la IAU, suficiente para un mapa).
   ------------------------------------------------------------ */

function tiempoSidereoLocal(fecha) {
    const dias = fecha.getTime() / 86400000 + 2440587.5 - 2451545.0;
    const gmst = 280.46061837 + 360.98564736629 * dias;
    return ((gmst + LONGITUD) % 360 + 360) % 360;
}

function preparar(fecha) {
    return { lst: tiempoSidereoLocal(fecha), sl: Math.sin(LATITUD * GRADO), cl: Math.cos(LATITUD * GRADO) };
}

function altAz(ctx, ar, dec) {
    const h = (ctx.lst - ar) * GRADO;
    const d = dec * GRADO;
    const sd = Math.sin(d), cd = Math.cos(d), ch = Math.cos(h);
    const sa = ctx.sl * sd + ctx.cl * cd * ch;
    const alt = Math.asin(Math.max(-1, Math.min(1, sa)));
    const az = Math.atan2(-Math.sin(h) * cd, ctx.cl * sd - ctx.sl * cd * ch);
    return [alt / GRADO, ((az / GRADO) + 360) % 360];
}


/* ------------------------------------------------------------
   Formato
   ------------------------------------------------------------ */

const formatoHora = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit" });
const formatoFecha = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", weekday: "short", day: "numeric", month: "short" });

function rumbo(acimut) {
    const claves = Object.keys(RUMBOS);
    const orden = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"];
    const codigo = orden[Math.round(acimut / 22.5) % 16];
    return claves.includes(codigo) ? RUMBOS[codigo] : codigo;
}


/* ------------------------------------------------------------
   Componente
   ------------------------------------------------------------ */

export function montarMapaCielo(raiz) {
    prepararRaiz(raiz, "luna-mapa-cielo");

    const opcion = (nombre) => raiz.dataset[nombre] !== "no";
    const estado = {
        desplazamiento: 0,         // minutos respecto a «ahora» o al día elegido
        dia: null,                 // «AAAA-MM-DD» elegido, o null para hoy
        frente: 180,               // rumbo que tienes delante (abajo en el mapa)
        lineas: opcion("lineas"),
        nombres: opcion("nombres"),
        via: opcion("viaLactea"),
        apuntando: false,
        cuerpos: null,
        luz: "NOCHE",
        seleccion: null,
        datos: null,
        viaLactea: null,
        objetos: []
    };

    const marco = crear("div", "lun-mapa-marco");
    const lienzo = crear("canvas", "lun-mapa-lienzo");
    lienzo.setAttribute("role", "img");
    lienzo.setAttribute("aria-label", "Mapa del cielo de Archidona con las estrellas, las constelaciones, la Luna y los planetas");
    marco.appendChild(lienzo);
    const ficha = crear("p", "lun-mapa-ficha", "Toca una estrella, un planeta o la Luna para ver qué es.");
    const reloj = crear("p", "lun-mapa-reloj lun-cifra");
    raiz.append(reloj, marco, ficha);

    /* ---------- controles ---------- */
    const controles = crear("div", "lun-mapa-controles");
    const deslizador = crear("input", "lun-mapa-deslizador");
    deslizador.type = "range";
    deslizador.min = "-720";
    deslizador.max = "720";
    deslizador.step = "10";
    deslizador.value = "0";
    deslizador.setAttribute("aria-label", "Mover la hora (12 horas antes o después)");

    const fila = crear("div", "lun-mapa-botones");
    const ahora = crear("button", "lun-boton", "Ahora");
    ahora.type = "button";
    const fecha = crear("input", "lun-mapa-fecha");
    fecha.type = "date";
    fecha.setAttribute("aria-label", "Otra fecha");
    fila.append(ahora, fecha);

    const frentes = crear("div", "lun-mapa-botones");
    frentes.appendChild(crear("span", "lun-mapa-etiqueta", "Mirando al"));
    const botonesFrente = [];
    for (const [texto, grados] of [["N", 0], ["E", 90], ["S", 180], ["O", 270]]) {
        const b = crear("button", "lun-boton lun-mapa-frente", texto);
        b.type = "button";
        b.setAttribute("aria-label", `Mirando al ${RUMBOS[texto]}`);
        b.addEventListener("click", () => {
            pararBrujula();
            estado.frente = grados;
            dibujar();
        });
        botonesFrente.push([b, grados]);
        frentes.appendChild(b);
    }
    const movil = crear("button", "lun-boton lun-mapa-movil", "Apuntar con el móvil");
    movil.type = "button";
    frentes.appendChild(movil);

    const capas = crear("div", "lun-mapa-botones");
    const interruptor = (texto, clave) => {
        const etiqueta = crear("label", "lun-interruptor");
        const caja = crear("input");
        caja.type = "checkbox";
        caja.checked = estado[clave];
        caja.addEventListener("change", () => {
            estado[clave] = caja.checked;
            if (clave === "via" && caja.checked) cargarVia();
            dibujar();
        });
        etiqueta.append(caja, document.createTextNode(` ${texto}`));
        capas.appendChild(etiqueta);
    };
    interruptor("Líneas", "lineas");
    interruptor("Nombres", "nombres");
    interruptor("Vía Láctea", "via");

    controles.append(deslizador, fila, frentes, capas);
    if (raiz.dataset.controles !== "no") raiz.insertBefore(controles, ficha);

    pie(raiz, `Estrellas y constelaciones de d3-celestial (Olaf Frohn, licencia BSD); la Luna, el Sol y los planetas, ${FUENTE_CALCULO.charAt(0).toLowerCase()}${FUENTE_CALCULO.slice(1)}. Horas de Madrid.`);

    /* ---------- tiempo ---------- */
    const momento = () => {
        const base = estado.dia
            ? new Date(`${estado.dia}T22:00:00${desfaseMadrid(estado.dia)}`)
            : new Date();
        return new Date(base.getTime() + estado.desplazamiento * 60000);
    };

    let pedido = 0;
    let espera = null;
    const pedirCuerpos = () => {
        clearTimeout(espera);
        espera = setTimeout(async () => {
            const numero = ++pedido;
            const instante = momento();
            instante.setSeconds(0, 0);
            try {
                const datos = await pedir(`/luna/ahora?momento=${encodeURIComponent(instante.toISOString())}`, 5 * 60 * 1000);
                if (numero !== pedido) return;
                estado.cuerpos = datos.cuerpos;
                estado.luz = datos.luz;
                dibujar();
            } catch (error) {
                if (numero !== pedido) return;
                estado.cuerpos = [];
                ficha.textContent = textoError(error);
            }
        }, 250);
    };

    deslizador.addEventListener("input", () => {
        estado.desplazamiento = Number(deslizador.value);
        dibujar();
        pedirCuerpos();
    });
    ahora.addEventListener("click", () => {
        estado.desplazamiento = 0;
        estado.dia = null;
        deslizador.value = "0";
        fecha.value = "";
        dibujar();
        pedirCuerpos();
    });
    fecha.addEventListener("change", () => {
        estado.dia = fecha.value || null;
        estado.desplazamiento = 0;
        deslizador.value = "0";
        dibujar();
        pedirCuerpos();
    });

    /* ---------- brújula del móvil ---------- */
    const alGirar = (evento) => {
        let rumboMovil = null;
        if (typeof evento.webkitCompassHeading === "number") {
            rumboMovil = evento.webkitCompassHeading;
        } else if (evento.absolute && typeof evento.alpha === "number") {
            rumboMovil = (360 - evento.alpha) % 360;
        }
        if (rumboMovil === null) return;
        // Suavizado para que no baile.
        const diferencia = ((rumboMovil - estado.frente + 540) % 360) - 180;
        estado.frente = (estado.frente + diferencia * 0.3 + 360) % 360;
        programarDibujo();
    };
    function pararBrujula() {
        if (!estado.apuntando) return;
        estado.apuntando = false;
        window.removeEventListener("deviceorientationabsolute", alGirar);
        window.removeEventListener("deviceorientation", alGirar);
        movil.classList.remove("lun-activo");
        movil.textContent = "Apuntar con el móvil";
    }
    movil.addEventListener("click", async () => {
        if (estado.apuntando) {
            pararBrujula();
            return;
        }
        try {
            if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
                const permiso = await DeviceOrientationEvent.requestPermission();
                if (permiso !== "granted") throw new Error("sin permiso");
            }
        } catch (error) {
            ficha.textContent = "El navegador no ha dado permiso para usar la brújula del móvil.";
            return;
        }
        if (typeof window.DeviceOrientationEvent === "undefined") {
            ficha.textContent = "Este dispositivo no tiene brújula; elige hacia dónde miras con los botones.";
            return;
        }
        estado.apuntando = true;
        movil.classList.add("lun-activo");
        movil.textContent = "Dejar de apuntar";
        ficha.textContent = "Ponte de pie con el móvil delante: abajo en el mapa queda el horizonte que tienes enfrente.";
        window.addEventListener("deviceorientationabsolute", alGirar);
        window.addEventListener("deviceorientation", alGirar);
    });

    /* ---------- dibujo ---------- */
    let pendiente = false;
    function programarDibujo() {
        if (pendiente) return;
        pendiente = true;
        requestAnimationFrame(() => {
            pendiente = false;
            dibujar();
        });
    }

    function dibujar() {
        if (!estado.datos) return;
        const instante = momento();
        reloj.textContent = `${formatoFecha.format(instante)}, ${formatoHora.format(instante)}${estado.desplazamiento === 0 && !estado.dia ? " · ahora" : ""}`;
        for (const [b, grados] of botonesFrente) b.classList.toggle("lun-activo", !estado.apuntando && estado.frente === grados);

        const lado = Math.max(220, Math.min(marco.clientWidth || 360, 720));
        const escala = window.devicePixelRatio || 1;
        lienzo.width = Math.round(lado * escala);
        lienzo.height = Math.round(lado * escala);
        lienzo.style.width = `${lado}px`;
        lienzo.style.height = `${lado}px`;
        const g = lienzo.getContext("2d");
        g.setTransform(escala, 0, 0, escala, 0, 0);
        g.clearRect(0, 0, lado, lado);

        const pequeno = lado < 480;
        const centro = lado / 2;
        const radio = centro - 22;
        const giro = estado.frente;
        const proyectar = (alt, az) => {
            const r = radio * (1 - alt / 90);
            const t = (180 - az + giro) * GRADO;
            return [centro + r * Math.sin(t), centro - r * Math.cos(t)];
        };

        const estilo = getComputedStyle(raiz);
        const color = (variable, porDefecto) => (estilo.getPropertyValue(variable) || "").trim() || porDefecto;

        // Fondo según la luz.
        const fondos = {
            DIA: "#3a6fb8", CREPUSCULO_CIVIL: "#26407e", CREPUSCULO_NAUTICO: "#16285a",
            CREPUSCULO_ASTRONOMICO: "#0c1838", NOCHE: "#050b1e"
        };
        g.save();
        g.beginPath();
        g.arc(centro, centro, radio, 0, 2 * Math.PI);
        g.fillStyle = fondos[estado.luz] || fondos.NOCHE;
        g.fill();
        g.clip();

        const ctx = preparar(instante);
        const objetos = [];

        // Vía Láctea.
        if (estado.via && estado.viaLactea) {
            const opacidades = { ol1: 0.07, ol2: 0.08, ol3: 0.09 };
            for (const [nivel, poligonos] of Object.entries(estado.viaLactea)) {
                g.fillStyle = `rgba(200, 215, 255, ${opacidades[nivel] || 0.06})`;
                for (const poligono of poligonos) {
                    g.beginPath();
                    let dentro = false;
                    poligono.forEach(([ar, dec], i) => {
                        const [alt, az] = altAz(ctx, ar, dec);
                        if (alt > -30) dentro = true;
                        const [x, y] = proyectar(Math.max(alt, -40), az);
                        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
                    });
                    if (dentro) g.fill();
                }
            }
        }

        // Anillos de 30° y 60°.
        g.strokeStyle = "rgba(127, 211, 255, 0.12)";
        g.lineWidth = 1;
        for (const alt of [30, 60]) {
            g.beginPath();
            g.arc(centro, centro, radio * (1 - alt / 90), 0, 2 * Math.PI);
            g.stroke();
        }

        // Líneas de las constelaciones.
        if (estado.lineas) {
            g.strokeStyle = "rgba(127, 211, 255, 0.35)";
            g.lineWidth = 0.9;
            for (const tramos of Object.values(estado.datos.lineas)) {
                for (const tramo of tramos) {
                    g.beginPath();
                    let anterior = null;
                    for (const [ar, dec] of tramo) {
                        const [alt, az] = altAz(ctx, ar, dec);
                        const [x, y] = proyectar(Math.max(alt, -15), az);
                        if (anterior !== null && (alt > -5 || anterior > -5)) g.lineTo(x, y); else g.moveTo(x, y);
                        anterior = alt;
                    }
                    g.stroke();
                }
            }
        }

        // Estrellas.
        const nombres = estado.datos.nombres;
        estado.datos.estrellas.forEach(([ar, dec, mag, bv], i) => {
            const [alt, az] = altAz(ctx, ar, dec);
            if (alt < 0) return;
            const [x, y] = proyectar(alt, az);
            const r = Math.max(0.5, (5.6 - mag) * 0.55) * (lado / 520 + 0.4);
            g.beginPath();
            g.arc(x, y, r, 0, 2 * Math.PI);
            g.fillStyle = colorEstrella(bv);
            g.globalAlpha = estado.luz === "DIA" ? 0.25 : 1;
            g.fill();
            g.globalAlpha = 1;
            const nombre = nombres[String(i)];
            if (mag <= 3.5 || nombre) {
                objetos.push({ x, y, tipo: "estrella", nombre: nombre || null, mag, alt, az });
            }
            if (estado.nombres && nombre && mag <= (pequeno ? 1.3 : 2.1) && alt > 4) {
                g.fillStyle = "rgba(230, 236, 248, 0.75)";
                g.font = "11px 'JetBrains Mono', monospace";
                g.fillText(nombre, x + r + 3, y + 3);
            }
        });

        // Nombres de las constelaciones.
        if (estado.nombres) {
            g.fillStyle = color("--lun-oro", "#f2c94c");
            g.globalAlpha = 0.55;
            g.font = "10px 'JetBrains Mono', monospace";
            g.textAlign = "center";
            for (const c of estado.datos.constelaciones) {
                if (pequeno && c.r > 1) continue;
                const [alt, az] = altAz(ctx, c.p[0], c.p[1]);
                if (alt < 6) continue;
                const [x, y] = proyectar(alt, az);
                g.fillText(c.n.toUpperCase(), x, y);
            }
            g.globalAlpha = 1;
            g.textAlign = "start";
        }

        // Sol, Luna y planetas (de la API).
        for (const cuerpo of estado.cuerpos || []) {
            if (cuerpo.altura < -1) continue;
            const [x, y] = proyectar(cuerpo.altura, cuerpo.acimut);
            const grande = cuerpo.cuerpo === "SOL" || cuerpo.cuerpo === "LUNA";
            const r = grande ? 7 : 3.6;
            g.beginPath();
            g.arc(x, y, r, 0, 2 * Math.PI);
            g.fillStyle = COLORES_CUERPO[cuerpo.cuerpo] || "#ffffff";
            g.shadowColor = g.fillStyle;
            g.shadowBlur = grande ? 12 : 6;
            g.fill();
            g.shadowBlur = 0;
            g.fillStyle = color("--lun-oro-claro", "#f8e3a0");
            g.font = "bold 11px system-ui, sans-serif";
            g.fillText(cuerpo.nombre, x + r + 4, y + 4);
            objetos.push({ x, y, tipo: "cuerpo", cuerpo, alt: cuerpo.altura, az: cuerpo.acimut });
        }
        g.restore();

        // Borde y rumbos.
        g.beginPath();
        g.arc(centro, centro, radio, 0, 2 * Math.PI);
        g.strokeStyle = color("--lun-borde-fuerte", "#3a5190");
        g.lineWidth = 1.5;
        g.stroke();
        g.textAlign = "center";
        g.textBaseline = "middle";
        RUMBOS_8.forEach((texto, i) => {
            const az = i * 45;
            const r = radio + 12;
            const t = (180 - az + giro) * GRADO;
            g.fillStyle = texto.length === 1 ? color("--lun-oro", "#f2c94c") : color("--lun-texto-tenue", "#7f8db0");
            g.font = texto.length === 1 ? "bold 12px system-ui, sans-serif" : "10px system-ui, sans-serif";
            g.fillText(texto, centro + r * Math.sin(t), centro - r * Math.cos(t));
        });
        g.textAlign = "start";
        g.textBaseline = "alphabetic";

        estado.objetos = objetos;
        if (estado.seleccion) describir(estado.seleccion.clave);
    }

    /* ---------- tocar para identificar ---------- */
    function describir(clave) {
        const objeto = estado.objetos.find(o => claveDe(o) === clave);
        if (!objeto) {
            ficha.textContent = "Se ha ido por debajo del horizonte.";
            return;
        }
        const posicion = `a ${gradosAngulo(objeto.alt)} de altura, hacia el ${rumbo(objeto.az)} (acimut ${gradosAngulo(objeto.az)})`;
        if (objeto.tipo === "cuerpo") {
            const c = objeto.cuerpo;
            const extra = [];
            if (c.magnitud !== null && c.magnitud !== undefined) extra.push(`brillo ${decimal(c.magnitud)}`);
            if (c.constelacion_nombre) extra.push(`en ${c.constelacion_nombre}`);
            if (c.iluminacion !== null && c.iluminacion !== undefined && c.cuerpo === "LUNA") extra.push(`${decimal(c.iluminacion)} % iluminada`);
            ficha.textContent = `${c.nombre}: ${posicion}${extra.length ? `; ${extra.join(", ")}` : ""}.`;
        } else {
            ficha.textContent = `${objeto.nombre ? `${objeto.nombre}, estrella` : "Estrella"} de brillo ${decimal(objeto.mag)}: ${posicion}.`;
        }
    }
    const claveDe = (o) => (o.tipo === "cuerpo" ? `c-${o.cuerpo.cuerpo}` : `e-${o.mag}-${o.nombre}`);

    lienzo.addEventListener("click", (evento) => {
        const caja = lienzo.getBoundingClientRect();
        const x = evento.clientX - caja.left;
        const y = evento.clientY - caja.top;
        let mejor = null;
        let distancia = 22;
        for (const o of estado.objetos) {
            // Los cuerpos ganan a las estrellas a igual distancia.
            const d = Math.hypot(o.x - x, o.y - y) - (o.tipo === "cuerpo" ? 6 : 0);
            if (d < distancia) {
                distancia = d;
                mejor = o;
            }
        }
        if (!mejor) {
            estado.seleccion = null;
            ficha.textContent = "Ahí no hay nada brillante. Prueba a tocar más cerca de un punto.";
            return;
        }
        estado.seleccion = { clave: claveDe(mejor) };
        describir(estado.seleccion.clave);
    });

    /* ---------- carga ---------- */
    function cargarVia() {
        if (estado.viaLactea) return;
        fichero("via-lactea").then(datos => {
            estado.viaLactea = datos;
            dibujar();
        }).catch(() => {});
    }

    if (typeof ResizeObserver === "function") {
        new ResizeObserver(() => programarDibujo()).observe(marco);
    }

    ficha.textContent = "Cargando el cielo…";
    Promise.all(["estrellas", "nombres", "constelaciones", "lineas"].map(fichero))
        .then(([estrellas, nombres, constelaciones, lineas]) => {
            estado.datos = { estrellas, nombres, constelaciones, lineas };
            ficha.textContent = "Toca una estrella, un planeta o la Luna para ver qué es.";
            if (estado.via) cargarVia();
            dibujar();
            // Cada minuto, si se está viendo «ahora».
            cadaRato(raiz, () => {
                if (estado.desplazamiento === 0 && !estado.dia) {
                    dibujar();
                    pedirCuerpos();
                }
            }, CADA_MS);
        })
        .catch(error => {
            ficha.textContent = `No se han podido cargar las estrellas (${error.message}).`;
            ficha.classList.add("error");
        });
}


/* «+01:00» o «+02:00» según el horario de Madrid de ese día. */
function desfaseMadrid(dia) {
    const prueba = new Date(`${dia}T12:00:00Z`);
    const madrid = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", hour: "2-digit", hourCycle: "h23" }).format(prueba);
    return Number(madrid) - 12 === 2 ? "+02:00" : "+01:00";
}


/* Fin de fichero: js/luna/mapa-cielo.js */
