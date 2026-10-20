# AGENTS.md · Sushi Loncoche (repositorio `sushi-vercel`)

Contexto técnico para cualquier persona o agente de IA que trabaje en este
repositorio. **Léelo completo antes de cambiar código, base de datos o
despliegues.** Actualízalo cuando cambie una decisión, una ruta, una tabla o el
estado de una etapa.

- Última actualización: 19 de octubre de 2026 (Etapa 1 del PRD 02).
- Documento de producto vigente: [`agents/PRD/02-gestion-interna-y-pedidos-online.md`](agents/PRD/02-gestion-interna-y-pedidos-online.md)
  (fase 2). El anterior, [`01-landing-page-y-login.md`](agents/PRD/01-landing-page-y-login.md),
  queda como registro de la fase 1. Cada PRD tiene sus etapas, criterios de
  aceptación y bitácora.
- Contexto del cliente y del incidente original: `../AGENTS.md`, en la raíz del
  workspace, fuera de este repositorio.

Convención: **[Verificado]** = comprobado en código, base o navegador.
**[Informado]** = lo dijo el equipo o el cliente. **[Por confirmar]** = supuesto
pendiente.

---

## 1. Qué es

Sitio y sistema de pedidos de **Sushi Loncoche**, un restaurante con dos
sucursales en Chile: **Loncoche** y **La Paz** (Sushi Bar Ruta 5).

El sistema heredado era una sola página con cuatro vistas (cliente, admin,
cocina y reportes) protegidas por PIN. La fase 1 lo reemplazó por una nueva
versión, que **ya está en `main` y en producción** en
<https://www.sushiloncoche.cl/> desde el PR #2 (28 sep 2026):

1. **Landing pública** al estilo de la de Niu Sushi (<https://www.niusushi.cl/>),
   con la identidad de Sushi Loncoche.
2. **Carta pública** en grilla, con carrito, que **envía el pedido por
   WhatsApp**. El público no crea pedidos en la base.

**[Informado por Bruno Veinz, 28 sep 2026]** El formulario de pedido heredado
**nunca lo usó el cliente final**: siempre lo usó solo el equipo de trabajo para
registrar pedidos. Por eso mover ese formulario al panel ("Nuevo pedido") no
cambia la operación, y la carta pública con WhatsApp es un canal nuevo, no un
reemplazo de uno que usara el público.
3. **Panel interno detrás de un login real** (Supabase Auth), con los roles
   `administrador` y `colaborador`. Los PIN desaparecen.
4. **Sitio autoadministrable:** el administrador edita la carta, las fotos, los
   precios, las promos, la portada, los locales y los datos del negocio desde el
   panel.

---

## 2. Git y ramas

| Rama | Estado |
|---|---|
| `main` | Producción (Vercel). Incluye el PR #1 (`fix/order-number-conflict`, merge `2e47894`) y el PR #2 (`feature/frontend-propuesta-fase-1`, merge `c046d0b`, 28 sep 2026), con las Etapas A, B y D del PRD 01. **No commitear directo.** |
| `fase-2` | **Rama de trabajo actual** (solo local, sin push). Se creó desde `main` en `c046d0b` el 1 oct 2026 para el PRD 02 (gestión interna y pedidos online con cuenta). |
| `fix/order-number-conflict` | Ya fusionada en `main` (PR #1). |
| `feature/frontend-propuesta-fase-1` | Ya fusionada en `main` (PR #2). |

- **Vercel tiene bloqueadas las ramas de trabajo:** `vercel.json` tiene
  `git.deploymentEnabled` en `false` para `feature/frontend-propuesta-fase-1`
  y `fase-2` (Etapa 0 del PRD 02, 19 oct 2026), para que un push no genere un
  Preview conectado a la base de producción.
- Remoto: <https://github.com/soportecastrocastillogroup-create/sushi-vercel>. El
  repositorio es **público**, así que no se deben subir secretos. Las capturas
  de Niu en `agents/media/referencias/` quedarían visibles.
- La raíz del workspace (`../`) no es un repositorio Git. `../propuesta/` es un
  prototipo aparte, sin relación con el despliegue.
- Commitear o hacer push solo cuando el usuario lo pida. Mensajes en español.

---

## 3. Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend | React 19.2 y Vite 8 (SPA estática), con `react-router` 7 en modo declarativo (`BrowserRouter`) |
| Estilos | CSS propio con tokens en `:root` (`src/styles/site.css` y `src/styles/panel.css`). Las vistas heredadas usan estilos inline |
| Tipografías | Bebas Neue (títulos) y Outfit (texto), desde Google Fonts en `index.html` |
| Backend | Supabase: Postgres 17, Auth, Storage, RLS y Edge Functions (Deno) |
| Cliente de datos | `@supabase/supabase-js` 2 (`src/lib/supabase.js`) |
| Hosting | Vercel, sitio estático. `vercel.json` hace rewrite de todo a `index.html` |
| Lint | ESLint 10 con `react-hooks` 7 (incluye `set-state-in-effect`) y `react-refresh` |
| Node | v22 (local) |

Pruebas automatizadas (`node:test`, sin dependencias nuevas):
- `npm test`: unitarias de `tests/unit/` (cupos y fechas de `utils/dates.js`,
  fórmula de `utils/caja.js`).
- `npm run test:db`: integración de `tests/db/` contra **Pedidos Desarrollo**
  (RLS de pedidos, `create_order`, cupos, pedidos simultáneos, inventario y
  caja).
  La conexión está en `tests/db/helpers.js`. Necesita
  `.env.local` y `credenciales-prueba.local`, se niega a correr contra otro
  proyecto, usa una fecha de 2031 y borra lo que crea (consume números de
  pedido).

Además, `npm run lint`, `npm run build` y pruebas de navegador (puppeteer-core
con Chrome o Brave, instalado en el scratchpad, no en el repositorio).

---

## 4. Entornos y Supabase

| Proyecto | Ref | Uso |
|---|---|---|
| **Pedidos** | `caaqivncmufjrslrqejx` | **Producción. No tocar sin autorización explícita y respaldo.** |
| **Pedidos Desarrollo** | `ikzprpnpyvbwsxiqprdt` | Desarrollo. Aquí se aplican y prueban todas las migraciones. |

- `.env.local` (ignorado por Git) apunta a **Pedidos Desarrollo**. Variables:
  `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (Vite, no `NEXT_PUBLIC_*`).
- Supabase CLI (`npx supabase`, v2.117) está **enlazado solo con Pedidos
  Desarrollo** (`supabase/.temp/project-ref`). Antes de cualquier `db push` o
  `functions deploy`, confirmar con `npx supabase projects list` que
  `linked: true` esté en Pedidos Desarrollo.
- **Plan Free:** Pedidos Desarrollo se **pausa tras unos 7 días sin uso**. Se
  nota porque el dominio responde NXDOMAIN o la app muestra "TypeError: Load
  failed". Se reanuda desde el dashboard con "Resume project" y demora algunos
  minutos.
- El SMTP por defecto de Supabase solo envía correos a los miembros del equipo
  del proyecto. **No depender de correos de invitación ni de recuperación.**
- **Vercel Preview usa las variables de producción** [según `../AGENTS.md`]. Un
  Preview de esta rama escribiría en la base real. **Antes de abrir un PR hay
  que cambiar las variables de Preview a Pedidos Desarrollo.**

---

## 5. Arquitectura del frontend

```
src/
├── App.jsx                 Rutas; AuthProvider envuelve todo; el panel se carga con lazy()
├── main.jsx                Entrada; importa index.css y styles/site.css
├── lib/supabase.js         Cliente Supabase (sesión persistente)
├── context/
│   ├── AuthProvider.jsx    Sesión y perfil de staff_profiles; signIn/signOut
│   ├── auth-context.js     useAuth()
│   ├── CartProvider.jsx    Carrito público (localStorage "sushiloncoche.cart.v1") y sucursal
│   └── cart-context.js     useCart()
├── pages/                  Público: Landing, Menu (/carta), Locales, Login, NotFound
├── components/
│   ├── site/               Header, Footer, Hero, Carrito, Modal, Brand (logo), RollArt, etc.
│   ├── customer/           CustomerView: formulario por pasos heredado (ahora "Nuevo pedido")
│   ├── admin/              AdminView heredado (Pedidos, Días, Stock, Pedido manual)
│   ├── kitchen/            KitchenView heredado
│   ├── reportes/           ReportesView heredado
│   └── shared/             OrderCard y Comanda (impresión)
├── panel/                  Panel: PanelLayout (guarda y menú), secciones, Carta, Sitio, Usuarios, Cuenta
├── hooks/                  useOrderingData (datos del panel), usePublicMenu, usePublicSite, etc.
├── services/               Acceso a Supabase: catalog, orders, settings, stock, dates, site, cms, staff
├── content/site.js         Contenido de respaldo de la landing, si Supabase falla
├── styles/                 site.css (público y login) y panel.css
└── utils/                  format, cart, dates, image (compresión WebP), whatsapp, whatsappOrder
```

### Rutas

| Ruta | Acceso | Componente |
|---|---|---|
| `/` | Público | `LandingPage` → `HeroCarousel` (slides desde `site_slides`) |
| `/carta` | Público | `MenuPage`: grilla por sucursal y categoría, buscador, `ProductModal` y `CartDrawer`, que envía el pedido por WhatsApp |
| `/locales` | Público | `LocalesPage` (datos desde `branches`) |
| `/login` | Público | `LoginPage` |
| `/panel` | Sesión y perfil activo | `PanelLayout` → redirige a `/panel/nuevo-pedido` |
| `/panel/pedidos` | Ambos roles | `AdminView` heredado con `OrdersKanban`: un día y una sucursal, una columna por bloque de una hora con su ocupación; cambiar estado, abrir detalle (`OrderCard`) y mover de bloque (arrastrar o "⏰") |
| `/panel/nuevo-pedido` | Ambos roles | `CustomerView` heredado |
| `/panel/cocina` | Ambos roles | `KitchenView` heredado |
| `/panel/carta` | `administrador` | `CartaAdminPage` (productos y promos, categorías, extras) |
| `/panel/sitio` | `administrador` | `SitioAdminPage` (portada, locales, datos del negocio) |
| `/panel/reportes` | `administrador` | `ReportesView` heredado |
| `/panel/usuarios` | `administrador` | `UsersPage` |
| `/panel/inventario` | Ambos roles | `InventarioPage`: planilla del día por sucursal (ingreso, uso, merma y conteo), movimientos (filtros, editar y borrar) e Insumos (solo administrador). Badge rojo en el menú con los críticos bajo el mínimo (`useInventoryAlerts`) |
| `/panel/caja` | Ambos roles | `CajaPage`: cuadratura por sucursal y día (sistema, lo declarado, resultado en vivo con `utils/caja.js`, cerrar o editar el cierre, cierres anteriores) |
| `/panel/cuenta` | Ambos roles | `AccountPage`: cambio de contraseña opcional |

### Flujo de datos

- **Sitio público:** `SiteLayout` carga `useSettings` (sin PIN),
  `usePublicMenu` (productos, sucursales y stock; **no descarga pedidos**) y
  `usePublicSite` (slides, locales, horario e Instagram, con respaldo en
  `content/site.js`). Todo se pasa por el `Outlet` context.
- **Panel:** `PanelLayout` verifica la sesión con `useAuth` y carga
  `useOrderingData()` (catálogo, configuración, stock, fechas y pedidos). Luego
  lo pasa a las secciones por el `Outlet` context. Carta y Sitio cargan sus
  propios datos de edición (`services/cms.js`) y llaman a `refreshAll()` al
  guardar.
- **Pedido público:** el carrito arma el mensaje con `utils/whatsappOrder.js` y
  abre `wa.me/<app_settings.whatsapp_num>`. El equipo lo registra después en
  "Nuevo pedido" o en "+ Pedido manual".

### Convenciones de código

- Los componentes nuevos usan clases CSS con tokens (`--brand-red: #bf2020`,
  `--accent: #e53935`, `--bg`, `--surface`, `--line`, `--font-display`,
  `--font-body`).
- En las vistas heredadas se reemplazó la paleta verde y dorada por neutros y el
  rojo de marca. Su **lógica no cambió**. No reescribirlas sin necesidad: el
  cliente usa y valora ese flujo.
- ESLint prohíbe `setState` síncrono dentro de `useEffect`. Hay que cargar datos
  con `.then()` y un flag `cancelled`.
- Los archivos con componentes solo exportan componentes (react-refresh). Los
  hooks y contextos van en archivos aparte (`*-context.js`, `useFlash.jsx`).
- Textos de la interfaz en español de Chile. Precios en CLP enteros con
  `fmt()`. Los campos de precio usan `step="1"`, porque `step="100"` bloqueaba
  precios como $6.990.

---

## 6. Base de datos

Migraciones en `supabase/migrations/`, todas aplicadas **solo en Pedidos
Desarrollo**:

| Migración | Contenido |
|---|---|
| `20260914181409_initial_schema.sql` | Esquema heredado y seed: sucursales, categorías, productos, rolls y opciones de promo, personalizaciones, `app_settings`, horarios, días bloqueados, stock, fechas desbloqueadas, `orders` y `order_items`. Políticas `anon` amplias |
| `20260924190000_staff_auth.sql` | `staff_profiles`, `staff_audit`, las funciones `staff_role()`, `is_staff()`, `is_admin()` y `mark_password_changed()`, y políticas `authenticated` (lectura del catálogo; `staff_all_*` en operación) |
| `20260924200000_site_cms.sql` | `products.image_url` y `categories.active`; datos de contacto en `branches`; `site_content` y `site_slides` con su contenido inicial; políticas `admin_write_*`; buckets `product-images` (2 MB) y `site-media` (3 MB) |
| `20260924201000_cms_storage_select.sql` | Lectura de objetos de Storage para administradores, necesaria para poder borrar fotos |
| `20261019180000_secure_orders.sql` | PRD 02 · Etapa 1: quita `anon_all_*` (en `product_stock` `anon` queda solo con lectura); el personal lee, edita y borra pedidos, pero los crea solo con `create_order()`; revoca `get_next_order_number()`; elimina las columnas de PIN |
| `20261019190000_hourly_capacity.sql` | PRD 02 · Etapa 2: `branches.cupo_por_hora` (reemplaza a `app_settings.max_por_horario`, que se elimina); `hora_bloque()`; `create_order(p_order, p_items, p_forzar)` valida el cupo del bloque de una hora por sucursal (cuenta todos los estados) y rechaza con `SL409` y `detail` `{hora, pedidos, cupo}`; `p_forzar` deja pasarse del cupo |
| `20261019200000_slots_until_22.sql` | Franjas base de 17:00 a 22:00 cada 15 min: solo agrega las que falten y reordena; no borra las configuradas |
| `20261020000000_inventory.sql` | PRD 02 · Etapa 3: `inventory_items`, `inventory_item_branches` (mínimo por sucursal) e `inventory_movements` (con signo por tipo; autoría por trigger); `inventory_semaforo()`, vista `inventory_stock` (`security_invoker`) y `inventory_daily(branch, fecha)`. RLS: personal lee todo y escribe movimientos; administrador configura insumos |
| `20261020010000_cash_closings.sql` | PRD 02 · Etapa 4: `branches.pago_repartidor` (2000, editable en Locales); `cash_closings` (uno por sucursal y día, con las cifras del momento; sin INSERT/UPDATE directos, borra solo el administrador); `cash_summary(branch, fecha)` y `save_cash_closing(branch, fecha, declarado)` (`security definer`, exigen `is_staff()`). La tarifa del repartidor queda fija desde el primer cierre |

### Datos clave

- Los pedidos se crean **solo** con `create_order(p_order jsonb, p_items jsonb)`
  (`security definer`, exige `is_staff()`): valida sucursal, tipo, fecha,
  horario e ítems, calcula el total (como `utils/cart.js`, con el
  `costo_delivery` vigente), toma un bloqueo por sucursal, fecha y hora, e
  inserta pedido e ítems en una transacción. Devuelve el pedido con
  `order_items`. Todavía no valida cupos (Etapa 2) ni recalcula precios desde
  el catálogo (Etapa 5).
- `orders.order_number` usa `get_next_order_number()`, que solo se llama desde
  `create_order()`.
- **Cupo por hora [PRD 02 · Etapa 2]:** `branches.cupo_por_hora` (editable en
  `/panel/sitio` → Locales). El bloque es la hora completa (20:00–20:59) en esa
  sucursal y cuentan todos los pedidos, también los completados. Lo valida
  `create_order()`; el panel puede pasarse con confirmación (`p_forzar`), hoy
  ambos roles [Por confirmar con el cliente si el colaborador también].
  En el frontend: `cupoDe`, `pedidosEnHora`, `getHorariosDisponibles` y
  `proponerHorarios` en `utils/dates.js`; `settings.cupoPorHora` por sucursal. `order_items` guarda una
  copia del nombre y el precio, y `product_id` **no tiene FK**. Borrar un
  producto no rompe el historial.
- Las sucursales se identifican por `branches.name` en los pedidos
  (`orders.sucursal`) y en el frontend. **No renombrar sucursales.**
- Las categorías **Promos, Rolls y Handrolls** tienen comportamiento especial en
  `ProductSelector` ("Nuevo pedido"). El panel no permite renombrarlas.
- Días cerrados por defecto en desarrollo: domingo, lunes y martes. [Por
  confirmar] Instagram dice "martes a sábado".
- **La base es la fuente de verdad de la carta y el sitio.** **Nunca** ejecutar
  `supabase/schema.sql` ni el seed de `scripts/generate-schema.mjs` sobre una
  base en uso: sobrescribe lo que editó el cliente. Los cambios de esquema van
  en una migración nueva.
- Las columnas de PIN de `app_settings` se eliminaron en desarrollo
  (`20261019180000_secure_orders.sql`). En producción siguen hasta publicar
  la fase 2. Sus valores (y los del seed) no se escriben en ninguna
  documentación.

### Seguridad (RLS)

| Quién | Qué puede hacer hoy (Pedidos Desarrollo) |
|---|---|
| `anon` | Leer el catálogo, la configuración, el sitio y `product_stock`. **Sin acceso** a `orders`, `order_items` ni `unlocked_dates` (PRD 02 · Etapa 1, 19 oct 2026; en producción sigue abierto hasta publicar) |
| `authenticated` activo con rol | `is_staff()`: operación diaria (stock y fechas; pedidos: leer, editar y borrar, y crear solo con `create_order()`) |
| `administrador` | `is_admin()`: además escribe el catálogo, la configuración, el sitio y el Storage, y gestiona cuentas vía Edge Function |

- Cuentas: la Edge Function **`supabase/functions/manage-staff`** (desplegada en
  desarrollo) tiene las acciones `list`, `create`, `update`, `set_active` y
  `reset_password`.
  - Valida que quien llama sea administrador activo y usa `service_role` solo en
    el servidor.
  - Bloquea desactivarse a sí mismo y dejar el sistema sin administradores.
  - Desactivar una cuenta la banea en Auth y pone `active = false`, lo que corta
    el acceso de inmediato porque `is_staff()` revisa `active`.
- **No hay invitaciones por correo.** El administrador define la contraseña,
  que se muestra una sola vez, y la persona entra directo con ella. **No hay
  cambio obligatorio** (decisión de Bruno Veinz, 28 sep 2026: para una pyme chica
  era un paso de más). Cada persona puede cambiarla cuando quiera en
  `/panel/cuenta`. La columna `staff_profiles.must_change_password` sigue en la
  base, pero el frontend ya no la usa y `manage-staff` la deja en `false`.
- El primer administrador se creó a mano: el usuario creó su cuenta en el
  dashboard de Auth y se insertó su `staff_profiles` por SQL (registrado en
  `staff_audit` como `bootstrap_admin`). Los siguientes se crean desde
  `/panel/usuarios`.

---

## 7. Roles (decisión del cliente, vía Bruno Veinz)

| Permiso | Administrador | Colaborador |
|---|:---:|:---:|
| Ver pedidos, cambiar estados, crear, editar y **eliminar** pedidos | ✅ | ✅ |
| Cocina e impresión de comanda | ✅ | ✅ |
| Marcar productos agotados | ✅ | ✅ |
| Abrir días cerrados | ✅ | ✅ |
| Reportes | ✅ | ❌ |
| Carta, precios, fotos, promos y sitio | ✅ | ❌ |
| Gestionar cuentas y roles | ✅ | ❌ |

---

## 8. Identidad y contenido

- Nombre en el logo: **SUSHI LONCOCHE**, sin punto. El punto es solo del
  usuario de Instagram `@sushi.loncoche`.
- Colores: negro `#000`, rojo de marca ≈ `#BF2020` (muestreado de una captura;
  falta el código oficial) y blanco.
- El logo actual es **provisional**, redibujado en `components/site/Brand.jsx`
  a partir de `agents/identity/logo.jpeg`. Falta el archivo original.
- Mientras no haya fotos, los productos y slides muestran `RollArt` (una
  ilustración vectorial provisional). **No usar recursos de Niu Sushi** (fotos,
  ilustraciones, textos ni la fuente `adineue-PRO`): se copia solo la
  estructura.
- No inventar precios, productos, horarios ni datos de contacto. Los datos
  tomados de Instagram están marcados como por confirmar en el PRD.

---

## 9. Estado de las etapas (PRD 01)

| Etapa | Estado |
|---|---|
| A · Landing, rutas, carta pública con WhatsApp, locales | ✅ Implementada y verificada en local |
| B · Login, roles, panel, gestión de cuentas, sin PIN | ✅ Implementada y probada contra Pedidos Desarrollo |
| D · Autoadministración (carta, fotos, promos, portada, locales, negocio) | ✅ Implementada y probada contra Pedidos Desarrollo |
| C · Cerrar el acceso de `anon` a pedidos, `create_order` transaccional y borrar las columnas de PIN | ✅ Aplicada en Pedidos Desarrollo como Etapa 1 del PRD 02 (19 oct 2026). Pendiente en producción |

**[Verificado, 1 oct 2026]** El frontend de las Etapas A, B y D **ya está en
producción**: el PR #2 se fusionó en `main` el 28 sep 2026 y
<https://www.sushiloncoche.cl/> sirve la versión nueva (logo y tipografías
nuevas). La Etapa C **no** se aplicó, porque no está en el código.

**[Informado por Bruno Veinz, 1 oct 2026]** Producción está funcionando bien:
la base, `manage-staff` y las cuentas del personal están operativas. Queda
pendiente solo la Etapa C (paso 5). Orden que se definió para publicar:

1. Desactivar "Allow new users to sign up" en Auth de producción.
2. Aplicar las migraciones en Pedidos (producción).
3. Desplegar `manage-staff` en producción.
4. Crear el primer administrador y las cuentas del personal.
5. Aplicar la Etapa C.
6. Cambiar las variables de Preview en Vercel a Pedidos Desarrollo, quitar el
   bloqueo de `git.deploymentEnabled` en `vercel.json` y abrir el PR.
7. Merge a `main` y verificar el despliegue `Ready`.

Al publicar el frontend dejan de existir los PIN, así que el personal necesita
sus cuentas **antes** del despliegue.

---

## 10. Pendientes y datos por confirmar

- Etapa C (seguridad de pedidos). En el PRD 02 pasa a ser la Etapa 1 y es
  obligatoria, porque los clientes con cuenta van a crear pedidos.
- **Fase 2 (correo del 1 oct y reunión del 12 oct 2026 con Jean y Vane; PRD 02
  reestructurado el 19 oct):** seguridad con `create_order`; cupos por hora
  configurables por sucursal y kanban de pedidos por bloque horario; inventario
  diario de insumos; cuadratura de caja; cuentas de clientes (sin cuenta se pide
  por WhatsApp; con cuenta el pedido se guarda y además llega por WhatsApp);
  Susheros por correo; dashboard del administrador; cierre de cocina. **No hay
  áreas por persona:** se mantienen los dos roles. Cambia dos supuestos de este
  archivo: el público pasará a crear pedidos y "Allow new users to sign up"
  deberá quedar activado en producción. Preguntas abiertas en la sección 9 del
  PRD 02.
- Eliminar las cuentas de prueba de desarrollo `agente.pruebas@example.com` y
  `colab.pruebas@example.com` antes de entregar.
- Del cliente: logo original y color oficial, fotos de productos y del local,
  dirección de Loncoche, horarios y días reales, textos del hero, y la lista del
  personal con su correo y rol.
- Hay dos formas de cargar pedidos a mano: "+ Pedido manual" dentro de Pedidos
  y "Nuevo pedido". Conviene preguntar cuál usan y dejar solo una.
- Las imágenes subidas y descartadas sin guardar quedan huérfanas en Storage
  (impacto bajo).
- Posible rediseño futuro de Pedidos y Cocina, más Realtime (hoy se actualiza a
  mano).

---

## 11. Comandos

```bash
npm install
npm run dev          # http://localhost:5173, contra Pedidos Desarrollo (.env.local)
npm run lint
npm run build
npm test             # unitarias
npm run test:db      # integración contra Pedidos Desarrollo

npx supabase projects list                     # confirmar que está enlazado con Pedidos Desarrollo
npx supabase migration list
npx supabase db push --linked --dry-run        # revisar antes de aplicar
npx supabase db push --linked
npx supabase db query --linked "select ..."    # consultas puntuales en desarrollo
npx supabase functions deploy manage-staff --project-ref ikzprpnpyvbwsxiqprdt --use-api
```

Cuentas de prueba (solo desarrollo): `scripts/seed-test-accounts.mjs` crea o
restablece `agente.pruebas@example.com` (administrador) y
`colab.pruebas@example.com` (colaborador) con contraseñas aleatorias, y las
guarda en `credenciales-prueba.local` (ignorado por Git, no se imprime). Se
niega a correr si la clave `service_role` no es de Pedidos Desarrollo. El
comando está en la cabecera del script.

---

## 12. Reglas para agentes

- Separar los hechos verificados de los supuestos. Registrar cada avance en la
  bitácora del PRD vigente (`agents/PRD/`). Una iniciativa nueva es un PRD
  nuevo con el siguiente número (`02-…`).
- Probar todo en **Pedidos Desarrollo**. Nunca ejecutar migraciones, crear
  datos de prueba ni hacer pedidos ficticios en producción sin autorización.
- Nunca escribir claves, tokens, PIN, contraseñas ni datos personales de
  clientes en archivos, commits o conversaciones. La clave `service_role` solo
  se usa dentro de comandos o de la Edge Function, sin imprimirla.
- Si una prueba modifica datos de desarrollo, revertirlos y comprobarlo.
- Mantener las interfaces usables en escritorio y móvil (390 px, sin scroll
  horizontal).
- Actualizar este archivo cuando cambie la arquitectura, las rutas, las tablas,
  los roles o el estado de las etapas.
