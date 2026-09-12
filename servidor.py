"""
============================================================
SERVIDOR DE DESARROLLO
============================================================

Igual que "python -m http.server", con tres añadidos: reproduce
las direcciones limpias del .htaccess, manda cabeceras que prohíben
cachear, y hace de intermediario con la API en las rutas que
empiezan por /api/.

Lo primero es lo que hace que esto sirva para algo: en producción
las páginas se piden como /en-vivo y Hostinger las traduce a
pages/en-vivo.html. Con el servidor de la biblioteca estándar esas
direcciones dan 404 y no se puede probar la navegación.

Sin esto el navegador se queda con la copia que ya tiene y los
cambios recién guardados no se ven al recargar: el módulo
http.server de la biblioteca estándar manda Last-Modified pero
no manda Cache-Control, así que el navegador cachea por su
cuenta y ni siquiera vuelve a preguntar.

Uso:

    python servidor.py [puerto]

El puerto por defecto es 8123.
============================================================
"""

import sys
import time
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

PUERTO_POR_DEFECTO = 8123


PAGINA_PRINCIPAL = "/"

# Las mismas direcciones limpias que sirve el .htaccess. Aquí solo
# están para poder probar en local; la lista buena es la del
# .htaccess, y si se añade una sección hay que tocar las dos.
SECCIONES = (
    "observaciones",
    "prediccion",
    "en-vivo",
    "administracion",
)

# La portada es Actualidad, servida en "/" sin redirigir.
PORTADA = "/pages/actualidad.html"

# Direcciones viejas o duplicadas: a la buena con un 301, igual que
# hará el servidor de verdad.
REDIRECCIONES = {
    "/index.html": "/",
    "/actualidad": "/",
    "/pages/actualidad.html": "/",
    "/pages/prediccion.html": "/prediccion",
}

for _seccion in SECCIONES:
    REDIRECCIONES[f"/{_seccion}.html"] = f"/{_seccion}"
    REDIRECCIONES[f"/pages/{_seccion}.html"] = f"/{_seccion}"

# Intermediario con la API.
#
# La API no manda cabeceras Access-Control-Allow-Origin, así que el
# navegador descarta sus respuestas aunque lleguen bien (curl sí las
# lee, porque curl no aplica la política de origen cruzado).
#
# Pidiendo a /api/... el navegador habla con este mismo servidor, o
# sea con su propio origen, y no hay nada que bloquear. Este servidor
# reenvía la petición a la API, que no se entera de nada.
#
# Es solo para desarrollo: en producción las cabeceras las tiene que
# mandar la API.
PREFIJO_API = "/api/"
API_REMOTA = "https://api-meteoarchidona.onrender.com"

# Render apaga los servicios gratuitos cuando no se usan. La primera
# petición después de un rato parado despierta el servicio y falla o
# tarda muchísimo mientras arranca, así que se reintenta en vez de
# devolver un 502 a la primera.
ESPERA_API = 60
INTENTOS_API = 3
PAUSA_ENTRE_INTENTOS = 2


class ManejadorSinCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def _es_peticion_api(self):
        return self.path.startswith(PREFIJO_API)

    def _pedir_a_api(self, destino):
        """
        Una consulta a la API. Devuelve (cuerpo, tipo, codigo) o lanza
        la excepción para que decida quien llama si reintenta.
        """
        peticion = urllib.request.Request(destino, headers={"Accept": "application/json"})

        with urllib.request.urlopen(peticion, timeout=ESPERA_API) as respuesta:
            return (
                respuesta.read(),
                respuesta.headers.get("Content-Type", "application/json"),
                respuesta.status,
            )

    def _reenviar_a_api(self):
        """Pide el recurso a la API y devuelve su respuesta tal cual."""
        destino = API_REMOTA + self.path[len(PREFIJO_API) - 1 :]
        ultimo_fallo = None

        try:
            for intento in range(INTENTOS_API):
                try:
                    cuerpo, tipo, codigo = self._pedir_a_api(destino)
                    break
                except urllib.error.HTTPError as error:
                    # 502 y 503 son los que devuelve Render mientras el
                    # servicio arranca: esos sí merecen otro intento. Un
                    # 404 o un 400 son respuesta de la API y se pasan tal
                    # cual, sin insistir.
                    if error.code not in (502, 503, 504) or intento == INTENTOS_API - 1:
                        cuerpo = error.read()
                        tipo = error.headers.get("Content-Type", "application/json")
                        codigo = error.code
                        break

                    ultimo_fallo = f"HTTP {error.code}"
                    time.sleep(PAUSA_ENTRE_INTENTOS)
                except (urllib.error.URLError, TimeoutError) as error:
                    if intento == INTENTOS_API - 1:
                        raise

                    ultimo_fallo = str(error)
                    time.sleep(PAUSA_ENTRE_INTENTOS)

            if ultimo_fallo is not None and codigo == 200:
                print(f"  API despierta tras reintento ({ultimo_fallo})", flush=True)
        except Exception as error:
            cuerpo = (
                f'{{"error": "La API no responde tras {INTENTOS_API} intentos: {error}"}}'
            ).encode("utf-8")
            tipo = "application/json"
            codigo = 502

        self.send_response(codigo)
        self.send_header("Content-Type", tipo)
        self.send_header("Content-Length", str(len(cuerpo)))
        self.end_headers()
        self.wfile.write(cuerpo)

    def _redirigir_si_toca(self):
        """Manda a la dirección buena. Devuelve True si ha redirigido."""
        destino = REDIRECCIONES.get(self.path.split("?")[0])

        if destino is None:
            return False

        self.send_response(301)
        self.send_header("Location", destino)
        self.end_headers()
        return True

    def _traducir_direccion_limpia(self):
        """
        /en-vivo pasa a ser pages/en-vivo.html, y "/" la portada.

        Se cambia self.path antes de que el manejador de siempre
        busque el fichero, que es justo lo que hace la reescritura
        interna del .htaccess.
        """
        camino, _, consulta = self.path.partition("?")
        limpio = camino.rstrip("/") or "/"

        if limpio == "/":
            nuevo = PORTADA
        elif limpio.lstrip("/") in SECCIONES:
            nuevo = f"/pages/{limpio.lstrip('/')}.html"
        else:
            return

        self.path = nuevo + ("?" + consulta if consulta else "")

    def do_GET(self):
        if self._es_peticion_api():
            self._reenviar_a_api()
            return

        if self._redirigir_si_toca():
            return

        self._traducir_direccion_limpia()
        super().do_GET()

    def do_HEAD(self):
        if self._redirigir_si_toca():
            return

        self._traducir_direccion_limpia()
        super().do_HEAD()

    def list_directory(self, path):
        """
        Sin esto, una carpeta sin index.html devuelve su listado, y
        entrar en la raíz enseñaba el repositorio entero: .git,
        .env.example, .claude y demás.
        """
        self.send_error(404, "No existe")
        return None


def main():
    puerto = int(sys.argv[1]) if len(sys.argv) > 1 else PUERTO_POR_DEFECTO
    # Con un solo hilo, las conexiones que el navegador deja
    # abiertas bloquean al resto de peticiones.
    servidor = ThreadingHTTPServer(("", puerto), ManejadorSinCache)

    print(f"Servidor de desarrollo en http://localhost:{puerto}/")
    print("Direcciones limpias como en producción: / , /en-vivo , /observaciones ...")
    print("Sin caché: al recargar siempre se ve la última versión de los archivos.")
    print(f"Las peticiones a /api/ se reenvían a {API_REMOTA}")

    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido.")
        servidor.server_close()


if __name__ == "__main__":
    main()
