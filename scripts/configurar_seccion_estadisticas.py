# -*- coding: utf-8 -*-

"""
Da de alta en Nginx la dirección limpia de la sección Estadísticas.

El fichero de configuración activa de Nginx no pertenece al
repositorio Git de la web. Este script conserva en GitHub el
procedimiento, igual que configurar_cache_estaticos.py.

Qué resuelve
============

En producción las direcciones limpias (/prediccion, /informacion...) las
traduce Nginx con un bloque por sección; el .htaccess no se aplica. Sin
su bloque, /estadisticas daría 404.

Qué añade
=========

Una copia exacta del bloque de Información con el nombre cambiado,
justo debajo de él. Si el de Información es:

    location = /informacion {
        expires -1;
        try_files /pages/informacion.html =404;
    }

añade:

    location = /estadisticas {
        expires -1;
        try_files /pages/estadisticas.html =404;
    }

Así hereda lo mismo que ya funciona para una página (la caché del HTML,
expires -1, aplicada el 25-10-2026), sin inventar nada. Si hubiera más
de un bloque de Información, copia cada uno. Si no hay ninguno, o no
sirve pages/informacion.html, se planta sin tocar nada.

Antes de aplicar cambios comprueba la configuración actual con
`nginx -t` y hace una copia fuera de sites-enabled. Después valida y
recarga sin reiniciar; si algo falla, restaura la copia.

No modifica la API, PostgreSQL, los servicios MeteoCam, las rutas de
streaming ni los archivos del repositorio. Se puede ejecutar dos veces.

Uso:

    sudo python3 scripts/configurar_seccion_estadisticas.py --simular
    sudo python3 scripts/configurar_seccion_estadisticas.py
"""

from __future__ import annotations

import argparse
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

MODELO = "informacion"

SECCION = "estadisticas"


def ejecutar_comando(
    *argumentos: str,
) -> None:
    """Ejecuta un comando y exige que termine correctamente."""

    subprocess.run(
        list(argumentos),
        check=True,
    )


def patron_bloque(
    seccion: str,
) -> re.Pattern:
    """Un bloque `location = /<seccion> { ... }` con su sangría."""

    return re.compile(
        r"(?P<indent>^[ \t]*)"
        r"location[ \t]+=[ \t]+/"
        + re.escape(seccion)
        + r"[ \t]*\{[ \t]*\r?\n"
        r"(?P<cuerpo>.*?)"
        r"^(?P=indent)\}[ \t]*(?=\r?\n|$)",
        re.MULTILINE | re.DOTALL,
    )


def preparar_contenido(
    contenido: str,
) -> tuple[str | None, list[str]]:
    """
    Añade el bloque de Estadísticas debajo de cada bloque de Información.

    Devuelve el contenido nuevo, o None si no hay nada que hacer, y la
    lista de lo que se ha hecho, para poder informar.
    """

    if patron_bloque(SECCION).search(contenido):
        return None, [f"/{SECCION} ya tiene su bloque, no se toca."]

    modelos = list(
        patron_bloque(MODELO).finditer(
            contenido
        )
    )

    if not modelos:
        raise RuntimeError(
            f"No se ha encontrado ningún bloque location = /{MODELO}. "
            "Se necesita una revisión manual; no se modificará Nginx."
        )

    salto_linea = (
        "\r\n"
        if "\r\n" in contenido
        else "\n"
    )

    informe: list[str] = []

    nuevo = contenido

    # De atrás adelante, para que las posiciones sigan valiendo.
    for bloque in reversed(modelos):

        if not re.search(
            r"/pages/" + re.escape(MODELO) + r"\.html",
            bloque.group("cuerpo"),
        ):
            raise RuntimeError(
                f"El bloque de /{MODELO} no sirve /pages/{MODELO}.html. "
                "Se necesita una revisión manual; no se modificará Nginx."
            )

        copia = (
            bloque.group(0)
            .replace(f"/pages/{MODELO}.html", f"/pages/{SECCION}.html")
            .replace(f"/{MODELO}", f"/{SECCION}")
        )

        # La sangría ya va en la copia: se inserta tras la llave de cierre.
        nuevo = (
            nuevo[:bloque.end()]
            + salto_linea
            + salto_linea
            + copia
            + nuevo[bloque.end():]
        )

        informe.append(
            f"Se añade location = /{SECCION} (copia del de /{MODELO})."
        )

    return nuevo, list(reversed(informe))


def main() -> None:
    """Aplica de forma controlada el bloque de la sección."""

    argumentos = argparse.ArgumentParser(
        description=f"Da de alta /{SECCION} en Nginx."
    )

    argumentos.add_argument(
        "--simular",
        action="store_true",
        help="Enseña el bloque que se añadiría sin tocar nada.",
    )

    opciones = argumentos.parse_args()

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

    contenido_original = contenido_original_bytes.decode(
        "utf-8"
    )

    contenido_nuevo, informe = preparar_contenido(
        contenido_original
    )

    for linea in informe:
        print(
            linea
        )

    if contenido_nuevo is None:
        print(
            "No hay cambios que aplicar."
        )
        return

    if opciones.simular:
        print(
            "SIMULACIÓN: este es el bloque que se añadiría."
        )
        for bloque in patron_bloque(SECCION).finditer(contenido_nuevo):
            print(
                bloque.group(0)
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
        f"Sección /{SECCION} dada de alta en Nginx."
    )


if __name__ == "__main__":
    main()


# Fin de fichero: scripts/configurar_seccion_estadisticas.py
