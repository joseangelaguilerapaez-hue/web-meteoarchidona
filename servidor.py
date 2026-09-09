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
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

PUERTO_POR_DEFECTO = 8123


PAGINA_PRINCIPAL = "/index.html"

# La raíz ya sirve index.html sola. Estas son las rutas de la
# antigua ubicación, que se mandan a la nueva.
RAICES = ("/pages/", "/pages", "/pages/index.html")

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

# Render apaga los servicios gratuitos cuando no se usan y tardan un
# rato largo en volver a arrancar.
ESPERA_API = 60


class ManejadorSinCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def _es_peticion_api(self):
        return self.path.startswith(PREFIJO_API)

    def _reenviar_a_api(self):
        """Pide el recurso a la API y devuelve su respuesta tal cual."""
        destino = API_REMOTA + self.path[len(PREFIJO_API) - 1 :]

        try:
            peticion = urllib.request.Request(destino, headers={"Accept": "application/json"})

            with urllib.request.urlopen(peticion, timeout=ESPERA_API) as respuesta:
                cuerpo = respuesta.read()
                tipo = respuesta.headers.get("Content-Type", "application/json")
                codigo = respuesta.status
        except urllib.error.HTTPError as error:
            cuerpo = error.read()
            tipo = error.headers.get("Content-Type", "application/json")
            codigo = error.code
        except Exception as error:
            cuerpo = f'{{"error": "No se ha podido consultar la API: {error}"}}'.encode("utf-8")
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
