# -*- coding: utf-8 -*-

"""
Configura la revalidación de caché de Administración en Nginx.

El fichero de configuración activa de Nginx no pertenece
al repositorio Git de la web.

Este script permite conservar en GitHub el procedimiento
de actualización de dicha configuración.

Modifica exclusivamente el bloque:

    location = /administracion

para incorporar:

    expires -1;

Antes de aplicar cambios:

- comprueba que existe la configuración;
- identifica el bloque esperado;
- comprueba que contiene la ruta HTML correcta;
- verifica la configuración actual de Nginx;
- crea una copia de seguridad.

Después de modificar:

- valida Nginx mediante nginx -t;
- recarga Nginx sin reiniciar el servidor.

Si falla la validación o la recarga, intenta restaurar
la configuración anterior.

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


def ejecutar_comando(
    *argumentos: str,
) -> None:
    """Ejecuta un comando y exige que termine correctamente."""

    subprocess.run(
        list(argumentos),
        check=True,
    )


def preparar_contenido(
    contenido: str,
) -> str | None:
    """
    Localiza exclusivamente la ruta de Administración.

    Devuelve el nuevo contenido o None si el ajuste
    ya está aplicado.
    """

    patron_bloque = re.compile(
        r"(?P<indent>^[ \t]*)"
        r"location[ \t]+=[ \t]+/administracion"
        r"[ \t]*\{[ \t]*\r?\n"
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
            "location = /administracion. "
            "No se modificará Nginx."
        )

    bloque = coincidencias[0]

    cuerpo = bloque.group(
        "cuerpo"
    )

    patron_ruta = re.compile(
        r"(?m)^(?P<indent>[ \t]*)"
        r"try_files[ \t]+"
        r"/pages/administracion\.html"
        r"[ \t]+=404;[ \t]*$"
    )

    coincidencia_ruta = patron_ruta.search(
        cuerpo
    )

    if coincidencia_ruta is None:
        raise RuntimeError(
            "El bloque de Administración no contiene "
            "la ruta HTML esperada. "
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
            "Ya existe una directiva expires diferente. "
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

    contenido_nuevo = preparar_contenido(
        contenido_original
    )

    if contenido_nuevo is None:
        print(
            "Administración ya tiene expires -1. "
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
        "Configuración de caché de Administración "
        "actualizada correctamente."
    )


if __name__ == "__main__":
    main()


# Fin de fichero: scripts/configurar_cache_administracion.py