/*
 * MeteoArchidona · Fauna y Flora · portada
 *
 * La portada de «Fauna y Flora» (José, 25-11-2026), pública:
 *
 *   - «Ahora en el campo»: lluvia del año agrícola y del mes, temperatura y
 *     humedad de El Silo (GET /condiciones-actuales/EL_SILO) y, solo para
 *     quien puede ver Orquídeas, cuántas están en flor este mes
 *     (GET /orquideas/resumen, privada: si responde 401 o 403 no sale).
 *   - «Calendario de la naturaleza»: lo que suele pasar cada mes en la
 *     comarca con las orquídeas, las aves y las setas. Arranca en el mes
 *     actual y se puede ir mes a mes.
 *
 * Las tarjetas de las secciones son HTML fijo de pages/fauna-flora.html.
 */

import {montarMarcoFaunaFlora} from "./marco.js?v=20261125-fauna1";


const ESTACION = "EL_SILO";

const MESES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
];

/* Lo que suele pasar cada mes en la comarca (orientativo; varía con el año). */
const CALENDARIO = [
    {
        orquideas: "Rosetas de hojas a ras de suelo; en los inviernos templados abre la orquídea gigante.",
        aves: "Pleno invierno: grullas en las campiñas, zorzales y estorninos en los olivares.",
        setas: "Si no hiela fuerte, aún salen en pinares y encinares."
    },
    {
        orquideas: "Primeras flores: la orquídea gigante y las primeras Ophrys en las solanas.",
        aves: "Vuelven las cigüeñas a sus nidos y llegan las primeras golondrinas.",
        setas: "Pocas; alguna temprana si llueve."
    },
    {
        orquideas: "Arranca la temporada: Ophrys, Anacamptis y Orchis en flor.",
        aves: "Paso de primavera: golondrinas, aviones y las primeras rapaces migratorias.",
        setas: "Con lluvia, primeras setas de primavera."
    },
    {
        orquideas: "El mes con más orquídeas en flor de todo el año.",
        aves: "Llegan abejarucos, vencejos y oropéndolas; celo y cantos por todas partes.",
        setas: "Con lluvia, setas de primavera en prados y bajo los árboles."
    },
    {
        orquideas: "Últimas Ophrys y Serapias; en las sierras altas, Cephalanthera y Dactylorhiza.",
        aves: "Cría en plena actividad: las mejores semanas para escuchar el canto al amanecer.",
        setas: "Se acaban con el calor."
    },
    {
        orquideas: "Quedan las de sierra y las de ribera; las de llano ya dan semilla.",
        aves: "Pollos en los nidos; vencejos y abejarucos cazando insectos.",
        setas: "Fuera de temporada."
    },
    {
        orquideas: "Descanso bajo tierra; solo alguna Epipactis en sitios frescos.",
        aves: "Con el calor, más actividad al amanecer y al atardecer, cerca del agua.",
        setas: "Fuera de temporada."
    },
    {
        orquideas: "Descanso bajo tierra.",
        aves: "Empieza el paso de vuelta hacia el Estrecho: abejarucos y rapaces.",
        setas: "Fuera de temporada, salvo tras alguna tormenta."
    },
    {
        orquideas: "Descanso; con las primeras lluvias despiertan los tubérculos.",
        aves: "Paso migratorio hacia África en su momento más fuerte.",
        setas: "Las primeras lluvias de otoño preparan el suelo."
    },
    {
        orquideas: "Brotan las primeras rosetas tras las lluvias.",
        aves: "Se van las de verano y llegan las que pasan aquí el invierno.",
        setas: "Arranca la temporada si ha llovido: níscalos en los pinares y setas de cardo."
    },
    {
        orquideas: "Brotan las rosetas de hojas.",
        aves: "Llegan las invernantes: grullas en las campiñas y zorzales en los olivares.",
        setas: "Plena temporada si llovió en octubre."
    },
    {
        orquideas: "Las rosetas crecen; la lluvia de otoño e invierno decide cómo será la floración.",
        aves: "Invierno: bandos de grullas, zorzales, pinzones y lavanderas.",
        setas: "Siguen si las heladas no son fuertes."
    }
];


function base() {
    return window.API_BASE || "/api";
}

async function pedir(ruta) {
    const respuesta = await fetch(`${base()}${ruta}`, { credentials: "same-origin", cache: "no-store" });
    if (!respuesta.ok) {
        const error = new Error(`HTTP ${respuesta.status}`);
        error.estado = respuesta.status;
        throw error;
    }
    return respuesta.json();
}

function crear(etiqueta, clase, texto) {
    const nodo = document.createElement(etiqueta);
    if (clase) nodo.className = clase;
    if (texto !== undefined && texto !== null) nodo.textContent = texto;
    return nodo;
}

const FORMATO = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });

function cifra(valor, unidad) {
    return Number.isFinite(valor) ? `${FORMATO.format(valor)} ${unidad}` : "—";
}

function dato(etiqueta, valor, tono) {
    const caja = crear("div", `ff-dato ff-dato-${tono}`);
    caja.appendChild(crear("span", "ff-dato-etiqueta", etiqueta));
    caja.appendChild(crear("strong", "ff-dato-valor", valor));
    return caja;
}


/* ------------------------------------------------------------
   Ahora en el campo
   ------------------------------------------------------------ */

async function pintarCampo() {
    const rejilla = document.getElementById("ff-campo");
    const nota = document.getElementById("ff-campo-nota");
    if (!rejilla) return;

    const [estacion, orquideas] = await Promise.allSettled([
        pedir(`/condiciones-actuales/${ESTACION}`),
        pedir("/orquideas/resumen")
    ]);

    rejilla.replaceChildren();

    if (estacion.status === "fulfilled") {
        const datos = estacion.value;
        rejilla.append(
            dato("Lluvia desde el 1 de septiembre", cifra(datos.lluvia_anio_agricola_mm, "l/m²"), "agua"),
            dato(`Lluvia en ${MESES[new Date().getMonth()]}`, cifra(datos.lluvia_mes_mm, "l/m²"), "agua"),
            dato("Temperatura ahora", cifra(datos.temperatura_c, "°C"), "campo"),
            dato("Humedad", cifra(datos.humedad_pct, "%"), "campo")
        );
        if (nota) {
            nota.textContent = datos.hora_observacion
                ? `Estación de El Silo, dato de las ${datos.hora_observacion}.`
                : "Estación de El Silo.";
        }
    } else {
        rejilla.appendChild(crear("p", "ff-aviso", "No se han podido leer los datos de la estación. Prueba dentro de un rato."));
    }

    // Solo para quien ve Orquídeas: a los demás la API les dice 401 o 403 y no sale nada.
    if (orquideas.status === "fulfilled" && orquideas.value.observaciones) {
        rejilla.appendChild(dato(
            `Orquídeas en flor en ${MESES[orquideas.value.mes - 1]}`,
            `${orquideas.value.en_flor} especies`,
            "orquidea"
        ));
    }
}


/* ------------------------------------------------------------
   Calendario de la naturaleza
   ------------------------------------------------------------ */

function montarCalendario() {
    const titulo = document.getElementById("ff-calendario-mes");
    const cuerpo = document.getElementById("ff-calendario");
    const anterior = document.getElementById("ff-calendario-anterior");
    const siguiente = document.getElementById("ff-calendario-siguiente");
    if (!titulo || !cuerpo) return;

    let mes = new Date().getMonth();

    const grupos = [
        ["orquideas", "Orquídeas"],
        ["aves", "Aves"],
        ["setas", "Setas"]
    ];

    function pintar() {
        titulo.textContent = MESES[mes].charAt(0).toUpperCase() + MESES[mes].slice(1);
        cuerpo.replaceChildren();
        for (const [clave, nombre] of grupos) {
            const tarjeta = crear("div", `ff-mes ff-mes-${clave}`);
            tarjeta.appendChild(crear("strong", "ff-mes-titulo", nombre));
            tarjeta.appendChild(crear("span", "ff-mes-texto", CALENDARIO[mes][clave]));
            cuerpo.appendChild(tarjeta);
        }
    }

    anterior?.addEventListener("click", () => { mes = (mes + 11) % 12; pintar(); });
    siguiente?.addEventListener("click", () => { mes = (mes + 1) % 12; pintar(); });
    pintar();
}


async function arrancar() {
    await montarMarcoFaunaFlora();
    montarCalendario();
    await pintarCampo();
}


void arrancar();


/* Fin de fichero: js/fauna-flora/portada.js */
