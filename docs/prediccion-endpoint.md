# Contrato: `GET /prediccion/{municipio}`

Qué tiene que devolver la API para que la página de Predicción
(`pages/prediccion.html`, `js/prediccion.js`) muestre datos reales.

Mientras la ruta no exista, o si responde con error, la página enseña
datos de muestra con el aviso «Datos de muestra» bien visible. El día
que la ruta responda con este formato, la página pasa sola a los datos
reales, sin tocar nada en la web.

Sigue lo acordado en [prediccion.md](prediccion.md): la fuente es AEMET
OpenData, la clave de AEMET se queda en el servidor, y la web solo habla
con nuestra API, nunca con AEMET.


## Petición

    GET /prediccion/archidona

- `municipio` es el código propio de MeteoArchidona, en minúsculas y
  sin tildes (`archidona`), no el código INE. El INE va dentro de la
  respuesta.
- Pública, sin clave, de solo lectura, como `/estaciones`.
- Tiene que llevar las mismas cabeceras CORS que el resto de la API
  para `meteoarchidona.com`.
- Responde **desde PostgreSQL**, nunca consultando a AEMET durante la
  petición (apartado 18 de `prediccion.md`). Así es rápida y no depende
  de que AEMET esté disponible en ese momento.

Respuestas:

| Código | Cuándo | Qué hace la web |
| --- | --- | --- |
| 200 | Hay predicción guardada, aunque sea antigua | La pinta; si `desactualizada` es `true`, lo avisa |
| 404 | Municipio desconocido o sin ninguna predicción todavía | Datos de muestra |
| 5xx | Fallo de la API | Datos de muestra |


## Respuesta

Ejemplo recortado (una hora y un día; la respuesta real trae 48 horas y
7 días):

```json
{
  "municipio": {
    "codigo": "archidona",
    "nombre": "Archidona",
    "codigo_ine": "29XXX"
  },
  "fuente": {
    "nombre": "AEMET",
    "url": "https://www.aemet.es/es/eltiempo/prediccion/municipios/...",
    "emitida": "2026-09-22T10:00:00+02:00",
    "obtenida": "2026-09-22T10:07:31+02:00"
  },
  "desactualizada": false,
  "diaria": [
    {
      "fecha": "2026-09-22",
      "condicion": "poco_nuboso",
      "descripcion": "Poco nuboso",
      "temperatura_max_c": 27,
      "temperatura_min_c": 14,
      "prob_precipitacion_pct": 10,
      "viento_direccion": "SE",
      "viento_kmh": 15,
      "racha_max_kmh": 30,
      "uv_max": 6
    }
  ],
  "horaria": [
    {
      "instante": "2026-09-22T12:00:00+02:00",
      "condicion": "despejado",
      "descripcion": "Despejado",
      "es_noche": false,
      "temperatura_c": 24,
      "sensacion_c": 24,
      "prob_precipitacion_pct": 0,
      "precipitacion_mm": 0.0,
      "viento_direccion": "SE",
      "viento_kmh": 12,
      "racha_kmh": 25,
      "humedad_pct": 45
    }
  ],
  "avisos": [
    {
      "nivel": "amarillo",
      "fenomeno": "tormentas",
      "zona": "Nombre de la zona de aviso de AEMET",
      "inicio": "2026-09-23T14:00:00+02:00",
      "fin": "2026-09-23T22:00:00+02:00",
      "descripcion": "Texto del aviso tal como lo da AEMET",
      "fuente": "AEMET"
    }
  ]
}
```

`codigo_ine` y `url` van a propósito sin rellenar: hay que sacarlos de
AEMET, no escribirlos de memoria.


## Campos

### `fuente`

- `emitida`: cuándo **AEMET** elaboró la predicción (el `elaborado` de
  su respuesta), no cuándo la descargamos. Es lo que la web enseña:
  «AEMET · emitida hoy a las 10:00».
- `obtenida`: cuándo la guardó nuestra API. Solo para diagnóstico.
- Fechas y horas siempre en ISO 8601 **con desfase horario**
  (`+02:00` en verano, `+01:00` en invierno). Sin desfase, el navegador
  las toma como UTC y las horas salen corridas.

### `desactualizada`

`true` cuando la última predicción guardada tiene más de 12 horas
(AEMET publica varias al día). La web lo enseña en ámbar. Sirve para el
apartado 26 de `prediccion.md`: si AEMET falla, se sigue viendo la
última predicción buena, avisando de que es antigua.

### `diaria`

- 7 elementos, de hoy en adelante, ordenados por fecha. Si AEMET da
  menos días, se mandan los que haya.
- `fecha`: día local, `AAAA-MM-DD`, sin hora.
- `prob_precipitacion_pct`: la mayor de las franjas del día que da
  AEMET.
- Cualquier dato que AEMET no dé para ese día va a `null`, **nunca a
  0**: un 0 cuela como dato real («0 km/h», «UV 0»). La web enseña «--»
  para los `null`.

### `horaria`

- Desde la hora en curso, 48 elementos como máximo, de hora en hora.
- `instante`: el comienzo de la hora, en hora local con desfase.
- `es_noche`: para elegir el icono de luna. AEMET lo marca con la `n`
  final del código de cielo (`12n`).
- `precipitacion_mm`: lo previsto **dentro de esa hora**, no
  acumulado.
- Los que falten, a `null`, como en `diaria`.

### `avisos`

- Solo los **vigentes o futuros** para la zona de aviso de AEMET que
  cubre Archidona. Lista vacía si no hay ninguno.
- `nivel`: `amarillo`, `naranja` o `rojo` (los de AEMET). La escala
  propia de `prediccion.md` (con fucsia) es para las alertas de
  MeteoArchidona, que irán por otro lado cuando existan.

### `condicion`

Catálogo cerrado y normalizado, el del apartado 24 de `prediccion.md`.
La web elige el icono con este campo y enseña `descripcion` como texto.
Si llega una `condicion` que la web no conoce, pinta el icono de nubes
y el texto de `descripcion`, así que añadir valores no rompe nada.

Valores y su equivalencia con los códigos `estadoCielo` de AEMET
(**hay que comprobarla con una respuesta real** antes de darla por
buena):

| `condicion` | Códigos AEMET |
| --- | --- |
| `despejado` | 11 |
| `poco_nuboso` | 12 |
| `intervalos_nubosos` | 13 |
| `nuboso` | 14 |
| `muy_nuboso` | 15 |
| `cubierto` | 16 |
| `nubes_altas` | 17 |
| `lluvia_escasa` | 43, 44, 45, 46 |
| `lluvia` | 23, 24, 25, 26 |
| `chubascos` | 61, 62, 63, 64 (tormenta con lluvia escasa → `tormenta`) |
| `tormenta` | 51, 52, 53, 54 y los de tormenta con lluvia |
| `nieve` | 33, 34, 35, 36, 71, 72, 73, 74 |
| `niebla` | 81 |
| `bruma` | 82 |
| `calima` | 83 |

Los códigos con `n` (`11n`, `12n`...) son la misma condición de noche:
`condicion` igual y `es_noche: true`.


## Lo que la web hace con cada bloque

| Bloque de la página | Campos que usa |
| --- | --- |
| Hoy en Archidona | `diaria[0]` y la primera hora de `horaria` |
| Próximas horas | `horaria` entera |
| Próximos 7 días | `diaria` entera |
| Avisos | `avisos`; la franja no aparece si la lista está vacía |
| Procedencia | `fuente.nombre`, `fuente.emitida`, `fuente.url`, `desactualizada` |


## Para probarlo

Con la ruta ya desplegada:

```bash
curl -s https://api-meteoarchidona.onrender.com/prediccion/archidona | python -m json.tool
```

y abrir https://meteoarchidona.com/prediccion: el aviso «Datos de
muestra» tiene que haber desaparecido y la procedencia tiene que decir
«AEMET · emitida …».
