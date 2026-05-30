# Sushi Loncoche — Sistema de pedidos

App web de pedidos para **Sushi Loncoche** (sucursales Loncoche y La Paz, Chile). Tres vistas en una sola página: cliente, admin y cocina.

Stack: **React 19 + Vite 8**, estilos inline, persistencia en `localStorage` (vía polyfill). Deploy en **Vercel** como sitio estático.

---

## Para agentes de código (leer primero)

### Regla de oro: ¿qué archivo edito?

| Quiero cambiar… | Archivo | Notas |
|---|---|---|
| Menú, precios, promos, stock inicial, PINs, WhatsApp, horarios | `src/sushi-system.jsx` | **Archivo principal (~2060 líneas).** Casi toda la lógica vive aquí. |
| Polyfill de storage, bootstrap de React | `src/main.jsx` | Solo wrapper; no tocar salvo cambios de persistencia o entry point. |
| Reset CSS mínimo | `src/index.css` | Margen/box-sizing global. La UI usa estilos inline en el JSX. |
| Título, favicon, meta viewport | `index.html` | Shell HTML. |
| Scripts npm, dependencias | `package.json` | |
| Config de Vite | `vite.config.js` | Por defecto sin alias ni plugins extra. |

### ⚠️ Dos copias de `sushi-system.jsx`

Existen dos rutas con el mismo contenido conceptual:

```
DDiseno/sushi-system.jsx              ← copia de trabajo / prototipo original (fuera del repo de deploy)
DDiseno/sushi-vercel/src/sushi-system.jsx   ← copia que Vercel builda y commitea
```

- **Vercel solo ve** `sushi-vercel/src/sushi-system.jsx`. No existe `../sushi-system.jsx` en el servidor.
- En local, `npm run dev` ejecuta `sync:sushi`: si existe el archivo padre, lo copia a `src/` antes de arrancar.
- **Después de editar el JSX, siempre commitear `src/sushi-system.jsx`** antes de deploy.
- Si editas solo la copia en `src/`, no hace falta sync. Si editas la de la raíz de `DDiseno`, corre `npm run sync:sushi`.

### Qué NO hacer

- No agregar backend, API routes ni base de datos sin acuerdo explícito: la app es 100 % cliente.
- No mover lógica a `main.jsx` salvo bootstrap/polyfill.
- No depender de `../sushi-system.jsx` en scripts de build (Vercel fallará).
- No externalizar estilos a CSS modules sin pedido: el diseño usa inline styles + un bloque `<style>` global en `App`.
- Los PINs (`ADMIN_PIN`, `KITCHEN_PIN`) están en texto plano en el bundle; no son seguridad real.

---

## Estructura del proyecto

```
sushi-vercel/
├── index.html              # Shell HTML
├── package.json            # Scripts y dependencias
├── vite.config.js          # Vite + plugin React
├── src/
│   ├── main.jsx            # Entry: polyfill window.storage → localStorage
│   ├── index.css           # Reset mínimo
│   └── sushi-system.jsx    # ★ TODA la app (componentes, menú, estado)
└── dist/                   # Output de `npm run build` (no commitear)
```

---

## Arquitectura de la app

```
                    ┌─────────────────────────────────────┐
                    │  App (export default, ~L1968)      │
                    │  state: orders, stock, view, pins   │
                    └──────────────┬──────────────────────┘
           ┌───────────────────────┼───────────────────────┐
           ▼                       ▼                       ▼
   CustomerView (~L1139)    AdminView (~L1604)      KitchenView (~L1924)
   Pedido web 4 pasos       Gestión pedidos +        Solo pedidos activos
                            pedidos manuales +       (pendiente → listo)
                            toggle stock
```

**Flujo de pedido (cliente):** sucursal/tipo → carrito → datos cliente/pago → confirmación → WhatsApp opcional.

**Flujo admin:** ver pedidos, cambiar estado, crear pedido manual (Instagram, llamada, etc.), marcar productos agotados.

**Flujo cocina:** tarjetas por pedido, avanzar estado, imprimir comanda.

---

## Mapa de `sushi-system.jsx`

Secciones del archivo (buscar los comentarios `// ──`):

| Línea aprox. | Sección | Contenido |
|---|---|---|
| 3–9 | CONFIG | `SUCURSALES`, `COSTO_DELIVERY`, `WHATSAPP_NUM`, `MAX_CAMBIOS`, PINs |
| 11–17 | HORARIOS | Slots de entrega/retiro |
| 19–48 | OPCIONES CAMBIOS | `RELLENOS`, `ENVOLTURAS`, `SALSAS`, `SOLO_POLLO` |
| 51–65 | STOCK INICIAL | `stockInicial` — claves = `id` de productos en `MENU` |
| 68–297 | MENU | Array de productos (Promos, Handrolls, Rolls, etc.) |
| 300–341 | ESTADOS / HELPERS | `ESTADOS`, `FUENTES`, `getPagos`, `fmt`, `cartTotal`, `emptyForm` |
| 344–691 | CustomizationModal | Modal de personalización de promos/handrolls |
| 692–848 | ProductSelector | Grid de productos + carrito |
| 849–885 | PinModal | PIN admin/cocina |
| 886–1048 | Comanda | `buildComandaData`, `ComandaPreview`, `printComanda` |
| 1049–1138 | OrderCard | Tarjeta de pedido (admin) |
| 1139–1603 | CustomerView | Flujo de pedido web |
| 1604–1853 | AdminView | Panel administración |
| 1854–1966 | KitchenView / KitchenCard | Vista cocina |
| 1968–2061 | App | Root: navegación, persistencia, render condicional |

---

## Configuración rápida (constantes ~L3–9)

```js
const SUCURSALES = ["Loncoche", "La Paz"];
const COSTO_DELIVERY = 2000;           // CLP
const WHATSAPP_NUM   = "56966390079";  // sin +, para wa.me
const MAX_CAMBIOS    = 3;              // cambios por roll en promos
const ADMIN_PIN      = "1234";
const KITCHEN_PIN    = "5678";
```

---

## Modelos de datos

### Producto en `MENU`

```js
{
  id: "p1",                    // único; también clave en stockInicial
  cat: "Promos",               // categoría para agrupar en UI
  nombre: "Promo 1",
  precio: 14000,               // CLP
  piezas: 30,                  // opcional
  sucursales: ["Loncoche", "La Paz"],
  rolls: [                     // opcional; promos/handrolls
    { envoltura: "Panko", relleno: "Camarón, queso crema" }
  ]
}
```

### Ítem del carrito

```js
{
  productId: "p1",
  nombre: "Promo 1",
  precio: 14000,
  qty: 1,
  cambios: [                   // personalizaciones con costo extra
    { id: "rp", nombre: "Pollo", precio: 500 }
  ]
}
```

### Pedido (`order`)

```js
{
  id: "1730...",              // uid interno (App)
  orderId: "#1830-ABC",       // visible al cliente
  estado: "pendiente",        // pendiente | en_preparacion | listo | entregado
  fuente: "web",              // web | whatsapp | instagram | presencial | llamada
  sucursal: "Loncoche",
  tipo: "retiro",             // retiro | delivery
  direccion: "",
  referencia: "",
  horario: "Lo antes posible",
  cliente: { nombre: "", telefono: "" },
  metodoPago: "transferencia",
  observaciones: "",
  items: [],                  // ítems del carrito
  cart: [],                   // duplicado en pedidos web (legacy)
  timestamp: "2026-05-30T..."
}
```

### Estados de pedido (`ESTADOS`)

`pendiente` → `en_preparacion` → `listo` → `entregado`

---

## Persistencia

| Clave localStorage | Contenido |
|---|---|
| `sushi-v4` | Array JSON de pedidos |
| `sushi-stock` | Objeto `{ productId: boolean }` de disponibilidad |

En Claude Artifacts el JSX original usa `window.storage`. En producción, `src/main.jsx` lo emula con `localStorage`:

```js
window.storage.get(key)  → { value: string } | null
window.storage.set(key, value)
```

**Limitación:** los datos viven en el navegador del dispositivo. Admin en un celular y cocina en otro no comparten pedidos. Para sync multi-dispositivo haría falta backend (Supabase, Firebase, etc.).

---

## Recetas de modificación frecuentes

### Agregar un producto al menú

1. Añadir entrada en `MENU` (~L68) con `id` único.
2. Añadir `id: true` en `stockInicial` (~L51).
3. Probar en vista cliente filtrando por sucursal.

### Cambiar precio o nombre

Editar el objeto en `MENU`. Si el producto tiene cambios personalizables, revisar también `RELLENOS` / `ENVOLTURAS` / `SALSAS`.

### Agregar sucursal

1. Añadir a `SUCURSALES`.
2. Incluir la sucursal en `sucursales: [...]` de cada producto que aplique.

### Cambiar costo de delivery

Modificar `COSTO_DELIVERY` (~L5). La lógica está en `cartTotal` y `getPagos`.

### Marcar producto agotado por defecto

En `stockInicial`, poner `productId: false`.

### Cambiar PIN admin o cocina

`ADMIN_PIN` / `KITCHEN_PIN` (~L8–9). La sesión desbloqueada dura hasta recargar la página (`adminOk` / `kitchenOk` en memoria).

### Agregar horario de entrega

Añadir string a `HORARIOS` (~L12).

---

## Comandos

```bash
npm install          # instalar dependencias
npm run dev          # dev en http://localhost:5173 (sync automático si existe ../sushi-system.jsx)
npm run sync:sushi   # copiar manualmente DDiseno/sushi-system.jsx → src/sushi-system.jsx
npm run build        # build producción → dist/
npm run preview      # servir dist/ localmente
npm run lint         # ESLint
```

---

## Deploy en Vercel

| Setting | Valor |
|---|---|
| Root Directory | `sushi-vercel` (si el repo es el monorepo `DDiseno`) |
| Framework | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

**Checklist pre-deploy:**

1. Cambios hechos en `src/sushi-system.jsx` (o sync desde la raíz).
2. `npm run build` pasa en local.
3. `src/sushi-system.jsx` commiteado y pusheado.

No usar scripts que lean `../sushi-system.jsx` en build.

---

## Stack y convenciones de código

- **Un solo archivo de app:** no hay carpetas `components/`. Componentes = funciones en `sushi-system.jsx`.
- **Estilos:** objetos inline `style={{ ... }}`. Paleta oscura: fondo `#0A0D0A`, acento `#C9A84C`.
- **Fuentes:** Google Fonts — `DM Sans` (UI), `Crimson Pro` (títulos).
- **Formato moneda:** helper `fmt(n)` → `$14.000` (locale `es-CL`).
- **IDs de pedido visibles:** `newId()` → `#HHMM-XXX`.
- **React hooks:** solo en componentes; estado global en `App`, props hacia abajo.
- **Sin TypeScript:** JSX plano, sin PropTypes.

---

## Troubleshooting

| Problema | Causa probable | Solución |
|---|---|---|
| Vercel: `cp: cannot stat '../sushi-system.jsx'` | `prebuild` intentaba copiar archivo padre | Ya removido; usar `src/sushi-system.jsx` commiteado |
| Cambios no aparecen en producción | Editaste la copia de la raíz sin sync/commit | `npm run sync:sushi` + commit + redeploy |
| Pedidos no persisten | Storage bloqueado o modo incógnito | Normal en incógnito; revisar polyfill en `main.jsx` |
| Admin/cocina no comparten datos | localStorage es por navegador | Esperado; requiere backend para sync |
| Build falla resolviendo `react` | JSX importado desde fuera de `src/` | Mantener app dentro de `src/sushi-system.jsx` |

---

## Roadmap / mejoras posibles (no implementadas)

- Backend (Supabase/Firebase) para pedidos y stock compartidos en tiempo real.
- Auth real para admin/cocina (no PIN en cliente).
- PWA / notificaciones push para nuevos pedidos.
- Separar `sushi-system.jsx` en módulos si supera mantenibilidad (~2000+ líneas).
