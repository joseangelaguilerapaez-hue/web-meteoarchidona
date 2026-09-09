# API Reference - MeteoArchidona

## Base URL

```
https://api-meteoarchidona.onrender.com
```

## Endpoints

### Condiciones Actuales

#### GET /condiciones-actuales/:estacion

Obtiene condiciones meteorológicas actuales de una estación.

**Parameters:**
- `estacion` (string, required): Código de estación
  - `EL_SILO` - El Silo, Archidona
  - `LOS_LLANOS` - Los Llanos, Villanueva del Trabuco

**Response:**
```json
{
  "estacion": "EL_SILO",
  "timestamp": "2024-09-08T12:30:00Z",
  "temperatura_celsius": 25.4,
  "humedad_relativa": 65,
  "presion_mb": 1013.25,
  "velocidad_viento_kmh": 12.5,
  "direccion_viento_grados": 180,
  "tasa_precipitacion_mm_h": 0.5,
  "tasa_lluvia_mm_h": 0.5,
  "lluvia_dia_mm": 2.3,
  "lluvia_mes_mm": 45.6,
  "lluvia_anio_agricola_mm": 234.8,
  "indice_uv": 4.2,
  "radiacion_solar_w_m2": 450
}
```

**Status Codes:**
- `200 OK` - Datos obtenidos exitosamente
- `404 Not Found` - Estación no existe
- `503 Service Unavailable` - API no disponible

**Example:**
```javascript
fetch('https://api-meteoarchidona.onrender.com/condiciones-actuales/EL_SILO')
  .then(r => r.json())
  .then(data => console.log(data))
  .catch(err => console.error('Error:', err))
```

---

### Radar

#### GET /radar/:zona/timeline

Obtiene datos de radar para visualización en mapa.

**Parameters:**
- `zona` (string, required): Zona de cobertura
  - `AHR` - Archidona

**Query Parameters:**
- `producto` (string, optional): Tipo de producto
  - `PPI` - Plan Position Indicator (default)

**Response:**
```json
{
  "zona": "AHR",
  "timestamp": "2024-09-08T12:30:00Z",
  "frames": [
    {
      "tiempo": "2024-09-08T12:00:00Z",
      "url": "https://cdn.ejemplo.com/radar/AHR/2024/09/08/1200.png"
    },
    {
      "tiempo": "2024-09-08T12:10:00Z",
      "url": "https://cdn.ejemplo.com/radar/AHR/2024/09/08/1210.png"
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Datos obtenidos
- `404 Not Found` - Zona no existe
- `503 Service Unavailable` - API no disponible

**Example:**
```javascript
fetch('https://api-meteoarchidona.onrender.com/radar/AHR/timeline?producto=PPI')
  .then(r => r.json())
  .then(data => console.log(data.frames))
```

---

## Errores

### Error Response

```json
{
  "error": "Estación no encontrada",
  "code": "STATION_NOT_FOUND",
  "status": 404
}
```

**Códigos de Error:**
- `STATION_NOT_FOUND` - Estación inexistente
- `INVALID_PARAMETER` - Parámetro inválido
- `API_UNAVAILABLE` - Servicio no disponible
- `RATE_LIMIT_EXCEEDED` - Límite de requests excedido

---

## Rate Limiting

- 100 requests/minuto por IP
- Headers de respuesta:
  - `X-RateLimit-Limit: 100`
  - `X-RateLimit-Remaining: 45`
  - `X-RateLimit-Reset: 1234567890`

---

## CORS

API soporta CORS desde cualquier origen:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

---

## Cache

Recomendaciones de caché:
- Condiciones actuales: 30-60 segundos
- Radar: 10-15 minutos
- Usar `If-Modified-Since` para requests posteriores

---

## Ejemplos de Uso

### JavaScript Fetch

```javascript
async function obtenerCondiciones(estacion) {
  try {
    const res = await fetch(
      `https://api-meteoarchidona.onrender.com/condiciones-actuales/${estacion}`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

obtenerCondiciones('EL_SILO').then(datos => {
  console.log(`Temperatura: ${datos.temperatura_celsius}°C`);
  console.log(`Humedad: ${datos.humedad_relativa}%`);
});
```

### cURL

```bash
curl -s https://api-meteoarchidona.onrender.com/condiciones-actuales/EL_SILO | jq '.'

curl -s "https://api-meteoarchidona.onrender.com/radar/AHR/timeline?producto=PPI" | jq '.frames'
```

---

## Changelog

### v1.0.0 (2024-09-08)
- ✅ Endpoints de condiciones actuales
- ✅ Endpoints de radar
- ✅ CORS habilitado
- ✅ Rate limiting

### v1.1.0 (Próximo)
- 📋 Endpoint de predicción
- 📋 Histórico de datos
- 📋 Alertas meteorológicas

---

## Soporte

- 📧 soporte@meteoarchidona.com
- 📄 Status: https://status.meteoarchidona.com
