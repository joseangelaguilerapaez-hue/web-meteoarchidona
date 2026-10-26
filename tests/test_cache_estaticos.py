# -*- coding: utf-8 -*-

"""
Pruebas del procedimiento de caché de los estáticos.

El script toca la configuración de Nginx del servidor, así que aquí se
prueba solo su transformación del texto, sin tocar ficheros ni
ejecutar nada: se le pasa una configuración de ejemplo y se comprueba
qué devuelve.

Se verifica:

- que añade los dos bloques dentro del server del sitio;
- que no repite lo que ya está (se puede ejecutar dos veces);
- que respeta lo que ya hubiera;
- que se planta si la configuración no es la esperada.
"""

import importlib.util
import unittest
from pathlib import Path


RAIZ = Path(
    __file__
).resolve().parent.parent


def cargar_script():
    """Carga el script por ruta: scripts/ no es un paquete."""

    ruta = RAIZ / "scripts" / "configurar_cache_estaticos.py"

    especificacion = importlib.util.spec_from_file_location(
        "configurar_cache_estaticos",
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

    location ~ \\.html$ {
        expires -1;
    }
}
"""


class TestCacheEstaticos(unittest.TestCase):

    def setUp(self):
        self.script = cargar_script()

    def test_anade_los_dos_bloques(self):
        nuevo, informe = self.script.preparar_contenido(CONFIGURACION)

        self.assertIsNotNone(nuevo, "debería haber cambios")
        self.assertIn("location ~* ^/(css|js)/", nuevo)
        self.assertIn("expires 1y;", nuevo)
        self.assertIn("location ~* ^/assets/", nuevo)
        self.assertIn("expires 30d;", nuevo)
        self.assertEqual(len(informe), 2)

    def test_no_toca_lo_que_ya_estaba(self):
        """El HTML con expires -1 y el resto del server siguen igual."""

        nuevo, _ = self.script.preparar_contenido(CONFIGURACION)

        for linea in (
            "server_name meteoarchidona.com;",
            "root /srv/meteoarchidona/web;",
            "try_files /pages/actualidad.html =404;",
            "location ~ \\.html$ {",
        ):
            self.assertIn(linea, nuevo, f"se ha perdido: {linea}")

        self.assertEqual(
            nuevo.count("location = / {"),
            1,
            "no debe duplicar bloques",
        )

    def test_los_bloques_quedan_dentro_del_server(self):
        """Lo añadido va antes de la llave que cierra el server."""

        nuevo, _ = self.script.preparar_contenido(CONFIGURACION)

        cierre = nuevo.rstrip().rfind("\n}")

        self.assertGreater(
            cierre,
            nuevo.find("location ~* ^/assets/"),
            "el bloque ha quedado fuera del server",
        )

    def test_ejecutarlo_dos_veces_no_cambia_nada(self):
        """Idempotente: la segunda pasada no toca la configuración."""

        nuevo, _ = self.script.preparar_contenido(CONFIGURACION)

        repetido, informe = self.script.preparar_contenido(nuevo)

        self.assertIsNone(repetido, "no debería volver a añadirlos")
        self.assertTrue(
            all("ya tiene" in linea for linea in informe),
            informe,
        )

    def test_con_el_server_de_redireccion_elige_el_de_la_web(self):
        """Como en el VPS: HTTPS sirve la web y HTTP solo redirige."""

        redireccion = (
            "server {\n"
            "    listen 80;\n"
            "    server_name meteoarchidona.com www.meteoarchidona.com;\n"
            "\n"
            "    return 301 https://$host$request_uri;\n"
            "}\n"
        )
        configuracion = CONFIGURACION + "\n" + redireccion

        nuevo, informe = self.script.preparar_contenido(configuracion)

        self.assertIsNotNone(nuevo)
        self.assertEqual(len(informe), 2)
        self.assertTrue(
            nuevo.endswith(redireccion),
            "el server de redirección no debe cambiar",
        )
        self.assertLess(
            nuevo.find("location ~* ^/assets/"),
            nuevo.find("listen 80;"),
            "los bloques deben ir en el server de HTTPS",
        )

    def test_dos_server_con_la_raiz_de_la_web_se_planta(self):
        with self.assertRaises(RuntimeError):
            self.script.preparar_contenido(CONFIGURACION + "\n" + CONFIGURACION)

    def test_sin_server_del_sitio_se_planta(self):
        """Ante algo que no reconoce, no modifica Nginx."""

        with self.assertRaises(RuntimeError):
            self.script.preparar_contenido(
                "server {\n    server_name otracosa.com;\n}\n"
            )


if __name__ == "__main__":
    unittest.main()
