/*
 * MeteoArchidona · Componente «Mapas de modelos»
 *
 * Visor animado de los mapas que dibuja la API con los datos abiertos de
 * los modelos (docs/mapas-modelos.md de la API; decisiones de José del
 * 9-11-2026): Europeo (ECMWF), Europeo IA (AIFS), Americano (GFS) y Alemán
 * (ICON-EU), con un desplegable de modelo. Presión y
 * lluvia, geopotencial a 500 hPa y temperatura a 850 hPa, en los pasos de
 * cada modelo (cada 3 horas; cada 6 en el AIFS).
 *
 * Pestaña «Mapas» de Predicción; se puede poner en cualquier otra página
 * o dashboard:
 *
 *     <div data-componente="mapas-modelos"
 *          data-modelo="ecmwf"            (opcional; o aifs, gfs, icon-eu)
 *          data-mapa="presion-lluvia"     (opcional; o geopotencial-500,
 *                                          temperatura-850)
 *          data-titulo="no"               (opcional; sin título)
 *     ></div>
 *
 *     import {montarMapasModelos} from "/js/mapas-modelos.js?v=…";
 *     montarMapasModelos(hueco);
 *
 * API:
 *     GET /mapas-modelos                                   catálogo y pasadas
 *     GET /mapas-modelos/{modelo}/{pasada}/{mapa}/{paso}   imagen WebP
 *
 * Al abrir enseña el paso más cercano a la hora actual; al cambiar de
 * modelo o de pasada se queda en la misma hora si la tiene. Los fotogramas se
 * van cargando por detrás; la animación espera al siguiente si aún no ha
 * llegado. Horas en hora de Madrid (la pasada, en UTC, como la nombra todo
 * el mundo). Trae su propia hoja de estilos para funcionar en dashboards.
 */

const ZONA = "Europe/Madrid";
const HOJA = "/css/mapas-modelos.css?v=20261110-modelos1";
const MS_FOTOGRAMA = 650;
const MS_PAUSA_FINAL = 1600;
const REFRESCO_MS = 30 * 60 * 1000;

const formatoValido = new Intl.DateTimeFormat("es-ES", {
    weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: ZONA
});
const formatoPasada = new Intl.DateTimeFormat("es-ES", {
    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC"
});


function asegurarHoja() {
    if (document.querySelector('link[href*="css/mapas-modelos.css"]')) {
        return;
    }
    const enlace = document.createElement("link");
    enlace.rel = "stylesheet";
    enlace.href = HOJA;
    document.head.appendChild(enlace);
}

function crear(etiqueta, clase, texto) {
    const elemento = document.createElement(etiqueta);
    if (clase) elemento.className = clase;
    if (texto !== undefined && texto !== null) elemento.textContent = texto;
    return elemento;
}

function boton(clase, texto, titulo) {
    const elemento = crear("button", clase, texto);
    elemento.type = "button";
    if (titulo) {
        elemento.title = titulo;
        elemento.setAttribute("aria-label", titulo);
    }
    return elemento;
}

function mayuscula(texto) {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function base() {
    return window.API_BASE || "/api";
}

function urlImagen(modelo, pasada, mapa, paso) {
    return `${base()}/mapas-modelos/${encodeURIComponent(modelo)}/${pasada}/${encodeURIComponent(mapa)}/${paso}`;
}

function textoPasada(pasada) {
    return `${formatoPasada.format(new Date(pasada.pasada_utc)).replace(",", "")} UTC`;
}

function pasoMasCercano(pasos, ahora = Date.now()) {
    let mejor = 0;
    for (let indice = 0; indice < pasos.length; indice += 1) {
        if (Date.parse(pasos[indice].valido_utc) <= ahora) {
            mejor = indice;
        }
    }
    return mejor;
}


export function montarMapasModelos(raiz) {

    asegurarHoja();
    raiz.classList.add("mm");
    raiz.textContent = "";

    const estado = {
        catalogo: null,
        modelo: null,
        modeloPedido: raiz.dataset.modelo || "ecmwf",
        pasada: null,
        mapa: raiz.dataset.mapa || "presion-lluvia",
        indice: 0,
        reproduciendo: false,
        temporizador: null,
        cargadas: new Map()
    };

    const tarjeta = crear("section", "pred-tarjeta mm-tarjeta");
    if (raiz.dataset.titulo !== "no") {
        tarjeta.append(crear("h2", "pred-titulo", "Mapas de los modelos"));
    }

    const mapas = crear("div", "mm-mapas");
    mapas.setAttribute("role", "group");
    mapas.setAttribute("aria-label", "Mapa");

    const filaPasada = crear("div", "mm-pasada");
    const cajaModelo = crear("label", "mm-campo");
    cajaModelo.append(crear("span", "mm-etiqueta", "Modelo"));
    const selectorModelo = crear("select", "mm-selector");
    cajaModelo.append(selectorModelo);
    const cajaPasada = crear("label", "mm-campo");
    cajaPasada.append(crear("span", "mm-etiqueta", "Pasada"));
    const selectorPasada = crear("select", "mm-selector");
    cajaPasada.append(selectorPasada);
    filaPasada.append(cajaModelo, cajaPasada);

    const marco = crear("a", "mm-marco");
    marco.target = "_blank";
    marco.rel = "noopener";
    marco.title = "Abrir el mapa a tamaño completo";
    const imagen = crear("img", "mm-imagen");
    imagen.alt = "";
    imagen.decoding = "async";
    marco.append(imagen);

    const valido = crear("p", "mm-valido");
    valido.setAttribute("aria-live", "polite");

    const reproductor = crear("div", "mm-reproductor");
    const anterior = boton("mm-boton", "‹", "Paso anterior");
    const reproducir = boton("mm-boton mm-reproducir", "▶", "Reproducir");
    const siguiente = boton("mm-boton", "›", "Paso siguiente");
    const barra = crear("input", "mm-barra");
    barra.type = "range";
    barra.min = "0";
    barra.step = "1";
    barra.setAttribute("aria-label", "Hora del mapa");
    const carga = crear("span", "mm-carga");
    reproductor.append(anterior, reproducir, siguiente, barra, carga);

    const descripcion = crear("p", "mm-descripcion");
    const aviso = crear("p", "pred-vacio mm-aviso", "Buscando los mapas…");
    const fuente = crear("p", "mm-fuente");

    tarjeta.append(mapas, filaPasada, aviso, valido, marco, reproductor, descripcion);
    raiz.append(tarjeta, fuente);

    for (const elemento of [filaPasada, valido, marco, reproductor]) {
        elemento.hidden = true;
    }


    /* ---------- Datos ---------- */

    const pasos = () => estado.pasada?.pasos || [];

    function mapaActual() {
        return estado.modelo?.mapas.find((mapa) => mapa.codigo === estado.mapa) || estado.modelo?.mapas[0];
    }

    function url(indice) {
        const paso = pasos()[indice];
        return paso ? urlImagen(estado.modelo.codigo, estado.pasada.codigo, estado.mapa, paso.paso) : "";
    }

    // Precarga de todos los fotogramas del mapa y la pasada elegidos.
    // Se guardan por URL: al volver a un mapa ya visto no se repite.
    function precargar() {
        const lista = pasos().map((_, indice) => url(indice));
        let pendientes = 0;
        for (const direccion of lista) {
            if (estado.cargadas.has(direccion)) continue;
            pendientes += 1;
            const previa = new Image();
            previa.decoding = "async";
            const promesa = new Promise((resolver) => {
                previa.onload = () => resolver(true);
                previa.onerror = () => resolver(false);
            });
            estado.cargadas.set(direccion, {imagen: previa, lista: false, promesa});
            promesa.then((bien) => {
                const entrada = estado.cargadas.get(direccion);
                if (entrada) entrada.lista = bien;
                pintarCarga();
            });
            previa.src = direccion;
        }
        pintarCarga();
        return pendientes;
    }

    function pintarCarga() {
        const lista = pasos().map((_, indice) => url(indice));
        const listas = lista.filter((direccion) => estado.cargadas.get(direccion)?.lista).length;
        carga.textContent = listas < lista.length ? `Cargando ${listas}/${lista.length}` : "";
    }


    /* ---------- Pintado ---------- */

    function pintarMapas() {
        mapas.textContent = "";
        for (const mapa of estado.modelo.mapas) {
            const opcion = boton("mm-opcion", mapa.nombre);
            opcion.setAttribute("aria-pressed", String(mapa.codigo === estado.mapa));
            opcion.addEventListener("click", () => {
                estado.mapa = mapa.codigo;
                pintarMapas();
                precargar();
                mostrar();
            });
            mapas.append(opcion);
        }
    }

    function modelosConMapas() {
        return (estado.catalogo?.modelos || []).filter((modelo) => modelo.pasadas?.length);
    }

    function pintarModelos() {
        const modelos = modelosConMapas();
        selectorModelo.textContent = "";
        for (const modelo of modelos) {
            const opcion = crear("option", null, `${modelo.nombre} · ${modelo.resolucion}`);
            opcion.value = modelo.codigo;
            opcion.selected = modelo.codigo === estado.modelo.codigo;
            selectorModelo.append(opcion);
        }
        // Con un solo modelo no hace falta elegir.
        cajaModelo.hidden = modelos.length < 2;
    }

    function pintarPasadas() {
        selectorPasada.textContent = "";
        estado.modelo.pasadas.forEach((pasada, indice) => {
            const opcion = crear("option", null, indice === 0 ? `${textoPasada(pasada)} · la última` : textoPasada(pasada));
            opcion.value = pasada.codigo;
            opcion.selected = pasada.codigo === estado.pasada.codigo;
            selectorPasada.append(opcion);
        });
    }

    function mostrar() {
        const lista = pasos();
        if (!lista.length) return;

        estado.indice = Math.max(0, Math.min(estado.indice, lista.length - 1));
        const paso = lista[estado.indice];
        const direccion = url(estado.indice);
        const mapa = mapaActual();

        imagen.src = direccion;
        imagen.alt = `${mapa?.nombre || "Mapa"} para el ${formatoValido.format(new Date(paso.valido_utc))}`;
        marco.href = direccion;
        barra.max = String(lista.length - 1);
        barra.value = String(estado.indice);
        valido.textContent = `${mayuscula(formatoValido.format(new Date(paso.valido_utc)))} · +${paso.paso} h`;
        descripcion.textContent = `${mapa?.descripcion || ""} ${estado.modelo.nombre}: ${estado.modelo.resolucion}, hasta +${estado.modelo.horas} h.`;
    }

    function irA(indice) {
        const total = pasos().length;
        if (!total) return;
        estado.indice = (indice + total) % total;
        mostrar();
    }


    /* ---------- Animación ---------- */

    function parar() {
        estado.reproduciendo = false;
        clearTimeout(estado.temporizador);
        reproducir.textContent = "▶";
        reproducir.title = "Reproducir";
        reproducir.setAttribute("aria-label", "Reproducir");
    }

    async function avanzar() {
        if (!estado.reproduciendo) return;
        const total = pasos().length;
        const siguienteIndice = (estado.indice + 1) % total;
        // Si el siguiente fotograma aún no ha llegado, se espera a él.
        const entrada = estado.cargadas.get(url(siguienteIndice));
        if (entrada && !entrada.lista) {
            await entrada.promesa;
            if (!estado.reproduciendo) return;
        }
        irA(siguienteIndice);
        const espera = siguienteIndice === total - 1 ? MS_PAUSA_FINAL : MS_FOTOGRAMA;
        estado.temporizador = setTimeout(avanzar, espera);
    }

    function empezar() {
        if (!pasos().length) return;
        estado.reproduciendo = true;
        reproducir.textContent = "❚❚";
        reproducir.title = "Pausa";
        reproducir.setAttribute("aria-label", "Pausa");
        precargar();
        estado.temporizador = setTimeout(avanzar, MS_FOTOGRAMA);
    }

    reproducir.addEventListener("click", () => (estado.reproduciendo ? parar() : empezar()));
    anterior.addEventListener("click", () => { parar(); irA(estado.indice - 1); });
    siguiente.addEventListener("click", () => { parar(); irA(estado.indice + 1); });
    barra.addEventListener("input", () => { parar(); irA(Number(barra.value)); });

    // Al cambiar de pasada o de modelo se queda en la misma hora válida si
    // la tiene: así se comparan pasadas y modelos para el mismo momento.
    function mismaHora(valida) {
        const instante = Date.parse(valida);
        const mismo = pasos().findIndex((paso) => Date.parse(paso.valido_utc) === instante);
        estado.indice = mismo >= 0 ? mismo : pasoMasCercano(pasos(), instante || Date.now());
    }

    selectorPasada.addEventListener("change", () => {
        parar();
        const valida = pasos()[estado.indice]?.valido_utc;
        estado.pasada = estado.modelo.pasadas.find((pasada) => pasada.codigo === selectorPasada.value) || estado.pasada;
        mismaHora(valida);
        precargar();
        mostrar();
    });

    selectorModelo.addEventListener("change", () => {
        parar();
        const valida = pasos()[estado.indice]?.valido_utc;
        const modelo = modelosConMapas().find((candidato) => candidato.codigo === selectorModelo.value);
        if (!modelo) return;
        estado.modelo = modelo;
        estado.modeloPedido = modelo.codigo;
        estado.pasada = modelo.pasadas[0];
        mismaHora(valida);
        pintarMapas();
        pintarPasadas();
        pintarFuente();
        precargar();
        mostrar();
    });

    function pintarFuente() {
        const modelo = estado.modelo;
        fuente.textContent = "";
        fuente.append(
            `${modelo.nombre}: datos de `,
            Object.assign(crear("a", null, modelo.fuente), {href: modelo.url_datos, target: "_blank", rel: "noopener"}),
            " (",
            Object.assign(crear("a", null, modelo.licencia), {href: modelo.url_licencia, target: "_blank", rel: "noopener"}),
            "), modificados. Mapas dibujados por MeteoArchidona; el punto rojo es Archidona. MeteoArchidona no predice: enseña lo que dicen los modelos."
        );
    }


    /* ---------- Carga del catálogo ---------- */

    async function cargar() {
        let datos;
        try {
            const respuesta = await fetch(`${base()}/mapas-modelos`, {cache: "no-cache"});
            if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
            datos = await respuesta.json();
        } catch (error) {
            if (!estado.catalogo) {
                aviso.textContent = "No se han podido leer los mapas. Se puede volver a intentar más tarde.";
            }
            return;
        }

        const conMapas = (datos.modelos || []).filter((candidato) => candidato.pasadas?.length);
        const modelo = conMapas.find((candidato) => candidato.codigo === estado.modeloPedido) || conMapas[0];
        if (!modelo) {
            aviso.textContent = "Todavía no hay mapas: se dibujan cuando cada centro publica su pasada.";
            return;
        }

        const ultima = modelo.pasadas[0];
        const nueva = !estado.pasada || estado.pasada.codigo !== ultima.codigo;
        const otroModelo = estado.modelo && estado.modelo.codigo !== modelo.codigo;
        const enLaUltima = !estado.pasada || otroModelo || estado.pasada.codigo === estado.modelo?.pasadas[0]?.codigo;

        estado.catalogo = datos;
        estado.modelo = modelo;
        if (!modelo.mapas.some((mapa) => mapa.codigo === estado.mapa)) {
            estado.mapa = modelo.mapas[0].codigo;
        }

        // Solo se salta a la pasada nueva si se estaba mirando la última
        // y no se está reproduciendo; si no, se respeta lo que se mira.
        if ((nueva && enLaUltima && !estado.reproduciendo) || otroModelo) {
            const valida = estado.pasada ? pasos()[estado.indice]?.valido_utc : null;
            estado.pasada = ultima;
            if (valida) {
                mismaHora(valida);
            } else {
                estado.indice = pasoMasCercano(ultima.pasos);
            }
        } else {
            estado.pasada = modelo.pasadas.find((pasada) => pasada.codigo === estado.pasada.codigo) || ultima;
        }

        aviso.hidden = true;
        for (const elemento of [filaPasada, valido, marco, reproductor]) {
            elemento.hidden = false;
        }

        pintarModelos();
        pintarMapas();
        pintarPasadas();
        pintarFuente();
        precargar();
        mostrar();
    }

    cargar();

    const refresco = setInterval(() => {
        if (!raiz.isConnected) {
            clearInterval(refresco);
            parar();
            return;
        }
        if (!document.hidden) {
            cargar();
        }
    }, REFRESCO_MS);
}


/* Fin de fichero: js/mapas-modelos.js */
