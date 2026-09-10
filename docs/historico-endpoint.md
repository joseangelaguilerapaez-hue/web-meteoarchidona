# Endpoint de histórico para los gráficos de la portada

Lo que la web necesita de la API para que los dos gráficos de la portada
dejen de ser una muestra. La parte del navegador ya está hecha
(`js/graficos.js`): en cuanto este endpoint responda, los gráficos se
dibujan solos, sin tocar nada más.

Mientras no exista, la portada sigue enseñando los puntos escritos a mano
con el aviso «Datos de muestra · la API todavía no sirve el histórico»
debajo de cada gráfico.

## La petición

```
GET /historico/{codigo_estacion}?desde=&hasta=&resolucion=
```

Público y de solo lectura. Hoy solo existe
`GET /admin/weatherlink/historico/{station_id}`, que pide
`X-MeteoArchidona-Key` y no se puede llamar desde el navegador sin
publicar la clave.

| Parámetro | Dónde | Obligatorio | Valor |
|---|---|---|---|
| `codigo_estacion` | ruta | sí | El mismo código funcional que usa `/condiciones-actuales`: `EL_SILO`, `LOS_LLANOS`. No el `station_id` numérico de WeatherLink. |
| `desde` | query | no | Instante ISO-8601 en UTC con `Z`: `2026-09-09T13:00:00Z`. |
| `hasta` | query | no | Igual. Sin `desde` ni `hasta`, las últimas 24 horas. |
| `resolucion` | query | no | `hora` (por defecto) o `dia`. |

La web pide dos cosas:

- Temperatura: una llamada por estación, `resolucion=hora`, ventana de 24 h.
- Lluvia: una llamada a `EL_SILO`, `resolucion=dia`, ventana de 7 días.

## La respuesta

```json
{
  "codigo_estacion": "EL_SILO",
  "nombre_estacion": "El Silo",
  "resolucion": "hora",
  "registros": [
    { "instante": "2026-09-09T13:00:00Z", "temperatura_c": 27.9, "lluvia_mm": 0.0 },
    { "instante": "2026-09-09T14:00:00Z", "temperatura_c": 28.4, "lluvia_mm": 0.0 }
  ]
}
```

- **`registros`** ordenados del más antiguo al más reciente. La web los
  dibuja en el orden en que llegan, no los reordena.
- Puede venir **vacío**. Una estación nueva o un hueco de datos es un 200
  con `"registros": []`, no un error. La web dibuja el gráfico vacío, que
  es la verdad; lo que no puede es enseñar una muestra como si fuera real.
- **`instante`**: con `resolucion=hora`, el comienzo de la hora. Con
  `resolucion=dia`, medianoche hora local de ese día (la web saca de ahí
  la inicial del día que va bajo cada barra, así que en UTC un día de
  verano saldría corrido).
- **`temperatura_c`**: media del intervalo, o `null` si no hay dato. `null`
  se salta; **no** vale mandar `0`, que en Archidona es una temperatura
  perfectamente creíble y pasaría por buena.
- **`lluvia_mm`**: lo llovido **dentro del intervalo**, no el contador
  acumulado del día que devuelve `/condiciones-actuales`. Con
  `resolucion=dia`, el total del día. Nunca `null`: si no llovió, `0`.

Cualquier campo que no sea `instante` puede faltar o venir a `null` y el
gráfico lo salta, así que se pueden añadir métricas (humedad, viento,
presión) más adelante sin tocar la web.

## Errores

- `404` si el código de estación no existe.
- `422` si las fechas están mal formadas o `hasta` es anterior a `desde`.

Un `200` con un cuerpo de error dentro no vale: la web mira el código HTTP
para decidir si tiene datos o si tiene que enseñar el aviso.

## CORS

Las mismas cabeceras que ya manda el resto de la API para
`meteoarchidona.com` y `www.meteoarchidona.com`. En local se sigue usando
el proxy `/api` de `servidor.py`.

## Cómo comprobarlo cuando esté

Con el servidor de desarrollo levantado (`python servidor.py`):

```bash
curl -s "http://localhost:8123/api/historico/EL_SILO?resolucion=dia" | head -c 400
```

Y en la portada, los avisos de «Datos de muestra» tienen que desaparecer
de debajo de los dos gráficos.
