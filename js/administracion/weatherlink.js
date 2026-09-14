/*
 * MeteoArchidona
 * Administración
 *
 * Diagnóstico administrativo de WeatherLink.
 *
 * Responsabilidades:
 *
 * - consultar estaciones WeatherLink;
 * - consultar condiciones actuales;
 * - consultar histórico de 24 horas;
 * - mostrar los datos meteorológicos básicos;
 * - descargar el histórico recibido como JSON.
 *
 * Este módulo todavía no sustituye al código equivalente de
 * js/administracion.js. La conexión definitiva se realizará desde
 * principal.js cuando todos los módulos estén preparados.
 */


import {
    $,
    estadoAdministracion,
    mostrarEstado,
    formatearValor
} from "./estado.js";

import {
    RUTA_WEATHERLINK,
    peticionJson
} from "./api.js";


/* ==========================================================
   UTILIDADES DE DATOS WEATHERLINK
   ========================================================== */

function buscarValor(
    objeto,
    nombres
){

    if(
        objeto===null
        ||
        typeof objeto
        !==
        "object"
    ){
        return null
    }

    for(
        const nombre
        of
        nombres
    ){
        if(
            Object.prototype
                .hasOwnProperty
                .call(
                    objeto,
                    nombre
                )
            &&
            objeto[nombre]!==null
            &&
            objeto[nombre]!==undefined
        ){
            return objeto[nombre]
        }
    }

    for(
        const valor
        of
        Object.values(
            objeto
        )
    ){
        const resultado=
            buscarValor(
                valor,
                nombres
            );

        if(resultado!==null){
            return resultado
        }
    }

    return null
}


function fAC(
    valor
){

    const numero=
        Number(
            valor
        );

    return Number.isFinite(
        numero
    )
    ?
    (
        numero-32
    )
    *
    5
    /
    9
    :
    null
}


function mphAKmh(
    valor
){

    const numero=
        Number(
            valor
        );

    return Number.isFinite(
        numero
    )
    ?
    numero*1.609344
    :
    null
}


function inHgAHpa(
    valor
){

    const numero=
        Number(
            valor
        );

    return Number.isFinite(
        numero
    )
    ?
    numero*33.8638866667
    :
    null
}


/* ==========================================================
   TARJETAS DE CONDICIONES
   ========================================================== */

function tarjetaMeteo(
    titulo,
    valor
){

    const tarjeta=
        document.createElement(
            "div"
        );

    tarjeta.className=
        "tarjeta";

    const etiqueta=
        document.createElement(
            "div"
        );

    etiqueta.className=
        "tarjeta-etiqueta";

    etiqueta.textContent=
        titulo;

    const dato=
        document.createElement(
            "div"
        );

    dato.className=
        "tarjeta-valor";

    dato.textContent=
        valor;

    tarjeta.append(
        etiqueta,
        dato
    );

    return tarjeta
}


function mostrarCondicionesWeatherlink(
    datos
){

    const contenedor=
        $("tarjetasWeatherlink");

    if(!contenedor){
        return
    }

    contenedor.replaceChildren();

    const temperatura=
        buscarValor(
            datos,
            [
                "temp",
                "temp_out",
                "temperature"
            ]
        );

    const humedad=
        buscarValor(
            datos,
            [
                "hum",
                "hum_out",
                "humidity"
            ]
        );

    const presion=
        buscarValor(
            datos,
            [
                "bar_sea_level",
                "bar_absolute",
                "bar"
            ]
        );

    const viento=
        buscarValor(
            datos,
            [
                "wind_speed_last",
                "wind_speed",
                "wind_speed_avg_last_2_min"
            ]
        );

    const lluvia=
        buscarValor(
            datos,
            [
                "rain_rate_last",
                "rain_rate"
            ]
        );

    const solar=
        buscarValor(
            datos,
            [
                "solar_rad",
                "solar_radiation"
            ]
        );

    const uv=
        buscarValor(
            datos,
            [
                "uv_index",
                "uv"
            ]
        );

    const bateria=
        buscarValor(
            datos,
            [
                "battery_percent"
            ]
        );

    const temperaturaC=
        temperatura===null
        ?
        null
        :
        fAC(
            temperatura
        );

    const presionHpa=
        presion===null
        ?
        null
        :
        inHgAHpa(
            presion
        );

    const vientoKmh=
        viento===null
        ?
        null
        :
        mphAKmh(
            viento
        );

    const valores=[
        [
            "Temperatura",
            temperaturaC===null
            ?
            "—"
            :
            `${
                temperaturaC.toFixed(
                    1
                )
            } °C`
        ],

        [
            "Humedad",
            humedad===null
            ?
            "—"
            :
            `${
                Number(
                    humedad
                ).toFixed(
                    0
                )
            } %`
        ],

        [
            "Presión",
            presionHpa===null
            ?
            "—"
            :
            `${
                presionHpa.toFixed(
                    1
                )
            } hPa`
        ],

        [
            "Viento",
            vientoKmh===null
            ?
            "—"
            :
            `${
                vientoKmh.toFixed(
                    1
                )
            } km/h`
        ],

        [
            "Lluvia",
            lluvia===null
            ?
            "—"
            :
            `${lluvia} in/h`
        ],

        [
            "Radiación",
            solar===null
            ?
            "—"
            :
            `${solar} W/m²`
        ],

        [
            "UV",
            formatearValor(
                uv
            )
        ],

        [
            "Batería",
            bateria===null
            ?
            "—"
            :
            `${bateria} %`
        ]
    ];

    valores.forEach(
        (
            [
                titulo,
                valor
            ]
        )=>
            contenedor.appendChild(
                tarjetaMeteo(
                    titulo,
                    valor
                )
            )
    );

    if($("jsonWeatherlinkCondiciones")){

        $("jsonWeatherlinkCondiciones")
            .textContent=
                JSON.stringify(
                    datos,
                    null,
                    2
                )
    }

    $("panelWeatherlinkCondiciones")
        ?.classList
        .remove(
            "oculto"
        )
}


/* ==========================================================
   STATION ID
   ========================================================== */

function stationIdWeatherlink(){

    const stationId=
        Number(
            $("weatherlinkStationId")
                ?.value
        );

    if(
        !Number.isInteger(
            stationId
        )
        ||
        stationId<=0
    ){
        throw new Error(
            "Indica un station_id válido."
        )
    }

    return stationId
}


/* ==========================================================
   LISTADO DE ESTACIONES WEATHERLINK
   ========================================================== */

export async function consultarEstacionesWeatherlink(){

    const boton=
        $("botonWeatherlinkEstaciones");

    const estadoElemento=
        $("estadoWeatherlink");

    if(boton){

        boton.disabled=
            true
    }

    mostrarEstado(
        estadoElemento,
        "Consultando WeatherLink...",
        "info"
    );

    try{

        const datos=
            await peticionJson(
                RUTA_WEATHERLINK
                +
                "/estaciones"
            );

        const estacionesWeatherlink=
            datos.weatherlink
                ?.stations
            ||
            [];

        const cuerpo=
            $("tablaWeatherlinkEstaciones");

        cuerpo?.replaceChildren();

        estacionesWeatherlink.forEach(
            estacion=>{

                const fila=
                    document.createElement(
                        "tr"
                    );

                [
                    estacion.station_id,
                    estacion.station_name,
                    estacion.time_zone,
                    estacion.private
                ].forEach(
                    valor=>{

                        const celda=
                            document.createElement(
                                "td"
                            );

                        celda.textContent=
                            formatearValor(
                                valor
                            );

                        fila.appendChild(
                            celda
                        )
                    }
                );

                const celdaAccion=
                    document.createElement(
                        "td"
                    );

                const usar=
                    document.createElement(
                        "button"
                    );

                usar.type=
                    "button";

                usar.className=
                    "boton boton-secundario boton-mini";

                usar.textContent=
                    "Usar";

                usar.addEventListener(
                    "click",
                    ()=>{

                        if(
                            $("weatherlinkStationId")
                        ){
                            $("weatherlinkStationId").value=
                                estacion.station_id
                        }

                        void consultarCondicionesWeatherlink()
                    }
                );

                celdaAccion.appendChild(
                    usar
                );

                fila.appendChild(
                    celdaAccion
                );

                cuerpo?.appendChild(
                    fila
                )
            }
        );

        if($("jsonWeatherlinkEstaciones")){

            $("jsonWeatherlinkEstaciones")
                .textContent=
                    JSON.stringify(
                        datos,
                        null,
                        2
                    )
        }

        $("panelWeatherlinkEstaciones")
            ?.classList
            .remove(
                "oculto"
            );

        mostrarEstado(
            estadoElemento,
            `${
                estacionesWeatherlink.length
            } estaciones obtenidas.`,
            "ok"
        );

        return estacionesWeatherlink

    }catch(error){

        mostrarEstado(
            estadoElemento,
            error.message,
            "error"
        );

        throw error

    }finally{

        if(boton){

            boton.disabled=
                false
        }
    }
}


/* ==========================================================
   CONDICIONES ACTUALES WEATHERLINK
   ========================================================== */

export async function consultarCondicionesWeatherlink(){

    const estadoElemento=
        $("estadoWeatherlinkEstacion");

    mostrarEstado(
        estadoElemento,
        "Consultando condiciones...",
        "info"
    );

    try{

        const stationId=
            stationIdWeatherlink();

        const datos=
            await peticionJson(
                `${
                    RUTA_WEATHERLINK
                }/condiciones/${
                    stationId
                }`
            );

        mostrarCondicionesWeatherlink(
            datos
        );

        mostrarEstado(
            estadoElemento,
            "Condiciones obtenidas correctamente.",
            "ok"
        );

        return datos

    }catch(error){

        mostrarEstado(
            estadoElemento,
            error.message,
            "error"
        );

        throw error
    }
}


/* ==========================================================
   HISTÓRICO WEATHERLINK
   ========================================================== */

export async function consultarHistoricoWeatherlink(){

    const estadoElemento=
        $("estadoWeatherlinkEstacion");

    mostrarEstado(
        estadoElemento,
        "Consultando histórico de 24 horas...",
        "info"
    );

    try{

        const stationId=
            stationIdWeatherlink();

        const datos=
            await peticionJson(
                `${
                    RUTA_WEATHERLINK
                }/historico/${
                    stationId
                }`
            );

        estadoAdministracion
            .historicoWeatherlinkActual=
                datos;

        if($("jsonWeatherlinkHistorico")){

            $("jsonWeatherlinkHistorico")
                .textContent=
                    JSON.stringify(
                        datos,
                        null,
                        2
                    )
        }

        const registros=
            datos.weatherlink
                ?.sensors
                ?.length
            ??
            datos.weatherlink
                ?.data
                ?.length
            ??
            "—";

        if($("resumenWeatherlinkHistorico")){

            $("resumenWeatherlinkHistorico")
                .textContent=
                    `station_id ${
                        stationId
                    } · respuesta recibida · colecciones detectadas: ${
                        registros
                    }`
        }

        $("panelWeatherlinkHistorico")
            ?.classList
            .remove(
                "oculto"
            );

        mostrarEstado(
            estadoElemento,
            "Histórico obtenido correctamente.",
            "ok"
        );

        return datos

    }catch(error){

        mostrarEstado(
            estadoElemento,
            error.message,
            "error"
        );

        throw error
    }
}


/* ==========================================================
   DESCARGA DEL HISTÓRICO
   ========================================================== */

export function descargarHistorico(){

    if(
        !estadoAdministracion
            .historicoWeatherlinkActual
    ){
        return
    }

    const blob=
        new Blob(
            [
                JSON.stringify(
                    estadoAdministracion
                        .historicoWeatherlinkActual,
                    null,
                    2
                )
            ],
            {
                type:"application/json"
            }
        );

    const url=
        URL.createObjectURL(
            blob
        );

    const enlace=
        document.createElement(
            "a"
        );

    enlace.href=
        url;

    enlace.download=
        `weatherlink-historico-${
            $("weatherlinkStationId")
                ?.value
            ||
            "estacion"
        }.json`;

    document.body.appendChild(
        enlace
    );

    enlace.click();

    enlace.remove();

    URL.revokeObjectURL(
        url
    )
}


/* ==========================================================
   LIMPIEZA
   ========================================================== */

export function limpiarWeatherlink(){

    estadoAdministracion
        .historicoWeatherlinkActual=
            null;

    $("panelWeatherlinkEstaciones")
        ?.classList
        .add(
            "oculto"
        );

    $("panelWeatherlinkCondiciones")
        ?.classList
        .add(
            "oculto"
        );

    $("panelWeatherlinkHistorico")
        ?.classList
        .add(
            "oculto"
        );

    if($("tablaWeatherlinkEstaciones")){

        $("tablaWeatherlinkEstaciones")
            .replaceChildren()
    }

    if($("tarjetasWeatherlink")){

        $("tarjetasWeatherlink")
            .replaceChildren()
    }

    if($("jsonWeatherlinkEstaciones")){

        $("jsonWeatherlinkEstaciones")
            .textContent=
                ""
    }

    if($("jsonWeatherlinkCondiciones")){

        $("jsonWeatherlinkCondiciones")
            .textContent=
                ""
    }

    if($("jsonWeatherlinkHistorico")){

        $("jsonWeatherlinkHistorico")
            .textContent=
                ""
    }

    if($("resumenWeatherlinkHistorico")){

        $("resumenWeatherlinkHistorico")
            .textContent=
                ""
    }

    mostrarEstado(
        $("estadoWeatherlink"),
        ""
    );

    mostrarEstado(
        $("estadoWeatherlinkEstacion"),
        ""
    )
}


/* ==========================================================
   EVENTOS
   ========================================================== */

export function configurarEventosWeatherlink(){

    $("botonWeatherlinkEstaciones")
        ?.addEventListener(
            "click",
            ()=>
                void consultarEstacionesWeatherlink()
        );

    $("botonWeatherlinkCondiciones")
        ?.addEventListener(
            "click",
            ()=>
                void consultarCondicionesWeatherlink()
        );

    $("botonWeatherlinkHistorico")
        ?.addEventListener(
            "click",
            ()=>
                void consultarHistoricoWeatherlink()
        );

    $("botonDescargarHistorico")
        ?.addEventListener(
            "click",
            descargarHistorico
        )
}


// Fin de fichero: js/administracion/weatherlink.js