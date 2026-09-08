# Pre-Deployment Security Checklist

## 1 Semana Antes

### Código
- [ ] `npm audit` sin vulnerabilidades críticas
- [ ] `npm test` - todos los tests pasan
- [ ] `npm lint && npm format` - sin errores
- [ ] Code review de cambios recientes
- [ ] No hay `console.log`, `debugger`, `eval()` en producción

### Documentación
- [ ] [docs/SECURITY.md](SECURITY.md) actualizado
- [ ] [docs/VULNERABILITIES.md](VULNERABILITIES.md) revisado
- [ ] [docs/API.md](API.md) con endpoints actuales
- [ ] README.md con instrucciones de setup

### Dependencias
- [ ] package.json versiones pinned
- [ ] npm audit fix aplicado
- [ ] No hay vulnerabilidades open
- [ ] Actualizar si hay critical patches

## Pre-Deployment

### Secretos & Configuración
- [ ] `.env.example` creado sin valores
- [ ] `.env` en .gitignore
- [ ] Credenciales en Hostinger control panel, NO en código
- [ ] API_BASE apunta a URL correcta (production)
- [ ] CORS_ORIGIN = https://meteoarchidona.com
- [ ] LOG_LEVEL = error (no debug info)

### Servidor (.htaccess)
- [ ] HTTPS obligatorio (descomenta RewriteCond %{HTTPS} off)
- [ ] Cabeceras de seguridad presentes:
  - [ ] X-Content-Type-Options: nosniff
  - [ ] X-Frame-Options: SAMEORIGIN
  - [ ] Referrer-Policy: strict-origin-when-cross-origin
  - [ ] HSTS: max-age=31536000
  - [ ] X-XSS-Protection
- [ ] CSP configurado (ver [docs/CSP.md](CSP.md))
- [ ] CORS restringido a https://meteoarchidona.com
- [ ] Acceso a .env, .git, .json denegado

### APIs
- [ ] Rate limiting: 100 req/min configurado
- [ ] HTTPS en todos los endpoints
- [ ] Validación de parámetros (validation.js)
- [ ] Errores sin revelar internals
- [ ] Timeouts configurados

### Front-end
- [ ] Validación de inputs (validation.js)
- [ ] Sanitización de strings
- [ ] Sin XSS vulnerabilities (textContent vs innerHTML)
- [ ] CSP compatible (prueba en Report-Only)
- [ ] No hardcoded secrets/API keys
- [ ] version query params en scripts (cache busting)

### Logs & Monitoring
- [ ] console.log("debug") removido
- [ ] Errores loguean sin datos sensibles
- [ ] Sistema de alertas configurado (opcional)
- [ ] Logs con retención (30 días máximo)

## Deployment Day

### Pre-Launch
- [ ] Backup de producción actual
- [ ] Rollback plan documentado
- [ ] Equipo notificado de cambios
- [ ] Timeline estimado comunicado

### Upload a Hostinger
```bash
# 1. Build local
npm lint && npm test

# 2. Upload files:
# - /pages/
# - /css/
# - /js/
# - /componentes/
# - /assets/
# - /.htaccess (IMPORTANTE)
# - /index.html (redirect)
# - .env.example (referencia, sin valores)

# 3. NO uploadear:
# - /node_modules
# - /.env (valores reales)
# - /.git
# - /tests
# - /docs (opcional, referencia)
```

### Post-Upload
- [ ] Navega a https://meteoarchidona.com
- [ ] Homepage carga sin errores
- [ ] Navbar funciona (prediccion, observaciones, etc)
- [ ] API data se actualiza (temperatura, humedad)
- [ ] Console sin errores 404 o CSP violations
- [ ] HTTPS es obligatorio (intenta http://)
- [ ] Responsive en mobile

### Testing
- [ ] Test en navegador privado (sin cache)
- [ ] Test en Chrome, Firefox, Safari
- [ ] Test en mobile (iOS, Android)
- [ ] Verifica tiempo de carga (<3s)
- [ ] Verifica rate limiting (100 req/min)

### Monitoring (Primeras 24h)
- [ ] Revisa logs de errors
- [ ] Verifica no hay rate limit alerts
- [ ] Confirma API responde
- [ ] Chequea CPU/memory usage
- [ ] Valida futuros datos se guardan

## Post-Deployment

### Validación
- [ ] Usuarios reportan sin issues
- [ ] Dashboard/monitoring verde
- [ ] Datos actualizándose en real-time
- [ ] Sin alertas de seguridad

### Documentación
- [ ] Actualiza CHANGELOG con deployment
- [ ] Documenta qué cambió
- [ ] Marca versión en package.json
- [ ] Haz tag en git: `v1.0.1`

### Feedback Loop
- [ ] Recoge feedback de usuarios
- [ ] Log de issues/bugs encontrados
- [ ] Plan de fixes para próxima release
- [ ] Retrospective de deployment

## Si hay Problemas

### Rollback Rápido
1. Revierte archivos a backup anterior
2. SSH: `rm -rf pages css js componentes index.html .htaccess`
3. Upload de última versión conocida
4. Test y monitorea

### Debugging Post-Deployment
```javascript
// En navegador console
console.log(window.location.href);  // Verifica URL
console.log(window.location.protocol);  // Debe ser https:
// Verifica API
fetch('https://api-meteoarchidona.onrender.com/condiciones-actuales/EL_SILO')
    .then(r => r.json())
    .then(d => console.log(d));
```

## Mensual

- [ ] `npm audit` sin vulns
- [ ] Actualizar dependencias si hay patches
- [ ] Revisar logs para suspicious activity
- [ ] Backup verificado y funcional
- [ ] CSP policy ajustada si es necesario

## Anual

- [ ] Security audit completo
- [ ] Penetration testing (opcional)
- [ ] Actualizar SECURITY.md
- [ ] Review de VULNERABILITIES.md
- [ ] Plan de modernización de dependencias

## Contacto de Emergencia

**Si hay breach de seguridad:**
1. Desconecta el servidor (último recurso)
2. Email: `soporte@meteoarchidona.com`
3. Documenta qué pasó exactamente
4. NO publiques detalles en redes
5. Contacta team tan pronto como sea posible

## Referencias

- [docs/SECURITY.md](SECURITY.md)
- [docs/VULNERABILITIES.md](VULNERABILITIES.md)
- [docs/CSP.md](CSP.md)
- [docs/VALIDATION_GUIDE.md](VALIDATION_GUIDE.md)
- [.env.example](../.env.example)

---

**Última actualización:** 2024-09-08
**Status:** Ready for use
