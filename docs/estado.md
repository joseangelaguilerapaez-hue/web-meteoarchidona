# Estado del proyecto — web-meteoarchidona

Última actualización: 2026-10-23.
Origen: reconstruido a partir del historial de Git, ramas y pull requests. Lo marcado
**(por confirmar)** necesita que José lo ratifique o corrija.

## Cómo se mantiene este documento

Es la fuente de verdad de "por dónde vamos". Al empezar una sesión se lee; al terminar
cada tarea se actualiza **en el mismo PR que el cambio**:

1. Mover lo que corresponda entre *Hecho*, *En construcción* y *Pendiente*.
2. Añadir una línea fechada al *Registro* (una línea, sin detalles de código).
3. Si algún documento de `docs/` ya no es cierto, corregirlo o dejar aquí la nota de que está desfasado.

No se marca nada como hecho que no esté en `main`.

## Hecho (en `main`)

- Visor de radar regional multirradar, con estilos y caché corregidos (PR #2 a #4, sep).
- Panel de administración V2 (PR #6, sep).
- Timelapses en Actualidad y gestión de productos de timelapse en el panel de administración, con navegación Configuración/Productos (15–17 oct).
- Visor de vídeo MP4 con controles temporales, adaptado a móvil y pantalla completa (16 oct).
- En vivo: selector dinámico de directos de YouTube que carga las emisiones desde la API pública (Murcia, Nerja, puerto de Málaga), 15–21 oct.

## En construcción / abierto

- **Predicción**: la página muestra datos de muestra desde el 22 sep porque `GET /prediccion/{municipio}` aún no existe. Está en el PR #10 de `api-meteoarchidona`; en cuanto se fusione y despliegue, la web pasa sola a datos reales. Contrato en `docs/prediccion-endpoint.md`.
- PR #7 · este `CLAUDE.md` y `docs/estado.md`.

## Pendiente

- Estadísticas, usuarios, publicidad y redimensionamiento con nuevos puntos de medición: existen como documentos de especificación en `docs/`, pero no consta implementación en el historial reciente **(por confirmar cuáles se van a construir y en qué orden)**.
- Observaciones: ver `docs/observaciones.md` para lo previsto **(por confirmar el estado real)**.

## Ramas antiguas

`feature/administracion-v2` y `zonnen69` no tienen commits que no estén ya en `main`. **(por confirmar)** si se pueden borrar. No borrar ramas sin que José lo pida.

## Registro

- 2026-10-23 · Creados `CLAUDE.md` y este documento; estado reconstruido desde Git.
