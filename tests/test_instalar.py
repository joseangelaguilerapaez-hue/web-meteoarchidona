# -*- coding: utf-8 -*-

"""
Pruebas del botón «Instalar la aplicación» del pie.

Lo que se vigila, por orden de importancia:

- que el botón no se enseñe a quien no puede instalar, que es lo único
  que puede quedar feo de verdad: un botón que no hace nada;

- que el pie y el script hablen el mismo idioma (data-instalar,
  data-instalable y .pie-sitio-instalable), porque están en tres
  ficheros distintos y nada avisa si uno cambia de nombre;

- que las páginas con pie carguen el script, con `?v=`.
"""

import re
import unittest
from pathlib import Path


RAIZ = Path(
    __file__
).resolve().parent.parent

PIE = (RAIZ / "componentes" / "pie.html").read_text(
    encoding="utf-8"
)

SCRIPT = (RAIZ / "js" / "instalar.js").read_text(
    encoding="utf-8"
)

HOJA = (RAIZ / "css" / "pie.css").read_text(
    encoding="utf-8"
)


def paginas_con_pie():
    """Las páginas que montan el pie; Observaciones no lo lleva."""

    return [
        pagina
        for pagina in sorted((RAIZ / "pages").glob("*.html"))
        if 'id="pie"' in pagina.read_text(encoding="utf-8")
    ]


class TestBotonDelPie(unittest.TestCase):

    def test_el_pie_trae_el_boton(self):
        self.assertIn("data-instalar", PIE)
        self.assertIn("Instalar la aplicación", PIE)

    def test_el_boton_va_dentro_de_una_envoltura_que_se_puede_esconder(self):
        """Se esconde el <li> entero: si no, queda el hueco de la lista."""

        self.assertRegex(
            PIE,
            r'<li class="pie-sitio-instalable">',
        )

    def test_la_hoja_lo_esconde_de_salida(self):
        bloque = re.search(
            r"\.pie-sitio-instalable\s*\{([^}]*)\}",
            HOJA,
        )

        self.assertIsNotNone(bloque, "falta la regla que lo esconde")
        self.assertIn("display: none", bloque.group(1))

    def test_solo_se_ve_con_el_atributo_de_la_raiz(self):
        """El script no toca el botón: pone data-instalable en <html>."""

        self.assertIn(
            ":root[data-instalable] .pie-sitio-instalable",
            HOJA,
        )

        self.assertIn("RAIZ.dataset.instalable", SCRIPT)


class TestElScript(unittest.TestCase):

    def test_no_se_enseña_si_ya_esta_instalada(self):
        self.assertIn("display-mode: standalone", SCRIPT)
        self.assertIn("navigator.standalone", SCRIPT)

    def test_guarda_la_peticion_de_chrome_en_vez_de_dejarla_pasar(self):
        """Sin preventDefault el navegador saca su aviso cuando quiere."""

        self.assertIn("beforeinstallprompt", SCRIPT)
        self.assertIn("evento.preventDefault()", SCRIPT)

    def test_reconoce_a_los_navegadores_de_ios_que_no_instalan(self):
        """Chrome y Firefox de iPhone no tienen «Añadir a inicio»."""

        for navegador in ("CriOS", "FxiOS", "EdgiOS"):
            with self.subTest(navegador=navegador):
                self.assertIn(navegador, SCRIPT)

    def test_recoge_el_boton_cuando_termina_la_instalacion(self):
        self.assertIn("appinstalled", SCRIPT)

    def test_escucha_por_delegacion(self):
        """El pie llega tarde: no se puede buscar el botón al arrancar."""

        self.assertIn('document.addEventListener("click"', SCRIPT)
        self.assertIn('closest("[data-instalar]")', SCRIPT)


class TestNoSeQuedaCallado(unittest.TestCase):
    """
    El fallo del 2 de noviembre: el botón se veía y no hacía nada.

    El aviso de Chrome solo sirve una vez. Al cerrarlo sin instalar, el
    código lo guardaba y lo reutilizaba; la segunda llamada lanza
    InvalidStateError y, sin recogerlo, el botón parecía roto.
    """

    def test_la_peticion_se_suelta_antes_de_usarla(self):
        """Gastada queda, se use bien o mal: no se puede reutilizar."""

        cuerpo = SCRIPT.split("async function instalar(")[1]

        soltar = cuerpo.find("peticionGuardada = null")
        usar = cuerpo.find("peticion.prompt()")

        self.assertGreater(soltar, -1, "no se suelta la petición")
        self.assertGreater(usar, -1, "no se abre el diálogo")
        self.assertLess(soltar, usar, "se usa antes de soltarla")

    def test_el_dialogo_del_sistema_va_protegido(self):
        """Si prompt() falla, se explica en vez de no hacer nada."""

        cuerpo = SCRIPT.split("async function instalar(")[1]

        self.assertIn("try {", cuerpo)
        self.assertIn("} catch (error) {", cuerpo)

    def test_sin_peticion_el_boton_explica(self):
        manejador = SCRIPT.split('closest("[data-instalar]")')[1]

        self.assertIn("explicar()", manejador)

    def test_hay_pasos_para_cada_navegador_que_puede_instalar(self):
        for familia in ("ios-safari", "samsung", "chrome", "edge"):
            with self.subTest(familia=familia):
                self.assertIn(familia, SCRIPT)

    def test_el_boton_sale_aunque_no_haya_llegado_el_aviso(self):
        """En Chrome o Samsung siempre se puede instalar a mano."""

        self.assertIn("PUEDE_INSTALAR", SCRIPT)
        self.assertIn('RAIZ.dataset.instalable = "manual"', SCRIPT)

    def test_la_hoja_lo_enseña_sea_cual_sea_el_valor(self):
        """nativo o manual: la regla mira si el atributo está, no qué vale."""

        self.assertIn(":root[data-instalable] .pie-sitio-instalable", HOJA)
        self.assertNotIn('data-instalable="nativo"', HOJA)

    def test_si_no_hay_showModal_la_ventana_se_abre_igual(self):
        self.assertIn("showModal", SCRIPT)
        self.assertIn('setAttribute("open"', SCRIPT)


class TestPaginas(unittest.TestCase):

    def test_las_paginas_publicas_con_pie_cargan_el_script(self):
        for pagina in paginas_con_pie():

            # Administración es panel interno: no se promociona ahí.
            if pagina.name == "administracion.html":
                continue

            with self.subTest(pagina=pagina.name):
                self.assertRegex(
                    pagina.read_text(encoding="utf-8"),
                    r'js/instalar\.js\?v=[^"]+',
                )


if __name__ == "__main__":
    unittest.main()
