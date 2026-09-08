# Content Security Policy (CSP)

## ¿Qué es CSP?

Cabecera HTTP que controla qué recursos (scripts, estilos, imágenes) puede cargar una página.

**Protege contra:**
- XSS (Cross-Site Scripting)
- Inyección de código malicioso
- Carga de archivos desde sitios no confiables

## Política Actual (Recomendada)

Agregue esta cabecera en `.htaccess`:

```apache
Header set Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api-meteoarchidona.onrender.com; frame-ancestors 'none';"
```

## Explicación por Directiva

| Directiva | Valor | Qué permite |
|-----------|-------|-----------|
| `default-src` | `'self'` | Todo desde mismo origen |
| `script-src` | `'self'` | Scripts solo locales |
| `style-src` | `'self' 'unsafe-inline'` | Estilos locales + inline |
| `img-src` | `'self' data: https:` | Imágenes locales + data URIs + HTTPS |
| `font-src` | `'self'` | Fuentes locales |
| `connect-src` | `'self' https://api-meteoarchidona.onrender.com` | Fetch/XHR: mismo origen + API |
| `frame-ancestors` | `'none'` | No embebible en iframes |

## Configuración en .htaccess

Agregue antes del RewriteEngine:

```apache
<IfModule mod_headers.c>
    Header set Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api-meteoarchidona.onrender.com"
</IfModule>
```

## Testing CSP

### En navegador (Console)

Violations aparecen como warnings. Ejemplo:
```
Refused to load the script 'https://badsite.com/evil.js' because it violates the following Content Security Policy directive: "script-src 'self'"
```

### Report-Only Mode (Recomendado primero)

Para testing sin bloquear:
```apache
Header set Content-Security-Policy-Report-Only "..."
```

Luego:
1. Test en navegador
2. Revisa console para violations
3. Ajusta política
4. Cambia a `Content-Security-Policy` (sin Report-Only)

## Cambios Comunes

### Si usas Google Fonts

Agregar a `font-src`:
```apache
font-src 'self' https://fonts.gstatic.com
```

### Si usas script externo

Agregar URL a `script-src`:
```apache
script-src 'self' https://cdn.example.com/lib.js
```

### Si usas API adicional

Agregar URL a `connect-src`:
```apache
connect-src 'self' https://api1.com https://api2.com
```

## Migración Segura

**Paso 1: Report-Only**
```apache
Header set Content-Security-Policy-Report-Only "default-src 'self'; ..."
```

**Paso 2: Test 1 semana**
- Revisa console
- Verifica que app funciona
- Nota violations

**Paso 3: Ajusta política**
```apache
Header set Content-Security-Policy-Report-Only "default-src 'self'; img-src 'self' data: https:; ..."
```

**Paso 4: Deployment**
Cambia a:
```apache
Header set Content-Security-Policy "..."
```

## Debugging

Si resource no carga y ves error en console:
1. Nota qué bloqueó CSP (mensaje dice tipo y URL)
2. Si es seguro, agrégalo a la política
3. No desactives CSP completamente

### Ejemplo de error

```
Refused to load the stylesheet 'https://fonts.googleapis.com/css?family=Roboto' because it violates the following Content Security Policy directive: "style-src 'self' 'unsafe-inline'"
```

**Fix:**
```apache
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
```

## Strict CSP (Producción)

Para máxima seguridad, quita `'unsafe-inline'` de style-src:

```apache
Header set Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api-meteoarchidona.onrender.com; frame-ancestors 'none'"
```

Esto requiere:
- Quitar `<style>` inline de HTML
- Mover estilos a archivos `.css`
- Usar file links: `<link rel="stylesheet" href="app.css">`

## Referencias

- [MDN CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [CSP Level 3 Spec](https://w3c.github.io/webappsec-csp/)
- [CSP Policy Tester](https://csp-evaluator.withgoogle.com/)
