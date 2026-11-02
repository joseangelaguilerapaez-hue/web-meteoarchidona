# -*- coding: utf-8 -*-

"""
Pruebas de la aplicación instalable (PWA).

Dos cosas distintas:

- el procedimiento de Nginx (`scripts/configurar_pwa.py`), del que se
  prueba solo su transformación del texto, sin tocar ficheros ni
  ejecutar nada, igual que en test_cache_estaticos.py;

- las piezas que sí están en el repositorio: el manifiesto, el
  trabajador de servicio y las etiquetas de las páginas.

De lo que se asegura, por orden de importancia: que el trabajador no
guarde copias de los datos de la API, porque enseñar una temperatura
vieja como si fuera de ahora es el peor fallo posible en esta web.
"""

import importlib.util
import json
import re
import unittest
from pathlib import Path


RAIZ = Path(
    __file__
).resolve().parent.parent

PAGINAS = sorted(
    (RAIZ / "pages").glob("*.html")
)


def cargar_script():
    """Carga el script por ruta: scripts/ no es un paquete."""

    ruta = RAIZ / "scripts" / "configurar_pwa.py"

    especificacion = importlib.util.spec_from_file_location(
        "configurar_pwa",
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


class TestManifiesto(unittest.TestCase):
    """El manifiesto tiene que ser válido y apuntar a ficheros reales."""

    def setUp(self):
        self.ruta = RAIZ / "manifest.webmanifest"
        self.manifiesto = json.loads(
            self.ruta.read_text(encoding="utf-8")
        )

    def test_tiene_lo_que_pide_un_navegador_para_instalar(self):
        for clave in (
            "name",
            "short_name",
            "start_url",
            "display",
            "background_color",
            "theme_color",
            "icons",
        ):
            with self.subTest(clave=clave):
                self.assertIn(clave, self.manifiesto)

        self.assertEqual(self.manifiesto["display"], "standalone")

    def test_los_iconos_existen_y_hay_uno_de_512(self):
        tamanos = set()

        for icono in self.manifiesto["icons"]:
            ruta = icono["src"].split("?")[0].lstrip("/")

            with self.subTest(icono=icono["src"]):
                self.assertTrue(
                    (RAIZ / ruta).is_file(),
                    f"no existe {ruta}",
                )

            tamanos.add(icono["sizes"])

        self.assertIn("192x192", tamanos)
        self.assertIn("512x512", tamanos)

    def test_hay_un_icono_recortable(self):
        """Android recorta el icono; sin maskable sale con bordes feos."""

        self.assertTrue(
            any(
                "maskable" in icono.get("purpose", "")
                for icono in self.manifiesto["icons"]
            ),
            "falta un icono con purpose maskable",
        )

    def test_los_accesos_directos_llevan_a_secciones_del_sitio(self):
        import sys

        sys.path.insert(0, str(RAIZ))

        import servidor

        validas = {"/"} | {f"/{s}" for s in servidor.SECCIONES}

        for acceso in self.manifiesto.get("shortcuts", []):
            with self.subTest(acceso=acceso["url"]):
                self.assertIn(acceso["url"], validas)


class TestTrabajadorDeServicio(unittest.TestCase):
    """Lo que el trabajador no debe hacer importa más que lo que hace."""

    def setUp(self):
        self.ruta = RAIZ / "sw.js"
        self.texto = self.ruta.read_text(encoding="utf-8")

    def test_esta_en_la_raiz(self):
        """Un trabajador solo manda sobre su propia carpeta."""

        self.assertTrue(self.ruta.is_file())

    def test_no_guarda_nada_de_la_api(self):
        self.assertIn("/api", self.texto)
        self.assertIn("esDeLaApi", self.texto)

    def test_solo_atiende_peticiones_get(self):
        self.assertIn('peticion.method !== "GET"', self.texto)

    def test_tiene_version_en_el_nombre_de_la_cache(self):
        """Cambiar la versión es lo que tira la caché anterior."""

        version = re.search(
            r'const VERSION = "([^"]+)"',
            self.texto,
        )

        self.assertIsNotNone(version, "falta la constante VERSION")
        self.assertIn("meteoarchidona-${VERSION}", self.texto)

    def test_las_paginas_van_primero_a_la_red(self):
        """Así se ve siempre lo último publicado."""

        self.assertIn("responderPagina", self.texto)
        self.assertIn('peticion.mode === "navigate"', self.texto)


class TestPaginas(unittest.TestCase):
    """Todas las páginas tienen que declarar la aplicación."""

    def test_cada_pagina_enlaza_el_manifiesto_con_version(self):
        for pagina in PAGINAS:
            texto = pagina.read_text(encoding="utf-8")

            with self.subTest(pagina=pagina.name):
                enlace = re.search(
                    r'<link rel="manifest" href="/manifest\.webmanifest\?v=([^"]+)"',
                    texto,
                )

                self.assertIsNotNone(
                    enlace,
                    "falta el enlace al manifiesto, o va sin versión",
                )

    def test_cada_pagina_da_de_alta_el_trabajador(self):
        for pagina in PAGINAS:
            texto = pagina.read_text(encoding="utf-8")

            with self.subTest(pagina=pagina.name):
                self.assertIn("js/pwa.js?v=", texto)

    def test_cada_pagina_declara_el_color_de_la_barra(self):
        for pagina in PAGINAS:
            texto = pagina.read_text(encoding="utf-8")

            with self.subTest(pagina=pagina.name):
                self.assertIn('name="theme-color"', texto)


class TestConfiguracionNginx(unittest.TestCase):

    def setUp(self):
        self.script = cargar_script()

    def test_anade_los_dos_bloques(self):
        nuevo, informe = self.script.preparar_contenido(CONFIGURACION)

        self.assertIsNotNone(nuevo, "debería haber cambios")
        self.assertIn("location = /sw.js", nuevo)
        self.assertIn("location = /manifest.webmanifest", nuevo)
        self.assertIn("application/manifest+json webmanifest;", nuevo)
        self.assertEqual(len(informe), 2)

    def test_no_toca_lo_que_ya_estaba(self):
        nuevo, _ = self.script.preparar_contenido(CONFIGURACION)

        for linea in (
            "server_name meteoarchidona.com;",
            "root /srv/meteoarchidona/web;",
            "try_files /pages/actualidad.html =404;",
        ):
            self.assertIn(linea, nuevo, f"se ha perdido: {linea}")

    def test_los_bloques_quedan_dentro_del_server(self):
        nuevo, _ = self.script.preparar_contenido(CONFIGURACION)

        cierre = nuevo.rstrip().rfind("\n}")

        self.assertGreater(
            cierre,
            nuevo.find("location = /manifest.webmanifest"),
            "el bloque ha quedado fuera del server",
        )

    def test_ejecutarlo_dos_veces_no_cambia_nada(self):
        nuevo, _ = self.script.preparar_contenido(CONFIGURACION)

        repetido, informe = self.script.preparar_contenido(nuevo)

        self.assertIsNone(repetido, "no debería volver a añadirlos")
        self.assertTrue(
            all("ya tiene" in linea for linea in informe),
            informe,
        )

    def test_sin_server_del_sitio_se_planta(self):
        with self.assertRaises(RuntimeError):
            self.script.preparar_contenido(
                "server {\n    server_name otracosa.com;\n}\n"
            )


if __name__ == "__main__":
    unittest.main()
