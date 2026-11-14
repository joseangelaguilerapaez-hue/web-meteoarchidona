/*
 * MeteoArchidona · Agua y sequía · Mapa de sequía de España
 *
 *     <div data-componente="sequia-mapa" data-producto="SPEI" data-escala="3"></div>
 *
 * Mapas de España del Observatorio Europeo de la Sequía (EDO, Copernicus),
 * recortados y dibujados por MeteoArchidona (José, 14-11-2026;
 * docs/agua-sequia.md de la API): SPI y SPEI a 1, 3, 6 y 12 meses, humedad
 * del suelo y vegetación frente a lo normal e indicador combinado.
 *
 * Opciones: data-producto (SPEI por defecto; SPI, HUMEDAD_SUELO,
 * VEGETACION o COMBINADO), data-escala (3 por defecto, solo SPI y SPEI) y
 * data-selector="no" para fijar el mapa en un dashboard.
 *
 * API: GET /agua/sequia/mapas y la imagen /agua/sequia/mapas/{id} (WebP).
 */

import { aviso, crear, fecha, leyenda, pedir, pie, prepararRaiz } from "./comun.js?v=20261114-sequia2";


const PRODUCTOS = ["SPEI", "SPI", "HUMEDAD_SUELO", "VEGETACION", "COMBINADO"];
const NOMBRES_CORTOS = {
    SPEI: "SPEI",
    SPI: "SPI",
    HUMEDAD_SUELO: "Humedad del suelo",
    VEGETACION: "Vegetación",
    COMBINADO: "Combinado"
};
const NOMBRES_ESCALA = { 1: "1 mes", 3: "3 meses", 6: "6 meses", 12: "12 meses" };
const EXPLICACION = {
    SPEI: "Lluvia menos evaporación de los últimos meses frente a lo normal.",
    SPI: "Lluvia de los últimos meses frente a lo normal.",
    HUMEDAD_SUELO: "Agua del suelo frente a lo normal de estas fechas.",
    VEGETACION: "Verdor de la vegetación (luz que aprovecha) frente a lo normal.",
    COMBINADO: "Junta lluvia, suelo y vegetación: vigilancia, aviso, alerta o recuperación."
};

function base() {
    return window.API_BASE || "/api";
}

function boton(textoBoton, activo, accion) {
    const nodo = crear("button", activo ? "activa" : "", textoBoton);
    nodo.type = "button";
    nodo.setAttribute("aria-pressed", String(activo));
    nodo.addEventListener("click", accion);
    return nodo;
}


export async function montarMapaSequia(raiz) {
    prepararRaiz(raiz, "seq-mapa");
    const cabeza = crear("div", "seq-cabeza");
    const textos = crear("div");
    textos.appendChild(crear("div", "emb-etiqueta", "Sequía · España"));
    if (raiz.dataset.titulo !== "no") {
        textos.appendChild(crear("h3", "emb-titulo", "Mapa de sequía de España"));
    }
    cabeza.appendChild(textos);
    raiz.appendChild(cabeza);

    const cuerpo = crear("div", "seq-cuerpo");
    raiz.appendChild(cuerpo);
    aviso(cuerpo, "Cargando los mapas…");

    let datos;
    try {
        datos = await pedir("/agua/sequia/mapas");
    } catch {
        aviso(cuerpo, "No se han podido leer los mapas de sequía. Prueba dentro de un rato.", true);
        return;
    }
    const productos = datos.productos.filter(p => PRODUCTOS.includes(p.producto));
    if (!productos.some(p => p.ultimo)) {
        aviso(cuerpo, "Todavía no hay mapas de España: se cargan cada día a mediodía.");
        return;
    }

    let producto = PRODUCTOS.includes((raiz.dataset.producto || "").toUpperCase()) ? raiz.dataset.producto.toUpperCase() : "SPEI";
    let escala = Number(raiz.dataset.escala) || 3;
    let identificador = null;
    const conSelector = raiz.dataset.selector !== "no";

    const elegido = () => {
        const candidatos = productos.filter(p => p.producto === producto);
        return candidatos.find(p => p.escala === (candidatos.length > 1 ? escala : p.escala)) || candidatos[0];
    };

    const pintar = () => {
        cuerpo.textContent = "";
        const actual = elegido();

        if (conSelector) {
            const tipos = crear("div", "seq-interruptor seq-productos");
            for (const codigo of PRODUCTOS) {
                if (!productos.some(p => p.producto === codigo)) continue;
                tipos.appendChild(boton(NOMBRES_CORTOS[codigo], codigo === producto, () => {
                    producto = codigo;
                    raiz.dataset.producto = codigo;
                    identificador = null;
                    pintar();
                }));
            }
            cuerpo.appendChild(tipos);

            const escalas = productos.filter(p => p.producto === producto);
            if (escalas.length > 1) {
                const fila = crear("div", "seq-interruptor seq-escalas-mapa");
                for (const p of escalas) {
                    fila.appendChild(boton(NOMBRES_ESCALA[p.escala] || `${p.escala} meses`, p.escala === actual.escala, () => {
                        escala = p.escala;
                        raiz.dataset.escala = String(p.escala);
                        identificador = null;
                        pintar();
                    }));
                }
                cuerpo.appendChild(fila);
            }
        }

        if (!actual || !actual.ultimo) {
            aviso(cuerpo, "De este mapa todavía no hay ninguna fecha cargada.");
            return;
        }
        const fechaElegida = actual.fechas.find(f => f.id === identificador) || actual.ultimo;

        const titulo = crear("p", "seq-resumen",
            `${actual.nombre}${actual.escala ? ` a ${NOMBRES_ESCALA[actual.escala] || actual.escala}` : ""}, ${fecha(fechaElegida.fecha, true)}`);
        cuerpo.appendChild(titulo);
        cuerpo.appendChild(crear("p", "seq-nota", EXPLICACION[actual.producto] || ""));

        if (conSelector && actual.fechas.length > 1) {
            const etiqueta = crear("label", "seq-selector", "Fecha ");
            const selector = crear("select");
            for (const f of actual.fechas) {
                selector.appendChild(new Option(fecha(f.fecha, true), String(f.id)));
            }
            selector.value = String(fechaElegida.id);
            selector.addEventListener("change", () => {
                identificador = Number(selector.value);
                pintar();
            });
            etiqueta.appendChild(selector);
            cuerpo.appendChild(etiqueta);
        }

        const marco = crear("figure", "seq-mapa-marco");
        const imagen = crear("img");
        imagen.src = `${base()}/agua/sequia/mapas/${fechaElegida.id}`;
        imagen.alt = `Mapa de España: ${actual.nombre}, ${fecha(fechaElegida.fecha, true)}`;
        imagen.loading = "lazy";
        imagen.decoding = "async";
        imagen.addEventListener("error", () => {
            marco.textContent = "";
            aviso(marco, "No se ha podido cargar la imagen del mapa.", true);
        });
        marco.appendChild(imagen);
        cuerpo.appendChild(marco);

        const elementos = (actual.producto === "COMBINADO" ? datos.leyenda_combinado : datos.leyenda_indices) || [];
        const lista = leyenda(elementos.map(e => ["seq-color", e.nombre]));
        lista.querySelectorAll("i").forEach((marca, i) => marca.style.setProperty("--seq-color", elementos[i].color));
        cuerpo.appendChild(lista);

        cuerpo.appendChild(crear("p", "emb-aviso", datos.aviso));
        pie(cuerpo, datos.atribucion);
    };
    pintar();
}


/* Fin de fichero: js/sequia/mapa.js */
