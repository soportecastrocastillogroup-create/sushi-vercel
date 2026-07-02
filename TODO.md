# Guía para administrar Sushi Loncoche con Claude

Este archivo está pensado para **alguien sin experiencia en programación**. Podés copiarlo completo (o por secciones) en una conversación con **Claude** para que entienda el proyecto y te ayude a mantenerlo.

**Proyecto:** sistema de pedidos web de Sushi Loncoche (Loncoche y La Paz, Chile).  
**Carpeta en GitHub:** `sushi-vercel` (dentro del repositorio `DDiseno` si es monorepo).  
**Datos en vivo:** Supabase (base de datos en la nube).  
**Sitio publicado:** Vercel (se actualiza cuando alguien sube cambios a GitHub).

---

## Antes de empezar: qué necesitás tener

Marcá con ✅ cuando lo tengas listo:

- [ ] Cuenta en **GitHub** con acceso al repositorio del proyecto
- [ ] Cuenta en **Supabase** con el proyecto ya creado y `schema.sql` ejecutado
- [ ] Cuenta en **Vercel** (donde está publicada la web)
- [ ] Cuenta en **Claude** (claude.ai o Claude Desktop)
- [ ] Los **PIN** de admin, cocina y reportes (están en Supabase → tabla `app_settings`)
- [ ] La **URL del sitio** en producción (ej. `https://algo.vercel.app`)

**Importante:** nunca compartas con Claude ni subas a GitHub estos secretos:

- La clave **service_role** de Supabase (solo para servidores; este proyecto no la usa en el front)
- Contraseñas de cuentas
- Archivos `.env` o `.env.local` con claves reales

Sí podés decirle a Claude la **URL pública** de Supabase (`https://xxxxx.supabase.co`) si hace falta para orientarlo; la **anon key** es pública en el front pero igual conviene no pegarla en chats públicos.

---

## Parte 1 — Conectar Claude con GitHub

Así Claude puede **leer y proponer cambios** en el código sin que tengas que copiar archivos a mano.

### Opción A — Claude en la web (claude.ai) + GitHub

1. Entrá a [claude.ai](https://claude.ai).
2. Creá un **Proyecto** (menú lateral → Projects → Create project).
3. Nombre sugerido: `Sushi Loncoche`.
4. En **Project knowledge**, subí o pegá:
   - Este archivo `TODO.md`
   - El `README.md` del proyecto
5. Si tu plan incluye **integraciones**, conectá **GitHub**:
   - Settings del proyecto → Integrations → GitHub
   - Autorizá el repositorio donde está `sushi-vercel`
6. En cada chat nuevo del proyecto, Claude ya tendrá contexto del negocio.

### Opción B — Claude Code / Cursor (si alguien técnico te ayuda)

Si usás **Cursor** o **Claude Code** en la computadora:

1. Cloná el repo: `git clone` (te lo puede hacer alguien del equipo).
2. Abrí la carpeta `sushi-vercel`.
3. Claude/Cursor lee los archivos directamente del disco.
4. Los cambios se suben a GitHub con **commit** y **push** (pedile a Claude que te guíe paso a paso).

### Opción C — Sin integración (manual)

Si no podés conectar GitHub:

1. Abrí el archivo que quieras cambiar en GitHub (botón **Edit**).
2. Copiá el contenido y pegalo en Claude con tu pregunta.
3. Claude te devuelve el texto nuevo; lo pegás en GitHub y guardás.

---

## Parte 2 — Acceder a Supabase para ver y editar datos

Supabase es donde viven **pedidos, menú, stock, PINs y configuración**. No hace falta programar para ver la mayoría de las cosas.

### Entrar al panel

1. [supabase.com](https://supabase.com) → iniciar sesión.
2. Elegí el proyecto de Sushi Loncoche.
3. Menú izquierdo → **Table Editor** (ver/editar filas como una planilla).
4. Menú izquierdo → **SQL Editor** (consultas y cambios más avanzados; pedile a Claude que te escriba el SQL).

### Tablas que más vas a usar

| Tabla | Para qué sirve | Ejemplo de uso |
|-------|----------------|----------------|
| `orders` | Pedidos | Ver quién pidió, fecha, horario, estado |
| `order_items` | Productos de cada pedido | Detalle de lo que llevó cada orden |
| `products` | Menú (nombre, precio, piezas) | Cambiar precio o nombre de un roll |
| `promo_rolls` | Rolls dentro de las promos | Editar composición de Promo 1, 2, etc. |
| `customization_options` | Rellenos, envolturas, salsas | Cambiar precio del cambio a salmón |
| `product_stock` | ¿Producto disponible? | `available = false` = agotado en la web |
| `app_settings` | Config global | PINs, WhatsApp, costo delivery, límites |
| `unlocked_dates` | Días extra abiertos | Fechas desbloqueadas desde admin |
| `time_slots` | Horarios (17:00, 17:30…) | Agregar o quitar un horario |
| `blocked_weekdays` | Días cerrados por defecto | 0=Dom, 1=Lun, 2=Mar… |

### Estados de un pedido (`orders.estado`)

| Valor | Significado |
|-------|-------------|
| `abierto` | Recién llegó; cocina aún no lo tomó |
| `en_proceso` | En preparación |
| `listo` | Listo para retiro/entrega |
| `completado` | Cerrado (recibido o entregado) |

### Cambios frecuentes en Supabase (sin tocar código)

**Cambiar PIN de admin / cocina / reportes**

1. Table Editor → `app_settings` → fila con `id = 1`
2. Editá `admin_pin`, `kitchen_pin` o `reportes_pin`
3. Guardá. La web toma el valor nuevo al recargar (no hace falta redeploy).

**Cambiar WhatsApp o costo de delivery**

1. Misma tabla `app_settings`
2. Campos `whatsapp_num` y `costo_delivery`

**Cambiar precio de un producto**

1. Table Editor → `products`
2. Buscá el producto por `id` (ej. `p1`, `rqc1`) o por `nombre`
3. Editá `precio` (número entero en pesos chilenos, sin puntos)

**Ver pedidos de hoy**

1. Table Editor → `orders`
2. Filtrá por columna `fecha` o ordená por `created_at`

O en SQL Editor (pedile a Claude que lo adapte):

```sql
SELECT order_number, estado, sucursal, cliente_nombre, horario, total, created_at
FROM orders
WHERE fecha = CURRENT_DATE
ORDER BY created_at DESC;
```

### Conectar Claude con Supabase (opcional, más avanzado)

Claude **no entra solo** a tu Supabase. Tenés estas opciones:

1. **Manual (recomendado para empezar):** vos mirás Table Editor y le contás a Claude qué ves, o exportás CSV y se lo adjuntás.
2. **SQL que te escribe Claude:** copiás la consulta en SQL Editor → Run → le pasás el resultado.
3. **Integración MCP** (si usás Claude Desktop o Cursor con plugins): buscá “Supabase MCP” en la documentación de tu herramienta; requiere ayuda de alguien técnico para configurar la API key de forma segura.

**Nunca** le des a Claude la clave `service_role` en un chat compartido.

---

## Parte 3 — Cómo usar la app en el día a día

| Vista | PIN por defecto* | Qué hace |
|-------|------------------|----------|
| 📱 Pedido | (ninguno) | Cliente hace pedido web |
| 📋 Admin | ver `app_settings` | Pedidos, stock, días, pedido manual |
| 👨‍🍳 Cocina | ver `app_settings` | Tablero de preparación |
| 📊 Reportes | ver `app_settings` | Ventas y exportar CSV |

\* Los PIN por defecto del seed están en `supabase/schema.sql` (`1421`, `1420`, `1422`). Cambiarlos en `app_settings` en cuanto el sistema esté en uso real.

**Sincronización entre celulares:** no es en tiempo real. En Admin y Cocina usá el botón **↻ Actualizar** o recargá la página para ver pedidos nuevos.

---

## Parte 4 — Texto para pegar al inicio de cada chat con Claude

Copiá y completá los corchetes:

```
Sos mi asistente para el proyecto Sushi Loncoche (sushi-vercel).

Contexto:
- Repo GitHub: [URL del repo]
- Carpeta del proyecto: sushi-vercel
- Base de datos: Supabase (proyecto: [nombre])
- Sitio en producción: [URL Vercel]
- Stack: React + Vite + Supabase (sin backend propio)

Reglas:
1. Los datos del menú, pedidos y config viven en Supabase, no en archivos sueltos del repo.
2. Para cambiar precios, PINs o stock persistente, preferí Supabase (Table Editor o SQL).
3. Para cambiar textos, colores o flujo de pantallas, editá archivos en src/components/.
4. No modifiques .env ni subas claves secretas.
5. Explicame los pasos en español simple antes de cambios grandes.
6. Si el cambio requiere redeploy, decime que hay que hacer push a GitHub y esperar Vercel.

Leé TODO.md y README.md del repo para más detalle.

Mi pedido hoy es: [escribí acá qué necesitás]
```

---

## Parte 5 — Tareas comunes y qué pedirle a Claude

### Menú y precios

| Quiero… | Dónde | Qué decirle a Claude |
|---------|-------|----------------------|
| Cambiar precio de un roll | Supabase → `products` | “¿Cómo cambio el precio del producto rqc1 en Supabase?” |
| Agregar un producto nuevo | Supabase (+ quizá código) | “Quiero agregar un roll nuevo a Loncoche y La Paz, precio $X” |
| Cambiar texto de una promo | Supabase → `promo_rolls` | “Actualizá los rolls de la promo p2 en la base de datos” |

### Operación del local

| Quiero… | Dónde | Notas |
|---------|-------|-------|
| Marcar producto agotado | App Admin → Stock, o `product_stock` | En la app es más fácil |
| Abrir un domingo excepcional | App Admin → Días, o `unlocked_dates` | |
| Ver ventas del mes | App Reportes o SQL sobre `orders` | Export CSV desde Reportes |

### Configuración

| Quiero… | Dónde |
|---------|-------|
| Nuevo número WhatsApp | `app_settings.whatsapp_num` |
| Más pedidos por horario | `app_settings.max_por_horario` |
| Nuevo horario (ej. 22:00) | tabla `time_slots` |

### Cambios en la web (código → GitHub → Vercel)

| Quiero… | Carpeta / archivo |
|---------|-------------------|
| Cambiar textos del pedido cliente | `src/components/customer/` |
| Cambiar panel admin | `src/components/admin/AdminView.jsx` |
| Cambiar pantalla cocina | `src/components/kitchen/` |

Después de cambios en código:

1. Alguien con acceso hace **commit** y **push** a GitHub.
2. Vercel redeploya solo (1–3 minutos).
3. Probá el sitio en el celular.

---

## Parte 6 — Checklist: primera vez que administrás el proyecto

### Supabase

- [ ] Proyecto creado en Supabase
- [ ] Ejecutado `supabase/schema.sql` completo en SQL Editor
- [ ] Verificado que existen tablas: `products`, `orders`, `app_settings`
- [ ] Cambiados los PIN por defecto en `app_settings`
- [ ] Probado un pedido de prueba y visto la fila en `orders`

### Vercel

- [ ] Variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` configuradas
- [ ] Root directory = `sushi-vercel` (si el repo es monorepo)
- [ ] Último deploy en verde (Success)

### GitHub

- [ ] Tenés permiso de lectura (o escritura si vas a publicar cambios)
- [ ] Claude o tu equipo saben en qué rama trabajar (normalmente `main`)

### Prueba de punta a punta

- [ ] Pedido desde la vista Cliente
- [ ] Aparece en Admin tras **Actualizar**
- [ ] Cocina puede mover estados
- [ ] Reportes muestra el pedido

---

## Parte 7 — Cuando algo falla

| Síntoma | Qué revisar primero |
|---------|---------------------|
| Pantalla de error al abrir la web | Variables en Vercel; que Supabase esté activo |
| “Error al cargar datos” | `schema.sql` ejecutado; RLS habilitado; URL/key correctas |
| No aparecen pedidos en otro celular | Botón Actualizar; no hay tiempo real |
| PIN no funciona | Valor en `app_settings`; recargar página |
| Precio viejo en la web | ¿Cambiaste en Supabase? ¿Recargaste sin caché? |
| Cambio de código no se ve online | ¿Se hizo push a GitHub? ¿Vercel terminó el deploy? |

Pedile a Claude: *“El sitio muestra [error]. Tengo Vercel y Supabase configurados. ¿Qué reviso paso a paso?”* y adjuntá captura si podés.

---

## Parte 8 — Glosario mínimo

| Palabra | Significado simple |
|---------|-------------------|
| **Repo** | Carpeta del proyecto en GitHub |
| **Commit / Push** | Guardar cambios y subirlos a GitHub |
| **Deploy** | Publicar la versión nueva del sitio (lo hace Vercel) |
| **Supabase** | Base de datos en la nube |
| **Tabla** | Planilla de datos (pedidos, productos, etc.) |
| **PIN** | Clave numérica para entrar a Admin, Cocina o Reportes |
| **RLS** | Reglas de quién puede leer/escribir en Supabase |
| **`.env`** | Archivo local con claves; no subir a GitHub |

---

## Parte 9 — Contacto con quien mantiene el código

Si Claude te propone cambios que no entendés, pedí siempre:

1. **Qué archivo** toca
2. **Si alcanza con Supabase** o hace falta cambiar código
3. **Si hay que redeployar** en Vercel
4. **Cómo probar** que quedó bien

---

*Última actualización: alineado con la restructuración React + Supabase (sin `sushi-system.jsx` monolítico). Para detalle técnico, ver `README.md`.*
