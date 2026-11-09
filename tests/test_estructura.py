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
PRIVADAS = {"administracion", "mi-cuenta"}

# Se llega desde el botón con el nombre del usuario, no desde el menú.
FUERA_DEL_MENU = {"mi-cuenta"}

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
        esperadas = (set(servidor.SECCIONES) - FUERA_DEL_MENU) | {PORTADA}
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
                    self.assertLess(texto.find("js/actualidad.js"), texto.find("js/lluvia.js"),
                                    "lluvia.js tiene que ir detrás de actualidad.js")
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
            ("actualidad", r"actualidad/principal\.js\?v=20261109-olivar2"),
            ("administracion", r"administracion/principal\.js\?v=20261108-ficha1"),
        ):
            self.assertRegex(leer(RAIZ / "pages" / f"{pagina}.html"), patron)

    def test_los_scripts_cambiados_llevan_version_nueva(self):
        for ruta, patron in (
            ("js/actualidad/principal.js", r"/js/timelapses\.js\?v=20261104-camara1"),
            ("js/administracion/principal.js", r"\./timelapses\.js\?v=20261029-una-vez1"),
        ):
            self.assertRegex(leer(RAIZ / ruta), patron)


class TestConfiguracion(unittest.TestCase):
    """Administración → Configuración (parámetros de la web, 1 nov)."""

    def test_menu_y_seccion(self):
        pagina = sin_comentarios(RAIZ / "pages" / "administracion.html")
        self.assertIn('data-modulo="configuracion"', pagina)
        self.assertIn('id="modulo-configuracion"', pagina)
        self.assertIn('id="listaConfiguracion"', pagina)
        self.assertIn('id="estadoConfiguracion"', pagina)

    def test_modulo_y_version(self):
        principal = leer(RAIZ / "js" / "administracion" / "principal.js")
        self.assertIn("./configuracion.js?v=20261103-vigencia2", principal)
        codigo = leer(RAIZ / "js" / "administracion" / "configuracion.js")
        self.assertIn('"/admin/configuracion"', codigo)
        self.assertIn("valores_por_icono", codigo)
        self.assertIn("/apartados", codigo)
        self.assertIn("pestanasConfiguracion", codigo)
        self.assertIn("export async function cargarConfiguracion", codigo)
        # Sin interruptor (todos menos el distintivo): ni casilla «Activo»
        # ni otra cosa que activo = true al guardar.
        self.assertIn("parametro.con_interruptor !== false", codigo)
        self.assertIn("?.checked ?? true", codigo)
        self.assertIn('valor.entero ? "1" : "any"', codigo)
        self.assertIn("valor.unidad", codigo)
        self.assertIn("parametro.aviso", codigo)
        # Cuenta atrás de la vigencia: días exactos desde el último guardado.
        self.assertIn("function ponerCuentaAtras", codigo)
        self.assertIn("fecha_actualizacion", codigo)
        self.assertIn(
            "administracion.css?v=20261108-ficha1",
            leer(RAIZ / "pages" / "administracion.html"),
        )


class TestUsuariosAdministracion(unittest.TestCase):
    """Administración → Usuarios y entrada sin PIN de los administradores (4 nov)."""

    def test_pagina(self):
        pagina = sin_comentarios(RAIZ / "pages" / "administracion.html")
        self.assertIn('data-modulo="usuarios"', pagina)
        self.assertIn('id="modulo-usuarios"', pagina)
        self.assertIn('id="listaUsuarios"', pagina)
        self.assertIn('id="buscarUsuarios"', pagina)
        self.assertIn('id="botonEntrarConCuenta"', pagina)

    def test_modulo(self):
        principal = leer(RAIZ / "js" / "administracion" / "principal.js")
        self.assertIn("./usuarios.js?v=20261108-ficha1", principal)
        self.assertIn("./acceso.js?v=20261104-usuarios1", principal)
        codigo = leer(RAIZ / "js" / "administracion" / "usuarios.js")
        self.assertIn('"/admin/usuarios"', codigo)
        self.assertIn("es_administrador", codigo)
        self.assertIn('method: "PATCH"', codigo)
        self.assertIn("/reenviar-activacion", codigo)
        self.assertIn("./ficha-usuario.js?v=20261108-ficha1", codigo)
        ficha = leer(RAIZ / "js" / "administracion" / "ficha-usuario.js")
        for ruta in ("/estado", "/enviar-cambio-pin", "/cerrar-sesiones", "/borrar", "/suscripciones"):
            self.assertIn(ruta, ficha)

    def test_entrada_con_cuenta(self):
        codigo = leer(RAIZ / "js" / "administracion" / "acceso.js")
        self.assertIn('"/admin/acceso/cuenta"', codigo)
        self.assertIn('credentials:"same-origin"', codigo)
        self.assertIn("renovarConCuenta", codigo)


class TestMiCuenta(unittest.TestCase):
    """Página «Mi cuenta» y suscripciones (4 nov; docs/usuarios.md de la API, 8.5 y 8.6)."""

    def test_pagina(self):
        pagina = sin_comentarios(RAIZ / "pages" / "mi-cuenta.html")
        for identificador in (
            "pestana-datos",
            "pestana-suscripciones",
            "pestana-preferencias",
            "listaSuscripciones",
            "formularioSuscripcion",
            "listaPreferencias",
        ):
            self.assertIn(f'id="{identificador}"', pagina)
        self.assertIn('data-cuenta-accion="baja"', pagina)
        self.assertIn('data-cuenta-accion="pin-olvidado"', pagina)
        self.assertIn("mi-cuenta.js?v=20261104-mi-cuenta1", pagina)
        self.assertIn('name="robots" content="noindex, nofollow"', pagina)

    def test_modulo(self):
        codigo = leer(RAIZ / "js" / "mi-cuenta.js")
        self.assertIn('"/usuarios/suscripciones/catalogo"', codigo)
        self.assertIn('"/configuracion/usuario"', codigo)
        self.assertIn("Gratis", codigo)
        self.assertIn('credentials: "same-origin"', codigo)

    def test_el_nombre_lleva_a_mi_cuenta(self):
        self.assertIn('window.location.assign("/mi-cuenta")', leer(RAIZ / "js" / "cuenta.js"))
        self.assertIn("/js/cuenta.js?v=20261104-mi-cuenta1", leer(RAIZ / "js" / "cabecera.js"))

    def test_precios_en_administracion(self):
        self.assertIn('id="listaServiciosSuscripcion"', sin_comentarios(RAIZ / "pages" / "administracion.html"))
        self.assertIn('"/admin/suscripciones/servicios"', leer(RAIZ / "js" / "administracion" / "usuarios.js"))


class TestTimelapseUnaSolaVez(unittest.TestCase):
    """Programaciones de una sola vez: fecha concreta, sin repetirse (29 oct)."""

    def test_el_formulario_ofrece_el_tipo_y_la_fecha(self):
        pagina = sin_comentarios(RAIZ / "pages" / "administracion.html")
        self.assertIn('value="UNA_VEZ"', pagina)
        self.assertIn('id="campoTimelapseFechaLocal"', pagina)
        self.assertIn('id="bloqueTimelapseFechaLocal"', pagina)

    def test_el_editor_envia_la_fecha(self):
        codigo = leer(RAIZ / "js" / "administracion" / "timelapses.js")
        self.assertIn("UNA_VEZ", codigo)
        self.assertIn("fecha_local: fecha", codigo)


class TestDirectoConInstrumentos(unittest.TestCase):
    """Desde el 31-10-2026 los instrumentos van grabados en el vídeo en directo."""

    def test_en_directo_el_visor_no_repite_cifras_ni_marca(self):
        css = leer(RAIZ / "css" / "visor-video.css")
        self.assertRegex(css, r"\.visor-video:not\(\.modo-mp4\)\s*\.visor-video-meteo")
        self.assertRegex(css, r"\.visor-video:not\(\.modo-mp4\)\s*\.visor-video-marca")

    def test_el_visor_carga_la_hoja_nueva(self):
        self.assertIn(
            "visor-video.css?v=20261101-termometro1",
            leer(RAIZ / "visores" / "video.html"),
        )

    def test_pantalla_completa_en_horizontal(self):
        """2-11-2026: la PWA fija vertical; la pantalla completa pide horizontal y la libera al salir."""

        for nombre in ("visor-video.js", "visor-video-multimedia.js"):
            codigo = leer(RAIZ / "js" / nombre)
            self.assertIn('screen.orientation.lock("landscape")', codigo, nombre)
            self.assertIn("screen.orientation.unlock()", codigo, nombre)
            self.assertIn("liberarOrientacion();", codigo, nombre)

    def test_pantalla_completa_youtube_en_horizontal(self):
        """2-11-2026: la pantalla completa de YouTube también gira a horizontal."""

        codigo = leer(RAIZ / "visores" / "youtube.js")
        self.assertIn("orientacion.lock('landscape')", codigo)
        self.assertIn("orientacion.unlock()", codigo)
        self.assertIn("'fullscreenchange'", codigo)
        self.assertIn("'webkitfullscreenchange'", codigo)
        self.assertIn(
            "youtube.js?v=20261102-horizontal1",
            leer(RAIZ / "visores" / "youtube.html"),
        )

    def test_controles_bajo_el_termometro(self):
        """Decisión de José del 1-11-2026: el botón no tapa la barra de humedad."""

        codigo = leer(RAIZ / "js" / "visor-video.js")
        self.assertIn("junto-termometro", codigo)
        self.assertIn("CONTROLES_TERMOMETRO_X", codigo)
        # Vídeo muy pequeño: botones pequeños para no tapar el logotipo.
        self.assertIn('"pequenos"', codigo)
        self.assertIn(
            "visor-video.js?v=20261102-horizontal1",
            leer(RAIZ / "js" / "visor-video-multimedia.js"),
        )
        self.assertIn(
            "visor-video-multimedia.js?v=20261102-horizontal1",
            leer(RAIZ / "visores" / "video.html"),
        )
        self.assertRegex(
            leer(RAIZ / "css" / "visor-video.css"),
            r"\.visor-video-controles\.junto-termometro\s*\{",
        )
        self.assertRegex(
            leer(RAIZ / "css" / "visor-video.css"),
            r"\.visor-video-controles\.junto-termometro\.pequenos",
        )


class TestCompartirModelos(unittest.TestCase):
    """Compartir en Facebook el resumen de los modelos (3-11-2026)."""

    def test_solo_administradores_y_carga_diferida(self):
        componente = leer(RAIZ / "js" / "modelos-numericos.js")
        self.assertIn("hayAdministrador()", componente)
        self.assertRegex(componente, r'import\("\./compartir-modelos\.js\?v=[\w-]+"\)')
        codigo = leer(RAIZ / "js" / "compartir-modelos.js")
        self.assertIn("meteoarchidona_admin_token", codigo)

    def test_el_silo_a_todas_las_alturas(self):
        codigo = leer(RAIZ / "js" / "compartir-modelos.js")
        self.assertIn('const PUNTO = "EL_SILO"', codigo)
        for variable in ("2M", "925_HPA", "850_HPA", "700_HPA", "500_HPA"):
            self.assertIn(f'"TEMPERATURA_{variable}"', codigo)
        # Facebook: fotos por el menú de compartir y el texto copiado.
        self.assertIn("navigator.share", codigo)
        self.assertIn("writeText", codigo)

    def test_misma_version_del_componente_en_los_dos_sitios(self):
        """Si no, el navegador cargaría el componente dos veces."""
        version = re.compile(r"modelos-numericos\.js\?v=([\w-]+)")
        prediccion = version.findall(leer(RAIZ / "js" / "prediccion.js"))
        compartir = version.findall(leer(RAIZ / "js" / "compartir-modelos.js"))
        self.assertTrue(prediccion and compartir)
        self.assertEqual(set(prediccion), set(compartir))


class TestDistintivo(unittest.TestCase):
    """Lazo o monigote bajo el logotipo (js/distintivo.js, 3-11-2026)."""

    def test_la_cabecera_carga_los_ficheros_versionados(self):
        codigo = leer(RAIZ / "js" / "cabecera.js")
        for ruta in ("/css/distintivo.css", "/js/distintivo.js"):
            coincidencia = re.search(re.escape(ruta) + r"\?v=[\w-]+", codigo)
            self.assertIsNotNone(coincidencia, f"cabecera.js no carga {ruta} con ?v=")
            self.assertTrue((RAIZ / ruta.lstrip("/")).exists())
        self.assertIn("cargarDistintivo();", codigo)

    def test_lee_la_configuracion_publica_y_solo_pinta_si_esta_activo(self):
        codigo = leer(RAIZ / "js" / "distintivo.js")
        self.assertIn("/configuracion/publica", codigo)
        self.assertIn("!distintivo.activo", codigo)
        self.assertIn("MONIGOTE", codigo)
        # En el móvil, el texto va en un globo grande al tocar el lazo.
        self.assertIn("distintivo-globo", codigo)
        hoja = leer(RAIZ / "css" / "distintivo.css")
        self.assertIn("font-size: 18px", hoja)


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


class TestContadorVisitas(unittest.TestCase):
    """Contador de visitas, montable en cualquier hueco (5-11-2026)."""

    def test_exporta_su_funcion_y_el_pintor_lo_conoce(self):
        codigo = leer(RAIZ / "js" / "componentes" / "contador-visitas.js")
        self.assertIn("export async function montarContadorVisitas(hueco)", codigo)
        self.assertIn("/auditoria/contador-visitas", codigo)
        pintor = leer(RAIZ / "js" / "dashboards" / "pintor.js")
        self.assertRegex(
            pintor,
            r'"contador-visitas": \["/js/componentes/contador-visitas\.js\?v=[\w-]+", "montarContadorVisitas"\]',
        )

    def test_sin_id_para_poder_repetirlo(self):
        codigo = leer(RAIZ / "js" / "componentes" / "contador-visitas.js")
        self.assertNotIn("getElementById", codigo)
        self.assertIsNone(re.search(r"\.id\s*=(?!=)", codigo), "asigna un id")

    def test_la_hoja_existe(self):
        codigo = leer(RAIZ / "js" / "componentes" / "contador-visitas.js")
        ruta = re.search(r'"/(css/contador-visitas\.css)\?v=[\w-]+"', codigo)
        self.assertIsNotNone(ruta)
        self.assertTrue((RAIZ / ruta.group(1)).is_file())


class TestComponentesSol(unittest.TestCase):
    """Componentes del Sol para los dashboards (4-11-2026)."""

    COMPONENTES = {
        "sol-tiempo-espacial": ("tiempo-espacial.js", "montarTiempoEspacial"),
        "sol-alertas": ("alertas-solares.js", "montarAlertasSolares"),
        "sol-directo": ("sol-directo.js", "montarSolDirecto"),
        "sol-indice-kp": ("indice-kp.js", "montarIndiceKp"),
    }

    def test_cada_componente_exporta_su_funcion_y_la_pagina_lo_monta(self):
        pagina = sin_comentarios(RAIZ / "pages" / "sol.html")
        principal = leer(RAIZ / "js" / "sol.js")
        for atributo, (fichero, funcion) in self.COMPONENTES.items():
            with self.subTest(componente=atributo):
                codigo = leer(RAIZ / "js" / "sol" / fichero)
                self.assertIn(f"export function {funcion}(raiz)", codigo)
                self.assertIn(f'data-componente="{atributo}"', pagina)
                self.assertIn(f'"{atributo}": {funcion}', principal)

    def test_sin_id_para_poder_repetirlos(self):
        for _, (fichero, _) in self.COMPONENTES.items():
            with self.subTest(fichero=fichero):
                codigo = leer(RAIZ / "js" / "sol" / fichero)
                self.assertNotIn("getElementById", codigo)
                self.assertIsNone(re.search(r"\.id\s*=(?!=)", codigo), "asigna un id")

    def test_la_hoja_se_carga_sola_y_existe(self):
        comun = leer(RAIZ / "js" / "sol" / "comun.js")
        ruta = re.search(r'"(/css/sol-componentes\.css\?v=[\w-]+)"', comun)
        self.assertIsNotNone(ruta)
        self.assertTrue((RAIZ / "css" / "sol-componentes.css").is_file())
        self.assertIn(ruta.group(1).lstrip("/"), leer(RAIZ / "pages" / "sol.html").replace("../", ""))
        self.assertIn("container-type: inline-size", leer(RAIZ / "css" / "sol-componentes.css"))

    def test_la_pagina_carga_el_modulo(self):
        pagina = sin_comentarios(RAIZ / "pages" / "sol.html")
        self.assertRegex(pagina, r'type="module"\s+src="\.\./js/sol\.js\?v=[\w-]+"')



class TestComponentesEmbalses(unittest.TestCase):
    """Componentes de embalses para la página y los dashboards (5-11-2026)."""

    COMPONENTES = {
        "embalses-resumen": ("resumen.js", "montarResumenEmbalses"),
        "embalses-cuencas": ("cuencas.js", "montarCuencasEmbalses"),
        "embalses-anio-hidrologico": ("anio-hidrologico.js", "montarAnioHidrologico"),
        "embalses-lista": ("lista.js", "montarListaEmbalses"),
        "embalses-ficha": ("ficha.js", "montarFichaEmbalse"),
        "embalses-comarca": ("comarca.js", "montarComarcaEmbalses"),
    }

    def test_cada_componente_exporta_su_funcion_y_la_pagina_lo_monta(self):
        pagina = sin_comentarios(RAIZ / "pages" / "embalses.html")
        principal = leer(RAIZ / "js" / "embalses.js")
        pintor = leer(RAIZ / "js" / "dashboards" / "pintor.js")
        for atributo, (fichero, funcion) in self.COMPONENTES.items():
            with self.subTest(componente=atributo):
                codigo = leer(RAIZ / "js" / "embalses" / fichero)
                self.assertRegex(codigo, rf"export (async )?function {funcion}\(raiz\)")
                self.assertIn(f'data-componente="{atributo}"', pagina)
                self.assertIn(f'"{atributo}": {funcion}', principal)
                self.assertIn(f'"{atributo}": ["/js/embalses/{fichero}?v=', pintor)
                self.assertIn(f'"{funcion}"]', pintor)

    def test_sin_id_para_poder_repetirlos(self):
        for _, (fichero, _) in self.COMPONENTES.items():
            with self.subTest(fichero=fichero):
                codigo = leer(RAIZ / "js" / "embalses" / fichero)
                self.assertNotIn("getElementById", codigo)
                self.assertIsNone(re.search(r"\.id\s*=(?!=)", codigo), "asigna un id")

    def test_la_hoja_se_carga_sola_y_lleva_su_paleta(self):
        comun = leer(RAIZ / "js" / "embalses" / "comun.js")
        ruta = re.search(r'"(/css/embalses-componentes\.css\?v=[\w-]+)"', comun)
        self.assertIsNotNone(ruta)
        self.assertIn(ruta.group(1).lstrip("/"), leer(RAIZ / "pages" / "embalses.html").replace("../", ""))
        hoja = leer(RAIZ / "css" / "embalses-componentes.css")
        self.assertIn("container-type: inline-size", hoja)
        # La paleta de agua va en la hoja de los componentes, no en paleta.css.
        self.assertIn("--emb-profundo", hoja)
        self.assertNotIn("--emb-", leer(RAIZ / "css" / "paleta.css"))

    def test_la_pagina_carga_el_modulo_y_la_api(self):
        pagina = sin_comentarios(RAIZ / "pages" / "embalses.html")
        self.assertRegex(pagina, r'type="module"\s+src="\.\./js/embalses\.js\?v=[\w-]+"')
        self.assertIn("js/api.js", pagina)

    def test_el_alta_en_nginx_existe(self):
        self.assertIn('modulo.SECCION = "embalses"', leer(RAIZ / "scripts" / "configurar_seccion_embalses.py"))


class TestComponentesSismologia(unittest.TestCase):
    """Componentes de sismología para la página y los dashboards (8-11-2026)."""

    COMPONENTES = {
        "sismologia-aviso": ("aviso.js", "montarAvisoTerremoto"),
        "sismologia-ultimo": ("ultimo.js", "montarUltimoTerremoto"),
        "sismologia-resumen": ("resumen.js", "montarResumenSismico"),
        "sismologia-mapa": ("mapa.js", "montarMapaTerremotos"),
        "sismologia-lista": ("lista.js", "montarListaTerremotos"),
        "sismologia-estadisticas": ("estadisticas.js", "montarEstadisticasSismicas"),
        "sismologia-helicorder": ("helicorder.js", "montarHelicorder"),
    }

    def test_cada_componente_exporta_su_funcion_y_la_pagina_lo_monta(self):
        pagina = sin_comentarios(RAIZ / "pages" / "sismologia.html")
        principal = leer(RAIZ / "js" / "sismologia.js")
        pintor = leer(RAIZ / "js" / "dashboards" / "pintor.js")
        for atributo, (fichero, funcion) in self.COMPONENTES.items():
            with self.subTest(componente=atributo):
                codigo = leer(RAIZ / "js" / "sismologia" / fichero)
                self.assertRegex(codigo, rf"export (async )?function {funcion}\(raiz\)")
                self.assertIn(f'data-componente="{atributo}"', pagina)
                self.assertIn(f'"{atributo}": {funcion}', principal)
                self.assertIn(f'"{atributo}": ["/js/sismologia/{fichero}?v=', pintor)
                self.assertIn(f'"{funcion}"]', pintor)

    def test_sin_id_para_poder_repetirlos(self):
        for _, (fichero, _) in self.COMPONENTES.items():
            with self.subTest(fichero=fichero):
                codigo = leer(RAIZ / "js" / "sismologia" / fichero)
                self.assertNotIn("getElementById", codigo)
                self.assertIsNone(re.search(r"\.id\s*=(?!=)", codigo), "asigna un id")

    def test_la_hoja_se_carga_sola_y_lleva_su_paleta_basalto_y_magma(self):
        comun = leer(RAIZ / "js" / "sismologia" / "comun.js")
        ruta = re.search(r'"(/css/sismologia-componentes\.css\?v=[\w-]+)"', comun)
        self.assertIsNotNone(ruta)
        self.assertIn(ruta.group(1).lstrip("/"), leer(RAIZ / "pages" / "sismologia.html").replace("../", ""))
        hoja = leer(RAIZ / "css" / "sismologia-componentes.css")
        self.assertIn("container-type: inline-size", hoja)
        # «Basalto y magma» (José, 8-11-2026): los cinco colores de magnitud.
        for color in ("#c7cdd3", "#f2b705", "#f27405", "#d92b04", "#7a0b0b", "#d9480f", "#2f3b45"):
            self.assertIn(color, hoja.lower())
        for color in ("#C7CDD3", "#F2B705", "#F27405", "#D92B04", "#7A0B0B"):
            self.assertIn(color, comun)
        self.assertNotIn("--sis-", leer(RAIZ / "css" / "paleta.css"))

    def test_leaflet_es_el_del_sitio(self):
        comun = leer(RAIZ / "js" / "sismologia" / "comun.js")
        self.assertIn('"/js/vendor/leaflet-1.9.4.js"', comun)
        self.assertTrue((RAIZ / "js" / "vendor" / "leaflet-1.9.4.js").is_file())

    def test_la_pagina_carga_el_modulo_y_la_api(self):
        pagina = sin_comentarios(RAIZ / "pages" / "sismologia.html")
        self.assertRegex(pagina, r'type="module"\s+src="\.\./js/sismologia\.js\?v=[\w-]+"')
        self.assertIn("js/api.js", pagina)

    def test_el_alta_en_nginx_existe(self):
        self.assertIn('modulo.SECCION = "sismologia"', leer(RAIZ / "scripts" / "configurar_seccion_sismologia.py"))


class TestComponentesPolen(unittest.TestCase):
    """Componentes de polen para la página y los dashboards (6-11-2026)."""

    COMPONENTES = {
        "polen-hoy": ("hoy.js", "montarPolenHoy"),
        "polen-prevision": ("prevision.js", "montarPolenPrevision"),
        "polen-semana": ("semana.js", "montarPolenSemana"),
        "polen-serie": ("serie.js", "montarPolenSerie"),
        "polen-calendario": ("calendario.js", "montarPolenCalendario"),
    }

    def test_cada_componente_exporta_su_funcion_y_la_pagina_lo_monta(self):
        pagina = sin_comentarios(RAIZ / "pages" / "polen.html")
        principal = leer(RAIZ / "js" / "polen.js")
        pintor = leer(RAIZ / "js" / "dashboards" / "pintor.js")
        for atributo, (fichero, funcion) in self.COMPONENTES.items():
            with self.subTest(componente=atributo):
                codigo = leer(RAIZ / "js" / "polen" / fichero)
                self.assertRegex(codigo, rf"export (async )?function {funcion}\(raiz\)")
                self.assertIn(f'data-componente="{atributo}"', pagina)
                self.assertIn(f'"{atributo}": {funcion}', principal)
                self.assertIn(f'"{atributo}": ["/js/polen/{fichero}?v=', pintor)
                self.assertIn(f'"{funcion}"]', pintor)

    def test_sin_id_para_poder_repetirlos(self):
        for _, (fichero, _) in self.COMPONENTES.items():
            with self.subTest(fichero=fichero):
                codigo = leer(RAIZ / "js" / "polen" / fichero)
                self.assertNotIn("getElementById", codigo)
                self.assertIsNone(re.search(r"\.id\s*=(?!=)", codigo), "asigna un id")

    def test_la_hoja_se_carga_sola_y_lleva_su_paleta_de_campo(self):
        comun = leer(RAIZ / "js" / "polen" / "comun.js")
        ruta = re.search(r'"(/css/polen-componentes\.css\?v=[\w-]+)"', comun)
        self.assertIsNotNone(ruta)
        self.assertIn(ruta.group(1).lstrip("/"), leer(RAIZ / "pages" / "polen.html").replace("../", ""))
        hoja = leer(RAIZ / "css" / "polen-componentes.css")
        self.assertIn("container-type: inline-size", hoja)
        # Verdes y marrones (José, 6-11-2026), en la hoja de los componentes.
        for variable in ("--pol-olivo", "--pol-tierra", "--pol-corteza"):
            self.assertIn(variable, hoja)
        self.assertNotIn("--pol-", leer(RAIZ / "css" / "paleta.css"))

    def test_la_pagina_carga_el_modulo_y_la_api(self):
        pagina = sin_comentarios(RAIZ / "pages" / "polen.html")
        self.assertRegex(pagina, r'type="module"\s+src="\.\./js/polen\.js\?v=[\w-]+"')
        self.assertIn("js/api.js", pagina)

    def test_el_alta_en_nginx_existe(self):
        self.assertIn('modulo.SECCION = "polen"', leer(RAIZ / "scripts" / "configurar_seccion_polen.py"))


class TestComponentesOlivar(unittest.TestCase):
    """Componentes de El Olivar para la página y los dashboards (9-11-2026)."""

    COMPONENTES = {
        "olivar-aviso": ("aviso.js", "montarAvisoOlivar"),
        "olivar-resumen": ("resumen.js", "montarResumenOlivar"),
        "olivar-frio": ("frio.js", "montarFrioOlivar"),
        "olivar-heladas": ("heladas.js", "montarHeladasOlivar"),
        "olivar-grados-dia": ("grados-dia.js", "montarGradosDiaOlivar"),
        "olivar-balance": ("balance.js", "montarBalanceOlivar"),
    }

    def test_cada_componente_exporta_su_funcion_y_la_pagina_lo_monta(self):
        pagina = sin_comentarios(RAIZ / "pages" / "olivar.html")
        principal = leer(RAIZ / "js" / "olivar.js")
        pintor = leer(RAIZ / "js" / "dashboards" / "pintor.js")
        for atributo, (fichero, funcion) in self.COMPONENTES.items():
            with self.subTest(componente=atributo):
                codigo = leer(RAIZ / "js" / "olivar" / fichero)
                self.assertRegex(codigo, rf"export (async )?function {funcion}\(raiz\)")
                self.assertIn(f'data-componente="{atributo}"', pagina)
                self.assertIn(f'"{atributo}": {funcion}', principal)
                self.assertIn(f'"{atributo}": ["/js/olivar/{fichero}?v=', pintor)
                self.assertIn(f'"{funcion}"]', pintor)

    def test_sin_id_para_poder_repetirlos(self):
        for _, (fichero, _) in self.COMPONENTES.items():
            with self.subTest(fichero=fichero):
                codigo = leer(RAIZ / "js" / "olivar" / fichero)
                self.assertNotIn("getElementById", codigo)
                self.assertIsNone(re.search(r"\.id\s*=(?!=)", codigo), "asigna un id")

    def test_la_hoja_se_carga_sola_y_lleva_su_gama_aceite_y_oro(self):
        comun = leer(RAIZ / "js" / "olivar" / "comun.js")
        ruta = re.search(r'"(/css/olivar-componentes\.css\?v=[\w-]+)"', comun)
        self.assertIsNotNone(ruta)
        self.assertIn(ruta.group(1).lstrip("/"), leer(RAIZ / "pages" / "olivar.html").replace("../", ""))
        hoja = leer(RAIZ / "css" / "olivar-componentes.css")
        self.assertIn("container-type: inline-size", hoja)
        # «Aceite y oro» (José, 9-11-2026), en la hoja de los componentes.
        for variable in ("--oli-oro", "--oli-ambar", "--oli-aceite", "--oli-helada"):
            self.assertIn(variable, hoja)
        self.assertNotIn("--oli-", leer(RAIZ / "css" / "paleta.css"))

    def test_la_pagina_carga_el_modulo_la_api_y_el_aviso(self):
        pagina = sin_comentarios(RAIZ / "pages" / "olivar.html")
        self.assertRegex(pagina, r'type="module"\s+src="\.\./js/olivar\.js\?v=[\w-]+"')
        self.assertIn("js/api.js", pagina)
        self.assertIn("técnico agrícola", pagina)

    def test_esta_en_el_menu(self):
        self.assertIn('href="/olivar"', leer(RAIZ / "componentes" / "cabecera.html"))

    def test_el_alta_en_nginx_existe(self):
        self.assertIn('modulo.SECCION = "olivar"', leer(RAIZ / "scripts" / "configurar_seccion_olivar.py"))


class TestNovedades(unittest.TestCase):
    """Ventana de novedades en la portada y su Administración (5-11-2026)."""

    def test_la_portada_carga_la_ventana(self):
        pagina = sin_comentarios(RAIZ / "pages" / "actualidad.html")
        self.assertRegex(pagina, r'type="module"\s+src="\.\./js/novedades\.js\?v=[\w-]+"')
        codigo = leer(RAIZ / "js" / "novedades.js")
        self.assertIn("/novedades", codigo)
        self.assertIn("localStorage", codigo)
        # El texto nunca se mete como HTML.
        self.assertNotIn("innerHTML", codigo)

    def test_administracion_tiene_su_apartado(self):
        pagina = sin_comentarios(RAIZ / "pages" / "administracion.html")
        self.assertIn('data-modulo="novedades"', pagina)
        self.assertIn('id="modulo-novedades"', pagina)
        self.assertIn("css/novedades-admin.css", pagina)
        principal = leer(RAIZ / "js" / "administracion" / "principal.js")
        self.assertIn('"./novedades.js?v=', principal)
        self.assertNotIn("innerHTML", leer(RAIZ / "js" / "administracion" / "novedades.js"))


class TestComponenteEstadistica(unittest.TestCase):
    """Estadística del catálogo como componente montable (José, 5-11-2026)."""

    def setUp(self):
        self.codigo = leer(RAIZ / "js" / "componentes" / "estadistica.js")

    def test_exporta_su_funcion_y_reutiliza_el_incrustador(self):
        self.assertIn("export async function montarComponenteEstadistica(hueco)", self.codigo)
        self.assertIn("export async function montarEstadistica(hueco, urlApi)",
                      leer(RAIZ / "js" / "estadisticas-incrustadas.js"))
        ruta = re.search(r'"\.\./estadisticas-incrustadas\.js\?v=[\w-]+"', self.codigo)
        self.assertIsNotNone(ruta)

    def test_sin_id_para_poder_repetirlo(self):
        self.assertNotIn("getElementById", self.codigo)
        self.assertIsNone(re.search(r"\.id\s*=(?!=)", self.codigo), "asigna un id")

    def test_carga_la_hoja_del_visor(self):
        ruta = re.search(r'"/(css/visor-estadisticas\.css)\?v=[\w-]+"', self.codigo)
        self.assertIsNotNone(ruta)
        self.assertTrue((RAIZ / ruta.group(1)).is_file())


class TestDashboards(unittest.TestCase):
    """Pintor de dashboards y Actualidad como dashboard (José, 5-11-2026)."""

    def setUp(self):
        self.pintor = leer(RAIZ / "js" / "dashboards" / "pintor.js")

    def test_cada_componente_del_pintor_existe_y_exporta_su_funcion(self):
        entradas = re.findall(r'"([\w-]+)": \["/(js/[\w/.-]+\.js)\?v=[\w-]+", "(\w+)"\]', self.pintor)
        self.assertGreaterEqual(len(entradas), 25)
        for etiqueta, ruta, funcion in entradas:
            with self.subTest(componente=etiqueta):
                self.assertTrue((RAIZ / ruta).is_file(), ruta)
                self.assertRegex(leer(RAIZ / ruta), rf"export (async )?function {funcion}\(")

    def test_la_hoja_existe(self):
        ruta = re.search(r'"/(css/dashboards\.css)\?v=[\w-]+"', self.pintor)
        self.assertIsNotNone(ruta)
        self.assertTrue((RAIZ / ruta.group(1)).is_file())

    def test_actualidad_solo_con_el_parametro(self):
        principal = leer(RAIZ / "js" / "actualidad" / "principal.js")
        self.assertIn('has("dashboard")', principal)
        self.assertIn("/js/dashboards/actualidad.js?v=", principal)
        self.assertIn("export async function arrancarActualidadDashboard(contenedor)",
                      leer(RAIZ / "js" / "dashboards" / "actualidad.js"))

if __name__ == "__main__":
    unittest.main()
