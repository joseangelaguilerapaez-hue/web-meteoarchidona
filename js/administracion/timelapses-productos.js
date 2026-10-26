
"use strict";

/*
 * MeteoArchidona
 * Administración de productos timelapse.
 *
 * Archivo:
 *     js/administracion/timelapses-productos.js
 *
 * Componente HTML:
 *     componentes/admin-timelapses-productos.html
 *
 * API:
 *
 * GET  /admin/timelapses/productos
 * POST /admin/timelapses/productos/{id}/publicar
 * POST /admin/timelapses/productos/{id}/retirar
 * POST /admin/timelapses/productos/{id}/proteger
 * POST /admin/timelapses/productos/{id}/desproteger
 *
 * Funcionalidades:
 *
 * - Montaje dinámico e idempotente.
 * - Consulta paginada de productos.
 * - Filtros por cámara y publicación.
 * - Consulta de disponibilidad física.
 * - Información técnica y meteorológica.
 * - Publicación manual confirmada.
 * - Retirada manual confirmada.
 * - Acceso al visor de MP4 publicados.
 * - Limpieza al cerrar sesión.
 *
 * No genera ni elimina los MP4 originales.
 * No ejecuta SQL ni gestiona credenciales.
 *
 * La autenticación utiliza peticionJson(),
 * compartida con Administración.
 *
 * Este módulo NO se inicia automáticamente.
 * principal.js realizará su integración.
 */

import {
    $,
    mostrarEstado
} from "./estado.js?v=20261026-cache1";

import {
    peticionJson
} from "./api.js?v=20261026-cache1";


/* ==========================================================
   CONFIGURACIÓN
   ========================================================== */

const RUTA_COMPONENTE =
    "/componentes/admin-timelapses-productos.html";

const RUTA_PRODUCTOS =
    "/admin/timelapses/productos";

const RUTA_CAMARAS =
    "/admin/camaras";

const RUTA_VISOR =
    "/visores/video.html";

const PREFIJO_PUBLICO =
    "/multimedia/timelapses/";

const LIMITE =
    25;

const ZONA_HORARIA =
    "Europe/Madrid";

const FORMATO_FECHA = new Intl.DateTimeFormat(
    "es-ES",
    {
        timeZone: ZONA_HORARIA,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23"
    }
);

const FORMATO_NUMERO = new Intl.NumberFormat(
    "es-ES",
    {
        maximumFractionDigits: 2
    }
);


/* ==========================================================
   ESTADO PRIVADO
   ========================================================== */

let raiz = null;
let promesaMontaje = null;

let generacion = 0;
let secuenciaConsulta = 0;

let camaras = [];
let productos = [];

let total = 0;
let desplazamiento = 0;

let cargando = false;
let accionEnCurso = false;


/* ==========================================================
   UTILIDADES
   ========================================================== */

function elemento(
    etiqueta,
    clase = "",
    contenido = null
) {

    const nodo = document.createElement(
        etiqueta
    );

    if (clase) {
        nodo.className = clase;
    }

    if (contenido !== null) {
        nodo.textContent = String(contenido);
    }

    return nodo;

}


function buscar(
    selector
) {

    return raiz
        ? raiz.querySelector(selector)
        : null;

}


function estado(
    mensaje,
    tipo = ""
) {

    mostrarEstado(
        buscar("#estadoProductosTimelapse"),
        mensaje,
        tipo
    );

}


function texto(
    valor,
    defecto = "—"
) {

    const resultado = String(
        valor ?? ""
    ).trim();

    return resultado || defecto;

}


function numero(
    valor
) {

    if (
        valor === null ||
        valor === undefined ||
        valor === ""
    ) {
        return "—";
    }

    const resultado = Number(valor);

    return Number.isFinite(resultado)
        ? FORMATO_NUMERO.format(resultado)
        : "—";

}


function fechaMadrid(
    valor
) {

    if (!valor) {
        return "—";
    }

    const instante = new Date(valor);

    if (
        Number.isNaN(
            instante.getTime()
        )
    ) {
        return "—";
    }

    return FORMATO_FECHA.format(
        instante
    );

}


function tamanoArchivo(
    valor
) {

    const bytes = Number(valor);

    if (
        valor === null ||
        valor === undefined ||
        !Number.isFinite(bytes) ||
        bytes < 0
    ) {
        return "—";
    }

    if (bytes >= 1073741824) {
        return (
            FORMATO_NUMERO.format(
                bytes / 1073741824
            ) + " GiB"
        );
    }

    if (bytes >= 1048576) {
        return (
            FORMATO_NUMERO.format(
                bytes / 1048576
            ) + " MiB"
        );
    }

    return (
        FORMATO_NUMERO.format(
            bytes / 1024
        ) + " KiB"
    );

}


function duracion(
    valor
) {

    if (
        valor === null ||
        valor === undefined
    ) {
        return "—";
    }

    const segundos = Number(valor);

    if (
        !Number.isFinite(segundos) ||
        segundos < 0
    ) {
        return "—";
    }

    return (
        FORMATO_NUMERO.format(segundos)
        + " s"
    );

}


/* ==========================================================
   URL PÚBLICA SEGURA
   ========================================================== */

function validarUrlPublica(
    valor
) {

    if (
        typeof valor !== "string" ||
        !valor.startsWith(PREFIJO_PUBLICO)
    ) {
        return null;
    }

    /*
     * Los nombres públicos del servicio
     * son archivos MP4 propios.
     *
     * No se admiten protocolos externos,
     * query strings ni rutas relativas.
     */

    const patron =
        /^\/multimedia\/timelapses\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+\.mp4$/;

    if (!patron.test(valor)) {
        return null;
    }

    try {

        const url = new URL(
            valor,
            window.location.origin
        );

        if (
            url.origin !== window.location.origin ||
            url.pathname !== valor ||
            url.search ||
            url.hash
        ) {
            return null;
        }

        return url.pathname;

    } catch {

        return null;

    }

}


function urlVisor(
    producto
) {

    const archivo = validarUrlPublica(
        producto.ruta_publica
    );

    if (!archivo) {
        return null;
    }

    const parametros = new URLSearchParams({
        tipo: "mp4",
        archivo,
        nombre: (
            "Timelapse · "
            + nombreProducto(producto)
        )
    });

    return (
        RUTA_VISOR
        + "?"
        + parametros.toString()
    );

}


/* ==========================================================
   NOMBRES Y CLASIFICACIÓN
   ========================================================== */

function nombreProducto(
    producto
) {

    return texto(
        producto.camara_nombre,
        `Cámara ${producto.camara_id}`
    );

}


function tipoProducto(
    producto
) {

    switch (producto.tipo) {

        case "COMPLETO":
            return "Completo";

        case "PARCIAL":
            return "Parcial";

        default:
            return "Sin clasificar";

    }

}


function origenProducto(
    producto
) {

    switch (producto.origen) {

        case "PROGRAMACION":
            return "Programación";

        case "MANUAL":
            return "Manual";

        case "EPISODIO":
            return "Episodio";

        default:
            return "Origen histórico";

    }

}


function puedePublicarse(
    producto
) {

    return (
        producto.estado === "COMPLETADO" &&
        producto.archivo_interno_disponible === true &&
        !producto.fecha_purga &&
        producto.publicada !== true
    );

}


/* ==========================================================
   FILTROS
   ========================================================== */

function obtenerFiltro() {

    const valor = buscar(
        "#filtroProductosTimelapsePublicacion"
    )?.value;

    return [
        "todos",
        "publicados",
        "no_publicados"
    ].includes(valor)
        ? valor
        : "todos";

}


function obtenerCamaraFiltro() {

    const valor = buscar(
        "#filtroProductosTimelapseCamara"
    )?.value ?? "";

    if (
        !/^[1-9]\d*$/.test(valor)
    ) {
        return null;
    }

    return Number(valor);

}


function parametrosConsulta() {

    const parametros = new URLSearchParams({
        filtro: obtenerFiltro(),
        limite: String(LIMITE),
        desplazamiento: String(
            desplazamiento
        )
    });

    const camara = obtenerCamaraFiltro();

    if (camara !== null) {
        parametros.set(
            "camara_id",
            String(camara)
        );
    }

    return parametros;

}


/* ==========================================================
   CATÁLOGO DE CÁMARAS
   ========================================================== */

function actualizarFiltroCamaras() {

    const selector = buscar(
        "#filtroProductosTimelapseCamara"
    );

    if (!selector) {
        return;
    }

    const anterior = selector.value;

    const nombres = new Map();

    for (const camara of camaras) {

        if (
            Number.isSafeInteger(camara.id) &&
            camara.id > 0
        ) {

            const nombre =
                texto(
                    camara.nombre_publico,
                    texto(
                        camara.nombre_tecnico,
                        `Cámara ${camara.id}`
                    )
                );

            nombres.set(
                camara.id,
                nombre
            );

        }

    }

    /*
     * Si el catálogo de cámaras no está
     * disponible, incorporamos las cámaras
     * presentes en esta página de resultados.
     */

    for (const producto of productos) {

        if (
            !nombres.has(producto.camara_id)
        ) {

            nombres.set(
                producto.camara_id,
                nombreProducto(producto)
            );

        }

    }

    const opciones = [
        new Option(
            "Todas las cámaras",
            ""
        )
    ];

    for (
        const [id, nombre] of [...nombres.entries()]
            .sort(
                (a, b) =>
                    a[1].localeCompare(
                        b[1],
                        "es"
                    )
            )
    ) {

        opciones.push(
            new Option(
                `${nombre} · #${id}`,
                String(id)
            )
        );

    }

    selector.replaceChildren(
        ...opciones
    );

    if (
        [...selector.options].some(
            opcion =>
                opcion.value === anterior
        )
    ) {

        selector.value = anterior;

    }

}


async function cargarCatalogoCamaras() {

    const generacionActual = generacion;

    try {

        const datos = await peticionJson(
            RUTA_CAMARAS
        );

        if (
            generacionActual !== generacion ||
            !raiz
        ) {
            return;
        }

        if (!Array.isArray(datos)) {
            throw new Error(
                "El catálogo de cámaras no es válido."
            );
        }

        camaras = datos;

        actualizarFiltroCamaras();

    } catch (error) {

        console.warn(
            "No se ha podido consultar el catálogo "
            + "de cámaras para el filtro de timelapses.",
            error
        );

    }

}


/* ==========================================================
   PRESENTACIÓN DE PRODUCTOS
   ========================================================== */

function agregarChip(
    destino,
    contenido,
    clase = ""
) {

    destino.appendChild(
        elemento(
            "span",
            `chip ${clase}`.trim(),
            contenido
        )
    );

}


function crearDetalle(
    etiqueta,
    valor
) {

    const ficha = elemento(
        "div",
        "metadato"
    );

    ficha.append(
        elemento(
            "div",
            "metadato-etiqueta",
            etiqueta
        ),
        elemento(
            "div",
            "metadato-valor",
            valor
        )
    );

    return ficha;

}


function agregarDetalles(
    tarjeta,
    producto
) {

    const desplegable = elemento(
        "details"
    );

    const resumen = elemento(
        "summary",
        "",
        "Ver detalles del vídeo"
    );

    const contenedor = elemento(
        "div",
        "metadatos"
    );

    const detalles = [
        [
            "Inicio del periodo",
            fechaMadrid(producto.fecha_inicio)
        ],
        [
            "Fin del periodo",
            fechaMadrid(producto.fecha_fin)
        ],
        [
            "Fotogramas",
            numero(producto.numero_fotogramas)
        ],
        [
            "FPS",
            numero(producto.fps)
        ],
        [
            "Resolución",
            producto.anchura && producto.altura
                ? `${producto.anchura} × ${producto.altura}`
                : "—"
        ],
        [
            "Tamaño MP4",
            tamanoArchivo(producto.tamano_bytes)
        ],
        [
            "Generado",
            fechaMadrid(producto.fecha_fin_generacion)
        ],
        [
            "Publicado",
            fechaMadrid(producto.fecha_publicacion)
        ],
        [
            "Retirado",
            fechaMadrid(producto.fecha_retirada)
        ],
        [
            "Producto de origen",
            producto.timelapse_origen_id
                ? `#${producto.timelapse_origen_id}`
                : "—"
        ],
        [
            "Inicio del recorte",
            fechaMadrid(producto.fecha_inicio_recorte)
        ],
        [
            "Fin del recorte",
            fechaMadrid(producto.fecha_fin_recorte)
        ],
        [
            "Fecha de purga",
            fechaMadrid(producto.fecha_purga)
        ]
    ];

    for (
        const [etiqueta, valor] of detalles
    ) {

        contenedor.appendChild(
            crearDetalle(
                etiqueta,
                valor
            )
        );

    }

    desplegable.append(
        resumen,
        contenedor
    );

    tarjeta.appendChild(
        desplegable
    );

}


/* ==========================================================
   BOTONES DE CADA PRODUCTO
   ========================================================== */

function crearAcciones(
    producto
) {

    const acciones = elemento(
        "div",
        "acciones-formulario"
    );

    if (producto.publicada === true) {

        const boton = elemento(
            "button",
            "boton boton-peligro",
            "Retirar publicación"
        );

        boton.type = "button";

        boton.disabled = (
            cargando ||
            accionEnCurso
        );

        boton.addEventListener(
            "click",
            () => {
                void ejecutarAccion(
                    producto,
                    "retirar"
                );
            }
        );

        acciones.appendChild(
            boton
        );

        if (
            producto.archivo_publico_disponible === true
        ) {

            const destino = urlVisor(
                producto
            );

            if (destino) {

                const enlace = elemento(
                    "a",
                    "boton boton-secundario",
                    "Ver vídeo"
                );

                enlace.href = destino;

                enlace.target = "_blank";

                enlace.rel =
                    "noopener noreferrer";

                acciones.appendChild(
                    enlace
                );

            }

        }

    } else {

        const boton = elemento(
            "button",
            "boton boton-principal",
            "Publicar"
        );

        boton.type = "button";

        boton.disabled = (
            cargando ||
            accionEnCurso ||
            !puedePublicarse(producto)
        );

        if (!puedePublicarse(producto)) {

            boton.title =
                "Solo pueden publicarse MP4 "
                + "completados, disponibles y no purgados.";

        }

        boton.addEventListener(
            "click",
            () => {
                void ejecutarAccion(
                    producto,
                    "publicar"
                );
            }
        );

        acciones.appendChild(
            boton
        );

    }

    // Protección manual: un MP4 protegido no se purga nunca, ni sus JPEG.
    if (!producto.fecha_purga) {

        const protegido = producto.protegido === true;

        const botonProteccion = elemento(
            "button",
            "boton boton-secundario",
            protegido ? "Quitar protección" : "Proteger"
        );

        botonProteccion.type = "button";

        botonProteccion.disabled = (
            cargando ||
            accionEnCurso
        );

        botonProteccion.title = protegido
            ? "Volverá a borrarse cuando venza su conservación."
            : "No se borrará nunca, aunque venza su conservación.";

        botonProteccion.addEventListener(
            "click",
            () => {
                void ejecutarAccion(
                    producto,
                    protegido ? "desproteger" : "proteger"
                );
            }
        );

        acciones.appendChild(
            botonProteccion
        );

    }

    return acciones;

}


/* ==========================================================
   TARJETA DE PRODUCTO
   ========================================================== */

function crearTarjeta(
    producto
) {

    const tarjeta = elemento(
        "article",
        "estacion-card"
    );

    tarjeta.style.cursor = "default";

    tarjeta.appendChild(
        elemento(
            "div",
            "estacion-codigo",
            `Producto #${producto.id} · Cámara #${producto.camara_id}`
        )
    );

    tarjeta.appendChild(
        elemento(
            "div",
            "estacion-nombre",
            nombreProducto(producto)
        )
    );

    const chips = elemento(
        "div",
        "chips"
    );

    agregarChip(
        chips,
        tipoProducto(producto)
    );

    agregarChip(
        chips,
        origenProducto(producto)
    );

    agregarChip(
        chips,
        texto(producto.estado)
    );

    agregarChip(
        chips,
        producto.publicada
            ? "Publicado"
            : "No publicado",
        producto.publicada
            ? "chip-activa"
            : "chip-inactiva"
    );

    agregarChip(
        chips,
        producto.archivo_interno_disponible
            ? "Original disponible"
            : "Original no disponible",
        producto.archivo_interno_disponible
            ? "chip-activa"
            : "chip-inactiva"
    );

    if (producto.protegido) {

        agregarChip(
            chips,
            "Protegido",
            "chip-activa"
        );

    } else if (producto.fecha_purga) {

        agregarChip(
            chips,
            "Purgado",
            "chip-inactiva"
        );

    } else if (producto.retencion_dias) {

        agregarChip(
            chips,
            `Se conserva ${producto.retencion_dias} días`
        );

    }

    if (producto.publicada) {

        agregarChip(
            chips,
            producto.archivo_publico_disponible
                ? "Copia pública disponible"
                : "Copia pública no disponible",
            producto.archivo_publico_disponible
                ? "chip-activa"
                : "chip-inactiva"
        );

    }

    tarjeta.appendChild(
        chips
    );

    tarjeta.appendChild(
        elemento(
            "p",
            "estacion-localizacion",
            (
                "Periodo: "
                + fechaMadrid(producto.fecha_inicio)
                + " — "
                + fechaMadrid(producto.fecha_fin)
            )
        )
    );

    tarjeta.appendChild(
        elemento(
            "p",
            "estacion-localizacion",
            (
                "Duración del MP4: "
                + duracion(producto.duracion_segundos)
                + " · "
                + tamanoArchivo(producto.tamano_bytes)
            )
        )
    );

    agregarDetalles(
        tarjeta,
        producto
    );

    tarjeta.appendChild(
        crearAcciones(producto)
    );

    return tarjeta;

}


/* ==========================================================
   PAGINACIÓN Y LISTADO
   ========================================================== */

function actualizarPaginacion() {

    const anterior = buscar(
        "#botonAnteriorProductosTimelapse"
    );

    const siguiente = buscar(
        "#botonSiguienteProductosTimelapse"
    );

    const pagina = buscar(
        "#paginaProductosTimelapse"
    );

    const bloqueado = (
        cargando ||
        accionEnCurso
    );

    if (anterior) {

        anterior.disabled = (
            bloqueado ||
            desplazamiento === 0
        );

    }

    if (siguiente) {

        siguiente.disabled = (
            bloqueado ||
            desplazamiento + LIMITE >= total
        );

    }

    if (pagina) {

        const actual = Math.floor(
            desplazamiento / LIMITE
        ) + 1;

        const paginas = Math.max(
            1,
            Math.ceil(total / LIMITE)
        );

        pagina.textContent =
            `Página ${actual} de ${paginas}`;

    }

    const resumen = buscar(
        "#totalProductosTimelapse"
    );

    if (resumen) {

        resumen.textContent = (
            `${total} producto${total === 1 ? "" : "s"} `
            + "encontrado"
            + (total === 1 ? "" : "s")
        );

    }

}


function bloquearControles(
    bloqueados
) {

    for (
        const selector of [
            "#filtroProductosTimelapsePublicacion",
            "#filtroProductosTimelapseCamara",
            "#botonRecargarProductosTimelapse"
        ]
    ) {

        const control = buscar(selector);

        if (control) {
            control.disabled = bloqueados;
        }

    }

    if (bloqueados) {

        buscar("#listaProductosTimelapse")
            ?.querySelectorAll("button")
            .forEach(
                boton => {
                    boton.disabled = true;
                }
            );

    }

    actualizarPaginacion();

}


function renderizarProductos() {

    const lista = buscar(
        "#listaProductosTimelapse"
    );

    if (!lista) {
        return;
    }

    const fragmento = document.createDocumentFragment();

    if (!productos.length) {

        fragmento.appendChild(
            elemento(
                "div",
                "lista-vacia",
                total === 0
                    ? "No hay productos timelapse para estos filtros."
                    : "No hay productos en esta página."
            )
        );

    } else {

        for (const producto of productos) {

            fragmento.appendChild(
                crearTarjeta(producto)
            );

        }

    }

    lista.replaceChildren(
        fragmento
    );

    actualizarFiltroCamaras();

    actualizarPaginacion();

}


/* ==========================================================
   CONSULTA DE PRODUCTOS
   ========================================================== */

export async function cargarProductosTimelapse() {

    if (!raiz) {
        return false;
    }

    const referencia = raiz;

    const solicitud = ++secuenciaConsulta;

    cargando = true;

    bloquearControles(true);

    estado(
        "Consultando productos timelapse...",
        "info"
    );

    try {

        let respuesta = await peticionJson(
            (
                RUTA_PRODUCTOS
                + "?"
                + parametrosConsulta().toString()
            )
        );

        if (
            solicitud !== secuenciaConsulta ||
            referencia !== raiz
        ) {
            return false;
        }

        if (
            !respuesta ||
            !Array.isArray(respuesta.timelapses) ||
            !Number.isSafeInteger(respuesta.total) ||
            respuesta.total < 0
        ) {

            throw new Error(
                "La API ha devuelto un catálogo "
                + "de productos no válido."
            );

        }

        /*
         * Si la última publicación cambió
         * el total de resultados, retrocedemos
         * a la última página existente.
         */

        if (
            desplazamiento > 0 &&
            desplazamiento >= respuesta.total
        ) {

            desplazamiento = Math.max(
                0,
                (
                    Math.ceil(
                        respuesta.total / LIMITE
                    ) - 1
                ) * LIMITE
            );

            respuesta = await peticionJson(
                (
                    RUTA_PRODUCTOS
                    + "?"
                    + parametrosConsulta().toString()
                )
            );

        }

        if (
            solicitud !== secuenciaConsulta ||
            referencia !== raiz
        ) {
            return false;
        }

        if (
            !respuesta ||
            !Array.isArray(respuesta.timelapses) ||
            !Number.isSafeInteger(respuesta.total) ||
            respuesta.total < 0
        ) {

            throw new Error(
                "La respuesta paginada no es válida."
            );

        }

        productos = respuesta.timelapses;

        total = respuesta.total;

        cargando = false;

        renderizarProductos();

        bloquearControles(false);

        estado(
            "Productos actualizados.",
            "ok"
        );

        return true;

    } catch (error) {

        if (
            solicitud !== secuenciaConsulta ||
            referencia !== raiz
        ) {
            return false;
        }

        cargando = false;

        productos = [];

        total = 0;

        renderizarProductos();

        bloquearControles(false);

        estado(
            error?.message ||
            "No se han podido consultar los productos.",
            "error"
        );

        console.error(
            "Error consultando productos timelapse:",
            error
        );

        return false;

    }

}


/* ==========================================================
   PUBLICAR Y RETIRAR
   ========================================================== */

async function ejecutarAccion(
    producto,
    operacion
) {

    if (
        !raiz ||
        cargando ||
        accionEnCurso
    ) {
        return;
    }

    const ACCIONES = {
        publicar: {
            pregunta: (
                `¿Publicar el timelapse #${producto.id} `
                + `de ${nombreProducto(producto)}?`
                + "\n\n"
                + "Se creará una copia accesible públicamente."
            ),
            proceso: "Publicando MP4...",
            hecho: `Timelapse #${producto.id} publicado correctamente.`
        },
        retirar: {
            pregunta: (
                `¿Retirar la publicación del timelapse `
                + `#${producto.id}?`
                + "\n\n"
                + "El MP4 original se conservará."
            ),
            proceso: "Retirando publicación...",
            hecho: `Publicación del timelapse #${producto.id} retirada.`
        },
        proteger: {
            pregunta: (
                `¿Proteger el timelapse #${producto.id}?`
                + "\n\n"
                + "No se borrará nunca, aunque venza su conservación."
            ),
            proceso: "Protegiendo...",
            hecho: `Timelapse #${producto.id} protegido.`
        },
        desproteger: {
            pregunta: (
                `¿Quitar la protección del timelapse #${producto.id}?`
                + "\n\n"
                + "Se borrará cuando venza su conservación."
            ),
            proceso: "Quitando la protección...",
            hecho: `Timelapse #${producto.id} sin protección.`
        }
    };

    const accion = ACCIONES[operacion];

    if (!accion) {
        return;
    }

    if (
        operacion === "publicar" &&
        !puedePublicarse(producto)
    ) {
        return;
    }

    if (!window.confirm(accion.pregunta)) {
        return;
    }

    const generacionActual = generacion;

    accionEnCurso = true;

    bloquearControles(true);

    estado(
        accion.proceso,
        "info"
    );

    try {

        await peticionJson(
            (
                `${RUTA_PRODUCTOS}/${producto.id}/`
                + operacion
            ),
            {
                method: "POST"
            }
        );

        if (
            generacionActual !== generacion ||
            !raiz
        ) {
            return;
        }

        accionEnCurso = false;

        const actualizado =
            await cargarProductosTimelapse();

        if (
            generacionActual !== generacion ||
            !raiz
        ) {
            return;
        }

        if (actualizado) {

            estado(
                accion.hecho,
                "ok"
            );

        } else {

            estado(
                "La operación se completó, pero no "
                + "se pudo actualizar el listado. "
                + "Pulsa Actualizar.",
                "info"
            );

        }

    } catch (error) {

        if (
            generacionActual !== generacion ||
            !raiz
        ) {
            return;
        }

        accionEnCurso = false;

        bloquearControles(false);

        renderizarProductos();

        estado(
            error?.message ||
            "No se ha podido completar la operación.",
            "error"
        );

        console.error(
            `Error al ${operacion} el timelapse:`,
            error
        );

    }

}


/* ==========================================================
   EVENTOS DEL COMPONENTE
   ========================================================== */

function configurarEventos() {

    buscar(
        "#botonRecargarProductosTimelapse"
    )?.addEventListener(
        "click",
        () => {

            void (async () => {

                await cargarCatalogoCamaras();

                await cargarProductosTimelapse();

            })();

        }
    );

    for (
        const selector of [
            "#filtroProductosTimelapsePublicacion",
            "#filtroProductosTimelapseCamara"
        ]
    ) {

        buscar(selector)?.addEventListener(
            "change",
            () => {

                desplazamiento = 0;

                void cargarProductosTimelapse();

            }
        );

    }

    buscar(
        "#botonAnteriorProductosTimelapse"
    )?.addEventListener(
        "click",
        () => {

            if (
                cargando ||
                accionEnCurso ||
                desplazamiento === 0
            ) {
                return;
            }

            desplazamiento = Math.max(
                0,
                desplazamiento - LIMITE
            );

            void cargarProductosTimelapse();

        }
    );

    buscar(
        "#botonSiguienteProductosTimelapse"
    )?.addEventListener(
        "click",
        () => {

            if (
                cargando ||
                accionEnCurso ||
                desplazamiento + LIMITE >= total
            ) {
                return;
            }

            desplazamiento += LIMITE;

            void cargarProductosTimelapse();

        }
    );

}


/* ==========================================================
   MONTAJE DEL COMPONENTE
   ========================================================== */

export async function montarProductosTimelapse(
    contenedor = "modulo-timelapses"
) {

    const destino = typeof contenedor === "string"
        ? $(contenedor)
        : contenedor;

    if (!destino) {
        return false;
    }

    if (
        raiz &&
        destino.contains(raiz)
    ) {

        return true;

    }

    if (promesaMontaje) {
        return promesaMontaje;
    }

    const generacionActual = ++generacion;

    const trabajo = (async () => {

        try {

            const respuesta = await fetch(
                RUTA_COMPONENTE,
                {
                    cache: "no-store"
                }
            );

            if (!respuesta.ok) {

                throw new Error(
                    "No se pudo cargar el componente "
                    + "administrativo de productos."
                );

            }

            const html = await respuesta.text();

            if (
                generacionActual !== generacion
            ) {
                return false;
            }

            const documento = new DOMParser()
                .parseFromString(
                    html,
                    "text/html"
                );

            const plantilla = documento.getElementById(
                "plantilla-admin-timelapses-productos"
            );

            if (
                !plantilla ||
                plantilla.tagName !== "TEMPLATE"
            ) {

                throw new Error(
                    "No se encontró la plantilla "
                    + "administrativa de productos."
                );

            }

            const componente = document.importNode(
                plantilla.content.firstElementChild,
                true
            );

            if (!componente) {

                throw new Error(
                    "La plantilla de productos está vacía."
                );

            }

            if (raiz) {
                raiz.remove();
            }

            raiz = componente;

            /*
             * Se añade como panel independiente,
             * después del bloque de programaciones.
             *
             * No modifica su formulario ni su lista.
             */

            destino.appendChild(
                componente
            );

            configurarEventos();

            await Promise.all([
                cargarCatalogoCamaras(),
                cargarProductosTimelapse()
            ]);

            return (
                generacionActual === generacion
                &&
                raiz === componente
            );

        } catch (error) {

            if (
                generacionActual === generacion
            ) {

                console.error(
                    "Error montando productos timelapse:",
                    error
                );

                mostrarEstado(
                    $("estadoTimelapses"),
                    error?.message ||
                    "No se pudo cargar la gestión de productos.",
                    "error"
                );

            }

            return false;

        }

    })();

    promesaMontaje = trabajo;

    try {

        return await trabajo;

    } finally {

        if (promesaMontaje === trabajo) {
            promesaMontaje = null;
        }

    }

}


/* ==========================================================
   LIMPIEZA AL CERRAR SESIÓN
   ========================================================== */

export function limpiarProductosTimelapse() {

    generacion += 1;

    secuenciaConsulta += 1;

    if (raiz) {
        raiz.remove();
    }

    raiz = null;
    promesaMontaje = null;

    camaras = [];
    productos = [];

    total = 0;
    desplazamiento = 0;

    cargando = false;
    accionEnCurso = false;

}


// Fin de fichero: js/administracion/timelapses-productos.js
