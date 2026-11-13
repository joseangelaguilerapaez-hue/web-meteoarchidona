# -*- coding: utf-8 -*-

"""
Da de alta en Nginx la dirección limpia de «Climatología» (/climatologia).

Es el mismo procedimiento que scripts/configurar_seccion_estadisticas.py
(copia el bloque de /informacion con el nombre cambiado, copia de
seguridad en /home/jose, nginx -t, recarga y vuelta atrás si algo
falla). Para no duplicar el código, carga ese script y solo le cambia
el nombre de la sección.

Se puede ejecutar dos veces: si /climatologia ya tiene su bloque, no toca nada.

Uso (en el VPS, desde /srv/meteoarchidona/web):

    sudo python3 scripts/configurar_seccion_climatologia.py --simular
    sudo python3 scripts/configurar_seccion_climatologia.py
"""

from __future__ import annotations

import importlib.util
from pathlib import Path


def cargar_procedimiento():
    ruta = Path(__file__).resolve().parent / "configurar_seccion_estadisticas.py"
    especificacion = importlib.util.spec_from_file_location(
        "configurar_seccion_estadisticas",
        ruta,
    )
    modulo = importlib.util.module_from_spec(especificacion)
    especificacion.loader.exec_module(modulo)
    modulo.SECCION = "climatologia"
    return modulo


if __name__ == "__main__":
    cargar_procedimiento().main()


# Fin de fichero: scripts/configurar_seccion_climatologia.py
