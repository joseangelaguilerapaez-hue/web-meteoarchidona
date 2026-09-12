"""
MeteoArchidona · pruebas de servidor.py

Arrancan el servidor de desarrollo en un puerto libre, dentro de la
propia prueba, y comprueban que las direcciones se comportan como en
producción: las limpias sirven su página, las viejas redirigen con un
301 a la buena, las carpetas no se listan y no se cachea nada.

Lo que hace Hostinger lo decide el .htaccess, que aquí no se puede
ejecutar; servidor.py lo imita, y estas pruebas vigilan que la imitación
no se desvíe. No se prueba el intermediario /api/: saldría a internet.

Ejecutar desde la raíz del repositorio:

    python -m unittest discover -s tests -v
"""

import functools
import http.client
import sys
import threading
import unittest
from pathlib import Path


RAIZ = Path(__file__).resolve().parent.parent

sys.path.insert(0, str(RAIZ))

import servidor  # noqa: E402


class ManejadorSilencioso(servidor.ManejadorSinCache):
    """El mismo manejador, sin escribir una línea por petición."""

    def log_message(self, formato, *argumentos):
        pass


class TestServidor(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        manejador = functools.partial(ManejadorSilencioso, directory=str(RAIZ))
        cls.servidor = servidor.ThreadingHTTPServer(("127.0.0.1", 0), manejador)
        cls.puerto = cls.servidor.server_address[1]
        cls.hilo = threading.Thread(target=cls.servidor.serve_forever, daemon=True)
        cls.hilo.start()

    @classmethod
    def tearDownClass(cls):
        cls.servidor.shutdown()
        cls.servidor.server_close()

    def pedir(self, ruta):
        """GET sin seguir redirecciones: (código, cabeceras, cuerpo)."""
        conexion = http.client.HTTPConnection("127.0.0.1", self.puerto, timeout=10)
        try:
            conexion.request("GET", ruta)
            respuesta = conexion.getresponse()
            return respuesta.status, dict(respuesta.getheaders()), respuesta.read().decode("utf-8", "replace")
        finally:
            conexion.close()

    def test_la_portada_es_actualidad(self):
        codigo, _, cuerpo = self.pedir("/")
        self.assertEqual(codigo, 200)
        self.assertIn('data-seccion="actualidad"', cuerpo)

    def test_direcciones_limpias_sirven_su_pagina(self):
        for seccion in servidor.SECCIONES:
            for ruta in (f"/{seccion}", f"/{seccion}/"):
                with self.subTest(ruta=ruta):
                    codigo, _, cuerpo = self.pedir(ruta)
                    self.assertEqual(codigo, 200)
                    self.assertIn(f'data-seccion="{seccion}"', cuerpo)

    def test_direcciones_viejas_redirigen_a_la_buena(self):
        casos = {
            "/index.html": "/",
            "/actualidad": "/",
            "/pages/actualidad.html": "/",
        }
        for seccion in servidor.SECCIONES:
            casos[f"/pages/{seccion}.html"] = f"/{seccion}"
        for vieja, buena in casos.items():
            with self.subTest(vieja=vieja):
                codigo, cabeceras, _ = self.pedir(vieja)
                self.assertEqual(codigo, 301)
                self.assertEqual(cabeceras.get("Location"), buena)

    def test_la_consulta_se_conserva_en_direcciones_limpias(self):
        codigo, _, cuerpo = self.pedir("/en-vivo?zona=propias")
        self.assertEqual(codigo, 200)
        self.assertIn('data-seccion="en-vivo"', cuerpo)

    def test_las_carpetas_no_se_listan(self):
        for ruta in ("/assets/", "/js/", "/css/", "/pages/"):
            with self.subTest(ruta=ruta):
                codigo, _, cuerpo = self.pedir(ruta)
                self.assertEqual(codigo, 404)
                self.assertNotIn("Directory listing", cuerpo)

    def test_lo_que_no_existe_da_404(self):
        codigo, _, _ = self.pedir("/no-existe-esta-pagina")
        self.assertEqual(codigo, 404)

    def test_no_se_cachea_en_desarrollo(self):
        _, cabeceras, _ = self.pedir("/css/paleta.css")
        self.assertIn("no-store", cabeceras.get("Cache-Control", ""))


if __name__ == "__main__":
    unittest.main()
