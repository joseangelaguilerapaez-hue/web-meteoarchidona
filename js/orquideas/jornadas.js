/*
 * MeteoArchidona · Orquídeas · Jornadas de Orquideoflora
 *
 * Decisiones de José y Damián Quintana del 26-11-2026: apartado público de
 * las «Jornadas Andaluzas sobre Orquideoflora "Ciudad de Archidona"», que
 * organizan el Ayuntamiento de Archidona y Savia Integnova (solo el nombre,
 * sin logotipos ni enlaces):
 *
 *   - la próxima edición, con su inscripción (formulario propio; se abre
 *     edición a edición);
 *   - todas las ediciones, de la más nueva a la más antigua;
 *   - la galería del concurso fotográfico de cada edición (los concursantes
 *     ceden los derechos al Ayuntamiento y a Savia).
 *
 * El editor de orquídeas ve además los botones para añadir y corregir
 * ediciones, subir fotos y ver los inscritos (js/orquideas/editor.js).
 *
 *     <div data-componente="orquideas-jornadas"></div>
 *
 * API: GET /orquideas/jornadas, POST /orquideas/jornadas/{numero}/inscripcion
 * y, para el editor, /orquideas/editor/jornadas...
 */

import {
    pedir, olvidar, crear, aviso, vaciar, prepararRaiz, titulo, textoError, fechasJornada
} from "./comun.js?v=20261126-jornadas1";
import {
    esEditor, alCambiarEditor, enviar, formulario, botonEditor, ventanaLectura, reducirFoto
} from "./editor.js?v=20261126-jornadas1";


/* ------------------------------------------------------------
   Inscripción
   ------------------------------------------------------------ */

function campoInscripcion(etiqueta, nombre, tipo, requerido, autocompletar) {
    const caja = crear("label", "orq-inscripcion-campo");
    caja.appendChild(crear("span", null, etiqueta));
    const control = document.createElement("input");
    control.type = tipo;
    control.name = nombre;
    control.required = requerido;
    control.autocomplete = autocompletar;
    control.maxLength = nombre === "telefono" ? 30 : 160;
    caja.appendChild(control);
    return caja;
}

function formularioInscripcion(edicion) {
    const caja = crear("form", "orq-inscripcion");
    caja.noValidate = false;
    caja.appendChild(crear("strong", "orq-inscripcion-titulo", "Inscríbete"));

    if (!edicion.inscripcion_abierta) {
        caja.appendChild(crear(
            "p", "orq-inscripcion-cerrada",
            "La inscripción se abrirá cuando la organización publique las fechas. Vuelve por aquí en primavera."
        ));
        return caja;
    }
    if (edicion.plazas_libres === 0) {
        caja.appendChild(crear("p", "orq-inscripcion-cerrada", "Lo sentimos: ya no quedan plazas."));
        return caja;
    }

    caja.append(
        campoInscripcion("Nombre y apellidos", "nombre", "text", true, "name"),
        campoInscripcion("Correo", "correo", "email", true, "email"),
        campoInscripcion("Teléfono", "telefono", "tel", false, "tel")
    );

    // Trampa para robots: una persona no la ve ni la rellena.
    const trampa = document.createElement("input");
    trampa.type = "text";
    trampa.name = "web";
    trampa.tabIndex = -1;
    trampa.autocomplete = "off";
    trampa.className = "orq-trampa";
    trampa.setAttribute("aria-hidden", "true");
    caja.appendChild(trampa);

    const boton = crear("button", "orq-inscripcion-boton", "Enviar inscripción");
    boton.type = "submit";
    caja.appendChild(boton);

    const estado = crear("p", "orq-inscripcion-estado");
    estado.setAttribute("role", "status");
    caja.appendChild(estado);

    if (edicion.plazas_libres !== null) {
        caja.appendChild(crear("p", "orq-inscripcion-nota", `Quedan ${edicion.plazas_libres} plazas.`));
    }
    caja.appendChild(crear(
        "p", "orq-inscripcion-nota",
        "Tus datos solo los ve la organización de las Jornadas, para ponerse en contacto contigo."
    ));

    caja.addEventListener("submit", async evento => {
        evento.preventDefault();
        if (!caja.reportValidity()) return;
        boton.disabled = true;
        estado.className = "orq-inscripcion-estado";
        estado.textContent = "Enviando…";
        try {
            const respuesta = await enviar("POST", `/orquideas/jornadas/${edicion.numero}/inscripcion`, {
                nombre: caja.elements.nombre.value,
                correo: caja.elements.correo.value,
                telefono: caja.elements.telefono.value || null,
                web: caja.elements.web.value || null
            });
            estado.classList.add("bien");
            estado.textContent = respuesta.mensaje;
            caja.reset();
        } catch (error) {
            estado.classList.add("mal");
            estado.textContent = error.message;
        } finally {
            boton.disabled = false;
        }
    });
    return caja;
}


/* ------------------------------------------------------------
   Piezas
   ------------------------------------------------------------ */

function nombreEdicion(edicion) {
    return `${edicion.romano} ${edicion.titulo}`;
}

function fotoEnGrande(foto) {
    const figura = crear("figure", "orq-jornada-foto-grande");
    const imagen = document.createElement("img");
    imagen.src = foto.url;
    imagen.alt = foto.titulo || `Foto de ${foto.autor}`;
    imagen.width = foto.ancho;
    imagen.height = foto.alto;
    figura.appendChild(imagen);
    const pie = crear("figcaption");
    pie.textContent = [foto.premio, foto.titulo, `© ${foto.autor}`].filter(Boolean).join(" · ");
    figura.appendChild(pie);
    ventanaLectura(foto.especie ? foto.especie : "Concurso fotográfico", figura);
}

function galeria(edicion, alCambiar) {
    const lista = crear("div", "orq-jornada-galeria");
    for (const foto of edicion.fotos) {
        const tarjeta = crear("figure", "orq-jornada-foto");
        const abrir = crear("button", "orq-jornada-foto-boton");
        abrir.type = "button";
        abrir.setAttribute("aria-label", `Ver en grande: ${foto.titulo || foto.premio || "foto"} de ${foto.autor}`);
        const imagen = document.createElement("img");
        imagen.src = foto.url_mini;
        imagen.alt = foto.titulo || `Foto de ${foto.autor}`;
        imagen.loading = "lazy";
        imagen.decoding = "async";
        abrir.appendChild(imagen);
        abrir.addEventListener("click", () => fotoEnGrande(foto));
        tarjeta.appendChild(abrir);

        const pie = crear("figcaption");
        if (foto.premio) pie.appendChild(crear("strong", null, foto.premio));
        pie.appendChild(crear("span", null, foto.autor));
        if (foto.especie) pie.appendChild(crear("em", null, foto.especie));
        tarjeta.appendChild(pie);

        if (esEditor()) {
            tarjeta.appendChild(botonEditor("Editar", () => editarFoto(foto, alCambiar), "orq-editor-mini"));
        }
        lista.appendChild(tarjeta);
    }
    return lista;
}


/* ------------------------------------------------------------
   Editor
   ------------------------------------------------------------ */

const TITULO_POR_DEFECTO = "Jornadas Andaluzas sobre Orquideoflora «Ciudad de Archidona»";

const CAMPOS_JORNADA = [
    { nombre: "numero", etiqueta: "Número de la edición", tipo: "number", min: 1, max: 99, requerido: true },
    { nombre: "anio", etiqueta: "Año", tipo: "number", min: 2000, max: 2100, requerido: true },
    { nombre: "titulo", etiqueta: "Título", maximo: 200,
      ayuda: "Vacío: «Jornadas Andaluzas sobre Orquideoflora «Ciudad de Archidona»»." },
    { nombre: "fecha_inicio", etiqueta: "Empieza", tipo: "date" },
    { nombre: "fecha_fin", etiqueta: "Termina", tipo: "date" },
    { nombre: "lugar", etiqueta: "Lugares de las salidas", maximo: 300 },
    { nombre: "descripcion", etiqueta: "Descripción (ponentes, actividades…)", tipo: "textarea", filas: 5, maximo: 8000 },
    { nombre: "url_programa", etiqueta: "Enlace al programa", tipo: "url", maximo: 500 },
    { nombre: "inscripcion_abierta", etiqueta: "Inscripción abierta", tipo: "checkbox" },
    { nombre: "plazas_maximas", etiqueta: "Plazas", tipo: "number", min: 1, max: 5000, ayuda: "Vacío: sin límite." },
    { nombre: "visible", etiqueta: "Visible en la web", tipo: "checkbox" }
];

async function editarJornada(edicion, alCambiar) {
    const nueva = !edicion;
    const resultado = await formulario({
        titulo: nueva ? "Nueva edición" : `Editar la ${edicion.romano} edición`,
        campos: CAMPOS_JORNADA,
        // El título por defecto lo pone la API: en el formulario, vacío.
        valores: edicion
            ? { ...edicion, titulo: edicion.titulo === TITULO_POR_DEFECTO ? null : edicion.titulo }
            : { visible: true },
        guardar: valores => nueva
            ? enviar("POST", "/orquideas/editor/jornadas", valores)
            : enviar("PATCH", `/orquideas/editor/jornadas/${edicion.id}`, valores),
        peligro: nueva ? null : {
            texto: "Borrar la edición",
            confirmar: `¿Borrar la ${edicion.romano} edición, con sus fotos e inscripciones? No se puede deshacer.`,
            accion: () => enviar("DELETE", `/orquideas/editor/jornadas/${edicion.id}`)
        }
    });
    if (resultado) alCambiar();
}

async function especiesParaElegir() {
    try {
        const lista = await pedir("/orquideas/editor/especies");
        return [{ valor: "", texto: "— Sin especie —" }].concat(
            lista.map(especie => ({ valor: String(especie.id), texto: especie.nombre_cientifico }))
        );
    } catch {
        return [{ valor: "", texto: "— Sin especie —" }];
    }
}

async function subirFoto(edicion, alCambiar) {
    const resultado = await formulario({
        titulo: `Foto del concurso · ${edicion.romano} edición`,
        explicacion: "Los concursantes ceden los derechos al Ayuntamiento de Archidona y a Savia Integnova.",
        campos: [
            { nombre: "archivo", etiqueta: "Foto (JPG, PNG o WebP)", tipo: "file", acepta: "image/*", requerido: true },
            { nombre: "autor", etiqueta: "Autor", requerido: true, maximo: 160 },
            { nombre: "premio", etiqueta: "Premio", maximo: 80, ayuda: "«1.º premio», «Accésit»… Vacío si no tiene." },
            { nombre: "titulo", etiqueta: "Título", maximo: 200 },
            { nombre: "especie_id", etiqueta: "Especie", tipo: "select", numerico: true, opciones: await especiesParaElegir() },
            { nombre: "orden", etiqueta: "Orden en la galería", tipo: "number", min: 0, max: 999 }
        ],
        textoGuardar: "Subir",
        guardar: async valores => {
            const datos = new FormData();
            const reducida = await reducirFoto(valores.archivo);
            datos.append("archivo", reducida, "foto.jpg");
            for (const nombre of ["autor", "premio", "titulo", "especie_id", "orden"]) {
                if (valores[nombre] !== null && valores[nombre] !== undefined) datos.append(nombre, String(valores[nombre]));
            }
            return enviar("POST", `/orquideas/editor/jornadas/${edicion.id}/fotos`, datos);
        }
    });
    if (resultado) alCambiar();
}

async function editarFoto(foto, alCambiar) {
    const resultado = await formulario({
        titulo: "Editar la foto",
        campos: [
            { nombre: "autor", etiqueta: "Autor", requerido: true, maximo: 160 },
            { nombre: "premio", etiqueta: "Premio", maximo: 80 },
            { nombre: "titulo", etiqueta: "Título", maximo: 200 },
            { nombre: "especie_id", etiqueta: "Especie", tipo: "select", numerico: true, opciones: await especiesParaElegir() },
            { nombre: "orden", etiqueta: "Orden en la galería", tipo: "number", min: 0, max: 999 }
        ],
        valores: foto,
        guardar: valores => enviar("PATCH", `/orquideas/editor/fotos/${foto.id}`, valores),
        peligro: {
            texto: "Quitar la foto",
            confirmar: "¿Quitar esta foto de la galería? No se puede deshacer.",
            accion: () => enviar("DELETE", `/orquideas/editor/fotos/${foto.id}`)
        }
    });
    if (resultado) alCambiar();
}

function aCsv(filas) {
    const celda = valor => `"${String(valor ?? "").replaceAll('"', '""')}"`;
    const claves = [...new Set(filas.flatMap(fila => Object.keys(fila.datos || {})))];
    const cabecera = ["Nombre", "Correo", "Teléfono", ...claves, "Fecha"].map(celda).join(";");
    const cuerpo = filas.map(fila => [
        fila.nombre, fila.correo, fila.telefono,
        ...claves.map(clave => fila.datos?.[clave]),
        new Date(fila.fecha_creacion).toLocaleString("es-ES", { timeZone: "Europe/Madrid" })
    ].map(celda).join(";"));
    return "﻿" + [cabecera, ...cuerpo].join("\r\n");
}

async function verInscritos(edicion) {
    const caja = crear("div", "orq-inscritos");
    aviso(caja, "Cargando…");
    ventanaLectura(`Inscritos · ${edicion.romano} edición`, caja);

    async function pintar() {
        let filas;
        try {
            filas = await enviar("GET", `/orquideas/editor/jornadas/${edicion.id}/inscripciones`);
        } catch (error) {
            aviso(caja, error.message, true);
            return;
        }
        vaciar(caja);
        if (!filas.length) {
            caja.appendChild(crear("p", "orq-aviso", "Todavía no hay nadie inscrito."));
            return;
        }
        caja.appendChild(crear("p", "orq-inscritos-total", `${filas.length} ${filas.length === 1 ? "persona" : "personas"}`));
        const tabla = crear("table", "orq-inscritos-tabla");
        const cabeza = crear("tr");
        for (const texto of ["Nombre", "Correo", "Teléfono", "Fecha", ""]) cabeza.appendChild(crear("th", null, texto));
        tabla.appendChild(cabeza);
        for (const fila of filas) {
            const linea = crear("tr");
            linea.append(
                crear("td", null, fila.nombre),
                crear("td", null, fila.correo),
                crear("td", null, fila.telefono || "—"),
                crear("td", null, new Date(fila.fecha_creacion).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" }))
            );
            const quitar = crear("td");
            quitar.appendChild(botonEditor("Quitar", async () => {
                if (!window.confirm(`¿Quitar la inscripción de ${fila.nombre}?`)) return;
                try {
                    await enviar("DELETE", `/orquideas/editor/inscripciones/${fila.id}`);
                    await pintar();
                } catch (error) {
                    window.alert(error.message);
                }
            }, "orq-editor-mini"));
            linea.appendChild(quitar);
            tabla.appendChild(linea);
        }
        const envoltorio = crear("div", "orq-inscritos-desliza");
        envoltorio.appendChild(tabla);
        caja.appendChild(envoltorio);
        const descargar = crear("a", "orq-editor-boton", "Descargar para Excel (CSV)");
        descargar.href = URL.createObjectURL(new Blob([aCsv(filas)], { type: "text/csv;charset=utf-8" }));
        descargar.download = `inscritos-jornadas-orquideas-${edicion.anio}.csv`;
        caja.appendChild(descargar);
    }
    await pintar();
}


/* ------------------------------------------------------------
   Pintar
   ------------------------------------------------------------ */

function pintarProxima(edicion, organizadores, alCambiar) {
    const caja = crear("section", "orq-jornada-proxima");
    caja.setAttribute("aria-label", "Próxima edición");

    const texto = crear("div", "orq-jornada-proxima-texto");
    texto.appendChild(crear("span", "orq-jornada-proxima-etiqueta", "PRÓXIMA EDICIÓN"));
    texto.appendChild(crear("h3", "orq-jornada-proxima-titulo", nombreEdicion(edicion)));
    texto.appendChild(crear("p", "orq-jornada-proxima-fechas", fechasJornada(edicion.fecha_inicio, edicion.fecha_fin, edicion.anio)));
    if (edicion.lugar) texto.appendChild(crear("p", "orq-jornada-proxima-lugar", edicion.lugar));
    if (edicion.descripcion) texto.appendChild(crear("p", "orq-jornada-proxima-descripcion", edicion.descripcion));
    if (edicion.url_programa) {
        const enlace = crear("a", "orq-jornada-proxima-programa", "Ver el programa");
        enlace.href = edicion.url_programa;
        enlace.target = "_blank";
        enlace.rel = "noopener noreferrer";
        texto.appendChild(enlace);
    }
    texto.appendChild(crear("p", "orq-jornada-organizan", `Organizan: ${organizadores}`));
    if (esEditor()) {
        const botones = crear("div", "orq-editor-fila");
        botones.append(
            botonEditor("Editar la edición", () => editarJornada(edicion, alCambiar)),
            botonEditor("Ver inscritos", () => verInscritos(edicion))
        );
        texto.appendChild(botones);
    }

    caja.append(texto, formularioInscripcion(edicion));
    return caja;
}

function pintarEdicion(edicion, alCambiar) {
    const tarjeta = crear("article", "orq-jornada");
    if (!edicion.visible) tarjeta.classList.add("oculta");

    const cabeza = crear("div", "orq-jornada-cabeza");
    cabeza.appendChild(crear("h4", "orq-jornada-numero", `${edicion.romano} · ${edicion.anio}`));
    if (!edicion.visible) cabeza.appendChild(crear("span", "orq-marca", "Oculta"));
    tarjeta.appendChild(cabeza);
    tarjeta.appendChild(crear("p", "orq-jornada-fechas", fechasJornada(edicion.fecha_inicio, edicion.fecha_fin, edicion.anio)));
    if (edicion.lugar) tarjeta.appendChild(crear("p", "orq-jornada-lugar", edicion.lugar));
    if (edicion.descripcion) tarjeta.appendChild(crear("p", "orq-jornada-descripcion", edicion.descripcion));
    if (edicion.url_programa) {
        const enlace = crear("a", "orq-jornada-programa", "Programa");
        enlace.href = edicion.url_programa;
        enlace.target = "_blank";
        enlace.rel = "noopener noreferrer";
        tarjeta.appendChild(enlace);
    }

    if (edicion.fotos.length) {
        tarjeta.appendChild(crear("h5", "orq-subtitulo", `Concurso fotográfico (${edicion.fotos.length})`));
        tarjeta.appendChild(galeria(edicion, alCambiar));
    }

    if (esEditor()) {
        const botones = crear("div", "orq-editor-fila");
        botones.append(
            botonEditor("Editar", () => editarJornada(edicion, alCambiar)),
            botonEditor("Subir foto del concurso", () => subirFoto(edicion, alCambiar)),
            botonEditor("Inscritos", () => verInscritos(edicion))
        );
        tarjeta.appendChild(botones);
    }
    return tarjeta;
}

function pintar(cuerpo, datos, alCambiar) {
    vaciar(cuerpo);

    if (esEditor()) {
        const barra = crear("div", "orq-editor-barra");
        barra.appendChild(crear("span", "orq-editor-aviso", "Modo editor de orquídeas"));
        barra.appendChild(botonEditor("Nueva edición", () => editarJornada(null, alCambiar), "orq-editor-principal"));
        cuerpo.appendChild(barra);
    }

    if (datos.proxima) {
        cuerpo.appendChild(pintarProxima(datos.proxima, datos.organizadores, alCambiar));
    }

    const pasadas = datos.ediciones.filter(edicion => edicion.id !== datos.proxima?.id);
    if (pasadas.length) {
        cuerpo.appendChild(crear("h4", "orq-jornadas-subtitulo", "Todas las ediciones"));
        const rejilla = crear("div", "orq-jornadas-rejilla");
        pasadas.forEach(edicion => rejilla.appendChild(pintarEdicion(edicion, alCambiar)));
        cuerpo.appendChild(rejilla);
    }
    if (!datos.proxima) {
        cuerpo.appendChild(crear("p", "orq-jornada-organizan", `Organizan: ${datos.organizadores}`));
    }
}


export async function montarJornadasOrquideas(raiz) {
    prepararRaiz(raiz, "orq-jornadas");
    titulo(raiz, "JORNADAS", "Jornadas de Orquideoflora de Archidona");
    const cuerpo = crear("div", "orq-cuerpo");
    raiz.appendChild(cuerpo);

    async function cargar() {
        const ruta = esEditor() ? "/orquideas/editor/jornadas" : "/orquideas/jornadas";
        try {
            pintar(cuerpo, await pedir(ruta), recargar);
        } catch (error) {
            aviso(cuerpo, textoError(error), true);
        }
    }

    function recargar() {
        olvidar("/orquideas/");
        void cargar();
    }

    aviso(cuerpo, "Cargando…");
    alCambiarEditor(() => void cargar());
    await cargar();
}


/* Fin de fichero: js/orquideas/jornadas.js */
