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

## 4. Estado de cada ventaja

| Ventaja | Estado | Se puede anunciar |
| --- | --- | --- |
| 2.1 Estadísticas e informes propios | En construcción (catálogo de la API, PR #51) | No, hasta que funcione |
| 2.2 Catálogo en los dashboards | El catálogo ya se consulta en `/estadisticas` (28 oct); los dashboards, DISEÑO PREVISTO | Sí, la consulta del catálogo y el PDF (ya lo dice el aviso de `/estadisticas`) |
| 2.3 Dashboards propios | DISEÑO PREVISTO; antes, el dashboard de MeteoArchidona | No |
| 2.4 Otras candidatas | Por confirmar | No |
| 3 Por qué registrarse | Borrador de Claude, pendiente de José | No |

## 5. Pendiente

- Dónde se muestra en la web: página propia, ventana desde el botón de registro, o ambas.
- Texto definitivo de cada ventaja y de la sección 3.
- Revisar y ampliar la lista con cada subsistema nuevo.
