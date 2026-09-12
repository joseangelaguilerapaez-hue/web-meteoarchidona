"use strict";

/*
 * MeteoArchidona
 * Actualidad
 *
 * Lógica exclusiva de:
 *
 *     pages/actualidad.html
 *
 * Responsabilidades:
 *
 * - consultar las condiciones actuales de las estaciones;
 * - representar temperatura, humedad, presión, radiación y UV;
 * - representar viento y dirección;
 * - representar lluvia actual y acumulados;
 * - gestionar la animación visual de lluvia;
 * - gestionar gotas sobre el cristal;
 * - permitir la simulación visual manual de lluvia;
 * - gestionar los controles de patrocinio;
 * - actualizar periódicamente los datos meteorológicos.
 *
 * No pertenece a este fichero:
 *
 * - el reloj general de MeteoArchidona;
 * - la fecha general;
 * - la navegación principal;
 * - el cambio entre pestañas;
 * - la carga de Observaciones;
 * - la carga de En vivo.
 */


const API_BASE =
    "https://api-meteoarchidona.onrender.com";


const CODIGOS_ESTACION = [
    "EL_SILO",
    "LOS_LLANOS"
];


const NOMBRES_NIVEL_LLUVIA = {
    0: "Sin lluvia",
    1: "Débil",
    2: "Moderada",
    3: "Fuerte",
    4: "Muy fuerte"
};


const lluviaReal = {
    EL_SILO: 0,
    LOS_LLANOS: 0
};


const lluviaSimulada = {
    EL_SILO: 0,
    LOS_LLANOS: 0,
    GLOBAL: 0
};


const vientoEstacion = {
    EL_SILO: {
        direccion: null,
        velocidad: 0
    },

    LOS_LLANOS: {
        direccion: null,
        velocidad: 0
    }
};


/* ==========================================================
   UTILIDADES DOM
   ========================================================== */


function obtenerElemento(
    id
) {
    return document.getElementById(
        id
    );
}


function asignarTexto(
    id,
    texto
) {
    const elemento =
        obtenerElemento(
            id
        );

    if (elemento) {
        elemento.textContent =
            texto;
    }
}


function asignarHtml(
    id,
    html
) {
    const elemento =
        obtenerElemento(
            id
        );

    if (elemento) {
        elemento.innerHTML =
            html;
    }
}


function formatearNumero(
    valor,
    decimales = 1
) {
    if (
        valor === null
        ||
        valor === undefined
        ||
        Number.isNaN(
            Number(
                valor
            )
        )
    ) {
        return "--";
    }

    return Number(
        valor
    ).toFixed(
        decimales
    );
}


function limitar(
    valor,
    minimo,
    maximo
) {
    return Math.min(
        maximo,
        Math.max(
            minimo,
            valor
        )
    );
}


/* ==========================================================
   VIENTO
   ========================================================== */


function normalizarGrados(
    grados
) {
    if (
        grados === null
        ||
        grados === undefined
        ||
        Number.isNaN(
            Number(
                grados
            )
        )
    ) {
        return null;
    }

    return (
        (
            Number(
                grados
            )
            %
            360
        )
        +
        360
    )
    %
    360;
}


function obtenerDireccionCardinal(
    grados
) {
    const valor =
        normalizarGrados(
            grados
        );

    if (
        valor === null
    ) {
        return "--";
    }

    const direcciones = [
        "N",
        "NNE",
        "NE",
        "ENE",
        "E",
        "ESE",
        "SE",
        "SSE",
        "S",
        "SSO",
        "SO",
        "OSO",
        "O",
        "ONO",
        "NO",
        "NNO"
    ];

    return direcciones[
        Math.round(
            valor
            /
            22.5
        )
        %
        16
    ];
}


function actualizarVeleta(
    codigo,
    grados
) {
    const valor =
        normalizarGrados(
            grados
        );

    const veleta =
        obtenerElemento(
            `veleta-${codigo}`
        );

    if (
        valor === null
    ) {
        asignarTexto(
            `direccion-${codigo}`,
            "--"
        );

        asignarTexto(
            `grados-${codigo}`,
            "--°"
        );

        if (
            veleta
        ) {
            veleta.style.setProperty(
                "--angulo",
                "0deg"
            );
        }

        return;
    }

    asignarTexto(
        `direccion-${codigo}`,
        obtenerDireccionCardinal(
            valor
        )
    );

    asignarTexto(
        `grados-${codigo}`,
        `${Math.round(valor)}°`
    );

    if (
        veleta
    ) {
        veleta.style.setProperty(
            "--angulo",
            `${valor}deg`
        );
    }
}


function calcularMovimientoViento(
    direccionMeteorologica,
    velocidadKmh,
    ancho,
    alto
) {
    const direccion =
        normalizarGrados(
            direccionMeteorologica
        );

    const velocidad =
        Number.isFinite(
            Number(
                velocidadKmh
            )
        )
        ?
        Math.max(
            0,
            Number(
                velocidadKmh
            )
        )
        :
        0;

    if (
        direccion === null
    ) {
        return {
            destino: 180,
            vectorX: 0,
            vectorY: 1,
            componenteSur: true,
            inicioX: 0,
            finalX: 0,
            recorridoY: Math.max(
                alto * 1.45,
                500
            ),
            angulo: 0,
            fuerza: 0
        };
    }

    const destino =
        (
            direccion
            +
            180
        )
        %
        360;

    const radianes =
        destino
        *
        Math.PI
        /
        180;

    const vectorX =
        Math.sin(
            radianes
        );

    const vectorY =
        -Math.cos(
            radianes
        );

    const fuerza =
        limitar(
            velocidad
            /
            50,
            0,
            1
        );

    const derivaBase =
        ancho
        *
        (
            0.035
            +
            fuerza
            *
            0.33
        );

    const finalX =
        vectorX
        *
        derivaBase;

    const inicioX =
        -finalX
        *
        0.10;

    const recorridoBase =
        Math.max(
            alto * 1.45,
            500
        );

    const recorridoY =
        recorridoBase
        +
        (
            vectorY
            *
            fuerza
            *
            alto
            *
            0.16
        );

    const angulo =
        Math.atan2(
            finalX,
            Math.max(
                recorridoY,
                1
            )
        )
        *
        180
        /
        Math.PI;

    const componenteSur =
        vectorY
        >
        0.08;

    return {
        destino,
        vectorX,
        vectorY,
        componenteSur,
        inicioX,
        finalX,
        recorridoY,
        angulo,
        fuerza
    };
}


/* ==========================================================
   ÍNDICE UV
   ========================================================== */


function clasificarUv(
    valor
) {
    if (
        valor === null
        ||
        valor === undefined
        ||
        Number.isNaN(
            Number(
                valor
            )
        )
    ) {
        return "--";
    }

    const uv =
        Number(
            valor
        );

    if (
        uv < 3
    ) {
        return "Bajo";
    }

    if (
        uv < 6
    ) {
        return "Moderado";
    }

    if (
        uv < 8
    ) {
        return "Alto";
    }

    if (
        uv < 11
    ) {
        return "Muy alto";
    }

    return "Extremo";
}


/* ==========================================================
   CLASIFICACIÓN DE LLUVIA
   ========================================================== */


function nivelLluviaDesdeTasa(
    tasa
) {
    if (
        tasa === null
        ||
        tasa === undefined
        ||
        Number.isNaN(
            Number(
                tasa
            )
        )
    ) {
        return 0;
    }

    const valor =
        Number(
            tasa
        );

    if (
        valor <= 0
    ) {
        return 0;
    }

    if (
        valor < 0.5
    ) {
        return 1;
    }

    if (
        valor < 2
    ) {
        return 2;
    }

    if (
        valor < 10
    ) {
        return 3;
    }

    return 4;
}


function obtenerIconoLluvia(
    nivel
) {
    if (
        nivel <= 0
    ) {
        return "☁️";
    }

    if (
        nivel === 1
    ) {
        return "🌦️";
    }

    if (
        nivel === 4
    ) {
        return "⛈️";
    }

    return "🌧️";
}


function obtenerNivelEfectivo(
    codigo
) {
    return Math.max(
        lluviaReal[
            codigo
        ]
        ||
        0,

        lluviaSimulada[
            codigo
        ]
        ||
        0
    );
}


/* ==========================================================
   LLUVIA GLOBAL Y VIENTO DOMINANTE
   ========================================================== */


function obtenerEstacionDominante(
    codigos
) {
    let dominante =
        null;

    codigos.forEach(
        codigo => {
            if (
                dominante
                ===
                null
            ) {
                dominante =
                    codigo;

                return;
            }

            const a =
                obtenerNivelEfectivo(
                    codigo
                );

            const b =
                obtenerNivelEfectivo(
                    dominante
                );

            if (
                a > b
            ) {
                dominante =
                    codigo;

                return;
            }

            if (
                a === b
                &&
                (
                    Number(
                        vientoEstacion[
                            codigo
                        ].velocidad
                    )
                    ||
                    0
                )
                >
                (
                    Number(
                        vientoEstacion[
                            dominante
                        ].velocidad
                    )
                    ||
                    0
                )
            ) {
                dominante =
                    codigo;
            }
        }
    );

    return dominante;
}


function obtenerVientoGlobal(
    codigosActivos
) {
    let codigo;

    if (
        codigosActivos.length
        >
        0
    ) {
        codigo =
            obtenerEstacionDominante(
                codigosActivos
            );
    } else {
        codigo =
            CODIGOS_ESTACION.reduce(
                (
                    mejor,
                    actual
                ) => {
                    if (
                        mejor === null
                    ) {
                        return actual;
                    }

                    return (
                        Number(
                            vientoEstacion[
                                actual
                            ].velocidad
                        )
                        ||
                        0
                    )
                    >
                    (
                        Number(
                            vientoEstacion[
                                mejor
                            ].velocidad
                        )
                        ||
                        0
                    )
                    ?
                    actual
                    :
                    mejor;
                },
                null
            );
    }

    if (
        !codigo
    ) {
        return {
            direccion: null,
            velocidad: 0
        };
    }

    return {
        direccion:
            vientoEstacion[
                codigo
            ].direccion,

        velocidad:
            vientoEstacion[
                codigo
            ].velocidad
    };
}


/* ==========================================================
   CAPAS VISUALES DE LLUVIA
   ========================================================== */


function aplicarNivelACapa(
    capa,
    nivel
) {
    if (
        !capa
    ) {
        return;
    }

    capa.classList.remove(
        "activa",
        "nivel-1",
        "nivel-2",
        "nivel-3",
        "nivel-4"
    );

    if (
        nivel > 0
    ) {
        capa.classList.add(
            "activa",
            `nivel-${nivel}`
        );
    }
}


function aplicarVientoACapa(
    capa,
    viento
) {
    if (
        !capa
    ) {
        return null;
    }

    const referencia =
        capa.classList.contains(
            "capa-lluvia-ficha"
        )
        ?
        capa.parentElement
        :
        document.documentElement;

    const ancho =
        referencia?.clientWidth
        ||
        window.innerWidth
        ||
        360;

    const alto =
        referencia?.clientHeight
        ||
        window.innerHeight
        ||
        700;

    const movimiento =
        calcularMovimientoViento(
            viento.direccion,
            viento.velocidad,
            ancho,
            alto
        );

    capa.style.setProperty(
        "--inicio-x",
        `${movimiento.inicioX.toFixed(1)}px`
    );

    capa.style.setProperty(
        "--final-x",
        `${movimiento.finalX.toFixed(1)}px`
    );

    capa.style.setProperty(
        "--recorrido-y",
        `${movimiento.recorridoY.toFixed(1)}px`
    );

    capa.style.setProperty(
        "--angulo-gota",
        `${movimiento.angulo.toFixed(2)}deg`
    );

    return movimiento;
}


function configurarCapaCristal(
    capa,
    nivel,
    movimiento
) {
    if (
        !capa
    ) {
        return;
    }

    capa.dataset.nivel =
        String(
            nivel
        );

    capa.dataset.vectorX =
        movimiento
        ?
        String(
            movimiento.vectorX
        )
        :
        "0";

    capa.classList.remove(
        "activa"
    );

    if (
        nivel > 0
        &&
        movimiento
        &&
        movimiento.componenteSur
    ) {
        capa.classList.add(
            "activa"
        );
    }
}


function actualizarCapaMeteorologica(
    idLluvia,
    idCristal,
    nivel,
    viento
) {
    const capaLluvia =
        obtenerElemento(
            idLluvia
        );

    const capaCristal =
        obtenerElemento(
            idCristal
        );

    aplicarNivelACapa(
        capaLluvia,
        nivel
    );

    configurarCapaCristal(
        capaCristal,
        nivel,
        aplicarVientoACapa(
            capaLluvia,
            viento
        )
    );
}


function actualizarSistemaLluvia() {
    const silo =
        obtenerNivelEfectivo(
            "EL_SILO"
        );

    const llanos =
        obtenerNivelEfectivo(
            "LOS_LLANOS"
        );

    const activos =
        [];

    if (
        silo > 0
    ) {
        activos.push(
            "EL_SILO"
        );
    }

    if (
        llanos > 0
    ) {
        activos.push(
            "LOS_LLANOS"
        );
    }

    let global =
        0;

    let localSilo =
        0;

    let localLlanos =
        0;

    if (
        activos.length
        ===
        2
    ) {
        global =
            Math.max(
                silo,
                llanos
            );
    }

    if (
        activos.length
        ===
        1
    ) {
        if (
            activos[
                0
            ]
            ===
            "EL_SILO"
        ) {
            localSilo =
                silo;
        } else {
            localLlanos =
                llanos;
        }
    }

    global =
        Math.max(
            global,
            lluviaSimulada.GLOBAL
            ||
            0
        );

    actualizarCapaMeteorologica(
        "capa-lluvia-EL_SILO",
        "capa-gotas-cristal-EL_SILO",
        localSilo,
        vientoEstacion.EL_SILO
    );

    actualizarCapaMeteorologica(
        "capa-lluvia-LOS_LLANOS",
        "capa-gotas-cristal-LOS_LLANOS",
        localLlanos,
        vientoEstacion.LOS_LLANOS
    );

    actualizarCapaMeteorologica(
        "capa-lluvia",
        "capa-gotas-cristal",
        global,
        obtenerVientoGlobal(
            activos
        )
    );
}


/* ==========================================================
   SIMULACIÓN MANUAL DE LLUVIA
   ========================================================== */


function actualizarIndicadorSimulacion(
    origen
) {
    const elemento =
        obtenerElemento(
            `simulacion-${origen}`
        );

    if (
        !elemento
    ) {
        return;
    }

    const nivel =
        lluviaSimulada[
            origen
        ]
        ||
        0;

    if (
        nivel <= 0
    ) {
        elemento.classList.remove(
            "visible"
        );

        elemento.textContent =
            "";

        return;
    }

    elemento.textContent =
        origen === "GLOBAL"
        ?
        `Prueba ${NOMBRES_NIVEL_LLUVIA[nivel]}`
        :
        `Prueba lluvia · ${NOMBRES_NIVEL_LLUVIA[nivel]}`;

    elemento.classList.add(
        "visible"
    );
}


function avanzarSimulacion(
    origen
) {
    const actual =
        lluviaSimulada[
            origen
        ]
        ||
        0;

    lluviaSimulada[
        origen
    ] =
        actual <= 0
        ||
        actual >= 4
        ?
        1
        :
        actual + 1;

    actualizarIndicadorSimulacion(
        origen
    );

    actualizarSistemaLluvia();
}


function desactivarSimulacion(
    origen
) {
    lluviaSimulada[
        origen
    ] =
        0;

    actualizarIndicadorSimulacion(
        origen
    );

    actualizarSistemaLluvia();
}


/* ==========================================================
   GOTAS DE LLUVIA
   ========================================================== */


function inicializarGotasEnCapa(
    idCapa,
    totalGotas = 160
) {
    const capa =
        obtenerElemento(
            idCapa
        );

    if (
        !capa
    ) {
        return;
    }

    for (
        let i = 0;
        i < totalGotas;
        i += 1
    ) {
        const gota =
            document.createElement(
                "span"
            );

        gota.className =
            "gota-lluvia";

        gota.style.setProperty(
            "--x",
            `${Math.random() * 116 - 8}%`
        );

        gota.style.setProperty(
            "--longitud",
            `${13 + Math.random() * 27}px`
        );

        gota.style.setProperty(
            "--duracion",
            `${0.58 + Math.random() * 0.42}s`
        );

        gota.style.setProperty(
            "--retraso",
            `${-Math.random() * 2.4}s`
        );

        gota.style.setProperty(
            "--opacidad",
            (
                0.38
                +
                Math.random()
                *
                0.57
            ).toFixed(
                2
            )
        );

        capa.appendChild(
            gota
        );
    }
}


function inicializarLluviaVisual() {
    inicializarGotasEnCapa(
        "capa-lluvia"
    );

    inicializarGotasEnCapa(
        "capa-lluvia-EL_SILO"
    );

    inicializarGotasEnCapa(
        "capa-lluvia-LOS_LLANOS"
    );
}


/* ==========================================================
   GOTAS SOBRE EL CRISTAL
   ========================================================== */


function obtenerMaximoGotasCristal(
    nivel,
    esGlobal
) {
    const globales = {
        1: 4,
        2: 7,
        3: 11,
        4: 16
    };

    const locales = {
        1: 3,
        2: 5,
        3: 8,
        4: 11
    };

    return esGlobal
        ?
        (
            globales[
                nivel
            ]
            ||
            0
        )
        :
        (
            locales[
                nivel
            ]
            ||
            0
        );
}


function obtenerProbabilidadGotaCristal(
    nivel
) {
    return (
        {
            1: 0.16,
            2: 0.34,
            3: 0.62,
            4: 0.88
        }[
            nivel
        ]
        ||
        0
    );
}


function crearGotaCristal(
    capa,
    nivel
) {
    if (
        !capa
        ||
        nivel <= 0
    ) {
        return;
    }

    const esGlobal =
        capa.classList.contains(
            "capa-gotas-cristal"
        );

    const maximo =
        obtenerMaximoGotasCristal(
            nivel,
            esGlobal
        );

    if (
        capa.querySelectorAll(
            ".gota-cristal"
        ).length
        >=
        maximo
    ) {
        return;
    }

    const gota =
        document.createElement(
            "span"
        );

    const base =
        {
            1: 5,
            2: 6,
            3: 7,
            4: 8
        }[
            nivel
        ];

    const rango =
        {
            1: 4,
            2: 6,
            3: 8,
            4: 10
        }[
            nivel
        ];

    const tamano =
        base
        +
        Math.random()
        *
        rango;

    const vida =
        2600
        +
        Math.random()
        *
        3400;

    const opacidad =
        0.15
        +
        Math.random()
        *
        (
            0.06
            +
            nivel
            *
            0.025
        );

    const deslizar =
        8
        +
        nivel
        *
        5
        +
        Math.random()
        *
        14;

    const vectorX =
        Number(
            capa.dataset.vectorX
        )
        ||
        0;

    gota.className =
        "gota-cristal";

    gota.style.setProperty(
        "--x",
        `${4 + Math.random() * 92}%`
    );

    gota.style.setProperty(
        "--y",
        `${4 + Math.random() * 76}%`
    );

    gota.style.setProperty(
        "--tamano",
        `${tamano.toFixed(1)}px`
    );

    gota.style.setProperty(
        "--vida",
        `${Math.round(vida)}ms`
    );

    gota.style.setProperty(
        "--opacidad-cristal",
        opacidad.toFixed(
            2
        )
    );

    gota.style.setProperty(
        "--deslizar",
        `${deslizar.toFixed(1)}px`
    );

    gota.style.setProperty(
        "--desvio-x",
        `${
            (
                vectorX
                *
                (
                    3
                    +
                    nivel
                    *
                    2
                )
            ).toFixed(
                1
            )
        }px`
    );

    capa.appendChild(
        gota
    );

    window.setTimeout(
        () => {
            gota.remove();
        },
        vida
        +
        150
    );
}


function generarGotasCristalActivas() {
    if (
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches
    ) {
        return;
    }

    document.querySelectorAll(
        ".capa-gotas-cristal.activa, .capa-gotas-cristal-ficha.activa"
    ).forEach(
        capa => {
            const nivel =
                Number(
                    capa.dataset.nivel
                )
                ||
                0;

            if (
                nivel <= 0
                ||
                Math.random()
                >
                obtenerProbabilidadGotaCristal(
                    nivel
                )
            ) {
                return;
            }

            const cantidad =
                nivel >= 4
                &&
                Math.random()
                >
                0.48
                ?
                2
                :
                1;

            for (
                let i = 0;
                i < cantidad;
                i += 1
            ) {
                crearGotaCristal(
                    capa,
                    nivel
                );
            }
        }
    );
}


/* ==========================================================
   CONTROLES MANUALES DE LLUVIA
   ========================================================== */


function configurarControlLluvia(
    elemento,
    origen
) {
    let temporizadorLargo =
        null;

    let pulsacionLarga =
        false;

    let ultimoToque =
        0;

    let inicioX =
        0;

    let inicioY =
        0;


    function cancelar() {
        if (
            temporizadorLargo
            !==
            null
        ) {
            clearTimeout(
                temporizadorLargo
            );

            temporizadorLargo =
                null;
        }
    }


    elemento.addEventListener(
        "pointerdown",
        evento => {
            pulsacionLarga =
                false;

            inicioX =
                evento.clientX;

            inicioY =
                evento.clientY;

            cancelar();

            temporizadorLargo =
                setTimeout(
                    () => {
                        pulsacionLarga =
                            true;

                        ultimoToque =
                            0;

                        desactivarSimulacion(
                            origen
                        );
                    },
                    700
                );
        }
    );


    elemento.addEventListener(
        "pointermove",
        evento => {
            if (
                Math.abs(
                    evento.clientX
                    -
                    inicioX
                )
                >
                12
                ||
                Math.abs(
                    evento.clientY
                    -
                    inicioY
                )
                >
                12
            ) {
                cancelar();
            }
        }
    );


    elemento.addEventListener(
        "pointercancel",
        () => {
            cancelar();

            pulsacionLarga =
                false;
        }
    );


    elemento.addEventListener(
        "pointerup",
        evento => {
            cancelar();

            if (
                pulsacionLarga
            ) {
                pulsacionLarga =
                    false;

                return;
            }

            const ahora =
                Date.now();

            if (
                ultimoToque > 0
                &&
                ahora
                -
                ultimoToque
                <
                450
            ) {
                ultimoToque =
                    0;

                avanzarSimulacion(
                    origen
                );

                evento.preventDefault();

                return;
            }

            ultimoToque =
                ahora;
        }
    );


    elemento.addEventListener(
        "contextmenu",
        evento =>
            evento.preventDefault()
    );


    elemento.addEventListener(
        "keydown",
        evento => {
            if (
                evento.key
                ===
                "Enter"
            ) {
                evento.preventDefault();

                avanzarSimulacion(
                    origen
                );
            }

            if (
                evento.key
                ===
                "Escape"
            ) {
                evento.preventDefault();

                desactivarSimulacion(
                    origen
                );
            }
        }
    );
}


function configurarControlesLluvia() {
    document.querySelectorAll(
        "[data-lluvia-control]"
    ).forEach(
        control => {
            if (
                control.dataset
                    .lluviaControl
            ) {
                configurarControlLluvia(
                    control,
                    control.dataset
                        .lluviaControl
                );
            }
        }
    );
}


/* ==========================================================
   PATROCINIOS
   ========================================================== */


function configurarPatrocinios() {
    document.querySelectorAll(
        ".patrocinio-estacion-control"
    ).forEach(
        control => {
            control.addEventListener(
                "click",
                () => {
                    const codigo =
                        control.dataset
                            .patrocinio;

                    const patrocinio =
                        obtenerElemento(
                            `patrocinio-${codigo}`
                        );

                    if (
                        !patrocinio
                    ) {
                        return;
                    }

                    const pausado =
                        patrocinio.classList.toggle(
                            "pausado"
                        );

                    control.textContent =
                        pausado
                        ?
                        "▶"
                        :
                        "Ⅱ";

                    control.setAttribute(
                        "aria-pressed",
                        String(
                            pausado
                        )
                    );

                    control.setAttribute(
                        "aria-label",
                        pausado
                        ?
                        "Reanudar patrocinio"
                        :
                        "Pausar patrocinio"
                    );
                }
            );
        }
    );
}


/* ==========================================================
   REPRESENTACIÓN DE LLUVIA
   ========================================================== */


function mostrarLluvia(
    codigo,
    datos
) {
    const dia =
        formatearNumero(
            datos.lluvia_dia_mm
        );

    const mes =
        formatearNumero(
            datos.lluvia_mes_mm
        );

    const anio =
        formatearNumero(
            datos.lluvia_anio_agricola_mm
        );

    const tasa =
        formatearNumero(
            datos.tasa_lluvia_mm_h
        );

    const nivel =
        nivelLluviaDesdeTasa(
            datos.tasa_lluvia_mm_h
        );

    const icono =
        obtenerIconoLluvia(
            nivel
        );

    lluviaReal[
        codigo
    ] =
        nivel;

    asignarTexto(
        `lluvia-tasa-${codigo}`,
        `${tasa} mm/h`
    );

    asignarTexto(
        `lluvia-dia-${codigo}`,
        `${dia} mm`
    );

    asignarTexto(
        `lluvia-mes-${codigo}`,
        `${mes} mm`
    );

    asignarTexto(
        `lluvia-anio-${codigo}`,
        `${anio} mm`
    );

    asignarTexto(
        `lluvia-estado-${codigo}`,
        NOMBRES_NIVEL_LLUVIA[
            nivel
        ]
    );

    asignarTexto(
        `lluvia-icono-actual-${codigo}`,
        icono
    );

    asignarTexto(
        `lluvia-resumen-icono-dia-${codigo}`,
        icono
    );

    asignarTexto(
        `lluvia-resumen-icono-mes-${codigo}`,
        icono
    );

    asignarTexto(
        `lluvia-resumen-icono-anio-${codigo}`,
        icono
    );

    actualizarSistemaLluvia();
}


/* ==========================================================
   REPRESENTACIÓN DE ESTACIÓN
   ========================================================== */


function mostrarDatosEstacion(
    codigo,
    datos
) {
    asignarTexto(
        `nombre-${codigo}`,
        datos.nombre_estacion
    );

    asignarHtml(
        `temperatura-${codigo}`,
        `${
            formatearNumero(
                datos.temperatura_c
            )
        }<sup>°C</sup>`
    );

    asignarTexto(
        `sensacion-${codigo}`,
        `Sensación ${
            formatearNumero(
                datos.indice_calor_c
            )
        } °C`
    );

    const horaExterior =
        datos.hora_observacion_exterior
        ||
        datos.hora_observacion
        ||
        "--:--";

    const fechaExterior =
        datos.fecha_observacion_exterior
        ||
        datos.fecha_observacion
        ||
        "--";

    const horaBarometro =
        datos.hora_observacion_barometro
        ||
        datos.hora_observacion
        ||
        "--:--";

    asignarTexto(
        `observacion-${codigo}`,
        `Exterior ${horaExterior}`
    );

    asignarTexto(
        `fecha-${codigo}`,
        fechaExterior
    );

    asignarTexto(
        `humedad-${codigo}`,
        `${
            formatearNumero(
                datos.humedad_pct
            )
        } %`
    );

    asignarTexto(
        `rocio-${codigo}`,
        `${
            formatearNumero(
                datos.punto_rocio_c
            )
        } °C`
    );

    asignarTexto(
        `presion-${codigo}`,
        `${
            formatearNumero(
                datos.presion_hpa
            )
        } hPa`
    );

    asignarTexto(
        `presion-hora-${codigo}`,
        `Barómetro ${horaBarometro}`
    );

    asignarTexto(
        `radiacion-${codigo}`,
        `${
            formatearNumero(
                datos.radiacion_solar_w_m2,
                0
            )
        } W/m²`
    );

    asignarTexto(
        `uv-${codigo}`,
        formatearNumero(
            datos.indice_uv
        )
    );

    asignarTexto(
        `uv-estado-${codigo}`,
        clasificarUv(
            datos.indice_uv
        )
    );

    asignarHtml(
        `viento-actual-${codigo}`,
        `${
            formatearNumero(
                datos.viento_actual_kmh
            )
        } <small>km/h</small>`
    );

    asignarTexto(
        `viento-2m-${codigo}`,
        `${
            formatearNumero(
                datos.viento_medio_2_min_kmh
            )
        } km/h`
    );

    asignarTexto(
        `viento-10m-${codigo}`,
        `${
            formatearNumero(
                datos.viento_medio_10_min_kmh
            )
        } km/h`
    );

    asignarTexto(
        `racha-${codigo}`,
        `${
            formatearNumero(
                datos.racha_10_min_kmh
            )
        } km/h`
    );

    vientoEstacion[
        codigo
    ] = {
        direccion:
            normalizarGrados(
                datos.direccion_viento_grados
            ),

        velocidad:
            Number.isFinite(
                Number(
                    datos.viento_actual_kmh
                )
            )
            ?
            Number(
                datos.viento_actual_kmh
            )
            :
            0
    };

    actualizarVeleta(
        codigo,
        datos.direccion_viento_grados
    );

    const estado =
        obtenerElemento(
            `estado-${codigo}`
        );

    if (
        estado
    ) {
        estado.innerHTML =
            '<span class="punto"></span>En línea';
    }

    mostrarLluvia(
        codigo,
        datos
    );
}


/* ==========================================================
   ESTADOS DE ERROR
   ========================================================== */


function mostrarErrorLluvia(
    codigo
) {
    lluviaReal[
        codigo
    ] =
        0;

    asignarTexto(
        `lluvia-tasa-${codigo}`,
        "-- mm/h"
    );

    asignarTexto(
        `lluvia-dia-${codigo}`,
        "-- mm"
    );

    asignarTexto(
        `lluvia-mes-${codigo}`,
        "-- mm"
    );

    asignarTexto(
        `lluvia-anio-${codigo}`,
        "-- mm"
    );

    asignarTexto(
        `lluvia-estado-${codigo}`,
        "--"
    );

    asignarTexto(
        `lluvia-icono-actual-${codigo}`,
        "☁️"
    );

    asignarTexto(
        `lluvia-resumen-icono-dia-${codigo}`,
        "☁️"
    );

    asignarTexto(
        `lluvia-resumen-icono-mes-${codigo}`,
        "☁️"
    );

    asignarTexto(
        `lluvia-resumen-icono-anio-${codigo}`,
        "☁️"
    );

    actualizarSistemaLluvia();
}


function mostrarErrorEstacion(
    codigo
) {
    vientoEstacion[
        codigo
    ] = {
        direccion: null,
        velocidad: 0
    };

    asignarTexto(
        `estado-${codigo}`,
        "Sin datos"
    );

    asignarHtml(
        `temperatura-${codigo}`,
        "--<sup>°C</sup>"
    );

    asignarTexto(
        `sensacion-${codigo}`,
        "Sensación -- °C"
    );

    asignarTexto(
        `observacion-${codigo}`,
        "Exterior --:--"
    );

    asignarTexto(
        `humedad-${codigo}`,
        "-- %"
    );

    asignarTexto(
        `rocio-${codigo}`,
        "-- °C"
    );

    asignarTexto(
        `presion-${codigo}`,
        "-- hPa"
    );

    asignarTexto(
        `presion-hora-${codigo}`,
        "Barómetro --:--"
    );

    asignarTexto(
        `radiacion-${codigo}`,
        "-- W/m²"
    );

    asignarTexto(
        `uv-${codigo}`,
        "--"
    );

    asignarTexto(
        `uv-estado-${codigo}`,
        "--"
    );

    asignarTexto(
        `fecha-${codigo}`,
        "--"
    );

    asignarHtml(
        `viento-actual-${codigo}`,
        '-- <small>km/h</small>'
    );

    asignarTexto(
        `viento-2m-${codigo}`,
        "-- km/h"
    );

    asignarTexto(
        `viento-10m-${codigo}`,
        "-- km/h"
    );

    asignarTexto(
        `racha-${codigo}`,
        "-- km/h"
    );

    actualizarVeleta(
        codigo,
        null
    );

    mostrarErrorLluvia(
        codigo
    );
}


/* ==========================================================
   API METEOARCHIDONA
   ========================================================== */


async function cargarEstacion(
    codigo
) {
    try {
        const respuesta =
            await fetch(
                `${API_BASE}/condiciones-actuales/${codigo}`,
                {
                    cache: "no-store"
                }
            );

        if (
            !respuesta.ok
        ) {
            throw new Error(
                `HTTP ${respuesta.status}`
            );
        }

        const datos =
            await respuesta.json();

        mostrarDatosEstacion(
            codigo,
            datos
        );

    } catch (
        error
    ) {
        console.error(
            `Error cargando ${codigo}:`,
            error
        );

        mostrarErrorEstacion(
            codigo
        );
    }
}


async function cargarCondiciones() {
    await Promise.all(
        [
            cargarEstacion(
                "EL_SILO"
            ),

            cargarEstacion(
                "LOS_LLANOS"
            )
        ]
    );
}


/* ==========================================================
   REDIMENSIONADO
   ========================================================== */


let temporizadorResize =
    null;


window.addEventListener(
    "resize",
    () => {
        if (
            temporizadorResize
            !==
            null
        ) {
            clearTimeout(
                temporizadorResize
            );
        }

        temporizadorResize =
            setTimeout(
                () => {
                    actualizarSistemaLluvia();

                    temporizadorResize =
                        null;
                },
                180
            );
    }
);


/* ==========================================================
   INICIALIZACIÓN
   ========================================================== */


function inicializarActualidad() {
    inicializarLluviaVisual();

    configurarControlesLluvia();

    configurarPatrocinios();

    actualizarSistemaLluvia();

    cargarCondiciones();

    window.setInterval(
        cargarCondiciones,
        60000
    );

    window.setInterval(
        generarGotasCristalActivas,
        420
    );
}


if (
    document.readyState
    ===
    "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        inicializarActualidad,
        {
            once: true
        }
    );
} else {
    inicializarActualidad();
}


// Fin de fichero: js/actualidad.js