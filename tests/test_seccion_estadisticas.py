# -*- coding: utf-8 -*-

"""
Pruebas del alta de /estadisticas en Nginx.

Como en test_cache_estaticos.py, solo se prueba la transformación del
texto: se le pasa una configuración de ejemplo y se mira qué devuelve.

Se verifica:

- que copia el bloque de Información con el nombre cambiado, debajo;
- que respeta lo demás y no duplica nada;
- que se puede ejecutar dos veces;
- que se planta si no encuentra el bloque esperado.
"""

import importlib.util
import unittest
from pathlib import Path


RAIZ = Path(
    __file__
).resolve().parent.parent


def cargar_script():
    """Carga el script por ruta: scripts/ no es un paquete."""

    ruta = RAIZ / "scripts" / "configurar_seccion_estadisticas.py"

    especificacion = importlib.util.spec_from_file_location(
        "configurar_seccion_estadisticas",
        ruta,
    )

    modulo = importlib.util.module_from_spec(
        especificacion
    )

    especificacion.loader.exec_module(
        modulo
    )

    return modulo


CONFIGURACION = """server {
    listen 443 ssl;
    server_name meteoarchidona.com;

    root /srv/meteoarchidona/web;

    location = / {
        expires -1;
        try_files /pages/actualidad.html =404;
    }

    location = /informacion {
        expires -1;
        try_files /pages/informacion.html =404;
    }

    location = /administracion {
        try_files /pages/administracion.html =404;
        expires -1;
    }
}

server {
    listen 80;
    server_name meteoarchidona.com;

    return 301 https://$host$request_uri;
}
"""


class TestSeccionEstadisticas(unittest.TestCase):

    def setUp(self):
        self.script = cargar_script()

    def test_copia_el_bloque_de_informacion(self):
        nuevo, informe = self.script.preparar_contenido(CONFIGURACION)

        self.assertIsNotNone(nuevo)
        self.assertIn(
            "    location = /estadisticas {\n"
            "        expires -1;\n"
            "        try_files /pages/estadisticas.html =404;\n"
            "    }\n",
            nuevo,
        )
        self.assertEqual(len(informe), 1)

    def test_queda_debajo_de_informacion_y_dentro_del_server(self):
        nuevo, _ = self.script.preparar_contenido(CONFIGURACION)

        informacion = nuevo.find("location = /informacion")
        estadisticas = nuevo.find("location = /estadisticas")
        administracion = nuevo.find("location = /administracion")

        self.assertLess(informacion, estadisticas)
        self.assertLess(estadisticas, administracion)

    def test_no_toca_lo_demas(self):
        nuevo, _ = self.script.preparar_contenido(CONFIGURACION)

        self.assertEqual(
            nuevo.replace(
                "    location = /estadisticas {\n"
                "        expires -1;\n"
                "        try_files /pages/estadisticas.html =404;\n"
                "    }\n\n",
                "",
            ),
            CONFIGURACION,
        )

    def test_ejecutarlo_dos_veces_no_cambia_nada(self):
        nuevo, _ = self.script.preparar_contenido(CONFIGURACION)

        repetido, informe = self.script.preparar_contenido(nuevo)

        self.assertIsNone(repetido)
        self.assertIn("ya tiene", informe[0])

    def test_sin_bloque_de_informacion_se_planta(self):
        sin_modelo = CONFIGURACION.replace("location = /informacion", "location = /otra")

        with self.assertRaises(RuntimeError):
            self.script.preparar_contenido(sin_modelo)

    def test_si_informacion_no_sirve_su_pagina_se_planta(self):
        raro = CONFIGURACION.replace(
            "try_files /pages/informacion.html =404;",
            "return 302 /;",
        )

        with self.assertRaises(RuntimeError):
            self.script.preparar_contenido(raro)


if __name__ == "__main__":
    unittest.main()
