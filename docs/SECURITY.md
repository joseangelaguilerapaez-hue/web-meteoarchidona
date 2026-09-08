# Seguridad - MeteoArchidona

## Principios de Seguridad

1. **Validar todo** - Input en límites (frontend + backend)
2. **HTTPS obligatorio** - Tráfico cifrado
3. **CORS restringido** - Solo orígenes conocidos
4. **Rate limiting** - Protección contra abuso
5. **Sin secretos en código** - Variables de entorno
6. **Actualizaciones** - Dependencias al día

## Configuración de Seguridad

### HTTPS Obligatorio

`.htaccess` redirige HTTP → HTTPS:
```apache
RewriteCond %{HTTPS} off
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

### Cabeceras de Seguridad

```apache
Header always set X-Content-Type-Options "nosniff"
Header always set X-Frame-Options "SAMEORIGIN"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
```

**Qué hacen:**
- `X-Content-Type-Options: nosniff` - Previene MIME sniffing
- `X-Frame-Options: SAMEORIGIN` - Clickjacking protection
- `Referrer-Policy` - Control de referrer
- `HSTS` - Force HTTPS por 1 año

### CORS Configuration

**Actual:** Abierto (localhost testing)
```javascript
Access-Control-Allow-Origin: *
```

**Producción recomendado:**
```javascript
Access-Control-Allow-Origin: https://meteoarchidona.com
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
Access-Control-Max-Age: 3600
```

### Rate Limiting

API Backend implementa:
- 100 requests/minuto por IP
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Validación de Datos

### Frontend

**Entrada de usuario:**
- Validar tipos (número, string, etc)
- Rango permitido (limitar())
- Longitud máxima
- Caracteres permitidos

**Ejemplos en utils.js:**
```javascript
// Validación de número
if (valor === null || valor === undefined || Number.isNaN(Number(valor))) {
    return "--";
}

// Validación de rango
export function limitar(valor, minimo, maximo) {
    return Math.min(maximo, Math.max(minimo, valor));
}

// Validación de grados
function normalizarGrados(grados) {
    if (grados === null || grados === undefined) {
        return null;
    }
    return ((Number(grados) % 360) + 360) % 360;
}
```

### Backend (API)

**Parámetros requeridos:**
- Estación válida (EL_SILO, LOS_LLANOS)
- Zona válida (AHR)
- Tipos correctos

**Respuesta:** Error 400/404 para input inválido
```json
{
  "error": "Estación no encontrada",
  "code": "STATION_NOT_FOUND",
  "status": 404
}
```

## Variables de Entorno

**Nunca commits:**
- API keys
- Tokens
- Passwords
- Database URLs

**Usar .env file** (no en git):
```
API_BASE=https://api-meteoarchidona.onrender.com
API_TIMEOUT=5000
CORS_ORIGIN=https://meteoarchidona.com
LOG_LEVEL=error
```

Ver `.env.example` como referencia.

## Dependencias

### Auditoría Regular

```bash
npm audit                 # Buscar vulnerabilidades
npm audit fix            # Aplicar fixes automáticos
npm outdated             # Ver versiones outdated
```

### Actualizaciones

- Patch (1.0.1): Seguridad critical
- Minor (1.1.0): Nuevas features seguras
- Major (2.0.0): Cambios breaking - testear bien

### Dependencias Actuales

```json
{
  "eslint": "^9.0.0",      // Análisis estático
  "prettier": "^3.0.0"     // Formato código
}
```

Sin dependencias de runtime (peso y vulnerabilidades mínimas).

## Secretos

### En Git

**NUNCA:**
```
.env (valores reales)
credentials.json
private-keys
API tokens
```

**SÍ:**
```
.env.example (sin valores)
.gitignore (lista lo que no trackear)
README.md (instrucciones)
```

### En Producción (Hostinger)

1. Variables en control panel Hostinger
2. PHP para cargarlas: `$_ENV['API_KEY']`
3. O en .htaccess: `SetEnv API_KEY "valor"`
4. Nunca en archivos versionados

## XSS Prevention (Cross-Site Scripting)

**Riesgo:** HTML inyectado malicioso

**Protección:**
- ✅ `textContent` en lugar de `innerHTML` cuando sea posible
- ✅ Sanitizar HTML si es necesario
- ✅ CSP headers (Content Security Policy)
- ✅ Nunca eval() o new Function()

**Código seguro:**
```javascript
// ✅ Seguro - text
element.textContent = userData;

// ❌ Riesgo - HTML
element.innerHTML = userData;

// ✅ Seguro si es necesario
function sanitizeHtml(html) {
    const temp = document.createElement('div');
    temp.textContent = html;
    return temp.innerHTML;
}
```

## CSRF Prevention (Cross-Site Request Forgery)

**SPA con HTTPS + CORS + No cookies = bajo riesgo**

Si se agrega auth:
- Tokens CSRF en forms
- SameSite cookies: `Strict`
- POST para cambios, no GET

## SQL Injection Prevention

**Riesgo:** Consultas SQL construidas con user input

**Status:** Frontend sin acceso directo a BD (OK)

**En backend (próximo):**
- Prepared statements
- Parametrized queries
- ORM (Sequelize, TypeORM)
- No concatenar strings en SQL

## Logging y Monitoreo

### Qué loguear

✅ Errores críticos (API failures)
✅ Rate limit violations
✅ Invalid requests
✅ Performance issues

❌ NO: Datos sensibles, passwords, tokens

### Ejemplo Seguro

```javascript
// ✅ Seguro
console.error("API error:", {
    status: 404,
    endpoint: "/condiciones-actuales/INVALID",
    timestamp: new Date().toISOString()
});

// ❌ Nunca
console.error("API Error:", {
    apiKey: "secret123",
    password: "admin123"
});
```

## Checklist de Seguridad

### Antes de Deploy

- [ ] HTTPS activado en servidor
- [ ] .htaccess con cabeceras de seguridad
- [ ] .env.example creado (sin valores)
- [ ] .gitignore configur
ado
- [ ] npm audit sin vulnerabilidades críticas
- [ ] Validación de inputs en todos lados
- [ ] CORS restringido a orígenes conocidos
- [ ] Rate limiting activo en API
- [ ] No hay secretos en código
- [ ] Logs no guardan datos sensibles

### En Producción

- [ ] Monitoreo de errores (Sentry, LogRocket)
- [ ] Alertas de rate limit violations
- [ ] Auditoría de dependencias mensual
- [ ] Backups automáticos
- [ ] Rotación de tokens/keys
- [ ] Logs con retención limitada

## Reportar Vulnerabilidades

**NO** publicar en issues públicas.

**SÍ:**
1. Email a: `soporte@meteoarchidona.com`
2. Descripción: qué, dónde, cómo reproducir
3. Confidencial hasta fix

## Referencias

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CSP Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [CORS Explanation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [npm Security Best Practices](https://docs.npmjs.com/about-npm-security)

## Versión

- **Última actualización**: 2024-09-08
- **Status**: In Progress (Fase 1 completada)
