# Vulnerabilidades Comunes - MeteoArchidona

## 1. XSS (Cross-Site Scripting)

**Riesgo:** HTML/JavaScript inyectado ejecuta código malicioso.

### Vulnerable ❌

```javascript
// Nunca hagas esto
const nombre = '<img src=x onerror="alert(\'hacked\')">';
elemento.innerHTML = nombre;  // Ejecuta JavaScript!
```

### Seguro ✅

```javascript
// Usa textContent
elemento.textContent = nombre;  // Literal string, sin HTML

// Si necesitas HTML, sanitiza
function sanitizeHtml(html) {
    const temp = document.createElement('div');
    temp.textContent = html;  // Escapa HTML
    return temp.innerHTML;     // Devuelve escaped
}
```

**En proyecto:**
- ✅ app.js usa `textContent` para datos dinámicos
- ✅ validation.js sanitiza strings
- ❌ REVISAR: componentes que usen innerHTML

### Test XSS

```javascript
// Verificar que datos de API no ejecutan código
const payload = '<script>alert("xss")</script>';
elemento.textContent = payload;
// No debe ejecutar script
```

## 2. CSRF (Cross-Site Request Forgery)

**Riesgo:** Sitio malicioso fuerza acción sin consentimiento.

### Análisis

MeteoArchidona **es seguro** porque:
- ✅ Solo GET requests (lectura, no modifica)
- ✅ Usa HTTPS + CORS
- ✅ Sin cookies de sesión

Si se agrega AUTH:
```javascript
// ❌ Vulnerable
fetch('/api/admin', { method: 'POST' })

// ✅ Seguro
fetch('/api/admin', { 
    method: 'POST',
    headers: {
        'X-CSRF-Token': getCsrfToken()
    }
})
```

## 3. SQL Injection

**Riesgo:** SQL malicioso ejecutado en BD.

### Vulnerable ❌

```php
<?php
// Backend (PHP) - NUNCA HAGAS ESTO
$sql = "SELECT * FROM estaciones WHERE codigo = '" . $_GET['codigo'] . "'";
$result = $db->query($sql);
```

Payload malicioso:
```
?codigo=' OR '1'='1
// SQL resultante:
// SELECT * FROM estaciones WHERE codigo = '' OR '1'='1'
// Devuelve TODAS las estaciones (fuga de datos)
```

### Seguro ✅

```php
<?php
// Prepared statement
$stmt = $db->prepare("SELECT * FROM estaciones WHERE codigo = ?");
$stmt->bind_param("s", $_GET['codigo']);
$result = $stmt->execute();
```

**En proyecto:** Frontend no accede BD directo (OK).
**En backend:** Implementar prepared statements.

## 4. Command Injection

**Riesgo:** Comando shell ejecutado sin sanitizar input.

### Vulnerable ❌

```php
<?php
// NUNCA HAGAS ESTO
$output = shell_exec("curl " . $_GET['url']);
```

Payload:
```
?url=https://api.com; rm -rf /
```

### Seguro ✅

```php
<?php
// Validar y escapar
if (filter_var($_GET['url'], FILTER_VALIDATE_URL)) {
    $output = shell_exec(escapeshellcmd("curl " . $_GET['url']));
}
```

## 5. Path Traversal

**Riesgo:** Acceso a archivos fuera directorio intendido.

### Vulnerable ❌

```php
<?php
// NUNCA HAGAS ESTO
$file = $_GET['file'];  // "../../etc/passwd"
include $file;
```

### Seguro ✅

```php
<?php
// Validar whitelist
$allowed = ['info.html', 'prediccion.html', 'observaciones.html'];
$file = $_GET['file'];

if (!in_array($file, $allowed)) {
    die("Archivo no permitido");
}

include "pages/" . $file;
```

**En proyecto:** URLs en whitelist (navbar, prediccion.html, etc).

## 6. Sensitive Data Exposure

**Riesgo:** Datos sensibles expuestos en logs, URLs, responses.

### Vulnerable ❌

```javascript
// NUNCA
console.log("API Key:", apiKey);
fetch(`https://api.com?key=${apiKey}`);  // En URL!
localStorage.setItem('token', sensitiveToken);
```

### Seguro ✅

```javascript
// NUNCA en localStorage/URL
const apiKey = process.env.API_KEY;  // Variable de entorno
fetch(url, {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`  // Header, no URL
    }
});
```

**En proyecto:**
- ✅ .env.example (sin valores)
- ✅ .gitignore previene commit de .env
- ✅ API URLs en variables (no hardcodeadas)

## 7. Insecure Deserialization

**Riesgo:** JSON/datos malicioso ejecuta código.

### Vulnerable ❌

```javascript
// NUNCA HAGAS ESTO
const data = eval('(' + apiResponse + ')');  // eval es el ENEMIGO
const obj = Function(apiResponse)();
```

### Seguro ✅

```javascript
// SIEMPRE usa JSON.parse
const data = JSON.parse(apiResponse);

// Con validación
import { validarCondiciones } from './validation.js';
const resultado = validarCondiciones(data);
if (!resultado.valido) {
    console.error("Datos inválidos");
    return;
}
```

## 8. Broken Authentication

**Riesgo:** Credenciales débiles, session hijacking.

### Vulnerable ❌

```javascript
// NUNCA
localStorage.setItem('password', userPassword);
const auth = 'Basic ' + btoa(user + ':' + password);  // Base64 ≠ encryption
```

### Seguro ✅

```javascript
// SIEMPRE usar HTTPS
fetch(url, {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${accessToken}`  // Token, no password
    }
});

// Cookies con flags
// Samesite=Strict; Secure; HttpOnly
```

**En proyecto:** Frontend sin auth (lee-only). Si se agrega, usar tokens JWT.

## 9. Using Components with Known Vulnerabilities

**Riesgo:** npm packages con bugs de seguridad.

### Check

```bash
npm audit                  # Buscar vulnerabilidades
npm audit fix             # Aplicar fixes automáticos
npm outdated              # Ver versiones antigas
```

**Dependencias actuales (sin vulnerabilidades conocidas):**
- eslint@^9.0.0 ✅
- prettier@^3.0.0 ✅

Ejecutar `npm audit` regularmente.

## 10. Insufficient Logging & Monitoring

**Riesgo:** Ataques no detectados.

### Vulnerable ❌

```javascript
// Nunca logs que revelen secrets
console.log("Complete user object:", userData);
```

### Seguro ✅

```javascript
// Log eventos importantes sin sensibles
console.warn("Failed API request", {
    endpoint: '/condiciones-actuales',
    status: 503,
    timestamp: new Date().toISOString()
    // NO: api_key, password, user_email
});
```

**En producción:**
- [ ] Error tracking (Sentry, LogRocket)
- [ ] Alertas de rate limit violations
- [ ] Logs con retención limitada (30 días)

## Security Checklist

### Código

- [ ] No eval(), new Function(), with()
- [ ] textContent en lugar de innerHTML para datos
- [ ] Validación de tipos y rangos (validation.js)
- [ ] Sanitización de strings
- [ ] No secretos en código
- [ ] Logs no revelan datos sensibles

### Server (.htaccess)

- [ ] HTTPS obligatorio (comentado para dev)
- [ ] Cabeceras de seguridad (X-Content-Type-Options, etc)
- [ ] CSP configurado
- [ ] CORS restringido a orígenes conocidos
- [ ] Cache control
- [ ] Compresión gzip

### Dependencias

- [ ] npm audit sin críticos
- [ ] Versiones pinned (^X.Y.Z)
- [ ] Actualizaciones mensuales

### Ambiente

- [ ] .env.example creado
- [ ] .gitignore excluye .env
- [ ] Variables en control panel Hostinger
- [ ] No secrets en repositorio

### Testing

- [ ] Tests de validación pasando
- [ ] CSP Report-Only en staging
- [ ] XSS payloads no ejecutan

## Referencias

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [CWE/SANS Top 25](https://cwe.mitre.org/top25/)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [Snyk Security Guide](https://snyk.io/learn/security-vulnerabilities/)

## Reporte de Vulnerabilidades

Si encuentras bug de seguridad:
1. **NO** publiques en issues públicas
2. Email: `soporte@meteoarchidona.com`
3. Asunto: "Security Vulnerability Report"
4. Incluye: descripción, pasos, impacto
5. Espera respuesta antes de divulgar
