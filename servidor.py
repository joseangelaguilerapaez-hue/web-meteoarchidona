"""
============================================================
SERVIDOR DE DESARROLLO
============================================================

Igual que "python -m http.server", pero mandando cabeceras que
prohíben cachear.

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
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

PUERTO_POR_DEFECTO = 8123


PAGINA_PRINCIPAL = "/index.html"

# La raíz ya sirve index.html sola. Estas son las rutas de la
# antigua ubicación, que se mandan a la nueva.
RAICES = ("/pages/", "/pages", "/pages/index.html")


class ManejadorSinCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def _redirigir_a_principal(self):
        """Manda a la página principal. Devuelve True si ha redirigido."""
        if self.path.split("?")[0] not in RAICES:
            return False

        self.send_response(302)
        self.send_header("Location", PAGINA_PRINCIPAL)
        self.end_headers()
        return True

    def do_GET(self):
        if not self._redirigir_a_principal():
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

    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido.")
        servidor.server_close()


if __name__ == "__main__":
    main()
