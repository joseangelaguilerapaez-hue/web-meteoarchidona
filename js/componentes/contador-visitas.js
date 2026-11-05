/*
 * MeteoArchidona · Componente «Contador de visitas»
 *
 * Recuadro pequeño con título y una tabla de dos columnas: hoy, semana,
 * mes y año. Decisión de José del 5-11-2026: discreto, sin letras grandes,
 * para la cabecera o donde se decida; por eso es un componente montable
 * y no tiene sitio fijo todavía.
 *
 *     <div data-componente="contador-visitas"></div>
 *
 *     import {montarContadorVisitas} from "/js/componentes/contador-visitas.js?v=…";
 *     montarContadorVisitas(hueco);
 *
 * Los datos salen de GET /auditoria/contador-visitas de la API: páginas
 * vistas del contador anónimo, que suma a todos los visitantes, acepten o
 * no las estadísticas. La semana va de lunes a hoy y las fechas son las
 * de Madrid. Se refresca cada 5 minutos.
 *
 * Nace oculto y solo aparece si la API responde. Sin id fijos: admite
 * varios en la misma página.
 */

import {asegurarHoja, asegurarScript} from "./comun.js?v=20261104-componentes1";


const HOJA = "/css/contador-visitas.css?v=20261105-contador1";

const SCRIPT_API = "/js/api.js?v=20261003-vps1";

const MINUTOS_REFRESCO = 5;

const FILAS = [
    ["hoy", "Hoy"],
    ["semana", "Semana"],
    ["mes", "Mes"],
    ["anio", "Año"],
];

const FORMATO = new Intl.NumberFormat("es-ES");


function construir(hueco) {

    hueco.classList.add("contador-visitas");
    hueco.hidden = true;
    hueco.innerHTML = "";

    const tabla = document.createElement("table");
    tabla.className = "contador-visitas-tabla";

    const titulo = document.createElement("caption");
    titulo.className = "contador-visitas-titulo";
    titulo.textContent = "Visitas";
    tabla.appendChild(titulo);

    const cuerpo = document.createElement("tbody");
    const celdas = {};

    for (const [clave, texto] of FILAS) {
        const fila = document.createElement("tr");

        const etiqueta = document.createElement("th");
        etiqueta.scope = "row";
        etiqueta.textContent = texto;

        const valor = document.createElement("td");
        valor.textContent = "–";

        fila.append(etiqueta, valor);
        cuerpo.appendChild(fila);
        celdas[clave] = valor;
    }

    tabla.appendChild(cuerpo);
    hueco.appendChild(tabla);

    return celdas;
}


async function actualizar(hueco, celdas) {

    try {
        const respuesta = await fetch(
            `${window.API_BASE || "/api"}/auditoria/contador-visitas`,
            {cache: "no-cache"}
        );

        if (!respuesta.ok) {
            throw new Error(`HTTP ${respuesta.status}`);
        }

        const datos = await respuesta.json();

        for (const [clave] of FILAS) {
            const numero = Number(datos[clave]);
            celdas[clave].textContent = Number.isFinite(numero) ? FORMATO.format(numero) : "–";
        }

        hueco.title = "Páginas vistas en meteoarchidona.com";
        hueco.hidden = false;
        return true;

    } catch (error) {
        // Si ya enseñaba cifras, se quedan las últimas; si no, sigue oculto.
        console.warn("Contador de visitas: no se han podido cargar las cifras.", error);
        return false;
    }
}


export async function montarContadorVisitas(hueco) {

    if (!hueco) {
        return false;
    }

    asegurarHoja(HOJA);
    await asegurarScript(SCRIPT_API, "API_BASE");

    const celdas = construir(hueco);
    const correcto = await actualizar(hueco, celdas);

    setInterval(() => {
        if (document.visibilityState === "visible" && hueco.isConnected) {
            void actualizar(hueco, celdas);
        }
    }, MINUTOS_REFRESCO * 60 * 1000);

    return correcto;
}


// Fin de fichero: js/componentes/contador-visitas.js
