/* ============================================================
   LANZADOR DE TESTS
   ============================================================

   Ejecuta todas las suites y termina con código 1 si falla
   alguna.

   Antes "npm test" encadenaba los cinco ficheros con &&, así
   que en cuanto una suite fallaba las siguientes ni siquiera
   se ejecutaban y no se veía el estado completo.

   Cada fichero de test lanza sus pruebas al importarse y pone
   process.exitCode = 1 si alguna falla, así que basta con
   importarlos en orden.
   ============================================================ */

import "./utils.test.js";
import "./validation.test.js";
import "./lluvia.test.js";
import "./viento.test.js";
import "./ui.test.js";
import "./graficos.test.js";

process.on("exit", (codigo) => {
    console.log(
        codigo === 0
            ? "\n✅ Todas las suites han pasado."
            : "\n❌ Hay tests fallando (ver el detalle arriba).",
    );
});
