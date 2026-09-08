/*
============================================================
TARJETAS DE ESTACIÓN (IDs DINÁMICOS)
============================================================

Una única plantilla (tarjeta-estacion.html) se rellena una
vez por cada estación de CONFIG_ESTACIONES, sustituyendo
{{CODIGO}}, {{NOMBRE}}, {{NOMBRE_LEGIBLE}} y {{LOCALIDAD}}.

Así los ids como "temperatura-EL_SILO" o "veleta-LOS_LLANOS"
se generan en tiempo de ejecución en vez de estar duplicados
a mano en el HTML.
============================================================
*/

const CONFIG_ESTACIONES = [
    {
        codigo: "EL_SILO",
        nombre: "EL SILO",
        nombreLegible: "El Silo",
        localidad: "Archidona",
    },

    {
        codigo: "LOS_LLANOS",
        nombre: "LOS LLANOS",
        nombreLegible: "Los Llanos",
        localidad: "Villanueva del Trabuco",
    },
];

function rellenarPlantillaEstacion(plantilla, estacion) {
    return plantilla
        .replaceAll("{{CODIGO}}", estacion.codigo)
        .replaceAll("{{NOMBRE_LEGIBLE}}", estacion.nombreLegible)
        .replaceAll("{{NOMBRE}}", estacion.nombre)
        .replaceAll("{{LOCALIDAD}}", estacion.localidad);
}

async function cargarTarjetasEstacion() {
    const contenedor = document.querySelector("#estaciones-contenedor");

    if (!contenedor) {
        return;
    }

    try {
        const respuesta = await fetch("../componentes/tarjeta-estacion.html", {
            cache: "no-store",
        });

        if (!respuesta.ok) {
            throw new Error(`HTTP ${respuesta.status}`);
        }

        const plantilla = await respuesta.text();

        const html = CONFIG_ESTACIONES.map((estacion) =>
            rellenarPlantillaEstacion(plantilla, estacion),
        ).join("\n");

        contenedor.outerHTML = html;
    } catch (error) {
        console.error("Error cargando tarjetas de estación:", error);
    }
}
