# -*- coding: utf-8 -*-

"""
Configura la revalidación de caché del HTML en Nginx.

El fichero de configuración activa de Nginx no pertenece
al repositorio Git de la web.

Este script permite conservar en GitHub el procedimiento
de actualización de dicha configuración.

Modifica exclusivamente los bloques de las páginas:

    location = /
    location = /observaciones
    location = /prediccion
    location = /en-vivo
    location = /informacion
    location = /administracion

para incorporar en cada uno:

    expires -1;

Por qué el HTML y no los recursos:

    El número de versión de las hojas y los scripts viaja
    dentro del HTML:

        <script src="../js/cabecera.js?v=20261005-vps1">

    Si el navegador conserva el HTML antiguo, no llega a
    ver el ?v= nuevo, y subirlo no sirve de nada. Por eso
    el HTML tiene que revalidarse siempre.

    Sin cabecera de caché, Nginx no manda ni Cache-Control
    ni Expires, y el navegador se inventa el plazo: en la
    práctica un 10 % del tiempo que lleve el fichero sin
    modificarse. De ahí que el síntoma sea intermitente.

Antes de aplicar cambios:

- comprueba que existe la configuración;
- identifica los bloques esperados, todos, antes de
  escribir nada;
- comprueba que cada uno contiene su ruta HTML correcta;
- verifica la configuración actual de Nginx;
- crea una copia de seguridad.

Después de modificar:

- valida Nginx mediante nginx -t;
- recarga Nginx sin reiniciar el servidor.

Si falla la validación o la recarga, intenta restaurar
la configuración anterior.

Si cualquiera de los bloques no encaja con lo esperado,
aborta sin tocar nada: aplicar el ajuste a medias en un
servidor en producción es peor que no aplicarlo.

No modifica:

- la API;
- PostgreSQL;
- los servicios MeteoCam;
- las rutas de streaming;
- los archivos del repositorio.
"""

from __future__ import annotations

import os
import re
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path


RUTA_CONFIGURACION = Path(
    "/etc/nginx/sites-enabled/meteoarchidona-web"
)

DIRECTORIO_COPIAS = Path(
    "/home/jose"
)

# Cada dirección limpia con el HTML que sirve. Es la misma
# correspondencia que la tabla del README y que la lista
# SECCIONES de servidor.py; si se añade una sección hay que
# darla de alta también aquí.
PAGINAS = (
    (
        "/",
        "/pages/actualidad.html",
    ),
    (
        "/observaciones",
        "/pages/observaciones.html",
    ),
    (
        "/prediccion",
        "/pages/prediccion.html",
    ),
    (
        "/en-vivo",
        "/pages/en-vivo.html",
    ),
    (
        "/informacion",
        "/pages/informacion.html",
    ),
    (
        "/administracion",
        "/pages/administracion.html",
    ),
)


def ejecutar_comando(
    *argumentos: str,
) -> None:
    """Ejecuta un comando y exige que termine correctamente."""

    subprocess.run(
        list(argumentos),
        check=True,
    )


def localizar_bloque(
    contenido: str,
    ruta: str,
):
    """
    Localiza el bloque location de una sola dirección.

    Devuelve la coincidencia. Si no hay exactamente una,
    levanta una excepción sin modificar nada.
    """

    # El \{ detrás de la ruta impide que "/" encaje con
    # "/administracion": después de la barra tendría que
    # venir la llave, y viene una letra.
    patron_bloque = re.compile(
        r"(?P<indent>^[ \t]*)"
        r"location[ \t]+=[ \t]+"
        + re.escape(ruta)
        + r"[ \t]*\{[ \t]*\r?\n"
        r"(?P<cuerpo>.*?)"
        r"(?P=indent)\}[ \t]*(?=\r?\n|$)",
        re.MULTILINE | re.DOTALL,
    )

    coincidencias = list(
        patron_bloque.finditer(
            contenido
        )
    )

    if len(coincidencias) != 1:
        raise RuntimeError(
            "No se ha encontrado exactamente un bloque "
            f"location = {ruta} "
            f"(encontrados: {len(coincidencias)}). "
            "No se modificará Nginx."
        )

    return coincidencias[0]


def aplicar_pagina(
    contenido: str,
    ruta: str,
    html: str,
) -> str | None:
    """
    Añade expires -1 al bloque de una dirección.

    Devuelve el nuevo contenido, o None si el ajuste ya
    estaba aplicado en esa dirección.
    """

    bloque = localizar_bloque(
        contenido,
        ruta,
    )

    cuerpo = bloque.group(
        "cuerpo"
    )

    patron_ruta = re.compile(
        r"(?m)^(?P<indent>[ \t]*)"
        r"try_files[ \t]+"
        + re.escape(html)
        + r"[ \t]+=404;[ \t]*$"
    )

    coincidencia_ruta = patron_ruta.search(
        cuerpo
    )

    if coincidencia_ruta is None:
        raise RuntimeError(
            f"El bloque de {ruta} no contiene la ruta HTML "
            f"esperada (try_files {html} =404;). "
            "Se necesita una revisión manual."
        )

    if re.search(
        r"(?m)^[ \t]*expires[ \t]+-1;",
        cuerpo,
    ):
        return None

    if re.search(
        r"(?m)^[ \t]*expires[ \t]+",
        cuerpo,
    ):
        raise RuntimeError(
            f"El bloque de {ruta} ya tiene una directiva "
            "expires diferente. "
            "No se sobrescribirá automáticamente."
        )

    sangria = coincidencia_ruta.group(
        "indent"
    )

    salto_linea = (
        "\r\n"
        if "\r\n" in contenido
        else "\n"
    )

    posicion = coincidencia_ruta.start()

    nuevo_cuerpo = (
        cuerpo[:posicion]
        + sangria
        + "expires -1;"
        + salto_linea
        + cuerpo[posicion:]
    )

    return (
        contenido[:bloque.start("cuerpo")]
        + nuevo_cuerpo
        + contenido[bloque.end("cuerpo"):]
    )


def preparar_contenido(
    contenido: str,
):
    """
    Recorre todas las páginas y acumula los cambios.

    Devuelve el nuevo contenido —o None si no hace falta
    cambiar nada— junto con el informe por dirección.

    Como aquí no se escribe en disco, cualquier bloque que
    no encaje aborta el procedimiento completo antes de
    tocar la configuración.
    """

    actual = contenido

    informe = []

    cambios = 0

    for ruta, html in PAGINAS:
        resultado = aplicar_pagina(
            actual,
            ruta,
            html,
        )

        if resultado is None:
            informe.append(
                (
                    ruta,
                    "ya tenía expires -1",
                )
            )

            continue

        actual = resultado

        cambios += 1

        informe.append(
            (
                ruta,
                "expires -1 añadido",
            )
        )

    if cambios == 0:
        return None, informe

    return actual, informe


def imprimir_informe(
    informe,
) -> None:
    """Muestra qué se ha decidido para cada dirección."""

    ancho = max(
        len(ruta)
        for ruta, _ in informe
    )

    for ruta, detalle in informe:
        print(
            f"  {ruta.ljust(ancho)}  {detalle}"
        )


def main() -> None:
    """Aplica de forma controlada el ajuste de caché."""

    if os.geteuid() != 0:
        raise RuntimeError(
            "Este procedimiento requiere sudo."
        )

    if not RUTA_CONFIGURACION.is_file():
        raise RuntimeError(
            "No existe la configuración de Nginx esperada."
        )

    destino = RUTA_CONFIGURACION.resolve(
        strict=True
    )

    contenido_original_bytes = destino.read_bytes()

    contenido_original = (
        contenido_original_bytes.decode(
            "utf-8"
        )
    )

    contenido_nuevo, informe = preparar_contenido(
        contenido_original
    )

    print(
        "Situación de cada dirección:"
    )

    imprimir_informe(
        informe
    )

    if contenido_nuevo is None:
        print(
            "Todas las páginas tienen ya expires -1. "
            "No hay cambios."
        )

        return

    print(
        "Comprobando configuración actual de Nginx..."
    )

    ejecutar_comando(
        "nginx",
        "-t",
    )

    fecha = datetime.now(
        timezone.utc
    ).strftime(
        "%Y%m%dT%H%M%S%fZ"
    )

    copia = DIRECTORIO_COPIAS / (
        f"meteoarchidona-web.nginx.{fecha}.bak"
    )

    shutil.copy2(
        destino,
        copia,
    )

    print(
        f"Copia de seguridad: {copia}"
    )

    try:
        destino.write_bytes(
            contenido_nuevo.encode(
                "utf-8"
            )
        )

        ejecutar_comando(
            "nginx",
            "-t",
        )

        ejecutar_comando(
            "systemctl",
            "reload",
            "nginx",
        )

    except Exception:
        print(
            "Error aplicando la configuración. "
            "Restaurando la copia anterior..."
        )

        destino.write_bytes(
            contenido_original_bytes
        )

        ejecutar_comando(
            "nginx",
            "-t",
        )

        ejecutar_comando(
            "systemctl",
            "reload",
            "nginx",
        )

        raise

    print(
        "Configuración de caché del HTML "
        "actualizada correctamente."
    )

    print(
        "Conviene comprobarlo:"
    )

    print(
        "  curl -sI https://meteoarchidona.com/ "
        "| grep -i cache-control"
    )


if __name__ == "__main__":
    main()


# Fin de fichero: scripts/configurar_cache_paginas.py
