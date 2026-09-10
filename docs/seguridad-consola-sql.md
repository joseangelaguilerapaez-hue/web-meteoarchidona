# Cerrar la consola SQL de la API

Igual que `historico-endpoint.md`, esto es trabajo que se hace en el
repositorio de la API (`api-meteoarchidona`), no aquí. Se anota en la web
porque es donde se detectó y donde se lleva la cuenta de lo pendiente.

## Lo que hay hoy

`POST /admin/sql/ejecutar` ejecuta cualquier sentencia contra PostgreSQL:
`SELECT`, pero también `UPDATE`, `DELETE`, `DROP` y `TRUNCATE`. Lo único
que lo protege es la cabecera `X-MeteoArchidona-Key`.

La autenticación en sí está bien hecha: la clave sale de la variable de
entorno `METEOARCHIDONA_ADMIN_KEY`, no está en el código, y se compara
con `hmac.compare_digest`, que tarda lo mismo acierte o falle. Sin
cabecera responde 401.

El problema no es que la puerta esté abierta, es lo que hay detrás:

1. **La consola aparece en el `/openapi.json` público.** `/docs` publica
   el esquema completo, así que cualquiera ve que existe `/admin/sql`,
   `/admin/weatherlink` y `/admin/eumetsat`, con qué parámetros y qué
   cabecera piden.
2. **Una clave filtrada es la base de datos entera.** Se teclea a mano en
   un navegador y viaja en una cabecera. Basta un `DROP TABLE` para que no
   quede nada, y las mediciones históricas no se pueden volver a pedir a
   WeatherLink pasado su plazo de retención.
3. **El tipo de sentencia se deduce de la primera palabra**, y eso se
   esquiva. Esto empieza por `WITH`, no está en la lista de palabras que
   modifican, y vacía la tabla:

   ```sql
   WITH borrado AS (DELETE FROM estacion RETURNING *)
   SELECT * FROM borrado
   ```

## Los tres cambios

Van en el fichero `api-seguridad-sql.patch`. Compilan y llevan sus
comprobaciones pasadas contra una sesión falsa (sin PostgreSQL).

### 1. La documentación deja de publicarse (`app.py`)

`docs_url`, `redoc_url` y `openapi_url` pasan a `None` salvo que el
entorno tenga `METEOARCHIDONA_DOCS=1`. En local:

```bash
METEOARCHIDONA_DOCS=1 uvicorn app:app --reload
```

Esto tapa de una vez todas las rutas `/admin`, no solo la SQL. No es
seguridad —las rutas siguen ahí—, es no repartir el plano.

### 2. La consola queda en solo lectura (`servicios/ejecutor_sql_admin.py`)

`INSERT`, `UPDATE`, `DELETE`, `MERGE` y las DDL se rechazan salvo que el
servidor tenga `METEOARCHIDONA_SQL_ESCRITURA=1`. Con la clave filtrada se
puede leer la base de datos, que ya es feo, pero no destruirla.

Cambiar esa variable es entrar en Render y volver a desplegar: se pone
para el mantenimiento concreto y se quita al terminar.

Y por lo del `WITH`: cuando la escritura está deshabilitada, la
transacción se marca `SET TRANSACTION READ ONLY` antes de ejecutar nada.
Ahí quien rechaza la escritura es PostgreSQL, que sí entiende la
sentencia, en vez de una lista de palabras que siempre se puede rodear.

Con `METEOARCHIDONA_SQL_ESCRITURA=1` todo vuelve a funcionar como hasta
ahora, confirmación de operaciones destructivas incluida.

### 3. `/admin/sql/ejecutar` sale del esquema (`api/admin_sql.py`)

`include_in_schema=False`, como ya lo tenían `/admin/sql` y
`/admin/sql/exportar`. Redundante si se aplica el cambio 1, pero si algún
día se vuelven a abrir los `/docs` no arrastra la consola con ellos.

## Cómo aplicarlo

En el repositorio de la API:

```bash
git apply --stat api-seguridad-sql.patch
```

Si el `--stat` cuadra, `git apply` sin más. El parche se sacó del
`api-meteoarchidona-main.zip` del 10-9-2026, que ya trae el
`CORSMiddleware`, así que debería aplicar limpio; si no, los tres cambios
son cortos y se copian a mano.

Después, en Render: dejar `METEOARCHIDONA_DOCS` y
`METEOARCHIDONA_SQL_ESCRITURA` **sin poner**, y comprobar que
`https://api-meteoarchidona.onrender.com/openapi.json` responde 404.

## Lo que esto no arregla

- **`GET /admin/sql` sigue sirviendo su HTML sin clave**, igual que
  `/admin/weatherlink` y `/admin/eumetsat`. La página no lleva
  credenciales dentro y sin la clave no hace nada, pero confirma que la
  consola existe. Pedirle la clave a un `GET` de navegador obligaría a
  montar sesión con cookie, que es bastante más obra.
- **No hay límite de intentos.** Nada impide probar claves una detrás de
  otra. Mientras la clave sea larga y aleatoria no es urgente; si se
  quiere cerrar, lo natural es un contador por IP en el propio
  `exigir_clave_administracion`.
- **El usuario de PostgreSQL sigue siendo el mismo.** El arreglo de
  verdad, si algún día apetece, es que la consola se conecte con un rol
  de solo lectura y que la escritura pida otra conexión distinta: eso lo
  garantiza la base de datos y no el código de la API.
