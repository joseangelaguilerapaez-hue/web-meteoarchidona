# Subsistema de publicidad y patrocinios

## 1. Propósito

Este documento define el diseño funcional previsto para el subsistema de publicidad y patrocinios de MeteoArchidona.

El objetivo es disponer de un sistema propio que permita financiar parcialmente el mantenimiento y evolución de MeteoArchidona mediante publicidad y patrocinio de comercios, profesionales, empresas y entidades, principalmente del entorno local y comarcal.

El sistema debe integrarse de forma natural con la información meteorológica.

La publicidad no debe convertirse en un elemento invasivo ni dificultar la consulta de los datos.

La filosofía general será:

> publicidad local, contextual, útil y visualmente integrada en MeteoArchidona.

El subsistema se diseñará desde el principio para poder evolucionar sin necesidad de reconstruir posteriormente la web pública.


## 2. Estado del subsistema

En el momento de redactar este documento, el subsistema de publicidad todavía no está implementado como sistema completo.

Existe ya una primera representación visual de patrocinio dentro de la web pública, utilizada para estudiar cómo pueden integrarse estos espacios en MeteoArchidona.

El resto de este documento describe el diseño funcional previsto.

Las decisiones técnicas concretas se tomarán durante su futura implementación.


## 3. Principios generales

El subsistema seguirá los siguientes principios:

- integración visual con MeteoArchidona;
- prioridad absoluta de la información meteorológica;
- orientación preferente hacia anunciantes locales y comarcales;
- posibilidad de diferentes tipos y precios de patrocinio;
- reutilización de contenidos publicitarios;
- campañas con vigencia temporal;
- rotación controlada de anunciantes y contenidos;
- posibilidad de espacios exclusivos;
- gestión centralizada;
- futura autonomía parcial del anunciante;
- persistencia de la configuración;
- trazabilidad de campañas;
- posibilidad futura de estadísticas;
- separación entre publicidad, datos meteorológicos y presentación web.


## 4. Concepto de anunciante

Un anunciante representa al comercio, profesional, empresa, asociación o entidad que utiliza los espacios publicitarios de MeteoArchidona.

Cada anunciante tendrá una identidad propia dentro del sistema.

Ejemplos:

- restaurante;
- bar;
- comercio;
- supermercado;
- taller;
- asesoría;
- inmobiliaria;
- empresa de servicios;
- alojamiento;
- establecimiento turístico;
- asociación;
- entidad colaboradora.

El anunciante será independiente de sus campañas.

Un mismo anunciante podrá crear y mantener múltiples campañas a lo largo del tiempo.


## 5. Información del anunciante

El perfil de un anunciante podrá contener, entre otros datos:

- nombre comercial;
- razón social, cuando sea necesaria;
- descripción;
- dirección;
- localidad;
- teléfono;
- correo electrónico;
- página web;
- redes sociales;
- persona de contacto;
- logotipo;
- imagen principal;
- estado activo o inactivo;
- observaciones administrativas.

No todos estos datos tendrán necesariamente carácter público.


## 6. Recursos gráficos del anunciante

El sistema deberá permitir que un anunciante disponga de recursos gráficos propios.

Entre ellos podrán encontrarse:

- logotipo;
- fotografía de la fachada;
- fotografía del establecimiento;
- fotografía del interior;
- fotografías de productos;
- fotografías de servicios;
- imágenes corporativas;
- carteles;
- creatividades publicitarias;
- imágenes específicas de campañas;
- cualquier otro material gráfico autorizado.

Debe distinguirse entre recursos permanentes del anunciante y recursos específicos de una campaña.


## 7. Recursos gráficos permanentes

Los recursos permanentes pertenecen al perfil general del anunciante.

Ejemplos:

- logotipo;
- fotografía principal del negocio;
- fotografía de fachada;
- imagen corporativa.

Estos recursos podrán reutilizarse en distintas campañas.


## 8. Recursos gráficos de campaña

Una campaña podrá disponer además de imágenes propias.

Por ejemplo:

- cartel de Navidad;
- menú especial;
- oferta temporal;
- promoción de verano;
- campaña de rebajas;
- promoción de un producto;
- celebración de un evento;
- creatividad diseñada específicamente para una campaña.

Una imagen específica de una campaña no tendrá por qué formar parte de los recursos permanentes del anunciante.


## 9. Almacenamiento de imágenes

El modelo deberá ser capaz de gestionar contenido gráfico.

Durante la implementación se decidirá el mecanismo definitivo de almacenamiento.

Entre las alternativas se encuentran:

- almacenamiento binario en PostgreSQL;
- almacenamiento externo con referencia desde PostgreSQL;
- una combinación de ambos mecanismos.

Por tanto, no se fija todavía como decisión arquitectónica definitiva que las imágenes deban almacenarse mediante campos binarios.

La base de datos deberá conservar, como mínimo, los metadatos necesarios para identificar, relacionar, activar y administrar cada recurso gráfico.


## 10. Espacio privado del anunciante

Está prevista una futura zona privada para anunciantes.

Cada anunciante podrá disponer de acceso a la información relacionada con su actividad publicitaria.

Esta zona podrá permitir progresivamente:

- consultar su perfil;
- consultar sus campañas;
- crear campañas;
- modificar campañas;
- consultar campañas anteriores;
- seleccionar textos publicitarios;
- crear nuevos textos;
- seleccionar imágenes;
- incorporar nuevos recursos gráficos;
- definir periodos de campaña;
- consultar los espacios contratados;
- consultar el estado de sus campañas;
- consultar futuras estadísticas.

El grado de autonomía del anunciante se decidirá durante la implementación.


## 11. Administración y aprobación

La existencia de una zona privada para anunciantes no implica necesariamente publicación automática.

MeteoArchidona podrá establecer mecanismos de revisión y aprobación.

El espacio administrativo privado permitirá a los responsables de MeteoArchidona controlar:

- anunciantes;
- campañas;
- textos;
- imágenes;
- espacios publicitarios;
- tarifas;
- fechas;
- prioridades;
- exclusividades;
- activación y desactivación;
- publicación;
- estadísticas.

Inicialmente, el control administrativo estará destinado a José y Mario.


## 12. Textos publicitarios

Los textos publicitarios serán elementos independientes y reutilizables.

No se almacenarán únicamente como texto libre dentro de cada campaña.

Se pretende normalizar este contenido mediante un catálogo o diccionario de textos publicitarios.


## 13. Catálogo normalizado de textos

MeteoArchidona proporcionará un catálogo inicial de textos que los anunciantes podrán utilizar en sus campañas.

Ejemplos:

- Reserva tu mesa para este fin de semana.
- Consulta nuestras ofertas actuales.
- Descubre nuestras novedades.
- Visítanos en Archidona.
- Consulta nuestra carta.
- Pregunta por nuestras promociones.
- Te esperamos este fin de semana.
- Descubre nuestros servicios.
- Haz tu reserva.
- Consulta nuestras novedades de temporada.

El catálogo podrá crecer progresivamente.


## 14. Categorías de textos

Los textos podrán clasificarse para facilitar su localización.

Las categorías podrán incluir, entre otras:

- restauración;
- comercio;
- servicios;
- turismo;
- alojamiento;
- promociones;
- descuentos;
- reservas;
- eventos;
- temporada;
- Navidad;
- verano;
- feria;
- mensajes corporativos.

Estas categorías podrán evolucionar posteriormente.


## 15. Textos propios del anunciante

El anunciante no estará limitado al catálogo proporcionado por MeteoArchidona.

Podrá proponer o crear nuevos textos.

Por ejemplo:

> Este domingo, arroz caldoso por encargo.

o:

> Menú especial de feria disponible esta semana.

Estos textos podrán quedar asociados al anunciante que los creó.

En el futuro podrá decidirse si determinados textos pueden incorporarse también al catálogo general de MeteoArchidona.


## 16. Reutilización de textos

Un mismo texto podrá utilizarse en distintas campañas.

Una campaña no necesitará almacenar una copia independiente del texto.

La relación entre campañas y textos permitirá seleccionar qué mensajes participan en cada campaña.


## 17. Histórico y modificación de textos

Debe preservarse la coherencia histórica de las campañas.

Un texto utilizado anteriormente no debería modificarse de manera que cambie el significado de campañas ya finalizadas.

Cuando sea necesario realizar una modificación sustancial, podrá crearse una nueva versión o un nuevo texto.

Este criterio facilitará posteriormente:

- auditoría;
- estadísticas;
- histórico;
- comparación de campañas.


## 18. Campañas

La campaña será una de las entidades centrales del subsistema.

Cada anunciante podrá crear tantas campañas como sea necesario.

Una campaña representa una acción publicitaria concreta durante un determinado periodo.


## 19. Información de una campaña

Una campaña podrá contener como mínimo:

- identificador;
- anunciante;
- nombre;
- descripción;
- fecha de inicio;
- fecha de finalización;
- estado;
- textos seleccionados;
- recursos gráficos seleccionados;
- espacios publicitarios asociados;
- modalidad de publicación;
- prioridad;
- observaciones internas.

La descripción tendrá especial importancia para explicar el objetivo de la campaña.


## 20. Descripción de campaña

La descripción de una campaña será distinta de los textos que se muestran públicamente.

Por ejemplo:

**Nombre**

Campaña septiembre 2026

**Descripción**

Promoción de los menús de septiembre y captación de reservas durante los fines de semana.

Los textos publicitarios asociados serían elementos diferentes.


## 21. Vigencia de las campañas

Cada campaña podrá tener:

- fecha de inicio;
- fecha de finalización.

Una campaña solamente podrá participar en la publicación cuando:

1. esté activa;
2. haya comenzado su periodo de vigencia;
3. no haya finalizado su periodo de vigencia;
4. disponga de los elementos necesarios para mostrarse;
5. tenga autorización para utilizar el espacio correspondiente.

Una campaña finalizada permanecerá almacenada como histórico.


## 22. Estados de campaña

El modelo podrá contemplar estados como:

- borrador;
- pendiente de aprobación;
- programada;
- activa;
- pausada;
- finalizada;
- cancelada.

La lista definitiva se determinará durante la implementación.


## 23. Selección de textos para una campaña

Al crear una campaña, el anunciante podrá seleccionar los textos que desea utilizar.

Podrá seleccionar:

- textos del catálogo general;
- textos propios previamente creados;
- nuevos textos creados específicamente para esa campaña.

Una campaña podrá contener múltiples textos simultáneamente.


## 24. Rotación de textos

Cuando una campaña contenga varios textos, MeteoArchidona podrá alternarlos automáticamente.

La selección no debe limitarse necesariamente a un `random` completamente uniforme.

El sistema deberá permitir una rotación controlada.


## 25. Rotación aleatoria controlada

La rotación podrá considerar:

- selección aleatoria;
- reparto equilibrado;
- prioridad;
- peso;
- número de apariciones;
- prevención de repeticiones consecutivas;
- condiciones específicas de una campaña.

Por ejemplo, una campaña con cinco textos podrá mostrar diferentes mensajes a distintos visitantes sin que sea necesario crear cinco campañas.


## 26. Peso de los textos

En una evolución posterior podrá asignarse un peso a cada texto dentro de una campaña.

Ejemplo:

- texto A: peso 50;
- texto B: peso 20;
- texto C: peso 20;
- texto D: peso 10.

Esto permitirá que determinados mensajes tengan mayor presencia sin eliminar la variedad.


## 27. Espacios publicitarios

La página de MeteoArchidona podrá disponer de distintos espacios patrocinables.

No todos tendrán el mismo valor comercial.

Los espacios estarán vinculados al contexto meteorológico o a determinadas áreas de la web.


## 28. Ejemplos de espacios patrocinables

Entre los posibles espacios se encuentran:

- lluvia en vivo;
- temperatura;
- viento;
- presión atmosférica;
- radiación solar;
- índice UV;
- históricos;
- gráficos;
- cámaras;
- alertas;
- páginas de estaciones;
- páginas específicas;
- cabeceras o pies de determinadas secciones.

La lista podrá crecer conforme evolucione MeteoArchidona.


## 29. Publicidad contextual

Siempre que sea posible, la publicidad se integrará con el contenido que acompaña.

Por ejemplo:

> LLUVIA EN VIVO

> Datos de lluvia en vivo patrocinados por...

Esto permite que la publicidad se perciba como patrocinio del servicio meteorológico y no como un banner genérico ajeno a la página.


## 30. Espacio actual de lluvia

Como primera demostración visual se ha estudiado un espacio situado junto a la información de lluvia de las estaciones.

El concepto utilizado es:

**LLUVIA EN VIVO**

seguido de un mensaje de patrocinio.

Para la demostración se han utilizado nombres como:

- Restaurante San Isidro;
- Bar Central;
- Las Viñas;
- Gestión 95.

Estos nombres sirven actualmente para visualizar el concepto.

Su presencia en una demostración no implica necesariamente la existencia de una campaña comercial contratada.


## 31. Patrocinadores múltiples

Un mismo espacio podrá estar patrocinado por varios anunciantes.

En ese caso podrán utilizarse diferentes mecanismos de rotación.

Por ejemplo:

- reparto equitativo;
- reparto ponderado;
- prioridad por tarifa;
- campañas temporales;
- presencia exclusiva durante determinados periodos.


## 32. Rotación de anunciantes

La rotación de anunciantes no debe provocar una experiencia visual molesta.

Como principio inicial, no se pretende cambiar continuamente el patrocinador cada vez que se actualicen los datos meteorológicos.

La actualización meteorológica y la rotación publicitaria serán conceptos independientes.

Podrá elegirse un patrocinador al cargar una página y mantenerlo durante la sesión o durante un intervalo razonable.

La estrategia definitiva se definirá durante la implementación.


## 33. Publicidad fija o exclusiva

Un anunciante podrá contratar, si el modelo comercial lo contempla, una presencia fija o exclusiva.

Esto significa que durante un determinado periodo un espacio concreto podrá quedar reservado para una campaña.

La exclusividad tendrá un valor superior a una participación dentro de una rotación.


## 34. Publicidad gráfica

Además de las pequeñas bandas de patrocinio, MeteoArchidona podrá disponer de espacios publicitarios gráficos.

Estos espacios podrán mostrar:

- imagen;
- fotografía;
- logotipo;
- texto;
- llamada a la acción;
- enlace.

Podrán situarse, por ejemplo:

- al final de una sección;
- entre bloques de información;
- debajo de gráficos;
- junto a cámaras;
- en páginas específicas.

Su posición deberá diseñarse siempre sin perjudicar la lectura de la información meteorológica.


## 35. Regla de prioridad meteorológica

La información meteorológica es el producto principal de MeteoArchidona.

Por tanto:

> ningún anuncio deberá ocultar, desplazar de forma perjudicial o dificultar el acceso a información meteorológica esencial.

La publicidad ocupará espacios específicamente diseñados para ella.


## 36. Modalidades comerciales

El sistema deberá permitir diferentes modalidades de contratación.

Como orientación inicial podrán existir:

- patrocinio básico;
- patrocinio destacado;
- patrocinio premium;
- patrocinio exclusivo.

Estos nombres no constituyen todavía una tarifa comercial definitiva.


## 37. Patrocinio básico

Podrá corresponder a:

- presencia dentro de una rotación;
- formato principalmente textual;
- espacios de menor demanda;
- frecuencia estándar.


## 38. Patrocinio destacado

Podrá incorporar:

- mayor peso dentro de una rotación;
- logotipo;
- mayor presencia;
- utilización de determinados espacios destacados.


## 39. Patrocinio premium

Podrá asociarse a:

- espacios meteorológicos de especial interés;
- presencia gráfica;
- campañas con mayor visibilidad;
- cámaras;
- lluvia;
- alertas u otros servicios de elevada consulta.


## 40. Patrocinio exclusivo

Representará el nivel de mayor presencia.

Podrá permitir que un anunciante ocupe en exclusiva un determinado espacio durante un periodo contratado.

Su tarifa será superior debido a que impide la participación simultánea de otros anunciantes en ese espacio.


## 41. Tarifas

Las tarifas deberán ser configurables.

No se fijan todavía importes económicos definitivos en este documento.

El precio podrá depender de factores como:

- espacio;
- duración;
- modalidad;
- exclusividad;
- presencia gráfica;
- peso dentro de la rotación;
- número de secciones;
- temporada;
- demanda;
- características especiales de la campaña.


## 42. Diferente valor de los espacios

No todos los espacios tendrán necesariamente el mismo precio.

Por ejemplo, determinadas secciones pueden adquirir un valor comercial superior por su interés para los usuarios.

La lluvia puede convertirse en uno de los espacios de mayor interés.

Las cámaras también podrán constituir espacios de especial valor.

Otros espacios podrán ofrecer tarifas inferiores.

La clasificación definitiva deberá basarse en la utilización real de MeteoArchidona.


## 43. Tarifas configurables y no codificadas

Las tarifas no deberán quedar codificadas permanentemente en el HTML de la web.

Deberán formar parte del modelo administrable del subsistema.

Esto permitirá modificar precios y modalidades sin cambiar el código de la página pública.


## 44. Relación entre campaña y espacio

Una campaña podrá estar asociada a uno o varios espacios publicitarios.

Asimismo, un espacio podrá recibir diferentes campañas cuando no exista exclusividad.

Esta relación permitirá determinar:

- qué campaña puede mostrarse;
- dónde puede mostrarse;
- durante qué periodo;
- con qué prioridad;
- bajo qué modalidad comercial.


## 45. Relación conceptual del subsistema

A nivel funcional, el sistema puede entenderse mediante las siguientes relaciones:

**Anunciante → Textos publicitarios**

**Anunciante → Recursos gráficos**

**Anunciante → Campañas**

**Campaña → Selección de textos**

**Campaña → Selección de recursos gráficos**

**Campaña → Espacios publicitarios**

**Espacio publicitario → Reglas de publicación**

**Campaña + espacio → condiciones comerciales y de rotación**


## 46. Persistencia

La configuración del subsistema deberá persistirse.

La base de datos PostgreSQL de MeteoArchidona será responsable de conservar la información estructurada del sistema.

Entre otras cosas:

- anunciantes;
- campañas;
- textos;
- relaciones campaña-texto;
- recursos gráficos o sus referencias;
- espacios;
- tarifas;
- relaciones entre campañas y espacios;
- estados;
- fechas;
- prioridades;
- configuración de rotación;
- estadísticas futuras.


## 47. Separación entre web y configuración

La web pública no deberá contener permanentemente codificada la configuración comercial.

Por ejemplo, no debe ser necesario modificar `index.html` cada vez que:

- entre un nuevo anunciante;
- termine una campaña;
- cambie una oferta;
- cambie una tarifa;
- se añada un texto;
- se sustituya una imagen.

La configuración deberá proceder del subsistema de publicidad.


## 48. API de publicidad

Cuando el subsistema sea implementado, la web pública deberá obtener la información publicitaria mediante la API propia de MeteoArchidona.

El flujo conceptual será:

**PostgreSQL → servicios de publicidad → API MeteoArchidona → web pública**

La web solicitará el contenido que corresponda a cada espacio.

No deberá conocer las reglas internas necesarias para seleccionar una campaña.


## 49. Responsabilidad del backend

Será responsabilidad del backend determinar, entre otras cosas:

- campañas vigentes;
- campañas autorizadas;
- anunciantes activos;
- espacios disponibles;
- exclusividades;
- pesos;
- prioridades;
- textos disponibles;
- imágenes disponibles;
- contenido que corresponde mostrar.

La web se limitará principalmente a representar el resultado.


## 50. Separación respecto al subsistema meteorológico

La publicidad será un subsistema independiente del sistema de adquisición y almacenamiento meteorológico.

Una incidencia publicitaria nunca deberá impedir:

- recoger datos meteorológicos;
- almacenarlos;
- consultar condiciones actuales;
- consultar históricos;
- mostrar información esencial.

La meteorología continuará funcionando aunque el subsistema publicitario no esté disponible.


## 51. Impresiones

En una evolución posterior podrá registrarse cada aparición de una campaña.

Esto permitirá conocer el número de impresiones.

Una impresión representará que una determinada creatividad, texto o campaña ha sido seleccionada para mostrarse en un espacio.


## 52. Estadísticas futuras

Las estadísticas podrán incluir:

- impresiones por campaña;
- impresiones por anunciante;
- impresiones por espacio;
- impresiones por texto;
- impresiones por imagen;
- distribución temporal;
- rendimiento de diferentes creatividades.

Si posteriormente se incorporan enlaces, podrán estudiarse también métricas de interacción.


## 53. Utilidad comercial de las estadísticas

Las estadísticas permitirán proporcionar información objetiva al anunciante.

Por ejemplo:

- cuántas veces apareció su campaña;
- en qué sección;
- durante qué periodo;
- qué textos tuvieron mayor exposición;
- qué creatividades se utilizaron.

Esto podrá aumentar el valor comercial de MeteoArchidona.


## 54. Privacidad

Las estadísticas deberán diseñarse respetando la privacidad de los usuarios.

El objetivo principal será medir la exposición de las campañas, no construir perfiles invasivos de los visitantes.

Cualquier mecanismo futuro de analítica deberá revisarse específicamente desde el punto de vista de privacidad y normativa aplicable.


## 55. Experiencia de usuario

La publicidad deberá respetar unas reglas de presentación.

Como principios iniciales:

- evitar ventanas emergentes invasivas;
- evitar bloquear información meteorológica;
- evitar movimientos continuos que dificulten la lectura;
- evitar sonidos automáticos;
- evitar recargas completas de página;
- mantener coherencia visual;
- identificar claramente los contenidos patrocinados;
- priorizar la velocidad de carga.


## 56. Publicidad y actualización meteorológica

La actualización automática de los datos meteorológicos no deberá provocar necesariamente una nueva selección publicitaria.

Ambos ciclos deben estar desacoplados.

Esto evitará que una página que actualiza datos meteorológicos cada minuto produzca cambios publicitarios constantes o molestos.


## 57. Rendimiento

Los recursos publicitarios no deberán degradar de forma significativa el rendimiento de MeteoArchidona.

Las imágenes deberán poder optimizarse.

En el futuro podrán establecerse:

- tamaños máximos;
- dimensiones recomendadas;
- formatos admitidos;
- compresión;
- generación de miniaturas;
- carga diferida.


## 58. Seguridad de contenidos

Los contenidos proporcionados por anunciantes deberán tratarse como contenido externo.

El sistema deberá impedir que textos, enlaces o recursos suministrados por terceros puedan introducir código ejecutable o alterar la página.

La implementación deberá contemplar validación y saneamiento de contenidos.


## 59. Enlaces

Los anuncios podrán incorporar enlaces cuando corresponda.

Por ejemplo:

- web del anunciante;
- página de reservas;
- carta;
- tienda;
- red social;
- información de una promoción.

Las políticas concretas de enlaces se definirán durante la implementación.


## 60. Evolución del espacio privado

La zona privada del anunciante podrá desarrollarse por fases.

### Primera fase

Administración interna por parte de MeteoArchidona.

### Segunda fase

Consulta por parte del anunciante.

### Tercera fase

Creación y edición de campañas por parte del anunciante.

### Cuarta fase

Gestión de textos e imágenes.

### Quinta fase

Consulta de estadísticas y rendimiento.

Estas fases son orientativas y podrán reorganizarse según las necesidades del proyecto.


## 61. Posible flujo de creación de campaña

Un futuro flujo podría ser:

1. el anunciante accede a su espacio privado;
2. crea una campaña;
3. introduce nombre y descripción;
4. selecciona fecha inicial;
5. selecciona fecha final;
6. selecciona uno o varios textos del catálogo;
7. crea textos propios si los necesita;
8. selecciona logotipo e imágenes;
9. selecciona o contrata espacios;
10. guarda la campaña;
11. MeteoArchidona la revisa cuando sea necesario;
12. la campaña queda programada;
13. al llegar su fecha comienza a participar automáticamente;
14. al finalizar deja de mostrarse;
15. permanece disponible en el histórico.


## 62. Ejemplo conceptual

Supongamos el anunciante:

**Restaurante San Isidro**

Dispone de:

- logotipo;
- fotografía de fachada;
- fotografía de un plato;
- varios textos publicitarios.

Crea la campaña:

**Menús de septiembre 2026**

Descripción:

> Promoción de los menús de septiembre y reservas durante los fines de semana.

Vigencia:

- inicio: 1 de septiembre de 2026;
- fin: 30 de septiembre de 2026.

Selecciona los textos:

- Reserva tu mesa para este fin de semana.
- Consulta nuestro menú.
- Descubre nuestras especialidades.
- Este domingo, arroz caldoso por encargo.

Contrata:

**Lluvia en vivo**

en modalidad de rotación.

Cuando el sistema determine que corresponde mostrar esa campaña, podrá seleccionar uno de esos textos mediante la política de rotación configurada.


## 63. Ejemplo de campaña exclusiva

El mismo anunciante podría contratar posteriormente una campaña exclusiva.

Durante siete días, por ejemplo, podría ocupar en exclusiva un determinado espacio gráfico.

Durante ese periodo:

- otras campañas no participarían en ese espacio;
- podrían seguir apareciendo normalmente en otros espacios;
- la exclusividad terminaría automáticamente al finalizar la vigencia contratada.


## 64. Separación entre anunciante, campaña y contenido

Es importante mantener separados estos conceptos.

### Anunciante

Representa al negocio o entidad.

### Campaña

Representa una acción publicitaria con objetivo y vigencia determinados.

### Texto

Representa un mensaje reutilizable.

### Recurso gráfico

Representa una imagen, logotipo o creatividad.

### Espacio

Representa una ubicación publicitaria disponible en MeteoArchidona.

### Contratación o asignación

Relaciona una campaña con uno o varios espacios y determina las condiciones bajo las que puede mostrarse.

Esta separación permitirá evolucionar el sistema sin duplicaciones innecesarias.


## 65. No diseñar todavía las tablas definitivas

Este documento define principalmente el comportamiento funcional.

No se consideran todavía definitivos:

- nombres de tablas;
- nombres de columnas;
- relaciones SQL concretas;
- tipos de datos;
- endpoints;
- schemas;
- repositorios;
- servicios;
- sistema de autenticación;
- mecanismo definitivo de almacenamiento de imágenes.

Estas decisiones se tomarán cuando comience la implementación técnica del subsistema.


## 66. Integración futura con la arquitectura

Cuando llegue el momento de implementar este subsistema, deberá respetar la arquitectura general de MeteoArchidona.

La lógica comercial no deberá quedar en la capa HTTP ni en el HTML.

La implementación deberá mantener responsabilidades separadas para:

- persistencia;
- reglas de negocio;
- exposición mediante API;
- administración;
- presentación pública.


## 67. Posibles entidades futuras

Sin constituir todavía un diseño definitivo de base de datos, el dominio probablemente necesitará conceptos equivalentes a:

- anunciante;
- usuario de anunciante;
- campaña;
- texto publicitario;
- categoría de texto;
- relación campaña-texto;
- recurso gráfico;
- relación campaña-recurso;
- espacio publicitario;
- modalidad;
- tarifa;
- asignación de campaña a espacio;
- impresión;
- estadística.

La implementación deberá confirmar cuáles son realmente necesarias.


## 68. Criterio de reutilización

Antes de crear componentes nuevos durante la implementación deberá revisarse si MeteoArchidona dispone ya de responsabilidades equivalentes que puedan reutilizarse.

El subsistema publicitario deberá integrarse con el proyecto sin introducir duplicaciones innecesarias.


## 69. Objetivo comercial

El objetivo del sistema no será simplemente insertar anuncios.

Se pretende construir una plataforma de patrocinio local donde los negocios puedan asociar su presencia a un servicio meteorológico útil para Archidona y su comarca.

La publicidad deberá aportar recursos económicos para ayudar a sostener:

- infraestructura;
- alojamiento;
- bases de datos;
- cámaras;
- comunicaciones;
- mantenimiento;
- desarrollo;
- futuras ampliaciones de MeteoArchidona.


## 70. Objetivo para el anunciante

El anunciante deberá poder entender claramente:

- qué está contratando;
- dónde aparecerá;
- durante cuánto tiempo;
- qué campaña está activa;
- qué textos participan;
- qué imágenes utiliza;
- qué nivel de presencia tiene;
- qué resultados de exposición obtiene cuando existan estadísticas.

Esto permitirá convertir el subsistema en una herramienta comercial real y no únicamente en una colección de banners.


## 71. Objetivo para MeteoArchidona

MeteoArchidona deberá poder gestionar la publicidad sin necesidad de modificar manualmente la web cada vez que cambie una campaña.

El objetivo final será disponer de un sistema administrable, persistente y automatizado en el que:

**anunciantes → crean contenidos → crean campañas → seleccionan contenidos → contratan espacios → MeteoArchidona valida → el sistema publica → se registran resultados.**


## 72. Próximas decisiones

Antes de implementar el subsistema deberán concretarse progresivamente:

- modelo definitivo de datos;
- autenticación de anunciantes;
- permisos;
- flujo de aprobación;
- almacenamiento de imágenes;
- catálogo inicial de textos;
- categorías;
- espacios publicitarios iniciales;
- modalidades comerciales;
- tarifas;
- reglas exactas de rotación;
- tratamiento de exclusividades;
- endpoints;
- estadísticas;
- requisitos legales y de privacidad.


## 73. Conclusión

El subsistema de publicidad de MeteoArchidona se concibe como un sistema propio de gestión de patrocinadores locales, no como una simple inserción de banners.

Sus elementos fundamentales serán:

**anunciantes, contenidos, campañas, espacios, tarifas y reglas de publicación.**

La normalización de textos permitirá reutilizar mensajes y construir campañas de forma sencilla.

Los recursos gráficos permitirán campañas visualmente más completas.

Las campañas proporcionarán contexto, vigencia y selección de contenidos.

Los espacios publicitarios permitirán asignar distinto valor comercial a las diferentes áreas de MeteoArchidona.

La rotación permitirá compartir espacios entre anunciantes, mientras que las modalidades premium y exclusivas permitirán ofrecer niveles superiores de presencia.

La futura zona privada permitirá que cada anunciante pueda participar progresivamente en la gestión de su publicidad, manteniendo MeteoArchidona el control administrativo necesario.

El sistema deberá evolucionar siempre bajo una regla fundamental:

> la publicidad ayuda a financiar MeteoArchidona, pero la información meteorológica sigue siendo la prioridad.