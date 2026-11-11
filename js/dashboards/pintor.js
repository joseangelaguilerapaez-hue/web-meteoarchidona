/*
 * MeteoArchidona · Dashboards · pintor
 *
 * Monta un dashboard (docs/dashboards.md de la API) en un contenedor: una
 * fila por cada fila de la rejilla, de una o dos columnas, y en cada
 * recuadro su componente con sus parámetros como atributos data-*. Es el
 * mismo para Actualidad y para las pestañas de «Mi web» (José, 5-11-2026).
 *
 *     import {pintarDashboard} from "/js/dashboards/pintor.js?v=…";
 *     await pintarDashboard(contenedor, dashboard);
 *
 * `dashboard` es lo que devuelve la API (GET /dashboards/actualidad,
 * /dashboards/{id}…): {titulo, descripcion, formato, filas: [{orden,
 * columnas, primera: {etiqueta, parametros}, segunda}]}.
 *
 * Cada componente se carga solo cuando hace falta (import dinámico) y con
 * la misma versión que en su página, para aprovechar la caché. Un
 * componente que falla no tira el resto: deja un aviso en su recuadro.
 * Un recuadro vacío (el «+» del editor) no se pinta, pero guarda su sitio
 * en una fila de dos.
 */

/* data-componente → [módulo, función de montaje] */
const COMPONENTES = {
    // Comunes
    "contador-visitas": ["/js/componentes/contador-visitas.js?v=20261106-contador5", "montarContadorVisitas"],
    // Actualidad
    "condiciones-actuales": ["/js/componentes/condiciones-actuales.js?v=20261104-componentes1", "montarCondicionesActuales"],
    "sol-luna": ["/js/componentes/tarjeta-sol-luna.js?v=20261104-componentes1", "montarSolLuna"],
    "prediccion-breve": ["/js/componentes/prediccion-breve.js?v=20261104-componentes1", "montarPrediccionBreve"],
    "accesos": ["/js/componentes/accesos.js?v=20261104-componentes1", "montarAccesos"],
    "ficha-estacion": ["/js/componentes/ficha-estacion.js?v=20261104-componentes1", "montarFichaEstacion"],
    "timelapses": ["/js/componentes/timelapses.js?v=20261104-componentes1", "montarComponenteTimelapses"],
    "estadistica": ["/js/componentes/estadistica.js?v=20261105-componente1", "montarComponenteEstadistica"],
    // En vivo y Estadísticas
    "camaras-en-vivo": ["/js/componentes/camaras-en-vivo.js?v=20261104-componentes1", "montarCamarasEnVivo"],
    "catalogo-estadisticas": ["/js/componentes/catalogo-estadisticas.js?v=20261104-componentes1", "montarCatalogoEstadisticas"],
    // Predicción
    "prediccion-avisos": ["/js/prediccion/avisos.js?v=20261104-componentes1", "montarAvisos"],
    "prediccion-ahora": ["/js/prediccion/ahora.js?v=20261104-componentes1", "montarAhora"],
    "prediccion-presentador": ["/js/prediccion/presentador.js?v=20261104-componentes1", "montarPresentador"],
    "prediccion-hoy": ["/js/prediccion/hoy.js?v=20261104-componentes1", "montarHoy"],
    "prediccion-horas": ["/js/prediccion/horas.js?v=20261104-componentes1", "montarHoras"],
    "prediccion-dias": ["/js/prediccion/dias.js?v=20261104-componentes1", "montarDias"],
    "prediccion-aemet": ["/js/prediccion-aemet.js?v=20261104-componentes1", "montarPrediccionAemet"],
    "modelos-numericos": ["/js/modelos-numericos.js?v=20261103-compartir2", "montarModelosNumericos"],
    "mapas-modelos": ["/js/mapas-modelos.js?v=20261110-t2m1", "montarMapasModelos"],
    // Sol
    "sol-tiempo-espacial": ["/js/sol/tiempo-espacial.js?v=20261104-componentes2", "montarTiempoEspacial"],
    "sol-alertas": ["/js/sol/alertas-solares.js?v=20261104-componentes2", "montarAlertasSolares"],
    "sol-directo": ["/js/sol/sol-directo.js?v=20261104-componentes2", "montarSolDirecto"],
    "sol-indice-kp": ["/js/sol/indice-kp.js?v=20261104-componentes2", "montarIndiceKp"],
    "sol-prevision-noaa": ["/js/sol/prevision-noaa.js?v=20261104-componentes2", "montarPrevisionNoaa"],
    "sol-fulguraciones": ["/js/sol/fulguraciones.js?v=20261104-componentes2", "montarFulguraciones"],
    "sol-coronografos": ["/js/sol/coronografos.js?v=20261104-componentes2", "montarCoronografos"],
    "sol-auroras": ["/js/sol/auroras.js?v=20261104-componentes2", "montarAuroras"],
    // Embalses
    "embalses-resumen": ["/js/embalses/resumen.js?v=20261105-embalses1", "montarResumenEmbalses"],
    "embalses-cuencas": ["/js/embalses/cuencas.js?v=20261105-embalses1", "montarCuencasEmbalses"],
    "embalses-anio-hidrologico": ["/js/embalses/anio-hidrologico.js?v=20261105-embalses1", "montarAnioHidrologico"],
    "embalses-lista": ["/js/embalses/lista.js?v=20261105-embalses1", "montarListaEmbalses"],
    "embalses-ficha": ["/js/embalses/ficha.js?v=20261105-embalses1", "montarFichaEmbalse"],
    "embalses-comarca": ["/js/embalses/comarca.js?v=20261105-embalses1", "montarComarcaEmbalses"],
    // Polen
    "polen-hoy": ["/js/polen/hoy.js?v=20261106-polen1", "montarPolenHoy"],
    "polen-prevision": ["/js/polen/prevision.js?v=20261106-polen1", "montarPolenPrevision"],
    "polen-semana": ["/js/polen/semana.js?v=20261106-polen1", "montarPolenSemana"],
    "polen-serie": ["/js/polen/serie.js?v=20261106-polen1", "montarPolenSerie"],
    "polen-calendario": ["/js/polen/calendario.js?v=20261106-polen1", "montarPolenCalendario"],
    // Calidad del aire y calima
    "calima-aviso": ["/js/calidad-aire/aviso-calima.js?v=20261111-aire1", "montarAvisoCalima"],
    "aire-indice": ["/js/calidad-aire/indice.js?v=20261111-aire1", "montarAireIndice"],
    "aire-dias": ["/js/calidad-aire/dias.js?v=20261111-aire1", "montarAireDias"],
    "aire-horas": ["/js/calidad-aire/horas.js?v=20261111-aire1", "montarAireHoras"],
    "aire-particulas": ["/js/calidad-aire/particulas.js?v=20261111-aire1", "montarAireParticulas"],
    "calima-episodios": ["/js/calidad-aire/episodios.js?v=20261111-aire1", "montarEpisodiosCalima"],
    "aire-divulgacion": ["/js/calidad-aire/divulgacion.js?v=20261111-aire1", "montarAireDivulgacion"],
    // Sismología
    "sismologia-aviso": ["/js/sismologia/aviso.js?v=20261109-heli1", "montarAvisoTerremoto"],
    "sismologia-ultimo": ["/js/sismologia/ultimo.js?v=20261109-heli1", "montarUltimoTerremoto"],
    "sismologia-resumen": ["/js/sismologia/resumen.js?v=20261109-heli1", "montarResumenSismico"],
    "sismologia-mapa": ["/js/sismologia/mapa.js?v=20261109-heli1", "montarMapaTerremotos"],
    "sismologia-lista": ["/js/sismologia/lista.js?v=20261109-heli1", "montarListaTerremotos"],
    "sismologia-estadisticas": ["/js/sismologia/estadisticas.js?v=20261109-heli1", "montarEstadisticasSismicas"],
    "sismologia-helicorder": ["/js/sismologia/helicorder.js?v=20261109-heli1", "montarHelicorder"],
    // El Olivar
    "olivar-aviso": ["/js/olivar/aviso.js?v=20261109-olivar2", "montarAvisoOlivar"],
    "olivar-resumen": ["/js/olivar/resumen.js?v=20261109-olivar2", "montarResumenOlivar"],
    "olivar-frio": ["/js/olivar/frio.js?v=20261109-olivar2", "montarFrioOlivar"],
    "olivar-heladas": ["/js/olivar/heladas.js?v=20261109-olivar2", "montarHeladasOlivar"],
    "olivar-grados-dia": ["/js/olivar/grados-dia.js?v=20261109-olivar2", "montarGradosDiaOlivar"],
    "olivar-balance": ["/js/olivar/balance.js?v=20261109-olivar2", "montarBalanceOlivar"],
    // Luna (astronomía)
    "luna-ahora": ["/js/luna/luna-ahora.js?v=20261111-luna1", "montarLunaAhora"],
    "luna-horario": ["/js/luna/horario.js?v=20261111-luna1", "montarHorarioLuna"],
    "luna-calendario": ["/js/luna/calendario.js?v=20261111-luna1", "montarCalendarioLuna"],
    "luna-distancia": ["/js/luna/distancia.js?v=20261111-luna1", "montarDistanciaLuna"],
    "luna-crepusculos": ["/js/luna/crepusculos.js?v=20261111-luna1", "montarCrepusculos"],
    "luna-planetas-noche": ["/js/luna/planetas-noche.js?v=20261111-luna1", "montarPlanetasNoche"],
    "luna-planetas-ahora": ["/js/luna/planetas-ahora.js?v=20261111-luna1", "montarPlanetasAhora"]
};

const HOJA = "/css/dashboards.css?v=20261105-dashboards1";


export function componentesConocidos() {
    return Object.keys(COMPONENTES);
}


function asegurarHoja() {
    if (document.querySelector('link[rel="stylesheet"][href*="dashboards.css"]')) {
        return;
    }
    const enlace = document.createElement("link");
    enlace.rel = "stylesheet";
    enlace.href = HOJA;
    document.head.appendChild(enlace);
}


function avisar(recuadro, texto) {
    recuadro.textContent = "";
    const aviso = document.createElement("p");
    aviso.className = "dash-aviso";
    aviso.textContent = texto;
    recuadro.appendChild(aviso);
}


async function montarRecuadro(recuadro, datos) {

    const definicion = COMPONENTES[datos.etiqueta];

    if (!definicion) {
        avisar(recuadro, "Este componente no se puede mostrar aquí.");
        return;
    }

    const hueco = document.createElement("div");
    hueco.dataset.componente = datos.etiqueta;

    for (const [nombre, valor] of Object.entries(datos.parametros || {})) {
        if (nombre.startsWith("data-")) {
            hueco.setAttribute(nombre, String(valor));
        }
    }

    recuadro.appendChild(hueco);

    try {
        const [ruta, funcion] = definicion;
        const modulo = await import(ruta);
        await modulo[funcion](hueco);
    } catch (error) {
        console.error(`Dashboard: no se pudo montar ${datos.etiqueta}`, error);
        avisar(recuadro, "No se ha podido cargar este componente.");
    }
}


export async function pintarDashboard(contenedor, dashboard) {

    asegurarHoja();

    const rejilla = document.createElement("div");
    rejilla.className = "dash-rejilla";
    rejilla.dataset.formato = dashboard.formato || "";

    // En la página antes de montar nada: hay componentes que buscan o miden
    // sus elementos al arrancar.
    contenedor.appendChild(rejilla);

    const pendientes = [];

    for (const fila of dashboard.filas || []) {
        const recuadros = fila.columnas === 2 ? [fila.primera, fila.segunda] : [fila.primera];

        // Una fila sin ningún componente no ocupa sitio.
        if (!recuadros.some(datos => datos && datos.etiqueta)) {
            continue;
        }

        const elemento = document.createElement("div");
        elemento.className = `dash-fila dash-fila-${fila.columnas === 2 ? 2 : 1}`;
        rejilla.appendChild(elemento);

        for (const datos of recuadros) {
            const recuadro = document.createElement("div");
            recuadro.className = "dash-recuadro";
            elemento.appendChild(recuadro);

            if (datos && datos.etiqueta) {
                pendientes.push(montarRecuadro(recuadro, datos));
            } else {
                recuadro.classList.add("dash-recuadro-vacio");
            }
        }
    }

    await Promise.allSettled(pendientes);

    return rejilla;
}


/* Fin de fichero: js/dashboards/pintor.js */
