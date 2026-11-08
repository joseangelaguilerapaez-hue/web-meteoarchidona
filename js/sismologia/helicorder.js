/*
 * MeteoArchidona · Componente «Helicorder de EGOR»
 *
 * Sismograma de 24 horas de la estación ES.EGOR de la Red Sísmica
 * Nacional (IGN), a unos 25 km al este de Archidona. Decisión de José del
 * 8-11-2026: como los que seguía en la crisis del volcán de La Palma.
 *
 * Cada línea es media hora de señal y se lee de izquierda a derecha y de
 * arriba abajo, alternando pizarra y magma; la hora es la de Madrid. Los
 * terremotos de nuestra base de ese día van marcados. El IGN publica la
 * señal de cada día ya cerrado, así que lo más reciente es «ayer»; con
 * los botones se pasa a días anteriores.
 *
 *     <div data-componente="sismologia-helicorder"></div>
 *     <div data-componente="sismologia-helicorder" data-titulo="no"></div>
 *
 * API: GET /sismologia/helicorder (días disponibles) y
 *      GET /sismologia/helicorder/imagen?dia=AAAA-MM-DD (PNG).
 */

import {
    pedir, crear, aviso, prepararRaiz, esVigente, titulo, pie, kilometros
} from "./comun.js?v=20261109-heli1";


const formatoDia = new Intl.DateTimeFormat("es-ES", {
    timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric"
});

function nombreDia(texto) {
    const [anio, mes, dia] = texto.split("-").map(Number);
    const nombre = formatoDia.format(new Date(Date.UTC(anio, mes - 1, dia)));
    return nombre.charAt(0).toUpperCase() + nombre.slice(1);
}

/* «AAAA-MM-DD» de ayer en hora de Madrid. */
function ayerMadrid() {
    const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
    const [anio, mes, dia] = hoy.split("-").map(Number);
    return new Date(Date.UTC(anio, mes - 1, dia - 1)).toISOString().slice(0, 10);
}

function urlImagen(dia) {
    return `${window.API_BASE || "/api"}/sismologia/helicorder/imagen?dia=${dia}`;
}


export async function montarHelicorder(raiz) {
    const turno = prepararRaiz(raiz, "sismologia-helicorder");
    aviso(raiz, "Buscando el helicorder…");

    let datos;

    try {
        datos = await pedir("/sismologia/helicorder");
    } catch (error) {
        if (!esVigente(raiz, turno)) return;
        aviso(raiz, "No se ha podido leer el helicorder. Se puede volver a intentar más tarde.", true);
        return;
    }

    if (!esVigente(raiz, turno)) return;
    raiz.textContent = "";

    const estacion = datos.estacion;
    titulo(raiz, "Helicorder", `Helicorder de ${estacion.codigo} · sismograma de 24 horas`);

    if (!datos.dias.length) {
        raiz.appendChild(crear("p", "sis-aviso-texto",
            "Todavía no hay ningún helicorder: el primero sale la mañana siguiente a ponerlo en marcha."));
        return;
    }

    let indice = 0;

    const barra = crear("div", "sis-heli-barra");
    const anterior = crear("button", "sis-heli-boton", "‹ Día anterior");
    const siguiente = crear("button", "sis-heli-boton", "Día siguiente ›");
    anterior.type = "button";
    siguiente.type = "button";
    const fecha = crear("strong", "sis-heli-fecha");
    barra.appendChild(anterior);
    barra.appendChild(fecha);
    barra.appendChild(siguiente);
    raiz.appendChild(barra);

    const enlace = crear("a", "sis-heli-marco");
    enlace.target = "_blank";
    enlace.rel = "noopener";
    enlace.title = "Abrir la imagen a tamaño completo";
    const imagen = crear("img", "sis-heli-imagen");
    imagen.decoding = "async";
    enlace.appendChild(imagen);
    raiz.appendChild(enlace);

    const mostrar = () => {
        const dia = datos.dias[indice];
        const url = urlImagen(dia);
        fecha.textContent = dia === ayerMadrid() ? `Ayer, ${nombreDia(dia).toLowerCase()}` : nombreDia(dia);
        imagen.src = url;
        imagen.alt = `Helicorder de la estación ${estacion.codigo} del ${nombreDia(dia).toLowerCase()}: señal sísmica de 24 horas en líneas de media hora.`;
        enlace.href = url;
        // Los días van del más reciente al más antiguo.
        anterior.disabled = indice >= datos.dias.length - 1;
        siguiente.disabled = indice === 0;
    };

    anterior.addEventListener("click", () => { if (indice < datos.dias.length - 1) { indice += 1; mostrar(); } });
    siguiente.addEventListener("click", () => { if (indice > 0) { indice -= 1; mostrar(); } });
    imagen.addEventListener("error", () => { imagen.alt = "No se ha podido cargar la imagen de este día."; });

    mostrar();

    raiz.appendChild(crear("p", "sis-heli-ayuda",
        `Cada línea es media hora de señal: se lee de izquierda a derecha y de arriba abajo, `
        + `con la hora de Madrid a la izquierda. El trazo tranquilo es el ruido de fondo; `
        + `un terremoto se ve como un paquete de ondas que crece y se apaga, y si es fuerte `
        + `se sale de su línea. Van marcados los terremotos cercanos de ese día.`));

    pie(raiz, `Estación ${estacion.red}.${estacion.codigo} de la Red Sísmica Nacional (IGN), a `
        + `${kilometros(estacion.distancia_km)} de Archidona · señal vertical filtrada `
        + `${datos.filtro_hz.join("–").replace(/\./g, ",")} Hz · el IGN publica cada día ya cerrado`);
}


/* Fin de fichero: js/sismologia/helicorder.js */
