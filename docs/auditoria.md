# Auditoría, trazabilidad y analítica propia de MeteoArchidona

## Estado

**Pendiente de desarrollo.**

Este documento define el trabajo previsto para incorporar a MeteoArchidona un subsistema propio de auditoría, trazabilidad de sesiones y analítica de uso.

La implementación se realizará por fases. Antes de diseñar la persistencia definitiva en PostgreSQL se construirá un laboratorio de captura que permita comprobar qué información puede obtenerse realmente desde los navegadores actuales y desde la API.

El objetivo es disponer de una auditoría propia, alojada en nuestra infraestructura, sin depender de Google Analytics ni de servicios equivalentes de terceros.

---

## 1. Objetivo general

MeteoArchidona debe poder conocer y reconstruir, con un nivel de detalle útil, cómo se utiliza la web.

El sistema deberá permitir:

- contabilizar visitas;
- contabilizar visitantes distintos;
- reconocer navegadores recurrentes;
- distinguir visitantes, sesiones y eventos;
- conocer cuántas veces vuelve un mismo navegador;
- reconstruir cronológicamente lo ocurrido durante una sesión;
- conocer qué páginas, tarjetas, cámaras, estaciones y visores se utilizan;
- conocer qué capas del visor se activan;
- registrar errores y problemas del frontend o de la API;
- disponer de información técnica suficiente para investigar abuso, spam, automatismos o comportamientos anómalos;
- disponer en el futuro de trazabilidad para foros, comentarios u otras funciones participativas;
- generar estadísticas diarias, semanales, mensuales e históricas;
- mantener todos los datos de auditoría bajo control de MeteoArchidona.

La finalidad no es identificar civilmente a los visitantes, sino disponer de una identidad técnica o pseudónima suficientemente estable para reconocer que un mismo navegador vuelve a utilizar MeteoArchidona.

---

## 2. Principio de diseño: visitante, sesión y evento

La auditoría se estructurará conceptualmente en tres niveles.

### 2.1. Visitante

Representa un navegador reconocido a lo largo del tiempo.

Se prevé utilizar una cookie propia persistente, por ejemplo:

```text
ma_visitor_id
```

Su valor será un identificador aleatorio generado por MeteoArchidona.

Ejemplo conceptual:

```text
Visitante: 4b0b7b9c-...

Primera visita:   2026-09-12 08:14
Última visita:    2026-09-19 19:42
Días activo:      6
Sesiones:         18
Páginas vistas:   74
```

El identificador no contendrá nombre, correo electrónico, teléfono, DNI ni ningún dato civil del visitante.

La cookie permitirá reconocer que el mismo navegador vuelve a MeteoArchidona mientras siga conservándola.

---

### 2.2. Sesión

Cada entrada o periodo de actividad constituirá una sesión independiente.

Se prevé utilizar un identificador específico, por ejemplo:

```text
ma_session_id
```

Una misma identidad técnica de visitante podrá acumular múltiples sesiones:

```text
VISITANTE 0001842
├── sesión 019281
├── sesión 019402
├── sesión 019887
├── sesión 020113
└── sesión 020551
```

Cada sesión tendrá, como mínimo, información de inicio, última actividad y finalización o expiración.

---

### 2.3. Evento

Cada acción funcional relevante realizada dentro de la web generará un evento de auditoría asociado a la sesión y, cuando corresponda, al visitante.

El objetivo es poder reconstruir la secuencia completa de uso.

Ejemplo:

```text
13:04:12  SESION_INICIADA
13:04:12  PAGINA_ABIERTA       /
13:04:18  TARJETA_ABIERTA      El Silo
13:04:31  MENU_ABIERTO         Visores
13:04:34  VISOR_ABIERTO        Meteorológico
13:04:41  CAPA_ACTIVADA        Radar
13:04:53  CAPA_ACTIVADA        Rayos
13:05:07  TIMELINE_CAMBIADO    12:40
13:05:12  ANIMACION_INICIADA
13:06:45  ANIMACION_DETENIDA
13:07:18  CAMARA_SELECCIONADA  El Silo Este
13:09:43  PAGINA_ABANDONADA
```

Este registro debe permitir obtener la “película” completa de una sesión.

---

## 3. Qué se auditará

La intención es auditar prácticamente todas las acciones funcionales significativas realizadas por un usuario en la web.

Ejemplos:

```text
SESION_INICIADA
SESION_FINALIZADA

PAGINA_ABIERTA
PAGINA_ABANDONADA

MENU_ABIERTO
MENU_CERRADO
PESTANA_SELECCIONADA
BOTON_PULSADO
MODAL_ABIERTO
MODAL_CERRADO

ESTACION_SELECCIONADA
TARJETA_ABIERTA

VISOR_ABIERTO
VISOR_CERRADO
CAPA_ACTIVADA
CAPA_DESACTIVADA
TIMELINE_CAMBIADO
ANIMACION_INICIADA
ANIMACION_DETENIDA

CAMARA_SELECCIONADA
CAMARA_PANTALLA_COMPLETA

DESCARGA_INICIADA

ERROR_FRONTEND
ERROR_API
```

El catálogo definitivo de eventos se definirá a medida que se instrumente cada subsistema.

---

## 4. Qué no se auditará como evento individual

No se pretende almacenar cada acontecimiento físico generado por el navegador.

No deben registrarse indiscriminadamente eventos como:

```text
mousemove
pointermove
touchmove
scroll
```

Estos eventos pueden producir cientos o miles de registros durante una sola sesión y no aportan valor proporcional.

Cuando una interacción continua sea relevante, se almacenará un resumen.

Ejemplo:

```text
SCROLL_MAXIMO
profundidad = 83 %
```

en lugar de centenares de eventos de desplazamiento.

La regla será:

> Auditar cada acción funcional relevante, no cada movimiento físico del dispositivo.

---

## 5. Información técnica a estudiar y capturar

Antes de decidir qué campos se almacenarán definitivamente se realizará una fase de laboratorio.

La información se dividirá entre datos obtenidos por el navegador y datos obtenidos por la API.

---

## 6. Información obtenible desde el navegador

La página de pruebas deberá investigar, entre otros, los siguientes datos:

```text
Fecha y hora local
Zona horaria
Idioma principal
Idiomas declarados
User-Agent
User-Agent Client Hints, cuando existan
Plataforma declarada
Tipo de dispositivo estimado
Número de núcleos lógicos
Memoria aproximada, cuando el navegador la exponga

Pantalla:
- ancho
- alto
- área disponible
- profundidad de color
- orientación
- Device Pixel Ratio

Viewport:
- ancho
- alto

Capacidades:
- pantalla táctil
- número máximo de puntos táctiles
- cookies habilitadas
- estado online
- Do Not Track, cuando exista

Conexión:
- tipo de conexión cuando el navegador lo exponga
- velocidad aproximada cuando esté disponible

Navegación:
- URL actual
- página de entrada
- referrer
```

No todos los navegadores proporcionan la misma información.

La fase de pruebas debe comprobar diferencias reales entre Android, iOS, Chrome, Safari, Firefox y escritorio.

---

## 7. Información obtenible desde la API

Cuando el navegador llame a la API, el servidor podrá conocer información adicional.

Debe estudiarse, entre otras:

```text
IP pública
Fecha y hora del servidor
User-Agent recibido
Accept-Language
Origin
Referer
Cabeceras técnicas seleccionadas
Información del proxy / X-Forwarded-For cuando corresponda
```

La información enviada por el cliente no debe considerarse autoritativa cuando el mismo dato pueda obtenerse directamente en el servidor.

Por ejemplo, la IP que quede asociada a una auditoría deberá proceder del servidor o de la infraestructura proxy conocida, nunca de un campo arbitrario enviado por JavaScript.

---

## 8. Geolocalización aproximada por IP

Se estudiará la posibilidad de enriquecer una sesión a partir de su IP pública con información aproximada como:

```text
País
Comunidad o región
Provincia
Localidad aproximada
Código postal aproximado, cuando exista
ISP / operador
ASN
Tipo de red, cuando pueda determinarse
```

Esta información se considerará siempre aproximada.

No deberá presentarse como GPS ni como posición física exacta.

Durante la fase de pruebas se compararán resultados reales utilizando diferentes conexiones:

- Wi-Fi;
- fibra;
- datos móviles;
- diferentes operadores;
- dispositivos distintos.

El objetivo es medir la precisión real antes de decidir qué información se conservará.

---

## 9. Cookies propias de MeteoArchidona

Se prevén al menos dos identificadores:

```text
ma_visitor_id
ma_session_id
```

### `ma_visitor_id`

Identificador persistente de navegador.

Permitirá reconocer visitas sucesivas y construir estadísticas de recurrencia.

### `ma_session_id`

Identificador de la sesión actual.

Permitirá agrupar todos los eventos producidos durante una entrada concreta.

---

## 10. Consentimiento y preferencia del visitante

La analítica persistente basada en una cookie propia de visitante se activará únicamente cuando corresponda según la política de consentimiento que finalmente se adopte.

La interfaz deberá distinguir claramente entre:

```text
ACEPTAR AUDITORÍA Y ESTADÍSTICAS
RECHAZAR
MÁS INFORMACIÓN
```

No se utilizará una aceptación genérica de la “política de cookies” como sustituto del consentimiento para una finalidad concreta.

### Comportamiento funcional propuesto si se rechaza

Se ha planteado como decisión de producto que un visitante que rechace el tratamiento analítico pueda seguir navegando por la estructura de la web, pero que determinados datos meteorológicos aparezcan restringidos en las tarjetas o componentes de información.

Ejemplo de mensaje:

```text
Información restringida por la configuración
de privacidad seleccionada.
```

**Esta decisión queda pendiente de validación jurídica específica antes de llevarse a producción**, especialmente para comprobar que el mecanismo de acceso alternativo y la configuración del consentimiento cumplen la normativa aplicable.

Hasta completar esa validación, este comportamiento debe considerarse una propuesta funcional, no una decisión cerrada de implementación.

---

## 11. Diferencia entre analítica y seguridad

La arquitectura deberá separar expresamente dos finalidades.

### 11.1. Analítica de uso

Incluye:

```text
visitantes
sesiones
páginas vistas
recurrencia
navegadores
dispositivos
uso de estaciones
uso de cámaras
uso del visor
uso de radar
uso de rayos
uso de satélite
duración
rutas de navegación
```

### 11.2. Seguridad y moderación

Incluye información necesaria para:

```text
detección de abuso
spam
rate limiting
automatismos
ataques
errores
moderación futura
trazabilidad de publicaciones
bloqueos
investigación de incidentes
```

Ambas finalidades pueden compartir determinados datos técnicos, pero deberán estar diferenciadas conceptualmente y, si es necesario, también en su persistencia y política de retención.

---

## 12. Datos que no deben recopilarse indiscriminadamente

La auditoría no tendrá como finalidad obtener información sensible o privada ajena al funcionamiento de MeteoArchidona.

No se pretende recopilar:

```text
contraseñas
números de cuenta
datos bancarios
tokens de autenticación
cookies de terceros
cookies de autenticación completas
contactos del dispositivo
IMEI
MAC
Android ID
contenido del portapapeles
micrófono
cámara
GPS solicitado al navegador sin una función específica
historial de navegación externo
```

Tampoco se copiará de forma indiscriminada el contenido de:

```text
document.cookie
cabeceras HTTP completas
formularios completos
campos de texto
```

La auditoría debe registrar acciones y contexto técnico, no capturar secretos.

---

## 13. Formularios

Cuando exista un formulario se auditará la acción, no necesariamente su contenido.

Ejemplo:

```text
FORMULARIO_ABIERTO
FORMULARIO_ENVIADO
FORMULARIO_CANCELADO
```

No debe enviarse automáticamente a la auditoría el texto introducido por el usuario.

Si el contenido forma parte funcional de MeteoArchidona —por ejemplo, un mensaje de un futuro foro— se almacenará en el dominio funcional correspondiente y la auditoría guardará la referencia al objeto.

---

## 14. Futuro foro y moderación

MeteoArchidona podrá incorporar más adelante un foro o sistema de debate propio.

Cuando exista, la auditoría deberá permitir asociar cada operación relevante con su contexto técnico.

Ejemplo conceptual:

```text
alias
visitor_id
session_id
ip
fecha_hora
mensaje_id
user_agent
geolocalizacion_aproximada
estado_moderacion
motivo_bloqueo
```

Eventos previstos:

```text
FORO_ABIERTO
HILO_ABIERTO
MENSAJE_PUBLICADO
MENSAJE_EDITADO
MENSAJE_ELIMINADO
MENSAJE_REPORTADO
USUARIO_BLOQUEADO
```

El objetivo es que el anonimato público no implique ausencia total de trazabilidad técnica para los administradores.

Los datos técnicos detallados se utilizarán internamente para seguridad y moderación. No se considera parte del diseño publicar IP, identificadores técnicos o información detallada de conexión de un visitante.

---

## 15. Endpoint de auditoría

La API deberá exponer un punto de entrada común para los eventos.

Diseño conceptual inicial:

```http
POST /auditoria/eventos
```

Ejemplo:

```json
{
  "visitor_id": "65df...",
  "session_id": "9ad2...",
  "evento": "CAPA_ACTIVADA",
  "pagina": "/visor",
  "componente": "mapa",
  "elemento": "rayos",
  "fecha_cliente": "2026-09-12T03:30:00+02:00",
  "datos": {
    "capa": "rayos",
    "instante": "2026-09-12T03:25:00+02:00"
  }
}
```

El servidor completará posteriormente la información técnica de confianza:

```text
fecha_hora_servidor
ip
user_agent_recibido
visitor_id_validado
session_id_validado
```

El contrato definitivo se diseñará después de la fase experimental.

---

## 16. Envío por lotes

Aunque conceptualmente cada acción relevante produce una auditoría, no es obligatorio realizar una petición HTTP independiente por cada clic.

Para reducir tráfico y escrituras se estudiará un mecanismo de buffer en el frontend.

Ejemplo:

```text
evento 1
evento 2
evento 3
evento 4
        ↓
POST /auditoria/eventos/lote
```

El lote podrá enviarse:

- al alcanzar determinado número de eventos;
- al transcurrir unos segundos;
- al cambiar de página;
- al abandonar la aplicación.

Este mecanismo deberá conservar el orden original mediante la fecha/hora del cliente y, si es necesario, un número de secuencia.

---

## 17. Cierre de página

El evento de salida requiere tratamiento especial porque una petición HTTP convencional puede cancelarse cuando el navegador abandona la página.

Se estudiará el uso de:

```text
navigator.sendBeacon()
```

o mecanismo equivalente.

Podrá utilizarse para enviar:

```text
PAGINA_ABANDONADA
SESION_FINALIZADA
último lote pendiente
duración aproximada
profundidad máxima de scroll
```

No se debe asumir que todo cierre podrá registrarse siempre; el sistema deberá tolerar sesiones sin evento explícito de finalización y cerrarlas por expiración.

---

## 18. Catálogo controlado de eventos

Los nombres de los eventos no deberán quedar completamente libres.

Se definirá un catálogo común de tipos de evento para evitar variantes como:

```text
radar_abierto
abrir_radar
open_radar
click_radar
```

para la misma operación.

La taxonomía deberá ser coherente en toda la web.

Los eventos podrán admitir un campo flexible `datos`, pero los tipos principales deberán estar controlados.

---

## 19. Laboratorio previo a PostgreSQL

Antes de crear modelos SQLAlchemy, migraciones Alembic o tablas PostgreSQL se construirá un entorno de prueba.

Nombre provisional:

```text
/auditoria.html
```

La página tendrá como finalidad mostrar qué información puede obtener realmente el navegador actual.

Ejemplo de interfaz:

```text
METEOARCHIDONA — DIAGNÓSTICO DE VISITANTE

IDENTIFICACIÓN
────────────────────────────────────
Visitor ID
Session ID

NAVEGADOR
────────────────────────────────────
User Agent
Plataforma
Navegador
Idioma
Zona horaria

DISPOSITIVO
────────────────────────────────────
Pantalla
Viewport
Pixel ratio
Touch
Puntos táctiles
CPU lógica
Memoria, si existe

CONEXIÓN
────────────────────────────────────
IP pública
Operador
País
Provincia
Ciudad aproximada
Código postal aproximado
ASN

PROCEDENCIA
────────────────────────────────────
Página
Referrer
Hora cliente
Hora servidor
```

En esta primera fase no se diseñará todavía la persistencia definitiva.

El objetivo es descubrir qué podemos capturar de verdad.

---

## 20. Batería inicial de pruebas

El laboratorio deberá probarse con diferentes combinaciones.

Ejemplos:

```text
Samsung / Chrome / Wi-Fi
Samsung / Chrome / datos móviles
iPhone / Safari
PC / Chrome
PC / Firefox
modo incógnito
cookies habilitadas
cookies rechazadas
cookies eliminadas
cambio Wi-Fi -> datos móviles
misma cookie con IP distinta
misma IP con varios dispositivos
regreso al día siguiente
regreso varios días después
```

Debe documentarse qué campos se obtienen y cuáles no en cada navegador.

---

## 21. Reconocimiento de un visitante recurrente

La cookie persistente será la señal principal para reconocer el mismo navegador a lo largo del tiempo.

La IP será una señal técnica adicional, no el identificador principal.

Ejemplos:

```text
misma cookie
IP distinta

=> probablemente mismo navegador desde otra conexión
```

```text
misma IP
cookies distintas

=> pueden ser varios navegadores o varias personas
```

```text
cookie eliminada
IP distinta

=> no debe darse por hecho que se trata del mismo visitante
```

No se pretende construir un sistema de fingerprinting agresivo destinado a reconstruir una identidad después de que el usuario elimine deliberadamente sus cookies.

---

## 22. Persistencia futura

Sólo después de completar la fase experimental se diseñará el modelo definitivo en PostgreSQL.

La estructura conceptual prevista es:

```text
auditoria_visitantes
auditoria_sesiones
auditoria_eventos
```

Podrá existir además una tabla agregada, por ejemplo:

```text
auditoria_estadisticas_diarias
```

para acelerar informes históricos.

La estructura definitiva no queda fijada todavía.

---

## 23. Posibles campos de visitantes

Diseño orientativo, pendiente de validación:

```text
id
visitor_id
primera_visita
ultima_visita
numero_sesiones
dias_activo
```

No deben duplicarse datos derivados que puedan calcularse de forma eficiente salvo que exista una necesidad clara de rendimiento.

---

## 24. Posibles campos de sesiones

Diseño orientativo:

```text
id
visitor_id
session_id
inicio
ultima_actividad
fin
pagina_entrada
pagina_salida
referrer
ip
user_agent
idioma
zona_horaria
dispositivo
sistema_operativo
navegador
pais
region
provincia
localidad_aproximada
codigo_postal_aproximado
isp
asn
es_bot
```

La lista se revisará después de las pruebas reales.

---

## 25. Posibles campos de eventos

Diseño orientativo:

```text
id
visitor_id
session_id
fecha_cliente
fecha_servidor
secuencia
tipo_evento
pagina
componente
elemento
datos
```

`datos` podrá utilizar un tipo JSON/JSONB para información específica del evento.

---

## 26. Estadísticas previstas

El sistema deberá poder producir como mínimo:

```text
visitas por día
visitantes distintos
visitantes recurrentes
sesiones por visitante
páginas vistas
páginas por sesión
duración media
hora de mayor actividad
dispositivos
navegadores
sistemas operativos
país / región / provincia aproximada
referrers
páginas de entrada
páginas de salida
```

Y estadísticas específicas de MeteoArchidona:

```text
estaciones más consultadas
cámaras más vistas
uso del visor
uso del radar
uso de rayos
uso de satélite
uso de cada capa
reproducciones de timeline
duración de uso del visor
errores frontend
errores API
```

---

## 27. Análisis de comportamiento

Al conservar una secuencia ordenada de eventos será posible estudiar recorridos reales.

Ejemplos:

```text
¿Qué hace el visitante después de abrir la portada?
¿Qué porcentaje abre una estación?
¿Qué porcentaje abre el visor?
¿Qué porcentaje activa radar?
¿Qué porcentaje activa rayos después del radar?
¿Qué cámara recibe más visitas?
¿Qué funciones apenas se utilizan?
¿En qué punto se abandona una página?
¿Qué utiliza normalmente un visitante recurrente?
```

Esto podrá utilizarse para mejorar navegación, diseño y prioridades de desarrollo.

---

## 28. Actividad meteorológica y tráfico

Una ventaja específica de MeteoArchidona será poder relacionar estadísticas agregadas de audiencia con episodios meteorológicos.

Ejemplo:

```text
Tormenta local

tráfico habitual:         1x
tráfico durante episodio: 8x

usuarios que abren radar: 74 %
usuarios que abren rayos: 61 %
cámara más consultada:    El Silo
```

Esta correlación deberá realizarse preferentemente sobre datos agregados, no como perfil individual innecesario.

---

## 29. Panel administrativo futuro

Se prevé construir un panel privado de auditoría y estadísticas.

Ejemplo conceptual:

```text
METEOARCHIDONA · AUDITORÍA

HOY
────────────────────────
Visitas
Visitantes distintos
Sesiones
Páginas vistas
Duración media

AHORA
────────────────────────
Sesiones activas aproximadas

MÁS CONSULTADO
────────────────────────
Visor
Cámaras
El Silo
Los Llanos

CAPAS DEL VISOR
────────────────────────
Radar
Rayos
Satélite
```

También deberá permitir consultar una sesión concreta.

Ejemplo:

```text
Visitante 0001842
Sesión 020551
```

y mostrar cronológicamente todos sus eventos.

---

## 30. Bots y automatismos

La auditoría deberá intentar distinguir, cuando sea razonablemente posible:

```text
navegadores humanos
bots conocidos
crawlers
monitores
automatismos
tráfico sospechoso
```

La clasificación no debe darse por infalible.

Debe poder corregirse o evolucionar sin modificar el histórico bruto de eventos.

---

## 31. Seguridad del endpoint

El endpoint de auditoría será público porque deberá ser llamado por el frontend público, pero eso no significa que los datos recibidos sean confiables.

Debe contemplarse:

- validación estricta de esquemas;
- tamaño máximo de cada evento;
- número máximo de eventos por lote;
- catálogo de eventos permitido;
- rate limiting;
- protección frente a payloads gigantes;
- saneamiento de strings;
- no ejecutar ni interpretar contenido recibido;
- límites al tamaño de `datos`;
- rechazo de campos no permitidos cuando corresponda.

El sistema debe asumir que un tercero puede llamar directamente al endpoint sin utilizar nuestra web.

---

## 32. Integridad de los registros

La fecha y hora del servidor será la referencia autoritativa para la recepción del evento.

La fecha del cliente se conservará únicamente como dato complementario para ordenar interacciones y detectar desfases.

El frontend no podrá decidir directamente:

```text
IP
fecha_servidor
ASN calculado
geolocalización calculada
```

Estos datos serán añadidos por la API.

---

## 33. Retención

La política definitiva de retención queda pendiente.

Antes de producción deberá decidirse cuánto tiempo conservar:

```text
IP completas
sesiones
eventos individuales
datos técnicos
datos de seguridad
estadísticas agregadas
```

No debe asumirse que todos los datos necesitan conservarse indefinidamente.

Es posible mantener estadísticas agregadas durante mucho más tiempo que determinados datos técnicos individuales.

---

## 34. Rendimiento

La auditoría no debe ralentizar la experiencia principal de MeteoArchidona.

Principios:

- peticiones asíncronas;
- envío por lotes cuando sea apropiado;
- no bloquear la navegación esperando respuesta de auditoría;
- reintentos limitados;
- tolerar la pérdida ocasional de un evento no crítico;
- limitar eventos de alta frecuencia;
- índices adecuados en PostgreSQL cuando se diseñe la persistencia;
- agregaciones periódicas para informes costosos.

La web meteorológica tiene prioridad sobre la telemetría.

---

## 35. Privacidad por diseño

Aunque se pretende obtener una trazabilidad rica, el sistema deberá mantener una regla básica:

> Registrar información útil para funcionamiento, estadísticas, seguridad y moderación; no recopilar secretos ni información ajena a MeteoArchidona.

Antes de producción se revisarán:

- textos informativos;
- consentimiento;
- política de cookies;
- política de privacidad;
- finalidades;
- bases de tratamiento;
- retención;
- acceso administrativo;
- seguridad de los datos.

---

## 36. Fases de implementación previstas

### Fase 1 — Laboratorio frontend

Crear:

```text
/auditoria.html
```

Objetivo:

- solicitar autorización para la prueba;
- generar identificadores temporales de visitante y sesión cuando corresponda;
- capturar información disponible desde JavaScript;
- mostrarla en pantalla;
- no diseñar todavía las tablas PostgreSQL.

---

### Fase 2 — Diagnóstico desde API

Crear un endpoint temporal de diagnóstico.

Objetivo:

- comprobar IP observada por Render;
- comprobar cabeceras reales;
- comprobar User-Agent;
- comprobar `X-Forwarded-For` u otras cabeceras del proxy;
- comparar hora cliente/servidor;
- probar geolocalización por IP;
- probar operador/ASN.

Todavía sin modelo definitivo de persistencia.

---

### Fase 3 — Pruebas cruzadas

Probar múltiples dispositivos, navegadores y redes.

Documentar:

- qué datos aparecen;
- qué datos faltan;
- diferencias entre navegadores;
- precisión de geolocalización;
- comportamiento al cambiar de red;
- comportamiento al eliminar cookies;
- comportamiento en modo incógnito.

---

### Fase 4 — Diseño del modelo

Después de disponer de datos reales:

- definir `auditoria_visitantes`;
- definir `auditoria_sesiones`;
- definir `auditoria_eventos`;
- decidir índices;
- decidir JSONB;
- decidir retención;
- decidir agregados diarios;
- crear modelos SQLAlchemy;
- crear migración Alembic;
- crear tests.

---

### Fase 5 — Instrumentación de la web

Incorporar auditoría progresivamente a:

- portada;
- estaciones;
- cámaras;
- visor;
- radar;
- rayos;
- satélite;
- navegación;
- formularios;
- futuras funciones.

Cada subsistema deberá definir sus eventos funcionales.

---

### Fase 6 — Panel administrativo

Crear un panel privado con:

- estadísticas;
- actividad diaria;
- visitantes;
- sesiones;
- trazabilidad de una sesión;
- eventos;
- filtros;
- errores;
- información de seguridad.

---

### Fase 7 — Foro y moderación

Cuando se desarrolle el foro:

- integrar identidad técnica de visitante;
- asociar mensajes con sesiones;
- registrar operaciones de moderación;
- incorporar bloqueos;
- mantener trazabilidad de incidentes.

---

## 37. Trabajo pendiente inmediato

Este subsistema queda documentado, pero no se inicia todavía su implementación porque actualmente existen otros trabajos prioritarios en MeteoArchidona.

Cuando se retome, el orden acordado será:

1. Crear la página de laboratorio `auditoria.html`.
2. Obtener información real del navegador sin PostgreSQL.
3. Crear endpoint temporal de diagnóstico de servidor.
4. Comparar datos cliente/servidor.
5. Probar dispositivos y conexiones reales.
6. Evaluar precisión de geolocalización IP.
7. Cerrar el catálogo inicial de datos y eventos.
8. Revisar el comportamiento de consentimiento previsto.
9. Diseñar persistencia PostgreSQL.
10. Implementar modelos, migraciones y tests.
11. Instrumentar los subsistemas uno a uno.
12. Crear el panel administrativo.

---

## 38. Decisiones ya tomadas

Quedan fijadas como criterios de diseño:

- MeteoArchidona tendrá analítica propia.
- No se dependerá de Google Analytics para este subsistema.
- Se distinguirán visitante, sesión y evento.
- Se pretende reconocer técnicamente a un navegador recurrente.
- Se utilizará un identificador propio persistente cuando corresponda.
- Cada acción funcional significativa generará auditoría.
- No se registrarán movimientos físicos de alta frecuencia sin valor.
- Se estudiará la IP y su geolocalización aproximada.
- La IP no sustituirá al identificador persistente de visitante.
- Se separará analítica de seguridad/moderación.
- No se capturarán contraseñas, tokens, cuentas bancarias ni secretos.
- No se copiarán indiscriminadamente cookies o formularios.
- La fase experimental precederá al diseño de PostgreSQL.
- El modelo definitivo se decidirá con datos reales obtenidos en pruebas.
- El endpoint de auditoría será público pero estrictamente validado.
- La auditoría no deberá bloquear ni ralentizar las funciones meteorológicas.
- El futuro foro deberá integrarse con esta trazabilidad.
- Los datos técnicos detallados serán de uso administrativo interno.
- La política definitiva de consentimiento y retención se revisará antes de producción.

---

## 39. Definición de éxito

El subsistema estará correctamente implantado cuando MeteoArchidona pueda responder, entre otras, a preguntas como:

```text
¿Cuántas visitas hemos tenido hoy?
¿Cuántos navegadores distintos han entrado?
¿Cuántos son recurrentes?
¿Cuántas veces ha vuelto un visitante concreto?
¿Qué hizo durante cada sesión?
¿Qué páginas utilizó?
¿Qué estación consultó?
¿Qué cámaras abrió?
¿Qué capas del visor activó?
¿Cuánto tiempo estuvo?
¿Desde qué tipo de dispositivo accedió?
¿Qué navegador utilizó?
¿Desde qué zona aproximada se conectó?
¿Se produjeron errores?
¿Hay actividad sospechosa?
¿Qué funciones de MeteoArchidona son las más utilizadas?
```

La auditoría deberá permitir contestar estas preguntas sin necesidad de identificar civilmente al visitante.

---

# Fin del documento