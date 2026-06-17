# Sushi Loncoche — Sistema de pedidos

App web de pedidos para **Sushi Loncoche** (sucursales Loncoche y La Paz, Chile). Cuatro vistas: cliente, admin, cocina y reportes.

Stack: **React 19 + Vite 8 + Supabase**, estilos inline. Deploy en **Vercel** como sitio estático.

---

## Configuración inicial

### 1. Supabase

1. Crear un proyecto en [Supabase](https://supabase.com).
2. En el **SQL Editor**, ejecutar el archivo [`supabase/schema.sql`](supabase/schema.sql) completo.
3. Copiar **Project URL** y **anon public key** desde Settings → API.

### 2. Variables de entorno

```bash
cp .env.example .env
```

Editar `.env`:

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

En Vercel, agregar las mismas variables en el dashboard del proyecto.

### 3. Desarrollo local

```bash
npm install
npm run dev
```

---

## Estructura del proyecto

```
sushi-vercel/
├── supabase/
│   └── schema.sql          # DDL + seed + RLS (ejecutar en Supabase)
├── src/
│   ├── App.jsx             # Root: hooks, navegación, vistas
│   ├── main.jsx            # Entry point React
│   ├── lib/supabase.js     # Cliente Supabase
│   ├── services/           # Capa de datos (catalog, orders, stock…)
│   ├── hooks/              # useCatalog, useSettings, useOrders…
│   ├── constants/          # Estados, fuentes, pagos (UI)
│   ├── utils/              # Formato, carrito, fechas
│   └── components/
│       ├── layout/         # AppNav, GlobalStyles
│       ├── shared/         # PinModal, OrderCard, Comanda
│       ├── customer/       # Flujo de pedido web
│       ├── admin/          # Panel administración
│       ├── kitchen/        # Vista cocina (kanban)
│       └── reportes/       # Reportes y export CSV
├── scripts/
│   ├── generate-schema.mjs # Regenera schema.sql desde seed
│   └── split-components.mjs
└── package.json
```

---

## ¿Qué archivo edito?

| Quiero cambiar… | Dónde |
|---|---|
| Menú, precios, promos, opciones de personalización | `supabase/schema.sql` (seed) → re-ejecutar en Supabase |
| PINs, WhatsApp, horarios, límites | Tabla `app_settings` en Supabase |
| Lógica de pedidos / estados | `src/services/orders.js`, `src/constants/estados.js` |
| UI del flujo cliente | `src/components/customer/` |
| UI admin / cocina / reportes | `src/components/admin/`, `kitchen/`, `reportes/` |
| Variables de entorno | `.env` (local) / Vercel dashboard (prod) |

---

## Persistencia (Supabase)

| Tabla | Contenido |
|---|---|
| `products`, `promo_rolls`, `promo_options` | Catálogo del menú |
| `customization_options` | Rellenos, envolturas, salsas |
| `app_settings` | Config global (delivery, PINs, límites) |
| `product_stock` | Disponibilidad por producto |
| `unlocked_dates` | Días desbloqueados manualmente |
| `orders`, `order_items` | Pedidos y líneas (snapshot) |

Los pedidos usan secuencia SQL (`get_next_order_number()`) para números `#001`, `#002`, etc.

**Sincronización:** sin Realtime; admin y cocina ven cambios al pulsar **↻ Actualizar** o al recargar la página.

---

## Comandos

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # build producción → dist/
npm run preview      # servir dist/ localmente
npm run lint         # ESLint
node scripts/generate-schema.mjs   # regenerar schema.sql
```

---

## Deploy en Vercel

| Setting | Valor |
|---|---|
| Root Directory | `sushi-vercel` (si monorepo) |
| Framework | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |

**Checklist:**

1. Ejecutar `supabase/schema.sql` en el proyecto Supabase.
2. Configurar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en Vercel.
3. `npm run build` pasa en local.
4. Probar flujo: pedido web → aparece en admin/cocina tras actualizar.

---

## Seguridad

Los PINs de admin/cocina/reportes viven en `app_settings` y se validan en el cliente. Las políticas RLS son permisivas para el rol `anon` (equivalente al modelo anterior con localStorage). Para producción seria, migrar a Supabase Auth.

---

## Troubleshooting

| Problema | Solución |
|---|---|
| Pantalla de error al cargar | Verificar `.env`, schema SQL ejecutado, RLS habilitado |
| Pedidos no aparecen en otro dispositivo | Pulsar ↻ Actualizar o recargar (sin Realtime) |
| `get_next_order_number` falla | Verificar que la función y secuencia existen en Supabase |
| Build falla | `npm run lint` y revisar imports |
