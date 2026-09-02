# Subsistema de observaciones meteorológicas

## 1. Propósito

Este documento define el diseño funcional inicial del subsistema de Observaciones de MeteoArchidona.

El subsistema reunirá información que permita conocer qué está ocurriendo o qué ha ocurrido realmente en la atmósfera y en otros sistemas naturales relacionados con la meteorología.

Observaciones será conceptualmente diferente del subsistema de Predicciones y Alertas.

La distinción fundamental será:

**Predicción → qué se espera que ocurra.**

**Observación → qué está ocurriendo o qué ha ocurrido.**

Este documento constituye una primera versión y se ampliará progresivamente conforme se investiguen nuevas fuentes y productos.


## 2. Filosofía

MeteoArchidona tendrá dos funciones complementarias.

Por una parte será productor de información meteorológica propia mediante:

- estaciones meteorológicas;
- sensores;
- cámaras;
- históricos;
- otros sistemas propios que puedan incorporarse.

Por otra parte actuará como punto de acceso organizado a información meteorológica y ambiental procedente de fuentes externas de calidad.

El objetivo no será acumular recursos por cantidad.

Cada recurso incorporado deberá aportar una utilidad concreta.


## 3. Observaciones como sección pública

La futura web de MeteoArchidona dispondrá de una sección denominada:

**Observaciones**

Este nombre se utilizará preferentemente frente a denominaciones genéricas como "Recursos".

La sección permitirá reunir productos de observación procedentes tanto de MeteoArchidona como de organismos externos.


## 4. Alcance inicial

Entre los productos que podrán formar parte progresivamente de Observaciones se encuentran:

- radar meteorológico;
- imágenes de satélite;
- detección de rayos;
- estaciones meteorológicas;
- cámaras meteorológicas;
- actividad solar;
- meteorología espacial;
- información hidrológica;
- embalses;
- nieve y hielo;
- otros productos de observación que resulten útiles.

La inclusión definitiva de cada familia dependerá de la investigación de sus fuentes.


## 5. Separación respecto a modelos numéricos

Los modelos numéricos meteorológicos no pertenecen al subsistema de Observaciones.

Productos procedentes de:

- ECMWF;
- GFS;
- ICON;
- WRF;
- ensembles;
- otros modelos meteorológicos;

pertenecen al ámbito de Predicciones.

Lo mismo se aplicará a mapas futuros de:

- geopotencial;
- precipitación prevista;
- temperatura prevista;
- viento previsto;
- anomalías previstas;
- otros campos de modelización.

La existencia de una representación gráfica no convierte un producto previsto en una observación.


## 6. Fuentes

Siempre que resulte posible, MeteoArchidona buscará la fuente primaria del producto.

Se evitará depender innecesariamente de páginas intermediarias cuando el organismo productor proporcione directamente:

- datos;
- imágenes;
- APIs;
- servicios;
- widgets;
- productos descargables;
- otros mecanismos oficiales de acceso.


## 7. Investigación de fuentes

La investigación seguirá inicialmente este orden:

1. AEMET.
2. Fuentes identificadas mediante MeteoVigo.
3. Organismos productores originales descubiertos durante esa investigación.
4. Otras fuentes nacionales e internacionales que puedan resultar útiles.

MeteoVigo se utilizará principalmente como herramienta para descubrir productos y proveedores interesantes.

Cuando se identifique una fuente utilizada por MeteoVigo, se investigará directamente al proveedor original.


## 8. Criterios de selección

Antes de incorporar un producto se estudiará:

- utilidad meteorológica;
- interés para el público;
- relevancia para Archidona y el ámbito geográfico cubierto;
- calidad;
- resolución espacial;
- resolución temporal;
- frecuencia de actualización;
- disponibilidad histórica;
- estabilidad de la fuente;
- posibilidad de automatización;
- formato;
- condiciones de reutilización;
- requisitos de atribución;
- posibilidad de integración en la web;
- coste, cuando exista.


## 9. Fuente inicial: AEMET

AEMET será la primera fuente externa investigada para el subsistema de Observaciones.

AEMET dispone de numerosos productos de observación y proporciona parte de ellos mediante AEMET OpenData.

Entre los productos disponibles mediante OpenData se encuentran actualmente:

- imágenes de radar;
- mapas de rayos;
- productos derivados de satélite;
- datos de observación;
- radiación;
- otros productos meteorológicos.

La integración técnica definitiva se estudiará posteriormente.


## 10. AEMET OpenData

Cuando un producto adecuado esté disponible mediante AEMET OpenData, esta será inicialmente la vía preferida para una futura adquisición automatizada.

La arquitectura conceptual podrá ser:

**AEMET OpenData**

↓

**Proveedor AEMET**

↓

**Adquisición**

↓

**Persistencia o caché cuando proceda**

↓

**API MeteoArchidona**

↓

**Web**

La estrategia concreta dependerá de la naturaleza del producto.


## 11. Radar meteorológico

El radar de precipitación será uno de los productos principales del subsistema de Observaciones.

Para MeteoArchidona tiene especial importancia porque la precipitación es uno de los fenómenos de mayor interés para los usuarios locales.

El radar deberá ocupar una posición destacada en la futura experiencia web.


## 12. Radar AEMET

AEMET dispone de una red de radares meteorológicos.

AEMET OpenData proporciona actualmente acceso a:

- composición nacional de radares;
- imágenes de radares regionales.

Los endpoints oficiales incluyen conceptualmente:

- composición nacional;
- radar regional seleccionado.

Durante la futura implementación se determinará qué radar o combinación de productos ofrece la mejor cobertura para Archidona.


## 13. Radar regional

La documentación actual de AEMET OpenData permite solicitar imágenes correspondientes a radares regionales mediante un identificador.

La propia documentación utiliza como ejemplo el radar de Almería.

Antes de implementar MeteoArchidona se estudiarán todos los radares disponibles y su cobertura efectiva sobre nuestra zona.


## 14. Composición nacional

La composición nacional permitirá disponer de una visión general de la precipitación sobre España.

Podrá resultar útil como:

- vista general;
- complemento del radar regional;
- alternativa cuando se quiera observar una situación meteorológica extensa.


## 15. Radar animado

MeteoArchidona no pretende limitarse necesariamente a mostrar una única imagen estática.

Se estudiará la posibilidad de construir una secuencia temporal con imágenes recientes.

El objetivo será proporcionar una experiencia equivalente a:

**imagen anterior → imagen siguiente → evolución de la precipitación**

La futura interfaz podrá disponer de:

- reproducción;
- pausa;
- avance;
- retroceso;
- indicador temporal;
- selección manual de instante.

La viabilidad dependerá de cómo puedan obtenerse y conservarse los diferentes fotogramas.


## 16. Histórico temporal de radar

Si AEMET proporciona únicamente la imagen actual mediante determinados mecanismos, MeteoArchidona podrá estudiar la conservación temporal de imágenes sucesivas obtenidas legalmente.

Esto permitiría construir nuestra propia secuencia reciente.

No se conservarán indefinidamente grandes cantidades de imágenes sin una finalidad definida.

Se determinará posteriormente:

- frecuencia de adquisición;
- número de fotogramas;
- periodo conservado;
- política de eliminación;
- almacenamiento necesario.


## 17. Radar de otras fuentes

AEMET no será necesariamente la única fuente futura de radar.

Después de estudiar AEMET se investigarán radares de otros organismos cuya cobertura pueda resultar útil para el sur de la península ibérica.

Se estudiarán especialmente fuentes de:

- Portugal;
- Francia;
- Marruecos;
- organismos europeos;
- otras redes meteorológicas.

La existencia de un radar no supondrá automáticamente su incorporación.

Será necesario comprobar cobertura, utilidad y condiciones de uso.


## 18. Satélite

Las imágenes de satélite constituirán el segundo gran bloque inicial de Observaciones.

El objetivo será permitir observar la evolución real de la atmósfera y de la nubosidad.


## 19. Fuente satelital inicial

AEMET proporciona actualmente imágenes procedentes de Meteosat.

Los productos actuales utilizan información de METEOSAT-12, perteneciente a la tercera generación de satélites Meteosat.

MeteoArchidona comenzará estudiando los productos proporcionados por AEMET antes de investigar otras fuentes satelitales.


## 20. Productos satelitales seleccionados

Inicialmente se consideran especialmente interesantes tres productos:

1. Masas de aire.
2. Infrarrojo.
3. Visible.

No significa que otros productos disponibles sean técnicamente inútiles.

Estos tres se consideran inicialmente los de mayor interés para MeteoArchidona.


## 21. Masas de aire

El producto **Masas de aire** será uno de los productos satelitales principales.

AEMET lo proporciona actualmente como una composición RGB generada a partir de información de diferentes canales de METEOSAT-12.

El producto permite distinguir características de diferentes masas de aire y seguir su evolución.

Tiene especial interés meteorológico para estudiar situaciones atmosféricas complejas y evolución de sistemas nubosos.


## 22. Utilidad de Masas de aire

La composición de masas de aire puede resultar especialmente interesante durante:

- situaciones convectivas;
- tormentas;
- evolución de grandes sistemas nubosos;
- entradas de diferentes masas de aire;
- seguimiento de estructuras atmosféricas;
- episodios meteorológicos relevantes.

Será uno de los productos candidatos a tener una posición destacada dentro de Satélite.


## 23. Composición RGB de Masas de aire

El producto de AEMET combina información de canales infrarrojos y de vapor de agua.

Esto no significa que MeteoArchidona vaya a ofrecer necesariamente un producto independiente de "vapor de agua".

El vapor de agua forma parte de la construcción técnica del RGB de masas de aire.


## 24. Infrarrojo

El producto **Infrarrojo** será el segundo producto satelital principal.

AEMET genera actualmente esta imagen utilizando información del canal infrarrojo de 10,5 µm de METEOSAT-12.

Una ventaja fundamental del infrarrojo es que permite observación tanto durante el día como durante la noche.


## 25. Utilidad del infrarrojo

El infrarrojo permitirá seguir:

- evolución de nubosidad;
- sistemas nubosos;
- estructuras convectivas;
- evolución nocturna;
- grandes sistemas meteorológicos.

Complementará especialmente al producto visible durante las horas sin iluminación solar.


## 26. Visible

El producto **Visible** también se incorporará a la selección inicial.

AEMET genera actualmente este producto utilizando canales visibles de METEOSAT-12.

Su principal ventaja es que ofrece una representación muy intuitiva de la nubosidad durante las horas de luz.


## 27. Utilidad del visible

El visible tiene un especial interés divulgativo.

Permite al usuario interpretar de manera intuitiva:

- nubosidad real;
- claros;
- estructuras nubosas;
- evolución durante el día.

Su aspecto se aproxima mucho más a lo que una persona imagina cuando piensa en "ver la Tierra desde el satélite".


## 28. Limitación del visible

El producto visible depende de la iluminación solar.

Por tanto, no proporciona la misma utilidad durante la noche.

Esta limitación deberá reflejarse correctamente en la interfaz.

El infrarrojo proporcionará continuidad durante los periodos nocturnos.


## 29. Selector de producto satelital

En una futura interfaz no será necesario mostrar simultáneamente todas las imágenes.

Podrá existir un selector equivalente a:

**Masas de aire | Infrarrojo | Visible**

Esto permitirá utilizar una única zona de visualización y cambiar el producto mostrado.


## 30. Producto satelital predeterminado

Se estudiará utilizar **Masas de aire** como producto inicialmente seleccionado dentro del visor satelital.

Esta decisión podrá revisarse durante el diseño real de la interfaz.


## 31. Animación satelital

Las páginas actuales de AEMET muestran secuencias temporales de imágenes satelitales y controles de animación.

MeteoArchidona estudiará cómo proporcionar también una visualización temporal.

La futura interfaz podrá permitir:

- reproducir;
- pausar;
- avanzar;
- retroceder;
- seleccionar instante;
- visualizar la hora correspondiente.


## 32. Valor de la animación

La animación es especialmente importante porque una imagen aislada proporciona mucha menos información sobre la evolución atmosférica.

Una secuencia permite observar:

- dirección de desplazamiento;
- crecimiento de sistemas nubosos;
- disipación;
- aproximación de frentes;
- desarrollo convectivo;
- evolución general de una situación meteorológica.


## 33. Otras fuentes satelitales

Después de AEMET se estudiarán otras fuentes originales.

Entre las candidatas estará especialmente EUMETSAT, como organización directamente relacionada con los satélites Meteosat.

Antes de utilizar intermediarios se comprobará si el productor original proporciona productos adecuados y reutilizables.


## 34. Rayos

La detección de rayos constituye otro producto candidato de alta prioridad.

AEMET OpenData dispone actualmente de mapas de rayos registrados durante periodos determinados.

Este producto se estudiará después del núcleo inicial formado por radar y satélite.


## 35. Utilidad de los rayos

La información de descargas eléctricas podrá resultar especialmente útil durante:

- tormentas;
- episodios convectivos;
- seguimiento de actividad eléctrica;
- evolución de sistemas tormentosos.

Podrá complementar de forma natural:

- radar;
- satélite;
- observaciones de estaciones.


## 36. Correlación visual

Una futura evolución podría permitir consultar conjuntamente diferentes observaciones correspondientes al mismo periodo.

Por ejemplo:

**Radar + Satélite + Rayos**

Esto facilitaría comprender la evolución de una tormenta desde diferentes fuentes.


## 37. MeteoVigo como fuente de investigación

Después de estudiar AEMET se realizará una revisión sistemática de MeteoVigo.

El objetivo no será copiar los recursos de MeteoVigo.

El objetivo será identificar:

- qué productos utiliza;
- quién produce realmente cada producto;
- qué fuentes originales existen;
- cuáles pueden aportar valor a MeteoArchidona.


## 38. Investigación hacia la fuente primaria

Cuando MeteoVigo utilice un producto externo, la investigación continuará hacia su fuente original.

Ejemplo conceptual:

**MeteoVigo**

↓

**producto interesante**

↓

**identificación del proveedor**

↓

**sitio oficial del proveedor**

↓

**investigación técnica y legal**

↓

**decisión MeteoArchidona**


## 39. Fuentes ya identificadas como candidatas

Durante la investigación inicial han aparecido organismos y servicios que deberán estudiarse posteriormente.

Entre ellos:

- EUMETSAT;
- NASA;
- NOAA;
- MeteoGalicia;
- NSIDC;
- Global Cryosphere Watch;
- organismos meteorológicos europeos;
- otras fuentes especializadas.

La aparición en esta lista no significa que hayan sido aprobadas para su integración.


## 40. MeteoGalicia

MeteoGalicia se investigará especialmente por sus productos de radar y observación.

Será necesario determinar si su cobertura proporciona utilidad real para el ámbito geográfico de MeteoArchidona.

También se estudiarán:

- frecuencia;
- histórico;
- formato;
- acceso programático;
- condiciones de reutilización.


## 41. Actividad solar

MeteoArchidona podrá recuperar en el futuro una sección dedicada a actividad solar.

Esta idea procede de funcionalidades existentes en versiones anteriores del proyecto.

Se estudiarán fuentes originales y oficiales antes de decidir su integración.


## 42. Productos solares

Podrán investigarse productos relacionados con:

- imagen del Sol;
- manchas solares;
- corona solar;
- erupciones solares;
- eyecciones de masa coronal;
- viento solar;
- otros fenómenos solares.


## 43. NASA

NASA será una de las fuentes a investigar para productos solares.

Se estudiarán especialmente los productos procedentes de misiones de observación solar como SDO cuando resulten apropiados.

Antes de su incorporación se comprobarán:

- productos disponibles;
- actualización;
- formatos;
- histórico;
- mecanismos de acceso;
- condiciones de reutilización.


## 44. Meteorología espacial

La actividad solar podrá complementarse con información de meteorología espacial.

Se estudiarán fenómenos como:

- tormentas geomagnéticas;
- actividad geomagnética;
- viento solar;
- perturbaciones electromagnéticas;
- índices especializados;
- alertas de meteorología espacial.

La selección definitiva dependerá de su utilidad para el público de MeteoArchidona.


## 45. Nieve y hielo

También se investigarán recursos de observación relacionados con:

- cobertura de nieve;
- extensión de nieve;
- hielo;
- criosfera.

Entre las fuentes candidatas identificadas se encuentran organismos internacionales especializados.

Estos productos tendrán menor prioridad que radar, satélite y rayos para el ámbito inicial de MeteoArchidona.


## 46. Recursos hidrológicos

Observaciones podrá incorporar información hidrológica.

Esta información será especialmente útil para relacionar la meteorología con:

- reservas de agua;
- embalses;
- cuencas;
- evolución de recursos hídricos.


## 47. Selección territorial hidrológica

No se pretende mostrar indiscriminadamente todos los sistemas hidrológicos disponibles.

La filosofía será partir de una fuente amplia y seleccionar únicamente los sistemas relevantes para nuestro ámbito.

Como referencia histórica del proyecto, deberán investigarse especialmente los sistemas relacionados con:

- Guadalhorce;
- Genil;
- Guadalteba.

Los nombres y divisiones administrativas actuales deberán verificarse utilizando fuentes oficiales antes de implementar el catálogo definitivo.


## 48. Información de embalses

Se investigará la disponibilidad de información como:

- capacidad;
- volumen actual;
- porcentaje de llenado;
- variación reciente;
- evolución histórica;
- entradas y salidas cuando estén disponibles;
- otros indicadores útiles.

No se fija todavía el periodo utilizado para calcular la variación.


## 49. Fuente hidrológica

Se buscará preferentemente una fuente oficial que proporcione información nacional o suficientemente amplia.

Posteriormente MeteoArchidona seleccionará únicamente la información territorial relevante.

No se decidirá la fuente hasta completar la investigación.


## 50. Atribución

Toda información procedente de terceros deberá mantener la atribución correspondiente.

La presentación deberá indicar claramente la fuente cuando sea necesario.

Ejemplos:

**Fuente: AEMET**

**Fuente: EUMETSAT**

**Fuente: NASA**

La forma exacta dependerá de las condiciones de cada proveedor.


## 51. Derechos de reutilización

Antes de incorporar cualquier producto externo se comprobarán sus condiciones de reutilización.

Se estudiará específicamente:

- reproducción de imágenes;
- almacenamiento;
- caché;
- modificación;
- creación de animaciones;
- hotlinking;
- iframe;
- APIs;
- atribución;
- utilización comercial;
- redistribución.

La disponibilidad pública de una imagen no implica automáticamente autorización para cualquier reutilización.


## 52. Integración técnica

Dependiendo de la fuente, un recurso podrá integrarse mediante:

- API;
- descarga programática;
- imagen externa;
- almacenamiento temporal;
- caché;
- iframe autorizado;
- widget oficial;
- enlace;
- otros mecanismos permitidos.

La solución se decidirá individualmente para cada producto.


## 53. Persistencia de imágenes

Los productos gráficos requieren una estrategia diferente a las observaciones numéricas.

No se decidirá todavía si determinadas imágenes deberán almacenarse:

- en PostgreSQL;
- en almacenamiento de objetos;
- en sistema de archivos;
- mediante caché;
- únicamente mediante referencia externa.

La decisión dependerá del volumen, frecuencia y finalidad.


## 54. Disponibilidad de la fuente

La web no debería degradarse completamente porque una fuente externa esté temporalmente indisponible.

Cuando sea razonable se estudiarán mecanismos como:

- última imagen válida;
- caché;
- indicador de antigüedad;
- mensaje de indisponibilidad;
- fuente alternativa.


## 55. Frescura

Todo producto de observación deberá mostrar claramente cuándo corresponde la información.

Una imagen antigua no deberá presentarse de forma que parezca actual.

La interfaz deberá disponer de información temporal suficiente para que el usuario pueda conocer la antigüedad del producto.


## 56. Orientación local

Aunque algunas fuentes tengan cobertura nacional, europea o mundial, MeteoArchidona priorizará la utilidad local.

La selección deberá responder principalmente a preguntas como:

- ¿Está lloviendo?
- ¿Dónde está lloviendo?
- ¿Se acerca precipitación?
- ¿Cómo evoluciona la nubosidad?
- ¿Hay actividad tormentosa?
- ¿Dónde se están produciendo rayos?
- ¿Cómo evoluciona una situación meteorológica?
- ¿Cuál es el estado de los recursos hídricos relevantes?


## 57. Información avanzada

La orientación local no impedirá ofrecer herramientas para aficionados y usuarios avanzados.

Observaciones podrá disponer progresivamente de diferentes niveles de profundidad.

Un visitante podrá consultar rápidamente el radar.

Un usuario avanzado podrá profundizar en:

- satélite;
- masas de aire;
- infrarrojo;
- rayos;
- actividad solar;
- otros productos especializados.


## 58. Portada

El radar de precipitación es candidato a disponer de presencia directa en la portada de MeteoArchidona.

Esta decisión responde a su especial interés para los usuarios.

La ubicación y diseño definitivo se decidirán durante la fase de interfaz.


## 59. Página Observaciones

La página Observaciones podrá actuar como centro de acceso a los distintos productos.

Una organización conceptual inicial podría incluir:

### Atmósfera

- Radar.
- Satélite.
- Rayos.

### Sol y espacio

- Actividad solar.
- Meteorología espacial.

### Agua

- Embalses.
- Recursos hidrológicos.

### Otros

- Nieve.
- Hielo.
- Otros productos futuros.

Esta organización no se considera todavía definitiva.


## 60. Relación con estaciones propias

Las estaciones de MeteoArchidona son también sistemas de observación.

Sin embargo, sus datos actuales e históricos tendrán sus propias interfaces especializadas.

Observaciones podrá enlazar o integrar determinados elementos sin duplicar innecesariamente toda la interfaz de estaciones.


## 61. Relación con cámaras

Las futuras cámaras meteorológicas también forman parte conceptualmente de la observación.

Permiten comprobar visualmente:

- nubosidad;
- visibilidad;
- precipitación;
- evolución del cielo;
- otras condiciones locales.

Su arquitectura específica se documentará cuando se implemente el subsistema de cámaras.


## 62. Relación con Predicciones

Predicciones y Observaciones deberán poder complementarse.

Por ejemplo, el usuario podrá comparar:

**Predicción de lluvia**

con:

**Radar observado**

o:

**Predicción de nubosidad**

con:

**Satélite observado**

Esto permitirá comprender mejor la situación meteorológica.


## 63. Futuro análisis previsto frente a observado

La conservación de predicciones y observaciones podrá permitir en el futuro comparar:

**lo que se esperaba**

frente a:

**lo que realmente ocurrió**

Este análisis no forma parte de la primera implementación de Observaciones.


## 64. Prioridad inicial

El orden inicial de investigación queda establecido como:

1. Radar AEMET.
2. Satélite AEMET.
3. Rayos AEMET.
4. Revisión de MeteoVigo.
5. Investigación directa de las fuentes originales identificadas.
6. Otras fuentes de radar.
7. Actividad solar y meteorología espacial.
8. Recursos hidrológicos.
9. Otros productos de observación.


## 65. Selección satelital inicial

Dentro de AEMET, los productos satelitales inicialmente seleccionados son:

1. Masas de aire.
2. Infrarrojo.
3. Visible.

Otros productos podrán reconsiderarse posteriormente si aportan utilidad suficiente.


## 66. Decisiones adoptadas

Quedan recogidas como decisiones iniciales:

- la sección pública se denominará Observaciones;
- Observaciones y Predicciones serán conceptos diferentes;
- los modelos numéricos pertenecen a Predicciones;
- AEMET será la primera fuente investigada;
- se buscarán preferentemente fuentes primarias;
- MeteoVigo se utilizará para descubrir fuentes y productos;
- no se copiarán automáticamente los recursos de MeteoVigo;
- cada fuente descubierta será investigada directamente;
- radar será uno de los productos prioritarios;
- se estudiará radar nacional y regional de AEMET;
- se estudiará la creación de radar animado;
- satélite será otro producto prioritario;
- los productos satelitales iniciales serán Masas de aire, Infrarrojo y Visible;
- Masas de aire tendrá especial protagonismo;
- se estudiará animación temporal de satélite;
- rayos será uno de los siguientes productos;
- posteriormente se investigarán otras fuentes de radar;
- se estudiarán fuentes de Portugal, Francia, Marruecos y otros organismos;
- se estudiará actividad solar;
- se estudiará meteorología espacial;
- se estudiarán recursos hidrológicos y embalses;
- la selección hidrológica será local y no indiscriminada;
- se investigarán especialmente Guadalhorce, Genil y Guadalteba;
- toda fuente deberá ser evaluada técnica y legalmente;
- los productos externos mantendrán claramente identificada su procedencia.


## 67. Estado del documento

Este documento es deliberadamente una primera versión.

La investigación de fuentes de Observaciones no se considera terminada.

Se ampliará conforme se estudien:

- nuevos productos AEMET;
- MeteoVigo;
- EUMETSAT;
- NASA;
- NOAA;
- MeteoGalicia;
- redes de rayos;
- radares internacionales;
- organismos hidrológicos;
- otras fuentes relevantes.

No deben interpretarse las fuentes candidatas como integraciones ya aprobadas.


## 68. Próxima evolución

Cuando se retome el diseño de Observaciones, el trabajo continuará identificando productos y fuentes originales.

La investigación deberá determinar para cada recurso:

1. qué información proporciona;
2. quién es el productor original;
3. qué ámbito geográfico cubre;
4. con qué frecuencia se actualiza;
5. cómo puede obtenerse;
6. qué histórico existe;
7. qué condiciones de reutilización tiene;
8. cómo podría integrarse técnicamente;
9. qué utilidad concreta tendría para MeteoArchidona.

Solo después de esta evaluación se decidirá su implementación.


## 69. Conclusión

Observaciones será el espacio de MeteoArchidona dedicado a comprender lo que está ocurriendo realmente.

Combinará progresivamente:

- observaciones propias;
- radar;
- satélite;
- rayos;
- cámaras;
- actividad solar;
- información hidrológica;
- otros productos seleccionados.

La prioridad no será disponer del mayor número posible de mapas o imágenes.

La prioridad será reunir en un único entorno información fiable y útil que evite al usuario tener que recorrer numerosas páginas para comprender una situación meteorológica.

MeteoArchidona actuará simultáneamente como productor de observaciones locales y como selector organizado de información procedente de fuentes meteorológicas de calidad.

El principio fundamental será:

> observar mucho no significa mostrarlo todo; significa seleccionar bien aquello que ayuda a comprender qué está ocurriendo.