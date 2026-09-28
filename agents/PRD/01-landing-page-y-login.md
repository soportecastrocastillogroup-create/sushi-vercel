# PRD 01 · Landing page, login seguro y sitio autoadministrable

| Campo | Valor |
|---|---|
| Fecha de creación | 24 de septiembre de 2026 |
| Estado | Propuesta, pendiente de aprobación del cliente |
| Rama de trabajo | `feature/frontend-propuesta-fase-1` (creada desde `main` en `2e47894`, sin cambios de código) |
| Base de datos de desarrollo | Supabase `Pedidos Desarrollo` (`ikzprpnpyvbwsxiqprdt`) |
| Base de datos de producción | Supabase `Pedidos` (`caaqivncmufjrslrqejx`). No se toca en esta fase |
| Referencia de diseño | <https://www.niusushi.cl/> (capturas en `agents/media/referencias/niu-sushi/`) |
| Identidad del negocio | `agents/identity/` |

Convención del documento: **[Verificado]** = comprobado en código, base de datos o sitio.
**[Informado]** = lo dijo el equipo o el cliente. **[Por confirmar]** = supuesto que
falta validar.

---

## 1. Estado actual de la aplicación (24 sep 2026)

### 1.1 Qué es hoy

- **[Verificado]** Es una SPA en React 19 + Vite 8 + Supabase, publicada en Vercel
  como sitio estático en <https://www.sushiloncoche.cl/>.
- **[Verificado]** No usa rutas: `src/App.jsx` alterna cuatro vistas con un
  `useState("customer")` y una barra superior (`AppNav`):
  - **Pedido** (pública): `components/customer/`. Carrito, retiro o delivery,
    fecha, horario con cupos, personalización de rolls, confirmación por
    WhatsApp e impresión de comanda.
  - **Admin**: `components/admin/`. Pedidos, estados, stock y fechas
    habilitadas.
  - **Cocina**: `components/kitchen/`. Tablero kanban de pedidos.
  - **Reportes**: `components/reportes/`. Resúmenes y exportación CSV.
- **[Verificado]** El estilo está inline, en paleta verde oscuro y dorado
  (`#0A0D0A`, `#C9A84C`), con las fuentes DM Sans y Crimson Pro. No corresponde a la
  identidad de marca actual (negro, rojo y blanco).
- **[Verificado]** Hay 14 tablas: `branches`, `categories`, `products`,
  `product_branches`, `promo_rolls`, `promo_options`, `customization_options`,
  `app_settings`, `time_slots`, `blocked_weekdays`, `product_stock`,
  `unlocked_dates`, `orders` y `order_items`.
- **[Informado]** Al cliente le gusta y usa a diario la forma actual de gestionar
  pedidos (admin y cocina). **Ese flujo se conserva**; lo que cambia es dónde vive
  y cómo se accede.

### 1.2 Qué puede administrar hoy el cliente

- **[Verificado]** Desde la app, solo el **stock** por producto (disponible o
  agotado) y las **fechas habilitadas**, además de gestionar pedidos.
- **[Verificado]** La **carta no se puede editar desde la app**. Productos,
  precios, descripciones, categorías, promociones (`promo_rolls` y
  `promo_options`) y personalizaciones son datos seed escritos a mano en
  `scripts/generate-schema.mjs` (66 productos). El README indica editar el SQL y
  volver a ejecutarlo en Supabase, algo que el cliente no puede hacer solo.
- **[Verificado]** Los productos **no tienen fotos**: la tabla `products` no
  tiene columna de imagen y no hay buckets de Supabase Storage.
- **[Verificado]** El costo de delivery, el WhatsApp, los horarios y los cupos
  están en `app_settings`, `time_slots` y `blocked_weekdays`, sin pantalla para
  editarlos.
- Consecuencia: hoy cualquier cambio de carta o precio depende de un
  desarrollador.

### 1.3 Problemas de seguridad detectados

- **[Verificado] Los PIN son públicos.** `services/settings.js` descarga
  `admin_pin`, `kitchen_pin` y `reportes_pin` al navegador, y `PinModal.jsx` los
  compara en el cliente. Además, la política RLS `anon_select_app_settings`
  permite leer esa tabla a cualquiera. Cualquier persona puede ver los PIN en las
  herramientas del navegador.
- **[Verificado] Los pedidos están abiertos a cualquiera.** Las tablas `orders`,
  `order_items`, `product_stock` y `unlocked_dates` tienen la política
  `FOR ALL TO anon USING (true)`. Con la clave pública, cualquiera puede leer,
  modificar o borrar todos los pedidos, que incluyen nombre, teléfono y dirección
  de los clientes.
- **[Verificado] La vista pública descarga todos los pedidos.** `CustomerView`
  recibe `orders` para calcular los cupos por horario
  (`getHorariosDisponibles`). El sitio público necesita ver pedidos solo para
  contar cupos, y eso obliga a mantener la lectura abierta.
- **[Verificado] Deuda técnica conocida.** La creación del pedido inserta
  `orders` y luego `order_items` en dos llamadas, sin transacción.

### 1.4 Infraestructura relevante

- **[Verificado]** No existe `vercel.json`. Si se agregan rutas (`/login`,
  `/panel`), hará falta una regla de rewrite para la SPA.
- **[Verificado]** Pedidos Desarrollo está en plan Free y se pausa tras unos 7
  días sin uso; se reanudó el 24 sep 2026.
- **[Verificado, según AGENTS.md]** Las variables de Preview en Vercel apuntan a
  producción. Hasta cambiarlas, un Preview de esta rama escribiría en la base
  real.

---

## 2. Objetivo

Construir una primera versión nueva para el cliente con cuatro cambios:

1. **Landing page pública en la raíz (`/`)** con la estructura y la experiencia
   de la landing de Niu Sushi, adaptada a la identidad de Sushi Loncoche.
2. **Carta pública al estilo de Niu Sushi** (grilla de productos con
   categorías, buscador y carrito) que envía el pedido por WhatsApp. **El
   formulario de pedido por pasos actual pasa al panel**, detrás del login, como
   herramienta interna para registrar pedidos.
3. **Admin, Cocina y Reportes quedan detrás de un login real** (usuario y
   contraseña con Supabase Auth y dos roles: **administrador** y
   **colaborador**), en reemplazo de los PIN.
4. **[Informado] El sitio debe ser autoadministrable** por el cliente desde el
   panel, después de iniciar sesión: carta, promociones, fotos, precios,
   descripciones y el contenido de la landing, sin depender de un
   desarrollador.

---

## 3. Referencia: estructura de Niu Sushi

Observado el 24 sep 2026 en escritorio (1440 px) y móvil (390 px).

### Escritorio (`niu-desktop.png`)

- **Header fijo oscuro** (~90 px): logo a la izquierda. A la derecha, botones
  tipo píldora **Carta** y **Locales**, un selector de ciudad con ícono de pin,
  un ícono de carrito y un ícono de cuenta, ambos circulares.
- **Hero a pantalla completa** entre el header y el footer: carrusel de imágenes
  de producto sobre fondo negro, con acentos rojos de textura, un sello circular
  rotativo con texto ("+ sabrosos · nueva carta") y titulares con tipografía de
  pincel.
- **Footer compacto** (~80 px): redes sociales (Facebook, Instagram, TikTok),
  horario de atención, copyright, políticas y preguntas frecuentes, y logo del
  grupo.
- La home **no tiene scroll largo**: es una sola pantalla de impacto que empuja
  a entrar a la Carta.

### Móvil (`niu-mobile.png`)

- Banner superior rojo de descarga de la app. **No aplica** a Sushi Loncoche.
- Header con logo, selector de ciudad, carrito y menú hamburguesa.
- Hero con carrusel, flechas laterales y logo más titular centrados.
- **Dos botones fijos abajo**: "Carta" y "Repetir pedido".

### Carta (`niu-carta.png`)

- Barra lateral con buscador, accesos rápidos (favoritos, repetir pedido) y
  lista de categorías. La categoría activa se marca en rojo.
- Grilla de 4 columnas con tarjetas: foto grande de producto sobre fondo oscuro,
  nombre en mayúsculas, precio y botón circular rojo para agregar al carrito.

### Locales (`niu-locales.png`)

- Columna izquierda con buscador y tarjetas por local: nombre, estado
  "ABIERTO", dirección, teléfono y horario en rojo.
- Mapa a la derecha con marcadores del logo.

### Límite de la copia

Se replica la **estructura, la disposición y el comportamiento**. **No** se copian
logos, ilustraciones, fotografías, textos, sellos ni la fuente de marca de Niu
Sushi (usan `adineue-PRO`, que es de pago). Todo el contenido visual será propio
de Sushi Loncoche o, mientras no exista, un placeholder marcado como
demostrativo.

---

## 4. Identidad de Sushi Loncoche

Fuente: `agents/identity/logo.jpeg` e `instagram.jpeg` (capturas del perfil
de Instagram `@sushi.loncoche`).

| Elemento | Valor | Estado |
|---|---|---|
| Nombre de marca | `SUSHI LONCOCHE` (mayúsculas, sin punto; el punto es solo del usuario de Instagram `@sushi.loncoche`) | [Informado por Bruno Veinz, 24 sep 2026] |
| Logo | Texto blanco condensado y círculo rojo con palillos, sobre círculo negro con borde rojo | [Verificado]. Solo existe como captura de pantalla |
| Negro | `#000000` | [Verificado en logo] |
| Rojo de marca | ≈ `#BF2020` (muestreado de la captura JPEG) | [Por confirmar con el color oficial] |
| Blanco | `#FFFFFF` | [Verificado en logo] |
| Tipografía | Sans condensada tipo Bebas Neue u Oswald (libres en Google Fonts) | [Por confirmar]. Es una propuesta por similitud |
| Sucursales | Loncoche y La Paz | [Verificado en app y en Instagram] |
| Horario | Martes a sábado, 17:00 a 22:00 | [Observado en Instagram, por confirmar] |
| Canales | WhatsApp e Instagram; retiro y delivery | [Observado en Instagram] |
| Dirección La Paz | "Sushi Bar Ruta 5", Arturo Prat 597, La Paz | [Observado en publicación de Instagram, por confirmar] |

No se inventan precios, productos ni datos de contacto. La carta sigue saliendo
de Supabase.

---

## 5. Alcance

### 5.1 Mapa de rutas propuesto

| Ruta | Acceso | Contenido |
|---|---|---|
| `/` | Público | Landing (hero, CTA a la Carta, sucursales, footer) |
| `/carta` | Público | Grilla de productos por sucursal y categoría, con buscador, detalle, carrito y envío del pedido por WhatsApp |
| `/locales` | Público | Sucursales Loncoche y La Paz: dirección, horario, WhatsApp y mapa embebido |
| `/login` | Público | Inicio de sesión del equipo |
| `/panel` | Autenticado | Redirige a `/panel/pedidos` |
| `/panel/pedidos` | `administrador`, `colaborador` | Gestión de pedidos (lista y estados del `AdminView` actual) |
| `/panel/nuevo-pedido` | `administrador`, `colaborador` | Formulario por pasos actual (`CustomerView`) para registrar pedidos recibidos por WhatsApp, teléfono o en el local |
| `/panel/cocina` | `administrador`, `colaborador` | `KitchenView` actual |
| `/panel/reportes` | `administrador` | `ReportesView` actual |
| `/panel/carta` | `administrador` | Administrar categorías, productos, precios, descripciones, fotos y sucursales |
| `/panel/sitio` | `administrador` | Contenido de la landing (slides del hero, textos, redes) y datos del negocio (horarios, delivery, WhatsApp, cupos) |
| `/panel/usuarios` | `administrador` | Crear, desactivar y cambiar el rol de las cuentas del equipo |

### 5.1.0 Roles y permisos

**[Informado]** Hay dos roles. El **administrador** ve y cambia todo. El
**colaborador** tiene acceso limitado a la operación diaria de pedidos. Este
modelo reemplaza a los tres PIN actuales (admin, cocina y reportes).

| Permiso | Administrador | Colaborador |
|---|:---:|:---:|
| Ver pedidos y cambiar su estado | ✅ | ✅ |
| Crear pedidos manuales (WhatsApp, teléfono o local) | ✅ | ✅ |
| Vista cocina e impresión de comanda | ✅ | ✅ |
| Marcar productos agotados o disponibles | ✅ | ✅ |
| Editar un pedido existente | ✅ | ✅ |
| Eliminar pedidos | ✅ | ✅ |
| Abrir un día que normalmente está cerrado (ver nota) | ✅ | ✅ |
| Reportes y exportación CSV | ✅ | ❌ |
| Carta, precios, fotos y descripciones | ✅ | ❌ |
| Promociones | ✅ | ❌ |
| Contenido de la landing y datos del negocio | ✅ | ❌ |
| Gestionar cuentas del equipo (ver 5.1.0.1) | ✅ | ❌ |

Nota sobre "abrir un día": **[Verificado]** en `blocked_weekdays` están cerrados
por defecto domingo, lunes y martes (`dow` 0, 1 y 2). El cliente no puede pedir
para esos días, salvo que en Admin se abra una fecha puntual (por ejemplo, un
lunes feriado), lo que se guarda en `unlocked_dates`. Hoy solo se abren fechas
de los próximos días; los días cerrados por defecto no se cambian desde la app.
**[Por confirmar]** Instagram dice "Martes a Sábado", pero el sistema tiene el
martes cerrado.

Reglas:
- Eliminar un pedido debe pedir confirmación y conviene registrar quién lo hizo,
  porque ahora también pueden hacerlo los colaboradores.
- Los permisos se aplican **en la base de datos** (RLS y RPC), no solo
  ocultando botones. Un colaborador no debe poder cambiar la carta ni siquiera
  llamando a la API directamente.
- El menú del panel muestra solo lo que el rol puede usar.
- Crear cuentas desde el panel requiere una Supabase Edge Function con la clave
  `service_role`, que nunca debe llegar al navegador. Como alternativa inicial,
  el administrador puede invitar usuarios desde el dashboard de Supabase.
- Siempre debe existir al menos un administrador activo.

### 5.1.0.1 Gestión de cuentas por el administrador

**[Informado]** El administrador tiene permisos globales y debe poder gestionar
las cuentas de los colaboradores de forma simple, sin entrar a Supabase.

Desde `/panel/usuarios`, el administrador puede:
- Ver la lista del equipo con nombre, correo, rol, estado (activo o inactivo) y
  último acceso.
- **Crear una cuenta** con nombre, correo y rol. El sistema envía una invitación
  por correo para que la persona defina su contraseña, o el administrador asigna
  una contraseña temporal.
- **Cambiar el rol** entre `colaborador` y `administrador`.
- **Desactivar o reactivar** una cuenta. Una cuenta desactivada no puede iniciar
  sesión y se cierra en su próxima petición; no se borra, para conservar el
  historial.
- **Restablecer la contraseña** enviando un correo de recuperación.
- Editar el nombre visible.

Reglas:
- Estas acciones pasan por una Edge Function (`manage-staff`) que valida que
  quien llama sea `administrador` activo y usa la clave `service_role` solo en
  el servidor.
- Un administrador no puede desactivarse ni quitarse el rol a sí mismo si es el
  último administrador activo.
- Cada acción queda registrada en una tabla `staff_audit` (quién, qué, cuándo).

### 5.1.1 Qué debe poder administrar el cliente

| Qué | Acciones | Dónde se guarda |
|---|---|---|
| Categorías | Crear, renombrar, ordenar y ocultar | `categories` (agregar `active`) |
| Productos | Crear, editar nombre, precio, piezas y descripción; activar o desactivar; ordenar; asignar sucursal | `products`, `product_branches` |
| Fotos de productos | Subir, reemplazar y quitar, con vista previa | Nuevo bucket `product-images` en Supabase Storage y nueva columna `products.image_url` |
| Promociones | Crear y editar la promo, sus rolls (envoltura y relleno) y las opciones elegibles | `products`, `promo_rolls`, `promo_options` |
| Personalizaciones | Editar nombre y precio de los extras | `customization_options` |
| Landing | Slides del hero (imagen, título, texto, botón), orden y visibilidad | Nueva tabla `site_slides` y bucket `site-media` |
| Datos del negocio | Horarios, días bloqueados, cupos por horario, costo de delivery, WhatsApp, redes y direcciones | `app_settings`, `time_slots`, `blocked_weekdays`, `branches` (agregar dirección, teléfono y horario) |
| Stock y fechas | Lo que ya existe hoy | `product_stock`, `unlocked_dates` |

Reglas:
- Desactivar en lugar de borrar cuando un producto ya tiene pedidos, para no
  romper el historial de `order_items`.
- Validar precios (enteros positivos en CLP) y comprimir o redimensionar las
  fotos antes de subirlas, porque el plan Free tiene 1 GB de Storage.
- Solo el rol `administrador` escribe en la carta y el sitio; el público solo lee.

### 5.2 Entregables por etapa

**Etapa A · Landing y rutas (solo frontend)**
- Agregar el router (`react-router`) y `vercel.json` con el rewrite a
  `index.html`.
- Tokens de color y tipografía de la marca en un solo lugar.
- Header, hero con carrusel, CTA "Pedir ahora", barra fija inferior en móvil
  y footer, todo con la estructura de Niu Sushi.
- Página de Locales.
- `CustomerView` montado en `/carta` y reestilizado sin cambiar su lógica.
- Quitar del sitio público la barra que muestra Admin, Cocina y Reportes.

**Estado de la Etapa A (24 sep 2026): implementada en local, sin commit.**
- Rutas `/`, `/carta`, `/locales` y `/panel` con `react-router` 7, más
  `vercel.json` con rewrite a `index.html`. La carta y el panel se cargan bajo
  demanda, así que la landing no descarga el código del panel.
- Contenido provisional en `src/content/site.js`, con la misma forma que tendrán
  los datos de Supabase en la Etapa D.
- Logo redibujado en `src/components/site/Brand.jsx` e ilustración vectorial de
  roll (`RollArt.jsx`) como arte provisional; no se usa ningún recurso de Niu.
- `/carta`: grilla pública (`MenuPage`) con barra de categorías, buscador,
  selector de sucursal (también en el header), modal de detalle con opciones de
  promo, carrito persistente (`CartProvider`) y envío por WhatsApp
  (`utils/whatsappOrder.js`). Solo lee catálogo y stock; no descarga pedidos.
- `CustomerView` (formulario por pasos) quedó como pestaña "Nuevo pedido" en
  `/panel`, con la paleta de marca y la lógica sin cambios.
- `/panel` mantiene temporalmente los PIN heredados hasta la Etapa B.
- Pendiente: el mapa de La Paz queda oculto hasta confirmar la dirección.

**Etapa B · Login real (Supabase Auth)**
- Página `/login` con correo y contraseña, más recuperación de contraseña.
- Tabla `staff_profiles` (`user_id`, `nombre`, `rol` con los valores
  `administrador` o `colaborador`, `active`, `branch_id` opcional) y una función
  `current_role()` para usar en las políticas RLS.
- Guardas de ruta en `/panel/*` según la matriz 5.1.0, menú filtrado por rol
  y cierre de sesión.
- Pantalla `/panel/usuarios` y Edge Function `manage-staff` según 5.1.0.1.
- Usuarios creados por el administrador desde Supabase; sin registro público.
- Eliminar `PinModal` y dejar de leer los PIN.

**Estado de la Etapa B (24 sep 2026): implementada y probada en Pedidos
Desarrollo, sin commit.**
- Migración `supabase/migrations/20260924190000_staff_auth.sql`, aplicada solo
  en desarrollo: `staff_profiles`, `staff_audit`, las funciones `staff_role()`,
  `is_staff()`, `is_admin()` y `mark_password_changed()`, y políticas para
  `authenticated`. Las políticas de `anon` siguen intactas; su cierre es la
  Etapa C.
- Edge Function `supabase/functions/manage-staff`, desplegada en desarrollo, con
  las acciones `list`, `create`, `update`, `set_active` y `reset_password`.
  Rechaza a quien no es administrador activo (verificado: 401 sin sesión y 403
  para un colaborador). Bloquea desactivarse a sí mismo y dejar el sistema sin
  administradores.
- Frontend: `/login`, `/panel/pedidos`, `/panel/nuevo-pedido`, `/panel/cocina`,
  `/panel/reportes` y `/panel/usuarios` (solo administrador), y `/panel/cuenta`.
  Se eliminaron `PinModal`, `AppNav`, `GlobalStyles` y la lectura de PIN en
  `services/settings.js`. Las vistas heredadas quedaron con la paleta de marca.
- **Cambio respecto de 5.1.0.1:** no se usan invitaciones por correo, porque el
  SMTP por defecto de Supabase solo entrega correos al equipo del proyecto. El
  administrador define una contraseña temporal, que se muestra una sola vez, y
  la persona debe cambiarla en su primer ingreso. "Olvidé mi contraseña" se
  resuelve con el restablecimiento hecho por un administrador.
- Probado de punta a punta en escritorio y móvil:
  - Redirección a `/login` sin sesión y error con contraseña incorrecta.
  - Cambio obligatorio de la contraseña temporal.
  - Crear un colaborador, restablecer su contraseña y bloquear la degradación
    del último administrador.
  - El colaborador solo ve Pedidos, Nuevo pedido y Cocina, y es redirigido si
    entra a Reportes o Usuarios.
  - Al desactivarlo, se cierra su sesión abierta y no puede volver a entrar;
    luego se reactiva.
- Cuentas de prueba en desarrollo: `agente.pruebas@example.com` (administrador)
  y `colab.pruebas@example.com` (colaborador). Eliminarlas antes de entregar.
- Pendiente para producción, en este orden y con autorización:
  1. Desactivar "Allow new users to sign up" en Supabase Auth.
  2. Aplicar la migración.
  3. Desplegar la función.
  4. Crear el primer administrador y las cuentas del personal.
  5. Recién después, desplegar el frontend, porque al publicarlo desaparecen
     los PIN.

**Etapa C · Seguridad en base de datos (migración incremental)**
- RLS: `anon` solo lee el catálogo y crea pedidos; `colaborador` y
  `administrador` gestionan pedidos según la matriz 5.1.0; solo `administrador`
  escribe en el catálogo, la configuración y los usuarios.
- RPC `create_order(...)` que inserte `orders` y `order_items` **en una sola
  transacción**. Esto también resuelve la deuda del punto 1.3.
- Como la carta pública ya no crea pedidos (los envía por WhatsApp), `anon`
  **no necesita leer ni escribir** `orders` ni `order_items`. Las políticas
  pueden cerrarse por completo para el público y la RPC de cupos deja de ser
  necesaria. `create_order` queda para uso autenticado desde el panel.
- Sacar los PIN de `app_settings`, o bloquear esas columnas para `anon`.
- Aplicar primero en Pedidos Desarrollo con `npx supabase db push` (confirmar
  antes el enlace con `npx supabase projects list`). En producción, solo con
  respaldo y autorización explícita, y **el mismo día** que se despliega el
  frontend compatible.

**Etapa D · Autoadministración (CMS en el panel)**
- Migración incremental: `products.image_url`, `categories.active`, datos de
  contacto y horario en `branches`, tabla `site_slides` y buckets de Storage con
  políticas de lectura pública y escritura solo para `administrador`.
- Pantallas `/panel/carta`, `/panel/promociones` y `/panel/sitio` según la tabla
  5.1.1, usables desde el celular.
- La landing y la carta pública leen fotos, slides y textos desde Supabase, sin
  contenido fijo en el código.
- La tarjeta de producto en `/carta` pasa a la grilla con foto de la referencia.
- Desde este punto, **la base de datos es la fuente de verdad de la carta**. El
  seed de `generate-schema.mjs` sirve solo para instalaciones nuevas y **nunca**
  debe volver a ejecutarse en producción, porque borraría lo que edite el
  cliente. Hay que actualizar el README con esta regla.

**Estado de la Etapa D (24 sep 2026): implementada y probada en Pedidos
Desarrollo, sin commit.**
- Migraciones `20260924200000_site_cms.sql` y
  `20260924201000_cms_storage_select.sql`, aplicadas solo en desarrollo:
  - Columnas `products.image_url` y `categories.active`, y datos de contacto
    en `branches`.
  - Tablas `site_content` y `site_slides`, con el contenido inicial que tenía
    `src/content/site.js`.
  - Buckets públicos `product-images` y `site-media`.
  - Políticas `admin_write_*`: solo `administrador` escribe en el catálogo,
    la configuración y el sitio.
- `/panel/carta` tiene tres pestañas:
  - *Productos y promos*: foto, nombre, categoría, precio, piezas,
    descripción, sucursales, visibilidad, rolls y opciones a elegir.
  - *Categorías*: crear, renombrar, ordenar y ocultar.
  - *Cambios y extras*.
- `/panel/sitio` tiene tres pestañas:
  - *Portada*: slides con vista previa, foto o ilustración, orden y
    visibilidad.
  - *Locales*.
  - *Datos del negocio*: horario, Instagram, WhatsApp, delivery, cupos, días
    cerrados y horarios de pedido.
- **Cambio respecto de 5.1:** no hay una ruta `/panel/promociones` aparte. Las
  promociones son productos de la categoría Promos y se editan con sus rolls y
  opciones en `/panel/carta`.
- Las categorías Promos, Rolls y Handrolls no se pueden renombrar, porque
  "Nuevo pedido" les da un comportamiento especial.
- Las fotos se comprimen en el navegador a WebP (1200 px para productos y
  1600 px para slides; en la prueba, 87 KB quedaron en 18 KB). Al reemplazarlas
  o eliminarlas se borran del Storage.
- La landing, Locales y el footer leen desde Supabase, con respaldo en
  `src/content/site.js` si la consulta falla.
- Probado de punta a punta:
  - Editar el precio y la foto de Promo 1 se ve en la carta pública, y luego se
    revierte.
  - Crear un producto con rolls y sucursales, y eliminarlo.
  - Editar un slide se ve en la portada, y luego se revierte.
  - `anon` no puede escribir: el PATCH afecta 0 filas y el INSERT se rechaza
    con 401 por RLS.
  - El móvil no tiene scroll horizontal.
- Bug encontrado y corregido: `step="100"` en los precios hacía que el navegador
  bloqueara en silencio los precios que no eran múltiplos de 100.
- Pendiente: una imagen subida y descartada sin guardar queda huérfana en el
  Storage (impacto bajo).

Orden sugerido: A → B → C → D. D depende de B (roles) y de C (políticas de
escritura). La landing de la etapa A se construye desde el inicio leyendo datos,
aunque al comienzo sean placeholders, para no rehacerla en D.

### 5.3 Fuera de alcance de este PRD

- Pagos en línea, cuentas de clientes, favoritos y "repetir pedido" con
  historial. El botón de Niu depende de cuentas de usuario.
- App móvil (el banner "App Niu" no se replica).
- Supabase Realtime en cocina o admin (queda como mejora futura).
- Cambios de carta, precios o reglas de negocio.

---

## 6. Criterios de aceptación

- [ ] `/` muestra la landing con logo, colores y nombre de Sushi Loncoche,
      usable en escritorio y en móvil (390 px) sin scroll horizontal.
- [ ] Desde la landing se llega a la Carta en un clic o toque.
- [ ] En `/carta` se arma un carrito, se elige sucursal y tipo, y el botón abre
      WhatsApp con el detalle y el total correctos (incluido el despacho).
- [ ] Los productos agotados se ven marcados y no se pueden agregar.
- [ ] Desde `/panel/nuevo-pedido` se registra un pedido de retiro y otro de
      delivery contra **Pedidos Desarrollo**, y ambos aparecen en Pedidos y en
      Cocina.
- [ ] Sin sesión, ninguna URL de `/panel/*` es accesible (redirige a `/login`).
- [ ] Cada rol ve solo lo que le corresponde según la matriz 5.1.0.
- [ ] Un administrador crea un colaborador, le cambia el rol, lo desactiva y le
      restablece la contraseña desde `/panel/usuarios`; el colaborador
      desactivado no puede entrar.
- [ ] Ningún PIN ni dato de pedido se descarga en el sitio público (se revisa
      en la pestaña Network).
- [ ] Con la clave `anon` no se pueden leer, editar ni borrar pedidos
      (probado con `curl` en desarrollo).
- [ ] Un `administrador` crea un producto con foto, precio y descripción desde
      el panel, y aparece en `/carta` sin intervención de un desarrollador.
- [ ] Un `administrador` edita una promoción y un slide del hero, y el cambio se
      ve en el sitio al recargar.
- [ ] Un `colaborador` gestiona pedidos pero no puede modificar la carta, el sitio ni los usuarios,
      tampoco llamando a la API directamente.
- [ ] Desactivar un producto con pedidos previos no rompe esos pedidos en
      Admin ni en Reportes.
- [ ] `npm run lint` y `npm run build` pasan.
- [ ] Recargar `/carta` o `/panel/cocina` en Vercel no da 404.

---

## 7. Riesgos

| Riesgo | Mitigación |
|---|---|
| El Preview de Vercel escribe en producción | Cambiar las variables de Preview a Pedidos Desarrollo **antes** de abrir el PR |
| La migración RLS rompe el sitio público si se aplica antes que el frontend | Desplegar en orden (frontend compatible → migración) y probar todo en desarrollo primero |
| El personal pierde acceso el día del cambio | Crear las cuentas y entregar las credenciales antes del despliegue; mantener un usuario admin de respaldo |
| Logo de baja calidad (solo existe una captura) | Pedir el archivo original (SVG o PNG con transparencia) |
| Faltan fotos propias para el hero y la carta | Usar placeholders marcados como demostrativos hasta recibir material |
| Alguien vuelve a ejecutar el seed y borra lo que editó el cliente | Documentar en el README que la base es la fuente de verdad; separar el seed de las migraciones |
| Fotos pesadas agotan el Storage gratuito (1 GB) | Redimensionar y comprimir en el navegador antes de subir (por ejemplo, WebP a 1200 px como máximo) |
| El cliente borra un producto con historial | El panel ofrece "desactivar"; el borrado real solo si no tiene pedidos |
| Desarrollo pausado por inactividad | Reanudar desde el dashboard; evaluar Supabase local con Docker |

---

## 8. Pendientes con el cliente

- [ ] Logo en alta resolución o vectorial y código de color oficial.
- [ ] Fotografías de productos y del local para el hero y la carta.
- [ ] Confirmar horarios, direcciones y teléfonos de ambas sucursales.
- [ ] Textos del hero (lema o eslogan propio).
- [ ] Lista del personal que necesita acceso, con su correo y su rol
      (`administrador` o `colaborador`).
- [ ] Confirmar qué días abre realmente cada sucursal (Instagram dice martes a
      sábado; el sistema tiene el martes cerrado).
- [ ] Links de redes sociales (Instagram confirmado: `@sushi.loncoche`).
- [ ] Quién administrará la carta y el sitio (una o varias personas, y si cada
      sucursal gestiona su propia carta).
- [ ] Si las promociones tienen vigencia (fecha de inicio y término) o se
      activan a mano.

---

## 9. Bitácora

| Fecha | Quién | Qué |
|---|---|---|
| 14 sep 2026 | Agente + Bruno Veinz | Se crea el proyecto Supabase Pedidos Desarrollo, se aplica la migración inicial y se crea la rama `feature/frontend-propuesta-fase-1` (ver `AGENTS.TXT`) |
| 24 sep 2026 | Agente + Bruno Veinz | Se reanuda Pedidos Desarrollo, que estaba pausado por inactividad del plan Free |
| 24 sep 2026 | Agente | Se analiza la referencia de Niu Sushi (capturas en `agents/media/referencias/niu-sushi/`), se revisa el estado de la app y se redacta este PRD |
| 24 sep 2026 | Bruno Veinz (requisito) · Agente (PRD) | Nuevo requisito: el sitio debe ser autoadministrable desde el login (carta, promociones, fotos, precios, descripciones). Se verifica que hoy la carta solo se cambia editando SQL y que no hay fotos ni Storage. Se agrega la Etapa D |
| 24 sep 2026 | Bruno Veinz (requisito) · Agente (PRD) | Se definen dos roles: `administrador` (todo) y `colaborador` (gestión de pedidos). Reemplazan los PIN de admin, cocina y reportes. Se agregan la matriz de permisos 5.1.0 y la ruta `/panel/usuarios` |
| 24 sep 2026 | Bruno Veinz (decisión) · Agente (PRD) | Colaborador: puede eliminar y editar pedidos y marcar productos agotados. Reportes, solo el administrador. Queda pendiente definir quién abre días cerrados |
| 24 sep 2026 | Bruno Veinz (decisión) · Agente (PRD) | El colaborador también puede abrir días cerrados. El administrador tiene permisos globales y gestiona las cuentas del equipo desde el panel (sección 5.1.0.1). PRD aprobado para comenzar la Etapa A |
| 24 sep 2026 | Agente | Etapa A implementada en local: landing, carta, locales, 404, panel temporal en `/panel` y rewrite de Vercel. Se verificó en escritorio (1440 px) y móvil (390 px) contra Pedidos Desarrollo, sin scroll horizontal ni errores de consola; `npm run lint` y `npm run build` pasan |
| 24 sep 2026 | Bruno Veinz (decisión) · Agente | La carta pública pasa a ser una grilla al estilo de Niu Sushi con carrito que envía el pedido por WhatsApp. El formulario por pasos queda como herramienta interna en el panel ("Nuevo pedido", hoy con PIN de admin). Consecuencia: el público deja de escribir en la base, lo que simplifica la Etapa C. Verificado en escritorio y móvil, sin errores |
| 24 sep 2026 | Agente | Etapa B implementada: login con Supabase Auth, roles `administrador` y `colaborador`, gestión de cuentas vía Edge Function `manage-staff`, cambio obligatorio de contraseña temporal y eliminación de los PIN en el frontend. Migración y función aplicadas solo en Pedidos Desarrollo. Pruebas de punta a punta superadas. Invitaciones por correo reemplazadas por contraseña temporal (limitación del SMTP de Supabase) |
| 24 sep 2026 | Bruno Veinz · Agente | Bruno crea su usuario en Supabase Auth (Pedidos Desarrollo) y el agente le asigna el perfil `administrador` por SQL, registrado en `staff_audit` como `bootstrap_admin`. Así se crea el primer administrador; los siguientes se crean desde /panel/usuarios |
| 24 sep 2026 | Bruno Veinz (requisito) · Agente | Etapa D implementada antes que la C, a pedido de Bruno: autoadministración de la carta (productos, promos, fotos, precios, categorías y extras) y del sitio (portada, locales y datos del negocio) desde el panel. README actualizado: la base de datos es la fuente de verdad. Pruebas de punta a punta superadas en Pedidos Desarrollo |
| 24 sep 2026 | Bruno Veinz (decisión) · Agente | El logo dice "SUSHI LONCOCHE", sin punto; el punto corresponde solo al usuario de Instagram |
| 24 sep 2026 | Agente | Se crea `AGENTS.md` en la raíz del repositorio con la arquitectura, las ramas, las tecnologías, la base de datos, los roles, el estado de las etapas y las reglas para agentes. Se integra y elimina `AGENTS.TXT` (notas del 14 sep). El `AGENTS.md` del workspace apunta al nuevo archivo |
| 24 sep 2026 | Agente | Commit `b1ff0c1` con las Etapas A, B y D. Se bloquean los despliegues de Vercel para `feature/frontend-propuesta-fase-1` (`git.deploymentEnabled` en `vercel.json`) y se hace push de la rama a GitHub, sin despliegue |
| 28 sep 2026 | Bruno Veinz (informado) · Agente | El formulario de pedido heredado nunca lo usó el cliente final: siempre lo operó solo el equipo de trabajo. Moverlo a "Nuevo pedido" en el panel no cambia la operación y la carta pública con WhatsApp es un canal nuevo. Se descarta el pendiente de confirmar el cambio de canal con el cliente |
| 28 sep 2026 | Bruno Veinz (decisión) · Agente | Al iniciar sesión el panel abre en "Nuevo pedido" en vez de "Pedidos". Se elimina el cambio obligatorio de contraseña: el administrador define la contraseña y la persona entra directo; puede cambiarla cuando quiera en /panel/cuenta. `manage-staff` deja `must_change_password` en `false` |
