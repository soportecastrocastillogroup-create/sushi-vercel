/**
 * Splits sushi-system.jsx into component modules.
 * Run once: node scripts/split-components.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const src = join(root, "src");
const srcFile = join(src, "sushi-system.jsx");
const content = readFileSync(srcFile, "utf8");

const dirs = [
  "components/layout",
  "components/shared",
  "components/customer",
  "components/admin",
  "components/kitchen",
  "components/reportes",
];
dirs.forEach((d) => mkdirSync(join(src, d), { recursive: true }));

function extract(startMarker, endMarker) {
  const start = content.indexOf(startMarker);
  const end = content.indexOf(endMarker, start);
  if (start === -1 || end === -1) throw new Error(`Missing: ${startMarker}`);
  return content.slice(start, end);
}

const globalReplacements = [
  [/const fmt\s*=.*?;\n/g, ""],
  [/const uid\s*=.*?;\n/g, ""],
  [/let orderCounter.*?;\nconst newId.*?;\n\n/s, ""],
  [/const timeAgo\s*=.*?;\n/g, ""],
  [/const cambiosCosto.*?;\n/g, ""],
  [/const itemTotal\s*=.*?;\n/g, ""],
  [/const cartSubtotal\s*=.*?;\n/g, ""],
  [/const cartTotal\s*=.*?;\n/g, ""],
  [/const emptyForm\s*=.*?;\n\n/s, ""],
  [/const SUCURSALES\s*=.*?;\n/g, ""],
  [/const COSTO_DELIVERY\s*=.*?;\n/g, ""],
  [/const WHATSAPP_NUM\s*=.*?;\n/g, ""],
  [/const MAX_CAMBIOS\s*=.*?;\n/g, ""],
  [/const ADMIN_PIN\s*=.*?;\n/g, ""],
  [/const KITCHEN_PIN\s*=.*?;\n/g, ""],
  [/const REPORTES_PIN\s*=.*?;\n/g, ""],
  [/const MAX_POR_HORARIO\s*=.*?;\n/g, ""],
  [/const ALERTA_PEDIDOS\s*=.*?;\n/g, ""],
  [/const HORARIOS_BASE\s*=.*?;\n\n/s, ""],
  [/const DIAS_BLOQUEADOS_DEFAULT\s*=.*?;\n/g, ""],
  [/const NOMBRES_DIAS\s*=.*?;\n\n/s, ""],
  [/const getFechasDisponibles[\s\S]*?};\n\n/s, ""],
  [/const formatFecha[\s\S]*?};\n\n/s, ""],
  [/const getHorariosDisponibles[\s\S]*?};\n\n/s, ""],
  [/const RELLENOS[\s\S]*?const SOLO_POLLO[\s\S]*?;\n\n/s, ""],
  [/const stockInicial[\s\S]*?;\n\n/s, ""],
  [/const diasDesbloqueadosInicial[\s\S]*?;\n\n/s, ""],
  [/const MENU\s*=\s*\[[\s\S]*?\];\n\n/s, ""],
  [/const ESTADOS[\s\S]*?const getPagos[\s\S]*?;\n\n/s, ""],
  [/const labelCompletado[\s\S]*?;\n/g, ""],
  [/MENU\./g, "menu."],
  [/MENU\[/g, "menu["],
  [/MENU,/g, "menu,"],
  [/MENU\)/g, "menu)"],
  [/MENU /g, "menu "],
  [/MENU$/gm, "menu"],
  [/\bMENU\b/g, "menu"],
  [/\bSUCURSALES\b/g, "branches"],
  [/\bCOSTO_DELIVERY\b/g, "settings.costoDelivery"],
  [/\bWHATSAPP_NUM\b/g, "settings.whatsappNum"],
  [/\bMAX_CAMBIOS\b/g, "settings.maxCambios"],
  [/\bADMIN_PIN\b/g, "settings.adminPin"],
  [/\bKITCHEN_PIN\b/g, "settings.kitchenPin"],
  [/\bREPORTES_PIN\b/g, "settings.reportesPin"],
  [/\bMAX_POR_HORARIO\b/g, "settings.maxPorHorario"],
  [/\bALERTA_PEDIDOS\b/g, "settings.alertaPedidos"],
  [/\bHORARIOS_BASE\b/g, "settings.timeSlots"],
  [/\bDIAS_BLOQUEADOS_DEFAULT\b/g, "settings.blockedWeekdays"],
  [/\bRELLENOS\b/g, "customizations.rellenos"],
  [/\bENVOLTURAS\b/g, "customizations.envolturas"],
  [/\bSALSAS\b/g, "customizations.salsas"],
  [/\bSOLO_POLLO\b/g, "customizations.soloPollo"],
  [/cartTotal\(([^,)]+),([^)]+)\)/g, "cartTotal($1,$2,settings.costoDelivery)"],
  [/getFechasDisponibles\(\)/g, "getFechasDisponibles(diasDesbloqueados, settings.blockedWeekdays)"],
  [/getFechasDisponibles\(diasDesbloqueados\)/g, "getFechasDisponibles(diasDesbloqueados, settings.blockedWeekdays)"],
  [/getHorariosDisponibles\(([^,)]+),\s*orders\)/g, "getHorariosDisponibles($1, orders, settings.timeSlots, settings.maxPorHorario)"],
  [/useState\(\(\)=>\{[\s\S]*?horario: horariosDisp\[0\][\s\S]*?\}\);\n\n/g, ""],
  [/  const toggle = \(opt,tipo\)=>\{[\s\S]*?\};\n\/\/ ── PRODUCT SELECTOR/g, "// ── PRODUCT SELECTOR"],
  [/newId\(\)/g, "null /* order number from server */"],
];

function adapt(code, extraImports = "") {
  let c = code;
  for (const [from, to] of globalReplacements) c = c.replace(from, to);
  if (!c.includes("import { useState")) {
    c = `import { useState, useEffect } from "react";\n${extraImports}\n${c}`;
  } else {
    c = c.replace(
      'import { useState, useEffect } from "react";',
      `import { useState, useEffect } from "react";\n${extraImports}`
    );
  }
  return c;
}

const commonImports = `
import { fmt, uid, timeAgo } from "../../utils/format.js";
import { cambiosCosto, itemTotal, cartSubtotal, cartTotal } from "../../utils/cart.js";
import { getFechasDisponibles, getHorariosDisponibles, formatFecha } from "../../utils/dates.js";
import { emptyForm, labelCompletado } from "../../utils/orders.js";
import { ESTADOS, FUENTES, getPagos, NOMBRES_DIAS } from "../../constants/estados.js";
`;

// PinModal
let pin = extract("// ── PIN MODAL", "// ── COMANDA");
pin = pin.replace("function PinModal", "export default function PinModal");
writeFileSync(join(src, "components/shared/PinModal.jsx"), adapt(pin, commonImports));

// Comanda
let comanda = extract("// ── COMANDA PREVIEW", "// ── ORDER CARD");
const buildFn = comanda.match(/const buildComandaData[\s\S]*?};/)[0];
const printFn = comanda.match(/const printComanda[\s\S]*?};/)[0];
const previewFn = comanda.match(/function ComandaPreview[\s\S]*?^}/m)[0];
writeFileSync(
  join(src, "components/shared/Comanda.jsx"),
  `import { fmt } from "../../utils/format.js";
import { cambiosCosto } from "../../utils/cart.js";
import { FUENTES, getPagos } from "../../constants/estados.js";

${buildFn.replace("COSTO_DELIVERY", "costoDelivery")}

export function buildComandaData(order, costoDelivery = 0) {
  const sub = order.items.reduce((s, i) => s + (i.precio + cambiosCosto(i.cambios)) * i.qty, 0);
  const del = order.tipo === "delivery" ? costoDelivery : 0;
  return { sub, del, tot: sub + del };
}

export ${previewFn.replace("function ComandaPreview", "function ComandaPreview").replace(/buildComandaData\(order\)/g, "buildComandaData(order, settings.costoDelivery)")}

export ${printFn.replace(/buildComandaData\(order\)/g, "buildComandaData(order, costoDelivery)")}
`.replace(
    /function ComandaPreview\(\{ order, onClose \}\)/,
    "export function ComandaPreview({ order, onClose, settings })"
  )
);

// OrderCard
let orderCard = extract("// ── ORDER CARD", "// ── CUSTOMER VIEW");
orderCard = orderCard.replace("function OrderCard", "export default function OrderCard");
orderCard = orderCard.replace(
  "function OrderCard({ order, onStatusChange })",
  "export default function OrderCard({ order, onStatusChange, settings })"
);
orderCard = orderCard.replace(
  /const \{sub,del,tot\}=buildComandaData\(order\)/,
  "const {sub,del,tot}=buildComandaData(order, settings.costoDelivery)"
);
orderCard = orderCard.replace(
  "<ComandaPreview order={order}",
  "<ComandaPreview order={order} settings={settings}"
);
writeFileSync(
  join(src, "components/shared/OrderCard.jsx"),
  adapt(
    orderCard,
    `${commonImports}
import { buildComandaData, ComandaPreview, printComanda } from "./Comanda.jsx";
`
  )
);

// CustomizationModal
let custom = extract("// ── CUSTOMIZATION MODAL", "// ── PRODUCT SELECTOR");
custom = custom.replace(
  "function CustomizationModal({ product, onConfirm, onClose })",
  "export default function CustomizationModal({ product, onConfirm, onClose, customizations, settings })"
);
writeFileSync(join(src, "components/customer/CustomizationModal.jsx"), adapt(custom, commonImports));

// ProductSelector
let ps = extract("// ── PRODUCT SELECTOR", "// ── PIN MODAL");
ps = ps.replace(
  "function ProductSelector({ cart, onAdd, onRemove, sucursal, stock={} })",
  "export default function ProductSelector({ cart, onAdd, onRemove, sucursal, stock={}, menu, customizations, settings })"
);
ps = ps.replace(
  "{modal&&<CustomizationModal product={modal} onConfirm={confirmCustom} onClose={()=>setModal(null)}/>}",
  "{modal&&<CustomizationModal product={modal} onConfirm={confirmCustom} onClose={()=>setModal(null)} customizations={customizations} settings={settings}/>}"
);
writeFileSync(
  join(src, "components/customer/ProductSelector.jsx"),
  adapt(
    ps,
    `${commonImports}
import CustomizationModal from "./CustomizationModal.jsx";
`
  )
);

// CustomerView
let cv = extract("// ── CUSTOMER VIEW", "// ── ADMIN VIEW");
cv = cv.replace(
  "function CustomerView({ onAddOrder, stock, orders, diasDesbloqueados=[] })",
  "export default function CustomerView({ onAddOrder, stock, orders, diasDesbloqueados=[], menu, customizations, settings, branches })"
);
cv = cv.replace(/emptyForm\("web"\)/g, 'emptyForm("web", branches[0])');
cv = cv.replace(
  /const order=\{[\s\S]*?timestamp:new Date\(\)\.toISOString\(\)\};/,
  `const order={...form, items:form.cart, estado:"abierto", fuente:"web", timestamp:new Date().toISOString()};`
);
cv = cv.replace("onAddOrder(order);", "onAddOrder(order).then(setLastOrder);");
cv = cv.replace(
  "<ProductSelector",
  "<ProductSelector menu={menu} customizations={customizations} settings={settings}"
);
cv = cv.replace(
  "<ComandaPreview order={lastOrder}",
  "<ComandaPreview order={lastOrder} settings={settings}"
);
cv = cv.replace(
  /o\.estado!==\"entregado\"/g,
  'o.estado!=="completado"'
);
cv = cv.replace(
  /useState\(\(\)=>\{[\s\S]*?horariosDisp\[0\][\s\S]*?\}\);/,
  `useEffect(()=>{
    if(!form.horario && horariosDisp.length>0){
      setForm(f=>({...f, horario: horariosDisp[0]}));
    }
  }, [form.fecha, horariosDisp.length]);`
);
writeFileSync(
  join(src, "components/customer/CustomerView.jsx"),
  adapt(
    cv,
    `${commonImports}
import ProductSelector from "./ProductSelector.jsx";
import { buildComandaData, ComandaPreview, printComanda } from "../shared/Comanda.jsx";
`
  )
);

// AdminView
let av = extract("// ── ADMIN VIEW", "// ── KITCHEN CARD");
av = av.replace(
  "function AdminView({ orders, onAddOrder, onStatusChange, stock, onToggleStock, diasDesbloqueados=[], onToggleDia })",
  "export default function AdminView({ orders, onAddOrder, onStatusChange, stock, onToggleStock, diasDesbloqueados=[], onToggleDia, menu, customizations, settings, branches, onRefresh })"
);
av = av.replace(/emptyForm\("presencial"\)/g, 'emptyForm("presencial", branches[0])');
av = av.replace(
  /onAddOrder\(\{[\s\S]*?timestamp:new Date\(\)\.toISOString\(\)\}\);/,
  `onAddOrder({...mf,items:mf.cart,estado:"abierto",timestamp:new Date().toISOString()});`
);
av = av.replace("<OrderCard key={o.id}", "<OrderCard key={o.id} settings={settings}");
av = av.replace(
  "<ProductSelector",
  "<ProductSelector menu={menu} customizations={customizations} settings={settings}"
);
av = av.replace(
  /getFechasDisponibles\(\)\.map\(f=><option key=\{f\} value=\{f\}>\{formatFecha\(f\)\}/,
  "getFechasDisponibles(diasDesbloqueados, settings.blockedWeekdays).map(({iso})=><option key={iso} value={iso}>{formatFecha(iso)}"
);
// Add refresh button after header stats
av = av.replace(
  "+ Pedido manual\n        </button>",
  `+ Pedido manual
        </button>
        {onRefresh&&(
          <button onClick={onRefresh}
            style={{ padding:"8px 14px",background:"transparent",border:"1px solid #1E2820",borderRadius:8,
              color:"#607060",cursor:"pointer",fontSize:13,whiteSpace:"nowrap" }}>
            ↻ Actualizar
          </button>
        )}`
);
writeFileSync(
  join(src, "components/admin/AdminView.jsx"),
  adapt(
    av,
    `${commonImports}
import OrderCard from "../shared/OrderCard.jsx";
import ProductSelector from "../customer/ProductSelector.jsx";
`
  )
);

// KitchenCard
let kc = extract("// ── KITCHEN CARD", "// ── KITCHEN VIEW");
kc = kc.replace("function KitchenCard", "export default function KitchenCard");
kc = kc.replace(
  "function KitchenCard({ order, onStatusChange })",
  "export default function KitchenCard({ order, onStatusChange, settings })"
);
kc = kc.replace(
  "<ComandaPreview order={order}",
  "<ComandaPreview order={order} settings={settings}"
);
writeFileSync(
  join(src, "components/kitchen/KitchenCard.jsx"),
  adapt(
    kc,
    `${commonImports}
import { ComandaPreview, printComanda } from "../shared/Comanda.jsx";
`
  )
);

// KitchenView
let kv = extract("// ── KITCHEN VIEW", "// ── REPORTES VIEW");
kv = kv.replace("function KitchenView", "export default function KitchenView");
kv = kv.replace(
  "function KitchenView({ orders, onStatusChange })",
  "export default function KitchenView({ orders, onStatusChange, settings, branches, onRefresh })"
);
kv = kv.replace(
  '<KitchenCard key={o.id} order={o} onStatusChange={onStatusChange}/>',
  '<KitchenCard key={o.id} order={o} onStatusChange={onStatusChange} settings={settings}/>'
);
kv = kv.replace(
  `{["all",...SUCURSALES].map`,
  `{["all",...branches].map`
);
kv = kv.replace(
  '<div style={{ display:"flex",gap:6,marginBottom:14',
  `{onRefresh&&(
        <button onClick={onRefresh} style={{ padding:"4px 12px",borderRadius:20,border:"1px solid #1E2820",
          background:"transparent",color:"#607060",cursor:"pointer",fontSize:12,marginBottom:14 }}>
          ↻ Actualizar
        </button>
      )}
      <div style={{ display:"flex",gap:6,marginBottom:14`
);
writeFileSync(
  join(src, "components/kitchen/KitchenView.jsx"),
  adapt(kv, `${commonImports}\nimport KitchenCard from "./KitchenCard.jsx";\n`)
);

// ReportesView
let rv = extract("// ── REPORTES VIEW", "// ── APP ROOT");
rv = rv.replace("function ReportesView", "export default function ReportesView");
rv = rv.replace(
  "function ReportesView({ orders })",
  "export default function ReportesView({ orders, settings, branches })"
);
writeFileSync(join(src, "components/reportes/ReportesView.jsx"), adapt(rv, commonImports));

// Layout
writeFileSync(
  join(src, "components/layout/GlobalStyles.jsx"),
  `export default function GlobalStyles() {
  return (
    <style>{\`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&family=Crimson+Pro:ital,wght@0,400;0,600;1,400&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans',system-ui,sans-serif}
        select option{background:#141914;color:#F0EBE0}
        ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:#0A0D0A}
        ::-webkit-scrollbar-thumb{background:#252F28;border-radius:2px}
        input::placeholder,textarea::placeholder{color:#354035}
        select{font-family:'DM Sans',system-ui,sans-serif}
      \`}</style>
  );
}
`
);

writeFileSync(
  join(src, "components/layout/AppNav.jsx"),
  `export default function AppNav({ view, nav, onNavigate }) {
  return (
    <div style={{ borderBottom:"1px solid #141914",position:"sticky",top:0,background:"#0A0D0A",zIndex:50 }}>
      <div style={{ maxWidth:720,margin:"0 auto",padding:"0 16px",
        display:"flex",alignItems:"center",justifyContent:"space-between",height:52 }}>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          <span style={{ fontSize:20 }}>🍣</span>
          <span style={{ fontFamily:"'Crimson Pro',serif",fontSize:18,fontWeight:600,
            color:"#D8E8C8",letterSpacing:0.3 }}>Sushi Loncoche</span>
        </div>
        <div style={{ display:"flex",gap:2 }}>
          {nav.map(item=>(
            <button key={item.id} onClick={()=>onNavigate(item.id)}
              style={{ padding:"6px 10px",borderRadius:8,border:"none",cursor:"pointer",
                fontSize:11,fontWeight:600,fontFamily:"'DM Sans',sans-serif",
                background:view===item.id?"#C9A84C18":"transparent",
                color:view===item.id?"#C9A84C":"#405040",transition:"all 0.15s" }}>
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
`
);

console.log("Split components created.");
