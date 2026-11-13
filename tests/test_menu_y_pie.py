# -*- coding: utf-8 -*-

"""
Cabecera y pie con muchas secciones (13-11-2026).

Con quince secciones, el menú de cuatro columnas dejaba cuatro filas y un
hueco, y el pie las ponía todas en una columna de quince. Ahora el menú
va de cinco en cinco con la última fila centrada, y el pie en columnas de
cinco. Estas pruebas vigilan que una sección nueva no lo vuelva a romper.
"""

import re
import unittest
from pathlib import Path


RAIZ = Path(__file__).resolve().parent.parent

CABECERA_HTML = (RAIZ / "componentes" / "cabecera.html").read_text(encoding="utf-8")
CABECERA_CSS = (RAIZ / "css" / "cabecera.css").read_text(encoding="utf-8")
PIE_CSS = (RAIZ / "css" / "pie.css").read_text(encoding="utf-8")


class TestMenu(unittest.TestCase):

    def test_en_escritorio_va_de_cinco_en_cinco_y_centra_la_ultima_fila(self):
        bloque = re.search(
            r"@media \(min-width: 1051px\) and \(min-height: 561px\) \{(.*?)\n\}",
            CABECERA_CSS,
            re.DOTALL,
        )

        self.assertIsNotNone(bloque, "falta el bloque de escritorio del menú")

        cuerpo = bloque.group(1)

        self.assertIn("display: flex", cuerpo)
        self.assertIn("flex-wrap: wrap", cuerpo)
        self.assertIn("justify-content: center", cuerpo)
        self.assertIn("calc((100% - 4 * 8px) / 5)", cuerpo)

    def test_el_bloque_de_escritorio_va_detras_de_la_regla_de_1250(self):
        """La de 1250 px pone justify-content: stretch; tiene que perder."""

        self.assertLess(
            CABECERA_CSS.index("max-width: 1250px"),
            CABECERA_CSS.index("@media (min-width: 1051px) and (min-height: 561px)"),
        )

    def test_las_secciones_del_menu_son_las_que_se_esperan(self):
        """Si cambia el número, mirar la cabecera y el pie en pantalla."""

        secciones = re.findall(r'^\s+data-seccion="([^"]+)"', CABECERA_HTML, re.MULTILINE)

        self.assertEqual(len(secciones), 15, secciones)


class TestPie(unittest.TestCase):

    def test_las_secciones_van_en_columnas_de_cinco(self):
        regla = re.search(r"#pie-secciones \{([^}]*)\}", PIE_CSS)

        self.assertIsNotNone(regla)
        self.assertIn("grid-template-rows: repeat(5, auto)", regla.group(1))
        self.assertIn("grid-auto-flow: column", regla.group(1))

    def test_en_movil_son_dos_columnas(self):
        movil = PIE_CSS[PIE_CSS.index("@media (max-width: 720px)"):]

        self.assertIn("grid-template-rows: repeat(8, auto)", movil)


if __name__ == "__main__":
    unittest.main()
