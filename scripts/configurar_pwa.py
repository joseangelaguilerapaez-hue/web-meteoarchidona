# -*- coding: utf-8 -*-

"""
Configura en Nginx lo que necesita la aplicación instalable.

El fichero de configuración activa de Nginx no pertenece al
repositorio Git de la web. Este script conserva en GitHub el
procedimiento, igual que configurar_cache_estaticos.py.

Qué resuelve
============

Dos cosas que la PWA necesita del servidor y que hoy no están:

1. `manifest.webmanifest` se sirve sin tipo conocido. Nginx no trae
   esa extensión en su tabla y la manda como `application/octet-stream`;
   conviene darle el suyo, `application/manifest+json`.

2. `sw.js` y el propio manifiesto no deben cachearse. Son los dos
   ficheros que dicen qué versión del sitio hay que usar: si se
   quedan pegados en el navegador, una publicación nueva tarda en
   llegar. Los `.css` y los `.js` de `/js/` sí llevan un año de
   caché, pero van versionados con `?v=` y estos dos no pueden.

Qué añade
=========

    location = /sw.js {
        expires -1;
    }

    location = /manifest.webmanifest {
        types { application/manifest+json webmanifest; }
        expires -1;
    }

Se usa `expires` y no `add_header`, por la misma razón explicada en
docs/despliegue.md: un `add_header` dentro de un `location` anula las
cabeceras de seguridad declaradas en el `server`.

Antes de aplicar cambios
========================

- comprueba que existe la configuración;
- comprueba que no estén ya esos bloques;
- verifica la configuración actual con `nginx -t`;
- crea una copia de seguridad fuera de sites-enabled.

Después de modificar valida con `nginx -t` y recarga sin reiniciar. Si
algo falla, restaura la copia anterior.

No modifica la API, PostgreSQL, los servicios MeteoCam, las rutas de
streaming ni los archivos del repositorio.

Uso:

    sudo python3 scripts/configurar_pwa.py

Comprobación posterior:

    curl -sI https://meteoarchidona.com/manifest.webmanifest \\
        | grep -i -E 'content-type|cache-control'
    curl -sI https://meteoarchidona.com/sw.js \\
        | grep -i -E 'cache-control|expires'
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


# Cada bloque: nombre para los mensajes, location y sus líneas.
BLOQUES = (
    (
        "sw.js",
        "= /sw.js",
        (
            "expires -1;",
        ),
    ),
    (
        "manifest.webmanifest",
        "= /manifest.webmanifest",
        (
            "types { application/manifest+json webmanifest; }",
            "expires -1;",
        ),
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


def localizar_bloque_server(
    contenido: str,
) -> re.Match:
    """
    Localiza el server que atiende el sitio.

    Tiene que haber exactamente uno con la raíz de la web
    (root /srv/meteoarchidona/web); si hay varios o ninguno, se aborta
    en lugar de adivinar. El server de HTTP que solo redirige no la
    tiene y se deja como está.
    """

    patron = re.compile(
        r"(?P<indent>^[ \t]*)server[ \t]*\{"
        r"(?P<cuerpo>.*?)"
        # El cierre tiene que ser una llave sola al principio de su
        # línea y con la misma sangría. Sin el ^, una sangría vacía
        # deja el ancla en nada y el bloque termina en la primera
        # llave que aparezca, que suele ser la de un location.
        r"^(?P=indent)\}[ \t]*(?=\r?\n|$)",
        re.MULTILINE | re.DOTALL,
    )

    raiz_web = re.compile(
        r"(?m)^[ \t]*root[ \t]+/srv/meteoarchidona/web/?[ \t]*;"
    )

    candidatos = [
        bloque
        for bloque in patron.finditer(
            contenido
        )
        if raiz_web.search(
            bloque.group(
                "cuerpo"
            )
        )
    ]

    if len(candidatos) != 1:
        raise RuntimeError(
            "No se ha encontrado exactamente un bloque server "
            "del sitio. No se modificará Nginx."
        )

    return candidatos[0]


def preparar_contenido(
    contenido: str,
) -> tuple[str | None, list[str]]:
    """
    Añade los bloques que falten dentro del server del sitio.

    Devuelve el contenido nuevo, o None si no hay nada que añadir, y
    la lista de lo que se ha hecho, para poder informar.
    """

    bloque = localizar_bloque_server(
        contenido
    )

    cuerpo = bloque.group(
        "cuerpo"
    )

    salto_linea = (
        "\r\n"
        if "\r\n" in contenido
        else "\n"
    )

    sangria = bloque.group(
        "indent"
    ) + "    "

    informe: list[str] = []

    anadidos = ""

    for nombre, location, lineas in BLOQUES:
        ya_existe = re.search(
            r"(?m)^[ \t]*location[ \t]+"
            + re.escape(
                location
            )
            + r"[ \t]*\{",
            cuerpo,
        )

        if ya_existe:
            informe.append(
                f"{nombre}: ya tiene su bloque, no se toca."
            )
            continue

        anadidos += (
            salto_linea
            + sangria
            + f"location {location} {{"
            + salto_linea
        )

        for linea in lineas:
            anadidos += (
                sangria
                + "    "
                + linea
                + salto_linea
            )

        anadidos += (
            sangria
            + "}"
            + salto_linea
        )

        informe.append(
            f"{nombre}: se añade su bloque."
        )

    if not anadidos:
        return None, informe

    nuevo_cuerpo = (
        cuerpo.rstrip()
        + salto_linea
        + anadidos
    )

    return (
        contenido[:bloque.start("cuerpo")]
        + nuevo_cuerpo
        + contenido[bloque.end("cuerpo"):],
        informe,
    )


def main() -> None:
    """Aplica de forma controlada la configuración de la PWA."""

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

    contenido_original = destino.read_bytes().decode(
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
        shutil.copy2(
            copia,
            destino,
        )

        print(
            "Algo ha fallado: restaurada la configuración anterior."
        )

        raise

    print(
        "Hecho. Nginx recargado."
    )


if __name__ == "__main__":
    main()


# Fin de fichero: scripts/configurar_pwa.py
