"""
MeteoArchidona · pruebas de estructura del sitio

Comprueban que no se rompen las reglas de la casa que explica el
README: que cada sección esté dada de alta en todos los sitios que
hacen falta, que las páginas carguen lo común en el orden correcto, que
no haya CSS ni JavaScript dentro del HTML, que no se pida nada a
Google Fonts ni a un CDN, y que no haya enlaces a ficheros que no
existen.

No abren ningún navegador ni salen a internet: leen los ficheros. Los
comentarios se quitan antes de mirar, para que un ejemplo o una
explicación escrita en un comentario no cuente como código.

Ejecutar desde la raíz del repositorio:

    python -m unittest discover -s tests -v
"""

import re
import sys
import unittest
import urllib.parse
import xml.etree.ElementTree as ET
from pathlib import Path


RAIZ = Path(__file__).resolve().parent.parent

sys.path.insert(0, str(RAIZ))

import servidor  # noqa: E402  (necesita la raíz en sys.path)


PAGINAS = sorted((RAIZ / "pages").glob("*.html"))

HTML_DEL_SITIO = PAGINAS + sorted((RAIZ / "componentes").glob("*.html")) + [RAIZ / "visores" / "radar.html"]

HOJAS_DEL_SITIO = sorted((RAIZ / "css").glob("*.css")) + [RAIZ / "visores" / "radar.css"]

# Actualidad es la portada: se sirve en "/" y no figura en SECCIONES.
PORTADA = "actualidad"

# Páginas que no deben aparecer en buscadores ni en el sitemap.
PRIVADAS = {"administracion"}

# Observaciones no lleva pie: su mapa ocupa la pantalla entera.
SIN_PIE = {"observaciones"}

# Actualidad tiene su propio motor y hoja de lluvia.
CON_LLUVIA_PROPIA = {"actualidad"}

DOMINIOS_PROHIBIDOS = re.compile(
    r"fonts\.googleapis\.com|fonts\.gstatic\.com|unpkg\.com|cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net"
)


def leer(ruta):
    return ruta.read_text(encoding="utf-8")


def sin_comentarios(ruta):
    """El contenido del fichero sin sus comentarios de HTML o de CSS."""
    texto = leer(ruta)
    if ruta.suffix == ".css":
        return re.sub(r"(?s)/\*.*?\*/", "", texto)
    return re.sub(r"(?s)<!--.*?-->", "", texto)


def nombre(pagina):
    return pagina.stem


def relativa(ruta):
    return ruta.relative_to(RAIZ).as_posix()


def enlaces_locales(texto):
    """Valores de href, src y data-src que apuntan al propio sitio."""
    for valor in re.findall(r'(?:href|src|data-src)="([^"]+)"', texto):
        if valor.startswith(("http:", "https:", "mailto:", "tel:", "#", "data:", "javascript:")):
            continue
        if "${" in valor:
            continue
        yield valor


class TestSecciones(unittest.TestCase):
    """Una sección nueva hay que darla de alta en varios sitios."""

    def setUp(self):
        self.htaccess = leer(RAIZ / ".htaccess")
        self.cabecera = sin_comentarios(RAIZ / "componentes" / "cabecera.html")
        self.sitemap = sin_comentarios(RAIZ / "sitemap.xml")

    def test_cada_seccion_tiene_su_pagina(self):
        for seccion in servidor.SECCIONES:
            with self.subTest(seccion=seccion):
                self.assertTrue((RAIZ / "pages" / f"{seccion}.html").is_file(),
                                f"falta pages/{seccion}.html")

    def test_cada_seccion_esta_en_la_reescritura_del_htaccess(self):
        regla = re.search(r"RewriteRule \^\(([^)]*)\)/\?\$ pages/\$1\.html", self.htaccess)
        self.assertIsNotNone(regla, "no se encuentra la regla de direcciones limpias del .htaccess")
        del_htaccess = set(regla.group(1).split("|"))
        self.assertEqual(del_htaccess, set(servidor.SECCIONES),
                         ".htaccess y SECCIONES de servidor.py no tienen las mismas secciones")

    def test_cada_pagina_esta_en_el_menu(self):
        del_menu = set(re.findall(r'data-seccion="([a-z-]+)"', self.cabecera))
        esperadas = set(servidor.SECCIONES) | {PORTADA}
        self.assertEqual(del_menu, esperadas,
                         "el menú de componentes/cabecera.html no coincide con las secciones")

    def test_cada_pagina_del_disco_es_una_seccion(self):
        del_disco = {nombre(p) for p in PAGINAS}
        esperadas = set(servidor.SECCIONES) | {PORTADA}
        self.assertEqual(del_disco, esperadas,
                         "hay páginas en pages/ que no están dadas de alta, o al revés")

    def test_las_publicas_estan_en_el_sitemap_y_las_privadas_no(self):
        for seccion in servidor.SECCIONES:
            direccion = f"<loc>https://meteoarchidona.com/{seccion}</loc>"
            with self.subTest(seccion=seccion):
                esta = direccion in self.sitemap
                if seccion in PRIVADAS:
                    self.assertFalse(esta, f"{seccion} es privada y no debe estar en sitemap.xml")
                else:
                    self.assertTrue(esta, f"falta {seccion} en sitemap.xml")
        self.assertTrue("<loc>https://meteoarchidona.com/</loc>" in self.sitemap,
                        "falta la portada en sitemap.xml")


class TestPaginas(unittest.TestCase):
    """Lo que tiene que llevar cada página."""

    def test_hojas_comunes_en_orden(self):
        for pagina in PAGINAS:
            texto = sin_comentarios(pagina)
            with self.subTest(pagina=nombre(pagina)):
                posiciones = {hoja: texto.find(f"css/{hoja}.css") for hoja in ("fuentes", "paleta", "cabecera")}
                faltan = [hoja for hoja, posicion in posiciones.items() if posicion == -1]
                self.assertEqual(faltan, [], f"a {nombre(pagina)} le falta enlazar: {faltan}")
                orden = sorted(posiciones, key=posiciones.get)
                self.assertEqual(orden, ["fuentes", "paleta", "cabecera"],
                                 "fuentes.css, paleta.css y cabecera.css tienen que ir en ese orden")

    def test_cabecera_y_seccion_marcada(self):
        for pagina in PAGINAS:
            texto = sin_comentarios(pagina)
            with self.subTest(pagina=nombre(pagina)):
                self.assertTrue('id="cabecera"' in texto, 'falta <div id="cabecera">')
                self.assertTrue("js/cabecera.js" in texto, "falta js/cabecera.js")
                self.assertTrue(f'<body data-seccion="{nombre(pagina)}"' in texto,
                                f'falta <body data-seccion="{nombre(pagina)}">')

    def test_pie_donde_toca(self):
        for pagina in PAGINAS:
            texto = sin_comentarios(pagina)
            with self.subTest(pagina=nombre(pagina)):
                if nombre(pagina) in SIN_PIE:
                    self.assertFalse('id="pie"' in texto, f"{nombre(pagina)} no debe llevar pie")
                else:
                    self.assertTrue('id="pie"' in texto, 'falta <div id="pie">')
                    self.assertTrue("css/pie.css" in texto, "falta css/pie.css")

    def test_lluvia_de_prueba_en_todas(self):
        for pagina in PAGINAS:
            texto = sin_comentarios(pagina)
            with self.subTest(pagina=nombre(pagina)):
                self.assertTrue("js/lluvia.js" in texto, "falta js/lluvia.js")
                if nombre(pagina) in CON_LLUVIA_PROPIA:
                    self.assertIn("js/actualidad/principal.js", texto, "falta js/actualidad/principal.js")
                    self.assertLess(texto.find("js/actualidad/principal.js"), texto.find("js/lluvia.js"),
                                    "lluvia.js tiene que ir detrás de actualidad/principal.js")
                    self.assertFalse("css/lluvia.css" in texto,
                                     "Actualidad tiene su propia hoja de lluvia; no debe cargar lluvia.css")
                else:
                    self.assertTrue("css/lluvia.css" in texto, "falta css/lluvia.css")
                    self.assertLess(texto.find("js/cabecera.js"), texto.find("js/lluvia.js"),
                                    "lluvia.js tiene que ir detrás de cabecera.js")

    def test_iconos_y_metadatos(self):
        for pagina in PAGINAS:
            texto = sin_comentarios(pagina)
            with self.subTest(pagina=nombre(pagina)):
                self.assertTrue('rel="icon"' in texto, "falta el favicon")
                if nombre(pagina) in PRIVADAS:
                    self.assertTrue('name="robots" content="noindex' in texto, "falta noindex")
                    self.assertFalse('rel="canonical"' in texto, "una página privada no lleva canonical")
                else:
                    direccion = "https://meteoarchidona.com/" + ("" if nombre(pagina) == PORTADA else nombre(pagina))
                    self.assertTrue(f'rel="canonical" href="{direccion}"' in texto,
                                    f"falta o está mal el canonical: {direccion}")


class TestHtmlLimpio(unittest.TestCase):
    """Nada de CSS ni JS dentro del HTML, y nada de terceros evitables."""

    def test_sin_style_ni_script_en_linea(self):
        for archivo in HTML_DEL_SITIO:
            texto = sin_comentarios(archivo)
            with self.subTest(archivo=relativa(archivo)):
                self.assertIsNone(re.search(r"<style\b", texto), "hay un <style> dentro del HTML")
                atributo = re.search(r'\sstyle="[^"]*"', texto)
                self.assertIsNone(atributo, f"hay un atributo en línea: {atributo.group(0).strip() if atributo else ''}")
                for codigo in re.findall(r"(?s)<script\b(?![^>]*\bsrc=)[^>]*>(.*?)</script>", texto):
                    self.assertEqual(codigo.strip()[:60], "", "hay un <script> con código dentro del HTML")

    def test_sin_fuentes_ni_cdn_externos(self):
        for archivo in HTML_DEL_SITIO + HOJAS_DEL_SITIO:
            with self.subTest(archivo=relativa(archivo)):
                encontrado = DOMINIOS_PROHIBIDOS.search(sin_comentarios(archivo))
                self.assertIsNone(encontrado,
                                  f"se pide algo a {encontrado.group(0) if encontrado else ''}: "
                                  "tiene que servirse desde el propio sitio")


class TestEnlaces(unittest.TestCase):
    """Todo lo que se enlaza tiene que existir."""

    def test_ficheros_enlazados_existen(self):
        direcciones_limpias = {"/"} | {f"/{s}" for s in servidor.SECCIONES}
        for archivo in HTML_DEL_SITIO:
            for valor in enlaces_locales(sin_comentarios(archivo)):
                ruta = urllib.parse.urlsplit(valor).path
                if ruta in direcciones_limpias:
                    continue
                destino = (RAIZ / ruta.lstrip("/")) if ruta.startswith("/") else (archivo.parent / ruta)
                with self.subTest(archivo=relativa(archivo), enlace=valor):
                    self.assertTrue(destino.resolve().exists(), f"no existe {valor}")

    def test_css_y_js_locales_llevan_version(self):
        """Sin ?v= la caché de una semana del .htaccess serviría la versión vieja."""
        for pagina in PAGINAS + [RAIZ / "visores" / "radar.html"]:
            for valor in enlaces_locales(sin_comentarios(pagina)):
                ruta = urllib.parse.urlsplit(valor).path
                if not re.search(r"\.(css|js)$", ruta) or "/vendor/" in ruta:
                    # Lo de vendor/ lleva la versión en el nombre del fichero.
                    continue
                with self.subTest(pagina=relativa(pagina), enlace=valor):
                    self.assertTrue("?v=" in valor, f"{valor} no lleva ?v=")


IMPORTACION_RELATIVA = re.compile(
    r"""(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)["'](\.{1,2}/[^"']+\.js(?:\?[^"']*)?)["']"""
)


class TestModulosJavaScript(unittest.TestCase):
    """
    Los módulos que importan a otros también deben versionar la dirección.

    Nginx guarda /js/ en la caché del navegador un año (configurar_cache_estaticos.py).
    La versión de la página llega al primer módulo, pero si este importa a otro sin
    ?v=, el navegador seguiría usando el viejo aunque cambie. Y un mismo módulo debe
    importarse siempre con la misma dirección: dos versiones distintas serían dos
    copias del módulo, cada una con su propio estado.
    """

    def importaciones(self):
        for fichero in sorted((RAIZ / "js").rglob("*.js")):
            if "vendor" in fichero.parts:
                continue
            texto = fichero.read_text(encoding="utf-8")
            for especificador in IMPORTACION_RELATIVA.findall(texto):
                yield fichero, especificador

    def test_importaciones_relativas_llevan_version(self):
        for fichero, especificador in self.importaciones():
            with self.subTest(fichero=relativa(fichero), importa=especificador):
                self.assertIn("?v=", especificador, f"{especificador} no lleva ?v=")

    def test_cada_modulo_se_importa_con_una_sola_direccion(self):
        direcciones = {}
        for fichero, especificador in self.importaciones():
            ruta, _, consulta = especificador.partition("?")
            destino = (fichero.parent / ruta).resolve()
            direcciones.setdefault(destino, set()).add(consulta)
        for destino, consultas in direcciones.items():
            with self.subTest(modulo=relativa(destino)):
                self.assertEqual(len(consultas), 1, f"versiones distintas: {sorted(consultas)}")


class TestFechaEnNombreTimelapse(unittest.TestCase):
    """El título de un timelapse lo guarda la API; la web no lo monta."""

    def test_el_formulario_tiene_el_check_y_lo_envia(self):
        pagina = sin_comentarios(RAIZ / "pages" / "administracion.html")
        self.assertIn('id="campoTimelapseFechaEnNombre"', pagina)
        codigo = leer(RAIZ / "js" / "administracion" / "timelapses.js")
        self.assertIn("fecha_en_nombre", codigo)

    def test_la_web_publica_usa_el_nombre_de_la_programacion(self):
        codigo = leer(RAIZ / "js" / "timelapses.js")
        self.assertIn("dato.titulo", codigo)

    def test_las_paginas_cargan_los_principal_con_version_nueva(self):
        """El navegador guarda /js un año: si cambia principal.js, cambia su ?v= en la página."""
        for pagina, patron in (
            ("actualidad", r"actualidad/principal\.js\?v=20261026-titulo2"),
            ("administracion", r"administracion/principal\.js\?v=20261027-estadisticas1"),
        ):
            self.assertRegex(leer(RAIZ / "pages" / f"{pagina}.html"), patron)

    def test_los_scripts_cambiados_llevan_version_nueva(self):
        for ruta, patron in (
            ("js/actualidad/principal.js", r"/js/timelapses\.js\?v=20261026-titulo1"),
            ("js/administracion/principal.js", r"\./timelapses\.js\?v=20261026-nombre2"),
        ):
            self.assertRegex(leer(RAIZ / ruta), patron)


class TestCuenta(unittest.TestCase):
    """Los botones de cuenta de la cabecera (js/cuenta.js, css/cuenta.css)."""

    def test_la_cabecera_tiene_el_hueco_y_carga_los_ficheros_versionados(self):
        cabecera = sin_comentarios(RAIZ / "componentes" / "cabecera.html")
        self.assertIn('id="cuenta-zona"', cabecera)
        codigo = leer(RAIZ / "js" / "cabecera.js")
        for ruta in ("/css/cuenta.css", "/js/cuenta.js"):
            coincidencia = re.search(re.escape(ruta) + r"\?v=[\w-]+", codigo)
            self.assertIsNotNone(coincidencia, f"cabecera.js no carga {ruta} con ?v=")
            self.assertTrue((RAIZ / ruta.lstrip("/")).exists())

    def test_el_interruptor_de_las_cuentas_existe(self):
        """Poner false las oculta de golpe para todos (decisión de José, 26-10-2026: abiertas)."""
        codigo = leer(RAIZ / "js" / "cuenta.js")
        self.assertRegex(codigo, r"const CUENTAS_ABIERTAS = (true|false);")

    def test_la_privacidad_cuenta_lo_que_hacen_las_cuentas(self):
        """Si cuenta.js usa la cookie de sesión, el aviso de privacidad tiene que decirlo."""
        texto = sin_comentarios(RAIZ / "componentes" / "privacidad.html")
        self.assertIn('id="privacidad-cuenta"', texto)
        self.assertIn("ma_sesion", texto)
        self.assertIn("30 días", texto)
        self.assertIn("7 días", texto)
        self.assertNotIn("No usamos cookies", texto)

    def test_cuenta_no_guarda_nada_sensible_en_el_navegador(self):
        """El PIN y la sesión no se escriben en localStorage: la cookie es HttpOnly."""
        codigo = leer(RAIZ / "js" / "cuenta.js")
        self.assertNotIn("sessionStorage", codigo)
        self.assertEqual(codigo.count("localStorage.setItem"), 1)


class TestFicherosDelSitio(unittest.TestCase):

    def test_sitemap_es_xml_valido(self):
        ET.parse(RAIZ / "sitemap.xml")

    def test_robots_apunta_al_sitemap_y_oculta_la_administracion(self):
        robots = leer(RAIZ / "robots.txt")
        self.assertTrue("Sitemap: https://meteoarchidona.com/sitemap.xml" in robots,
                        "robots.txt no apunta al sitemap")
        self.assertTrue("Disallow: /administracion" in robots,
                        "robots.txt no excluye la administración")


if __name__ == "__main__":
    unittest.main()
