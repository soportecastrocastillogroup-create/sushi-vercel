# PRD 02 · Gestión interna y pedidos online con cuenta

| Campo | Valor |
|---|---|
| Fecha de creación | 1 de octubre de 2026 |
| Última reestructuración | 19 de octubre de 2026, tras la reunión del 12 de octubre |
| Estado | Borrador reestructurado, pendiente de revisión de Bruno Veinz |
| Pedido por | Jean y Vane (Sushi Loncoche): correo del 1 oct y reunión del 12 oct 2026 |
| Rama de trabajo | `fase-2` (creada desde `main` en `c046d0b`, solo local) |
| Base de datos de desarrollo | Supabase `Pedidos Desarrollo` (`ikzprpnpyvbwsxiqprdt`) |
| Base de datos de producción | Supabase `Pedidos` (`caaqivncmufjrslrqejx`). No se toca hasta publicar |
| PRD anterior | [PRD 01 · Landing page, login seguro y sitio autoadministrable](01-landing-page-y-login.md) |

Convención del documento: **[Verificado]** = comprobado en código, base de datos o sitio.
**[Informado]** = lo dijo el equipo o el cliente. **[Decidido]** = acordado con Bruno Veinz.
**[Por confirmar]** = supuesto que falta validar.

---

## 1. Qué pidió el cliente

### 1.1 Correo del 1 de octubre ("Dos brazos, un solo sistema")

Resumen, sin copiar el texto original.

- **Cocina:** inventario independiente por sucursal con movimientos, stock
  mínimo, insumos críticos, semáforo, alertas y un cierre de cocina sencillo.
  Todo editable sin depender del programador.
- **Administración:** cuadratura diaria con el pago al repartidor; base de
  clientes (**Susheros**) para segmentar y para email marketing futuro, con
  consentimiento; reportes de caja y de marketing.
- **Principio:** simple, visual, modificable, y la información se registra una
  sola vez y se reutiliza.

### 1.2 Reunión del 12 de octubre

- **Inventario por sucursal** de los insumos del local (arroz, pollo, camarón,
  ciboulette…): por ítem y fecha se anota lo que entra y lo que se ocupa, a
  mano y a diario, y el sistema va avisando. Debe quedar registro de quién
  anotó cada cosa.
- **Cuadratura de caja** y pedidos **ordenados por hora**.
- **Dashboard de gestión** para el administrador, con el movimiento de todo.
- **Cuentas de clientes:** solo quien tiene cuenta arma un carrito. Quien no
  tiene cuenta pide directo por WhatsApp. Al final todo llega por WhatsApp.
- **Restringir la demanda:** el sistema bloquea los horarios que ya están
  llenos.

---

## 2. Estado actual relevante

- **[Verificado]** El único "stock" que existe es `product_stock`: un sí o no
  de "agotado" por **producto de la carta**, igual para ambas sucursales. No
  hay insumos, cantidades ni movimientos.
- **[Verificado]** El público **no crea pedidos**: la carta pública arma el
  carrito sin cuenta y abre WhatsApp (`utils/whatsappOrder.js`). Los pedidos los
  crea el equipo en "Nuevo pedido" o en "+ Pedido manual".
- **[Informado por Bruno Veinz, 19 oct]** `app_settings.max_por_horario` (4,
  editable en `/panel/sitio`) se entiende y se usa como el máximo de pedidos
  **por hora**: el local se organiza por hora.
- **[Verificado]** El código no lo aplica así: `time_slots` tiene franjas de 15
  minutos (desde las 17:00) y `getHorariosDisponibles()`
  (`src/utils/dates.js:44`) cuenta los pedidos **por franja**, así que hoy una
  hora puede recibir hasta 4 × 4 pedidos. Además calcula los cupos **en el
  navegador**, **no distingue la sucursal** (suma los pedidos de ambas) y no
  cuenta los pedidos `completado`. Solo lo usa el formulario interno.
- **[Verificado]** Los estados de un pedido son `abierto`, `en_proceso`,
  `listo` y `completado`. No hay estado "anulado": un pedido se borra.
- **[Verificado]** Los pedidos guardan solo `cliente_nombre` y
  `cliente_telefono`, en texto libre. No hay correo, ni consentimiento, ni
  tabla de clientes.
- **[Verificado]** `app_settings.costo_delivery` es lo que se **cobra al
  cliente**. `ReportesView` recalcula el delivery de pedidos antiguos con el
  valor **actual**, aunque `orders.total` guarda el total del momento.
- **[Verificado]** El delivery solo acepta transferencia. El retiro acepta
  transferencia o "Pago al retirar" (`pago_contra_entrega`), que no distingue
  tarjeta de efectivo.
- **[Verificado]** Hay dos roles: `administrador` y `colaborador`.
- **[Verificado]** La Etapa C del PRD 01 sigue pendiente: `anon` todavía puede
  leer, escribir y borrar `orders`, `order_items`, `product_stock` y
  `unlocked_dates`.
- **[Informado]** El orden de publicación del PRD 01 incluía desactivar "Allow
  new users to sign up" en Auth de producción. Las cuentas de clientes de este
  PRD necesitan **volver a activarlo** (sección 5.5).

---

## 3. Decisiones tomadas

| Tema | Decisión | Estado |
|---|---|---|
| Permisos | Se mantienen los dos roles actuales. **No hay áreas ni tipos de colaborador**: basta con que el colaborador no vea lo del administrador | [Decidido, 19 oct] |
| Qué se inventaría | **Insumos**, sin relación con los productos de la carta | [Decidido] |
| Consumo de insumos | Se registra **a mano**, igual que un ingreso o una merma. No hay descuento automático por pedido (exigiría cargar recetas) | [Decidido] |
| Movimientos de inventario | Quien tenga acceso al panel puede registrar, editar y borrar movimientos, para corregir errores. Cada uno guarda quién lo creó y quién lo editó | [Decidido] |
| Pago al repartidor | Valor **distinto** del cobro de delivery al cliente, **editable por sucursal**, $2.000 inicial en ambas | [Decidido] |
| Cuadratura | Cuadratura de caja **completa** (sección 5.4), editable después de cerrada | [Decidido] |
| Cierre de cocina | Se mantiene | [Decidido, 19 oct] |
| Cuentas de clientes | Solo con cuenta se arma el carrito. Sin cuenta, el pedido va directo por WhatsApp | [Decidido, 19 oct] |
| Pedido con cuenta | Se **guarda en la base** (aparece en el panel) y **además llega por WhatsApp** | [Decidido, 19 oct] |
| Cupos | El administrador configura **cuántos pedidos caben en una hora** | [Decidido, 19 oct] |
| Horario lleno | Al cliente se le **proponen horarios más tarde** con cupo | [Decidido, 19 oct] |
| Vista de pedidos | **Kanban por día** con columnas por bloque horario, para colaboradores y administradores | [Decidido, 19 oct] |
| Identificador del Sushero | El **correo** | [Decidido] |
| Consentimiento | Check "Acepta recibir novedades y promociones por correo", desmarcado por defecto | [Decidido] |
| Dashboard | Solo administrador, con todas las sucursales | [Decidido, 19 oct] |
| Semáforo y segmentos | Como se proponen en las secciones 5.2 y 5.6, editables después | [Decidido] |
| Carga de datos | El cliente carga a mano los insumos, los mínimos, los críticos y el checklist de cierre desde el panel | [Decidido] |
| Login de clientes | Solo **correo y contraseña** escritos a mano. Sin Google ni otros proveedores | [Decidido, 19 oct] |
| Correos a clientes | **Sin SMTP**: no se confirma el correo ni se envían correos. Si alguien olvida su contraseña, escribe por WhatsApp y el administrador la restablece | [Decidido, 19 oct] |
| Extras de handrolls | **Fuera del alcance** por ahora | [Decidido, 19 oct] |

---

## 4. Quién ve qué y dónde va cada cosa

| Funcionalidad | Ruta propuesta | Colaborador | Administrador |
|---|---|:---:|:---:|
| Kanban de pedidos por bloque horario | `/panel/pedidos` | ✅ | ✅ |
| Nuevo pedido (actual) | `/panel/nuevo-pedido` | ✅ | ✅ |
| Cocina (actual) | `/panel/cocina` | ✅ | ✅ |
| Inventario, planilla diaria y movimientos | `/panel/inventario` | ✅ | ✅ |
| Cierre de cocina | `/panel/inventario/cierre` | ✅ | ✅ |
| Cuadratura de caja | `/panel/caja` | ✅ | ✅ |
| Configurar insumos, mínimos, críticos y checklist | Dentro de Inventario, en modo edición | ❌ | ✅ |
| Cupos por hora y pago al repartidor, por sucursal | `/panel/sitio` → Locales | ❌ | ✅ |
| Dashboard de gestión | `/panel/dashboard` | ❌ | ✅ |
| Susheros (incluye restablecer la contraseña de un cliente) | `/panel/susheros` | ❌ | ✅ |
| Reportes (actual) | `/panel/reportes` | ❌ | ✅ |

- La alerta de insumos críticos en rojo se muestra como badge en el menú
  "Inventario", igual que el contador de Pedidos.
- **[Decidido, 19 oct]** El administrador entra al panel en el Dashboard y ve
  todo. El colaborador sigue entrando en "Nuevo pedido".

---

## 5. Alcance detallado

### 5.1 Seguridad (Etapa C del PRD 01)

Pasa a ser **obligatoria y primera**, porque el público va a crear pedidos y la
base va a guardar correos.

- Quitar las políticas `anon_all_*` de `orders`, `order_items` y
  `unlocked_dates`. En `product_stock`, `anon` queda solo con lectura.
- Eliminar las columnas de PIN de `app_settings`.
- Función `create_order(...)` (`security definer`), **única vía** para crear un
  pedido, desde el panel o desde una cuenta de cliente. En una transacción:
  valida el cupo del bloque horario (sección 5.2), recalcula los precios desde
  el catálogo, asigna `order_number` e inserta el pedido y sus ítems. Toma un
  bloqueo por sucursal, fecha y hora para que dos pedidos simultáneos no
  sobrepasen el cupo.
- Un cliente con cuenta solo puede leer **sus** pedidos, y nunca los edita
  después de enviarlos.

### 5.2 Cupos por hora y kanban de pedidos

**Configuración (administrador):**
- `branches.cupo_por_hora integer NOT NULL DEFAULT 4`, editable en
  `/panel/sitio` → Locales. Cada sucursal tiene el suyo y parte con el valor
  actual de `max_por_horario`.
- Las franjas que se ofrecen siguen siendo las de `time_slots`. El cupo se
  cuenta por **bloque de una hora** (17:00–17:59, 18:00–18:59…), sumando los
  pedidos de todas las franjas de ese bloque **en esa sucursal**.
- Cuentan todos los pedidos del bloque, incluidos los `completado`.
- `app_settings.max_por_horario` se reemplaza por `branches.cupo_por_hora`.
  Así el sistema cuenta por hora, como ya lo entiende el local, y cada sucursal
  tiene su propio cupo.

**Al pedir (cliente con cuenta):**
- Las franjas de un bloque lleno aparecen deshabilitadas.
- Si el cliente intenta un bloque lleno (o se llena mientras arma el pedido),
  ve: "Ese horario ya está lleno. Te proponemos: 20:00, 20:15, 20:30", con las
  siguientes franjas con cupo del mismo día. Si no queda ninguna, se le propone
  el siguiente día abierto.
- El cupo lo valida la base en `create_order`, no solo la pantalla.

**Al pedir desde el panel ("Nuevo pedido" y "+ Pedido manual"):**
- Usan la misma regla y la misma propuesta de horarios.
- **[Decidido, 19 oct]** Desde el panel se puede pasar del cupo con una
  confirmación ("El bloque 20:00 está lleno (4/4). ¿Agregar igual?"). El
  administrador siempre puede. **[Por confirmar]** Si el colaborador también.
  Desde una cuenta de cliente, nunca.

**Kanban (`/panel/pedidos`, ambos roles):**
- Selector de sucursal y de día (hoy por defecto, con flechas para moverse).
- Una **columna por bloque horario** con su ocupación ("3 / 4") y un color
  cuando está lleno.
- Cada tarjeta muestra el número, la hora, el cliente, retiro o delivery, el
  total, el estado y el origen (cuenta web, WhatsApp, presencial…).
- Desde la tarjeta: avanzar o retroceder el estado, abrir el detalle (editar,
  imprimir comanda y eliminar, como hoy) y **moverla a otro bloque**
  (arrastrando en escritorio o con "Cambiar hora" en el celular).
- En 390 px las columnas se apilan en vertical, una sección por bloque, sin
  scroll horizontal.
- Reemplaza la lista actual de `AdminView`. La lógica de edición y de comanda
  se reutiliza, no se reescribe.

### 5.3 Inventario de insumos

**Tablas:**
- `inventory_items`: `id`, `nombre`, `unidad` (kg, g, L, unidades, cajas…),
  `critico` (bool), `active`, `sort_order`.
- `inventory_item_branches`: `item_id`, `branch_id`, `stock_minimo`. Define en
  qué sucursal se usa cada insumo y su mínimo allí.
- `inventory_movements`: `id`, `item_id`, `branch_id`, `tipo`
  (`ingreso` | `uso` | `merma` | `ajuste`), `cantidad` (con signo: positiva en
  ingreso, negativa en uso y merma, cualquiera distinta de cero en ajuste),
  `fecha`, `observacion`, `created_by`, `created_by_nombre`, `created_at`,
  `updated_by_nombre`, `updated_at`.
- Vista `inventory_stock`: insumo × sucursal con `stock = suma de movimientos`,
  mínimo, crítico y semáforo. El stock **no se guarda**, se calcula, así cuadra
  siempre con el historial.

**Semáforo [Decidido]:**

| Estado | Regla |
|---|---|
| 🔴 Rojo | Sin stock (≤ 0) o bajo el mínimo |
| 🟡 Revisar | Sobre el mínimo, pero a menos de un 25 % de él |
| 🟢 Verde | El resto |

**Pantallas:**
- **Planilla del día** (la vista principal, como se describió en la reunión):
  por sucursal y fecha, una fila por insumo con stock al inicio, lo que entró,
  lo que se ocupó, mermas, stock actual y semáforo. Desde cada fila se anota
  rápido un ingreso o un uso. Pensada para el celular.
- **Alertas:** insumos críticos en rojo, arriba de la planilla y como badge en
  el menú.
- **Movimientos:** historial filtrable por sucursal, insumo, tipo, fechas y
  persona, con editar y borrar en cada fila (con confirmación al borrar).

### 5.4 Cuadratura de caja

Por sucursal y día. **[Decidido]**

- `branches.pago_repartidor integer NOT NULL DEFAULT 2000`, editable en
  `/panel/sitio` → Locales.
- **Lo que trae el sistema** (pedidos del día de esa sucursal, ordenados por
  hora): cantidad de pedidos, total vendido (suma de `orders.total`), desglose
  por método de pago y cuántos siguen sin completar (aviso antes de cerrar).
- **Delivery del día:** cantidad de pedidos `delivery` × `pago_repartidor` =
  total a pagar al repartidor. Entra como egreso.
- **Lo que declara quien cierra:** fondo inicial, efectivo contado, total en
  tarjetas (según el POS), total en transferencias y otros egresos con monto y
  detalle.
- **Resultado:** efectivo esperado (fondo + ventas en efectivo − egresos en
  efectivo, incluido el repartidor), diferencia de efectivo y diferencia total,
  en verde si cuadra y en rojo si no. Observaciones.
- **Nota técnica [Verificado]:** "Pago al retirar" no distingue tarjeta de
  efectivo, así que se compara el total declarado (efectivo + tarjeta) contra
  ese método. Más adelante se puede separar en dos.
- `cash_closings`: un cierre por sucursal y día, con los valores **del
  momento** (cantidad de pedidos, ventas, desglose, deliveries, tarifa y total
  del repartidor) para que un cambio posterior no altere cierres anteriores.
  Guarda quién cerró y quién editó por última vez.

### 5.5 Cuentas de clientes y pedido online

**Flujo en la carta pública (`/carta`):**

| Cliente | Qué puede hacer |
|---|---|
| Sin cuenta | Ve la carta completa. En lugar de "Agregar al carrito" ve **"Pedir por WhatsApp"** (abre WhatsApp con un saludo y, si eligió un producto, su nombre) y la invitación a **crear su cuenta** |
| Con cuenta | Arma el carrito, elige sucursal, retiro o delivery, fecha y horario con cupo, y envía. El pedido **se guarda en la base** (con origen "Cuenta web"), aparece en el kanban y **se abre WhatsApp** con el resumen y el número de pedido |

- **Registro:** nombre, correo, contraseña, teléfono, dirección y referencia
  (opcionales, para delivery), sucursal preferida y el check de consentimiento.
  Al pedir, los datos vienen ya completos y se pueden cambiar en el pedido.
- **Mi cuenta (`/mi-cuenta`):** editar datos, cambiar contraseña y ver el
  historial y el estado de sus pedidos.
- **Login:** el mismo Supabase Auth del personal, pero separado por tabla: un
  usuario es personal si tiene `staff_profiles` activo y es cliente si tiene
  `customers.auth_user_id`. `is_staff()` no cambia, así que un cliente nunca
  entra al panel. El login de clientes vive en el sitio público y no en
  `/login`.
- **Sin SMTP [Decidido, 19 oct]:** para no sumar costos ni configuración, no
  se envían correos. En Supabase Auth se desactiva "Confirm email": la cuenta
  queda lista al registrarse y el cliente entra de inmediato.
- **Olvidé mi contraseña:** el enlace abre WhatsApp con un mensaje listo
  ("Hola, olvidé mi contraseña. Mi correo es …"). El administrador, desde la
  ficha del Sushero, define una contraseña nueva, que se muestra una sola vez,
  y se la envía por WhatsApp. El cliente puede cambiarla después en Mi cuenta.
  Es el mismo esquema que ya se usa con el personal.
- **Gestión de cuentas de clientes:** Edge Function nueva `manage-customers`
  (solo administradores, `service_role` solo en el servidor), con las acciones
  `reset_password` y `set_active` (bloquear una cuenta abusiva). Cambiar el
  correo de una cuenta también pasa por aquí.
- Como el correo no se verifica, el formulario lo muestra grande en la
  confirmación ("Tu cuenta es ana@gmail.com") para que el cliente detecte un
  error de tipeo.
- **[Decidido]** Solo correo y contraseña, sin Google ni otros proveedores.
- **Auth de producción:** "Allow new users to sign up" debe quedar
  **activado**. Un registro nuevo crea solo un cliente, nunca personal.
- Protección básica contra abuso, sin servicios extra: límite de pedidos
  abiertos por cuenta y bloqueo de cuentas desde el panel. Un CAPTCHA queda
  solo como opción si aparecen registros falsos.

### 5.6 Susheros (base de clientes)

**Origen de las fichas:**
- `customers`: `id`, `email` (único, en minúsculas y sin espacios),
  `auth_user_id` (nulo si no tiene cuenta), `nombre`, `telefono`, `direccion`,
  `referencia`, `sucursal_preferida`, `acepta_marketing`,
  `consentimiento_at`, `consentimiento_origen` ("Registro web" o
  "Nuevo pedido · <usuario>"), `baja_at`, `notas`, `created_at`, `updated_at`.
- **Desde una cuenta:** el registro crea la ficha.
- **Desde el panel:** "Nuevo pedido" y "+ Pedido manual" suman un campo
  **correo opcional** y el check de consentimiento. Si el correo coincide con
  una ficha, el pedido se enlaza a ella. Si es nuevo, crea una ficha sin
  cuenta. Un pedido sin correo no crea ficha.
- Si alguien crea su cuenta con un correo que ya tenía ficha (por un pedido
  anterior en el panel), la cuenta se enlaza a esa ficha y conserva su
  historial.
- `orders` suma `customer_id` y `cliente_email`.
- Consentimiento: el check solo **otorga** permiso. Para retirarlo, el cliente
  lo desmarca en Mi cuenta o el administrador marca la baja en la ficha (queda
  `baja_at`).
- Sin carga inicial: los pedidos anteriores no tienen correo.

**Métricas (vista `customer_stats`, calculadas desde los pedidos):** cantidad
de compras, gasto total, ticket promedio, primera y última compra, frecuencia
en días, sucursal principal y top 3 de productos o promos.

**Segmentos [Decidido]:**

| Segmento | Regla propuesta |
|---|---|
| Nuevo | 1 compra en los últimos 30 días |
| Frecuente | 3 o más compras en los últimos 90 días |
| Inactivo | Sin compras hace más de 60 días |
| Activo | El resto |

Los umbrales se guardan en `app_settings`.

**Pantalla `/panel/susheros` (solo administrador):** buscador, filtros por
segmento, sucursal, "tiene cuenta" y "acepta correos", ficha con historial y
**exportación CSV** (por defecto, solo quienes aceptaron).

**Datos personales:** el cliente ve y edita solo su ficha; el administrador ve
todas; `anon` nunca. Se considera la Ley 19.628 y la Ley 21.719, que la
reemplaza.

### 5.7 Dashboard de gestión (administrador)

Pantalla `/panel/dashboard`, con selector de periodo (hoy, semana, mes) y
"Todas las sucursales" o una:

- **Ventas:** total, cantidad de pedidos y ticket promedio, por sucursal y
  comparados con el periodo anterior.
- **Pedidos de hoy:** por estado y ocupación de los bloques horarios.
- **Origen de los pedidos:** cuenta web, WhatsApp, presencial, etc.
- **Caja:** estado del cierre de cada sucursal (pendiente, cuadrado o con
  diferencia) y total pagado a repartidores.
- **Inventario:** insumos críticos en alerta por sucursal y si se hizo el
  cierre de cocina.
- **Susheros:** clientes nuevos, cuentas creadas, % con consentimiento y
  segmentos.
- Cada bloque lleva a su pantalla de detalle.

`/panel/reportes` se mantiene para el detalle y los CSV. Se suma el historial
de cierres de caja y se corrige el cálculo del delivery para usar
`orders.total`.

### 5.8 Cierre de cocina

- `kitchen_checklist_items`: `id`, `grupo` (`inventario` | `limpieza` |
  `equipos`), `texto`, `active`, `sort_order`. El administrador lo edita.
- `kitchen_closings`: un cierre por sucursal y día, con cada ítem (ok o no y
  observación), copia de los críticos en rojo en ese momento, observaciones y
  quién cerró.
- La pantalla muestra los tres grupos como checklist y, en "Revisión de
  inventario", los insumos en alerta de esa sucursal.

### 5.9 Extras de handrolls (fuera del alcance)

**[Decidido, 19 oct]** No se hace en esta fase. Queda como referencia que los
sabores de handroll están escritos en el código (`CustomizationModal.jsx:117` y
`ProductSelector.jsx:31`) y que los handrolls no aceptan extras con costo.

---

## 6. Etapas

| Etapa | Contenido | Depende de |
|---|---|---|
| **0 · Preparación** | Bloquear `fase-2` en `vercel.json` y reanudar Pedidos Desarrollo si está pausado | |
| **1 · Seguridad** | Sección 5.1, con `create_order` | |
| **2 · Cupos y kanban** | Sección 5.2 | 1 |
| **3 · Inventario** | Sección 5.3 | |
| **4 · Caja** | Sección 5.4 | |
| **5 · Cuentas de clientes** | Sección 5.5 | 1 y 2 |
| **6 · Susheros** | Sección 5.6 | 5 |
| **7 · Dashboard** | Sección 5.7 | 3, 4 y 6 |
| **8 · Cierre de cocina** | Sección 5.8 | 3 |

Cada etapa es una migración nueva en `supabase/migrations/`, se aplica y se
prueba **solo en Pedidos Desarrollo** y se registra en la bitácora. La
publicación en producción se hace al final, con autorización y respaldo.

---

## 7. Criterios de aceptación

- `anon` no puede leer ni escribir `orders`, `order_items`, `customers` ni las
  tablas de inventario y caja (comprobado con la clave pública).
- Con el cupo de La Paz en 4 por hora y 4 pedidos en el bloque 20:00, un
  cliente con cuenta no puede pedir a las 20:15 y se le proponen franjas de las
  21:00 o después. Los pedidos de Loncoche no afectan el cupo de La Paz.
- Dos pedidos enviados a la vez al último cupo de un bloque: solo uno entra.
- Cambiar el cupo por hora en el panel cambia los horarios disponibles sin
  tocar código.
- El kanban muestra los pedidos del día por bloque con su ocupación, permite
  cambiar el estado y mover un pedido de bloque, y funciona en 390 px.
- Un visitante sin cuenta no puede armar carrito y llega a WhatsApp. Un cliente
  con cuenta envía un pedido que aparece en el kanban y abre WhatsApp con el
  número de pedido.
- Un cliente nunca entra al panel, y solo ve sus propios datos y pedidos.
- Un cliente se registra y entra de inmediato, sin correo de confirmación. El
  administrador le restablece la contraseña desde su ficha y el cliente entra
  con la nueva.
- Un correo escrito distinto (`Ana@Gmail.com ` o `ana@gmail.com`) cae en la
  misma ficha, venga de una cuenta o de un pedido del panel.
- Un movimiento cambia el stock de esa sucursal y no el de la otra. Un insumo
  crítico bajo su mínimo aparece en rojo y en el badge, y la alerta desaparece
  al registrar un ingreso que lo deja sobre el mínimo.
- Editar o borrar un movimiento recalcula el stock y deja registro de quién lo
  hizo.
- La cuadratura muestra los deliveries del día y el pago al repartidor con la
  tarifa de esa sucursal. Cambiar la tarifa no altera cierres anteriores.
- Un colaborador no ve Dashboard, Susheros, Reportes ni la configuración, y la
  base rechaza sus lecturas de `customers` (RLS, no solo el menú).
- La exportación de Susheros, por defecto, incluye solo a quienes aceptaron.
- `npm run lint` y `npm run build` pasan. Las pantallas nuevas funcionan en
  390 px sin scroll horizontal.

---

## 8. Riesgos

| Riesgo | Mitigación |
|---|---|
| El alcance creció con la reunión (cuentas, cupos, kanban y dashboard) | Etapas independientes en el orden de la sección 6. Si falta tiempo, se recorta la 8 |
| Clientes que no quieren crear cuenta | WhatsApp sigue disponible sin cuenta, como pidió el cliente |
| Correos mal escritos al registrarse, porque no se verifican | El correo se muestra destacado al confirmar la cuenta y el administrador lo puede corregir desde la ficha |
| Clientes que olvidan su contraseña | Restablecimiento por WhatsApp a cargo del administrador (sección 5.5) |
| Registros falsos o pedidos de broma | Límite de pedidos abiertos por cuenta, bloqueo de cuentas y el equipo puede eliminar pedidos. CAPTCHA solo si hace falta |
| Sobreventa de un bloque por pedidos simultáneos | Validación y bloqueo en `create_order`, no en el navegador |
| Correos mal escritos que crean fichas duplicadas | Validación de formato, normalización y edición del correo desde la ficha |
| El stock se descuadra si no se anota lo que se ocupa | Movimiento "ajuste" tras un conteo físico y revisión en el cierre de cocina |
| Datos personales | RLS por cliente, consentimiento con fecha y origen, y Etapa 1 cerrada antes de guardar correos |
| Preview de Vercel conectado a producción | Etapa 0: bloquear `fase-2` en `vercel.json` antes del primer push |

---

## 9. Pendientes con el cliente

- Si el colaborador también puede pasar del cupo con confirmación, o solo el
  administrador (5.2).

---

## 10. Bitácora

| Fecha | Quién | Qué |
|---|---|---|
| 1 oct 2026 | Jean y Vane (requisito) | Correo a Bruno Veinz con las dos áreas nuevas (Inventario y Cocina, y Marketing y Susheros), más un esquema de dónde va cada cosa en el menú |
| 1 oct 2026 | Bruno Veinz (decisión) · Agente | El inventario es de insumos, sin relación con la carta. Las ventas se registran a mano (no se cargan recetas por promo: "es mucha pega y no es necesario"). El pago al repartidor es distinto del cobro de delivery y lo maneja cada local. Cada colaborador debe ver solo lo suyo |
| 1 oct 2026 | Agente | Se revisa el código y se redacta este PRD (entonces `02-inventario-caja-y-susheros.md`). Se verifica que los sabores de handroll están escritos en el código y que la Etapa C del PRD 01 sigue pendiente |
| 1 oct 2026 | Bruno Veinz (decisión) · Agente | El Sushero se identifica por **correo**, no por teléfono. No hay carga inicial desde pedidos anteriores. Se puede editar y borrar movimientos para corregir errores |
| 1 oct 2026 | Bruno Veinz (decisión) · Agente | Semáforo y segmentos quedan como se propusieron. La cuadratura es completa y editable. Se agrega el check de consentimiento. El cliente carga a mano insumos y checklist. El correo en el pedido del panel es opcional |
| 12 oct 2026 | Jean y Vane (reunión) | Inventario diario y manual con registro de quién anota; cuadratura de caja con pedidos por hora; dashboard de gestión para el administrador; solo con cuenta se arma el carrito, sin cuenta se pide por WhatsApp; bloquear horarios para restringir la demanda |
| 19 oct 2026 | Bruno Veinz (decisión) · Agente | Se reestructura el PRD y se renombra a `02-gestion-interna-y-pedidos-online.md`. **Se elimina** la propuesta de áreas por persona (decisión del 1 oct "cada colaborador ve solo lo suyo"): bastan los dos roles actuales. Entran las cuentas de clientes (pedido guardado en la base y además por WhatsApp), los cupos por hora configurables por el administrador con propuesta de horarios más tarde, el kanban de pedidos por bloque horario y el dashboard. El Sushero sigue identificado por correo y ahora nace también de las cuentas. Se mantienen el inventario (el tipo "venta" pasa a llamarse "uso"), la cuadratura y el cierre de cocina. La seguridad pasa a ser obligatoria porque el público va a crear pedidos |
| 19 oct 2026 | Agente | Se verifica en el código que el cupo actual (`max_por_horario`) es por franja de 15 minutos, se calcula en el navegador y no distingue sucursal. Se verifica que no hay cambios de código en `fase-2` |
| 19 oct 2026 | Bruno Veinz (informado) · Agente | `max_por_horario` es un cupo **por hora**, porque el local se organiza por hora. El código lo aplica por franja de 15 minutos, lo que no coincide con la intención; se corrige en la Etapa 2. Se descarta la pregunta de un tope adicional por franja |
| 19 oct 2026 | Bruno Veinz (decisión) · Agente | Se adelanta una corrección de la Etapa 2 en "Nuevo pedido": `getHorariosDisponibles()` cuenta los pedidos por **hora y sucursal** (antes, por franja de 15 minutos y sumando ambas sucursales). El cupo sigue siendo `max_por_horario`, ahora rotulado "Máx. pedidos por hora (por sucursal)" en `/panel/sitio`. Se mantiene la regla heredada de no contar los pedidos `completado`. `npm run lint` y `npm run build` pasan; la lógica se probó con casos de ejemplo en Node, falta probarla en el navegador |
| 19 oct 2026 | Bruno Veinz (decisión) | Los clientes entran solo con correo y contraseña escritos a mano, sin Google. Los extras de handrolls quedan fuera del alcance de esta fase |
| 19 oct 2026 | Bruno Veinz (decisión) | Sin SMTP, para no sumar costos ni dificultad: no se confirma el correo al registrarse y, si un cliente olvida su contraseña, escribe por WhatsApp y el administrador se la restablece desde el panel (Edge Function `manage-customers`) |
| 19 oct 2026 | Bruno Veinz (decisión) | Desde el panel se puede pasar del cupo con una confirmación; el administrador siempre puede. El administrador entra al panel en el Dashboard y ve todo. Queda por confirmar si el colaborador también puede pasar del cupo |
| 19 oct 2026 | Agente | **Etapa 0:** se conecta el entorno local a Pedidos Desarrollo (`.env.local` y `supabase link`) y se bloquea `fase-2` en `vercel.json`. `.env` sigue con valores de producción; Vite usa `.env.local` primero |
| 19 oct 2026 | Bruno Veinz (decisión) · Agente | **Etapa 1:** `create_order` no valida cupos todavía (se agrega en la Etapa 2 con `cupo_por_hora`) y guarda los precios que envía el panel; el recálculo desde el catálogo queda para la Etapa 5, cuando los clientes creen pedidos. El total sí se calcula en la base |
| 19 oct 2026 | Agente | **Etapa 1 aplicada en Pedidos Desarrollo** (`20261019180000_secure_orders.sql`): sin `anon_all_*`, `anon` solo lee `product_stock`, el personal crea pedidos solo con `create_order()` (sin INSERT directo), `get_next_order_number()` revocado y columnas de PIN eliminadas. `services/orders.js` usa la RPC. Verificado con la clave pública: `anon` no ve el pedido existente, no inserta, no edita stock y no ejecuta las funciones. Verificado en SQL (transacción revertida): un colaborador crea un delivery con total correcto, el INSERT directo se rechaza, se rechazan sucursal inválida, pedido vacío y cantidad 0, y un usuario sin perfil de staff no crea ni ve pedidos. `npm run lint` y `npm run build` pasan. Las pruebas avanzaron la secuencia de `order_number` (se salta un número). Falta la prueba en el navegador |
| 19 oct 2026 | Bruno Veinz (decisión) · Agente | Avanzar con la Etapa 2 y escribir pruebas automáticas. Mientras el cliente no confirme, **ambos roles** pueden pasarse del cupo con confirmación (`p_forzar`); restringirlo al administrador es un cambio de una línea en `create_order` |
| 19 oct 2026 | Agente | **Etapa 2 aplicada en Pedidos Desarrollo** (`20261019190000_hourly_capacity.sql`): `branches.cupo_por_hora` (4 en ambas, desde `max_por_horario`, que se elimina), `create_order` valida el bloque de una hora por sucursal contando todos los estados, con bloqueo por sucursal, fecha y hora, y error `SL409`. Frontend: cupo por local en `/panel/sitio` → Locales; "Nuevo pedido" muestra "El bloque de las 20:00 ya está lleno" con hasta 3 horarios propuestos y "Agregar igual"; "+ Pedido manual" muestra la ocupación por franja y pide confirmación; `/panel/pedidos` es un kanban por día y sucursal con columnas por bloque, ocupación (lleno/sobrecupo), avanzar o retroceder estado, detalle con `OrderCard` (editar, comanda, eliminar) y mover de bloque arrastrando o con el selector ⏰ (con confirmación si el destino está lleno) |
| 19 oct 2026 | Agente | **Pruebas:** `npm test` (6 unitarias de cupos) y `npm run test:db` (13 de integración: RLS de `anon`, `create_order`, validaciones, cupo por sucursal, completados cuentan, `p_forzar`, cambio de cupo solo admin y 5 pedidos simultáneos al último cupo → entra 1). Todas pasan. Prueba de navegador (puppeteer, fuera del repo) con 16 verificaciones: ocupación 4/4 y sobrecupo 5/4, avanzar estado, mover con confirmación, detalle, ocupación en pedido manual, 390 px sin scroll horizontal y columnas apiladas, colaborador sin acceso a Sitio, cupo en Locales y fuera de Negocio, sin errores de consola. Datos de prueba borrados (queda 1 pedido, cupos en 4). `lint` y `build` pasan. Se crearon `scripts/seed-test-accounts.mjs` y `credenciales-prueba.local` (ignorado) para las cuentas de prueba |
| 19 oct 2026 | Agente (hallazgo) | **[Verificado]** "Hoy" se calcula en UTC (`toISOString`) en todo el frontend heredado (`utils/dates.js`, `emptyForm`, kanban): desde las 21:00 en Chile el sistema ya muestra el día siguiente como "Hoy". Ya existía antes de esta fase; queda propuesto corregirlo con la fecha local |
| 19 oct 2026 | Bruno Veinz (decisión) · Agente | Horario de pedidos base: **17:00 a 22:00**, configurable por el administrador. Migración `20261019200000_slots_until_22.sql` (agrega 21:45 y 22:00 sin borrar franjas existentes; en desarrollo quedan 21, cada 15 min). En `/panel/sitio` → Datos del negocio se agrega "Generar horarios" (desde, hasta y cada 15/30/60 min, con confirmación) además de agregar o quitar franjas sueltas. "Nuevo pedido" muestra el rango desde las franjas (antes decía "17:00 — 21:30" fijo). Verificado en navegador a 390 px: kanban de 17:00 a 22:00, generador sin errores y sin scroll horizontal (sin guardar). Las franjas siguen siendo las mismas para ambas sucursales |
| 19 oct 2026 | Agente | **Corregido "Hoy" en UTC:** nuevas `isoLocal()` y `sumarDias()` en `utils/dates.js`, usadas en fechas disponibles, `formatFecha`, franjas cercanas, `emptyForm`, pedido manual, kanban y nombre del CSV de Reportes. No queda `toISOString().split` en `src/`. Verificado a las 23:38 del 19 oct en Chile: el kanban muestra "Hoy, 19 oct" (antes, 20). `npm test` (8, con `TZ=America/Santiago` y `TZ=UTC`), `npm run test:db` (13), `lint` y `build` pasan |
| 19 oct 2026 | Agente | Commit `1ea1c31` en `fase-2` (Etapas 0, 1 y 2, sin push) |
| 20 oct 2026 | Agente | **Etapa 3 aplicada en Pedidos Desarrollo** (`20261020000000_inventory.sql`). Insumos con unidad, crítico, activo y orden; mínimo por sucursal; movimientos `ingreso`/`uso`/`merma`/`ajuste` con signo validado en la base y autoría (`created_by_nombre`, `updated_by_nombre`) puesta por trigger, no por el navegador. El stock se calcula (vista `inventory_stock`, función `inventory_daily`). Un insumo con movimientos no se borra: se desactiva. `/panel/inventario`: planilla del día por sucursal con semáforo, registro rápido de ingreso, uso y merma, y **"Conteo"** (se anota el stock contado y se registra el ajuste por la diferencia); alerta de críticos arriba y badge rojo en el menú; historial filtrable con editar y borrar; pestaña Insumos solo para el administrador. Pruebas: 10 nuevas en `tests/db/inventory.test.js` (23 de integración en total, todas pasan) y 15 verificaciones de navegador (admin crea un insumo crítico, badge, el colaborador a 390 px registra ingreso y conteo, edita y borra con registro de autor, sin scroll horizontal ni errores). Datos de prueba borrados. Semáforo verificado en el borde: 12,5 con mínimo 10 es verde, porque la regla es "a menos de un 25 %" |
| 20 oct 2026 | Agente | Commit `2ece0d5` (Etapa 3). Se detecta en desarrollo el pedido #023 (Loncoche, 22:00), creado a las 23:30 del 19 oct desde el panel, sin relación con las pruebas automáticas; no se toca |
| 20 oct 2026 | Agente | **Etapa 4 aplicada en Pedidos Desarrollo** (`20261020010000_cash_closings.sql`). `branches.pago_repartidor` (2000 en ambas, editable en Locales). `/panel/caja` (ambos roles): por sucursal y día, lo que trae el sistema (pedidos, total, desglose por método, deliveries × tarifa, aviso de pedidos sin completar y lista por hora), lo declarado (fondo, efectivo contado, tarjetas según POS, transferencias, otros egresos con detalle, observaciones) y el resultado en vivo (efectivo esperado, diferencias de efectivo, transferencias y total, en verde si cuadra y rojo si no). El cierre lo calcula y guarda la base (`save_cash_closing`), queda editable y registra quién cerró y quién editó; la tarifa del repartidor queda fija desde el primer cierre. **Supuesto [Por confirmar]:** el repartidor y los otros egresos se pagan en efectivo, y como "Pago al retirar" no separa tarjeta de efectivo, ventas en efectivo = pago al retirar − tarjetas declaradas. Pruebas: 3 unitarias de la fórmula y 6 de integración (la fórmula de la base y la del frontend dan lo mismo; tarifa fija; edición; permisos; montos negativos); 11 verificaciones de navegador a 390 px. Totales: 11 unitarias y 29 de integración, todas pasan. Datos de prueba borrados |
| 20 oct 2026 | Agente | Commit `e28ffd2` (Etapa 4) |
| 20 oct 2026 | Agente | **Etapa 5 aplicada en Pedidos Desarrollo** (`20261020020000_customer_accounts.sql`, Edge Function `manage-customers` desplegada solo en desarrollo). Ficha `customers` por correo creada por trigger al registrarse (metadata `tipo = 'cliente'`), enlazada a una ficha previa con el mismo correo; el check de novedades solo otorga consentimiento. RLS: el cliente ve y edita solo su ficha (con `update_my_customer`, sin notas ni bloqueo) y solo sus pedidos, sin editarlos; el colaborador y anon no ven fichas. `create_order` para clientes: cupo sin excepciones, precios y nombres desde el catálogo (del navegador solo producto, cantidad y opciones, validadas contra `promo_options`), productos activos y disponibles en la sucursal, fecha entre hoy y 6 días en día abierto, franja existente y a más de 30 minutos, nombre y teléfono obligatorios, dirección en delivery, delivery solo con transferencia y **máximo 3 pedidos sin completar por cuenta** [Por confirmar el número]. Sitio: carta sin cuenta pide por WhatsApp e invita a crear cuenta; con cuenta, carrito con día, horario con cupo, datos precargados y pago, y al confirmar muestra el número y el botón para enviar el resumen por WhatsApp (un toque: abrir WhatsApp automáticamente después de guardar lo bloquean los navegadores). `/ingresar`, `/registro` y `/mi-cuenta`. **[Por hacer en el dashboard]** Pedidos Desarrollo tiene "Confirm email" activado (verificado en `/auth/v1/settings`: `mailer_autoconfirm = false`); hay que desactivarlo para que el registro deje la sesión abierta. "Allow new users to sign up" ya está activado. Pruebas: 14 nuevas de integración (43 en total, todas pasan) y 15 verificaciones de navegador a 390 px (carta sin cuenta, compra con cuenta, WhatsApp con número, precio del catálogo en la base, Mi cuenta, el cliente no entra al panel, kanban con origen Cuenta web). Se agregan `cliente.pruebas` y `cliente2.pruebas` a las cuentas de prueba (el script rotó también las contraseñas del personal). Las pruebas avanzan la secuencia de números de pedido (va en #091 en desarrollo) |
| 20 oct 2026 | Bruno Veinz · Agente | Bruno desactiva "Confirm email" en Pedidos Desarrollo; verificado en `/auth/v1/settings` (`mailer_autoconfirm = true`, `disable_signup = false`). Prueba de registro en navegador a 390 px (9 verificaciones): el registro deja la sesión abierta, muestra el correo normalizado en grande, crea la ficha con teléfono, dirección y consentimiento "Registro web"; un correo repetido avisa que ya existe; y una ficha previa sin cuenta (con notas) se enlaza al registrarse con el mismo correo, sin duplicarse. Cuentas y fichas de prueba borradas. Commit `3cee35f` (Etapa 5) |
