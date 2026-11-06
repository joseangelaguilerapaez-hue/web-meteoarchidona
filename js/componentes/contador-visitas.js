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
 * Los datos salen de GET /auditoria/contador-visitas de la API. La
 * semana va de lunes a hoy y las fechas son las de Madrid. Se refresca
 * cada 5 minutos.
 *
 * Una casilla «Usuarios» (José, 5-11-2026) cambia lo que se cuenta:
 *   - sin marcar (por defecto), «Visitas»: páginas vistas del contador
 *     anónimo, que suma a todos, acepten o no las estadísticas;
 *   - marcada, «Usuarios»: visitantes distintos, cada navegador una vez
 *     por periodo aunque entre varias veces. Solo cuenta a quienes
 *     aceptaron las estadísticas: de los demás no se guarda nada que los
 *     distinga.
 * La elección no se guarda en el navegador: al recargar vuelve a Visitas.
 *
 * Una tercera columna, «Registrados» (José, 5-11-2026), da los usuarios
 * con cuenta distintos que han entrado con ella en cada periodo; no
 * cambia con la casilla. También solo de quienes aceptan las estadísticas.
 *
 * Nace oculto y solo aparece si la API responde. Sin id fijos: admite
 * varios en la misma página.
 */

import {asegurarHoja, asegurarScript} from "./comun.js?v=20261104-componentes1";


const HOJA = "/css/contador-visitas.css?v=20261106-contador4";

const SCRIPT_API = "/js/api.js?v=20261003-vps1";

const MINUTOS_REFRESCO = 5;

const FILAS = [
    ["hoy", "Hoy"],
    ["semana", "Semana"],
    ["mes", "Mes"],
    ["anio", "Año"],
];

const FORMATO = new Intl.NumberFormat("es-ES");

const AYUDA = {
    visitas: "Páginas vistas en meteoarchidona.com",
    usuarios: "Visitantes distintos (cada uno una vez por periodo); "
        + "solo de quienes aceptan las estadísticas",
    registrados: "Registrados: usuarios con cuenta distintos que han entrado con ella",
};


function construir(hueco) {

    hueco.classList.add("contador-visitas");
    hueco.hidden = true;
    hueco.innerHTML = "";

    const tabla = document.createElement("table");
    tabla.className = "contador-visitas-tabla";

    const titulo = document.createElement("caption");
    titulo.className = "contador-visitas-titulo";

    const nombre = document.createElement("span");
    nombre.textContent = "Visitas";

    const opcion = document.createElement("label");
    opcion.className = "contador-visitas-opcion";

    const casilla = document.createElement("input");
    casilla.type = "checkbox";

    opcion.append(casilla, " Usuarios");
    titulo.append(nombre, opcion);
    tabla.appendChild(titulo);

    const cabecera = document.createElement("thead");
    const filaCabecera = document.createElement("tr");

    for (const texto of ["", "Todos", "Registrados"]) {
        const celda = document.createElement("th");
        celda.scope = "col";
        celda.textContent = texto;
        filaCabecera.appendChild(celda);
    }

    cabecera.appendChild(filaCabecera);
    tabla.appendChild(cabecera);

    const cuerpo = document.createElement("tbody");
    const celdas = {};
    const registrados = {};

    for (const [clave, texto] of FILAS) {
        const fila = document.createElement("tr");

        const etiqueta = document.createElement("th");
        etiqueta.scope = "row";
        etiqueta.textContent = texto;

        const valor = document.createElement("td");
        valor.textContent = "–";

        const registrado = document.createElement("td");
        registrado.textContent = "–";

        fila.append(etiqueta, valor, registrado);
        cuerpo.appendChild(fila);
        celdas[clave] = valor;
        registrados[clave] = registrado;
    }

    tabla.appendChild(cuerpo);
    hueco.appendChild(tabla);

    return {celdas, registrados, casilla, nombre, datos: null};
}


function pintar(hueco, estado) {

    const usuarios = estado.casilla.checked;
    const fuente = usuarios ? estado.datos?.visitantes : estado.datos;

    estado.nombre.textContent = usuarios ? "Usuarios" : "Visitas";
    hueco.title = `${AYUDA[usuarios ? "usuarios" : "visitas"]}. ${AYUDA.registrados}.`;

    const texto = valor => {
        const numero = Number(valor);
        return Number.isFinite(numero) ? FORMATO.format(numero) : "–";
    };

    for (const [clave] of FILAS) {
        estado.celdas[clave].textContent = texto(fuente?.[clave]);
        estado.registrados[clave].textContent = texto(estado.datos?.registrados?.[clave]);
    }
}


async function actualizar(hueco, estado) {

    try {
        const respuesta = await fetch(
            `${window.API_BASE || "/api"}/auditoria/contador-visitas`,
            {cache: "no-cache"}
        );

        if (!respuesta.ok) {
            throw new Error(`HTTP ${respuesta.status}`);
        }

        estado.datos = await respuesta.json();
        pintar(hueco, estado);
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

    const estado = construir(hueco);
    estado.casilla.addEventListener("change", () => pintar(hueco, estado));

    const correcto = await actualizar(hueco, estado);

    setInterval(() => {
        if (document.visibilityState === "visible" && hueco.isConnected) {
            void actualizar(hueco, estado);
        }
    }, MINUTOS_REFRESCO * 60 * 1000);

    return correcto;
}


// Fin de fichero: js/componentes/contador-visitas.js
