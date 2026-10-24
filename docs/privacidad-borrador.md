# Privacidad y cookies — borrador

**Estado: BORRADOR, no publicado.** Redactado el 24-10-2026 a partir de lo que la
auditoría guarda realmente (`api-meteoarchidona`, `docs/auditoria.md`, secciones 4.3 y 6.4).
No lo ha revisado un profesional del derecho. Lo marcado **(por confirmar)** necesita
un dato o una decisión de José antes de publicarlo.

Contiene tres textos:

1. El aviso que se muestra al entrar (la primera vez).
2. La política de privacidad (página propia, enlazada desde el aviso y desde el pie).
3. La política de cookies y almacenamiento (puede ir dentro de la anterior).

Normas de referencia: Reglamento (UE) 2016/679 (RGPD), Ley Orgánica 3/2018 (LOPDGDD),
artículo 22.2 de la Ley 34/2002 (LSSI) y la Guía sobre el uso de las cookies de la AEPD.

---

## 1. Aviso al entrar

> **Tu privacidad en MeteoArchidona**
>
> Queremos saber cómo se usa la web para mejorarla: qué páginas y cámaras se consultan,
> desde qué tipo de dispositivo y desde qué zona aproximada. Para ello guardaríamos en tu
> navegador un identificador aleatorio y registraríamos tu dirección IP y tu navegación
> por la web. Son estadísticas propias: no usamos Google Analytics ni compartimos estos
> datos con nadie, ni los usamos para publicidad.
>
> Si no aceptas, la web funciona exactamente igual y no registramos nada.
>
> [ Aceptar ]   [ Rechazar ]   Más información

Reglas de presentación (AEPD):

- "Aceptar" y "Rechazar" en el mismo nivel, mismo tamaño y mismo estilo. Nada marcado de antemano.
- Cerrar el aviso o seguir navegando no es aceptar: hasta que se pulse "Aceptar" no se registra nada.
- "Más información" enlaza a la política de privacidad.
- Un enlace permanente en el pie, "Privacidad", permite cambiar la decisión en cualquier momento, con la misma facilidad con que se dio.
- La decisión se recuerda y se vuelve a preguntar pasados 12 meses.
- No se restringe ningún contenido a quien rechace. (La idea antigua de ocultar datos meteorológicos a quien rechace, en `docs/auditoria.md` de la web, queda descartada: equivaldría a un "muro de cookies".)

---

## 2. Política de privacidad

### ¿Quién es el responsable?

- Responsable: José Ángel Aguilera Páez.
- Contacto para privacidad: infometeoarchidona@meteoarchidona.com

No hay delegado de protección de datos: no es obligatorio para un sitio de este tipo.

Decidido por José el 24-10-2026: en los textos solo figuran el nombre y el correo, suficientes
para el RGPD. El NIF y el domicilio, que exige la LSSI en el aviso legal cuando la web tiene
actividad económica (publicidad o patrocinios), se añadirán en ese momento. No se guardan en
este repositorio porque es público.

### ¿Qué datos tratamos?

**Si navegas sin aceptar las estadísticas**, no registramos nada sobre ti. El servidor web,
como cualquier otro, recibe tu dirección IP para poder enviarte las páginas; los registros
técnicos que eso genere se usan solo para mantener el servicio y su seguridad, y se borran
solos a los 14 días.

**Si aceptas las estadísticas**, registramos:

- Un identificador aleatorio de tu navegador (no contiene ningún dato tuyo) y otro de cada visita.
- Tu dirección IP y la zona aproximada que se deduce de ella (país, región y localidad). No sirve para localizarte con precisión.
- Datos técnicos de la visita: tipo de dispositivo (móvil, tableta u ordenador), navegador y sistema operativo (sin versión), idioma, zona horaria, tamaño de pantalla y de ventana, si la pantalla es táctil y si usas modo oscuro.
- De dónde llegas: solo el nombre de la web de origen (por ejemplo, google.com), nunca la dirección completa, y los parámetros de campaña del enlace si los lleva.
- Qué haces en la web: páginas visitadas, cámaras y emisiones elegidas, timelapses abiertos, capas y fondos del visor de Seguimiento, reproducciones, pantalla completa, y qué bloques llegan a verse en pantalla.

No usamos técnicas para reconocer tu dispositivo sin tu permiso ("huella digital"), no
pedimos tu nombre ni tu correo para estas estadísticas y no tomamos decisiones
automatizadas sobre ti.

**Usuarios registrados** (cuando exista el registro): si inicias sesión, tu navegación desde
ese momento queda asociada a tu cuenta. Nunca guardamos en las estadísticas tu contraseña ni
otras credenciales. **(Ampliar cuando se construya el sistema de usuarios.)**

### ¿Para qué?

Para conocer el uso de MeteoArchidona y mejorarla: qué contenidos interesan, desde qué
dispositivos se consulta, si algo falla o va lento, y cómo cambia el uso cuando hay
fenómenos meteorológicos. Solo se publican o comparten cifras agregadas, nunca datos de
una visita concreta.

### ¿Con qué base legal?

Tu consentimiento (artículo 6.1.a del RGPD), que das al pulsar "Aceptar". Puedes retirarlo
cuando quieras desde el enlace "Privacidad" del pie, sin que eso afecte a lo tratado antes.

### ¿Cuánto tiempo?

- Dirección IP: se borra a los 6 meses.
- Resto de datos de visitas y navegación: 25 meses; después se borran o se reducen a cifras agregadas que no identifican a nadie.
- Si retiras el consentimiento, dejamos de registrar en ese momento. Lo ya registrado se conserva hasta que venzan los plazos anteriores, salvo que nos pidas que lo borremos (ver "¿Qué derechos tienes?"): en ese caso lo borramos.

### ¿Quién más accede?

Nadie, salvo nuestro proveedor de alojamiento, que guarda los datos por cuenta nuestra:
Hostinger International Limited. El servidor está en Reino Unido (Manchester). Reino Unido está fuera de la
Unión Europea, pero la Comisión Europea reconoce que protege los datos personales a un nivel
equivalente (decisión de adecuación, renovada hasta diciembre de 2031), por lo que la
transferencia no necesita garantías adicionales.

No cedemos datos a terceros salvo obligación legal.

Contenido de terceros: las emisiones de YouTube de la sección En vivo no se cargan hasta que
pulsas "Reproducir". A partir de ese momento las sirve YouTube (Google) con su propia
política de privacidad. Las predicciones proceden de AEMET y no implican ningún dato tuyo.

### ¿Qué derechos tienes?

Acceder a tus datos, rectificarlos, suprimirlos, oponerte o limitar su tratamiento, pedir su
portabilidad y retirar tu consentimiento. Escribe a infometeoarchidona@meteoarchidona.com.
Como no te pedimos nombre ni correo, para localizar tus datos necesitaremos el identificador
de tu navegador, que puedes ver en la pantalla "Privacidad" de la web **(por construir)**.

Si crees que no hemos atendido bien tu petición, puedes reclamar ante la Agencia Española de
Protección de Datos (www.aepd.es).

### Menores

MeteoArchidona no está dirigida a menores de 14 años. Si tienes menos de 14 años, no aceptes
las estadísticas.

### Cambios

Si cambia esta política, lo indicaremos aquí con la fecha y, si el cambio afecta a lo que
aceptaste, te volveremos a preguntar.

Última actualización: **(fecha de publicación)**.

---

## 3. Cookies y almacenamiento en tu navegador

Nombre| Para qué| Tipo| Duración
`ma_consentimiento` **(nombre por confirmar)**| Recordar si aceptaste o rechazaste las estadísticas| Técnica, propia; no necesita consentimiento| 12 meses
`ma_visitor_id`| Identificador aleatorio del navegador para las estadísticas| Analítica, propia; solo si aceptas| 12 meses o hasta que la borres **(por confirmar)**
`ma_session_id`| Identificador de la visita actual| Analítica, propia; solo si aceptas| Hasta 30 minutos sin actividad

**(Por confirmar al construir el módulo web: si se guardan como cookies o en el
almacenamiento local del navegador; la política debe decir lo que se use realmente.)**

No usamos cookies de terceros. YouTube puede guardar las suyas cuando reproduces una de sus
emisiones.

Puedes borrar estos datos en cualquier momento desde la configuración de tu navegador.

---

## Pendiente antes de publicar

1. ~~Datos del responsable~~: José Ángel Aguilera Páez (24-10-2026). NIF y domicilio solo cuando haya actividad económica, en el aviso legal.
2. ~~Correo para ejercer derechos~~: infometeoarchidona@meteoarchidona.com (24-10-2026).
3. ~~Plazos de conservación~~: IP 6 meses, resto 25 meses, consentimiento 12 meses (aprobados por José el 24-10-2026).
4. ~~Proveedor de alojamiento~~: servidor en Manchester (Reino Unido), red de Hostinger International Limited (comprobado desde el VPS el 24-10-2026). Reino Unido tiene decisión de adecuación de la UE hasta diciembre de 2031. Entidad confirmada en el recibo de pago del VPS (KVM 4, 28-09-2026), emitido por Hostinger International Ltd.
5. ~~Registros de Nginx~~: rotación diaria, se conservan 14 (comprobado en `/etc/logrotate.d/nginx` el 24-10-2026).
6. ~~Retirada del consentimiento~~: se deja de registrar y lo anterior se conserva hasta su plazo, salvo petición expresa de borrado, que se atiende (decidido por José el 24-10-2026; el RGPD obliga a borrar si se pide tras retirar el consentimiento).
7. ~~Aviso, ventana "Privacidad" y enlace del pie~~: rama `feature/auditoria-consentimiento` (24-10-2026). La política va en `componentes/privacidad.html`, que abre `js/auditoria.js` en una ventana (no es una página propia, para no tocar menú, `.htaccess` ni sitemap). Probado en Chromium que nada se envía antes de "Aceptar" ni tras "Rechazar". Se usa el almacenamiento local del navegador, no cookies.
8. ~~Purga automática~~: desplegada en la API el 24-10-2026 (cada día a las 04:47; IP a los 6 meses, resto a los 25).
9. Recomendable: una revisión por un profesional antes de publicar.
