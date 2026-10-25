# -*- coding: utf-8 -*-

"""
Configura en Nginx la caché de los ficheros estáticos.

El fichero de configuración activa de Nginx no pertenece al
repositorio Git de la web. Este script conserva en GitHub el
procedimiento de actualización, igual que
configurar_cache_administracion.py.

Qué resuelve
============

Hoy los `.css`, los `.js`, las imágenes y las tipografías se sirven
sin ninguna cabecera de caché: solo con `ETag`. El navegador los
vuelve a pedir en cada visita y, aunque el servidor conteste «no ha
cambiado», es una petición por fichero y por visita.

Se puede cachear con tranquilidad porque el `.css` y el `.js` van
siempre versionados con `?v=`, y una prueba del repositorio lo exige
(`test_css_y_js_locales_llevan_version`). Al cambiar el fichero cambia
su dirección, de modo que nadie se queda con una versión vieja.

Qué añade
=========

Dos bloques, al estilo del resto de la configuración:

    location ~* ^/(css|js)/ {
        expires 1y;
    }

    location ~* ^/assets/ {
        expires 30d;
    }

Las imágenes y las tipografías llevan 30 días y no un año porque
no se versionan: se referencian por su nombre, y si algún día se
cambia el logotipo conviene que la gente lo vea en semanas y no en
meses.

Se usa `expires` y no `add_header`, por la misma razón explicada en
docs/despliegue.md: un `add_header` dentro de un `location` anula las
cabeceras de seguridad declaradas en el `server`.

Antes de aplicar cambios
========================

- comprueba que existe la configuración;
- comprueba que no haya ya reglas de caché para esas rutas;
- verifica la configuración actual con `nginx -t`;
- crea una copia de seguridad fuera de sites-enabled.

Después de modificar valida con `nginx -t` y recarga sin reiniciar. Si
algo falla, restaura la copia anterior.

No modifica la API, PostgreSQL, los servicios MeteoCam, las rutas de
streaming ni los archivos del repositorio.

Uso:

    sudo python3 scripts/configurar_cache_estaticos.py
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


# Cada regla: nombre para los mensajes, patrón del location y plazo.
REGLAS = (
    (
        "css y js",
        r"~* ^/(css|js)/",
        "1y",
    ),
    (
        "assets",
        r"~* ^/assets/",
        "30d",
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

    Tiene que haber exactamente uno con la raíz de la web; si hay
    varios o ninguno, se aborta en lugar de adivinar.
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

    candidatos = [
        bloque
        for bloque in patron.finditer(
            contenido
        )
        if "meteoarchidona" in bloque.group(
            "cuerpo"
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

    for nombre, patron_location, plazo in REGLAS:
        ya_existe = re.search(
            r"(?m)^[ \t]*location[ \t]+"
            + re.escape(
                patron_location
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
            + f"location {patron_location} {{"
            + salto_linea
            + sangria
            + "    "
            + f"expires {plazo};"
            + salto_linea
            + sangria
            + "}"
            + salto_linea
        )

        informe.append(
            f"{nombre}: se añade expires {plazo}."
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
    """Aplica de forma controlada la caché de los estáticos."""

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
        "Caché de los estáticos configurada correctamente."
    )


if __name__ == "__main__":
    main()


# Fin de fichero: scripts/configurar_cache_estaticos.py
