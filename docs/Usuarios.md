MeteoArchidona — Gestión de usuarios, servicios personalizados, solicitudes y expedientes

Documento: "usuarios.md"
Versión: 0.1
Estado: Diseño funcional y técnico inicial
Proyecto: MeteoArchidona
Fecha: septiembre de 2026

---

1. Objeto del documento

Este documento define el diseño funcional y técnico inicial del subsistema de usuarios de MeteoArchidona.

MeteoArchidona seguirá siendo una plataforma meteorológica de acceso público y gratuito. El registro de usuarios no tendrá como finalidad restringir el acceso a la información meteorológica general, sino proporcionar funcionalidades adicionales de personalización, comunicación, colaboración y relación con la plataforma.

El usuario registrado permitirá evolucionar MeteoArchidona desde una web exclusivamente consultiva hacia una plataforma capaz de ofrecer servicios personalizados y mantener una relación continuada con usuarios, colaboradores y propietarios de estaciones meteorológicas.

El diseño debe contemplar desde el principio su integración con otros subsistemas, especialmente:

- predicciones meteorológicas;
- notificaciones;
- localidades;
- estaciones meteorológicas;
- solicitudes;
- expedientes;
- documentación;
- administración;
- auditoría.

---

2. Principio general: MeteoArchidona continúa siendo pública

El acceso general a MeteoArchidona no requerirá registro.

Un visitante anónimo podrá continuar utilizando las funcionalidades públicas que se determinen, entre ellas:

- consulta de estaciones;
- condiciones meteorológicas;
- radar;
- rayos;
- satélite;
- cámaras;
- históricos públicos;
- predicciones públicas;
- mapas y visores;
- demás información meteorológica de carácter público.

El registro será opcional y gratuito.

El usuario registrado dispondrá de servicios adicionales asociados a su identidad, preferencias y relación con MeteoArchidona.

Por tanto, se establece inicialmente la siguiente clasificación conceptual:

VISITANTE ANÓNIMO
        |
        | registro opcional
        v
USUARIO REGISTRADO
        |
        +-- Servicios personalizados
        +-- Localidades favoritas
        +-- Predicciones
        +-- Alertas
        +-- Notificaciones
        +-- Solicitudes
        +-- Expedientes
        +-- Documentos
        +-- Colaboraciones

Los usuarios internos de MeteoArchidona utilizarán el mismo sistema de identidad, incorporando roles y permisos administrativos.

---

3. Identidad del usuario

3.1. Correo electrónico

El correo electrónico será obligatorio para disponer de una cuenta.

Inicialmente se propone que el correo electrónico sea también el identificador principal para iniciar sesión.

La dirección deberá ser:

- obligatoria;
- única;
- normalizada;
- verificada antes de considerar activa la cuenta.

Podrá existir adicionalmente un nombre, alias o nombre visible, pero este dato no tendrá por qué ser único ni utilizarse como identidad de acceso.

Ejemplo conceptual:

Correo electrónico: usuario@ejemplo.com
Nombre visible: José

3.2. Verificación del correo

Una cuenta recién creada permanecerá pendiente de verificación.

Flujo previsto:

Registro
   |
   v
Creación de cuenta pendiente
   |
   v
Envío de correo de verificación
   |
   v
Usuario pulsa enlace seguro
   |
   v
Correo verificado
   |
   v
Cuenta activa

El enlace utilizará un token:

- aleatorio;
- de un solo uso;
- con caducidad;
- almacenado de forma segura.

3.3. Recuperación de acceso

El sistema deberá disponer de recuperación de contraseña mediante correo electrónico verificado.

Las contraseñas nunca se almacenarán en texto plano.

Se utilizará un algoritmo moderno de derivación de contraseñas, por ejemplo Argon2 o equivalente adecuado en el momento de la implementación.

---

4. Roles y permisos

El subsistema debe permitir diferenciar entre la identidad del usuario y las capacidades que posee.

Como mínimo se prevén inicialmente:

USUARIO
ADMINISTRADOR

Podrán aparecer posteriormente otros roles:

COLABORADOR
GESTOR
SUPERVISOR
ADMINISTRADOR_TECNICO
SUPERADMINISTRADOR

No se deben implementar permisos importantes mediante comprobaciones dispersas en la interfaz.

La autorización deberá realizarse en la API.

La interfaz podrá ocultar opciones que el usuario no pueda ejecutar, pero la API deberá comprobar siempre los permisos de la operación solicitada.

Para cuentas administrativas se recomienda incorporar posteriormente medidas de seguridad reforzada, incluida autenticación multifactor.

---

5. Zona privada del usuario

El usuario registrado dispondrá de una zona personal.

Inicialmente deberá poder contener:

Mi cuenta
Mis datos
Mis localidades
Mis predicciones
Mis alertas
Mis notificaciones
Mis autorizaciones
Mis solicitudes
Mis expedientes
Mis documentos

El diseño debe permitir añadir nuevos servicios sin tener que modificar la estructura principal de la cuenta.

---

6. Localidades

6.1. Catálogo propio de MeteoArchidona

No se cargará inicialmente un catálogo completo con todos los municipios españoles.

MeteoArchidona mantendrá su propio catálogo progresivo de localidades, incorporando únicamente aquellas que vayan siendo necesarias.

La estructura básica sigue el modelo utilizado históricamente en sistemas municipales:

LOCALIDAD
---------
id
codigo_provincia
codigo_municipio
descripcion
activa
fecha_alta

Podrán añadirse posteriormente otros atributos:

codigo_aemet
latitud
longitud
altitud
zona_avisos
otros_identificadores

El código utilizado por AEMET para predicciones municipales está formado por el código provincial y el código del municipio.

Ejemplo:

Archidona
Provincia: Málaga
Código provincia: 29
Código municipio: 017
Código municipal AEMET: 29017

---

7. Localidades de interés del usuario

Un usuario podrá estar interesado en una o varias localidades.

No se almacenará el código de localidad directamente como un atributo simple de "USUARIO".

Se utilizará una relación independiente:

USUARIO
   |
   | 1:N
   v
USUARIO_LOCALIDAD
   |
   | N:1
   v
LOCALIDAD

Modelo inicial:

USUARIO_LOCALIDAD
-----------------
id
usuario_id
localidad_id
principal
activa
fecha_alta

Una de ellas podrá marcarse como localidad principal.

Ejemplo:

José
 |
 +-- Archidona [PRINCIPAL]
 +-- Málaga
 +-- Villanueva del Trabuco
 +-- Granada

Las preferencias específicas de predicción y notificación podrán asociarse posteriormente a cada relación usuario-localidad.

---

8. Alta progresiva de localidades

Cuando un usuario quiera añadir una localidad se ofrecerán dos posibilidades.

8.1. Localidad existente

El usuario seleccionará una localidad disponible en el catálogo de MeteoArchidona.

8.2. Localidad inexistente

Si la localidad todavía no existe, el usuario podrá introducir libremente su nombre.

Ejemplo:

Mi localidad no aparece

Nombre:
[ Villanueva del Trabuco ]

Este texto NO generará automáticamente una nueva fila validada en "LOCALIDAD".

Generará una solicitud pendiente de revisión administrativa.

El administrador comprobará:

- nombre oficial;
- provincia;
- código provincial;
- código municipal;
- posibles duplicados;
- identificadores necesarios para los proveedores meteorológicos.

Tras su validación se creará o vinculará la localidad correspondiente.

Este sistema permitirá que el catálogo vaya creciendo según las necesidades reales de los usuarios.

---

9. Predicciones meteorológicas personalizadas

Una de las principales funcionalidades del usuario registrado será poder recibir predicciones meteorológicas correspondientes a sus localidades de interés.

La primera fuente prevista será AEMET — Agencia Estatal de Meteorología.

---

10. Fuente AEMET

AEMET proporciona públicamente productos de predicción municipal.

Actualmente existen, entre otros:

- predicción municipal para los próximos 7 días;
- predicción municipal horaria de corto plazo;
- información sobre temperatura;
- sensación térmica;
- humedad;
- viento;
- racha máxima;
- precipitación;
- nieve;
- probabilidad de precipitación;
- probabilidad de tormenta;
- estado del cielo;
- avisos correspondientes a la zona meteorológica.

La documentación pública actual de AEMET describe una predicción horaria de aproximadamente las próximas 43 horas.

La duración exacta disponible no deberá codificarse rígidamente en MeteoArchidona. El proveedor deberá interpretar dinámicamente la información suministrada por AEMET.

AEMET dispone además de productos municipales diarios y horarios en AEMET OpenData.

---

11. Consumo de XML de AEMET

AEMET permite descargar productos municipales en XML.

MeteoArchidona podrá utilizar esos XML como fuente de información para generar sus propias estructuras internas.

El identificador municipal será obtenido a partir del catálogo validado de localidades.

La arquitectura propuesta será:

AEMET
  |
  | XML
  v
ProveedorPrediccionAemet
  |
  v
Normalización
  |
  v
Modelo MeteoArchidona
  |
  +--> PostgreSQL / caché
  |
  +--> API pública
  |
  +--> generación de predicciones
  |
  +--> notificaciones

No deberá utilizarse el XML de AEMET como modelo interno permanente de la aplicación.

Debe existir una capa de proveedor.

Ejemplo conceptual:

ProveedorPrediccionAemet

obtener_prediccion_diaria(codigo_municipio)
obtener_prediccion_horaria(codigo_municipio)

Python puede procesar los XML mediante herramientas estándar como "xml.etree.ElementTree".

Si posteriormente fueran necesarias capacidades XML más avanzadas podrá evaluarse "lxml".

---

12. Modelo normalizado de predicción

Ejemplo conceptual:

PREDICCION_MUNICIPIO
--------------------
localidad_id
fecha_elaboracion
fuente
fecha_descarga

Detalle diario:

PREDICCION_DIA
--------------
prediccion_id
fecha
temperatura_minima
temperatura_maxima
humedad_minima
humedad_maxima
estado_cielo
probabilidad_precipitacion
viento
racha_maxima
indice_uv
...

Detalle horario:

PREDICCION_HORA
---------------
prediccion_id
fecha_hora
temperatura
sensacion_termica
humedad
estado_cielo
direccion_viento
velocidad_viento
racha_maxima
precipitacion
nieve
probabilidad_precipitacion
probabilidad_nieve
probabilidad_tormenta
nivel_aviso
...

Este desacoplamiento permitirá cambiar o añadir proveedores sin modificar el resto del sistema.

---

13. Evitar consultas repetitivas a AEMET

Las predicciones no se descargarán individualmente para cada usuario.

Si 500 usuarios solicitan predicción para Archidona, MeteoArchidona no realizará 500 consultas equivalentes.

La arquitectura será:

Una descarga AEMET de Archidona
              |
              v
Predicción normalizada
              |
              v
Almacenamiento / caché
              |
       +------+------+------+
       |      |      |      |
       v      v      v      v
    usuario usuario usuario ...

Esto reduce:

- tráfico;
- dependencia externa;
- tiempos de respuesta;
- riesgo de bloqueo;
- consumo de recursos.

---

14. Predicción MeteoArchidona

La información recibida desde AEMET podrá transformarse en una presentación propia de MeteoArchidona.

Ejemplo conceptual:

Buenos días.

Para hoy en Archidona se espera una mañana estable.
La temperatura máxima se situará alrededor de 27 °C.

La probabilidad de precipitación aumentará durante
la tarde y el viento se reforzará a partir de las 18:00.

El contenido, diseño, resumen, iconografía y forma de presentación podrán ser propios.

Sin embargo, se deberá identificar siempre adecuadamente la procedencia de los datos.

Ejemplo:

Fuente de los datos meteorológicos:
AEMET — Agencia Estatal de Meteorología.

MeteoArchidona no deberá presentarse como autora de una predicción cuya fuente meteorológica subyacente sea AEMET.

---

15. Suscripciones de predicción

El usuario podrá decidir qué servicios desea recibir.

Ejemplo:

Archidona

Predicción diaria:      Sí
Alertas meteorológicas: Sí
Canal:                  Correo electrónico
Hora preferida:         07:00

El modelo deberá permitir que diferentes localidades tengan configuraciones diferentes.

Ejemplo:

ARCHIDONA
Predicción diaria -> correo
Alertas            -> correo

MÁLAGA
Predicción diaria -> no
Alertas            -> correo

---

16. Canales de comunicación

Inicialmente se contempla:

CORREO ELECTRÓNICO

Como evolución futura:

WHATSAPP

y eventualmente otros canales.

El canal de comunicación deberá estar desacoplado del servicio.

Ejemplo:

Servicio: Predicción diaria
Canal: Correo electrónico

o:

Servicio: Alerta meteorológica
Canal: WhatsApp

El correo electrónico será obligatorio para la cuenta.

El número de teléfono será opcional y solo será necesario si el usuario desea utilizar servicios que requieran ese canal.

---

17. Envío de correo mediante Python

La API Python puede realizar envíos de correo electrónico.

No deberá acoplarse el resto de la aplicación a un proveedor concreto.

Se definirá una abstracción:

ProveedorCorreo

con operaciones equivalentes a:

enviar_verificacion()
enviar_recuperacion_password()
enviar_prediccion()
enviar_alerta()
enviar_notificacion_expediente()

La implementación concreta podrá utilizar:

- SMTP;
- servidor de correo del dominio;
- proveedor especializado;
- API externa de correo transaccional.

La selección se realizará en la fase de implementación.

---

18. Autorizaciones del usuario

No será suficiente almacenar únicamente:

recibir_prediccion = true

Las comunicaciones periódicas deberán disponer de una autorización explícita, verificable y revocable.

La autorización se modelará como una entidad independiente.

Ejemplo:

AUTORIZACION_USUARIO
--------------------
id
usuario_id
tipo_autorizacion
canal
localidad_id
estado
fecha_solicitud
fecha_autorizacion
fecha_revocacion
version_documento
hash_documento
creado_en
actualizado_en

Estados iniciales:

PENDIENTE
AUTORIZADA
REVOCADA
CADUCADA

---

19. Proceso de autorización

Cuando el usuario active una comunicación periódica:

Usuario solicita servicio
        |
        v
Autorización PENDIENTE
        |
        v
Correo de confirmación
        |
        v
Usuario consulta información
        |
        v
Pulsa "AUTORIZAR"
        |
        v
Autorización registrada
        |
        v
Servicio ACTIVO

Hasta que no exista autorización confirmada no comenzarán los envíos periódicos.

---

20. Documento informativo de autorización

El correo de autorización podrá incluir un PDF informativo.

No se pretende utilizar una firma electrónica documental.

El objetivo será que el usuario:

1. conozca qué servicio solicita;
2. conozca qué comunicaciones recibirá;
3. conozca los canales utilizados;
4. conozca que puede cancelar el servicio;
5. conozca, cuando proceda, que las comunicaciones pueden incluir publicidad;
6. pulse expresamente un enlace de autorización.

Los documentos estarán versionados.

Ejemplo:

Autorización de predicción meteorológica
Versión 1.0

La autorización deberá conservar:

version_documento
hash_documento
fecha_autorizacion

Esto permitirá demostrar posteriormente qué texto estaba vigente cuando el usuario autorizó el servicio.

---

21. Consentimiento granular

No se utilizará una autorización genérica para todas las comunicaciones.

El usuario podrá decidir independientemente.

Ejemplo:

Predicción diaria por correo        [Sí]
Alertas meteorológicas por correo   [Sí]
Predicción por WhatsApp             [No]
Información de MeteoArchidona       [No]

Cuando sea necesario, la autorización podrá también asociarse a una localidad concreta.

---

22. Publicidad en comunicaciones

Los servicios para usuarios registrados serán gratuitos.

MeteoArchidona podrá utilizar espacios publicitarios como mecanismo para contribuir a la financiación y amortización de los gastos del proyecto.

Las predicciones, alertas u otras comunicaciones gratuitas podrán incorporar publicidad.

Esta posibilidad deberá comunicarse previamente al usuario antes de que autorice el servicio.

Ejemplo conceptual:

Solicito recibir por correo electrónico la predicción
meteorológica correspondiente a mis localidades.

Estas comunicaciones gratuitas podrán incorporar
contenidos publicitarios claramente identificados
destinados a contribuir a la financiación de
MeteoArchidona.

La publicidad deberá:

- estar claramente identificada;
- diferenciarse del contenido meteorológico;
- identificar adecuadamente al anunciante cuando proceda;
- cumplir la normativa aplicable sobre comunicaciones comerciales.

Antes de poner en producción publicidad dentro de correos se realizará una revisión específica del cumplimiento de la LSSI y restante normativa aplicable.

---

23. Publicidad en alertas

La publicidad nunca deberá interferir con información meteorológica relevante para la seguridad.

Una alerta deberá mantener siempre una jerarquía clara:

ALERTA METEOROLÓGICA

Información principal
Zona afectada
Periodo
Riesgo
Recomendaciones
Fuente

--------------------------------

PUBLICIDAD
Contenido publicitario

--------------------------------

Gestión de notificaciones

No se insertará publicidad entre fragmentos esenciales de una alerta.

---

24. Cancelación de notificaciones

Todos los correos periódicos deberán incluir un mecanismo sencillo para cancelar ese tipo de comunicación.

Ejemplo:

Recibes este correo porque estás suscrito a la
predicción meteorológica diaria de MeteoArchidona.

Si no deseas recibir más este tipo de notificación,
pulsa aquí para cancelar tu suscripción.

El enlace utilizará un token seguro.

No será necesario iniciar sesión para completar una baja individual desde el correo.

El flujo será:

Correo
  |
  v
Cancelar esta suscripción
  |
  v
Confirmación
  |
  v
Autorización REVOCADA
  |
  v
Fin de los envíos

La baja será:

- sencilla;
- gratuita;
- inmediata o técnicamente efectiva en el menor plazo posible;
- registrada;
- auditable.

---

25. Baja granular

Cancelar un servicio no debe cancelar necesariamente todos los demás.

Ejemplo:

Predicción diaria Archidona    ACTIVA
Alertas Archidona              ACTIVA
Predicción diaria Málaga       ACTIVA

Si el usuario cancela:

Predicción diaria Archidona

los otros servicios seguirán activos.

También existirá desde la zona privada una gestión global de preferencias.

---

26. Bandeja administrativa

MeteoArchidona dispondrá de una bandeja administrativa centralizada.

No se limitará a solicitudes de localidades.

Será un centro de trabajo para diferentes tipos de solicitudes.

Ejemplos:

Alta de localidad
Participación con estación meteorológica
Solicitud de colaboración
Aportación de cámara meteorológica
Corrección de datos
Incidencia
Otras futuras solicitudes

Ejemplo de interfaz:

BANDEJA DE ADMINISTRACIÓN

Pendientes: 8
En revisión: 3
Esperando usuario: 2

------------------------------------------------
Tipo             Usuario       Estado
------------------------------------------------
Localidad        Pedro         Pendiente
Estación         Antonio       En revisión
Localidad        Ana           Pendiente
Estación         María         Esperando usuario
------------------------------------------------

La bandeja no será una tabla independiente de negocio.

Será una vista de trabajo sobre solicitudes y expedientes.

---

27. Solicitudes

Se define la solicitud como la manifestación inicial realizada por un usuario.

Modelo conceptual:

SOLICITUD
---------
id
usuario_id
tipo
estado
prioridad
fecha_creacion
fecha_actualizacion
administrador_asignado_id
observaciones

Tipos iniciales posibles:

ALTA_LOCALIDAD
PARTICIPACION_ESTACION
COLABORACION
INCIDENCIA
OTRA

---

28. Solicitudes y registro obligatorio

Una solicitud que pueda generar un expediente deberá estar obligatoriamente asociada a un usuario registrado.

Sin embargo, para reducir fricción, podrá permitirse comenzar una solicitud antes de disponer de cuenta.

Ejemplo:

1. Datos de la solicitud
2. Datos específicos
3. Registro de usuario
4. Verificación de correo
5. Presentación definitiva

La solicitud permanecerá en borrador hasta que la cuenta haya quedado correctamente vinculada y verificada.

No se presentará definitivamente un expediente anónimo.

---

29. Gestión de expedientes

Una solicitud formal dará lugar a un expediente.

Se establece la siguiente distinción:

SOLICITUD
=
lo que presenta el usuario

EXPEDIENTE
=
la tramitación interna que nace de esa solicitud

El expediente será el elemento central de gestión administrativa y técnica.

---

30. Modelo de expediente

Modelo conceptual:

EXPEDIENTE
----------
id
numero_expediente
tipo_expediente_id
solicitud_origen_id
usuario_solicitante_id
administrador_asignado_id
estado
fecha_apertura
fecha_resolucion
entidad_relacionada_tipo
entidad_relacionada_id

Cada expediente tendrá un número único y estable.

Ejemplo:

MA-EST-2026-0012

El formato definitivo se decidirá durante la implementación.

---

31. Asignación administrativa

Cada expediente podrá estar:

SIN ASIGNAR

o asignado a un administrador.

Ejemplo:

Administrador responsable: José

La asignación deberá quedar registrada en el historial.

Esto permitirá distribuir el trabajo entre varios administradores y evitar actuaciones duplicadas.

---

32. Procedimientos configurables

Cada tipo de expediente seguirá un procedimiento predefinido.

No deben programarse todos los procedimientos mediante grandes bloques de código específicos.

Se propone una estructura configurable:

TIPO_EXPEDIENTE
        |
        v
PROCEDIMIENTO
        |
        +--> PASO 1
        +--> PASO 2
        +--> PASO 3
        +--> ...

Tablas conceptuales:

TIPO_EXPEDIENTE
PROCEDIMIENTO
PROCEDIMIENTO_PASO
EXPEDIENTE
EXPEDIENTE_PASO

Esto permitirá crear nuevos tipos de expediente sin rediseñar todo el motor.

---

33. Ejemplo: incorporación de estación meteorológica

Una solicitud para aportar una estación meteorológica podría abrir:

TIPO:
INCORPORACIÓN DE ESTACIÓN COLABORADORA

Procedimiento inicial orientativo:

1. Recepción de solicitud
2. Alta provisional de estación
3. Revisión técnica
4. Validación de ubicación
5. Validación de comunicaciones
6. Configuración de integración
7. Pruebas de recepción
8. Validación final
9. Resolución
10. Alta definitiva

La definición exacta del procedimiento se realizará en el subsistema específico de estaciones.

---

34. Relación entre expediente y estado de estación

Los pasos de un expediente podrán provocar cambios en las entidades de negocio.

Ejemplo:

Paso:
Alta provisional
        |
        v
ESTACION.estado = PROYECTADA

Posteriormente:

Validación técnica
        |
        v
ESTACION.estado = EN_PRUEBAS

Finalmente:

Resolución favorable
        |
        v
ESTACION.estado = ACTIVA

Una resolución desfavorable podrá producir:

ESTACION.estado = RECHAZADA

El objetivo es evitar que determinados estados críticos se modifiquen arbitrariamente fuera del procedimiento previsto.

---

35. Datos originales de la solicitud

Los datos aportados inicialmente por el usuario deberán conservarse.

Ejemplo:

Modelo indicado por el usuario:
"Davis Vantage Pro2"

Aunque posteriormente los administradores corrijan o amplíen los datos de la estación, el expediente conservará la información originalmente presentada.

Esto permite mantener trazabilidad sobre:

- qué declaró el usuario;
- qué se verificó;
- qué se modificó;
- quién realizó cada modificación.

---

36. Actuaciones de expediente

Cada expediente dispondrá de actuaciones.

Modelo conceptual:

ACTUACION_EXPEDIENTE
--------------------
id
expediente_id
fecha_hora
usuario_id
tipo_actuacion
descripcion
paso_id
visible_usuario
requiere_respuesta_usuario

Ejemplo:

12/09/2026
Solicitud recibida.

13/09/2026
José revisa la documentación.

13/09/2026
Se solicita modelo exacto del datalogger.

14/09/2026
El usuario aporta la información solicitada.

15/09/2026
Mario valida la conectividad.

16/09/2026
Resolución favorable.

---

37. Actuaciones del usuario

El usuario no será únicamente un observador del expediente.

Desde su zona privada podrá realizar actuaciones cuando el procedimiento lo permita.

Ejemplos:

Responder requerimiento
Aportar información
Modificar datos solicitados
Adjuntar fotografías
Adjuntar documentación
Aceptar determinadas condiciones
Subsanar información

Una actuación solicitada podrá incluir:

requiere_respuesta_usuario = true

y opcionalmente:

fecha_limite

---

38. Mis expedientes

El usuario registrado dispondrá de:

MIS EXPEDIENTES

Podrá consultar únicamente los expedientes a los que tenga derecho de acceso.

Como mínimo se mostrará:

Número
Tipo
Fecha de apertura
Estado
Última actuación
Acciones pendientes
Resolución

Ejemplo:

MA-EST-2026-0012

Tipo:
Incorporación de estación meteorológica

Estado:
PENDIENTE DE INFORMACIÓN

Acción requerida:
Aportar fotografía de instalación

[ Ver expediente ]
[ Adjuntar documento ]
[ Responder ]

---

39. Seguridad de acceso a expedientes

El control deberá realizarse siempre en la API.

Un usuario ordinario podrá consultar únicamente expedientes que le pertenezcan o para los que tenga autorización explícita.

Nunca se confiará únicamente en que la interfaz no muestre enlaces.

Ejemplo conceptual:

expediente.usuario_solicitante_id
==
usuario_autenticado.id

o deberá existir un permiso administrativo válido.

---

40. Documentos del expediente

Los expedientes podrán contener documentos.

Ejemplos:

- fotografías;
- fichas técnicas;
- autorizaciones;
- capturas;
- documentos aportados por el usuario;
- informes internos;
- resoluciones;
- otros ficheros.

Modelo conceptual:

DOCUMENTO_EXPEDIENTE
--------------------
id
expediente_id
actuacion_id
usuario_subida_id
nombre_original
tipo_documento
fecha_subida
ruta_almacenamiento
hash
tamano
mime_type

No se recomienda almacenar grandes documentos directamente como BLOB dentro de PostgreSQL salvo una necesidad específica.

Se utilizará almacenamiento de objetos o sistema equivalente preparado para persistencia.

No se dependerá del almacenamiento local efímero del servicio API.

---

41. Acceso seguro a documentos

Los documentos privados no deberán estar disponibles mediante URLs públicas permanentes.

Toda descarga deberá verificar:

- usuario autenticado;
- expediente;
- permisos;
- relación entre el usuario y el expediente.

Podrán utilizarse URLs temporales firmadas si el almacenamiento seleccionado lo permite.

---

42. Resolución del expediente

Los expedientes finalizarán mediante una resolución o forma equivalente de cierre.

Modelo conceptual:

RESOLUCION_EXPEDIENTE
---------------------
id
expediente_id
tipo_resolucion
fecha
administrador_id
texto
documento_id

Tipos posibles:

FAVORABLE
DESFAVORABLE
DESISTIMIENTO
ARCHIVO

El usuario podrá consultar la resolución desde su zona privada.

Posteriormente podrá generarse un documento PDF formal cuando resulte útil.

---

43. Solicitudes de información y subsanación

El administrador podrá solicitar nueva información.

Ejemplo:

Se solicita:

- fotografía de la instalación;
- modelo exacto del gateway;
- URL o API de publicación.

El expediente pasará a un estado equivalente a:

PENDIENTE_USUARIO

El usuario recibirá una notificación.

Cuando responda:

PENDIENTE_USUARIO
        |
        v
respuesta recibida
        |
        v
EN_REVISION

Todo el ciclo quedará registrado.

---

44. Comunicaciones relacionadas con expedientes

Los correos relativos a una actuación administrativa no deben confundirse con las suscripciones meteorológicas.

Ejemplo:

Tu expediente MA-EST-2026-0012
requiere una actuación.

El correo podrá limitarse a avisar de la existencia de una actuación pendiente.

El detalle completo deberá consultarse preferentemente desde la zona privada autenticada.

---

45. Auditoría y expediente son conceptos diferentes

Debe existir una separación clara.

Actuación del expediente

Representa un hecho funcional que forma parte del expediente.

Ejemplo:

Se aporta fotografía solicitada.

Auditoría

Representa técnicamente quién hizo qué dentro del sistema.

Ejemplo:

Usuario 154
POST /expedientes/812/documentos
12/09/2026 18:45:12
resultado: OK

Ambos sistemas estarán relacionados, pero no son equivalentes.

---

46. Integración con el subsistema de auditoría

El subsistema de usuarios deberá integrarse plenamente con la auditoría general de MeteoArchidona.

Serán auditables, entre otras:

Registro
Verificación de correo
Inicio de sesión
Cierre de sesión
Cambio de contraseña
Recuperación de contraseña
Cambio de datos
Alta de localidad
Solicitud de localidad
Alta o baja de suscripción
Autorización
Revocación
Creación de solicitud
Creación de expediente
Asignación de expediente
Cambio de estado
Actuación
Carga de documento
Descarga de documento
Resolución
Acción administrativa

---

47. Modelo preliminar de entidades

El subsistema podrá evolucionar inicialmente alrededor de las siguientes entidades:

USUARIO
ROL
USUARIO_ROL

LOCALIDAD
USUARIO_LOCALIDAD

SUSCRIPCION_NOTIFICACION
AUTORIZACION_USUARIO

SOLICITUD

TIPO_EXPEDIENTE
PROCEDIMIENTO
PROCEDIMIENTO_PASO

EXPEDIENTE
EXPEDIENTE_PASO
ACTUACION_EXPEDIENTE
DOCUMENTO_EXPEDIENTE
RESOLUCION_EXPEDIENTE

NOTIFICACION

La auditoría se mantendrá en su subsistema independiente.

---

48. Modelo conceptual global

USUARIO
   |
   +-----------------------------+
   |                             |
   v                             v
USUARIO_LOCALIDAD           SOLICITUD
   |                             |
   v                             v
LOCALIDAD                    EXPEDIENTE
   |                             |
   |                             +--> PASOS
   |                             |
   |                             +--> ACTUACIONES
   |                             |
   |                             +--> DOCUMENTOS
   |                             |
   |                             +--> RESOLUCIÓN
   |
   +--> PREDICCIONES
   |
   +--> SUSCRIPCIONES
   |
   +--> AUTORIZACIONES
   |
   +--> NOTIFICACIONES

---

49. Arquitectura técnica general

La arquitectura deberá respetar la separación habitual de MeteoArchidona:

WEB
 |
 v
API FastAPI
 |
 +--> Servicios de usuarios
 |
 +--> Servicios de localidades
 |
 +--> Servicios de predicción
 |
 +--> Servicios de notificación
 |
 +--> Servicios de expedientes
 |
 +--> Servicios de autorización
 |
 +--> Servicios de auditoría
 |
 v
Repositorios
 |
 v
SQLAlchemy
 |
 v
PostgreSQL

Los proveedores externos permanecerán desacoplados:

AEMET
Correo
WhatsApp
otros futuros proveedores

---

50. Procesos automáticos

Determinados servicios requerirán procesamiento programado o asíncrono.

Ejemplos:

Actualizar predicciones AEMET
Generar predicciones personalizadas
Enviar predicciones diarias
Procesar alertas
Enviar correos
Caducar tokens
Caducar autorizaciones pendientes
Generar recordatorios de expedientes

Estos procesos no deben ejecutarse necesariamente dentro de una petición HTTP del usuario.

Se diseñará posteriormente el mecanismo de worker o trabajos programados adecuado a la infraestructura de MeteoArchidona.

---

51. Notificaciones pendientes

Se recomienda mantener una entidad que permita conocer el estado de cada comunicación.

Ejemplo:

NOTIFICACION
------------
id
usuario_id
tipo
canal
localidad_id
expediente_id
estado
fecha_programada
fecha_envio
fecha_error
intentos

Estados orientativos:

PENDIENTE
EN_PROCESO
ENVIADA
ERROR
CANCELADA

Esto permitirá controlar reintentos y evitar envíos duplicados.

---

52. Protección frente a duplicados

Los procesos automáticos deberán ser idempotentes siempre que sea posible.

Ejemplo:

Una predicción diaria concreta para:

usuario = 25
localidad = 29017
fecha = 2026-09-15
tipo = PREDICCION_DIARIA

no deberá enviarse dos veces accidentalmente por ejecutar dos veces el mismo worker.

Se utilizarán identificadores deterministas, restricciones únicas o mecanismos equivalentes.

---

53. Protección de datos y privacidad

La implementación definitiva deberá respetar:

- Reglamento General de Protección de Datos;
- legislación española de protección de datos;
- LSSI para comunicaciones electrónicas y publicidad;
- restante normativa aplicable.

El consentimiento deberá ser:

- informado;
- inequívoco;
- demostrable;
- revocable.

No se utilizarán casillas premarcadas para obtener autorizaciones opcionales.

La retirada de autorización debe resultar sencilla.

---

54. Comunicaciones comerciales

Cuando las comunicaciones incorporen publicidad deberán observarse específicamente las obligaciones aplicables a comunicaciones comerciales electrónicas.

La legislación vigente exige, entre otros aspectos, identificación de las comunicaciones comerciales y mecanismos sencillos y gratuitos de revocación.

La implementación concreta de publicidad dentro de predicciones o alertas deberá someterse a una revisión jurídica previa a producción para asegurar la correcta aplicación de estas obligaciones a comunicaciones mixtas que contienen tanto servicio meteorológico solicitado como contenido publicitario.

---

55. Referencias externas principales

Este diseño se apoya inicialmente en:

AEMET
Predicción por municipios
Predicción a 7 días
Predicción por horas
AEMET OpenData

AEPD
Criterios de consentimiento conforme al RGPD

Ley 34/2002
Servicios de la Sociedad de la Información
y Comercio Electrónico
Artículos relativos a comunicaciones comerciales
y revocación del consentimiento

Las fuentes deberán revisarse nuevamente antes de implementar en producción cualquier funcionalidad sujeta a requisitos legales.

---

56. Decisiones adoptadas hasta esta versión

Se consideran decisiones de diseño ya asumidas:

1. MeteoArchidona continuará siendo pública y gratuita.
2. El registro será gratuito y opcional para el acceso general.
3. El correo electrónico será obligatorio para una cuenta.
4. El correo deberá verificarse.
5. El correo será inicialmente el identificador principal de acceso.
6. Un usuario podrá tener varias localidades de interés.
7. Existirá un catálogo propio y progresivo de localidades.
8. No se cargará inicialmente el catálogo completo nacional.
9. Si una localidad no existe, el usuario podrá solicitarla mediante texto libre.
10. Las localidades solicitadas serán validadas por administración.
11. AEMET será la fuente inicial de predicciones municipales.
12. Los XML de AEMET se procesarán mediante una capa de proveedor.
13. Los modelos internos de MeteoArchidona estarán desacoplados del XML.
14. No se consultará AEMET individualmente por cada usuario.
15. Las predicciones podrán enviarse por correo electrónico.
16. WhatsApp se contempla como canal futuro.
17. Las comunicaciones periódicas requerirán autorización.
18. Las autorizaciones serán versionadas y revocables.
19. Los servicios gratuitos podrán incorporar publicidad.
20. La posible publicidad se comunicará antes de la autorización.
21. Cada correo periódico incluirá mecanismo de baja.
22. La baja podrá afectar únicamente al servicio correspondiente.
23. Existirá una bandeja administrativa unificada.
24. Las solicitudes formales estarán vinculadas a usuarios registrados.
25. Las solicitudes podrán abrir expedientes.
26. Cada expediente podrá asignarse a un administrador.
27. Los expedientes seguirán procedimientos configurables.
28. Los procedimientos estarán formados por pasos.
29. Los pasos podrán modificar estados de entidades de negocio.
30. Los usuarios podrán consultar sus expedientes.
31. Los usuarios podrán realizar actuaciones requeridas.
32. Los usuarios podrán adjuntar documentación.
33. Existirán resoluciones de expediente.
34. Todas las operaciones relevantes se integrarán con auditoría.

---

57. Cuestiones pendientes de definición

Quedan abiertas para futuras iteraciones, entre otras:

- campos definitivos de la ficha de usuario;
- política de contraseña;
- autenticación multifactor;
- duración de sesiones;
- nombre visible y alias;
- roles definitivos;
- diseño visual de la zona privada;
- estructura definitiva del catálogo de localidades;
- campos geográficos adicionales;
- periodicidad de actualización de AEMET;
- política de almacenamiento histórico de predicciones;
- formato definitivo de la Predicción MeteoArchidona;
- horario configurable de predicciones;
- definición completa de alertas;
- proveedor de correo;
- infraestructura de WhatsApp;
- proveedor de almacenamiento de documentos;
- tamaño máximo y tipos admitidos de adjuntos;
- procedimientos concretos de expedientes;
- numeración de expedientes;
- reglas de plazos;
- sistema de recordatorios;
- política de conservación de datos;
- política de conservación de auditoría;
- diseño definitivo de publicidad;
- revisión legal previa a producción.

---

58. Filosofía del subsistema

El sistema de usuarios no debe entenderse simplemente como:

email + contraseña

Debe convertirse en la identidad con la que una persona puede relacionarse con MeteoArchidona.

Esa identidad permitirá:

Consultar
Personalizar
Suscribirse
Autorizar
Recibir información
Colaborar
Solicitar
Tramitar
Aportar documentación
Consultar expedientes
Recibir resoluciones

El objetivo es mantener al mismo tiempo dos principios fundamentales:

METEOARCHIDONA PÚBLICA Y GRATUITA

+

SERVICIOS PERSONALIZADOS PARA QUIEN
VOLUNTARIAMENTE QUIERA REGISTRARSE

El diseño deberá mantenerse modular y extensible para que nuevas funcionalidades puedan incorporarse sin romper el modelo de usuario existente.

---

Fin del documento