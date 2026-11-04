/*
 * MeteoArchidona · Sol
 *
 * Rellena pages/sol.html con el tiempo espacial: escalas NOAA (R, S,
 * G), índices (Kp, viento solar, Bz, rayos X, flujo F10.7), alertas
 * traducidas, gráfica del Kp con su previsión, fulguraciones de la
 * semana y las imágenes del Sol.
 *
 * Todo se pide directamente a los servicios públicos de la NOAA
 * (services.swpc.noaa.gov), que permiten leerlos desde cualquier web,
 * y las imágenes a la NASA (SDO) y a la ESA/NASA (SOHO) por sus rutas
 * fijas «latest». No pasa por la API de MeteoArchidona.
 *
 * Cada panel se carga por su cuenta: si un servicio falla, ese panel
 * dice que no está disponible y los demás siguen.
 *
 * Refresco: datos cada 5 minutos e imágenes cada 15, solo con la
 * pestaña a la vista. La NASA pide no pedir sus imágenes más a menudo
 * de lo que se renuevan.
 *
 * Las horas de la NOAA vienen en UTC (a veces sin la «Z»); aquí se
 * enseñan siempre en hora de Madrid.
 */

(function () {
    "use strict";

    const NOAA = "https://services.swpc.noaa.gov";

    const FUENTES = {
        escalas: `${NOAA}/products/noaa-scales.json`,
        alertas: `${NOAA}/products/alerts.json`,
        kp: `${NOAA}/products/noaa-planetary-k-index.json`,
        kpPrevision: `${NOAA}/products/noaa-planetary-k-index-forecast.json`,
        flujo: `${NOAA}/products/10cm-flux-30-day.json`,
        viento: `${NOAA}/products/summary/solar-wind-speed.json`,
        campo: `${NOAA}/products/summary/solar-wind-mag-field.json`,
        rayosX: `${NOAA}/json/goes/primary/xray-flares-latest.json`,
        fulguraciones: `${NOAA}/json/goes/primary/xray-flares-7-day.json`
    };

    const SDO = "https://sdo.gsfc.nasa.gov/assets/img/latest";

    /* Filtros del visor del Sol. El primero es el que sale al entrar. */
    const FILTROS = [
        {
            id: "0193",
            nombre: "Corona",
            texto: "AIA 193 Å. La corona a un millón y medio de grados: los huecos oscuros son agujeros coronales, de donde sale el viento solar rápido."
        },
        {
            id: "0171",
            nombre: "Arcos",
            texto: "AIA 171 Å. Los arcos de plasma que dibuja el campo magnético sobre las regiones activas."
        },
        {
            id: "0304",
            nombre: "Protuberancias",
            texto: "AIA 304 Å. La cromosfera, a unos 50 000 grados: se ven bien las protuberancias en el borde del disco y los filamentos."
        },
        {
            id: "0131",
            nombre: "Fulguraciones",
            texto: "AIA 131 Å. El plasma más caliente, a más de diez millones de grados: donde brilla con fuerza hay o ha habido una fulguración."
        },
        {
            id: "HMIIC",
            nombre: "Manchas",
            texto: "HMI, luz visible. El Sol como se vería con un filtro solar: las manchas solares son los puntos oscuros."
        },
        {
            id: "HMIB",
            nombre: "Magnetismo",
            texto: "HMI, magnetograma. Polaridad del campo magnético: blanco y negro son polos opuestos. Las regiones con los dos muy juntos son las que más fulguraciones dan."
        }
    ];

    const DATOS_CADA_MS = 5 * 60 * 1000;
    const IMAGENES_CADA_MS = 15 * 60 * 1000;
    const ESPERA_MAXIMA_MS = 20000;

    const ZONA = "Europe/Madrid";

    const formatoFechaHora = new Intl.DateTimeFormat("es-ES", {
        timeZone: ZONA,
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
    });

    const formatoHora = new Intl.DateTimeFormat("es-ES", {
        timeZone: ZONA,
        hour: "2-digit",
        minute: "2-digit"
    });

    const formatoDia = new Intl.DateTimeFormat("es-ES", {
        timeZone: ZONA,
        weekday: "short",
        day: "numeric"
    });

    /* Los días de la previsión de la NOAA son días UTC. */
    const formatoDiaCorto = new Intl.DateTimeFormat("es-ES", {
        timeZone: "UTC",
        weekday: "short",
        day: "numeric",
        month: "short"
    });

    const formatoHoraMadrid = new Intl.DateTimeFormat("es-ES", {
        timeZone: ZONA,
        hour: "numeric",
        hourCycle: "h23"
    });

    let filtroActual = FILTROS[0].id;


    /* ------------------------------------------------------------
       Utilidades
       ------------------------------------------------------------ */

    function $(id) {
        return document.getElementById(id);
    }

    function crear(etiqueta, clase, texto) {
        const nodo = document.createElement(etiqueta);
        if (clase) nodo.className = clase;
        if (texto !== undefined && texto !== null) nodo.textContent = texto;
        return nodo;
    }

    function vaciar(nodo) {
        while (nodo.firstChild) nodo.removeChild(nodo.firstChild);
    }

    function aviso(nodo, texto) {
        vaciar(nodo);
        nodo.appendChild(crear("p", "sol-aviso", texto));
    }

    /* La NOAA mezcla «2026-11-02 12:03:53.987», «2026-11-02T00:00:00» y
     * «2026-11-02T22:10:00Z». Todo es UTC. */
    function fechaUTC(texto) {
        if (!texto) return null;
        let limpio = String(texto).trim().replace(" ", "T");
        if (!/[zZ]|[+-]\d\d:?\d\d$/.test(limpio)) limpio += "Z";
        const fecha = new Date(limpio);
        return isNaN(fecha) ? null : fecha;
    }

    function fechaHora(fecha) {
        return fecha ? formatoFechaHora.format(fecha) : "—";
    }

    function hora(fecha) {
        return fecha ? formatoHora.format(fecha) : "—";
    }

    async function pedir(url) {
        const control = new AbortController();
        const reloj = setTimeout(() => control.abort(), ESPERA_MAXIMA_MS);
        try {
            const respuesta = await fetch(url, {
                cache: "no-store",
                signal: control.signal
            });
            if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
            return await respuesta.json();
        } finally {
            clearTimeout(reloj);
        }
    }

    /* Algunos productos de la NOAA eran tablas (la primera fila, los
     * nombres de las columnas) y pasaron a lista de objetos. Se aceptan
     * las dos formas. */
    function comoObjetos(datos) {
        if (!Array.isArray(datos) || datos.length === 0) return [];
        if (!Array.isArray(datos[0])) return datos;
        const columnas = datos[0];
        return datos.slice(1).map(fila => {
            const objeto = {};
            columnas.forEach((columna, i) => { objeto[columna] = fila[i]; });
            return objeto;
        });
    }

    function numero(valor) {
        const n = parseFloat(valor);
        return isFinite(n) ? n : null;
    }


    /* ------------------------------------------------------------
       Niveles y colores
       ------------------------------------------------------------ */

    /* Nivel 0 a 5, el mismo que las escalas R, S y G. Lo usa la hoja
     * (nivel-0 ... nivel-5) para el color. */
    function nivelKp(kp) {
        if (kp === null) return 0;
        if (kp >= 9) return 5;
        if (kp >= 8) return 4;
        if (kp >= 7) return 3;
        if (kp >= 6) return 2;
        if (kp >= 5) return 1;
        return 0;
    }

    function textoKp(kp) {
        if (kp === null) return "Sin dato";
        if (kp >= 5) return `Tormenta G${Math.min(5, Math.floor(kp) - 4)}`;
        if (kp >= 4) return "Activo";
        if (kp >= 3) return "Algo inquieto";
        return "Tranquilo";
    }

    function claseKp(kp) {
        if (kp !== null && kp >= 5) return `nivel-${nivelKp(kp)}`;
        if (kp !== null && kp >= 4) return "nivel-activo";
        return "nivel-0";
    }

    const NOMBRES_ESCALA = {
        0: "Sin incidencias",
        1: "Menor",
        2: "Moderada",
        3: "Fuerte",
        4: "Severa",
        5: "Extrema"
    };

    function nivelFulguracion(clase) {
        const letra = String(clase || "").charAt(0).toUpperCase();
        return { X: "x", M: "m", C: "c" }[letra] || "b";
    }

    /* Para ordenar fulguraciones por fuerza: «M2.3» → 2.3e-5. */
    function fuerzaFulguracion(clase) {
        const m = /^([ABCMX])(\d+(?:\.\d+)?)/i.exec(String(clase || ""));
        if (!m) return 0;
        const base = { A: 1e-8, B: 1e-7, C: 1e-6, M: 1e-5, X: 1e-4 }[m[1].toUpperCase()];
        return base * parseFloat(m[2]);
    }


    /* ------------------------------------------------------------
       Ahora mismo: escalas
       ------------------------------------------------------------ */

    let escalasNOAA = null;

    async function cargarEscalas() {
        const caja = $("solEscalas");
        try {
            escalasNOAA = await pedir(FUENTES.escalas);
            pintarEscalas(caja, escalasNOAA["0"] || {});
            pintarPrevision(escalasNOAA);
            return true;
        } catch (error) {
            aviso(caja, "Las escalas de la NOAA no están disponibles ahora.");
            aviso($("solPrevision"), "La previsión de la NOAA no está disponible ahora.");
            return false;
        }
    }

    function pintarEscalas(caja, ahora) {
        vaciar(caja);
        const escalas = [
            ["R", "Apagones de radio"],
            ["S", "Tormenta de radiación"],
            ["G", "Tormenta geomagnética"]
        ];
        for (const [letra, nombre] of escalas) {
            const valor = parseInt((ahora[letra] || {}).Scale, 10);
            const nivel = isFinite(valor) ? Math.max(0, Math.min(5, valor)) : 0;
            const ficha = crear("div", `sol-escala nivel-${nivel}`);
            ficha.appendChild(crear("span", "sol-escala-letra", `${letra}${nivel}`));
            const textos = crear("span", "sol-escala-textos");
            textos.appendChild(crear("span", "sol-escala-nombre", nombre));
            textos.appendChild(crear("span", "sol-escala-estado", NOMBRES_ESCALA[nivel]));
            ficha.appendChild(textos);
            caja.appendChild(ficha);
        }
    }

    function pintarPrevision(escalas) {
        const caja = $("solPrevision");
        const dias = ["1", "2", "3"].map(k => escalas[k]).filter(Boolean);
        if (dias.length === 0) {
            aviso(caja, "La NOAA no ha publicado previsión.");
            return;
        }

        vaciar(caja);
        const tabla = crear("table", "sol-tabla");
        const cabecera = crear("tr");
        ["Día", "Radio R1–R2", "Radio R3+", "Radiación S1+", "Tormenta G"].forEach(t => {
            const th = crear("th", null, t);
            th.scope = "col";
            cabecera.appendChild(th);
        });
        const thead = crear("thead");
        thead.appendChild(cabecera);
        tabla.appendChild(thead);

        const cuerpo = crear("tbody");
        for (const dia of dias) {
            const fila = crear("tr");
            const fecha = fechaUTC(`${dia.DateStamp}T12:00:00`);
            const th = crear("th", null, fecha ? formatoDiaCorto.format(fecha) : dia.DateStamp);
            th.scope = "row";
            fila.appendChild(th);

            const r = dia.R || {};
            const s = dia.S || {};
            const g = dia.G || {};
            fila.appendChild(celdaProbabilidad(r.MinorProb));
            fila.appendChild(celdaProbabilidad(r.MajorProb));
            fila.appendChild(celdaProbabilidad(s.Prob));

            const gNivel = parseInt(g.Scale, 10);
            const celdaG = crear("td");
            const nivel = isFinite(gNivel) ? Math.max(0, Math.min(5, gNivel)) : 0;
            const marca = crear("span", `sol-marca nivel-${nivel}`,
                nivel > 0 ? `G${nivel}` : "No");
            celdaG.appendChild(marca);
            fila.appendChild(celdaG);

            cuerpo.appendChild(fila);
        }
        tabla.appendChild(cuerpo);

        const envoltorio = crear("div", "sol-tabla-envoltorio");
        envoltorio.appendChild(tabla);
        caja.appendChild(envoltorio);
    }

    function celdaProbabilidad(valor) {
        const n = numero(valor);
        const celda = crear("td", "sol-probabilidad", n === null ? "—" : `${n} %`);
        if (n !== null && n >= 30) celda.classList.add("alta");
        else if (n !== null && n >= 10) celda.classList.add("media");
        return celda;
    }


    /* ------------------------------------------------------------
       Ahora mismo: índices
       ------------------------------------------------------------ */

    async function cargarIndices() {
        const caja = $("solIndices");

        const resultados = await Promise.allSettled([
            pedir(FUENTES.kp),
            pedir(FUENTES.viento),
            pedir(FUENTES.campo),
            pedir(FUENTES.rayosX),
            pedir(FUENTES.flujo)
        ]);

        const valor = i => resultados[i].status === "fulfilled" ? resultados[i].value : null;

        vaciar(caja);

        /* Kp */
        const kps = comoObjetos(valor(0));
        const ultimoKp = kps[kps.length - 1];
        const kp = ultimoKp ? numero(ultimoKp.Kp ?? ultimoKp.kp) : null;
        caja.appendChild(ficha({
            nombre: "Índice Kp",
            valor: kp === null ? "—" : String(Math.round(kp * 100) / 100).replace(".", ","),
            unidad: "",
            estado: textoKp(kp),
            clase: claseKp(kp),
            cuando: ultimoKp ? `Tramo de las ${hora(fechaUTC(ultimoKp.time_tag))}` : ""
        }));

        /* Viento solar */
        const viento = comoObjetos(valor(1))[0];
        const velocidad = viento ? numero(viento.proton_speed) : null;
        let estadoViento = "Sin dato";
        let claseViento = "nivel-0";
        if (velocidad !== null) {
            if (velocidad >= 700) { estadoViento = "Muy rápido"; claseViento = "nivel-1"; }
            else if (velocidad >= 500) { estadoViento = "Rápido"; claseViento = "nivel-activo"; }
            else if (velocidad >= 350) { estadoViento = "Normal"; }
            else { estadoViento = "Lento"; }
        }
        caja.appendChild(ficha({
            nombre: "Viento solar",
            valor: velocidad === null ? "—" : String(Math.round(velocidad)),
            unidad: "km/s",
            estado: estadoViento,
            clase: claseViento,
            cuando: viento ? `A las ${hora(fechaUTC(viento.time_tag))}` : ""
        }));

        /* Campo magnético interplanetario */
        const campo = comoObjetos(valor(2))[0];
        const bz = campo ? numero(campo.bz_gsm) : null;
        const bt = campo ? numero(campo.bt) : null;
        let estadoBz = "Sin dato";
        let claseBz = "nivel-0";
        if (bz !== null) {
            if (bz <= -10) { estadoBz = "Muy al sur"; claseBz = "nivel-1"; }
            else if (bz <= -5) { estadoBz = "Hacia el sur"; claseBz = "nivel-activo"; }
            else if (bz < 0) { estadoBz = "Algo al sur"; }
            else { estadoBz = "Hacia el norte"; }
        }
        caja.appendChild(ficha({
            nombre: "Campo Bz",
            valor: bz === null ? "—" : String(bz).replace(".", ","),
            unidad: "nT",
            estado: bt === null ? estadoBz : `${estadoBz} · Bt ${String(bt).replace(".", ",")} nT`,
            clase: claseBz,
            cuando: campo ? `A las ${hora(fechaUTC(campo.time_tag))}` : ""
        }));

        /* Rayos X */
        const rayos = valor(3);
        const ultimaFulguracion = Array.isArray(rayos) ? rayos[rayos.length - 1] : rayos;
        const claseActual = ultimaFulguracion
            ? (ultimaFulguracion.current_class || null)
            : null;
        const cuandoRayos = ultimaFulguracion
            ? fechaUTC(ultimaFulguracion.current_time || ultimaFulguracion.time_tag)
            : null;
        const nivelRayos = nivelFulguracion(claseActual);
        caja.appendChild(ficha({
            nombre: "Rayos X",
            valor: claseActual || "—",
            unidad: "",
            estado: claseActual
                ? { x: "Fulguración X", m: "Fulguración M", c: "Actividad moderada", b: "Tranquilo" }[nivelRayos]
                : "Sin dato",
            clase: { x: "nivel-2", m: "nivel-1", c: "nivel-activo", b: "nivel-0" }[nivelRayos],
            cuando: cuandoRayos ? `A las ${hora(cuandoRayos)}` : ""
        }));

        /* Flujo solar F10.7 */
        const flujos = comoObjetos(valor(4));
        const ultimoFlujo = flujos[flujos.length - 1];
        const f107 = ultimoFlujo ? numero(ultimoFlujo.flux ?? ultimoFlujo.f10_7) : null;
        let estadoFlujo = "Sin dato";
        if (f107 !== null) {
            if (f107 >= 200) estadoFlujo = "Actividad muy alta";
            else if (f107 >= 150) estadoFlujo = "Actividad alta";
            else if (f107 >= 100) estadoFlujo = "Actividad moderada";
            else estadoFlujo = "Actividad baja";
        }
        caja.appendChild(ficha({
            nombre: "Flujo F10.7",
            valor: f107 === null ? "—" : String(Math.round(f107)),
            unidad: "sfu",
            estado: estadoFlujo,
            clase: "nivel-0",
            cuando: ultimoFlujo ? formatoDia.format(fechaUTC(ultimoFlujo.time_tag)) : ""
        }));

        return resultados.some(r => r.status === "fulfilled");
    }

    function ficha({ nombre, valor, unidad, estado, clase, cuando }) {
        const nodo = crear("div", `sol-indice ${clase || ""}`);
        nodo.appendChild(crear("span", "sol-indice-nombre", nombre));
        const linea = crear("span", "sol-indice-valor", valor);
        if (unidad) linea.appendChild(crear("small", null, ` ${unidad}`));
        nodo.appendChild(linea);
        nodo.appendChild(crear("span", "sol-indice-estado", estado));
        if (cuando) nodo.appendChild(crear("span", "sol-indice-cuando", cuando));
        return nodo;
    }


    /* ------------------------------------------------------------
       Alertas
       ------------------------------------------------------------ */

    const TIPOS_ALERTA = [
        [/^CANCEL/i, "Cancelado", "cancelada"],
        [/^EXTENDED WARNING/i, "Aviso prolongado", "aviso"],
        [/^CONTINUED ALERT/i, "Alerta continuada", "alerta"],
        [/^ALERT/i, "Alerta", "alerta"],
        [/^WARNING/i, "Aviso", "aviso"],
        [/^WATCH/i, "Vigilancia", "vigilancia"],
        [/^SUMMARY/i, "Resumen", "resumen"]
    ];

    /* Traducción de los titulares más habituales. Lo que no esté aquí
     * se deja en inglés. */
    const TITULARES = [
        [/Geomagnetic K-index of (\d)/i, m => `Índice K geomagnético de ${m[1]}`],
        [/Geomagnetic Storm Category G(\d)/i, m => `Tormenta geomagnética de categoría G${m[1]}`],
        [/Geomagnetic Sudden Impulse/i, () => "Impulso geomagnético repentino"],
        [/Electron 2MeV Integral Flux.*?(\d+)\s*pfu/i, m => `Flujo de electrones de 2 MeV por encima de ${m[1]} pfu`],
        [/Proton 10MeV Integral Flux.*?(\d+)\s*pfu/i, m => `Flujo de protones de 10 MeV por encima de ${m[1]} pfu`],
        [/Proton 100MeV Integral Flux.*?(\d+)\s*pfu/i, m => `Flujo de protones de 100 MeV por encima de ${m[1]} pfu`],
        [/X-ray Flux exceeded (M\d|X\d+)/i, m => `Rayos X por encima de ${m[1]}`],
        [/X-ray Event exceeded (M\d|X\d+)/i, m => `Fulguración por encima de ${m[1]}`],
        [/Type II Radio Emission/i, () => "Emisión de radio de tipo II (señal de eyección de masa coronal)"],
        [/Type IV Radio Emission/i, () => "Emisión de radio de tipo IV (fulguración intensa)"],
        [/10cm Radio Burst/i, () => "Ráfaga de radio en 10 cm"],
        [/Interplanetary Shock/i, () => "Llegada de un choque interplanetario"]
    ];

    function analizarAlerta(entrada) {
        const mensaje = String(entrada.message || "").replace(/\r/g, "");
        const lineas = mensaje.split("\n").map(l => l.trim()).filter(Boolean);

        let tipo = ["Mensaje", "resumen"];
        let titular = "";
        for (const linea of lineas) {
            const encontrado = TIPOS_ALERTA.find(([patron]) => patron.test(linea));
            if (encontrado && linea.includes(":")) {
                tipo = [encontrado[1], encontrado[2]];
                titular = linea.slice(linea.indexOf(":") + 1).trim();
                break;
            }
        }

        let traducido = titular;
        for (const [patron, traducir] of TITULARES) {
            const m = patron.exec(titular);
            if (m) { traducido = traducir(m); break; }
        }

        const escala = /NOAA Scale:\s*([GRS])(\d)/i.exec(mensaje);

        return {
            fecha: fechaUTC(entrada.issue_datetime),
            tipo: tipo[0],
            claseTipo: tipo[1],
            titular: traducido || "Mensaje de la NOAA",
            escala: escala ? `${escala[1].toUpperCase()}${escala[2]}` : null,
            nivelEscala: escala ? parseInt(escala[2], 10) : 0,
            original: mensaje
        };
    }

    async function cargarAlertas() {
        const caja = $("solAlertas");
        let datos;
        try {
            datos = await pedir(FUENTES.alertas);
        } catch (error) {
            aviso(caja, "Las alertas de la NOAA no están disponibles ahora.");
            return false;
        }

        const hace72h = Date.now() - 72 * 3600 * 1000;
        const alertas = (Array.isArray(datos) ? datos : [])
            .map(analizarAlerta)
            .filter(a => a.fecha)
            .sort((a, b) => b.fecha - a.fecha);

        vaciar(caja);

        if (alertas.length === 0) {
            caja.appendChild(crear("p", "sol-aviso",
                "Sin alertas en vigor: el tiempo espacial está en calma."));
            return true;
        }

        const recientes = alertas.filter(a => a.fecha.getTime() >= hace72h);
        const anteriores = alertas.filter(a => a.fecha.getTime() < hace72h);

        if (recientes.length === 0) {
            caja.appendChild(crear("p", "sol-aviso",
                "Ninguna alerta en las últimas 72 horas."));
        } else {
            const lista = crear("ol", "sol-alertas-lista");
            recientes.forEach(a => lista.appendChild(tarjetaAlerta(a)));
            caja.appendChild(lista);
        }

        if (anteriores.length > 0) {
            const mas = crear("details", "sol-alertas-anteriores");
            mas.appendChild(crear("summary", null,
                `Anteriores (${anteriores.length})`));
            const lista = crear("ol", "sol-alertas-lista");
            anteriores.forEach(a => lista.appendChild(tarjetaAlerta(a)));
            mas.appendChild(lista);
            caja.appendChild(mas);
        }

        return true;
    }

    function tarjetaAlerta(alerta) {
        const item = crear("li", `sol-alerta tipo-${alerta.claseTipo}`);

        const cabecera = crear("div", "sol-alerta-cabecera");
        cabecera.appendChild(crear("span", "sol-alerta-tipo", alerta.tipo));
        if (alerta.escala) {
            cabecera.appendChild(crear("span",
                `sol-marca nivel-${Math.max(0, Math.min(5, alerta.nivelEscala))}`,
                alerta.escala));
        }
        const cuando = crear("time", "sol-alerta-fecha", fechaHora(alerta.fecha));
        cuando.dateTime = alerta.fecha.toISOString();
        cabecera.appendChild(cuando);
        item.appendChild(cabecera);

        item.appendChild(crear("p", "sol-alerta-titular", alerta.titular));

        const original = crear("details", "sol-alerta-original");
        original.appendChild(crear("summary", null, "Texto original (inglés)"));
        original.appendChild(crear("pre", null, alerta.original));
        item.appendChild(original);

        return item;
    }


    /* ------------------------------------------------------------
       Gráfica del Kp
       ------------------------------------------------------------ */

    async function cargarGraficaKp() {
        const caja = $("solKp");
        let datos;
        try {
            datos = comoObjetos(await pedir(FUENTES.kpPrevision));
        } catch (error) {
            aviso(caja, "El índice Kp no está disponible ahora.");
            return false;
        }

        const desde = Date.now() - 3 * 86400000;
        const tramos = datos
            .map(d => ({
                fecha: fechaUTC(d.time_tag),
                kp: numero(d.kp ?? d.Kp),
                prevision: /predicted/i.test(String(d.observed || ""))
            }))
            .filter(t => t.fecha && t.kp !== null && t.fecha.getTime() >= desde);

        if (tramos.length === 0) {
            aviso(caja, "No hay datos del índice Kp.");
            return false;
        }

        vaciar(caja);
        /* El dibujo se hace al ancho real de la caja, para que los
         * textos salgan a su tamaño en el móvil y no encogidos. */
        caja.appendChild(dibujarKp(tramos, Math.max(320, Math.round(caja.clientWidth || 720))));
        return true;
    }

    function dibujarKp(tramos, ancho) {
        const NS = "http://www.w3.org/2000/svg";
        const alto = ancho < 500 ? 200 : 240;
        const izq = 26;
        const der = 6;
        const arriba = 10;
        const abajo = 34;
        const util = ancho - izq - der;
        const altoUtil = alto - arriba - abajo;
        const paso = util / tramos.length;

        const svg = document.createElementNS(NS, "svg");
        svg.setAttribute("viewBox", `0 0 ${ancho} ${alto}`);
        svg.setAttribute("class", "sol-kp-grafica");
        svg.setAttribute("role", "img");

        const maximo = Math.max(...tramos.map(t => t.kp));
        svg.setAttribute("aria-label",
            `Índice Kp de los últimos días y previsión. Máximo del periodo: ${maximo.toFixed(1)}.`);

        const defs = document.createElementNS(NS, "defs");
        const patron = document.createElementNS(NS, "pattern");
        patron.setAttribute("id", "solKpRayado");
        patron.setAttribute("width", "6");
        patron.setAttribute("height", "6");
        patron.setAttribute("patternUnits", "userSpaceOnUse");
        patron.setAttribute("patternTransform", "rotate(45)");
        const raya = document.createElementNS(NS, "rect");
        raya.setAttribute("width", "3");
        raya.setAttribute("height", "6");
        raya.setAttribute("class", "sol-kp-raya");
        patron.appendChild(raya);
        defs.appendChild(patron);
        svg.appendChild(defs);

        const y = v => arriba + altoUtil - (v / 9) * altoUtil;

        /* Rejilla en 0, 3, 5 (tormenta), 7 y 9. */
        for (const v of [0, 3, 5, 7, 9]) {
            const linea = document.createElementNS(NS, "line");
            linea.setAttribute("x1", izq);
            linea.setAttribute("x2", ancho - der);
            linea.setAttribute("y1", y(v));
            linea.setAttribute("y2", y(v));
            linea.setAttribute("class", v === 5 ? "sol-kp-umbral" : "sol-kp-rejilla");
            svg.appendChild(linea);

            const etiqueta = document.createElementNS(NS, "text");
            etiqueta.setAttribute("x", izq - 6);
            etiqueta.setAttribute("y", y(v) + 4);
            etiqueta.setAttribute("text-anchor", "end");
            etiqueta.setAttribute("class", "sol-kp-texto");
            etiqueta.textContent = String(v);
            svg.appendChild(etiqueta);
        }

        const ahora = Date.now();
        let ultimoDia = "";

        tramos.forEach((t, i) => {
            const x = izq + i * paso;
            const barra = document.createElementNS(NS, "rect");
            const altura = Math.max(2, (t.kp / 9) * altoUtil);
            barra.setAttribute("x", (x + 1).toFixed(1));
            barra.setAttribute("y", (arriba + altoUtil - altura).toFixed(1));
            barra.setAttribute("width", Math.max(1, paso - 2).toFixed(1));
            barra.setAttribute("height", altura.toFixed(1));
            barra.setAttribute("rx", "1.5");
            barra.setAttribute("class",
                `sol-kp-barra ${claseKp(t.kp)}${t.prevision ? " prevision" : ""}`);
            const titulo = document.createElementNS(NS, "title");
            titulo.textContent =
                `${fechaHora(t.fecha)}: Kp ${t.kp.toFixed(2).replace(".", ",")}${t.prevision ? " (previsión)" : ""}`;
            barra.appendChild(titulo);
            svg.appendChild(barra);

            if (t.prevision) {
                const rayado = document.createElementNS(NS, "rect");
                rayado.setAttribute("x", (x + 1).toFixed(1));
                rayado.setAttribute("y", (arriba + altoUtil - altura).toFixed(1));
                rayado.setAttribute("width", Math.max(1, paso - 2).toFixed(1));
                rayado.setAttribute("height", altura.toFixed(1));
                rayado.setAttribute("fill", "url(#solKpRayado)");
                rayado.setAttribute("pointer-events", "none");
                svg.appendChild(rayado);
            }

            /* Línea de «ahora». */
            const fin = t.fecha.getTime() + 3 * 3600 * 1000;
            if (t.fecha.getTime() <= ahora && ahora < fin) {
                const xAhora = x + paso * ((ahora - t.fecha.getTime()) / (3 * 3600 * 1000));
                const linea = document.createElementNS(NS, "line");
                linea.setAttribute("x1", xAhora);
                linea.setAttribute("x2", xAhora);
                linea.setAttribute("y1", arriba);
                linea.setAttribute("y2", arriba + altoUtil);
                linea.setAttribute("class", "sol-kp-ahora");
                svg.appendChild(linea);
            }

            /* Nombre del día al empezar cada día en hora de Madrid. */
            const dia = formatoDia.format(t.fecha);
            const horaMadrid = parseInt(formatoHoraMadrid.format(t.fecha), 10);
            if (dia !== ultimoDia && horaMadrid < 3) {
                const marca = document.createElementNS(NS, "line");
                marca.setAttribute("x1", x);
                marca.setAttribute("x2", x);
                marca.setAttribute("y1", arriba + altoUtil);
                marca.setAttribute("y2", arriba + altoUtil + 6);
                marca.setAttribute("class", "sol-kp-rejilla");
                svg.appendChild(marca);

                const centro = x + 4 * paso;
                const texto = document.createElementNS(NS, "text");
                texto.setAttribute("x", Math.min(centro, ancho - der - 18));
                texto.setAttribute("y", alto - 10);
                texto.setAttribute("text-anchor", "middle");
                texto.setAttribute("class", "sol-kp-texto");
                texto.textContent = dia;
                svg.appendChild(texto);
            }
            if (horaMadrid < 3) ultimoDia = dia;
        });

        const figura = crear("figure", "sol-kp-figura");
        figura.appendChild(svg);

        const leyenda = crear("figcaption", "sol-kp-leyenda");
        [
            ["nivel-0", "Tranquilo (0–3)"],
            ["nivel-activo", "Activo (4)"],
            ["nivel-1", "G1 (5)"],
            ["nivel-2", "G2 (6)"],
            ["nivel-3", "G3 o más (7–9)"]
        ].forEach(([clase, texto]) => {
            const item = crear("span", "sol-kp-leyenda-item");
            item.appendChild(crear("span", `sol-kp-muestra ${clase}`));
            item.appendChild(document.createTextNode(texto));
            leyenda.appendChild(item);
        });
        figura.appendChild(leyenda);

        return figura;
    }


    /* ------------------------------------------------------------
       Fulguraciones de la semana
       ------------------------------------------------------------ */

    async function cargarFulguraciones() {
        const caja = $("solFulguraciones");
        let datos;
        try {
            datos = await pedir(FUENTES.fulguraciones);
        } catch (error) {
            aviso(caja, "Las fulguraciones no están disponibles ahora.");
            return false;
        }

        const todas = (Array.isArray(datos) ? datos : [])
            .filter(f => f.max_class)
            .map(f => ({
                clase: f.max_class,
                fuerza: numero(f.max_xrlong) || fuerzaFulguracion(f.max_class),
                inicio: fechaUTC(f.begin_time),
                pico: fechaUTC(f.max_time),
                fin: fechaUTC(f.end_time)
            }));

        vaciar(caja);

        if (todas.length === 0) {
            caja.appendChild(crear("p", "sol-aviso", "No se han registrado fulguraciones esta semana."));
            return true;
        }

        const cuenta = { X: 0, M: 0, C: 0 };
        todas.forEach(f => {
            const letra = f.clase.charAt(0).toUpperCase();
            if (letra in cuenta) cuenta[letra] += 1;
        });

        const resumen = crear("div", "sol-fulguraciones-resumen");
        [["X", "x"], ["M", "m"], ["C", "c"]].forEach(([letra, clase]) => {
            const pieza = crear("span", `sol-fulguracion-cuenta f-${clase}`);
            pieza.appendChild(crear("strong", null, String(cuenta[letra])));
            pieza.appendChild(document.createTextNode(` de clase ${letra}`));
            resumen.appendChild(pieza);
        });
        caja.appendChild(resumen);

        if (cuenta.X + cuenta.M + cuenta.C === 0) {
            caja.appendChild(crear("p", "sol-aviso",
                "Ninguna de clase C o superior: el Sol está tranquilo. Las más fuertes:"));
        }

        const mejores = [...todas].sort((a, b) => b.fuerza - a.fuerza).slice(0, 8);
        const lista = crear("ol", "sol-fulguraciones-lista");
        for (const f of mejores) {
            const item = crear("li", "sol-fulguracion");
            item.appendChild(crear("span", `sol-fulguracion-clase f-${nivelFulguracion(f.clase)}`, f.clase));
            const textos = crear("span", "sol-fulguracion-textos");
            textos.appendChild(crear("span", "sol-fulguracion-pico", `Pico: ${fechaHora(f.pico)}`));
            textos.appendChild(crear("span", "sol-fulguracion-duracion",
                `De ${hora(f.inicio)} a ${hora(f.fin)}`));
            item.appendChild(textos);
            lista.appendChild(item);
        }
        caja.appendChild(lista);
        return true;
    }


    /* ------------------------------------------------------------
       Imágenes
       ------------------------------------------------------------ */

    /* Marca de 15 minutos: la misma para todos durante ese rato, así
     * el navegador aprovecha su copia y no se pide de más. */
    function marcaImagenes() {
        return Math.floor(Date.now() / IMAGENES_CADA_MS);
    }

    function conMarca(url) {
        return `${url}${url.includes("?") ? "&" : "?"}t=${marcaImagenes()}`;
    }

    function prepararImagen(img) {
        if (img.dataset.preparada) return;
        img.dataset.preparada = "1";
        img.addEventListener("error", () => {
            const figura = img.closest("figure");
            if (figura) figura.classList.add("sin-imagen");
        });
        img.addEventListener("load", () => {
            const figura = img.closest("figure");
            if (figura) figura.classList.remove("sin-imagen");
        });
    }

    function refrescarImagenes() {
        document.querySelectorAll(".sol-imagen-viva").forEach(img => {
            prepararImagen(img);
            img.src = conMarca(img.dataset.imagen);
        });
        ponerFiltro(filtroActual);
    }

    function montarSelector() {
        const caja = $("solSelector");
        vaciar(caja);
        for (const filtro of FILTROS) {
            const boton = crear("button", "sol-selector-boton", filtro.nombre);
            boton.type = "button";
            boton.setAttribute("role", "tab");
            boton.dataset.filtro = filtro.id;
            boton.addEventListener("click", () => ponerFiltro(filtro.id));
            caja.appendChild(boton);
        }
        prepararImagen($("solVisorImagen"));
    }

    function ponerFiltro(id) {
        const filtro = FILTROS.find(f => f.id === id) || FILTROS[0];
        filtroActual = filtro.id;

        document.querySelectorAll(".sol-selector-boton").forEach(boton => {
            const activo = boton.dataset.filtro === filtro.id;
            boton.classList.toggle("activo", activo);
            boton.setAttribute("aria-selected", activo ? "true" : "false");
        });

        const imagen = $("solVisorImagen");
        imagen.src = conMarca(`${SDO}/latest_1024_${filtro.id}.jpg`);
        imagen.alt = `El Sol ahora: ${filtro.nombre.toLowerCase()} (${filtro.texto.split(".")[0]})`;
        $("solVisorEnlace").href = `${SDO}/latest_2048_${filtro.id}.jpg`;
        $("solVisorTexto").textContent = filtro.texto;
    }


    /* ------------------------------------------------------------
       Arranque y refresco
       ------------------------------------------------------------ */

    async function cargarDatos() {
        const resultados = await Promise.all([
            cargarEscalas(),
            cargarIndices(),
            cargarAlertas(),
            cargarGraficaKp(),
            cargarFulguraciones()
        ].map(p => p.catch(() => false)));

        const estado = $("solActualizado");
        if (resultados.some(Boolean)) {
            estado.textContent =
                `Actualizado a las ${hora(new Date())}. Se renueva solo cada 5 minutos.`;
            estado.classList.remove("error");
        } else {
            estado.textContent =
                "No se ha podido contactar con la NOAA. Se volverá a intentar en 5 minutos.";
            estado.classList.add("error");
        }
    }

    let ultimaCarga = 0;
    let ultimasImagenes = 0;

    function tic() {
        if (document.hidden) return;
        const ahora = Date.now();
        if (ahora - ultimaCarga >= DATOS_CADA_MS) {
            ultimaCarga = ahora;
            cargarDatos();
        }
        if (ahora - ultimasImagenes >= IMAGENES_CADA_MS) {
            ultimasImagenes = ahora;
            refrescarImagenes();
        }
    }

    function arrancar() {
        montarSelector();
        ultimaCarga = Date.now();
        ultimasImagenes = Date.now();
        refrescarImagenes();
        cargarDatos();
        setInterval(tic, 30000);
        document.addEventListener("visibilitychange", tic);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", arrancar);
    } else {
        arrancar();
    }
})();

/* Fin de fichero: js/sol.js */
