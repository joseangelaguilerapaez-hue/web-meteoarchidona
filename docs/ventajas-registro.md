# Ventajas de registrarse en MeteoArchidona

Documento abierto el 2026-10-27 con José. Recoge **qué gana un usuario al registrarse** y **por
qué es importante para MeteoArchidona que se registre**. Se irá ampliando con cada ventaja nueva
y, cuando esté maduro, su texto pasará a una página o ventana de la web que explique al
visitante por qué le conviene crear una cuenta.

Este documento no decide cómo se construye cada función: eso está en el documento de cada
subsistema (se indica en cada ventaja). Aquí se explica **qué es y para qué le sirve al usuario**.

## 1. Principios que no cambian

- **MeteoArchidona sigue siendo pública.** Registrarse da funciones extra; no quita nada de lo
  que hoy ve un visitante sin cuenta (`docs/usuarios.md` de la API, principio 1).
- **El registro es gratuito y opcional.**
- Las ventajas se explican sin exagerar: solo se anuncia en la web lo que ya funciona. Cada
  ventaja lleva su estado (sección 4).

## 2. Ventajas para el usuario

### 2.1. Crear sus propias estadísticas e informes

**Texto para la web (borrador):**

> Con tu cuenta puedes crear tus propias gráficas e informes con los datos de nuestras
> estaciones. Eliges la estación, lo que quieres ver (temperatura, lluvia, viento, humedad…),
> el periodo y cómo agruparlo, y combinas varias series en una misma gráfica: por ejemplo, la
> lluvia de este año frente a la del anterior, o El Silo frente a Los Llanos. Cada gráfica o
> informe se puede descargar en PDF.
>
> Si tu gráfica le puede servir a más gente, la revisamos y pasa a formar parte de nuestro
> catálogo, para que otros usuarios registrados también la usen.

Detalle:
- La herramienta de creación solo está disponible para usuarios registrados (y para el equipo).
- Lo que crea un usuario se revisa antes de entrar en el catálogo.
- Diseño: `docs/informes-estadisticas.md` de la API y `docs/estadisticas.md` de esta web.

### 2.2. Usar todo el catálogo de estadísticas en sus dashboards

**Texto para la web (borrador):**

> Como usuario registrado tienes acceso a todo el catálogo de gráficas e informes: los que
> preparamos en MeteoArchidona y los que han creado otros usuarios. Puedes llevar cualquiera de
> ellos, y también los tuyos, a tus propios paneles.

Detalle:
- Un visitante sin cuenta solo ve las gráficas que el equipo coloque en las páginas públicas.
- El catálogo completo es solo para registrados.

### 2.3. Crear sus propios dashboards

**Texto para la web (borrador):**

> Monta tus propios paneles con lo que de verdad te interesa. Por ejemplo, uno de seguimiento
> para los días de tormenta y otro con tus datos diarios, y en cada uno eliges qué ver: lecturas
> de las estaciones, gráficas, informes, cámaras…

Detalle:
- Un visitante sin cuenta se queda con el panel de Actualidad y con los paneles públicos que
  ponga MeteoArchidona.
- El usuario registrado puede tener **varios** dashboards con nombre propio y configurar los
  componentes de cada uno.
- Idea de diseño ya anotada: el dashboard de MeteoArchidona y los de los usuarios tendrán la
  misma estructura, de modo que uno nuevo pueda partir del predeterminado (`docs/usuarios.md`
  de la API, 3.1). Antes hay que construir el dashboard de MeteoArchidona.
- José lo considera **una mejora muy importante** para el usuario registrado.

### 2.4. Otras candidatas (por confirmar con José)

Funciones ya previstas en otros documentos que también serían solo para registrados. No se
anuncian hasta que José las confirme como ventaja y existan:

- Recibir por correo el texto diario de la predicción («el presentador»), a las horas que elija
  (`docs/prediccion.md`).
- Notificaciones y alertas (`docs/Usuarios.md`).
- Localidades de interés y localidad principal (`docs/Usuarios.md`, 6 a 8).

## 3. Por qué es importante para MeteoArchidona (borrador)

Propuesta de Claude para que José la ajuste; ninguna de estas razones está decidida todavía.

> MeteoArchidona es un proyecto propio, hecho con nuestras estaciones y nuestro tiempo. Que te
> registres nos ayuda a:
>
> - saber cuántas personas nos siguen de verdad y qué les resulta útil, para dedicar el
>   esfuerzo a lo que más se usa;
> - poder avisarte cuando haga falta (episodios de lluvia, tormentas, cambios en la web) por los
>   canales que tú autorices;
> - hacer crecer el catálogo de gráficas e informes con las aportaciones de todos;
> - dar continuidad al proyecto: una comunidad de usuarios es lo que justifica seguir ampliando
>   estaciones, cámaras y herramientas.

Lo que debe quedar claro en el texto final:
- Qué datos se guardan y para qué, con enlace a la política de privacidad.
- Que el registro no obliga a recibir nada: cada permiso (correo, notificaciones, publicidad) es
  independiente (`docs/usuarios.md` de la API, sección 5).

## 4. Estado de cada ventaja (revisado el 2026-11-05)

| Ventaja | Estado | Se puede anunciar |
| --- | --- | --- |
| «Mi cuenta» (datos, cambiar el PIN, borrar la cuenta) | Publicada (4 nov) | Sí |
| Suscripciones: predicción diaria, presentador, alertas y boletín, por municipio de Málaga, gratis | Se guardan (4 nov); los envíos esperan a Amazon SES | Sí, diciendo que los envíos empiezan en cuanto se pongan en marcha |
| Preferencias (parámetros públicos de la configuración: el tema) | Se guardan; el tema claro aún no existe | No, hasta que el tema claro funcione |
| 2.1 Estadísticas e informes propios | Vista previa con sesión en la API; falta la herramienta para usuarios en la web y guardar | Como «muy pronto» |
| 2.2 Catálogo completo en los dashboards | El catálogo se consulta en `/estadisticas`; hoy todas son de MeteoArchidona y las ve cualquiera | Como «muy pronto» (lo que aporten otros usuarios) |
| 2.3 Dashboards propios, «Mi web» (hasta tres pestañas) y portada propia | API fusionada (PR #92); falta la web | Como «muy pronto» |
| 2.4 Ideas nuevas (sección 6) | Aprobadas por José como ideas el 5 nov; sin diseño | Solo como ideas que se estudian |
| 3 Por qué registrarse | Aprobado por José el 5 nov | Sí |

## 6. Ideas nuevas (José, 2026-11-05)

Propuestas de Claude que José aprueba como ideas («no quito nada»). Cada una necesitará su diseño:

- **Alertas a medida** de nuestras estaciones: heladas, lluvia por encima de un umbral, viento fuerte.
- **Notificaciones en el móvil** con la web instalada como aplicación (avisos de AEMET, tormentas, rayos cerca).
- **Favoritos**: embalses (el componente de la comarca con los suyos), cámaras y localidades.
- **Descarga de datos** de las estaciones en CSV o Excel.
- **Timelapses a la carta**: guardar los que gusten o pedir el de un día concreto.
- **Observaciones de los vecinos**: fotos y avisos que el equipo revisa y publica (encaja con el foro).
- **Resumen mensual del tiempo** por correo.
- **Sin publicidad** para los registrados, cuando la web lleve anuncios.
- **Ver antes que nadie** las secciones nuevas en pruebas.

## 7. Dónde se cuenta

- Primera novedad de la portada (5-11-2026): «¿Por qué registrarte en MeteoArchidona?», con capturas
  de ejemplo en `assets/novedades/registro-*.webp` (alta, Mi cuenta, suscripciones, estadísticas,
  una gráfica y un panel propio). Distingue lo que ya hay de lo que viene. Sus bloques están en
  `datos/novedades/registro.json` de la API.

## 5. Pendiente

- Página propia o ventana desde el botón de registro, además de la novedad (sección 7).
- Texto definitivo de cada ventaja y de la sección 3.
- Revisar y ampliar la lista con cada subsistema nuevo.
