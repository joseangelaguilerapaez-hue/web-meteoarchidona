# Subsistema de predicción y alertas meteorológicas

## 1. Propósito

Este documento define el diseño funcional inicial del subsistema de predicción y alertas meteorológicas de MeteoArchidona.

El objetivo del subsistema es proporcionar información meteorológica futura de forma clara, útil, personalizada y con identidad propia, utilizando fuentes meteorológicas externas de referencia y añadiendo una capa editorial propia de MeteoArchidona.

El subsistema deberá proporcionar principalmente:

- predicción meteorológica diaria;
- predicción meteorológica semanal;
- predicción detallada a corto plazo;
- alertas meteorológicas oficiales;
- alertas propias de MeteoArchidona;
- representación gráfica de las predicciones;
- textos descriptivos propios;
- refranes y expresiones meteorológicas;
- recomendaciones ante situaciones meteorológicas adversas;
- integración futura con usuarios y sistemas de notificación.

La predicción meteorológica y las alertas se consideran partes de un mismo subsistema.


## 2. Estado del subsistema

En el momento de redactar este documento, el subsistema todavía no está implementado.

Este documento constituye una primera especificación funcional.

No se consideran todavía definitivos:

- el modelo de base de datos;
- las tablas;
- los nombres de campos;
- los servicios;
- los repositorios;
- los proveedores;
- los endpoints;
- los procesos automáticos;
- las frecuencias definitivas de actualización;
- la interfaz pública.

Estas decisiones se tomarán durante la implementación.


## 3. Principios generales

El subsistema seguirá los siguientes principios:

- utilizar fuentes meteorológicas identificadas;
- conservar la procedencia de cada predicción;
- almacenar la información necesaria en la infraestructura propia;
- evitar que la web pública dependa directamente de proveedores externos;
- separar adquisición, normalización, persistencia, negocio y presentación;
- proporcionar una presentación propia de MeteoArchidona;
- diferenciar claramente información oficial e información propia;
- mantener históricos cuando aporten valor;
- permitir futuras ampliaciones;
- facilitar la personalización por usuario y municipio;
- mantener una identidad meteorológica local.


## 4. Fuentes iniciales

Inicialmente se contemplan dos fuentes externas principales:

1. AEMET.
2. eltiempo.es.

Ambas fuentes tendrán responsabilidades independientes y deberán identificarse correctamente.


## 5. AEMET

AEMET será la fuente oficial y principal de predicción meteorológica.

MeteoArchidona utilizará los productos de AEMET que resulten adecuados para obtener información estructurada de predicción y alertas.

Entre los productos de interés se encuentra la predicción por municipios.


## 6. Predicción municipal de AEMET

AEMET dispone de información estructurada de predicción municipal.

Entre los productos de interés para MeteoArchidona se encuentra la predicción de siete días.

También existen productos de predicción más detallada a corto plazo que podrán estudiarse durante la implementación.

El objetivo será obtener estos datos mediante los mecanismos de acceso programático proporcionados por AEMET, evitando procesos manuales.


## 7. XML de predicción

AEMET proporciona predicciones municipales mediante información estructurada descargable, incluyendo XML.

El subsistema deberá disponer de un proveedor específico encargado de:

1. solicitar la información;
2. recibirla;
3. interpretar el contenido;
4. normalizarlo al modelo propio;
5. persistir la información necesaria.

La estructura exacta de los productos utilizados deberá estudiarse antes de implementar el normalizador.


## 8. Flujo previsto de AEMET

El flujo conceptual será:

**AEMET → adquisición → normalización → PostgreSQL → servicios → API MeteoArchidona → web**

La web pública no deberá depender de una consulta directa a AEMET para representar la predicción.


## 9. Conservación de la fuente

Cada predicción deberá conservar información suficiente para conocer su procedencia.

MeteoArchidona podrá transformar la presentación de la predicción, pero no deberá hacer pasar datos externos por observaciones o predicciones generadas originalmente por MeteoArchidona.


## 10. eltiempo.es

eltiempo.es será inicialmente una segunda fuente meteorológica de interés.

Podrá utilizarse como:

- fuente complementaria de predicción;
- fuente editorial;
- fuente de contenidos meteorológicos adicionales;
- posible fuente multimedia.

La integración concreta dependerá de los mecanismos técnicos disponibles y de las condiciones de utilización de sus contenidos.


## 11. Contenido multimedia de eltiempo.es

Se estudiará especialmente la posibilidad de integrar contenidos audiovisuales de predicción meteorológica.

Entre ellos podrán encontrarse vídeos con presentadores meteorológicos y partes diarios.

Estos contenidos solo se integrarán cuando exista un mecanismo autorizado para hacerlo.

Si el proveedor permite insertar o compartir el contenido mediante un reproductor, widget, enlace o mecanismo equivalente, MeteoArchidona podrá utilizarlo.

No se presupone que cualquier contenido audiovisual pueda descargarse, copiarse o redistribuirse.


## 12. Predicción diaria

MeteoArchidona ofrecerá una predicción diaria.

La información podrá incluir, dependiendo de los datos disponibles:

- estado del cielo;
- temperatura máxima;
- temperatura mínima;
- precipitación;
- probabilidad de precipitación;
- viento;
- dirección del viento;
- humedad;
- tormentas;
- nieve;
- fenómenos adversos;
- información adicional proporcionada por las fuentes.

La lista definitiva dependerá del análisis de los productos disponibles.


## 13. Predicción semanal

Uno de los productos principales será la predicción de los próximos días.

Como referencia inicial se utilizará la predicción municipal de siete días proporcionada por AEMET.

La interfaz pública deberá permitir comprender rápidamente la evolución meteorológica de la semana.


## 14. Predicción a corto plazo

Además de la visión semanal, se estudiará la utilización de productos de mayor resolución temporal para las próximas horas.

Esto permitirá proporcionar información más detallada cuando las fuentes utilizadas lo permitan.


## 15. No desarrollar inicialmente una predicción propia

MeteoArchidona no desarrollará inicialmente un modelo meteorológico propio basado en años de observaciones históricas.

Esta línea queda aparcada.

La arquitectura no deberá impedir que en el futuro se estudien:

- modelos estadísticos;
- aprendizaje automático;
- inteligencia artificial;
- correcciones locales de predicciones externas.

Pero estas posibilidades no forman parte del alcance inicial.


## 16. Capa editorial propia

Aunque los datos procedan de fuentes externas, MeteoArchidona tendrá una forma propia de presentar y describir la predicción.

No se pretende limitar la web a reproducir literalmente textos de otros proveedores.

Los datos estructurados serán interpretados para construir una narrativa propia.


## 17. Motor de narrativa meteorológica

Se diseñará un motor de narrativa meteorológica.

Su función será convertir condiciones y predicciones estructuradas en descripciones naturales y variadas.

Por ejemplo, una situación de lluvia podrá expresarse de distintas formas sin modificar el significado meteorológico de la predicción.


## 18. Condiciones meteorológicas normalizadas

La narrativa no deberá depender directamente de códigos particulares de cada proveedor.

Se establecerá un conjunto propio de conceptos meteorológicos normalizados.

Como ejemplos iniciales:

- despejado;
- poco nuboso;
- nuboso;
- cubierto;
- lluvia;
- lluvia intensa;
- chubascos;
- tormenta;
- nieve;
- niebla;
- viento;
- viento fuerte;
- frío;
- helada;
- calor;
- calor intenso.

La clasificación definitiva se determinará al estudiar las fuentes.


## 19. Catálogo de frases meteorológicas

MeteoArchidona dispondrá de un catálogo propio de frases meteorológicas.

Este catálogo permitirá proporcionar variedad a los partes.

Podrá contener:

- expresiones meteorológicas;
- frases coloquiales;
- frases humorísticas;
- expresiones populares;
- refranes;
- expresiones tradicionales;
- determinadas expresiones en otros idiomas utilizadas deliberadamente.

Por ejemplo, podrán existir expresiones equivalentes a:

- jornada pasada por agua;
- día de perros;
- en abril, aguas mil;
- it's raining cats and dogs.

El catálogo deberá crecer progresivamente.


## 20. Catálogo cerrado

El catálogo de frases meteorológicas será un catálogo editorial interno de MeteoArchidona.

No será un catálogo abierto a los usuarios.

Los usuarios registrados no podrán dar de alta libremente:

- frases;
- refranes;
- expresiones;
- textos meteorológicos.

Las incorporaciones serán realizadas o aprobadas por los responsables de MeteoArchidona.


## 21. Clasificación de frases

Las frases deberán poder relacionarse con condiciones que determinen cuándo pueden utilizarse.

Entre otras:

- fenómeno;
- intensidad;
- época del año;
- mes;
- estación;
- contexto;
- tono.

Esto evitará utilizar una frase correcta en un contexto meteorológico incorrecto.


## 22. Refranes condicionados

Los refranes no deberán seleccionarse únicamente mediante azar.

Su utilización podrá depender de condiciones adicionales.

Por ejemplo:

> En abril, aguas mil.

solo tendrá sentido durante abril y cuando exista un contexto relacionado con precipitación.

El motor deberá comprobar estas condiciones antes de considerar una frase candidata.


## 23. Selección aleatoria controlada

Cuando existan varias frases válidas para una misma situación, podrá realizarse una selección aleatoria.

La selección podrá evolucionar posteriormente para:

- evitar repeticiones excesivas;
- favorecer variedad;
- utilizar pesos;
- considerar frases utilizadas recientemente.

La aleatoriedad nunca deberá alterar el significado meteorológico.


## 24. Inteligencia artificial y narrativa

En una evolución futura podrá estudiarse la utilización de inteligencia artificial como herramienta de redacción.

En ese caso, la IA no será necesariamente la fuente de la predicción.

Podrá utilizar información meteorológica estructurada y validada para construir una narración más natural.

Cualquier mecanismo de este tipo deberá impedir que la capa narrativa invente:

- temperaturas;
- precipitaciones;
- probabilidades;
- alertas;
- fenómenos;
- datos no existentes en las fuentes utilizadas.


## 25. Iconografía meteorológica

La predicción tendrá una representación gráfica mediante iconos meteorológicos.

MeteoArchidona pretende disponer progresivamente de una iconografía propia.

Los iconos propios tendrán un estilo visual coherente con la identidad del proyecto.


## 26. Iconos propios de MeteoArchidona

Los iconos propios podrán incorporar:

- caricaturas;
- expresiones;
- cierto sentido del humor;
- personalidad visual;
- elementos reconocibles de MeteoArchidona.

El humor no deberá impedir identificar rápidamente el fenómeno meteorológico representado.


## 27. Catálogo normalizado de iconos

La representación gráfica se separará del significado meteorológico.

Un código meteorológico normalizado podrá tener asociado un icono propio.

Conceptualmente:

**condición meteorológica → representación gráfica**

Esto permitirá sustituir imágenes sin modificar los datos meteorológicos.


## 28. Prioridad de iconos

La estrategia inicial será:

1. utilizar un icono propio de MeteoArchidona cuando exista;
2. utilizar el recurso gráfico proporcionado por la fuente cuando esté permitido y no exista sustituto propio;
3. utilizar un icono genérico propio como último recurso.

De esta forma la colección gráfica podrá desarrollarse progresivamente.


## 29. Iconos proporcionados por AEMET

Cuando AEMET proporcione una URL correspondiente a una representación gráfica de la predicción, podrá conservarse la referencia necesaria para utilizarla cuando proceda.

No será necesario descargar y almacenar automáticamente cada icono si el mecanismo proporcionado permite utilizarlo directamente y sus condiciones de uso lo permiten.

La implementación deberá respetar siempre las condiciones aplicables a esos recursos.


## 30. Variantes gráficas

En el futuro podrán existir varias representaciones propias para una misma condición.

Por ejemplo, varias caricaturas diferentes de una jornada soleada.

Si se utiliza selección aleatoria entre iconos, todas las variantes candidatas deberán representar inequívocamente el mismo fenómeno.


## 31. Alertas meteorológicas

Las alertas forman parte integral del subsistema de predicción.

MeteoArchidona gestionará inicialmente dos fuentes claramente diferenciadas:

1. alertas oficiales de AEMET;
2. alertas propias de MeteoArchidona.


## 32. Alertas oficiales de AEMET

Los avisos procedentes de AEMET se mostrarán identificados como avisos oficiales.

MeteoArchidona conservará la información necesaria sobre su origen.

Cuando se represente una alerta oficial deberá quedar claro para el usuario que la fuente es AEMET.


## 33. Alertas propias de MeteoArchidona

MeteoArchidona podrá publicar alertas propias.

Estas alertas serán elaboradas a partir del análisis meteorológico realizado por los responsables del proyecto y de la información disponible.

Podrán existir incluso cuando AEMET no haya publicado un aviso oficial para la misma situación.

También podrán coexistir con avisos oficiales y aportar una valoración más localizada.


## 34. Diferenciación entre alertas

Las alertas propias nunca deberán presentarse de manera que puedan confundirse con una alerta oficial de AEMET.

La web deberá identificar claramente:

- fuente;
- nivel;
- fenómeno;
- vigencia;
- probabilidad;
- descripción.

Las alertas propias podrán incluir una indicación expresa de que constituyen un aviso elaborado por MeteoArchidona y no un aviso oficial de AEMET.


## 35. Escala propia de alertas MeteoArchidona

MeteoArchidona utilizará inicialmente una escala propia de cuatro niveles:

### Amarillo

Nivel bajo.

### Naranja

Nivel moderado.

### Fucsia

Nivel alto.

Es un nivel propio de MeteoArchidona situado entre naranja y rojo.

### Rojo

Nivel máximo.

Se reservará para situaciones de especial gravedad o carácter potencialmente extremo.

La existencia del nivel fucsia diferencia la escala propia de MeteoArchidona de otros sistemas de avisos.


## 36. Nivel y probabilidad

El nivel de alerta y la probabilidad serán conceptos diferentes.

Por ejemplo, podrá existir una alerta:

**FUCSIA — probabilidad 70 %**

El nivel representa la importancia o gravedad potencial de la situación.

La probabilidad representa el grado estimado de posibilidad de que se produzca el fenómeno descrito.


## 37. Vigencia de una alerta

Cada alerta deberá disponer de un intervalo temporal.

Como mínimo:

- fecha de inicio;
- hora de inicio;
- fecha de finalización;
- hora de finalización.

Esto permitirá representar episodios que duren:

- unas horas;
- una jornada;
- varios días.


## 38. Información de una alerta propia

Una alerta podrá contener, entre otros elementos:

- identificador;
- fuente;
- fenómeno;
- nivel;
- probabilidad;
- ámbito geográfico;
- fecha y hora de emisión;
- fecha y hora de inicio;
- fecha y hora de finalización;
- descripción;
- recomendaciones;
- estado;
- fecha y hora de última modificación.

El diseño técnico definitivo se realizará durante la implementación.


## 39. Fenómenos de alerta

El catálogo podrá contemplar progresivamente fenómenos como:

- lluvia;
- lluvia intensa;
- tormenta;
- granizo;
- viento;
- viento fuerte;
- calor;
- frío;
- helada;
- nieve;
- niebla;
- otros fenómenos adversos.

Los fenómenos definitivos se determinarán posteriormente.


## 40. Actualización de alertas

Una alerta podrá evolucionar.

Por ejemplo:

- cambiar de probabilidad;
- aumentar de nivel;
- reducir de nivel;
- modificar su periodo;
- ampliar su ámbito;
- actualizar su descripción;
- finalizar anticipadamente.

El sistema deberá conservar suficiente información para gestionar correctamente estas modificaciones.


## 41. Histórico de alertas

Las alertas finalizadas no deberán desaparecer de la base de datos.

Se conservará un histórico.

Esto permitirá posteriormente estudiar:

- qué se predijo;
- cuándo se emitió;
- qué nivel se asignó;
- qué probabilidad se asignó;
- cómo evolucionó la alerta;
- qué terminó ocurriendo realmente.

El histórico podrá ser especialmente útil para evaluar las alertas propias de MeteoArchidona.


## 42. Recomendaciones meteorológicas

Las alertas podrán incorporar recomendaciones para la población.

Estas recomendaciones formarán un catálogo independiente de las frases narrativas.

No deberán considerarse elementos humorísticos ni decorativos.

Su objetivo será proporcionar información útil ante situaciones adversas.


## 43. Catálogo normalizado de recomendaciones

Las recomendaciones se asociarán principalmente a:

**fenómeno + nivel de alerta**

Por ejemplo:

**VIENTO + AMARILLO**

podrá tener recomendaciones diferentes de:

**VIENTO + FUCSIA**

Lo mismo ocurrirá con lluvia, calor, frío y otros fenómenos.


## 44. Ejemplos de recomendaciones por viento

Ante situaciones de viento podrán contemplarse recomendaciones relacionadas con:

- cerrar o recoger toldos;
- retirar objetos susceptibles de caer;
- retirar o asegurar macetas;
- asegurar puertas y ventanas;
- extremar precauciones en zonas arboladas;
- extremar precauciones durante desplazamientos;
- evitar determinadas actividades cuando la intensidad lo justifique.

Las recomendaciones concretas deberán revisarse antes de su publicación.


## 45. Ejemplos de recomendaciones por lluvia

Ante situaciones de precipitación intensa podrán contemplarse recomendaciones relacionadas con:

- evitar cauces;
- evitar zonas inundables;
- prestar atención a zonas bajas;
- no atravesar carreteras o caminos cubiertos por agua;
- extremar la precaución durante desplazamientos;
- atender las indicaciones de los organismos competentes.

Las recomendaciones concretas deberán revisarse antes de su publicación.


## 46. Ejemplos de recomendaciones por calor

Ante temperaturas elevadas podrán contemplarse recomendaciones relacionadas con:

- hidratación;
- evitar ejercicio intenso en horas centrales;
- reducir exposición al sol;
- especial atención a personas mayores;
- especial atención a niños;
- especial atención a personas vulnerables.

Las recomendaciones concretas deberán revisarse antes de su publicación.


## 47. Recomendaciones críticas

Las recomendaciones importantes no se seleccionarán mediante azar de forma que algunas puedan quedar accidentalmente ocultas.

Cuando un fenómeno y nivel requieran un conjunto de recomendaciones esenciales, deberán mostrarse todas las que correspondan.

La seguridad tendrá prioridad sobre la variedad editorial.


## 48. Recomendaciones adicionales

Podrá estudiarse una distinción futura entre:

- recomendaciones esenciales;
- recomendaciones adicionales.

Las esenciales se mostrarían siempre.

Las adicionales podrían utilizar reglas de selección distintas cuando exista un número muy elevado.


## 49. Niveles acumulativos de recomendaciones

Se estudiará la posibilidad de que los niveles superiores hereden recomendaciones de los inferiores.

Por ejemplo:

**FUCSIA = recomendaciones básicas + moderadas + específicas de nivel alto**

Este comportamiento no se considera todavía una decisión técnica definitiva, pero deberá evaluarse al diseñar el modelo.


## 50. Catálogo cerrado de recomendaciones

Las recomendaciones serán administradas exclusivamente por MeteoArchidona.

Los usuarios no podrán crear recomendaciones de seguridad.

Antes de crear la carga inicial deberán consultarse recomendaciones de organismos y fuentes fiables, como:

- AEMET;
- Protección Civil;
- servicios de emergencias;
- autoridades sanitarias;
- otros organismos competentes.

MeteoArchidona podrá adaptar su presentación, pero deberá preservar la corrección de las recomendaciones.


## 51. Alertas en la web

Las alertas activas deberán tener una presencia claramente visible en la web.

Su representación podrá incluir:

- color;
- nivel;
- fenómeno;
- probabilidad;
- periodo de vigencia;
- descripción;
- recomendaciones;
- fuente.

El diseño gráfico se determinará cuando se desarrolle la interfaz.


## 52. Alertas dentro de la predicción

Cuando una alerta afecte a un periodo incluido en una predicción diaria o semanal, podrá aparecer relacionada con esa predicción.

Esto permitirá que el visitante comprenda que determinado día requiere especial atención.


## 53. Integración futura con notificaciones

El subsistema de predicción y alertas proporcionará información que podrá ser consumida posteriormente por un subsistema independiente de usuarios y notificaciones.

Por ejemplo:

**predicción → notificación diaria**

o:

**alerta → notificación inmediata**

La predicción no deberá responsabilizarse directamente de la gestión de usuarios ni de los canales de entrega.


## 54. Predicción diaria por correo electrónico

Está prevista la posibilidad de que un usuario registrado solicite recibir periódicamente una predicción.

Por ejemplo:

- predicción diaria;
- predicción semanal;
- resumen de alertas.

La construcción y entrega del correo corresponderá al futuro subsistema de usuarios/notificaciones.

El subsistema de predicción proporcionará los datos necesarios.


## 55. Alertas en los correos de predicción

Cuando exista una alerta activa relacionada con el municipio del usuario, podrá incluirse en el correo de predicción.

Podrán incluirse tanto:

- alertas oficiales AEMET;
- alertas propias MeteoArchidona.

La fuente deberá quedar claramente diferenciada.


## 56. Otros canales de notificación

En el futuro podrán estudiarse otros canales, entre ellos:

- WhatsApp;
- notificaciones web;
- aplicación móvil;
- otros servicios de mensajería.

Cada canal se estudiará según:

- viabilidad técnica;
- coste;
- condiciones del proveedor;
- consentimiento del usuario;
- normativa aplicable.

No forman parte de la primera implementación de predicción.


## 57. Catálogo territorial de municipios

La predicción se apoyará en un catálogo propio de municipios.

Este catálogo permitirá relacionar los municipios con los identificadores necesarios para consultar las fuentes externas.


## 58. Código INE

El catálogo conservará el código INE correspondiente al municipio cuando sea necesario para los productos utilizados.

El código será tratado como dato maestro.

No deberá inferirse de manera insegura ni introducirse sin validación.


## 59. Carga inicial de municipios

No se pretende cargar inicialmente todos los municipios de España.

La carga inicial se realizará de manera controlada.

Como punto de partida se contempla:

- provincia de Málaga;
- determinados municipios próximos de Granada;
- determinados municipios próximos de Córdoba;
- otros municipios de interés para MeteoArchidona.

El catálogo podrá ampliarse posteriormente.


## 60. Crecimiento orgánico del catálogo

El catálogo de municipios podrá crecer en función de la demanda real de los usuarios.

Esto evitará mantener inicialmente un catálogo nacional que el proyecto no necesita.


## 61. Municipio principal del usuario

Cuando se implemente el registro de usuarios, cada usuario podrá seleccionar un municipio principal de interés.

No será obligatorio interpretar este municipio como residencia legal o domicilio.

Representará simplemente el municipio sobre el que el usuario desea recibir principalmente información meteorológica.


## 62. Utilización del municipio de interés

El municipio principal podrá utilizarse posteriormente para:

- predicción personalizada;
- alertas;
- correo diario;
- correo semanal;
- notificaciones;
- personalización de la web;
- otros servicios meteorológicos.


## 63. Municipio no disponible

Si durante el registro o configuración el usuario no encuentra su municipio, podrá solicitar su incorporación.

La interfaz podrá ofrecer una opción equivalente a:

**No encuentro mi municipio**

Esta acción generará una solicitud de alta.


## 64. Solicitud de alta de municipio

Una solicitud podrá contener:

- municipio solicitado;
- provincia;
- comunidad autónoma cuando corresponda;
- usuario solicitante;
- fecha de solicitud;
- estado;
- observaciones administrativas.

La estructura definitiva se diseñará con el subsistema de usuarios.


## 65. Alta controlada

El usuario podrá solicitar un municipio, pero no dará de alta directamente el registro maestro.

MeteoArchidona revisará la solicitud.

Antes del alta definitiva se verificará:

- nombre correcto;
- provincia;
- código INE;
- inexistencia de duplicados;
- disponibilidad de los productos meteorológicos necesarios.


## 66. Utilidad de las solicitudes

Las solicitudes de municipios tendrán además valor para conocer la demanda geográfica de MeteoArchidona.

Un número creciente de solicitudes en una determinada localidad podrá indicar interés potencial para:

- ampliar servicios;
- integrar estaciones;
- ampliar predicciones;
- establecer futuras colaboraciones.


## 67. Separación entre municipio y estación

Un municipio y una estación meteorológica son conceptos diferentes.

Un municipio puede tener:

- ninguna estación;
- una estación;
- varias estaciones.

Una estación deberá conservar su propia identidad y ubicación.

La predicción municipal podrá existir aunque MeteoArchidona no disponga de una estación propia dentro de ese municipio.


## 68. Predicción frente a observación

El sistema deberá distinguir claramente:

**observación**

Información sobre lo que realmente está ocurriendo o ha ocurrido, procedente de estaciones meteorológicas.

**predicción**

Información sobre lo que se espera que ocurra.

Ambos tipos de información podrán mostrarse juntos, pero nunca deberán confundirse en el modelo.


## 69. Persistencia de predicciones

Las predicciones que resulte útil conservar deberán almacenarse en PostgreSQL.

La estrategia exacta se decidirá durante la implementación.

Se deberá estudiar especialmente la conveniencia de conservar diferentes ediciones de una misma predicción.


## 70. Histórico de predicciones

Conservar predicciones anteriores puede permitir en el futuro comparar:

**lo previsto → lo observado**

Esto permitiría evaluar:

- precisión de las fuentes;
- evolución de las predicciones;
- diferencias entre proveedores;
- comportamiento de determinados fenómenos.

Por ello, no se deberá diseñar la persistencia suponiendo automáticamente que una predicción nueva sustituye y destruye a la anterior.


## 71. Comparación entre fuentes

Cuando exista información comparable de AEMET y eltiempo.es, podrá estudiarse su comparación.

MeteoArchidona no deberá fabricar automáticamente una supuesta predicción propia mezclando ambas fuentes sin un modelo definido.

Las fuentes deberán poder conservar su identidad.


## 72. Personalidad de MeteoArchidona

La existencia de fuentes externas no deberá convertir MeteoArchidona en una copia visual o textual de otros portales.

La identidad propia se construirá mediante:

- diseño;
- iconografía;
- narrativa;
- refranero;
- expresiones;
- contexto local;
- alertas propias;
- presentación gráfica;
- información procedente de nuestra red de estaciones.


## 73. Separación de responsabilidades

Conceptualmente, el subsistema deberá mantener responsabilidades diferenciadas para:

- proveedores externos;
- adquisición;
- normalización;
- persistencia;
- consulta;
- narrativa;
- iconografía;
- alertas;
- recomendaciones;
- exposición mediante API.

La capa HTTP no deberá contener la lógica meteorológica del subsistema.


## 74. Independencia de proveedores

La representación interna no deberá depender innecesariamente de estructuras particulares de AEMET o eltiempo.es.

Siempre que tenga sentido, los datos externos deberán transformarse a conceptos propios.

Esto permitirá:

- cambiar proveedores;
- incorporar nuevas fuentes;
- comparar fuentes;
- mantener estable la API pública.


## 75. Disponibilidad de proveedores

La indisponibilidad temporal de una fuente externa no debería provocar necesariamente la desaparición inmediata de toda predicción de MeteoArchidona.

La persistencia permitirá conservar la última información válida disponible cuando resulte apropiado.

La interfaz deberá poder indicar cuándo una predicción no está suficientemente actualizada.


## 76. Datos originales

Durante la implementación deberá estudiarse qué información original de los proveedores conviene conservar para:

- diagnóstico;
- trazabilidad;
- reprocesamiento;
- auditoría;
- evolución de normalizadores.

Esto deberá hacerse respetando las condiciones de utilización de cada fuente.


## 77. Frecuencia de actualización

La frecuencia de adquisición deberá adaptarse a la frecuencia real de actualización de cada producto.

No se deberán realizar peticiones externas innecesarias.

Antes de implementar cada proceso automático se estudiará:

- cuándo actualiza el proveedor;
- cuántas veces tiene sentido consultar;
- límites del servicio;
- comportamiento ante errores;
- reintentos.


## 78. Posible arquitectura de adquisición

Sin considerarse todavía diseño técnico definitivo, el flujo general previsto será:

**fuente externa**

↓

**proveedor**

↓

**normalización**

↓

**persistencia**

↓

**servicios de predicción**

↓

**API MeteoArchidona**

↓

**web y otros consumidores**


## 79. Relación con el subsistema de usuarios

Predicción y usuarios serán subsistemas independientes.

El subsistema de usuarios podrá consumir predicciones y alertas para ofrecer servicios personalizados.

El subsistema de predicción no deberá necesitar conocer cómo se autentica un usuario para poder generar y almacenar una predicción.


## 80. Relación con el subsistema de publicidad

La predicción podrá disponer en el futuro de espacios patrocinables.

Estos espacios pertenecerán al subsistema de publicidad.

La predicción no deberá contener lógica de campañas, anunciantes o tarifas.

El subsistema publicitario decidirá qué contenido comercial corresponde a un espacio patrocinable.


## 81. Información esencial y monetización

Las decisiones futuras sobre servicios personalizados o suscripciones no deberán confundirse con la naturaleza del dato meteorológico.

Las políticas concretas de monetización se definirán en los subsistemas correspondientes.

El diseño de predicción deberá permitir que la información meteorológica esencial continúe siendo accesible públicamente según la política general de MeteoArchidona.


## 82. Evolución futura

Una vez que el sistema inicial esté funcionando, podrán estudiarse líneas como:

- nuevas fuentes;
- modelos meteorológicos;
- predicción propia;
- inteligencia artificial;
- correcciones locales;
- evaluación automática de predicciones;
- nuevas alertas;
- mayor personalización;
- nuevos canales de notificación;
- ampliación territorial.


## 83. Próximos trabajos de análisis

Antes de comenzar la implementación deberá estudiarse al menos:

1. estructura completa del XML de predicción municipal de AEMET;
2. productos disponibles mediante AEMET OpenData;
3. estructura de los avisos oficiales;
4. frecuencia de actualización;
5. códigos meteorológicos utilizados;
6. iconos y referencias gráficas;
7. condiciones de utilización;
8. posibilidades técnicas de eltiempo.es;
9. catálogo inicial de municipios;
10. catálogo inicial de frases;
11. catálogo inicial de recomendaciones;
12. fenómenos y niveles de alertas propias.


## 84. Decisiones ya adoptadas

En esta primera versión quedan recogidas como decisiones funcionales:

- AEMET será la fuente oficial principal;
- eltiempo.es será una fuente complementaria a estudiar;
- se utilizará predicción municipal;
- se pretende disponer de predicción diaria y semanal;
- AEMET dispone de un producto municipal de siete días de especial interés;
- la adquisición deberá automatizarse;
- la web no dependerá directamente de AEMET;
- MeteoArchidona tendrá narrativa propia;
- existirá un catálogo cerrado de frases y refranes;
- los usuarios no podrán modificar ese catálogo;
- se desarrollará progresivamente iconografía propia;
- los iconos propios tendrán prioridad cuando existan;
- las alertas forman parte del subsistema;
- coexistirán alertas oficiales AEMET y alertas propias MeteoArchidona;
- las alertas propias se identificarán claramente como tales;
- la escala propia tendrá amarillo, naranja, fucsia y rojo;
- fucsia estará situado entre naranja y rojo;
- nivel y probabilidad serán conceptos independientes;
- las alertas tendrán vigencia temporal;
- existirá un catálogo controlado de recomendaciones;
- las recomendaciones esenciales no dependerán de una selección aleatoria;
- se conservará histórico de alertas;
- existirá un catálogo propio de municipios;
- inicialmente no se cargará necesariamente toda España;
- el catálogo crecerá de forma controlada;
- los futuros usuarios tendrán un municipio principal de interés;
- un usuario podrá solicitar el alta de un municipio no disponible;
- el alta definitiva del municipio será controlada por MeteoArchidona;
- predicción, usuarios y notificaciones serán responsabilidades separadas;
- una predicción propia basada en años de histórico queda aparcada inicialmente.


## 85. Conclusión

El subsistema de predicción y alertas no se concibe como una simple reproducción de una página de AEMET.

Las fuentes externas proporcionarán información meteorológica de referencia.

MeteoArchidona será responsable de adquirir, estructurar, conservar y presentar esa información dentro de su propia plataforma.

Sobre esos datos se construirá una identidad propia mediante:

- narrativa meteorológica;
- expresiones;
- refranes;
- iconografía;
- contexto local;
- alertas propias;
- recomendaciones.

Las alertas oficiales y las alertas MeteoArchidona coexistirán manteniendo siempre claramente identificada su procedencia.

El catálogo territorial permitirá comenzar con un ámbito reducido y crecer conforme aparezca demanda real.

La futura integración con usuarios permitirá transformar la predicción en un servicio personalizado mediante correos, alertas y otros canales.

La arquitectura deberá permitir esta evolución manteniendo una regla fundamental:

> MeteoArchidona podrá contar el tiempo con personalidad propia, pero el origen, significado y fiabilidad de los datos meteorológicos deberán permanecer siempre claros.