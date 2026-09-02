# Subsistema de predicción y alertas meteorológicas

## 1. Propósito

Este documento define el diseño funcional del subsistema de predicción y alertas meteorológicas de MeteoArchidona.

El objetivo del subsistema es proporcionar información meteorológica futura de forma clara, útil, personalizada y con identidad propia, utilizando fuentes meteorológicas externas de referencia y añadiendo una capa editorial propia de MeteoArchidona.

El subsistema deberá proporcionar principalmente:

- predicción meteorológica diaria;
- predicción meteorológica semanal;
- predicción detallada a corto plazo;
- predicción horaria cuando la fuente lo permita;
- alertas meteorológicas oficiales;
- alertas propias de MeteoArchidona;
- representación gráfica propia;
- textos descriptivos propios;
- refranes y expresiones meteorológicas;
- recomendaciones ante situaciones meteorológicas adversas;
- comparación o consulta de predicciones procedentes de otras fuentes;
- integración futura con usuarios y sistemas de notificación.

La predicción meteorológica y las alertas se consideran partes de un mismo subsistema.


## 2. Estado del subsistema

En el momento de redactar este documento, el subsistema todavía no está implementado.

Este documento constituye una especificación funcional y arquitectónica inicial.

No se consideran todavía definitivos:

- el modelo físico de base de datos;
- las tablas;
- los nombres finales de campos;
- los servicios;
- los repositorios;
- los proveedores;
- los endpoints;
- los procesos automáticos;
- las frecuencias definitivas de actualización;
- la interfaz pública.

Estas decisiones se tomarán durante la implementación y después de analizar los datos reales proporcionados por las fuentes externas.


## 3. Principios generales

El subsistema seguirá los siguientes principios:

- utilizar fuentes meteorológicas claramente identificadas;
- conservar la procedencia de cada predicción;
- almacenar en infraestructura propia la información necesaria;
- evitar que la web pública dependa directamente de proveedores externos para la predicción principal;
- separar adquisición, normalización, persistencia, negocio y presentación;
- proporcionar una presentación propia de MeteoArchidona;
- diferenciar claramente información oficial e información propia;
- mantener históricos cuando aporten valor;
- permitir futuras ampliaciones;
- facilitar la personalización por usuario y municipio;
- mantener una identidad meteorológica local;
- no presentar como propio un dato originado por un tercero;
- reutilizar los datos adquiridos sin provocar consultas externas innecesarias.


## 4. Separación entre predicción y observación

El sistema deberá distinguir claramente entre:

### Predicción

Información sobre lo que se espera que ocurra en el futuro.

### Observación

Información sobre lo que está ocurriendo o ha ocurrido realmente.

Las estaciones meteorológicas propias pertenecen al ámbito de observación.

Los radares, satélites, rayos, actividad solar, embalses y otros productos de seguimiento de fenómenos reales se documentarán en el subsistema de Observaciones.

Aunque predicción y observación podrán mostrarse juntas en determinadas páginas, deberán permanecer conceptualmente separadas.


## 5. Fuentes iniciales de predicción

Inicialmente se contemplan dos fuentes externas principales:

1. AEMET.
2. eltiempo.es.

También se podrá permitir la consulta de otras predicciones externas mediante widgets, gadgets, enlaces u otros mecanismos autorizados.

Cada fuente deberá mantener claramente identificada su procedencia.


## 6. AEMET

AEMET será inicialmente la fuente oficial principal de predicción meteorológica.

MeteoArchidona utilizará los productos de AEMET adecuados para obtener información estructurada de predicción y alertas.

La integración principal deberá realizarse mediante mecanismos programáticos oficiales y no mediante extracción de contenido visual de sus páginas web.


## 7. AEMET OpenData

AEMET dispone de la plataforma AEMET OpenData para el acceso programático a sus datos.

La implementación de MeteoArchidona utilizará preferentemente AEMET OpenData para automatizar la adquisición de predicciones.

El acceso programático requiere una API Key proporcionada por AEMET.

La obtención de esta clave es gratuita conforme al funcionamiento actual del servicio.

La clave deberá tratarse como un secreto de infraestructura.

Nunca deberá:

- incorporarse al HTML público;
- incorporarse al JavaScript público;
- almacenarse en el repositorio;
- exponerse mediante nuestra API.

Se configurará mediante secretos o variables de entorno de la infraestructura correspondiente.


## 8. Caducidad de la API Key

La infraestructura deberá permitir sustituir fácilmente la API Key de AEMET.

No se deberá diseñar ningún componente suponiendo que la misma clave permanecerá válida indefinidamente.

La sustitución de la credencial no deberá exigir cambios de código.


## 9. Predicción municipal de AEMET

Entre los productos de mayor interés se encuentran las predicciones específicas por municipio.

Se consideran especialmente relevantes:

- predicción diaria por municipio;
- predicción horaria por municipio.

La predicción municipal será la base inicial de la información futura mostrada por MeteoArchidona.


## 10. Predicción diaria

AEMET proporciona predicción municipal para varios días.

El producto de siete días será una de las fuentes principales para construir la predicción semanal de MeteoArchidona.

La información disponible puede incluir, dependiendo del periodo y del producto:

- estado del cielo;
- temperatura máxima;
- temperatura mínima;
- temperatura;
- sensación térmica;
- humedad relativa;
- precipitación;
- probabilidad de precipitación;
- nieve;
- probabilidad de nieve;
- tormentas;
- probabilidad de tormenta;
- dirección del viento;
- velocidad del viento;
- rachas;
- otras variables proporcionadas por la fuente.

La estructura definitiva se determinará utilizando respuestas reales de AEMET.


## 11. Predicción horaria

AEMET dispone de predicción municipal horaria a corto plazo.

Este producto resulta especialmente interesante para mostrar la evolución prevista durante las próximas horas.

La predicción horaria podrá utilizarse para construir:

- evolución de temperatura;
- evolución de precipitación;
- probabilidad de lluvia;
- evolución del viento;
- sensación térmica;
- humedad;
- estado del cielo;
- otros fenómenos disponibles.

Su integración deberá conservar correctamente la semántica temporal de cada variable.


## 12. Resolución temporal

No debe asumirse que todas las variables de una predicción representan exactamente el mismo intervalo temporal.

Algunas variables podrán corresponder a un instante determinado.

Otras podrán representar:

- acumulados;
- máximos;
- probabilidades;
- intervalos horarios;
- intervalos de varias horas;
- periodos diarios.

El normalizador deberá interpretar correctamente la semántica proporcionada por AEMET.


## 13. Conversión temporal

Los datos externos podrán utilizar UTC u otras convenciones temporales.

La infraestructura interna conservará los instantes de forma no ambigua.

La presentación pública deberá convertir correctamente las fechas y horas a la zona horaria aplicable al municipio.

Para el ámbito inicial de MeteoArchidona se utilizará normalmente:

**Europe/Madrid**

cuando corresponda.


## 14. Predicción correspondiente al municipio

La predicción municipal proporcionada por AEMET se refiere al municipio y no necesariamente al punto exacto donde exista una estación MeteoArchidona.

La predicción deberá identificarse como predicción municipal.

No deberá presentarse como si fuera una predicción calculada específicamente para las coordenadas de una estación concreta cuando no lo sea.


## 15. Diferencia entre municipio y estación

Un municipio y una estación meteorológica son conceptos distintos.

Un municipio puede disponer de:

- ninguna estación;
- una estación;
- varias estaciones.

La existencia de una predicción municipal no requiere que MeteoArchidona tenga una estación propia dentro de ese municipio.

Las estaciones conservarán su identidad y coordenadas propias.


## 16. XML público de AEMET

AEMET ofrece desde sus páginas municipales la posibilidad de acceder a información estructurada de predicción, incluyendo XML.

Estos XML resultan especialmente útiles para:

- estudiar la estructura real de los productos;
- conocer campos;
- comprobar periodos;
- estudiar códigos;
- comprobar valores opcionales;
- analizar estados del cielo;
- estudiar viento y precipitación;
- diseñar los normalizadores.

Antes de implementar definitivamente el modelo de persistencia se analizará al menos un XML real de un municipio del ámbito inicial, comenzando preferentemente por Archidona.


## 17. Uso productivo frente a análisis manual

El XML accesible desde la web puede utilizarse durante el análisis y desarrollo.

Sin embargo, la adquisición productiva automatizada deberá utilizar preferentemente AEMET OpenData u otro mecanismo programático oficial adecuado.

No se diseñará el sistema productivo dependiendo de automatizar pulsaciones o descargar manualmente archivos desde la interfaz web.


## 18. Flujo principal de AEMET

El flujo conceptual será:

**AEMET OpenData**

↓

**Proveedor AEMET**

↓

**Adquisición**

↓

**Normalización**

↓

**PostgreSQL**

↓

**Servicios MeteoArchidona**

↓

**API MeteoArchidona**

↓

**Web y otros consumidores**

La web pública no deberá consultar directamente la API privada de AEMET para construir la predicción principal.


## 19. Persistencia

Las predicciones que resulte útil conservar deberán almacenarse en PostgreSQL.

La estrategia definitiva se decidirá durante la implementación.

Se deberá estudiar especialmente la conservación de diferentes ediciones de una misma predicción.


## 20. Histórico de predicciones

Una predicción nueva no deberá necesariamente destruir la anterior.

Conservar diferentes ediciones permitirá estudiar posteriormente:

**lo previsto → lo observado**

Esto puede permitir analizar:

- precisión;
- evolución de una predicción;
- cambios realizados por las fuentes;
- anticipación de fenómenos;
- diferencias entre proveedores;
- comportamiento de alertas.


## 21. Trazabilidad

Cada predicción deberá conservar suficiente información para conocer:

- fuente;
- producto;
- municipio;
- momento de adquisición;
- momento de elaboración de la predicción cuando esté disponible;
- periodo al que corresponde;
- versión o edición cuando proceda.

La trazabilidad será importante para comparar posteriormente predicciones con observaciones reales.


## 22. Datos originales

Durante la implementación se estudiará qué información original conviene conservar para facilitar:

- diagnóstico;
- trazabilidad;
- reprocesamiento;
- auditoría;
- evolución de normalizadores.

Esta conservación deberá respetar siempre las condiciones de utilización de cada fuente.


## 23. Normalización

La representación interna de MeteoArchidona no deberá depender innecesariamente de estructuras particulares de AEMET.

Los datos externos deberán transformarse, cuando sea razonable, a conceptos propios.

Esto facilitará:

- incorporar nuevas fuentes;
- comparar proveedores;
- cambiar proveedores;
- mantener estable nuestra API;
- construir narrativa propia;
- utilizar iconografía propia.


## 24. Condiciones meteorológicas normalizadas

Se establecerá progresivamente un catálogo propio de situaciones meteorológicas.

Como ejemplos iniciales:

- despejado;
- poco nuboso;
- nuboso;
- muy nuboso;
- cubierto;
- lluvia;
- lluvia intensa;
- chubascos;
- tormenta;
- granizo;
- nieve;
- niebla;
- viento;
- viento fuerte;
- frío;
- helada;
- calor;
- calor intenso.

La clasificación definitiva se determinará después de estudiar los códigos reales de las fuentes utilizadas.


## 25. Frecuencia de actualización

La adquisición deberá adaptarse a la frecuencia real de actualización de cada producto externo.

No deberán realizarse solicitudes innecesarias.

Antes de programar cada tarea automática se determinará:

- cuándo actualiza el proveedor;
- con qué frecuencia tiene sentido consultar;
- límites del servicio;
- comportamiento ante fallos;
- estrategia de reintentos;
- tolerancia ante retrasos.


## 26. Indisponibilidad de una fuente

La indisponibilidad temporal de AEMET u otra fuente no debería provocar automáticamente la desaparición de toda la predicción de MeteoArchidona.

La persistencia permitirá conservar la última información válida cuando resulte apropiado.

La interfaz deberá poder indicar cuándo una predicción está desactualizada.


## 27. eltiempo.es

eltiempo.es será inicialmente una segunda fuente meteorológica de interés.

Podrá utilizarse como:

- fuente complementaria de predicción;
- fuente editorial;
- fuente de contenidos gráficos;
- fuente multimedia;
- fuente de comparación.

La integración concreta dependerá de los mecanismos técnicos disponibles y de las condiciones de utilización vigentes.


## 28. Contenido multimedia externo

Se estudiará especialmente la posibilidad de integrar contenido audiovisual meteorológico de fuentes externas.

Por ejemplo:

- vídeos de predicción;
- partes meteorológicos;
- explicaciones de situaciones relevantes.

Estos contenidos solo se incorporarán utilizando mecanismos autorizados.

Podrán utilizarse:

- reproductores oficiales;
- widgets;
- iframes permitidos;
- enlaces;
- mecanismos de compartición proporcionados por la fuente.

No se presupone autorización para descargar y republicar cualquier contenido audiovisual.


## 29. Predicción propia de MeteoArchidona

MeteoArchidona tendrá una presentación propia de la predicción aunque los datos meteorológicos estructurados procedan inicialmente de fuentes externas.

La predicción principal deberá estar integrada con:

- nuestros municipios;
- nuestra interfaz;
- nuestra narrativa;
- nuestros iconos;
- nuestras alertas;
- nuestras recomendaciones;
- las preferencias futuras del usuario.


## 30. No desarrollar inicialmente un modelo meteorológico propio

MeteoArchidona no desarrollará inicialmente un modelo físico o estadístico propio de predicción basado en años de observaciones históricas.

Esta línea queda aparcada.

La arquitectura no deberá impedir estudiar posteriormente:

- modelos estadísticos;
- aprendizaje automático;
- inteligencia artificial;
- correcciones locales;
- combinación de modelos;
- evaluación automática de errores.

Estas posibilidades no forman parte de la primera implementación.


## 31. Inteligencia artificial

En una evolución futura podrá utilizarse inteligencia artificial como herramienta complementaria.

Un uso posible será la generación de narrativa a partir de datos meteorológicos estructurados.

La IA no deberá inventar:

- temperaturas;
- precipitaciones;
- probabilidades;
- avisos;
- niveles;
- fenómenos;
- horas;
- datos inexistentes en las fuentes.

La fuente meteorológica y la capa editorial deberán seguir siendo distinguibles.


## 32. Capa editorial propia

MeteoArchidona no se limitará a reproducir literalmente textos de otros proveedores.

Los datos estructurados podrán utilizarse para construir una narrativa propia.

Esta capa editorial deberá mantener intacto el significado meteorológico de la predicción.


## 33. Motor de narrativa meteorológica

Se diseñará un motor de narrativa meteorológica.

Su función será convertir condiciones y predicciones estructuradas en descripciones naturales, locales y variadas.

Podrá utilizar:

- fenómeno;
- intensidad;
- temperatura;
- época del año;
- mes;
- hora;
- contexto;
- probabilidad;
- otras variables disponibles.


## 34. Catálogo de frases meteorológicas

MeteoArchidona dispondrá de un catálogo propio de frases.

Podrá contener:

- expresiones meteorológicas;
- frases coloquiales;
- frases humorísticas;
- expresiones populares;
- refranes;
- expresiones tradicionales;
- determinadas expresiones en otros idiomas utilizadas deliberadamente.

El objetivo es proporcionar personalidad sin alterar el significado de la predicción.


## 35. Catálogo cerrado de frases

El catálogo de frases será un catálogo editorial interno.

Los usuarios registrados no podrán crear directamente:

- frases;
- refranes;
- expresiones;
- textos meteorológicos.

Las incorporaciones serán realizadas o aprobadas por los responsables de MeteoArchidona.


## 36. Clasificación de frases

Las frases podrán clasificarse según:

- fenómeno;
- intensidad;
- mes;
- estación del año;
- contexto;
- tono;
- temperatura;
- probabilidad;
- otras condiciones.

Esto evitará utilizar expresiones fuera de contexto.


## 37. Refranes condicionados

Los refranes deberán utilizarse únicamente cuando su contexto sea adecuado.

Por ejemplo:

**En abril, aguas mil**

solo deberá considerarse durante abril y en un contexto relacionado con precipitación.

El motor deberá comprobar estas condiciones antes de seleccionar una frase.


## 38. Selección aleatoria controlada

Cuando existan varias frases válidas para una misma situación podrá realizarse una selección aleatoria controlada.

Posteriormente podrán añadirse mecanismos para:

- evitar repeticiones;
- aplicar pesos;
- recordar textos utilizados recientemente;
- aumentar variedad;
- favorecer determinados textos.

La aleatoriedad nunca deberá modificar el significado meteorológico.


## 39. Iconografía meteorológica

MeteoArchidona desarrollará progresivamente una iconografía propia.

Los iconos deberán mantener:

- claridad meteorológica;
- identidad visual;
- coherencia;
- personalidad;
- posibilidad de incorporar humor o caricatura.

El fenómeno representado deberá resultar siempre reconocible.


## 40. Separación entre condición e icono

La condición meteorológica y su representación gráfica serán conceptos independientes.

Conceptualmente:

**condición normalizada → representación gráfica**

Esto permitirá cambiar o ampliar iconos sin modificar los datos meteorológicos.


## 41. Prioridad de iconos

La estrategia inicial será:

1. utilizar un icono propio MeteoArchidona cuando exista;
2. utilizar el recurso gráfico de la fuente cuando esté autorizado y no exista equivalente propio;
3. utilizar un icono genérico propio como último recurso.

La colección MeteoArchidona podrá ampliarse progresivamente.


## 42. Variantes gráficas

Podrán existir varias representaciones gráficas propias de una misma condición.

Por ejemplo, varias ilustraciones diferentes de cielo despejado.

La selección podrá variar, siempre que todas las variantes representen inequívocamente el mismo fenómeno.


## 43. Predicciones externas

Además de la predicción principal de MeteoArchidona, la web podrá disponer de un apartado dedicado a consultar predicciones de otras fuentes.

Su finalidad será permitir al visitante comparar distintas interpretaciones meteorológicas sin tener que recorrer numerosas páginas externas.


## 44. Página de otras predicciones

La web podrá incluir una página o pestaña con un nombre equivalente a:

**Otras predicciones**

En ella podrán incorporarse, cuando sea técnicamente posible y esté autorizado, recursos de:

- AEMET;
- eltiempo.es;
- WeatherLink;
- Weather Underground;
- Meteoclimatic;
- otros servicios meteorológicos útiles.

La inclusión de una fuente concreta dependerá siempre de su disponibilidad y condiciones vigentes.


## 45. Widgets y gadgets externos

Algunas fuentes ofrecen widgets, gadgets, iframes u otros componentes preparados para ser incorporados en páginas de terceros.

MeteoArchidona podrá utilizarlos como contenido complementario.

Estos elementos no sustituirán necesariamente nuestra integración estructurada de datos.


## 46. Diferencia entre integración de datos y widget

Se distinguirán dos mecanismos diferentes.

### Integración estructurada

**Fuente → adquisición → PostgreSQL → API MeteoArchidona → web**

Permite:

- normalización;
- personalización;
- persistencia;
- histórico;
- narrativa;
- iconos propios;
- alertas;
- reutilización.

### Widget externo

**Fuente externa → componente oficial incrustado**

Permite mostrar directamente una representación ofrecida por el proveedor.

Ambos mecanismos pueden coexistir.


## 47. AEMET como ejemplo de doble integración

AEMET podrá aparecer de dos maneras diferentes:

1. como fuente estructurada de nuestra predicción mediante OpenData;
2. como contenido oficial externo mediante gadget, widget o recurso gráfico cuando resulte útil.

La predicción principal seguirá siendo presentada con la interfaz MeteoArchidona.

El widget oficial podrá servir como referencia o comparación.


## 48. Procedencia visible

Todo widget, gadget, vídeo o contenido externo deberá mantener claramente visible su procedencia.

MeteoArchidona no deberá inducir al usuario a pensar que un producto externo ha sido generado internamente.


## 49. Condiciones de uso de terceros

Antes de incorporar cualquier componente externo deberá comprobarse:

- autorización de incrustación;
- términos de uso;
- atribución requerida;
- posibilidad de iframe;
- posibilidad de script externo;
- cookies;
- publicidad incorporada;
- políticas de privacidad;
- limitaciones técnicas;
- disponibilidad del recurso.

La existencia técnica de una URL no implica automáticamente autorización para reutilizarla.


## 50. Alertas meteorológicas

Las alertas forman parte integral del subsistema de predicción.

MeteoArchidona gestionará inicialmente dos fuentes claramente diferenciadas:

1. alertas oficiales;
2. alertas propias MeteoArchidona.


## 51. Alertas oficiales

Los avisos procedentes de organismos oficiales se mostrarán claramente identificados.

AEMET será inicialmente la principal fuente oficial de alertas meteorológicas.

Cuando se represente un aviso oficial deberá quedar claro para el usuario:

- quién lo emite;
- fenómeno;
- nivel;
- ámbito;
- vigencia.


## 52. Alertas propias MeteoArchidona

MeteoArchidona podrá publicar alertas propias elaboradas por los responsables del proyecto.

Podrán publicarse:

- cuando exista también un aviso oficial;
- cuando se considere necesario proporcionar una valoración local adicional;
- cuando no exista aviso oficial pero MeteoArchidona considere relevante comunicar una situación.

Nunca deberán confundirse con un aviso oficial.


## 53. Identificación de alertas propias

La interfaz deberá identificar expresamente una alerta propia mediante una denominación equivalente a:

**ALERTA METEOARCHIDONA**

La identidad visual deberá diferenciarla claramente de los avisos oficiales.


## 54. Escala propia de MeteoArchidona

MeteoArchidona utilizará inicialmente cuatro niveles propios:

### Amarillo

Nivel bajo.

### Naranja

Nivel moderado.

### Fucsia

Nivel alto.

Es un nivel propio situado entre naranja y rojo.

### Rojo

Nivel máximo.

El nivel rojo se reservará para situaciones de especial gravedad o carácter potencialmente extremo.


## 55. Nivel y probabilidad

El nivel de una alerta y su probabilidad serán conceptos diferentes.

Por ejemplo:

**FUCSIA — probabilidad 70 %**

El nivel representa la gravedad potencial de la situación.

La probabilidad representa la posibilidad estimada de que el fenómeno se produzca.


## 56. Vigencia de una alerta

Cada alerta deberá disponer de un intervalo temporal.

Como mínimo:

- fecha de inicio;
- hora de inicio;
- fecha de finalización;
- hora de finalización.

Esto permitirá gestionar episodios de:

- unas horas;
- un día;
- varios días.


## 57. Información de una alerta

Una alerta podrá contener:

- identificador;
- fuente;
- fenómeno;
- nivel;
- probabilidad;
- ámbito geográfico;
- municipio o municipios afectados;
- fecha y hora de emisión;
- fecha y hora de inicio;
- fecha y hora de finalización;
- descripción;
- recomendaciones;
- estado;
- fecha y hora de última actualización.

El modelo físico definitivo se diseñará posteriormente.


## 58. Fenómenos de alerta

El catálogo podrá contemplar fenómenos como:

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

La relación definitiva se establecerá durante la implementación.


## 59. Evolución de una alerta

Una alerta podrá cambiar durante su periodo de vida.

Podrá:

- aumentar de nivel;
- disminuir de nivel;
- cambiar de probabilidad;
- modificar su periodo;
- ampliar su ámbito;
- reducir su ámbito;
- modificar su descripción;
- finalizar anticipadamente.

El sistema deberá permitir representar estas modificaciones.


## 60. Histórico de alertas

Las alertas terminadas no deberán eliminarse.

Se conservará un histórico.

Esto permitirá analizar posteriormente:

- qué se predijo;
- cuándo se emitió;
- qué nivel se asignó;
- qué probabilidad se indicó;
- cómo evolucionó;
- qué ocurrió finalmente.

Será especialmente útil para evaluar las alertas propias.


## 61. Recomendaciones

Las alertas podrán incorporar recomendaciones para la población.

Estas recomendaciones estarán separadas del catálogo narrativo.

No tendrán finalidad humorística.

Su finalidad será proporcionar información útil ante fenómenos adversos.


## 62. Catálogo normalizado de recomendaciones

Las recomendaciones podrán asociarse principalmente a:

**fenómeno + nivel**

Por ejemplo:

**VIENTO + AMARILLO**

podrá disponer de recomendaciones diferentes de:

**VIENTO + FUCSIA**


## 63. Recomendaciones por viento

Podrán contemplarse recomendaciones relacionadas con:

- cerrar o recoger toldos;
- asegurar objetos susceptibles de caer;
- retirar o asegurar macetas;
- asegurar puertas y ventanas;
- extremar precauciones en zonas arboladas;
- extremar precauciones durante desplazamientos;
- evitar determinadas actividades cuando la intensidad lo justifique.


## 64. Recomendaciones por lluvia

Podrán contemplarse recomendaciones relacionadas con:

- evitar cauces;
- evitar zonas inundables;
- prestar atención a zonas bajas;
- no atravesar carreteras o caminos cubiertos por agua;
- extremar la precaución durante desplazamientos;
- atender indicaciones de organismos competentes.


## 65. Recomendaciones por calor

Podrán contemplarse recomendaciones relacionadas con:

- hidratación;
- evitar ejercicio intenso en las horas centrales;
- reducir exposición solar;
- especial atención a personas mayores;
- especial atención a niños;
- especial atención a personas vulnerables.


## 66. Fuente de las recomendaciones

Las recomendaciones de seguridad deberán basarse en información procedente de organismos y fuentes fiables.

Entre ellos podrán encontrarse:

- AEMET;
- Protección Civil;
- servicios de emergencias;
- autoridades sanitarias;
- otros organismos competentes.

MeteoArchidona podrá adaptar la presentación, pero no deberá alterar de manera irresponsable su significado.


## 67. Recomendaciones esenciales

Las recomendaciones importantes no se seleccionarán aleatoriamente.

Cuando un fenómeno y nivel requieran varias recomendaciones esenciales, deberán mostrarse todas las relevantes.

La seguridad tendrá prioridad sobre la variedad editorial.


## 68. Posible clasificación de recomendaciones

Podrá estudiarse posteriormente una distinción entre:

- recomendaciones esenciales;
- recomendaciones complementarias.

Las esenciales se mostrarían siempre.

El comportamiento de las complementarias se decidirá durante la implementación.


## 69. Herencia entre niveles

Podrá estudiarse si determinados niveles superiores reutilizan recomendaciones definidas para niveles inferiores.

Esta posibilidad no se considera todavía una decisión definitiva.

Se determinará cuando se diseñe el catálogo real.


## 70. Catálogo cerrado de recomendaciones

Los usuarios no podrán crear recomendaciones de seguridad.

El catálogo será administrado por MeteoArchidona.


## 71. Alertas en la web

Las alertas activas deberán tener una presencia claramente visible.

Su representación podrá incluir:

- color;
- nivel;
- fenómeno;
- probabilidad;
- periodo;
- descripción;
- recomendaciones;
- fuente.

El diseño gráfico se determinará durante el desarrollo de la interfaz.


## 72. Alertas relacionadas con días de predicción

Cuando una alerta afecte a un día incluido en la predicción diaria o semanal, podrá mostrarse vinculada a ese periodo.

Así el visitante podrá identificar rápidamente qué jornada requiere especial atención.


## 73. Catálogo territorial de municipios

El subsistema de predicción se apoyará en un catálogo propio de municipios.

Este catálogo permitirá relacionar cada municipio con los identificadores necesarios para consultar proveedores externos.


## 74. Código INE

El catálogo conservará el código INE correspondiente a cada municipio cuando sea necesario.

El código INE será tratado como dato maestro.

No deberá inferirse de forma insegura.

Deberá cargarse o verificarse utilizando información fiable.


## 75. Carga inicial

No se cargará inicialmente todo el catálogo nacional únicamente por disponer de él.

El despliegue inicial podrá concentrarse en:

- municipios de Málaga;
- determinados municipios próximos de Granada;
- determinados municipios próximos de Córdoba;
- otras localidades que resulten relevantes.

La relación inicial definitiva se preparará antes de implementar la carga de referencia.


## 76. Crecimiento orgánico

El catálogo territorial crecerá progresivamente según la demanda real.

Esto evitará mantener desde el inicio miles de municipios que no tienen todavía utilidad para MeteoArchidona.


## 77. Municipio principal de interés

Cuando exista registro de usuarios, cada usuario podrá seleccionar un municipio principal de interés.

Este municipio no deberá interpretarse necesariamente como su domicilio.

Puede representar:

- lugar donde vive;
- lugar donde trabaja;
- lugar donde tiene una finca;
- localidad familiar;
- cualquier municipio que desee seguir.


## 78. Utilización del municipio principal

El municipio podrá utilizarse para:

- predicción personalizada;
- alertas;
- correo diario;
- resumen semanal;
- notificaciones;
- personalización de la portada;
- otros servicios meteorológicos.


## 79. Municipio no disponible

Si el usuario busca un municipio y no aparece en el catálogo, podrá utilizar una opción equivalente a:

**No encuentro mi municipio**

Esto iniciará una solicitud de incorporación.


## 80. Solicitud de alta de municipio

La solicitud podrá incluir:

- municipio solicitado;
- provincia;
- comunidad autónoma;
- usuario solicitante;
- fecha de solicitud;
- estado;
- observaciones administrativas.

La estructura definitiva se diseñará junto con el subsistema de usuarios.


## 81. Alta controlada

Un usuario podrá solicitar un municipio, pero no crear directamente el registro maestro.

Antes de incorporar el municipio, MeteoArchidona comprobará:

- nombre oficial;
- provincia;
- código INE;
- inexistencia de duplicados;
- disponibilidad de predicción;
- cualquier otra información territorial necesaria.


## 82. Demanda territorial

Las solicitudes de nuevos municipios permitirán conocer la demanda geográfica real.

Un crecimiento de solicitudes en una localidad podrá indicar interés potencial para:

- ampliar predicciones;
- incorporar estaciones;
- buscar colaboradores;
- estudiar cámaras;
- estudiar acuerdos institucionales;
- ampliar servicios.


## 83. Relación con usuarios

Predicción y usuarios serán subsistemas independientes.

El subsistema de usuarios podrá consumir predicciones y alertas.

El subsistema de predicción no necesitará conocer los detalles de autenticación o gestión de perfiles para adquirir y almacenar predicciones.


## 84. Notificaciones

Las predicciones y alertas podrán alimentar posteriormente un subsistema de notificaciones.

Conceptualmente:

**predicción → preferencias del usuario → notificación**

y:

**alerta → preferencias del usuario → notificación**


## 85. Correo diario

Un usuario podrá solicitar en el futuro una predicción meteorológica diaria por correo electrónico.

Podrá configurarse, entre otros aspectos:

- municipio;
- horario;
- tipo de resumen;
- inclusión de alertas.

El envío pertenecerá al subsistema de usuarios/notificaciones.


## 86. Resumen semanal

También podrá existir un resumen semanal.

Podrá mostrar:

- evolución prevista;
- máximas y mínimas;
- precipitación;
- días más significativos;
- alertas;
- narrativa MeteoArchidona.


## 87. Otros canales

Posteriormente podrán estudiarse:

- WhatsApp;
- notificaciones web;
- aplicaciones móviles;
- otros sistemas de mensajería.

Su utilización dependerá de:

- disponibilidad técnica;
- costes;
- condiciones de los proveedores;
- consentimiento;
- normativa aplicable.


## 88. Comparación entre fuentes

Cuando existan varias predicciones disponibles para un mismo municipio, MeteoArchidona podrá facilitar su consulta o comparación.

La comparación deberá conservar la identidad de cada fuente.

No se fabricará automáticamente una supuesta predicción propia mezclando valores de varias fuentes sin que exista un modelo definido para ello.


## 89. Utilidad de otras predicciones

La consulta de fuentes externas puede tener un valor importante para aficionados y usuarios avanzados.

Muchas personas consultan distintas páginas meteorológicas antes de formarse una opinión.

MeteoArchidona podrá facilitar esa tarea reuniendo diferentes predicciones en un mismo entorno.


## 90. Personalidad de MeteoArchidona

La existencia de fuentes externas no deberá convertir MeteoArchidona en una copia textual o visual de otros portales.

Su personalidad se construirá mediante:

- diseño;
- iconografía;
- narrativa;
- refranes;
- expresiones;
- contexto local;
- alertas propias;
- recomendaciones;
- integración con nuestras observaciones.


## 91. Separación de responsabilidades

Conceptualmente deberán mantenerse responsabilidades diferenciadas para:

- proveedores externos;
- adquisición;
- normalización;
- persistencia;
- consulta;
- narrativa;
- iconografía;
- alertas;
- recomendaciones;
- catálogo territorial;
- exposición mediante API.

La capa HTTP no deberá contener lógica meteorológica de negocio.


## 92. API propia

La web MeteoArchidona deberá consumir nuestra propia API para la predicción estructurada.

Conceptualmente:

**web → API MeteoArchidona → servicios → PostgreSQL**

La web no deberá contener credenciales de los proveedores.


## 93. Excepción de componentes externos

Los widgets, gadgets, vídeos o recursos oficiales embebidos constituyen una excepción consciente.

En esos casos el navegador podrá consumir directamente un componente externo porque no se está utilizando como fuente interna de nuestros datos, sino mostrando una aplicación gráfica del proveedor.

Esta excepción deberá mantenerse claramente diferenciada de la predicción propia.


## 94. Relación con publicidad

Las páginas de predicción podrán disponer en el futuro de espacios patrocinables.

La lógica de campañas, anunciantes, tarifas y rotaciones pertenecerá al subsistema de publicidad.

Predicción no deberá implementar internamente esa responsabilidad.


## 95. Información esencial

La predicción meteorológica esencial deberá continuar tratándose como información meteorológica del proyecto.

Las decisiones futuras sobre servicios premium, suscripciones u otras modalidades se definirán separadamente.

La monetización no deberá contaminar la fiabilidad ni la procedencia de los datos.


## 96. Productos futuros

Una vez construido el núcleo podrán estudiarse productos adicionales de AEMET u otras fuentes.

Entre ellos podrían encontrarse:

- índice ultravioleta previsto;
- productos especializados;
- predicción de fenómenos específicos;
- otros productos relevantes para los municipios cubiertos.

La existencia de un producto externo no implica automáticamente que deba incorporarse.


## 97. Fuera de alcance de este documento

No forman parte principal de este documento:

- radar meteorológico;
- imágenes de satélite;
- rayos;
- vigilancia solar;
- tormentas geomagnéticas;
- imágenes de vapor de agua;
- masas de aire observadas;
- embalses;
- cuencas hidrográficas;
- otros recursos de observación.

Estos contenidos se documentarán posteriormente dentro del subsistema de Observaciones.


## 98. Próximos trabajos técnicos

Antes de comenzar la implementación deberán realizarse al menos los siguientes trabajos:

1. obtener una API Key de AEMET OpenData;
2. obtener una predicción real de Archidona;
3. estudiar el XML o respuesta estructurada completa;
4. identificar campos y códigos;
5. estudiar la predicción diaria;
6. estudiar la predicción horaria;
7. estudiar la estructura real de los avisos oficiales;
8. identificar frecuencias de actualización;
9. definir el catálogo inicial de municipios;
10. definir el modelo normalizado;
11. definir el catálogo inicial de condiciones meteorológicas;
12. definir el catálogo inicial de frases;
13. definir el catálogo inicial de recomendaciones;
14. definir fenómenos y niveles de alertas;
15. estudiar las posibilidades reales de eltiempo.es;
16. investigar qué fuentes externas permiten widgets o gadgets;
17. definir la primera interfaz de predicción.


## 99. Decisiones adoptadas

Quedan recogidas como decisiones funcionales:

- AEMET será inicialmente la fuente oficial principal;
- la integración productiva con AEMET utilizará preferentemente OpenData;
- la API Key de AEMET será privada;
- la credencial no se expondrá en la web;
- se utilizará predicción municipal;
- se estudiará predicción diaria de siete días;
- se estudiará predicción horaria a corto plazo;
- la web no dependerá directamente de AEMET para la predicción principal;
- la predicción estructurada se persistirá cuando resulte útil;
- se conservará la procedencia;
- se estudiará conservar histórico de distintas ediciones;
- eltiempo.es será una fuente complementaria a estudiar;
- MeteoArchidona tendrá narrativa propia;
- existirá un catálogo cerrado de frases y refranes;
- los usuarios no podrán modificar dicho catálogo;
- se desarrollará progresivamente iconografía propia;
- los iconos propios tendrán prioridad cuando existan;
- las alertas forman parte del subsistema;
- coexistirán alertas oficiales y alertas propias;
- las alertas propias se identificarán claramente;
- la escala propia tendrá amarillo, naranja, fucsia y rojo;
- fucsia estará situado entre naranja y rojo;
- nivel y probabilidad serán conceptos independientes;
- las alertas tendrán un periodo de vigencia;
- se conservará histórico de alertas;
- existirá un catálogo controlado de recomendaciones;
- las recomendaciones esenciales no serán aleatorias;
- existirá un catálogo propio de municipios;
- inicialmente no se cargará necesariamente toda España;
- el catálogo crecerá progresivamente;
- los usuarios tendrán un municipio principal de interés;
- un usuario podrá solicitar el alta de un municipio no disponible;
- el alta definitiva será revisada por MeteoArchidona;
- podrán existir predicciones externas accesibles desde la web;
- podrán utilizarse widgets y gadgets oficiales autorizados;
- integración estructurada y widget externo serán conceptos diferentes;
- predicción y observación permanecerán separadas;
- radar, satélite, actividad solar y recursos hídricos se documentarán en Observaciones;
- una predicción propia basada en años de histórico queda aparcada inicialmente.


## 100. Conclusión

El subsistema de Predicción y Alertas de MeteoArchidona no se concibe como una simple reproducción de una página de terceros.

Las fuentes externas proporcionarán información meteorológica de referencia.

MeteoArchidona será responsable de adquirir, normalizar, conservar y presentar esa información dentro de su propia plataforma.

Sobre esos datos se construirá una identidad propia mediante:

- narrativa;
- expresiones;
- refranes;
- iconografía;
- contexto local;
- alertas propias;
- recomendaciones;
- personalización territorial.

Las alertas oficiales y las alertas MeteoArchidona coexistirán manteniendo siempre claramente identificada su procedencia.

El catálogo territorial permitirá comenzar con un ámbito reducido y crecer según la demanda real.

La futura integración con usuarios permitirá transformar la predicción en un servicio personalizado mediante correos, alertas y otros canales.

También se permitirá consultar predicciones externas mediante widgets, gadgets u otros mecanismos autorizados cuando resulten útiles para comparar fuentes.

La arquitectura deberá mantener una regla fundamental:

> MeteoArchidona podrá contar el tiempo con personalidad propia, pero el origen, significado y fiabilidad de los datos meteorológicos deberán permanecer siempre claros.