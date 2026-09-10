"""
============================================================
SERVIDOR DE DESARROLLO
============================================================

Igual que "python -m http.server", con dos añadidos: manda
cabeceras que prohíben cachear, y hace de intermediario con la API
en las rutas que empiezan por /api/.

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

# Rutas que llevan a la portada. La dirección buena es "/": si se
# permite entrar también por "/index.html", el nombre del archivo se
# queda en la barra y se arrastra a las secciones ("/index.html#info").
# Las de pages/ son de la ubicación antigua del índice.
RAICES = ("/index.html", "/pages/", "/pages", "/pages/index.html")

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

    def _redirigir_a_principal(self):
        """Manda a la página principal. Devuelve True si ha redirigido."""
        if self.path.split("?")[0] not in RAICES:
            return False

        self.send_response(302)
        self.send_header("Location", PAGINA_PRINCIPAL)
        self.end_headers()
        return True

    def do_GET(self):
        if self._es_peticion_api():
            self._reenviar_a_api()
        elif not self._redirigir_a_principal():
            super().do_GET()

    def do_HEAD(self):
        if not self._redirigir_a_principal():
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
    print("Sin caché: al recargar siempre se ve la última versión de los archivos.")
    print(f"Las peticiones a /api/ se reenvían a {API_REMOTA}")

    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido.")
        servidor.server_close()


if __name__ == "__main__":
    main()
