Subsistema de Estadísticas — MeteoArchidona

1. Objeto del documento

Este documento define funcional y conceptualmente el futuro subsistema de Estadísticas de MeteoArchidona.

El objetivo de esta fase es diseñar correctamente el subsistema antes de comenzar su implementación. Por tanto, este documento no pretende definir todavía las tablas SQL definitivas, modelos SQLAlchemy, esquemas Pydantic, servicios, repositorios, endpoints FastAPI ni componentes concretos de la interfaz web.

Las decisiones aquí recogidas deberán servir posteriormente de base para diseñar esas piezas.

El subsistema de estadísticas deberá permitir:

- ofrecer estadísticas preestablecidas por MeteoArchidona;
- permitir a administradores construir estadísticas dinámicas;
- permitir a usuarios registrados construir sus propias estadísticas;
- guardar estadísticas para reutilizarlas posteriormente;
- combinar varias series de datos dentro de una misma estadística;
- representar cada serie de forma independiente;
- publicar determinadas estadísticas en un catálogo;
- permitir la suscripción de usuarios a estadísticas del catálogo;
- generar tablas, gráficos, indicadores e informes;
- utilizar estadísticas como contenido de notificaciones;
- analizar episodios meteorológicos;
- conservar la trazabilidad temporal de máximos, mínimos y otros resultados;
- respetar las capacidades y resolución temporal real de cada estación;
- utilizar únicamente fuentes de datos que cumplan los criterios de calidad establecidos por MeteoArchidona.

El principio general será evitar un conjunto de estadísticas programadas de forma independiente y construir en su lugar un motor estadístico común y declarativo.

---

2. Dos formas de utilizar el subsistema

El subsistema deberá soportar inicialmente dos grandes tipos de estadísticas.

2.1. Estadísticas preestablecidas

Son estadísticas diseñadas previamente por MeteoArchidona y ofrecidas como parte del servicio.

Ejemplos:

- evolución diaria de la temperatura;
- temperatura máxima y mínima mensual;
- precipitación acumulada mensual;
- racha máxima mensual;
- días de lluvia;
- comparación de estaciones;
- evolución anual de determinadas variables;
- estadísticas de un episodio de precipitación;
- récords meteorológicos;
- resúmenes climatológicos.

Estas estadísticas deberán utilizar el mismo motor que las estadísticas dinámicas.

No deberán existir, salvo necesidad justificada, dos motores diferentes: uno para estadísticas oficiales y otro para estadísticas creadas por los usuarios.

Una estadística preestablecida será esencialmente una definición estadística guardada, validada y publicada por MeteoArchidona.

2.2. Estadísticas dinámicas

Administradores y usuarios registrados podrán construir estadísticas mediante un configurador.

La construcción no deberá requerir conocimientos de SQL, programación ni estructura interna de la base de datos.

El usuario deberá indicar de forma declarativa qué quiere obtener.

La definición creada podrá ejecutarse inmediatamente y, cuando las reglas de permisos lo permitan, guardarse para posteriores consultas.

---

3. Las seis preguntas fundamentales

El diseño inicial del constructor parte de seis preguntas.

Construir una estadística consiste conceptualmente en responder:

1. ¿Qué quiero medir?
2. ¿Qué cálculo quiero realizar?
3. ¿Sobre qué período quiero trabajar?
4. ¿Cómo quiero agrupar los datos?
5. ¿Qué condiciones o filtros quiero aplicar?
6. ¿Cómo quiero representar o comparar el resultado?

Durante el diseño se ha comprobado que estas seis respuestas no pertenecen necesariamente todas a la cabecera de la estadística.

Al permitir varias series dentro de una misma estadística, algunas propiedades deberán definirse a nivel de serie.

Por tanto, el modelo final se estructurará como:

Estadística
+
una o varias series estadísticas

La estadística contendrá la configuración común.

Cada serie contendrá la configuración específica de los datos que representa.

---

4. Concepto de estadística

Una estadística en MeteoArchidona será una definición reutilizable de análisis de datos.

No deberá identificarse únicamente con una gráfica.

La misma definición podrá utilizarse para:

- mostrar un gráfico;
- mostrar una tabla;
- mostrar un indicador;
- combinar gráfico y tabla;
- generar un informe;
- enviarse por correo;
- asociarse a una suscripción;
- utilizarse como base de una notificación;
- incorporarse a un catálogo público o restringido.

Una estadística tendrá una identidad propia y contendrá una o varias series.

---

5. Cabecera y series

5.1. Cabecera de la estadística

La cabecera contendrá las propiedades comunes a toda la estadística.

No deberá contener obligatoriamente una estación ni una variable meteorológica concreta, ya que una estadística puede combinar múltiples estaciones y múltiples variables.

Ejemplo:

Una estadística denominada:

Evolución de temperatura y humedad

podría contener:

- Serie 1: temperatura de El Silo.
- Serie 2: humedad de El Silo.

Otra estadística podría contener:

- Serie 1: temperatura de El Silo.
- Serie 2: temperatura de Los Llanos.

Y otra:

- Serie 1: temperatura de El Silo.
- Serie 2: temperatura de Los Llanos.
- Serie 3: humedad de El Silo.

Por tanto, la estación y la variable serán fundamentalmente propiedades de la serie.

5.2. Serie estadística

Una serie será la unidad básica de datos representada dentro de una estadística.

Cada serie deberá poder definir, como mínimo:

- fuente o estación;
- variable meteorológica;
- operación estadística;
- filtros propios cuando sean necesarios;
- unidad;
- representación gráfica;
- estilo de representación;
- eje de representación;
- nombre o alias visible;
- orden dentro de la estadística.

Una estadística deberá contener al menos una serie.

---

6. Identidad y metadatos de una estadística

La estadística deberá disponer de una identidad independiente de su configuración de cálculo.

Los campos conceptuales iniciales son los siguientes.

6.1. Identificador

Identificador interno único.

No tiene por qué ser visible para el usuario.

Permitirá distinguir estadísticas aunque compartan el mismo nombre.

6.2. Nombre

Nombre comprensible de la estadística.

Ejemplo:

"Evolución diaria de temperatura y humedad"

Será uno de los campos principales y deberá ser obligatorio cuando la estadística se guarde.

6.3. Descripción

Texto opcional que explica qué representa la estadística.

Ejemplo:

"Evolución horaria de la temperatura y humedad exterior durante el día seleccionado."

6.4. Propietario

Identificará quién posee o creó la estadística.

Podrá corresponder a:

- MeteoArchidona;
- un administrador;
- un usuario registrado.

6.5. Origen

Permitirá conocer cómo se originó la definición.

Valores conceptuales iniciales:

- "SISTEMA"
- "ADMINISTRADOR"
- "USUARIO"

6.6. Estado

Estado de vida de la definición.

Valores iniciales:

- "BORRADOR"
- "ACTIVA"
- "ARCHIVADA"

Estos valores podrán ampliarse durante la implementación si aparece una necesidad real.

6.7. Clasificación y etiquetas

Las estadísticas podrán clasificarse mediante una o varias categorías o etiquetas.

Ejemplos:

- temperatura;
- humedad;
- precipitación;
- viento;
- presión;
- radiación;
- UV;
- extremos;
- climatología;
- comparativas;
- episodios;
- calidad de datos.

No se recomienda limitar una estadística a una sola categoría, ya que puede contener varias variables.

---

7. Visibilidad

La visibilidad determina quién puede consultar una estadística.

Se propone inicialmente el siguiente catálogo:

- "PRIVADA"
- "REGISTRADOS"
- "PUBLICA"

7.1. Privada

Solo podrá consultarla su propietario y los administradores autorizados.

7.2. Registrados

Podrá ser consultada por usuarios autenticados.

7.3. Pública

Podrá consultarla cualquier visitante, aunque no disponga de cuenta.

La decisión definitiva sobre qué partes del catálogo serán accesibles públicamente y cuáles requerirán registro queda abierta para una fase posterior.

---

8. Publicación en catálogo

La visibilidad y la publicación en catálogo serán conceptos diferentes.

Que una estadística sea pública no implica necesariamente que MeteoArchidona quiera mostrarla en el catálogo general.

Se propone un estado de catálogo independiente.

Valores iniciales:

- "NO_CATALOGADA"
- "PENDIENTE_REVISION"
- "PUBLICADA"
- "RECHAZADA"
- "RETIRADA"

También podrá existir una propiedad:

"DESTACADA = sí/no"

para permitir que determinadas estadísticas oficiales aparezcan de manera preferente.

Una estadística creada dinámicamente por un administrador, o eventualmente por un usuario, podrá convertirse posteriormente en una estadística del catálogo sin necesidad de programarla expresamente de nuevo.

---

9. Catálogo de estadísticas

La pestaña pública o privada de Estadísticas deberá poder ofrecer un catálogo de definiciones disponibles.

La interfaz concreta se decidirá durante el desarrollo.

Podrá utilizar:

- desplegables;
- categorías;
- buscador;
- tarjetas;
- favoritos;
- filtros;
- estadísticas destacadas.

El catálogo podría contener, por ejemplo:

- evolución diaria de temperatura;
- precipitación mensual;
- máximas y mínimas;
- rachas máximas;
- comparativa entre estaciones;
- estadísticas de episodios;
- récords meteorológicos.

---

10. Suscripción desde el catálogo

Una estadística del catálogo no deberá limitarse a poder ser consultada.

Desde la propia visualización de la estadística deberá existir una acción equivalente a:

Recibir esta estadística

o:

Suscribirme

El nombre concreto de la acción se decidirá posteriormente.

Cuando un usuario consulte una estadística del catálogo y le resulte útil, podrá crear directamente desde esa vista una suscripción asociada a la estadística.

La estadística no se duplicará.

Se reutilizará la definición existente y se creará una relación de suscripción entre:

- usuario;
- estadística;
- canal;
- periodicidad o condición;
- configuración específica de entrega.

Una misma estadística podrá tener numerosos usuarios suscritos, cada uno con su propia configuración.

---

11. Estadística y suscripción son conceptos independientes

La definición de una estadística no deberá contener directamente datos como el correo del destinatario.

Debe existir una separación clara entre:

Qué calcular

y:

Cuándo, cómo y a quién entregarlo

Por tanto:

- Estadísticas define el contenido.
- El subsistema de usuarios/notificaciones define la entrega.

Una estadística podrá:

- consultarse manualmente;
- enviarse una sola vez;
- enviarse periódicamente;
- enviarse al cierre de un período;
- enviarse al finalizar un episodio;
- enviarse cuando se cumpla una condición;
- utilizarse como contenido de una notificación.

---

12. Modalidades de entrega

Las reglas de entrega asociadas a una estadística podrán contemplar en el futuro:

12.1. Entrega puntual

Ejemplo:

"Envíame por correo las estadísticas del episodio de lluvia del 3 al 6 de noviembre."

12.2. Entrega periódica

Ejemplos:

- cada día;
- cada semana;
- cada mes;
- cada año.

12.3. Entrega por cierre de período

Ejemplo:

"Envíame la estadística mensual cuando termine cada mes."

12.4. Entrega por acontecimiento

Ejemplo:

"Envíame un resumen cuando termine un episodio de precipitación."

12.5. Entrega condicionada

Ejemplo:

"Envíame esta estadística cuando se supere un determinado umbral."

Todas estas opciones deberán integrarse con las preferencias, autorizaciones y mecanismos de baja definidos para las notificaciones de usuarios.

---

13. Modelo conceptual de la cabecera

La siguiente relación define el catálogo funcional inicial de propiedades de la cabecera.

Campo conceptual| Contenido o valores
Identificador| Identificador único
Nombre| Texto
Descripción| Texto opcional
Propietario| Sistema, administrador o usuario
Origen| SISTEMA, ADMINISTRADOR, USUARIO
Estado| BORRADOR, ACTIVA, ARCHIVADA
Visibilidad| PRIVADA, REGISTRADOS, PUBLICA
Estado de catálogo| NO_CATALOGADA, PENDIENTE_REVISION, PUBLICADA, RECHAZADA, RETIRADA
Destacada| Sí / No
Categorías / etiquetas| Una o varias
Tipo de período| FIJO, RELATIVO, SELECCIONABLE, TODO_HISTORICO
Inicio| Fecha/hora cuando corresponda
Fin| Fecha/hora cuando corresponda
Cantidad de período| Valor cuando corresponda
Unidad de período| Minuto, hora, día, semana, mes, trimestre, año
Selector de período| Día, semana, mes, trimestre, año, rango de fechas, rango fecha/hora
Cantidad de agrupación| Número
Unidad de agrupación| Minuto, hora, día, semana, mes, trimestre, año
Filtros globales| Conjunto estructurado de condiciones
Tipo de salida| Gráfico, tabla, gráfico y tabla, indicador, informe
Mostrar leyenda| Sí / No
Posición de leyenda| Automática, superior, inferior, izquierda, derecha

Esta relación es conceptual.

La futura implementación podrá distribuir algunos de estos campos entre distintas estructuras si resulta arquitectónicamente más adecuado.

---

14. Períodos

El período define sobre qué rango temporal trabaja la estadística.

Se contemplan inicialmente los siguientes tipos.

14.1. Período fijo

Fechas concretas definidas dentro de la propia estadística.

Ejemplo:

"01/01/2026 00:00 — 31/12/2026 23:59"

14.2. Período relativo

Se calcula respecto al momento de ejecución.

Ejemplos:

- últimas 24 horas;
- últimos 7 días;
- últimos 30 días;
- últimos 12 meses;
- último año.

14.3. Período seleccionable

La estadística define qué tipo de período puede seleccionar el usuario al ejecutarla.

Ejemplos:

- un día;
- un mes;
- un año;
- un rango libre.

14.4. Todo el histórico

Utiliza toda la información disponible compatible con las series seleccionadas.

---

15. Agrupación temporal

La agrupación define cómo se condensan temporalmente las observaciones.

No se utilizará una lista global rígida basada en una única frecuencia de adquisición.

MeteoArchidona puede disponer de estaciones con distintas cadencias.

Actualmente existen fuentes capaces de proporcionar información cada minuto, pero otras estaciones presentes o futuras pueden utilizar otras frecuencias.

Por tanto, la agrupación deberá definirse conceptualmente mediante:

cantidad + unidad

Ejemplos:

"1 minuto"

"5 minutos"

"10 minutos"

"15 minutos"

"30 minutos"

"45 minutos"

"1 hora"

"2 horas"

"1 día"

"1 mes"

La interfaz podrá ofrecer un catálogo amigable, pero internamente la definición deberá ser flexible.

---

16. Resolución temporal dependiente de la estación

No existirá una resolución temporal mínima universal para todo MeteoArchidona.

La resolución real dependerá de:

- proveedor;
- estación;
- configuración aplicada;
- frecuencia con la que se recuperan los datos;
- frecuencia con la que se persisten.

Una estación puede admitir técnicamente diferentes frecuencias pero estar configurada para utilizar una concreta.

Debe diferenciarse entre:

16.1. Intervalos soportados

Frecuencias que permite el dispositivo o proveedor.

Por ejemplo, una estación podría permitir:

- 1 minuto;
- 5 minutos;
- 10 minutos;
- 15 minutos.

16.2. Intervalo efectivo configurado

Frecuencia real utilizada por MeteoArchidona para esa estación.

Ejemplo:

Aunque una estación permita 1 minuto, podría configurarse a 15 minutos para reducir consumo energético y aumentar la autonomía.

El motor estadístico deberá utilizar la cadencia efectiva real, no únicamente la máxima capacidad teórica del equipo.

---

17. Cadencia como propiedad de la estación

El intervalo efectivo no debe ser una propiedad exclusiva del subsistema de estadísticas.

Deberá persistirse en la definición de la estación.

Queda pendiente una futura revisión del modelo de estaciones para incorporar una propiedad equivalente a:

"intervalo_medicion"

"cadencia_datos"

o denominación definitiva que se decida durante la implementación.

El concepto será:

frecuencia efectiva con la que se espera obtener y persistir observaciones de esa estación.

---

18. Uso de la cadencia por el worker

La cadencia de estación deberá ser reutilizada por el worker de adquisición.

Actualmente el proceso de adquisición de estaciones parte de una consulta previa a la tabla de estaciones y procesa las estaciones mediante un bucle.

Por tanto, la frecuencia no debería quedar codificada mediante reglas específicas del tipo:

"WeatherLink = cada minuto"

La lógica deberá evolucionar conceptualmente hacia:

1. consultar estaciones activas;
2. recuperar la configuración de cada estación;
3. recuperar su cadencia;
4. determinar si corresponde ejecutar esa estación en el instante actual;
5. realizar la consulta al proveedor cuando corresponda;
6. persistir la observación.

Así podrán convivir, por ejemplo:

- una estación cada minuto;
- otra cada 5 minutos;
- otra cada 15 minutos;
- futuras estaciones con otras frecuencias.

Este patrón es coherente con otros trabajos de adquisición temporal realizados en MeteoArchidona para radar, rayos o satélite.

---

19. Reutilización de la cadencia

La cadencia de una estación podrá ser utilizada por varios subsistemas:

- adquisición de datos;
- estadísticas;
- control de calidad;
- detección de huecos;
- cálculo de disponibilidad;
- diagnóstico;
- auditoría de pérdida de observaciones.

Por tanto, debe considerarse un metadato estructural de la estación.

---

20. Compatibilidad temporal entre varias series

Una estadística puede combinar estaciones con diferentes resoluciones.

Ejemplo:

- Serie A: datos cada 1 minuto.
- Serie B: datos cada 5 minutos.

La estadística deberá utilizar una escala temporal compatible con todas las series cuando se pretenda una comparación homogénea.

No deberá ofrecer como agrupación efectiva común una resolución más fina que la que pueda proporcionar alguna de las fuentes implicadas.

El constructor deberá calcular dinámicamente las agrupaciones permitidas a partir de las capacidades reales de las series seleccionadas.

---

21. Fuente de los datos estadísticos

Las estadísticas deberán calcularse sobre los datos persistidos propios de MeteoArchidona.

No deberán depender de una consulta directa a WeatherLink, Ecowitt u otro proveedor cada vez que se genere una gráfica.

El flujo conceptual será:

Proveedor → adquisición → persistencia MeteoArchidona → estadísticas

Esto garantiza:

- histórico propio;
- independencia del proveedor durante la consulta;
- coherencia entre web y estadísticas;
- reproducibilidad;
- posibilidad de auditoría;
- mayor velocidad;
- disponibilidad de datos aunque el proveedor externo esté temporalmente inaccesible.

La web pública también deberá seguir alimentándose de los datos persistidos propios cuando exista esa arquitectura.

---

22. Modelo conceptual de una serie

Cada serie estadística podrá disponer inicialmente de las siguientes propiedades.

Campo conceptual| Contenido
Identificador| Identificador único
Estadística| Referencia a la cabecera
Orden| Posición de la serie
Nombre / alias| Texto visible
Estación / fuente| Fuente de datos seleccionada
Variable| Variable meteorológica
Operación| Operación estadística
Parámetros de operación| Cuando sean necesarios
Filtros específicos| Condiciones aplicadas únicamente a la serie
Unidad| Unidad de presentación
Representación| Línea, barras, área, puntos, etc.
Estilo| Continuo, discontinuo, punteado, etc.
Relleno| Sí / No
Orientación| Cuando corresponda
Marcadores| Configuración de puntos
Eje| Automático, izquierdo, derecho
Color| Automático o seleccionado
Visible| Sí / No

---

23. Catálogo inicial de variables meteorológicas

El catálogo real deberá obtenerse en función de las capacidades de cada estación.

No todas las estaciones tienen por qué proporcionar todas las variables.

Familias iniciales:

23.1. Temperatura

- temperatura exterior;
- otras temperaturas instrumentales que se decida publicar.

23.2. Humedad

- humedad relativa exterior.

23.3. Presión

- presión atmosférica;
- presión reducida al nivel del mar, cuando esté disponible.

23.4. Viento

- velocidad del viento;
- racha;
- dirección.

23.5. Precipitación

- precipitación acumulada;
- intensidad de precipitación;
- otras magnitudes derivadas relacionadas.

23.6. Radiación

- radiación solar.

23.7. Ultravioleta

- índice UV.

23.8. Variables derivadas

Podrán incorporarse:

- punto de rocío;
- sensación térmica;
- índice de calor;
- otras variables calculadas.

23.9. Variables técnicas

Determinadas estadísticas administrativas podrán utilizar variables como:

- batería;
- calidad de señal;
- disponibilidad;
- estado de sensores;
- porcentaje de observaciones recibidas.

Estas variables podrán restringirse a administradores.

---

24. Catálogo dinámico de variables

El constructor no deberá ofrecer indiscriminadamente todas las variables conocidas por MeteoArchidona.

Cuando se seleccione una estación deberá ofrecer únicamente:

- variables realmente disponibles;
- variables derivadas calculables a partir de sus sensores;
- variables autorizadas para el tipo de usuario.

Esto evita construir estadísticas imposibles.

---

25. Operaciones estadísticas

Se propone el siguiente catálogo inicial.

- "VALOR"
- "MEDIA"
- "MINIMO"
- "MAXIMO"
- "SUMA"
- "RECUENTO"
- "MEDIANA"
- "PERCENTIL"
- "DESVIACION_ESTANDAR"
- "RANGO"
- "PRIMERO"
- "ULTIMO"
- "VARIACION"
- "MEDIA_CIRCULAR"
- "DIRECCION_DOMINANTE"

El catálogo podrá ampliarse durante el diseño detallado.

---

26. Compatibilidad entre variable y operación

No todas las operaciones tienen sentido para todas las variables.

Ejemplos:

La operación "SUMA" es adecuada para precipitación acumulada, pero no para sumar temperaturas.

La dirección del viento no debe calcularse mediante una media aritmética ordinaria.

Por tanto, deberá existir un catálogo o sistema de reglas del tipo:

variable → operaciones permitidas

El constructor deberá utilizar estas reglas para impedir configuraciones inválidas.

---

27. Filtros

Los filtros podrán aplicarse:

- globalmente a toda la estadística;
- específicamente a una serie.

El catálogo inicial de operadores será:

- "IGUAL"
- "DISTINTO"
- "MAYOR_QUE"
- "MAYOR_O_IGUAL"
- "MENOR_QUE"
- "MENOR_O_IGUAL"
- "ENTRE"
- "EN"
- "NO_EN"
- "ES_NULO"
- "NO_ES_NULO"

Las condiciones podrán combinarse mediante:

- "Y"
- "O"

Ejemplo:

"temperatura >= 35 °C"

Y:

"hora entre 12:00 y 20:00"

---

28. Representación por serie

La representación gráfica no será exclusivamente una propiedad global de la estadística.

Cada serie podrá decidir de forma independiente cómo debe representarse.

Esto permitirá construir gráficos combinados.

Ejemplo:

- Serie 1: temperatura de El Silo mediante línea continua.
- Serie 2: temperatura de Los Llanos mediante línea punteada.
- Serie 3: precipitación mediante columnas verticales.

Todas podrán aparecer dentro de la misma estadística.

---

29. Tipos iniciales de representación

El catálogo se definirá definitivamente cuando se diseñe la interfaz gráfica.

Como mínimo se contemplan conceptualmente:

- línea;
- área;
- barras;
- puntos;
- escalones.

Podrán existir otros tipos cuando se justifiquen.

---

30. Estilos de línea

Para series de línea se podrán ofrecer inicialmente:

- continua;
- discontinua;
- punteada;
- guion-punto.

También podrán configurarse posteriormente:

- grosor;
- marcadores;
- transparencia;
- relleno.

---

31. Áreas

Una línea podrá disponer de área rellena bajo la curva cuando la representación lo permita.

Ejemplo:

Evolución diaria de temperatura

- temperatura exterior;
- media horaria;
- línea continua;
- área rellena.

---

32. Barras

Las barras podrán representarse:

- verticalmente;
- horizontalmente.

Ejemplo:

Racha máxima mensual de 2026

Cada mes se representa mediante una barra vertical.

---

33. Ejes

Cada serie deberá poder asignarse a un eje.

Valores conceptuales:

- "AUTO"
- "IZQUIERDO"
- "DERECHO"

Esto es especialmente importante cuando una estadística mezcla magnitudes con unidades distintas.

Ejemplo:

- temperatura en °C → eje izquierdo;
- humedad en % → eje derecho.

---

34. Ejemplo: temperatura y humedad

Cabecera:

Nombre: Evolución diaria de temperatura y humedad

Período: día seleccionado

Agrupación: 1 hora

Salida: gráfico

Serie 1:

- estación: El Silo;
- variable: temperatura exterior;
- operación: media;
- representación: línea;
- estilo: continua;
- área: rellena;
- eje: izquierdo.

Serie 2:

- estación: El Silo;
- variable: humedad exterior;
- operación: media;
- representación: línea;
- estilo: punteada;
- eje: derecho.

Este ejemplo demuestra que la variable y la representación deben definirse a nivel de serie.

---

35. Conservación del instante del extremo

Una operación de máximo o mínimo no deberá devolver únicamente el valor calculado.

Cuando sea posible deberá conservar también la observación que originó el resultado.

Ejemplo:

- máximo: 87 km/h;
- fecha/hora: 17/01/2026 16:42.

Esto permitirá mostrar:

- valor máximo;
- día;
- hora;
- estación;
- observación original.

Esta información será especialmente útil para:

- temperaturas máximas;
- temperaturas mínimas;
- rachas máximas;
- intensidad máxima de precipitación;
- presión máxima o mínima;
- otros extremos meteorológicos.

---

36. Empates en extremos

Cuando un mismo extremo se haya producido varias veces, no deberá descartarse arbitrariamente una de las ocurrencias.

El motor deberá poder conservar todas las observaciones empatadas.

Ejemplo:

Racha máxima mensual:

"82 km/h"

registrada:

- 3 de marzo;
- 21 de marzo.

La forma exacta de presentación se decidirá posteriormente.

---

37. Ejemplo: racha máxima mensual de 2026

Definición conceptual:

Cabecera

Nombre: Racha máxima mensual 2026

Descripción: Racha máxima registrada durante cada mes de 2026 mostrando la fecha en la que se produjo.

Período: fijo.

Inicio: 01/01/2026 00:00.

Fin: 31/12/2026 23:59.

Agrupación: 1 mes.

Salida: gráfico.

Serie

Variable: racha de viento.

Operación: máximo.

Representación: barras.

Orientación: vertical.

Eje X: mes.

Eje Y: racha.

Mostrar valor: sí.

Mostrar fecha del extremo: sí.

Precisión temporal mostrada: día.

El resultado tendrá una columna por mes y podrá mostrar, por ejemplo:

"Enero — 87 km/h — 17/01/2026"

Los valores reales procederán de la base de datos.

---

38. Resultados con metadatos asociados

El resultado de una operación estadística no siempre será simplemente un número.

Podrá contener información adicional.

Ejemplo conceptual:

"valor = 87 km/h"

"fecha_hora_origen = 17/01/2026 16:42"

"estacion = El Silo"

Esto deberá tenerse presente en el diseño futuro del motor y de sus esquemas de respuesta.

---

39. Ventanas temporales y condiciones sostenidas

El motor deberá permitir análisis que no pueden resolverse únicamente agrupando por día, hora o mes.

Debe contemplarse el concepto de ventana temporal.

Caso de uso real:

Comprobar si durante un episodio de lluvia existió algún intervalo continuo de 60 minutos en el que la intensidad media de precipitación fuese igual o superior a 40 mm/h.

La definición conceptual sería:

- variable: intensidad de precipitación;
- condición: ≥ 40 mm/h;
- duración: 60 minutos;
- período de búsqueda: período seleccionado;
- resultado: intervalos que cumplen la condición.

El motor deberá poder devolver:

- inicio del intervalo;
- fin del intervalo;
- duración;
- valor medio;
- valor máximo si interesa;
- todas las ventanas que cumplan la condición.

---

40. Ventana móvil

Las condiciones de duración deberán poder analizarse mediante ventanas móviles cuando el caso lo requiera.

Esto es diferente de agrupar simplemente:

"10:00–11:00"

"11:00–12:00"

Una condición puede haberse producido entre:

"10:23–11:23"

Por tanto, determinados análisis deberán poder buscar intervalos continuos independientemente de las divisiones convencionales del reloj.

---

41. Uso en consultas relacionadas con seguros

Uno de los usos potenciales del subsistema es proporcionar información técnica sobre episodios meteorológicos que un usuario pueda utilizar como documentación de apoyo.

Ejemplo:

Una póliza podría establecer determinada cobertura cuando se hubiese mantenido una intensidad media de lluvia superior a cierto umbral durante una hora.

MeteoArchidona podría analizar sus datos y generar un informe indicando:

- estación;
- ubicación;
- período;
- variable;
- umbral consultado;
- duración;
- intervalo exacto;
- intensidad media;
- observaciones utilizadas;
- cadencia;
- procedencia de los datos.

---

42. No equivalencia con certificación oficial

MeteoArchidona no deberá presentar estos informes como certificados meteorológicos oficiales salvo que exista realmente una acreditación o fuente oficial que lo permita.

Los informes serán informes técnicos basados en observaciones registradas por MeteoArchidona.

Podrán ser útiles como documentación de apoyo, pero la aceptación por:

- aseguradoras;
- administraciones;
- juzgados;
- terceros;

dependerá de sus propios requisitos.

---

43. Información de calidad de la estación

Cuando exista, un informe podrá incorporar información sobre calidad o validación de la estación.

Por ejemplo:

- estación propia;
- tipo de hardware;
- estado de validación;
- mantenimiento;
- calidad de datos;
- eventual sello o reconocimiento de una red meteorológica.

Si se incorporase una certificación o sello de una red de aficionados, como pueda ser Meteoclimatic, deberá indicarse claramente su naturaleza y no presentarse como certificación meteorológica oficial.

---

44. Salidas del motor estadístico

El subsistema deberá poder producir diferentes formas de salida.

Catálogo conceptual inicial:

- "GRAFICO"
- "TABLA"
- "GRAFICO_Y_TABLA"
- "INDICADOR"
- "INFORME"

44.1. Gráfico

Representación visual mediante una o varias series.

44.2. Tabla

Presentación estructurada de los resultados.

44.3. Gráfico y tabla

Combinación de ambas.

44.4. Indicador

Un resultado destacado.

Ejemplo:

"Racha máxima: 87 km/h"

44.5. Informe

Documento más completo que puede incluir:

- título;
- descripción;
- datos de estación;
- período;
- metodología;
- resultados;
- tablas;
- gráficos;
- fechas de extremos;
- trazabilidad;
- calidad;
- advertencias sobre carácter no oficial.

---

45. Episodios de precipitación

Se adopta el concepto de episodio de precipitación como una unidad temporal especialmente importante para MeteoArchidona.

Un episodio será un período en el que existe actividad de precipitación sin que llegue a transcurrir una ventana completa de 24 horas sin lluvia.

Mientras no se produzcan 24 horas completas sin precipitación, el episodio permanecerá abierto.

Ejemplo:

Si durante siete días va lloviendo de forma intermitente y nunca pasan 24 horas completas sin lluvia, los siete días formarán un único episodio.

---

46. Diferencia entre episodio y tormenta

Durante el análisis inicial se consideró también el concepto de tormenta entendido como período de lluvia continua.

No se utiliza aquí el término tormenta necesariamente en sentido eléctrico.

Sin embargo, este concepto se considera actualmente menos útil para el subsistema principal.

En la práctica puede ocurrir:

- llueve;
- para media hora;
- vuelve a llover;
- para una hora;
- vuelve a llover.

Dividir este proceso en numerosas tormentas generaría una fragmentación excesiva.

Por tanto, el concepto prioritario para estadísticas será el episodio.

La posible implementación futura de subperíodos continuos de lluvia queda abierta, pero no constituye actualmente un requisito fundamental.

---

47. Estadísticas de un episodio

Un episodio podrá utilizarse como ámbito temporal de una estadística.

Ejemplos de variables derivadas:

- precipitación total;
- duración del episodio;
- intensidad media;
- intensidad máxima;
- máximo acumulado en una hora;
- máximo acumulado en seis horas;
- máximo acumulado en 24 horas;
- racha máxima durante el episodio;
- temperatura máxima;
- temperatura mínima;
- número de períodos de lluvia;
- distribución temporal de la precipitación.

El usuario podrá consultar directamente:

Episodio del 3 al 8 de noviembre

sin necesidad de introducir manualmente sus fechas si el episodio ha sido identificado por el sistema.

---

48. Notificación al finalizar un episodio

Un usuario podrá suscribirse a estadísticas relacionadas con episodios.

Ejemplo:

"Cuando finalice un episodio de precipitación, envíame su resumen."

El resumen podría incluir:

- inicio;
- fin;
- duración;
- precipitación total;
- intensidad máxima;
- hora de intensidad máxima;
- máximo acumulado horario;
- racha máxima;
- otros indicadores configurados.

La forma definitiva se desarrollará conjuntamente con el subsistema de notificaciones.

---

49. Exclusión de mediciones manuales

MeteoArchidona no incorporará al nuevo subsistema de estadísticas mediciones manuales colaborativas de precipitación.

Históricamente se utilizaron colaboradores que disponían de pluviómetros manuales en casas de campo.

Esta experiencia mostró problemas importantes de calidad.

Entre ellos:

- rebose del recipiente en episodios fuertes;
- imposibilidad de saber cuánto había llovido después del rebose;
- agua residual adherida a las paredes después del vaciado;
- errores acumulados de varios milímetros;
- diferencias excesivas respecto a estaciones correctamente calibradas.

Por tanto, estas mediciones manuales quedan descartadas como fuente del nuevo motor estadístico.

---

50. Fuentes instrumentadas

Las estadísticas meteorológicas deberán basarse en datos procedentes de estaciones y sensores instrumentados cuya calidad sea suficientemente conocida.

La existencia de un sensor automático no será por sí sola suficiente.

También deberá valorarse la calidad real del equipo.

---

51. Estaciones de colaboradores

Una estación de un colaborador no se incorporará automáticamente al sistema por el mero hecho de poder enviar datos.

MeteoArchidona deberá poder valorar previamente su calidad.

Las estaciones domésticas extremadamente básicas o con sensores de precisión insuficiente podrán rechazarse completamente.

Especialmente en precipitación, utilizar un equipo de baja calidad puede falsear acumulados y comparaciones.

---

52. Validación interna de estaciones

No se utilizará necesariamente el término “homologación” en sentido oficial.

MeteoArchidona podrá establecer una validación interna de estación.

Entre los factores que podrían analizarse:

- fabricante y modelo;
- calidad de los sensores;
- especificaciones;
- resolución;
- precisión;
- instalación;
- emplazamiento;
- exposición;
- altura;
- calibración;
- mantenimiento;
- estabilidad;
- disponibilidad;
- coherencia histórica;
- frecuencia de datos;
- comparación razonable con estaciones cercanas.

---

53. Nivel de confianza

La futura definición de estación deberá incorporar un concepto equivalente a:

nivel de confianza

o:

estado de validación

El nombre definitivo se decidirá al revisar el modelo.

Conceptualmente deberá permitir distinguir, como mínimo:

- estación propia;
- estación colaboradora validada;
- estación colaboradora no validada;
- estación rechazada.

Podrá evolucionar hacia un sistema más detallado si se considera útil.

---

54. Uso del nivel de confianza por Estadísticas

El constructor estadístico deberá poder consultar el nivel de confianza de una estación.

Una estación no validada no deberá aparecer automáticamente como fuente disponible para estadísticas públicas.

Podrán existir reglas distintas según:

- estadísticas privadas;
- estadísticas administrativas;
- estadísticas públicas;
- informes;
- comparativas.

---

55. Revisión futura de la tabla de estaciones

Queda expresamente pendiente una revisión futura de la definición persistida de las estaciones.

Esa revisión deberá incorporar al menos:

55.1. Cadencia efectiva

Intervalo real de adquisición/persistencia.

55.2. Nivel de confianza

Estado de validación de la estación y capacidad de participar en determinadas estadísticas.

Estas propiedades son transversales y no deberán duplicarse innecesariamente en Estadísticas.

---

56. Estadísticas preestablecidas sobre el mismo motor

Las estadísticas oficiales de MeteoArchidona deberán utilizar el mismo modelo de definición y series.

El flujo deseado será:

constructor dinámico → guardar definición → validar → publicar en catálogo

Esto permitirá crear nuevas estadísticas oficiales sin necesidad de programar componentes específicos para cada una.

---

57. Administradores

Los administradores podrán disponer de capacidades superiores.

Entre ellas:

- construir estadísticas;
- guardar definiciones;
- editar estadísticas oficiales;
- revisar estadísticas;
- publicar en catálogo;
- retirar estadísticas;
- utilizar variables técnicas;
- consultar estaciones no públicas;
- realizar estadísticas de diagnóstico;
- utilizar indicadores de calidad;
- crear informes internos.

---

58. Usuarios registrados

Los usuarios registrados podrán, según permisos que se definan:

- construir estadísticas;
- guardarlas;
- consultarlas nuevamente;
- modificar sus estadísticas;
- suscribirse a estadísticas del catálogo;
- configurar entregas;
- recibir resultados;
- exportar determinados resultados;
- consultar sus estadísticas privadas.

---

59. Usuarios no registrados

Queda pendiente decidir qué parte exacta del catálogo podrán consultar los visitantes sin cuenta.

La arquitectura permite diferenciar:

- contenido completamente público;
- contenido reservado a registrados;
- estadísticas privadas.

---

60. Mis estadísticas

Los usuarios registrados podrán disponer en el futuro de una sección equivalente a:

Mis estadísticas

En ella podrán consultar las definiciones que hayan guardado.

Se guardará preferentemente la definición, no una copia permanente del resultado.

Esto permitirá que una estadística pueda ejecutarse nuevamente sobre datos más recientes.

Ejemplo:

Calor extremo últimos cinco años

La definición permanece.

El resultado puede evolucionar conforme se incorporen nuevos datos.

---

61. Estadísticas reutilizables

Una estadística guardada podrá utilizarse para:

- ejecutarla manualmente;
- modificarla;
- duplicarla;
- utilizarla como base de otra;
- suscribirse;
- publicarla si existen permisos;
- generar informes;
- utilizarla dentro de futuros paneles.

---

62. Posible concepto futuro de panel

Aunque no forma parte del alcance inmediato, se identifica un posible concepto futuro:

Panel estadístico

Un panel podría agrupar varias estadísticas.

Ejemplo:

Seguimiento de sequía

podría contener:

- precipitación acumulada;
- días de lluvia;
- comparación interanual;
- humedad media;
- temperatura media.

El panel no sustituirá a la estadística.

Será una agrupación superior de varias estadísticas.

---

63. Reglas dinámicas del constructor

El constructor no deberá presentar todas las opciones posibles simultáneamente.

Las opciones deberán adaptarse a las decisiones anteriores.

Ejemplo:

1. usuario selecciona estación;
2. se recuperan variables disponibles;
3. selecciona variable;
4. se muestran operaciones compatibles;
5. se consulta la cadencia de la estación;
6. se muestran agrupaciones compatibles;
7. se ofrecen representaciones compatibles;
8. se validan filtros.

Por tanto, el constructor será dinámico.

---

64. Validación antes de ejecutar

Antes de ejecutar una estadística, el sistema deberá comprobar:

- que todas las estaciones existen;
- que son accesibles para el usuario;
- que las variables existen;
- que las operaciones son válidas;
- que la agrupación es compatible;
- que el período es correcto;
- que los filtros tienen sentido;
- que la representación es compatible;
- que la resolución temporal es suficiente;
- que las estaciones cumplen los requisitos de confianza cuando corresponda.

---

65. No exposición de SQL

Los usuarios nunca construirán consultas SQL.

El constructor deberá trabajar con catálogos y reglas declarativas.

Esto permite:

- seguridad;
- control;
- validación;
- evolución de la base de datos;
- independencia respecto al motor SQL;
- impedir consultas excesivamente costosas;
- mantener una experiencia comprensible.

---

66. Ejemplo conceptual completo

Estadística:

Nombre: Evolución meteorológica diaria

Período: día seleccionable

Agrupación: 1 hora

Salida: gráfico

Serie 1:

- estación: El Silo;
- variable: temperatura;
- operación: media;
- representación: línea continua;
- área rellena;
- eje izquierdo.

Serie 2:

- estación: El Silo;
- variable: humedad;
- operación: media;
- representación: línea punteada;
- eje derecho.

Serie 3:

- estación: El Silo;
- variable: precipitación;
- operación: suma;
- representación: barras verticales;
- eje compatible.

Esta estructura muestra por qué la representación debe pertenecer fundamentalmente a las series.

---

67. Estadísticas derivadas

El motor deberá poder evolucionar hacia conceptos meteorológicos más complejos que no correspondan directamente a una columna persistida.

Ejemplos:

- días de helada;
- noches tropicales;
- días tropicales;
- días muy cálidos;
- olas de calor;
- episodios de precipitación;
- horas con determinada intensidad;
- persistencia del viento;
- acumulados móviles;
- duración de condiciones extremas.

Estas reglas deberán implementarse de forma controlada y documentada.

---

68. Trazabilidad

Toda estadística importante deberá poder explicar de dónde procede su resultado.

Especialmente en informes y análisis de extremos deberá poder conservarse:

- estación;
- variable;
- período;
- agrupación;
- operación;
- filtros;
- observaciones de origen cuando sea necesario;
- instante del extremo;
- cadencia;
- calidad de la fuente.

La trazabilidad será especialmente importante para usos técnicos o documentales.

---

69. Separación entre datos y representación

El motor estadístico deberá separar conceptualmente:

obtención/cálculo de datos

de:

representación

Una misma serie calculada podría utilizarse posteriormente en:

- gráfico;
- tabla;
- indicador;
- correo;
- informe.

Esto evita recalcular la lógica estadística específicamente para cada formato de salida.

---

70. Separación entre estadística y distribución

También deberá mantenerse separada:

la definición estadística

de:

la regla de distribución

La misma estadística podrá:

- consultarse en web;
- recibirse mensualmente;
- recibirse al finalizar un episodio;
- utilizarse en un informe;
- formar parte de una notificación.

---

71. Integración futura con notificaciones

El subsistema de Estadísticas deberá poder proporcionar resultados al sistema de notificaciones de usuarios.

No deberá implementar por sí mismo toda la lógica de correo.

La integración deberá permitir un flujo similar a:

usuario → estadística → suscripción → regla de entrega → notificación

Los consentimientos, preferencias y mecanismos de baja corresponderán al subsistema de usuarios/notificaciones.

---

72. Informes enviados por correo

Una suscripción podrá entregar:

- resumen textual;
- tabla;
- gráfico;
- informe adjunto o enlazado;
- combinación de varios formatos.

La solución concreta se definirá posteriormente.

---

73. Ejemplo de resumen de episodio

Un posible resultado podría contener:

Episodio de precipitación

Inicio: 3 de noviembre, 08:15

Fin: 7 de noviembre, 21:32

Precipitación total: 63,4 mm

Duración: 4 días

Intensidad máxima: 28,7 mm/h

Hora de intensidad máxima: 18:42

Máximo acumulado en una hora: 19,6 mm

Racha máxima durante el episodio: 71 km/h

Los valores anteriores son únicamente ilustrativos.

---

74. Principios funcionales consolidados

A fecha de este documento quedan establecidos los siguientes principios:

1. MeteoArchidona tendrá un motor estadístico común.
2. Existirán estadísticas preestablecidas y estadísticas dinámicas.
3. Una estadística estará formada por una cabecera y una o varias series.
4. La variable meteorológica pertenece fundamentalmente a la serie.
5. La estación pertenece fundamentalmente a la serie.
6. La operación estadística pertenece fundamentalmente a la serie.
7. La representación podrá configurarse independientemente por serie.
8. Una misma gráfica podrá combinar diferentes tipos de representación.
9. El período y la agrupación podrán definirse de forma común cuando proceda.
10. Los filtros podrán existir a nivel global y a nivel de serie.
11. La resolución temporal dependerá de la cadencia real de cada estación.
12. No existirá una resolución universal fija para todas las fuentes.
13. La cadencia efectiva deberá persistirse en la definición de estación.
14. El worker deberá utilizar esa cadencia para decidir cuándo consultar cada estación.
15. El motor estadístico deberá utilizar datos persistidos propios de MeteoArchidona.
16. Las opciones del constructor deberán ser dinámicas.
17. Los máximos y mínimos deberán poder conservar la fecha/hora que produjo el resultado.
18. Los empates deberán poder conservar varias ocurrencias.
19. Deberán soportarse ventanas temporales y condiciones mantenidas.
20. Podrán generarse informes técnicos.
21. Esos informes no se presentarán como certificaciones oficiales cuando no lo sean.
22. El episodio de precipitación será un concepto temporal propio.
23. Un episodio permanece abierto mientras no existan 24 horas completas sin lluvia.
24. El concepto de tormenta continua queda relegado respecto al concepto de episodio.
25. No se utilizarán aportaciones manuales de precipitación en el motor estadístico.
26. Las estaciones colaboradoras deberán superar criterios de calidad.
27. La futura tabla de estaciones deberá incorporar un nivel de confianza o validación.
28. Una estadística podrá tener visibilidad privada, restringida o pública.
29. Visibilidad y publicación en catálogo serán conceptos diferentes.
30. Una estadística del catálogo podrá ser objeto de suscripción.
31. Desde la propia vista de una estadística catalogada el usuario podrá solicitar recibirla.
32. La suscripción no duplicará la estadística.
33. Una misma estadística podrá tener numerosos suscriptores.
34. La estadística define el contenido y el subsistema de notificaciones define la entrega.
35. Las estadísticas podrán enviarse de forma puntual, periódica, por cierre de período o por condición.

---

75. Trabajos posteriores

Este documento define la primera arquitectura funcional del subsistema.

Antes de comenzar su implementación deberán abordarse posteriormente, entre otros, los siguientes trabajos:

- revisar el catálogo definitivo de variables;
- definir operaciones compatibles con cada variable;
- definir filtros complejos;
- definir el modelo exacto de períodos;
- definir agrupaciones temporales;
- definir reglas de compatibilidad de cadencias;
- definir ventanas móviles;
- definir detección y persistencia de episodios;
- definir tipos y estilos gráficos;
- definir formatos de informes;
- definir suscripciones;
- integrar Estadísticas con usuarios y notificaciones;
- definir permisos;
- diseñar el modelo SQL;
- diseñar esquemas Pydantic;
- diseñar servicios y repositorios;
- diseñar endpoints públicos y privados;
- diseñar el constructor web;
- revisar la tabla de estaciones;
- añadir cadencia efectiva;
- añadir nivel de confianza;
- adaptar posteriormente el worker para utilizar la cadencia configurada.

---

76. Estado

Estado del subsistema: diseño funcional inicial.

Código: no iniciado en esta fase.

Objetivo de esta fase: dejar documentado el modelo antes de implementar.

El presente documento deberá evolucionar conforme se profundice en el diseño, manteniendo las decisiones consolidadas y registrando explícitamente cualquier modificación relevante.

Fin del documento