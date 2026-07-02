import { useState, useEffect } from "react";

// ── CONFIG ───────────────────────────────────────────────────────────────────
const SUCURSALES = ["Loncoche", "La Paz"];
const COSTO_DELIVERY = 2000;
const WHATSAPP_NUM   = "56966390079";
const MAX_CAMBIOS    = 3;
const ADMIN_PIN      = "1421";
const KITCHEN_PIN    = "1420";
const REPORTES_PIN   = "1422";
const MAX_POR_HORARIO = 4;
const ALERTA_PEDIDOS  = 18;

// ── FECHAS Y HORARIOS DINÁMICOS ───────────────────────────────────────────────
const HORARIOS_BASE = [
  "17:00","17:15","17:30","17:45",
  "18:00","18:15","18:30","18:45",
  "19:00","19:15","19:30","19:45",
  "20:00","20:15","20:30","20:45",
  "21:00","21:15","21:30",
];

// 0=Dom 1=Lun 2=Mar 3=Mié 4=Jue 5=Vie 6=Sáb
// Miércoles–Sábado abiertos por defecto
const DIAS_BLOQUEADOS_DEFAULT = [0, 1, 2]; // Dom, Lun, Mar
const NOMBRES_DIAS = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];

// Devuelve fechas: hoy + 6 días, marcando cuáles están bloqueadas
const getFechasDisponibles = (diasDesbloqueados=[]) => {
  const resultado = [];
  const hoy = new Date();
  for(let i=0;i<7;i++){
    const d = new Date(hoy);
    d.setDate(hoy.getDate()+i);
    const iso = d.toISOString().split("T")[0];
    const dow = d.getDay();
    const bloqueado = DIAS_BLOQUEADOS_DEFAULT.includes(dow) && !diasDesbloqueados.includes(iso);
    resultado.push({ iso, dow, bloqueado });
  }
  return resultado;
};

const formatFecha = (iso) => {
  const d = new Date(iso+"T12:00:00");
  const dias = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
  const meses = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  const hoy = new Date().toISOString().split("T")[0];
  const manana = new Date(Date.now()+86400000).toISOString().split("T")[0];
  if(iso===hoy) return `Hoy, ${d.getDate()} ${meses[d.getMonth()]}`;
  if(iso===manana) return `Mañana, ${d.getDate()} ${meses[d.getMonth()]}`;
  return `${dias[d.getDay()]} ${d.getDate()} ${meses[d.getMonth()]}`;
};

// Horarios disponibles según fecha seleccionada y pedidos existentes
const getHorariosDisponibles = (fecha, orders) => {
  const hoy = new Date().toISOString().split("T")[0];
  const ahora = new Date();

  return HORARIOS_BASE.filter(h => {
    // Si es hoy, filtrar horarios pasados o con menos de 30 min
    if(fecha === hoy){
      const [hh,mm] = h.split(":").map(Number);
      const limiteMs = new Date();
      limiteMs.setHours(hh,mm,0,0);
      const diffMin = (limiteMs - ahora) / 60000;
      if(diffMin < 30) return false;
    }
    // Contar pedidos en ese horario+fecha
    const count = orders.filter(o =>
      o.fecha === fecha && o.horario === h &&
      o.estado !== "entregado"
    ).length;
    return count < MAX_POR_HORARIO;
  });
};

// ── OPCIONES DE CAMBIOS ──────────────────────────────────────────────────────
const RELLENOS = [
  { id:"rs",  nombre:"Salmón",           precio:2500 },
  { id:"rp",  nombre:"Pollo",            precio:500  },
  { id:"rpa", nombre:"Pollo apanado",    precio:1000 },
  { id:"rc",  nombre:"Camarón",          precio:1000 },
  { id:"rce", nombre:"Cebollín",         precio:500  },
  { id:"rci", nombre:"Ciboulette",       precio:500  },
  { id:"rpl", nombre:"Palta",            precio:1000 },
  { id:"rch", nombre:"Champiñones",      precio:1000 },
  { id:"rca", nombre:"Camarón apanado",  precio:1500 },
];
const ENVOLTURAS = [
  { id:"esa", nombre:"Salmón ahumado",  precio:2500 },
  { id:"emg", nombre:"Mango",           precio:2000 },
  { id:"epa", nombre:"Palta",           precio:2000 },
  { id:"eqc", nombre:"Queso crema",     precio:1000 },
  { id:"eci", nombre:"Ciboulette",      precio:500  },
  { id:"ese", nombre:"Sésamo",          precio:500  },
  { id:"epk", nombre:"Panko",           precio:500  },
];
const SALSAS = [
  { id:"sac", nombre:"Salsa acevichada", precio:500 },
  { id:"sso", nombre:"Soya",             precio:500 },
  { id:"sag", nombre:"Salsa agridulce",  precio:500 },
];

// Para salsas se puede agregar más de una unidad — se manejan como items separados con qty

const SOLO_POLLO = { id:"solo_pollo", nombre:"Toda la promo solo pollo", precio:500, tipo:"especial" };

// Stock activo por producto (true = disponible, false = agotado)
const stockInicial = {
  p1:true,p2:true,p3:true,pmx:true,pef:true,pes:true,pmm:true,pfr:true,
  hr1:true,hr2:true,hr3:true,
  rqc1:true,rqc2:true,rqc3:true,rpk1:true,rpk2:true,rpk3:true,
  rpa1:true,rpa2:true,rpa3:true,rmg1:true,rmg2:true,
  rsa1:true,rsa2:true,rcb1:true,rcb2:true,rss1:true,rss2:true,
  pp1:true,pp2:true,pp3:true,pp4:true,pp5:true,pp6:true,pp7:true,
  bg1:true,bg2:true,bg3:true,bg4:true,bg5:true,
  bm1:true,bm2:true,bm3:true,bm4:true,
  bsa1:true,bsa2:true,bsa3:true,bsa4:true,
  bc1:true,bc2:true,bc3:true,bc4:true,
  bch1:true,bch2:true,bch3:true,
  bp1:true,bp2:true,bw1:true,
  bb1:true,bb2:true,bb3:true,bb4:true,bb5:true,bb6:true,bb7:true,
  be1:true,
};

// Días desbloqueados de forma extraordinaria (array de fechas ISO "YYYY-MM-DD")
const diasDesbloqueadosInicial = [];


const MENU = [
  // ═══════════════ PROMOS (orden solicitado) ═══════════════
  {
    id:"p1", cat:"Promos", nombre:"Promo 1", precio:14000, piezas:30,
    sucursales:["Loncoche","La Paz"],
    rolls:[
      { envoltura:"Queso Crema", relleno:"Pollo apanado, palta, queso crema, frutos secos" },
      { envoltura:"Panko",       relleno:"Camarón, champiñón, queso crema" },
      { envoltura:"Sésamo",      relleno:"Pollo, palta, queso crema" },
    ]
  },
  {
    id:"p2", cat:"Promos", nombre:"Promo 2", precio:19500, piezas:40,
    sucursales:["Loncoche","La Paz"],
    rolls:[
      { envoltura:"Queso Crema", relleno:"Pollo apanado, palta, queso crema, frutos secos" },
      { envoltura:"Panko",       relleno:"Camarón, champiñón, queso crema" },
      { envoltura:"Sésamo",      relleno:"Pollo, palta, queso crema" },
      { envoltura:"Palta",       relleno:"Camarón, cebollín, queso crema" },
    ]
  },
  {
    id:"p3", cat:"Promos", nombre:"Promo 3", precio:25000, piezas:50,
    sucursales:["Loncoche","La Paz"],
    rolls:[
      { envoltura:"Queso Crema",    relleno:"Pollo apanado, palta, queso crema, frutos secos" },
      { envoltura:"Salmón Ahumado", relleno:"Camarón, palta, queso crema" },
      { envoltura:"Palta",          relleno:"Camarón, cebollín, queso crema" },
      { envoltura:"Sin arroz",      relleno:"Pollo apanado, palta, champiñón, queso crema" },
      { envoltura:"Panko",          relleno:"Camarón, champiñón, queso crema" },
    ]
  },
  {
    id:"pmx", cat:"Promos", nombre:"Promo Mixta", precio:23000, piezas:60,
    sucursales:["Loncoche","La Paz"],
    rolls:[
      { envoltura:"Queso Crema", relleno:"Camarón, cebollín, queso crema" },
      { envoltura:"Sésamo",      relleno:"Pollo, cebollín, queso crema" },
      { envoltura:"Ciboulette",  relleno:"Pollo, palta, queso crema" },
      { envoltura:"Panko",       relleno:"Camarón, cebollín, queso crema" },
      { envoltura:"Panko",       relleno:"Pollo, palta, queso crema" },
      { envoltura:"Panko",       relleno:"Pollo, cebollín, queso crema" },
    ]
  },
  {
    id:"pef", cat:"Promos", nombre:"Promo Extra Frita", precio:19000, piezas:50,
    sucursales:["Loncoche","La Paz"],
    rolls:[
      { envoltura:"Panko", relleno:"Pollo salteado, palta, queso crema" },
      { envoltura:"Panko", relleno:"Pollo salteado, cebollín, queso crema" },
      { envoltura:"Panko", relleno:"Camarón, palta, queso crema" },
      { envoltura:"Panko", relleno:"Camarón, cebollín, queso crema" },
      { envoltura:"Panko", relleno:"Camarón, cebollín, queso crema" },
    ]
  },
  {
    id:"pes", cat:"Promos", nombre:"Promo Especial", precio:20000, piezas:30,
    sucursales:["Loncoche","La Paz"],
    rolls:[
      { envoltura:"Mango",          relleno:"Pollo apanado, palta, queso crema" },
      { envoltura:"Palta",          relleno:"Pollo apanado, ciboulette, queso crema" },
      { envoltura:"Salmón Ahumado", relleno:"Salmón, ciboulette, queso crema" },
    ]
  },
  {
    id:"pmm", cat:"Promos", nombre:"Promo Mini Mixta", precio:10000, piezas:20,
    sucursales:["Loncoche","La Paz"],
    rolls:[
      { envoltura:"Panko",               relleno:"Camarón, palta, queso crema" },
      { envoltura:"Sésamo o Ciboulette", relleno:"Pollo apanado, palta, queso crema" },
    ],
    opciones:[
      {
        label:"¿Cómo quieres tu segundo roll?",
        rollIdx:1,
        choices:["Sésamo","Ciboulette"],
      }
    ]
  },
  {
    id:"pfr", cat:"Promos", nombre:"Promo Fría", precio:10000, piezas:20,
    sucursales:["Loncoche","La Paz"],
    rolls:[
      { envoltura:"Queso Crema o Palta", relleno:"Pollo apanado, palta, queso crema" },
      { envoltura:"Queso Crema",         relleno:"Camarón, palta, queso crema" },
    ],
    opciones:[
      {
        label:"¿Cómo quieres tu primer roll?",
        rollIdx:0,
        choices:["Queso Crema","Palta"],
      }
    ]
  },

  // ═══════════════ HANDROLLS ═══════════════
  {
    id:"hr1", cat:"Handrolls", nombre:"Handroll individual", precio:4000, piezas:1,
    sucursales:["Loncoche","La Paz"],
    desc:"Pollo, palta y queso crema  —  o  —  Pollo, queso crema y cebollín",
  },
  {
    id:"hr2", cat:"Handrolls", nombre:"2 Handrolls", precio:7000, piezas:2,
    sucursales:["Loncoche","La Paz"],
    desc:"Pollo, palta y queso crema  —  o  —  Pollo, queso crema y cebollín",
  },
  {
    id:"hr3", cat:"Handrolls", nombre:"3 Handrolls", precio:10000, piezas:3,
    sucursales:["Loncoche","La Paz"],
    desc:"Pollo, palta y queso crema  —  o  —  Pollo, queso crema y cebollín",
  },

  // ═══════════════ ROLLS ═══════════════
  // Queso Crema
  {
    id:"rqc1", cat:"Rolls", nombre:"Roll de Queso Crema", precio:6500, piezas:10,
    sucursales:["Loncoche","La Paz"],
    envolturaActual:"Queso Crema",
    desc:"Pollo apanado, palta, queso crema y frutos secos",
  },
  {
    id:"rqc2", cat:"Rolls", nombre:"Roll de Queso Crema", precio:6500, piezas:10,
    sucursales:["Loncoche","La Paz"],
    envolturaActual:"Queso Crema",
    desc:"Camarón apanado, cebollín y queso crema",
  },
  {
    id:"rqc3", cat:"Rolls", nombre:"Roll de Queso Crema", precio:7000, piezas:10,
    sucursales:["Loncoche","La Paz"],
    envolturaActual:"Queso Crema",
    desc:"Salmón, palta y cebollín",
  },
  // Panko
  {
    id:"rpk1", cat:"Rolls", nombre:"Roll de Panko", precio:6500, piezas:10,
    sucursales:["Loncoche","La Paz"],
    envolturaActual:"Panko",
    desc:"Camarón, champiñón y queso crema",
  },
  {
    id:"rpk2", cat:"Rolls", nombre:"Roll de Panko", precio:6500, piezas:10,
    sucursales:["Loncoche","La Paz"],
    envolturaActual:"Panko",
    desc:"Pollo apanado, palta y queso crema",
  },
  {
    id:"rpk3", cat:"Rolls", nombre:"Roll de Panko", precio:7000, piezas:10,
    sucursales:["Loncoche","La Paz"],
    envolturaActual:"Panko",
    desc:"Salmón, queso crema y cebollín",
  },
  // Palta
  {
    id:"rpa1", cat:"Rolls", nombre:"Roll de Palta", precio:6000, piezas:10,
    sucursales:["Loncoche","La Paz"],
    envolturaActual:"Palta",
    desc:"Camarón, queso crema y cebollín",
  },
  {
    id:"rpa2", cat:"Rolls", nombre:"Roll de Palta", precio:6500, piezas:10,
    sucursales:["Loncoche","La Paz"],
    envolturaActual:"Palta",
    desc:"Pollo apanado, ciboulette y queso crema",
  },
  {
    id:"rpa3", cat:"Rolls", nombre:"Roll de Palta", precio:7000, piezas:10,
    sucursales:["Loncoche","La Paz"],
    envolturaActual:"Palta",
    desc:"Salmón, queso crema y ciboulette",
  },
  // Mango
  {
    id:"rmg1", cat:"Rolls", nombre:"Roll de Mango", precio:7000, piezas:10,
    sucursales:["Loncoche","La Paz"],
    envolturaActual:"Mango",
    desc:"Pollo apanado, palta y queso crema",
  },
  {
    id:"rmg2", cat:"Rolls", nombre:"Roll de Mango", precio:7000, piezas:10,
    sucursales:["Loncoche","La Paz"],
    envolturaActual:"Mango",
    desc:"Camarón apanado, palta y queso crema",
  },
  // Salmón Ahumado
  {
    id:"rsa1", cat:"Rolls", nombre:"Roll de Salmón Ahumado", precio:7500, piezas:10,
    sucursales:["Loncoche","La Paz"],
    envolturaActual:"Salmón Ahumado",
    desc:"Camarón, palta y queso crema",
  },
  {
    id:"rsa2", cat:"Rolls", nombre:"Roll de Salmón Ahumado", precio:7500, piezas:10,
    sucursales:["Loncoche","La Paz"],
    envolturaActual:"Salmón Ahumado",
    desc:"Salmón, ciboulette y queso crema",
  },
  // Ciboulette
  {
    id:"rcb1", cat:"Rolls", nombre:"Roll de Ciboulette", precio:6000, piezas:10,
    sucursales:["Loncoche","La Paz"],
    envolturaActual:"Ciboulette",
    desc:"Pollo apanado, queso crema y palta",
  },
  {
    id:"rcb2", cat:"Rolls", nombre:"Roll de Ciboulette", precio:6500, piezas:10,
    sucursales:["Loncoche","La Paz"],
    envolturaActual:"Ciboulette",
    desc:"Camarón apanado, queso crema y palta",
  },
  // Sésamo
  {
    id:"rss1", cat:"Rolls", nombre:"Roll de Sésamo", precio:5000, piezas:10,
    sucursales:["Loncoche","La Paz"],
    envolturaActual:"Sésamo",
    desc:"Pollo, queso crema y palta",
  },
  {
    id:"rss2", cat:"Rolls", nombre:"Roll de Sésamo", precio:6000, piezas:10,
    sucursales:["Loncoche","La Paz"],
    envolturaActual:"Sésamo",
    desc:"Camarón apanado, cebollín y queso crema",
  },

  // ═══════════════ PARA PICAR (solo La Paz) ═══════════════
  { id:"pp1", cat:"Para Picar", nombre:"Empanada de queso — 4u",  precio:2500, piezas:4,  sucursales:["La Paz"], desc:"Media luna, frita" },
  { id:"pp2", cat:"Para Picar", nombre:"Empanada de queso — 8u",  precio:4700, piezas:8,  sucursales:["La Paz"], desc:"Media luna, frita" },
  { id:"pp3", cat:"Para Picar", nombre:"Arrollado primavera — 4u",precio:3000, piezas:4,  sucursales:["La Paz"], desc:"Frito, verduras" },
  { id:"pp4", cat:"Para Picar", nombre:"Arrollado primavera — 8u",precio:5700, piezas:8,  sucursales:["La Paz"], desc:"Frito, verduras" },
  { id:"pp5", cat:"Para Picar", nombre:"Arrollado jamón y queso — 4u",precio:3000, piezas:4, sucursales:["La Paz"], desc:"Frito" },
  { id:"pp6", cat:"Para Picar", nombre:"Arrollado jamón y queso — 8u",precio:5700, piezas:8, sucursales:["La Paz"], desc:"Frito" },
  { id:"pp7", cat:"Para Picar", nombre:"Guantán — 8u",            precio:2000, piezas:8,  sucursales:["La Paz"], desc:"Frito" },

  // ═══════════════ BEBESTIBLES (solo La Paz) ═══════════════
  // Gin
  { id:"bg1", cat:"Bebestibles", nombre:"Tropical Gin",   precio:7000, sucursales:["La Paz"], desc:"Gin con jugo tropical" },
  { id:"bg2", cat:"Bebestibles", nombre:"Gin de Verano",  precio:7000, sucursales:["La Paz"], desc:"Gin refrescante de temporada" },
  { id:"bg3", cat:"Bebestibles", nombre:"Dragon Gin",     precio:7000, sucursales:["La Paz"], desc:"Gin premium" },
  { id:"bg4", cat:"Bebestibles", nombre:"Galaxy Gin",     precio:7000, sucursales:["La Paz"], desc:"Gin premium" },
  { id:"bg5", cat:"Bebestibles", nombre:"Blue North Gin", precio:7000, sucursales:["La Paz"], desc:"Gin premium" },
  // Mojitos
  { id:"bm1", cat:"Bebestibles", nombre:"Mojito Tradicional",    precio:5000, sucursales:["La Paz"], desc:"Clásico con hierba buena" },
  { id:"bm2", cat:"Bebestibles", nombre:"Mojito Frambuesa",      precio:6000, sucursales:["La Paz"], desc:"Con sabor a frambuesa" },
  { id:"bm3", cat:"Bebestibles", nombre:"Mojito Mango",          precio:6000, sucursales:["La Paz"], desc:"Con sabor a mango" },
  { id:"bm4", cat:"Bebestibles", nombre:"Mojito Maracuyá",       precio:6000, sucursales:["La Paz"], desc:"Con sabor a maracuyá" },
  // Sin alcohol
  { id:"bsa1", cat:"Bebestibles", nombre:"Sin Alcohol Tradicional",precio:5000, sucursales:["La Paz"], desc:"Versión sin alcohol" },
  { id:"bsa2", cat:"Bebestibles", nombre:"Sin Alcohol Frambuesa", precio:5000, sucursales:["La Paz"], desc:"Sin alcohol, sabor frambuesa" },
  { id:"bsa3", cat:"Bebestibles", nombre:"Sin Alcohol Mango",     precio:5000, sucursales:["La Paz"], desc:"Sin alcohol, sabor mango" },
  { id:"bsa4", cat:"Bebestibles", nombre:"Sin Alcohol Maracuyá",  precio:5000, sucursales:["La Paz"], desc:"Sin alcohol, sabor maracuyá" },
  // Cervezas
  { id:"bc1", cat:"Bebestibles", nombre:"Dólar de Maqui",       precio:1000, sucursales:["La Paz"], desc:"Cerveza artesanal" },
  { id:"bc2", cat:"Bebestibles", nombre:"Austral Calafate",      precio:1000, sucursales:["La Paz"], desc:"Cerveza artesanal" },
  { id:"bc3", cat:"Bebestibles", nombre:"Guzmán Toroballo",      precio:1000, sucursales:["La Paz"], desc:"Cerveza artesanal" },
  { id:"bc4", cat:"Bebestibles", nombre:"Cusqueña Golden",       precio:2500, sucursales:["La Paz"], desc:"Cerveza importada" },
  // Micheladas
  { id:"bch1", cat:"Bebestibles", nombre:"Chelada",              precio:1000, sucursales:["La Paz"], desc:"Cerveza con limón" },
  { id:"bch2", cat:"Bebestibles", nombre:"Michelada",            precio:1000, sucursales:["La Paz"], desc:"Cerveza con jugo de tomate" },
  { id:"bch3", cat:"Bebestibles", nombre:"Michelada Completa",   precio:1500, sucursales:["La Paz"], desc:"Michelada con extras" },
  // Pisco y Whisky
  { id:"bp1", cat:"Bebestibles", nombre:"Pisco Sour",            precio:5000, sucursales:["La Paz"], desc:"Pisco, limón, azúcar y hielo" },
  { id:"bp2", cat:"Bebestibles", nombre:"Pisco con Bebida",      precio:5500, sucursales:["La Paz"], desc:"Pisco con bebida a elección" },
  { id:"bw1", cat:"Bebestibles", nombre:"Whisky con Bebida",     precio:6000, sucursales:["La Paz"], desc:"Whisky con bebida a elección" },
  // Bebidas
  { id:"bb1", cat:"Bebestibles", nombre:"Coca-Cola",    precio:1500, sucursales:["La Paz"], desc:"350ml" },
  { id:"bb2", cat:"Bebestibles", nombre:"Coca-Cola Zero",precio:1500, sucursales:["La Paz"], desc:"350ml" },
  { id:"bb3", cat:"Bebestibles", nombre:"Pepsi",        precio:1500, sucursales:["La Paz"], desc:"350ml" },
  { id:"bb4", cat:"Bebestibles", nombre:"Pepsi Light",  precio:1500, sucursales:["La Paz"], desc:"350ml" },
  { id:"bb5", cat:"Bebestibles", nombre:"Fanta",        precio:1500, sucursales:["La Paz"], desc:"350ml" },
  { id:"bb6", cat:"Bebestibles", nombre:"Sprite",       precio:1500, sucursales:["La Paz"], desc:"350ml" },
  { id:"bb7", cat:"Bebestibles", nombre:"Canada Dry",   precio:1500, sucursales:["La Paz"], desc:"Ginger Ale 350ml" },
  // Energéticas
  { id:"be1", cat:"Bebestibles", nombre:"Red Bull — variedades", precio:2500, sucursales:["La Paz"], desc:"Traditional, Yellow, Purple, Green, Blue, Red o Pomelo" },
];

// ── ESTADOS / FUENTES / PAGOS ─────────────────────────────────────────────────
const ESTADOS = {
  abierto:    { label:"Abierto",      color:"#F59E0B", bg:"#3A2000", next:"en_proceso",  prev:null        },
  en_proceso: { label:"En proceso",   color:"#60A5FA", bg:"#0D2444", next:"listo",        prev:"abierto"   },
  listo:      { label:"Listo ✓",      color:"#34D399", bg:"#063828", next:"completado",   prev:"en_proceso"},
  completado: { label:"Completado",   color:"#6B7280", bg:"#1A1F1A", next:null,           prev:"listo"     },
};
const labelCompletado = (tipo) => tipo==="delivery" ? "Entregado" : "Recibido";
const FUENTES = [
  { id:"web",        label:"🌐 Web"        },
  { id:"whatsapp",   label:"💬 WhatsApp"   },
  { id:"instagram",  label:"📷 Instagram"  },
  { id:"presencial", label:"🏪 Presencial" },
  { id:"llamada",    label:"📞 Llamada"    },
];
const getPagos = (tipo) => tipo==="delivery"
  ? [
      { id:"transferencia",     label:"Transferencia bancaria" },
      { id:"efectivo_delivery", label:"Efectivo (coordinar con local)" },
    ]
  : [
      { id:"transferencia",       label:"Transferencia bancaria" },
      { id:"pago_contra_entrega", label:"Pago al retirar — tarjeta o efectivo" },
    ];

// ── HELPERS ──────────────────────────────────────────────────────────────────
const fmt   = n=>`$${n.toLocaleString("es-CL")}`;
const uid   = ()=>`${Date.now()}-${Math.random().toString(36).substr(2,5)}`;

// Contador secuencial guardado en memoria
let orderCounter = 0;
const newId = () => {
  orderCounter++;
  return `#${String(orderCounter).padStart(3,"0")}`;
};

const timeAgo = iso=>{
  const mins=Math.floor((Date.now()-new Date(iso).getTime())/60000);
  if(mins<1) return "ahora"; if(mins<60) return `${mins}m`;
  const h=Math.floor(mins/60),m=mins%60; return `${h}h${m>0?` ${m}m`:""}`;
};
const cambiosCosto = (cambios=[])=>cambios.reduce((s,c)=>s+c.precio,0);
const itemTotal    = item=>(item.precio+cambiosCosto(item.cambios))*item.qty;
const cartSubtotal = cart=>cart.reduce((s,i)=>s+itemTotal(i),0);
const cartTotal    = (cart,tipo)=>cartSubtotal(cart)+(tipo==="delivery"?COSTO_DELIVERY:0);
const emptyForm    = (fuente="web")=>({
  sucursal:SUCURSALES[0], cart:[], tipo:"retiro", direccion:"",
  referencia:"", fecha: new Date().toISOString().split("T")[0],
  horario:"", cliente:{nombre:"",telefono:""}, metodoPago:"transferencia",
  observaciones:"", fuente,
});

// ── CUSTOMIZATION MODAL ──────────────────────────────────────────────────────
function CustomizationModal({ product, onConfirm, onClose }) {
  const isHandroll = product.cat==="Handrolls";
  const initialTab = product.cat==="Rolls" ? "envoltura" : "relleno";
  const [tab,setTab]           = useState(initialTab);
  const [cambios,setCambios]   = useState([]);
  const [salsaQty,setSalsaQty] = useState({});
  const [handrollSabores,setHandrollSabores] = useState(Array.from({length:product.piezas||1},()=>""));
  const [opcionesSeleccionadas,setOpcionesSeleccionadas] = useState({});
  const [obsModal,setObsModal] = useState("");

  const salsasCambios = Object.entries(salsaQty)
    .filter(([,q])=>q>0)
    .flatMap(([id,q])=>{
      const s=SALSAS.find(x=>x.id===id);
      return Array.from({length:q},()=>({...s,tipo:"salsa"}));
    });

  const totalCambios = cambiosCosto(cambios) + salsasCambios.reduce((s,c)=>s+c.precio,0);
  const canAdd = cambios.length<MAX_CAMBIOS;

  const toggle = (opt,tipo)=>{
    const idx=cambios.findIndex(c=>c.id===opt.id);
    if(idx>=0){setCambios(cambios.filter((_,i)=>i!==idx));return;}
    if(!canAdd) return;
    setCambios([...cambios,{...opt,tipo}]);
  };
  const isSel = id=>cambios.some(c=>c.id===id);

  const tabs = isHandroll ? [] : [
    {id:"relleno",   label:"Relleno",   opts:RELLENOS   },
    {id:"envoltura", label:"Envoltura", opts:ENVOLTURAS },
    {id:"salsa",     label:"Salsas",    opts:null       },
  ];

  const contextLabel = {
    envoltura: product.envolturaActual ? `Envoltura actual: ${product.envolturaActual}` : null,
    relleno:   product.desc            ? `Ingredientes: ${product.desc}` : null,
    salsa:     null,
  }[tab];

  const handleConfirm = ()=>{
    if(isHandroll){
      const sin = handrollSabores.findIndex(s=>!s);
      if(sin>=0) return alert(`Elige el sabor del handroll ${sin+1}`);
    }
    if(product.opciones){
      for(let i=0;i<product.opciones.length;i++){
        if(!opcionesSeleccionadas[i]) return alert(`Por favor elige: ${product.opciones[i].label}`);
      }
    }
    const allCambios = [...cambios, ...salsasCambios];
    onConfirm(allCambios, obsModal, handrollSabores, opcionesSeleccionadas);
  };

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.94)",zIndex:300,
      display:"flex",alignItems:"flex-end",justifyContent:"center" }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:"#111511",borderRadius:"24px 24px 0 0",border:"1px solid #222A22",
        width:"100%",maxWidth:520,maxHeight:"92vh",display:"flex",flexDirection:"column" }}>

        <div style={{ display:"flex",justifyContent:"center",padding:"12px 0 0" }}>
          <div style={{ width:36,height:4,borderRadius:2,background:"#252F25" }}/>
        </div>

        {/* Product header */}
        <div style={{ padding:"14px 22px 12px",borderBottom:"1px solid #1A221A" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12 }}>
            <div style={{ flex:1 }}>
              <div style={{ color:"#F0EBE0",fontWeight:700,fontSize:18,marginBottom:4,
                fontFamily:"'Crimson Pro',serif",fontStyle:"italic" }}>
                {product.nombre}
              </div>
              {product.piezas&&(
                <div style={{ color:"#E03030",fontSize:12,fontWeight:700,marginBottom:6 }}>
                  {product.piezas} {product.cat==="Handrolls"?"unidad(es)":"bocados"}
                </div>
              )}
              {product.rolls&&product.rolls.map((r,i)=>(
                <div key={i} style={{ fontSize:12,marginBottom:2,display:"flex",gap:4 }}>
                  <span style={{ color:"#8BA080" }}>Roll de {r.envoltura}</span>
                  <span style={{ color:"#405040" }}>· {r.relleno}</span>
                </div>
              ))}
              {product.desc&&!product.rolls&&(
                <div style={{ fontSize:13,color:"#607060",lineHeight:1.4 }}>{product.desc}</div>
              )}
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ color:"#E03030",fontWeight:700,fontSize:18 }}>{fmt(product.precio)}</div>
              {totalCambios>0&&(
                <div style={{ color:"#A07830",fontSize:12,marginTop:2 }}>+{fmt(totalCambios)}</div>
              )}
              <button onClick={onClose}
                style={{ background:"transparent",border:"none",color:"#50605A",fontSize:22,
                  cursor:"pointer",lineHeight:1,marginTop:4,padding:0 }}>×</button>
            </div>
          </div>

          {/* Handroll: sabor por unidad */}
          {isHandroll&&(
            <div style={{ marginTop:10 }}>
              <div style={{ color:"#3A5A3A",fontSize:11,letterSpacing:1,marginBottom:8 }}>
                ELIGE EL SABOR DE CADA HANDROLL — obligatorio
              </div>
              {Array.from({length:product.piezas||1},(_,i)=>(
                <div key={i} style={{ marginBottom:8 }}>
                  <div style={{ color:"#50605A",fontSize:11,marginBottom:4 }}>Handroll {i+1}</div>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:6 }}>
                    {[{id:"palta",label:"Pollo, palta y queso crema"},{id:"cebollin",label:"Pollo, queso crema y cebollín"}].map(s=>{
                      const sel=(handrollSabores[i]||"")===s.id;
                      return (
                        <button key={s.id}
                          onClick={()=>setHandrollSabores(prev=>{const n=[...prev];n[i]=s.id;return n;})}
                          style={{ padding:"10px 8px",borderRadius:10,border:"2px solid",cursor:"pointer",
                            textAlign:"center",fontSize:12,lineHeight:1.4,
                            borderColor:sel?"#C9A84C":"#1A221A",background:sel?"#C9A84C14":"#0D120D",
                            color:sel?"#C9A84C":"#8AA080",fontWeight:sel?700:400 }}>
                          {sel?"✓ ":""}{s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Opciones envoltura (Promo Fría / Mini Mixta) */}
          {product.opciones&&product.opciones.map((op,opIdx)=>(
            <div key={opIdx} style={{ marginTop:10,padding:"12px 14px",background:"#0D120D",
              borderRadius:10,border:"1px solid #1A3A1A" }}>
              <div style={{ color:"#C9A84C",fontSize:12,marginBottom:8,fontWeight:700 }}>
                🎯 {op.label} — sin costo
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
                {op.choices.map(choice=>{
                  const sel=opcionesSeleccionadas[opIdx]===choice;
                  return (
                    <button key={choice}
                      onClick={()=>setOpcionesSeleccionadas(prev=>({...prev,[opIdx]:choice}))}
                      style={{ padding:"12px 8px",borderRadius:10,border:"2px solid",cursor:"pointer",
                        textAlign:"center",fontWeight:sel?700:400,fontSize:13,
                        borderColor:sel?"#C9A84C":"#1A221A",background:sel?"#C9A84C18":"#141914",
                        color:sel?"#C9A84C":"#A0B8A0" }}>
                      {sel?"✓ ":""}{choice}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>{/* end header section */}

        {/* Tabs + options — only for non-handrolls */}
        {!isHandroll&&(
          <div style={{ flex:1,overflowY:"auto",padding:"14px 22px" }}>
            {/* Solo pollo — promos only */}
            {product.cat==="Promos"&&(()=>{
              const sel=cambios.some(c=>c.id===SOLO_POLLO.id);
              return (
                <div style={{ marginBottom:12 }}>
                  <div style={{ color:"#3A5A3A",fontSize:11,letterSpacing:1,marginBottom:6 }}>OPCIÓN RÁPIDA</div>
                  <button onClick={()=>{
                    if(sel){setCambios(cambios.filter(c=>c.id!==SOLO_POLLO.id));return;}
                    if(!canAdd) return;
                    setCambios([...cambios,SOLO_POLLO]);
                  }}
                    style={{ width:"100%",padding:"12px 16px",borderRadius:10,border:"2px solid",
                      cursor:!sel&&!canAdd?"not-allowed":"pointer",textAlign:"left",
                      borderColor:sel?"#C9A84C":"#2A4A2A",background:sel?"#C9A84C14":"#0D1A0D",
                      opacity:!sel&&!canAdd?0.4:1,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                    <div>
                      <span style={{ fontSize:14,fontWeight:700,color:sel?"#C9A84C":"#80C060" }}>
                        {sel?"✓ ":""}{SOLO_POLLO.nombre}
                      </span>
                      <div style={{ fontSize:11,color:"#405040",marginTop:2 }}>
                        Cambia el relleno de toda la promo a solo pollo
                      </div>
                    </div>
                    <span style={{ color:"#C9A84C",fontWeight:700,fontSize:15,whiteSpace:"nowrap",marginLeft:12 }}>
                      +{fmt(SOLO_POLLO.precio)}
                    </span>
                  </button>
                </div>
              );
            })()}

            {/* Tabs */}
            <div style={{ display:"flex",gap:6,marginBottom:10 }}>
              {tabs.map(t=>(
                <button key={t.id} onClick={()=>setTab(t.id)}
                  style={{ padding:"7px 16px",borderRadius:20,border:"1px solid",fontSize:13,cursor:"pointer",
                    borderColor:tab===t.id?"#C9A84C":"#1E2820",
                    background:tab===t.id?"#C9A84C20":"transparent",
                    color:tab===t.id?"#C9A84C":"#607060",fontWeight:tab===t.id?700:400 }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Context hint */}
            {contextLabel&&(
              <div style={{ background:"#0D120D",borderRadius:8,padding:"7px 12px",
                marginBottom:10,fontSize:12,color:"#4A7A4A",borderLeft:"2px solid #3A5A3A" }}>
                {contextLabel}
              </div>
            )}

            {/* Relleno / Envoltura options */}
            {tab!=="salsa"&&(
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:6 }}>
                {tabs.find(t=>t.id===tab)?.opts?.map(opt=>{
                  const sel=isSel(opt.id), blocked=!sel&&!canAdd;
                  return (
                    <button key={opt.id} onClick={()=>!blocked&&toggle(opt,tab)}
                      style={{ padding:"11px 12px",borderRadius:10,border:"2px solid",
                        cursor:blocked?"not-allowed":"pointer",textAlign:"left",transition:"all 0.15s",
                        borderColor:sel?"#C9A84C":blocked?"#111511":"#1A221A",
                        background:sel?"#C9A84C14":"#0D120D",opacity:blocked?0.3:1 }}>
                      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",gap:4 }}>
                        <span style={{ color:sel?"#C9A84C":"#C0C8C0",fontSize:13,fontWeight:sel?700:400 }}>
                          {sel?"✓ ":""}{opt.nombre}
                        </span>
                        <span style={{ color:"#C9A84C",fontSize:12,whiteSpace:"nowrap",fontWeight:600 }}>
                          +{fmt(opt.precio)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Salsas con qty */}
            {tab==="salsa"&&(
              <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                <div style={{ color:"#3A5A3A",fontSize:11,marginBottom:4 }}>
                  Podés agregar varias salsas del mismo tipo o distintas.
                </div>
                {SALSAS.map(s=>{
                  const q=salsaQty[s.id]||0;
                  return (
                    <div key={s.id}
                      style={{ display:"flex",justifyContent:"space-between",alignItems:"center",
                        padding:"10px 14px",background:"#0D120D",borderRadius:10,
                        border:`1px solid ${q>0?"#C9A84C40":"#1A221A"}` }}>
                      <div>
                        <span style={{ color:q>0?"#C9A84C":"#C0C8C0",fontSize:13,fontWeight:q>0?700:400 }}>
                          {s.nombre}
                        </span>
                        <span style={{ color:"#C9A84C",fontSize:12,marginLeft:8 }}>+{fmt(s.precio)} c/u</span>
                      </div>
                      <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                        {q>0&&(
                          <button onClick={()=>setSalsaQty(prev=>({...prev,[s.id]:Math.max(0,q-1)}))}
                            style={{ width:28,height:28,borderRadius:"50%",border:"1px solid #252F28",
                              background:"transparent",color:"#9AADA0",cursor:"pointer",
                              fontSize:16,display:"flex",alignItems:"center",justifyContent:"center" }}>−</button>
                        )}
                        {q>0&&<span style={{ color:"#F0EBE0",fontWeight:700,minWidth:16,textAlign:"center" }}>{q}</span>}
                        <button onClick={()=>setSalsaQty(prev=>({...prev,[s.id]:(prev[s.id]||0)+1}))}
                          style={{ width:28,height:28,borderRadius:"50%",border:"none",
                            background:q>0?"#C9A84C":"#1E2820",
                            color:q>0?"#0A0D0A":"#607060",cursor:"pointer",
                            fontSize:16,display:"flex",alignItems:"center",justifyContent:"center" }}>+</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Selected summary */}
            {(cambios.length>0||salsasCambios.length>0)&&(
              <div style={{ background:"#0D120D",borderRadius:10,padding:"10px 14px",marginTop:12,
                border:"1px solid #1A2A1A" }}>
                <div style={{ color:"#3A5A3A",fontSize:11,letterSpacing:1,marginBottom:6 }}>CAMBIOS SELECCIONADOS</div>
                {[...cambios,...salsasCambios].map((c,i)=>(
                  <div key={i} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                      <span style={{ color:"#354035",fontSize:10,background:"#141914",
                        padding:"1px 6px",borderRadius:8,textTransform:"capitalize" }}>
                        {c.tipo||"especial"}
                      </span>
                      <span style={{ color:"#D0E0D0",fontSize:13 }}>{c.nombre}</span>
                    </div>
                    <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                      <span style={{ color:"#C9A84C",fontSize:13 }}>+{fmt(c.precio)}</span>
                      {c.tipo!=="salsa"&&(
                        <button onClick={()=>{
                          if(c.id===SOLO_POLLO.id){setCambios(cambios.filter(x=>x.id!==c.id));}
                          else{toggle(c,c.tipo);}
                        }}
                          style={{ background:"transparent",border:"none",color:"#405040",cursor:"pointer",fontSize:18,lineHeight:1 }}>×</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Observations */}
            <div style={{ marginTop:14 }}>
              <label style={{ color:"#3A5A3A",fontSize:11,letterSpacing:1,display:"block",marginBottom:6 }}>
                ¿A QUÉ ROLL APLICA EL CAMBIO? <span style={{ color:"#2A3A2A",fontWeight:400 }}>(opcional)</span>
              </label>
              <textarea rows={2} value={obsModal}
                placeholder="Ej: El cambio aplica solo al roll de Panko..."
                onChange={e=>setObsModal(e.target.value)}
                style={{ width:"100%",padding:"9px 12px",background:"#0D120D",
                  border:"1px solid #1A2A1A",borderRadius:8,color:"#C0D0C0",
                  fontSize:13,outline:"none",resize:"none",boxSizing:"border-box",
                  fontFamily:"'DM Sans',system-ui,sans-serif",lineHeight:1.5 }}/>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ padding:"14px 22px 24px",borderTop:"1px solid #1A221A" }}>
          <button onClick={handleConfirm}
            style={{ width:"100%",padding:"15px",background:"#C9A84C",border:"none",
              borderRadius:12,color:"#0A0D0A",fontWeight:700,cursor:"pointer",fontSize:15,
              display:"flex",justifyContent:"center",alignItems:"center",gap:12 }}>
            <span>Agregar al pedido</span>
            <span style={{ background:"rgba(0,0,0,0.15)",borderRadius:6,padding:"3px 12px",fontSize:14 }}>
              {fmt(product.precio+totalCambios)}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

  const toggle = (opt,tipo)=>{
    const idx=cambios.findIndex(c=>c.id===opt.id);
    if(idx>=0){setCambios(cambios.filter((_,i)=>i!==idx));return;}
    if(!canAdd) return;
    setCambios([...cambios,{...opt,tipo}]);
  };
// ── PRODUCT SELECTOR ─────────────────────────────────────────────────────────
function ProductSelector({ cart, onAdd, onRemove, sucursal, stock={} }) {
  const visible = MENU.filter(m=>m.sucursales.includes(sucursal));
  const cats    = [...new Set(visible.map(m=>m.cat))];
  const [cat,setCat]   = useState(cats[0]||"");
  const [modal,setModal] = useState(null);

  useEffect(()=>{ if(!cats.includes(cat)) setCat(cats[0]||""); },[sucursal]);

  const qtyInCart = pid=>cart.filter(i=>i.productId===pid).reduce((s,i)=>s+i.qty,0);
  const isAvailable = product => stock[product.id]!==false;

  const handleAdd = product=>{
    if(!isAvailable(product)) return;
    if(["Promos","Rolls","Handrolls"].includes(product.cat)){ setModal(product); return; }
    // Acompañamientos and other simple items — add directly
    onAdd({ cartId:uid(), productId:product.id, nombre:product.nombre,
      precio:product.precio, piezas:product.piezas, cat:product.cat,
      desc:product.desc||"", cambios:[], obsModal:"", opcionesStr:"", qty:1 });
  };

  const confirmCustom = (cambios, obsModal, handrollSabores, opcionesSeleccionadas)=>{
    let nombreFinal = modal.nombre;
    let descFinal = modal.desc||"";
    if(modal.cat==="Handrolls" && handrollSabores && handrollSabores.length>0){
      const saboresLabel = {palta:"Palta y queso crema", cebollin:"Queso crema y cebollín"};
      if(handrollSabores.length===1){
        nombreFinal = `Handroll — ${saboresLabel[handrollSabores[0]]||handrollSabores[0]}`;
      } else {
        const resumen = handrollSabores.map((s,i)=>`#${i+1} ${saboresLabel[s]||s}`).join(", ");
        nombreFinal = modal.nombre;
        descFinal = resumen;
      }
    }
    const opcionesStr = modal.opciones
      ? modal.opciones.map((op,i)=>`${op.choices[0]} o ${op.choices[1]}: ${opcionesSeleccionadas?.[i]||"—"}`).join(" · ")
      : "";
    onAdd({ cartId:uid(), productId:modal.id, nombre:nombreFinal,
      precio:modal.precio, piezas:modal.piezas, cat:modal.cat,
      desc:descFinal, cambios, obsModal:obsModal||"",
      opcionesStr, qty:1 });
    setModal(null);
  };

  return (
    <div>
      {/* Tabs */}
      <div style={{ display:"flex",gap:6,marginBottom:14,flexWrap:"wrap" }}>
        {cats.map(c=>(
          <button key={c} onClick={()=>setCat(c)}
            style={{ padding:"7px 18px",borderRadius:20,border:"1px solid",fontSize:13,cursor:"pointer",
              borderColor:cat===c?"#C9A84C":"#1E2820",
              background:cat===c?"#C9A84C18":"transparent",
              color:cat===c?"#C9A84C":"#607060",fontWeight:cat===c?700:400 }}>
            {c}
          </button>
        ))}
      </div>

      <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
        {visible.filter(m=>m.cat===cat).map(product=>{
          const qty=qtyInCart(product.id);
          const available=isAvailable(product);
          return (
            <div key={product.id}
              style={{ background: available?(qty>0?"#0F1A0F":"#0A0D0A"):"#0D0808",
                borderRadius:14,padding:"14px 16px",
                border:`1px solid ${!available?"#3A1A1A":qty>0?"#C9A84C50":"#1A211B"}`,
                transition:"all 0.2s",opacity:available?1:0.65 }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:2,flexWrap:"wrap" }}>
                    <span style={{ color:!available?"#805050":qty>0?"#F0EBE0":"#C8D4C8",
                      fontSize:15,fontWeight:700,letterSpacing:0.2 }}>
                      {product.nombre}
                    </span>
                    {!available&&(
                      <span style={{ background:"#3A1A1A",color:"#C06060",fontSize:10,fontWeight:700,
                        padding:"2px 8px",borderRadius:6,letterSpacing:0.5 }}>
                        AGOTADO
                      </span>
                    )}
                  </div>
                  {/* Bocados — rojo y negrita */}
                  {product.piezas&&(
                    <div style={{ color:"#E03030",fontSize:12,fontWeight:800,marginBottom:5 }}>
                      {product.piezas} {product.cat==="Handrolls"?"unidad(es)":"bocados"}
                    </div>
                  )}
                  {product.rolls&&(
                    <div style={{ marginBottom:6 }}>
                      {product.rolls.map((r,i)=>(
                        <div key={i} style={{ fontSize:11,marginBottom:2,display:"flex",gap:4,alignItems:"flex-start" }}>
                          <span style={{ color:"#5A8A6A",fontWeight:600,whiteSpace:"nowrap" }}>Roll de {r.envoltura}</span>
                          <span style={{ color:"#3A5040" }}>·</span>
                          <span style={{ color:"#354535",flex:1,lineHeight:1.3 }}>{r.relleno}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {product.desc&&!product.rolls&&(
                    <div style={{ fontSize:12,color:"#4A6050",lineHeight:1.4,marginBottom:4 }}>{product.desc}</div>
                  )}
                  {/* Precio — rojo y negrita */}
                  <div style={{ color:available?"#E03030":"#804040",fontWeight:800,fontSize:16,marginTop:3 }}>
                    {fmt(product.precio)}
                  </div>
                </div>
                <button onClick={()=>handleAdd(product)}
                  disabled={!available}
                  style={{ padding:"9px 18px",borderRadius:10,border:"none",
                    cursor:available?"pointer":"not-allowed",
                    fontSize:13,fontWeight:700,marginTop:2,flexShrink:0,
                    background:!available?"#1A0D0D":qty>0?"#C9A84C":"#1A2F1A",
                    color:!available?"#604040":qty>0?"#0A0D0A":"#5A9A5A" }}>
                  {available?"+ Agregar":"Sin stock"}
                </button>
              </div>
              {cart.filter(i=>i.productId===product.id).map(entry=>(
                <div key={entry.cartId}
                  style={{ marginTop:8,padding:"7px 12px",background:"#0A0F0A",
                    borderRadius:8,borderLeft:"2px solid #C9A84C60" }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                    <div style={{ flex:1 }}>
                      {entry.cambios.length===0 && !entry.opcionesStr
                        ? <span style={{ color:"#354035",fontSize:12 }}>Sin cambios</span>
                        : entry.cambios.map((c,i)=>(
                            <span key={i} style={{ display:"inline-block",marginRight:4,marginBottom:2,
                              background:"#1A2818",color:"#6A9A6A",fontSize:11,
                              padding:"2px 8px",borderRadius:6 }}>
                              {c.nombre} +{fmt(c.precio)}
                            </span>
                          ))
                      }
                      {entry.opcionesStr&&(
                        <div style={{ fontSize:11,color:"#C9A84C",marginTop:3,fontWeight:600 }}>
                          🎯 {entry.opcionesStr}
                        </div>
                      )}
                      {entry.obsModal&&(
                        <div style={{ fontSize:11,color:"#4A6A4A",marginTop:3,fontStyle:"italic" }}>
                          📝 {entry.obsModal}
                        </div>
                      )}
                    </div>
                    <div style={{ display:"flex",alignItems:"center",gap:8,marginLeft:8 }}>
                      <span style={{ color:"#E03030",fontWeight:700,fontSize:13 }}>
                        {fmt(itemTotal(entry))}
                      </span>
                      <button onClick={()=>onRemove(entry.cartId)}
                        style={{ background:"transparent",border:"none",color:"#405040",
                          cursor:"pointer",fontSize:18,lineHeight:1 }}>×</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {modal&&<CustomizationModal product={modal} onConfirm={confirmCustom} onClose={()=>setModal(null)}/>}
    </div>
  );
}

// ── PIN MODAL ────────────────────────────────────────────────────────────────
function PinModal({ target, onSuccess, onClose }) {
  const [p,setP]=useState(""); const [err,setErr]=useState(false);
  const exp = target==="admin" ? ADMIN_PIN : target==="kitchen" ? KITCHEN_PIN : REPORTES_PIN;
  const titulo = target==="admin" ? "Panel Admin" : target==="kitchen" ? "Panel Cocina" : "Reportes";
  const icono  = target==="admin" ? "📋" : target==="kitchen" ? "👨‍🍳" : "📊";
  const check=()=>{ if(p===exp){onSuccess();}else{setErr(true);setP("");} };
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",display:"flex",
      alignItems:"center",justifyContent:"center",zIndex:1000 }}>
      <div style={{ background:"#141914",border:"1px solid #252F28",borderRadius:16,
        padding:"32px 28px",width:300,textAlign:"center" }}>
        <div style={{ fontSize:36,marginBottom:12 }}>{icono}</div>
        <h3 style={{ color:"#F0EBE0",fontFamily:"serif",fontSize:20,marginBottom:6,fontWeight:600 }}>
          {titulo}
        </h3>
        <p style={{ color:"#50605A",fontSize:13,marginBottom:20 }}>Ingresá el PIN</p>
        <input type="password" value={p} autoFocus maxLength={6}
          onChange={e=>{setP(e.target.value);setErr(false);}}
          onKeyDown={e=>e.key==="Enter"&&check()}
          placeholder="·  ·  ·  ·"
          style={{ width:"100%",background:"#0A0D0A",border:`1px solid ${err?"#EF4444":"#252F28"}`,
            borderRadius:8,padding:"12px",color:"#F0EBE0",fontSize:22,textAlign:"center",
            letterSpacing:10,outline:"none",fontFamily:"monospace",boxSizing:"border-box" }}/>
        {err&&<p style={{ color:"#EF4444",fontSize:12,marginTop:6 }}>PIN incorrecto</p>}
        <div style={{ display:"flex",gap:8,marginTop:16 }}>
          <button onClick={onClose}
            style={{ flex:1,padding:"10px",background:"transparent",border:"1px solid #252F28",
              borderRadius:8,color:"#50605A",cursor:"pointer",fontSize:13 }}>Cancelar</button>
          <button onClick={check}
            style={{ flex:1,padding:"10px",background:"#C9A84C",border:"none",
              borderRadius:8,color:"#0A0D0A",fontWeight:700,cursor:"pointer",fontSize:13 }}>Entrar</button>
        </div>
      </div>
    </div>
  );
}

// ── COMANDA PREVIEW + PRINT ──────────────────────────────────────────────────
const buildComandaData = order=>{
  const sub=order.items.reduce((s,i)=>s+(i.precio+cambiosCosto(i.cambios))*i.qty,0);
  const del=order.tipo==="delivery"?COSTO_DELIVERY:0;
  return { sub, del, tot:sub+del };
};

function ComandaPreview({ order, onClose }) {
  const {sub,del,tot}=buildComandaData(order);
  const pagos=getPagos(order.tipo);
  const pago=pagos.find(m=>m.id===order.metodoPago)?.label||order.metodoPago;
  const src=FUENTES.find(f=>f.id===order.fuente)?.label||order.fuente;
  const hora=new Date(order.timestamp).toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit"});
  const fecha=new Date(order.timestamp).toLocaleDateString("es-CL",{day:"2-digit",month:"2-digit",year:"numeric"});
  const D=()=><div style={{ borderTop:"1.5px dashed #CCC",margin:"10px 0" }}/>;
  const R=({l,v,b})=>(
    <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4,gap:8 }}>
      <span style={{ color:"#888",fontSize:12,whiteSpace:"nowrap" }}>{l}</span>
      <span style={{ color:b?"#000":"#333",fontSize:12,fontWeight:b?700:400,textAlign:"right" }}>{v}</span>
    </div>
  );
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:200,
      display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto" }}>
      <div style={{ background:"#141914",borderRadius:16,border:"1px solid #252F28",maxWidth:440,width:"100%" }}>
        <div style={{ padding:"16px 20px",borderBottom:"1px solid #1E2820",
          display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <span style={{ color:"#F0EBE0",fontWeight:700,fontSize:15 }}>Vista previa comanda</span>
          <button onClick={onClose} style={{ background:"transparent",border:"none",
            color:"#50605A",fontSize:22,cursor:"pointer" }}>×</button>
        </div>
        <div style={{ padding:20,display:"flex",justifyContent:"center" }}>
          <div style={{ background:"#FAFAF8",fontFamily:"'Courier New',monospace",width:"100%",maxWidth:300,
            borderRadius:4,padding:"20px 18px 28px",boxShadow:"0 4px 24px rgba(0,0,0,0.5)",position:"relative" }}>
            <div style={{ position:"absolute",top:-10,left:0,right:0,height:10,
              background:"repeating-linear-gradient(90deg,#FAFAF8 0,#FAFAF8 10px,transparent 10px,transparent 14px)" }}/>
            <div style={{ textAlign:"center",marginBottom:12 }}>
              <div style={{ fontSize:22,marginBottom:4 }}>🍣</div>
              <div style={{ fontSize:16,fontWeight:700,color:"#111",letterSpacing:1 }}>SUSHI LONCOCHE</div>
              <div style={{ fontSize:11,color:"#666",marginTop:2 }}>Sistema de Pedidos</div>
            </div>
            <D/><R l="N° Pedido" v={order.orderId} b/><R l="Fecha" v={fecha}/><R l="Hora" v={hora}/>
            <R l="Sucursal" v={order.sucursal}/><R l="Origen" v={src}/>
            <D/><R l="Cliente" v={order.cliente.nombre||"—"} b/>
            {order.cliente.telefono&&<R l="Teléfono" v={order.cliente.telefono}/>}
            <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6,marginTop:2 }}>
              <span style={{ fontSize:12,color:"#888" }}>Tipo</span>
              <span style={{ background:order.tipo==="delivery"?"#1a1a1a":"#2a4a2a",
                color:order.tipo==="delivery"?"#fff":"#90EE90",
                fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:3 }}>
                {order.tipo==="delivery"?"🚗 DELIVERY":"🏪 RETIRO"}
              </span>
            </div>
            {order.tipo==="delivery"&&order.direccion&&<R l="Dirección" v={order.direccion}/>}
            {order.tipo==="delivery"&&order.referencia&&<R l="Referencia" v={order.referencia}/>}
            <R l="Horario" v={order.horario}/><R l="Pago" v={pago}/>
            <D/>
            <div style={{ fontSize:11,color:"#888",fontWeight:700,marginBottom:6,letterSpacing:1 }}>PRODUCTOS</div>
            {order.items.map((item,i)=>(
              <div key={i} style={{ marginBottom:6 }}>
                <div style={{ display:"flex",justifyContent:"space-between" }}>
                  <span style={{ fontSize:13,color:"#111",fontWeight:600 }}>{item.qty}× {item.nombre}</span>
                  <span style={{ fontSize:13,color:"#444" }}>{fmt((item.precio+cambiosCosto(item.cambios))*item.qty)}</span>
                </div>
                {item.desc&&<div style={{ fontSize:11,color:"#888",paddingLeft:12 }}>{item.desc}</div>}
                {item.opcionesStr&&(
                  <div style={{ fontSize:11,color:"#c04000",paddingLeft:12,fontWeight:700 }}>🎯 {item.opcionesStr}</div>
                )}
                {item.cambios.map((c,j)=>(
                  <div key={j} style={{ fontSize:11,color:"#555",paddingLeft:12,marginTop:1 }}>
                    ↳ Cambio {c.tipo}: {c.nombre} (+{fmt(c.precio)})
                  </div>
                ))}
              </div>
            ))}
            <D/>
            <div style={{ display:"flex",justifyContent:"space-between",marginBottom:3 }}>
              <span style={{ fontSize:12,color:"#666" }}>Subtotal</span>
              <span style={{ fontSize:12,color:"#444" }}>{fmt(sub)}</span>
            </div>
            {del>0&&<div style={{ display:"flex",justifyContent:"space-between",marginBottom:3 }}>
              <span style={{ fontSize:12,color:"#666" }}>Despacho</span>
              <span style={{ fontSize:12,color:"#444" }}>{fmt(del)}</span>
            </div>}
            <div style={{ display:"flex",justifyContent:"space-between",marginTop:4 }}>
              <span style={{ fontSize:15,fontWeight:700,color:"#000" }}>TOTAL</span>
              <span style={{ fontSize:16,fontWeight:700,color:"#000" }}>{fmt(tot)}</span>
            </div>
            {order.observaciones&&(<><D/>
              <div style={{ background:"#F0F0EE",borderRadius:4,padding:"6px 10px" }}>
                <div style={{ fontSize:10,color:"#888",fontWeight:700,marginBottom:2 }}>OBSERVACIONES</div>
                <div style={{ fontSize:12,color:"#333",fontStyle:"italic" }}>{order.observaciones}</div>
              </div></>
            )}
            <D/>
            <div style={{ textAlign:"center",fontSize:10,color:"#BBB" }}>
              Impreso {new Date().toLocaleString("es-CL")}
            </div>
            <div style={{ position:"absolute",bottom:-10,left:0,right:0,height:10,
              background:"repeating-linear-gradient(90deg,#FAFAF8 0,#FAFAF8 10px,transparent 10px,transparent 14px)" }}/>
          </div>
        </div>
        <div style={{ padding:"0 20px 20px",display:"flex",gap:8 }}>
          <button onClick={onClose}
            style={{ flex:1,padding:"10px",background:"transparent",border:"1px solid #252F28",
              borderRadius:8,color:"#50605A",cursor:"pointer",fontSize:13 }}>Cerrar</button>
          <button onClick={()=>printComanda(order)}
            style={{ flex:2,padding:"10px",background:"#C9A84C",border:"none",
              borderRadius:8,color:"#0A0D0A",fontWeight:700,cursor:"pointer",fontSize:13 }}>
            🖨️ Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}

const printComanda = order=>{
  const {sub,del,tot}=buildComandaData(order);
  const pagos=getPagos(order.tipo);
  const pago=pagos.find(m=>m.id===order.metodoPago)?.label||order.metodoPago;
  const src=FUENTES.find(f=>f.id===order.fuente)?.label||order.fuente;
  const hora=new Date(order.timestamp).toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit"});
  const win=window.open("","_blank","width=380,height=720");
  win.document.write(`<html><head><title>Comanda ${order.orderId}</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Courier New',monospace;font-size:13px;padding:16px;max-width:320px;color:#000}
  h1{font-size:18px;text-align:center;margin-bottom:4px}.sub{text-align:center;font-size:11px;color:#666;margin-bottom:12px}
  .row{display:flex;justify-content:space-between;margin-bottom:3px}.divider{border:none;border-top:1px dashed #aaa;margin:10px 0}
  .label{color:#555}.total-row{font-size:16px;font-weight:bold}
  .badge{display:inline-block;padding:2px 8px;background:#000;color:#fff;border-radius:4px;font-size:11px}
  .cambio{font-size:11px;color:#666;padding-left:12px;margin:1px 0}</style></head><body>
  <h1>🍣 SUSHI LONCOCHE</h1><div class="sub">Sistema de Pedidos</div><hr class="divider">
  <div class="row"><span class="label">Pedido</span><strong>${order.orderId}</strong></div>
  <div class="row"><span class="label">Hora</span><span>${hora}</span></div>
  <div class="row"><span class="label">Sucursal</span><span>${order.sucursal}</span></div>
  <div class="row"><span class="label">Origen</span><span>${src}</span></div>
  <hr class="divider">
  <div class="row"><span class="label">Cliente</span><strong>${order.cliente.nombre||"—"}</strong></div>
  ${order.cliente.telefono?`<div class="row"><span class="label">Teléfono</span><span>${order.cliente.telefono}</span></div>`:""}
  <div class="row"><span class="label">Tipo</span><span class="badge">${order.tipo==="delivery"?"🚗 DELIVERY":"🏪 RETIRO"}</span></div>
  ${order.tipo==="delivery"&&order.direccion?`<div class="row"><span class="label">Dirección</span><span style="max-width:180px;text-align:right">${order.direccion}</span></div>`:""}
  ${order.tipo==="delivery"&&order.referencia?`<div class="row"><span class="label">Referencia</span><span>${order.referencia}</span></div>`:""}
  <div class="row"><span class="label">Horario</span><span>${order.horario}</span></div>
  <div class="row"><span class="label">Pago</span><span style="max-width:180px;text-align:right">${pago}</span></div>
  <hr class="divider">
  ${order.items.map(i=>`
    <div class="row"><span><strong>${i.qty}x</strong> ${i.nombre}</span><span>${fmt((i.precio+cambiosCosto(i.cambios))*i.qty)}</span></div>
    ${i.desc?`<div class="cambio">${i.desc}</div>`:""}
    ${i.opcionesStr?`<div class="cambio" style="color:#c04000;font-weight:bold">🎯 ${i.opcionesStr}</div>`:""}
    ${i.cambios.map(c=>`<div class="cambio">↳ Cambio ${c.tipo}: ${c.nombre} (+${fmt(c.precio)})</div>`).join("")}
    ${i.obsModal?`<div class="cambio" style="color:#2a6a2a;font-style:italic">📝 ${i.obsModal}</div>`:""}
  `).join("")}
  <hr class="divider">
  <div class="row"><span class="label">Subtotal</span><span>${fmt(sub)}</span></div>
  ${del>0?`<div class="row"><span class="label">Despacho</span><span>${fmt(del)}</span></div>`:""}
  <div class="row total-row"><span>TOTAL</span><span>${fmt(tot)}</span></div>
  ${order.observaciones?`<hr class="divider"><div style="background:#f5f5f5;border:1px solid #ddd;border-radius:4px;padding:6px;font-style:italic">💬 ${order.observaciones}</div>`:""}
  <hr class="divider"><p style="text-align:center;font-size:10px;color:#aaa">Impreso ${new Date().toLocaleString("es-CL")}</p>
  <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)};<\/script>
  </body></html>`);
  win.document.close();
};

// ── ORDER CARD (Admin) ────────────────────────────────────────────────────────
function OrderCard({ order, onStatusChange, onDelete, onEdit }) {
  const [showPreview,setShowPreview]=useState(false);
  const [confirmDelete,setConfirmDelete]=useState(false);
  const estado=ESTADOS[order.estado];
  const {sub,del,tot}=buildComandaData(order);
  const src=FUENTES.find(f=>f.id===order.fuente)?.label||order.fuente;
  return (
    <div style={{ background:"#141914",borderRadius:12,border:"1px solid #1E2820",
      padding:16,marginBottom:10,borderLeft:`3px solid ${estado.color}` }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8 }}>
        <div>
          <span style={{ color:"#F0EBE0",fontWeight:700,fontFamily:"monospace",fontSize:14 }}>{order.orderId}</span>
          <span style={{ marginLeft:8,color:"#50605A",fontSize:11 }}>{timeAgo(order.timestamp)}</span>
          <span style={{ marginLeft:8,color:"#405040",fontSize:11 }}>{src}</span>
        </div>
        <span style={{ padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:600,
          background:estado.bg,color:estado.color,whiteSpace:"nowrap" }}>
          {order.estado==="completado"?labelCompletado(order.tipo):estado.label}
        </span>
      </div>
      <div style={{ color:"#607860",fontSize:12,marginBottom:6 }}>
        📍 {order.sucursal} · {order.tipo==="delivery"?"🚗 Delivery":"🏪 Retiro"} · 📅 {order.fecha?formatFecha(order.fecha):""} · ⏰ {order.horario}
        {order.tipo==="delivery"&&order.direccion&&<span style={{ color:"#405040",marginLeft:4 }}>— {order.direccion}</span>}
        {order.tipo==="delivery"&&order.referencia&&<span style={{ color:"#354035",marginLeft:4 }}>({order.referencia})</span>}
      </div>
      <div style={{ color:"#A0B0A0",fontSize:13,marginBottom:8 }}>
        👤 {order.cliente.nombre||"Sin nombre"}
        {order.cliente.telefono&&<span style={{ color:"#607060",marginLeft:6 }}>{order.cliente.telefono}</span>}
      </div>
      <div style={{ marginBottom:8,paddingBottom:8,borderBottom:"1px solid #1A211B" }}>
        {order.items.map((item,i)=>(
          <div key={i} style={{ marginBottom:4 }}>
            <div style={{ display:"flex",justifyContent:"space-between",fontSize:13 }}>
              <span style={{ color:"#B0C0B0" }}><b style={{ color:"#D0E0D0" }}>{item.qty}×</b> {item.nombre}</span>
              <span style={{ color:"#C9A84C" }}>{fmt((item.precio+cambiosCosto(item.cambios))*item.qty)}</span>
            </div>
            {item.cambios.map((c,j)=>(
              <div key={j} style={{ fontSize:11,color:"#607060",paddingLeft:14,marginTop:1 }}>
                ↳ {c.nombre} +{fmt(c.precio)}
              </div>
            ))}
            {item.opcionesStr&&(
              <div style={{ fontSize:11,color:"#C9A84C",paddingLeft:14,marginTop:2,fontWeight:600 }}>
                🎯 {item.opcionesStr}
              </div>
            )}
            {item.obsModal&&(
              <div style={{ fontSize:11,color:"#4A6A4A",paddingLeft:14,marginTop:2,fontStyle:"italic" }}>
                📝 {item.obsModal}
              </div>
            )}
          </div>
        ))}
        {del>0&&<div style={{ display:"flex",justifyContent:"space-between",marginTop:4,fontSize:12 }}>
          <span style={{ color:"#50605A" }}>Despacho</span>
          <span style={{ color:"#C9A84C" }}>{fmt(del)}</span>
        </div>}
        <div style={{ display:"flex",justifyContent:"space-between",marginTop:6 }}>
          <span style={{ color:"#50605A",fontSize:12 }}>
            {getPagos(order.tipo).find(m=>m.id===order.metodoPago)?.label}
          </span>
          <span style={{ color:"#C9A84C",fontWeight:700,fontSize:14 }}>{fmt(tot)}</span>
        </div>
      </div>
      {order.observaciones&&(
        <div style={{ background:"#0A0D0A",borderRadius:6,padding:"5px 10px",
          marginBottom:8,fontSize:12,color:"#607060",fontStyle:"italic" }}>
          💬 {order.observaciones}
        </div>
      )}
      <div style={{ display:"flex",gap:6 }}>
        {/* Volver atrás */}
        {estado.prev&&(
          <button onClick={()=>onStatusChange(order.id,estado.prev)}
            style={{ padding:"7px 10px",background:"transparent",
              border:`1px solid ${ESTADOS[estado.prev].color}40`,
              borderRadius:6,color:ESTADOS[estado.prev].color,
              cursor:"pointer",fontSize:11 }}>
            ← {ESTADOS[estado.prev].label}
          </button>
        )}
        {/* Avanzar */}
        {estado.next&&(
          <button onClick={()=>onStatusChange(order.id,estado.next)}
            style={{ flex:1,padding:"7px",background:ESTADOS[estado.next].bg,
              border:`1px solid ${ESTADOS[estado.next].color}50`,
              borderRadius:6,color:ESTADOS[estado.next].color,
              fontWeight:700,cursor:"pointer",fontSize:12 }}>
            → {estado.next==="completado"?labelCompletado(order.tipo):ESTADOS[estado.next].label}
          </button>
        )}
        <button onClick={()=>setShowPreview(true)}
          style={{ padding:"7px 10px",background:"transparent",border:"1px solid #1E2820",
            borderRadius:6,color:"#50605A",cursor:"pointer",fontSize:12 }}>🧾</button>
        <button onClick={()=>printComanda(order)}
          style={{ padding:"7px 12px",background:"transparent",border:"1px solid #1E2820",
            borderRadius:6,color:"#50605A",cursor:"pointer",fontSize:12 }}>🖨️</button>
        {onEdit&&(
          <button onClick={()=>onEdit(order)}
            style={{ padding:"7px 10px",background:"transparent",border:"1px solid #1E3050",
              borderRadius:6,color:"#4080C0",cursor:"pointer",fontSize:12 }}>✏️</button>
        )}
        {onDelete&&(
          confirmDelete
            ? <div style={{ display:"flex",gap:4 }}>
                <button onClick={()=>onDelete(order.id)}
                  style={{ padding:"7px 10px",background:"#3A1A1A",border:"1px solid #C06060",
                    borderRadius:6,color:"#E06060",cursor:"pointer",fontSize:11,fontWeight:700 }}>
                  Sí, borrar
                </button>
                <button onClick={()=>setConfirmDelete(false)}
                  style={{ padding:"7px 8px",background:"transparent",border:"1px solid #252F28",
                    borderRadius:6,color:"#607060",cursor:"pointer",fontSize:11 }}>
                  No
                </button>
              </div>
            : <button onClick={()=>setConfirmDelete(true)}
                style={{ padding:"7px 10px",background:"transparent",border:"1px solid #3A1A1A",
                  borderRadius:6,color:"#804040",cursor:"pointer",fontSize:12 }}>🗑️</button>
        )}
      </div>
      {showPreview&&<ComandaPreview order={order} onClose={()=>setShowPreview(false)}/>}
    </div>
  );
}

// ── CUSTOMER VIEW ─────────────────────────────────────────────────────────────
function CustomerView({ onAddOrder, stock, orders, diasDesbloqueados=[] }) {
  const [step,setStep]                 = useState(1);
  const [form,setForm]                 = useState(emptyForm("web"));
  const [lastOrder,setLastOrder]       = useState(null);
  const [showPreview,setShowPreview]   = useState(false);
  const [mostrarOtrasFechas,setMostrarOtrasFechas] = useState(false);

  const sub   = cartSubtotal(form.cart);
  const tot   = cartTotal(form.cart,form.tipo);
  const count = form.cart.reduce((s,i)=>s+i.qty,0);
  const pagos = getPagos(form.tipo);

  const esDiaBloqueado = (iso) => {
    const d = new Date(iso+"T12:00:00");
    return DIAS_BLOQUEADOS_DEFAULT.includes(d.getDay()) && !diasDesbloqueados.includes(iso);
  };

  const todasFechas = getFechasDisponibles(diasDesbloqueados);
  const fechas = todasFechas.filter(f=>!f.bloqueado);
  const horariosDisp = getHorariosDisponibles(form.fecha, orders);

  const handleFechaChange = (f) => {
    const disp = getHorariosDisponibles(f, orders);
    setForm(prev=>({...prev, fecha:f, horario: disp[0]||""}));
  };

  useState(()=>{
    if(!form.horario && horariosDisp.length>0){
      setForm(f=>({...f, horario: horariosDisp[0]}));
    }
  });

  const clearForSucursal = s=>{
    const valid=MENU.filter(m=>m.sucursales.includes(s)).map(m=>m.id);
    setForm(f=>({...f,sucursal:s,cart:f.cart.filter(i=>valid.includes(i.productId))}));
  };

  const canNext = ()=>{
    if(step===1){
      if(form.tipo==="delivery" && form.direccion.trim().length<4) return false;
      if(!form.horario) return false;
      return true;
    }
    if(step===2) return count>0;
    if(step===3) return form.cliente.nombre.trim()&&form.cliente.telefono.trim();
    return true;
  };

  const handleSubmit = ()=>{
    const order={...form, items:form.cart, orderId:newId(), estado:"abierto",
      fuente:"web", timestamp:new Date().toISOString()};
    onAddOrder(order);
    setLastOrder(order);
  };

  // ── SUCCESS SCREEN ──────────────────────────────────────────────────────────
  if(lastOrder){
    const {sub:oSub, del:oDel, tot:oTot}=buildComandaData({...lastOrder,items:lastOrder.items});
    const pago = getPagos(lastOrder.tipo).find(m=>m.id===lastOrder.metodoPago)?.label||"";
    const itemsTexto = lastOrder.items.map(i=>{
      let linea = `• ${i.qty}× ${i.nombre} — ${fmt((i.precio+cambiosCosto(i.cambios))*i.qty)}`;
      if(i.opcionesStr) linea += `\n  🎯 ${i.opcionesStr}`;
      if(i.cambios.length>0) linea += `\n  Cambios: ${i.cambios.map(c=>c.nombre).join(", ")}`;
      return linea;
    }).join("\n");
    const waText=encodeURIComponent(
`¡Hola! Acabo de hacer un pedido en Sushi Loncoche 🍣

N° de orden: ${lastOrder.orderId}
Nombre: ${lastOrder.cliente.nombre}
Sucursal: ${lastOrder.sucursal}
Fecha: ${formatFecha(lastOrder.fecha)}
Horario: ${lastOrder.horario}
Tipo: ${lastOrder.tipo==="delivery"?"🚗 Delivery":"🏪 Retiro en local"}${lastOrder.tipo==="delivery"&&lastOrder.direccion?`\nDirección: ${lastOrder.direccion}`:""}

Pedido:
${itemsTexto}${oDel>0?`\n• Despacho: ${fmt(oDel)}`:""}

Total: ${fmt(oTot)}
Pago: ${pago}${lastOrder.observaciones?`\n\nObservaciones: ${lastOrder.observaciones}`:""}`);
    return (
      <div style={{ maxWidth:520,margin:"0 auto",padding:"0 16px 40px" }}>
        {/* Hero receipt */}
        <div style={{ background:"linear-gradient(160deg,#111811 0%,#0A0D0A 100%)",
          borderBottom:"1px solid #1A221A",padding:"36px 24px 28px",textAlign:"center",marginBottom:0 }}>
          <div style={{ width:56,height:56,borderRadius:"50%",background:"#1A2A1A",
            border:"1px solid #2A4A2A",display:"flex",alignItems:"center",justifyContent:"center",
            margin:"0 auto 14px",fontSize:26 }}>✓</div>
          <h2 style={{ color:"#F0EBE0",fontFamily:"'Crimson Pro',serif",fontSize:28,
            fontWeight:400,fontStyle:"italic",marginBottom:6,letterSpacing:0.5 }}>
            ¡Listo, muchas gracias!
          </h2>
          <p style={{ color:"#607060",fontSize:14,lineHeight:1.6,marginBottom:18 }}>
            Acabamos de recibir tu pedido.
          </p>
          {/* Order number */}
          <div style={{ display:"inline-block",border:"1px solid #C9A84C30",borderRadius:10,
            padding:"10px 24px",background:"#C9A84C08" }}>
            <div style={{ color:"#605030",fontSize:10,letterSpacing:2,textTransform:"uppercase",marginBottom:3 }}>
              Número de orden
            </div>
            <div style={{ color:"#C9A84C",fontWeight:700,fontFamily:"monospace",fontSize:22,letterSpacing:2 }}>
              {lastOrder.orderId}
            </div>
          </div>
        </div>

        {/* Order detail */}
        <div style={{ padding:"0 0 0" }}>
          {/* Meta row */}
          <div style={{ display:"flex",justifyContent:"space-between",padding:"14px 0",
            borderBottom:"1px solid #141914",flexWrap:"wrap",gap:4 }}>
            <div style={{ textAlign:"center",flex:1,minWidth:80 }}>
              <div style={{ color:"#354035",fontSize:10,letterSpacing:1,marginBottom:3 }}>SUCURSAL</div>
              <div style={{ color:"#C0D0C0",fontSize:13,fontWeight:600 }}>{lastOrder.sucursal}</div>
            </div>
            <div style={{ width:1,background:"#141914" }}/>
            <div style={{ textAlign:"center",flex:1,minWidth:80 }}>
              <div style={{ color:"#354035",fontSize:10,letterSpacing:1,marginBottom:3 }}>FECHA</div>
              <div style={{ color:"#C0D0C0",fontSize:12,fontWeight:600 }}>{formatFecha(lastOrder.fecha)}</div>
            </div>
            <div style={{ width:1,background:"#141914" }}/>
            <div style={{ textAlign:"center",flex:1,minWidth:80 }}>
              <div style={{ color:"#354035",fontSize:10,letterSpacing:1,marginBottom:3 }}>HORARIO</div>
              <div style={{ color:"#C0D0C0",fontSize:13,fontWeight:600 }}>{lastOrder.horario}</div>
            </div>
            <div style={{ width:1,background:"#141914" }}/>
            <div style={{ textAlign:"center",flex:1,minWidth:80 }}>
              <div style={{ color:"#354035",fontSize:10,letterSpacing:1,marginBottom:3 }}>TIPO</div>
              <div style={{ color:"#C0D0C0",fontSize:12,fontWeight:600 }}>
                {lastOrder.tipo==="delivery"?"🚗 Delivery":"🏪 Retiro"}
              </div>
            </div>
          </div>

          {/* Items */}
          <div style={{ padding:"14px 0",borderBottom:"1px solid #141914" }}>
            {lastOrder.items.map((item,i)=>(
              <div key={i} style={{ marginBottom:6 }}>
                <div style={{ display:"flex",justifyContent:"space-between",fontSize:13 }}>
                  <span style={{ color:"#A0B0A0" }}>{item.qty}× {item.nombre}</span>
                  <span style={{ color:"#C9A84C" }}>{fmt((item.precio+cambiosCosto(item.cambios))*item.qty)}</span>
                </div>
                {item.cambios.map((c,j)=>(
                  <div key={j} style={{ fontSize:11,color:"#4A7A4A",paddingLeft:12,marginTop:1 }}>
                    ↳ {c.nombre}
                  </div>
                ))}
              </div>
            ))}
            {lastOrder.tipo==="delivery"&&(
              <div style={{ display:"flex",justifyContent:"space-between",fontSize:12,marginTop:6 }}>
                <span style={{ color:"#354035" }}>Despacho</span>
                <span style={{ color:"#C9A84C" }}>{fmt(COSTO_DELIVERY)}</span>
              </div>
            )}
          </div>

          {/* Total */}
          <div style={{ display:"flex",justifyContent:"space-between",padding:"14px 0",
            borderBottom:"1px solid #141914" }}>
            <span style={{ color:"#F0EBE0",fontWeight:700,fontSize:16,fontFamily:"'Crimson Pro',serif",
              fontStyle:"italic" }}>Total</span>
            <span style={{ color:"#C9A84C",fontWeight:700,fontSize:20 }}>{fmt(oTot)}</span>
          </div>
          <div style={{ padding:"10px 0",borderBottom:"1px solid #141914",
            display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <span style={{ color:"#354035",fontSize:12 }}>Método de pago</span>
            <span style={{ color:"#C0D0C0",fontSize:13,fontWeight:600 }}>{pago}</span>
          </div>

          {lastOrder.observaciones&&(
            <div style={{ padding:"12px 0",borderBottom:"1px solid #141914",
              color:"#607060",fontSize:13,fontStyle:"italic" }}>
              💬 {lastOrder.observaciones}
            </div>
          )}
        </div>

        {/* WhatsApp */}
        <div style={{ paddingTop:24 }}>
          <a href={`https://wa.me/${WHATSAPP_NUM}?text=${waText}`} target="_blank" rel="noreferrer"
            style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:10,
              width:"100%",padding:"15px",background:"#25D366",border:"none",
              borderRadius:12,color:"#fff",fontWeight:700,fontSize:15,
              textDecoration:"none",marginBottom:6,boxSizing:"border-box" }}>
            <span style={{ fontSize:20 }}>💬</span> Confirmar por WhatsApp
          </a>
          <p style={{ color:"#354035",fontSize:12,textAlign:"center",marginBottom:16 }}>
            Escribinos para confirmar tu pedido.
          </p>
          <div style={{ display:"flex",gap:8,marginBottom:12 }}>
            <button onClick={()=>setShowPreview(true)}
              style={{ flex:1,padding:"11px",background:"transparent",border:"1px solid #1E2820",
                borderRadius:8,color:"#C0C8C0",fontWeight:500,cursor:"pointer",fontSize:13 }}>
              🧾 Comprobante
            </button>
            <button onClick={()=>printComanda(lastOrder)}
              style={{ flex:1,padding:"11px",background:"transparent",border:"1px solid #1E2820",
                borderRadius:8,color:"#C0C8C0",fontWeight:500,cursor:"pointer",fontSize:13 }}>
              🖨️ Imprimir
            </button>
          </div>
          <button onClick={()=>{ setForm(emptyForm("web")); setStep(1); setLastOrder(null); }}
            style={{ width:"100%",padding:"11px",background:"transparent",border:"1px solid #141914",
              borderRadius:8,color:"#354035",cursor:"pointer",fontSize:13 }}>
            Hacer otro pedido
          </button>
        </div>
        {showPreview&&<ComandaPreview order={lastOrder} onClose={()=>setShowPreview(false)}/>}
      </div>
    );
  }

  const steps=["Dónde y cuándo","Productos","Tus datos","Confirmar"];
  const iS={ width:"100%",padding:"11px 13px",background:"#0A0D0A",border:"1px solid #1E2820",
    borderRadius:8,color:"#F0EBE0",fontSize:14,outline:"none",boxSizing:"border-box" };

  return (
    <div style={{ maxWidth:520,margin:"0 auto",padding:"24px 16px" }}>
      {/* Step bar */}
      <div style={{ display:"flex",gap:4,marginBottom:28 }}>
        {steps.map((s,i)=>(
          <div key={i} style={{ flex:1,textAlign:"center" }}>
            <div style={{ height:3,borderRadius:2,marginBottom:4,
              background:i+1<=step?"#C9A84C":"#1A211B",transition:"background 0.3s" }}/>
            <div style={{ fontSize:10,color:i+1===step?"#C9A84C":"#354035" }}>{s}</div>
          </div>
        ))}
      </div>

      {/* ── STEP 1 ── */}
      {step===1&&(
        <div>
          <h2 style={{ color:"#F0EBE0",fontFamily:"'Crimson Pro',serif",fontSize:24,
            marginBottom:24,fontWeight:400,fontStyle:"italic" }}>
            ¿Dónde retirás o recibís?
          </h2>

          {SUCURSALES.length>1&&(
            <>
              <label style={{ color:"#50605A",fontSize:11,letterSpacing:1,display:"block",marginBottom:6 }}>SUCURSAL</label>
              <div style={{ display:"grid",gridTemplateColumns:`repeat(${SUCURSALES.length},1fr)`,gap:8,marginBottom:20 }}>
                {SUCURSALES.map(s=>(
                  <button key={s} onClick={()=>clearForSucursal(s)}
                    style={{ padding:"14px 8px",borderRadius:10,border:"2px solid",cursor:"pointer",fontSize:14,
                      borderColor:form.sucursal===s?"#C9A84C":"#1E2820",
                      background:form.sucursal===s?"#C9A84C14":"#0A0D0A",
                      color:form.sucursal===s?"#C9A84C":"#607060",
                      fontWeight:form.sucursal===s?700:400 }}>{s}</button>
                ))}
              </div>
            </>
          )}

          <label style={{ color:"#50605A",fontSize:11,letterSpacing:1,display:"block",marginBottom:6 }}>TIPO DE PEDIDO</label>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16 }}>
            {[{id:"retiro",label:"🏪 Retiro en local"},{id:"delivery",label:"🚗 Delivery"}].map(t=>(
              <button key={t.id} onClick={()=>setForm(f=>({...f,tipo:t.id,metodoPago:"transferencia"}))}
                style={{ padding:"14px 8px",borderRadius:10,border:"2px solid",cursor:"pointer",fontSize:13,
                  borderColor:form.tipo===t.id?"#C9A84C":"#1E2820",
                  background:form.tipo===t.id?"#C9A84C14":"#0A0D0A",
                  color:form.tipo===t.id?"#C9A84C":"#607060",
                  fontWeight:form.tipo===t.id?700:400 }}>{t.label}</button>
            ))}
          </div>

          {form.tipo==="delivery"&&(
            <>
              <div style={{ background:"#1A2800",border:"1px solid #3A5A00",borderRadius:10,
                padding:"12px 14px",marginBottom:16,display:"flex",alignItems:"center",gap:12 }}>
                <span style={{ fontSize:22 }}>🛵</span>
                <div>
                  <div style={{ color:"#A0D040",fontSize:14,fontWeight:700 }}>
                    Costo de despacho: {fmt(COSTO_DELIVERY)}
                  </div>
                  <div style={{ color:"#607840",fontSize:12,marginTop:2 }}>
                    Se suma automáticamente a tu total.
                  </div>
                </div>
              </div>
              <div style={{ marginBottom:12 }}>
                <label style={{ color:"#50605A",fontSize:11,letterSpacing:1,display:"block",marginBottom:6 }}>
                  DIRECCIÓN DE ENTREGA
                </label>
                <input value={form.direccion} placeholder="Calle y número"
                  onChange={e=>setForm(f=>({...f,direccion:e.target.value}))} style={iS}/>
              </div>
              <div style={{ marginBottom:20 }}>
                <label style={{ color:"#50605A",fontSize:11,letterSpacing:1,display:"block",marginBottom:6 }}>
                  REFERENCIA <span style={{ color:"#303830" }}>(opcional)</span>
                </label>
                <input value={form.referencia} placeholder="Color de casa, cerca de, entre calles..."
                  onChange={e=>setForm(f=>({...f,referencia:e.target.value}))} style={iS}/>
              </div>
            </>
          )}

          {/* Fecha — hoy por defecto, expandir para agendar */}
          <div style={{ background:"#141914",borderRadius:10,border:"1px solid #252F28",
            padding:"14px 16px",marginBottom:8 }}>
            <label style={{ color:"#C9A84C",fontSize:11,letterSpacing:1,
              display:"block",marginBottom:8,fontWeight:700 }}>
              📅 FECHA DEL PEDIDO
            </label>
            <div style={{ display:"flex",gap:8,alignItems:"center" }}>
              <button onClick={()=>{ handleFechaChange(fechas[0]?.iso||""); setMostrarOtrasFechas(false); }}
                style={{ flex:1,padding:"11px 14px",borderRadius:8,border:"2px solid",cursor:"pointer",
                  textAlign:"left",fontSize:14,fontWeight:700,
                  borderColor:!mostrarOtrasFechas?"#C9A84C":"#1E2820",
                  background:!mostrarOtrasFechas?"#C9A84C14":"#0A0D0A",
                  color:!mostrarOtrasFechas?"#C9A84C":"#D0E0D0" }}>
                {fechas[0]?formatFecha(fechas[0].iso):"Hoy"}
              </button>
              {fechas.length>1&&(
                <button onClick={()=>setMostrarOtrasFechas(v=>!v)}
                  style={{ padding:"11px 12px",borderRadius:8,border:"1px solid",
                    background:"transparent",cursor:"pointer",fontSize:12,whiteSpace:"nowrap",
                    borderColor:mostrarOtrasFechas?"#C9A84C":"#1E2820",
                    color:mostrarOtrasFechas?"#C9A84C":"#607060" }}>
                  {mostrarOtrasFechas?"▲ Cerrar":"▼ Otro día"}
                </button>
              )}
            </div>
            {mostrarOtrasFechas&&(
              <div style={{ marginTop:8,display:"flex",flexDirection:"column",gap:6 }}>
                {fechas.slice(1).map(f=>{
                  const sinCupos=getHorariosDisponibles(f.iso,orders).length===0;
                  const sel=form.fecha===f.iso;
                  return (
                    <button key={f.iso} onClick={()=>{ if(!sinCupos){ handleFechaChange(f.iso); }}}
                      disabled={sinCupos}
                      style={{ padding:"9px 14px",borderRadius:8,border:"1px solid",
                        cursor:sinCupos?"not-allowed":"pointer",textAlign:"left",fontSize:13,
                        borderColor:sel?"#C9A84C":sinCupos?"#1A0D0D":"#1E2820",
                        background:sel?"#C9A84C14":"#0A0D0A",
                        color:sel?"#C9A84C":sinCupos?"#504040":"#A0B0A0",
                        fontWeight:sel?700:400 }}>
                      {formatFecha(f.iso)}{sinCupos?" — sin cupos":""}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Horario */}
          <div style={{ background:"#141914",borderRadius:10,border:"1px solid #252F28",
            padding:"14px 16px",marginBottom:4 }}>
            <label style={{ color:"#C9A84C",fontSize:11,letterSpacing:1,
              display:"block",marginBottom:8,fontWeight:700 }}>
              ⏰ HORARIO DE PEDIDO
            </label>
            {horariosDisp.length===0 ? (
              <div style={{ color:"#904040",fontSize:13,padding:"8px 0" }}>
                No hay horarios disponibles para este día. Elige otra fecha.
              </div>
            ) : (
              <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                {horariosDisp.map(h=>{
                  const pedidosEnSlot = orders.filter(o=>o.fecha===form.fecha&&o.horario===h&&o.estado!=="entregado").length;
                  const disponibles = MAX_POR_HORARIO - pedidosEnSlot;
                  return (
                    <button key={h} onClick={()=>setForm(f=>({...f,horario:h}))}
                      style={{ padding:"8px 16px",borderRadius:8,border:"2px solid",cursor:"pointer",
                        fontSize:14,fontWeight:form.horario===h?700:400,
                        borderColor:form.horario===h?"#C9A84C":"#1E2820",
                        background:form.horario===h?"#C9A84C14":"#0A0D0A",
                        color:form.horario===h?"#C9A84C":"#607060" }}>
                      {h}
                      {disponibles<=2&&<span style={{ fontSize:10,marginLeft:4,
                        color:form.horario===h?"#A07030":"#806040" }}>({disponibles} cupos)</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <p style={{ color:"#354035",fontSize:11,marginBottom:20 }}>
            Horario de atención: 17:30 — 21:30 · Máximo {MAX_POR_HORARIO} pedidos por horario
          </p>
        </div>
      )}

      {/* ── STEP 2 ── */}
      {step===2&&(
        <div>
          <h2 style={{ color:"#F0EBE0",fontFamily:"'Crimson Pro',serif",fontSize:24,
            marginBottom:4,fontWeight:400,fontStyle:"italic" }}>
            ¿Qué querés pedir?
          </h2>
          <p style={{ color:"#354035",fontSize:12,marginBottom:16 }}>
            Sucursal {form.sucursal} · Toca un producto para agregar o cambiar ingredientes
          </p>
          <ProductSelector
            cart={form.cart}
            onAdd={item=>setForm(f=>({...f,cart:[...f.cart,item]}))}
            onRemove={cartId=>setForm(f=>({...f,cart:f.cart.filter(i=>i.cartId!==cartId)}))}
            sucursal={form.sucursal}
            stock={stock}
          />
          {count>0&&(
            <div style={{ marginTop:16,padding:"12px 16px",background:"#141914",
              borderRadius:10,border:"1px solid #1E2820" }}>
              {form.tipo==="delivery"&&(<>
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:3 }}>
                  <span style={{ color:"#505A50",fontSize:13 }}>Subtotal</span>
                  <span style={{ color:"#707870",fontSize:13 }}>{fmt(sub)}</span>
                </div>
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
                  <span style={{ color:"#505A50",fontSize:12 }}>Despacho</span>
                  <span style={{ color:"#707870",fontSize:12 }}>+{fmt(COSTO_DELIVERY)}</span>
                </div>
              </>)}
              <div style={{ display:"flex",justifyContent:"space-between",
                borderTop:form.tipo==="delivery"?"1px solid #1E2820":"none",
                paddingTop:form.tipo==="delivery"?8:0 }}>
                <span style={{ color:"#F0EBE0",fontFamily:"'Crimson Pro',serif",
                  fontStyle:"italic",fontSize:16 }}>Total</span>
                <span style={{ color:"#C9A84C",fontWeight:700,fontSize:18 }}>{fmt(tot)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 3 ── */}
      {step===3&&(
        <div>
          <h2 style={{ color:"#F0EBE0",fontFamily:"'Crimson Pro',serif",fontSize:24,
            marginBottom:20,fontWeight:400,fontStyle:"italic" }}>
            Tus datos
          </h2>
          {[{k:"nombre",l:"NOMBRE",p:"¿Cómo te llamás?",t:"text"},
            {k:"telefono",l:"TELÉFONO / WHATSAPP",p:"+56 9 XXXX XXXX",t:"tel"}
          ].map(({k,l,p,t})=>(
            <div key={k} style={{ marginBottom:14 }}>
              <label style={{ color:"#50605A",fontSize:11,letterSpacing:1,display:"block",marginBottom:6 }}>{l}</label>
              <input type={t} value={form.cliente[k]} placeholder={p}
                onChange={e=>setForm(f=>({...f,cliente:{...f.cliente,[k]:e.target.value}}))} style={iS}/>
            </div>
          ))}
          <div style={{ marginBottom:14 }}>
            <label style={{ color:"#50605A",fontSize:11,letterSpacing:1,display:"block",marginBottom:8 }}>
              MÉTODO DE PAGO
            </label>
            {form.tipo==="delivery"&&(
              <div style={{ background:"#1A2800",border:"1px solid #3A5A00",borderRadius:8,
                padding:"10px 14px",marginBottom:10,display:"flex",alignItems:"center",gap:8 }}>
                <span style={{ fontSize:16 }}>🔒</span>
                <div>
                  <div style={{ color:"#A0D040",fontSize:13,fontWeight:700 }}>
                    Delivery: solo transferencia bancaria
                  </div>
                  <div style={{ color:"#607840",fontSize:11,marginTop:1 }}>
                    Los pedidos a domicilio se pagan únicamente con transferencia previa.
                  </div>
                </div>
              </div>
            )}
            <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
              {pagos.map(m=>{
                const sel = form.metodoPago===m.id;
                return (
                  <button key={m.id}
                    onClick={()=>form.tipo!=="delivery"&&setForm(f=>({...f,metodoPago:m.id}))}
                    style={{ padding:"12px 14px",borderRadius:8,border:"2px solid",
                      cursor:form.tipo==="delivery"?"default":"pointer",
                      textAlign:"left",fontSize:13,lineHeight:1.4,
                      borderColor:sel?"#C9A84C":"#1E2820",
                      background:sel?"#C9A84C18":"#0A0D0A",
                      color:sel?"#C9A84C":"#607060" }}>
                    {sel?"✓ ":""}{m.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label style={{ color:"#50605A",fontSize:11,letterSpacing:1,display:"block",marginBottom:6 }}>
              OBSERVACIONES <span style={{ color:"#303830" }}>(opcional)</span>
            </label>
            <textarea rows={3} value={form.observaciones}
              placeholder="Alergias, preferencias, sin picante, instrucciones especiales..."
              onChange={e=>setForm(f=>({...f,observaciones:e.target.value}))}
              style={{ ...iS,resize:"vertical" }}/>
          </div>
        </div>
      )}

      {/* ── STEP 4 ── */}
      {step===4&&(
        <div>
          <h2 style={{ color:"#F0EBE0",fontFamily:"'Crimson Pro',serif",fontSize:24,
            marginBottom:20,fontWeight:400,fontStyle:"italic" }}>
            Confirmá tu pedido
          </h2>
          <div style={{ background:"#0A0D0A",borderRadius:12,border:"1px solid #1E2820",padding:16,marginBottom:12 }}>
            {[["Sucursal",form.sucursal],
              ["Tipo",form.tipo==="delivery"?"🚗 Delivery":"🏪 Retiro"],
              ...(form.tipo==="delivery"?[["Dirección",form.direccion]]:
                  form.referencia?[["Referencia",form.referencia]]:[]),
              ...(form.tipo==="delivery"&&form.referencia?[["Referencia",form.referencia]]:[]),
              ["Horario",form.horario],
              ["Pago",pagos.find(m=>m.id===form.metodoPago)?.label],
            ].filter(([,v])=>v).map(([k,v])=>(
              <div key={k} style={{ display:"flex",justifyContent:"space-between",marginBottom:6 }}>
                <span style={{ color:"#50605A",fontSize:13 }}>{k}</span>
                <span style={{ color:"#D0E0D0",fontSize:13,maxWidth:240,textAlign:"right",lineHeight:1.4 }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ background:"#0A0D0A",borderRadius:12,border:"1px solid #1E2820",padding:16,marginBottom:12 }}>
            {form.cart.map((item,i)=>(
              <div key={i} style={{ marginBottom:6 }}>
                <div style={{ display:"flex",justifyContent:"space-between",fontSize:13 }}>
                  <span style={{ color:"#B0C0B0" }}>{item.qty}× {item.nombre}</span>
                  <span style={{ color:"#C9A84C" }}>{fmt((item.precio+cambiosCosto(item.cambios))*item.qty)}</span>
                </div>
                {item.desc&&!item.cambios.length&&(
                  <div style={{ fontSize:11,color:"#354035",paddingLeft:12 }}>{item.desc}</div>
                )}
                {item.cambios.map((c,j)=>(
                  <div key={j} style={{ fontSize:11,color:"#4A7A4A",paddingLeft:12,marginTop:1 }}>
                    ↳ {c.nombre} +{fmt(c.precio)}
                  </div>
                ))}
              </div>
            ))}
            {form.tipo==="delivery"&&(
              <div style={{ display:"flex",justifyContent:"space-between",marginTop:4,fontSize:12 }}>
                <span style={{ color:"#50605A" }}>Despacho</span>
                <span style={{ color:"#C9A84C" }}>{fmt(COSTO_DELIVERY)}</span>
              </div>
            )}
            <div style={{ display:"flex",justifyContent:"space-between",
              borderTop:"1px solid #1A211B",marginTop:8,paddingTop:8 }}>
              <span style={{ color:"#F0EBE0",fontFamily:"'Crimson Pro',serif",
                fontStyle:"italic",fontSize:17 }}>Total</span>
              <span style={{ color:"#C9A84C",fontWeight:700,fontSize:18 }}>{fmt(tot)}</span>
            </div>
          </div>
          {form.observaciones&&(
            <div style={{ background:"#0A0D0A",borderRadius:8,border:"1px solid #1A211B",
              padding:"8px 12px",color:"#607060",fontSize:13,fontStyle:"italic" }}>
              💬 {form.observaciones}
            </div>
          )}
        </div>
      )}

      {/* Nav */}
      <div style={{ display:"flex",gap:8,marginTop:24 }}>
        {step>1&&(
          <button onClick={()=>setStep(s=>s-1)}
            style={{ flex:1,padding:"13px",background:"transparent",border:"1px solid #1E2820",
              borderRadius:8,color:"#607060",cursor:"pointer",fontSize:14 }}>← Atrás</button>
        )}
        {step<4?(
          <button onClick={()=>canNext()&&setStep(s=>s+1)}
            style={{ flex:2,padding:"13px",background:canNext()?"#C9A84C":"#1A211B",border:"none",
              borderRadius:8,color:canNext()?"#0A0D0A":"#303830",
              fontWeight:700,cursor:canNext()?"pointer":"not-allowed",fontSize:14 }}>
            Continuar →
          </button>
        ):(
          <button onClick={handleSubmit}
            style={{ flex:2,padding:"14px",background:"#C9A84C",border:"none",
              borderRadius:8,color:"#0A0D0A",fontWeight:700,cursor:"pointer",fontSize:15 }}>
            🍣 Confirmar pedido
          </button>
        )}
      </div>
    </div>
  );
}

// ── ADMIN VIEW ────────────────────────────────────────────────────────────────
function AdminView({ orders, onAddOrder, onStatusChange, onDeleteOrder, onUpdateOrder, stock, onToggleStock, diasDesbloqueados=[], onToggleDia }) {
  const [fSuc,setFSuc]=useState("all");
  const [fEst,setFEst]=useState("all");
  const [showM,setShowM]=useState(false);
  const [showStock,setShowStock]=useState(false);
  const [showDias,setShowDias]=useState(false);
  const [editOrder,setEditOrder]=useState(null); // order being edited
  const [mf,setMf]=useState(emptyForm("presencial"));

  const filtered=orders
    .filter(o=>fSuc==="all"||o.sucursal===fSuc)
    .filter(o=>fEst==="all"||o.estado===fEst)
    .sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));

  const activos = orders.filter(o=>o.estado!=="completado").length;
  const alertaPedidos = activos >= ALERTA_PEDIDOS;
  const stats={
    total:    orders.length,
    abiertos: orders.filter(o=>o.estado==="abierto").length,
    enProceso:orders.filter(o=>o.estado==="en_proceso").length,
    listos:   orders.filter(o=>o.estado==="listo").length,
  };

  const mfTot=cartTotal(mf.cart,mf.tipo);
  const mfPagos=getPagos(mf.tipo);

  const handleAddManual=()=>{
    if(!mf.cliente.nombre.trim()) return alert("Ingresá el nombre del cliente");
    if(mf.cart.length===0) return alert("Agregá al menos un producto");
    onAddOrder({...mf,items:mf.cart,orderId:newId(),estado:"abierto",timestamp:new Date().toISOString()});
    setShowM(false); setMf(emptyForm("presencial"));
  };

  const iS={width:"100%",padding:"9px 11px",background:"#0A0D0A",border:"1px solid #1E2820",
    borderRadius:8,color:"#F0EBE0",fontSize:13,outline:"none",boxSizing:"border-box"};

  return (
    <div style={{ padding:"20px 16px",maxWidth:680,margin:"0 auto" }}>
      {/* Alerta 18 pedidos */}
      {alertaPedidos&&(
        <div style={{ background:"#3A1A00",border:"1px solid #C06020",borderRadius:10,
          padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:10 }}>
          <span style={{ fontSize:20 }}>⚠️</span>
          <div>
            <div style={{ color:"#F08040",fontSize:14,fontWeight:700 }}>
              {activos} pedidos activos — revisar insumos
            </div>
            <div style={{ color:"#906040",fontSize:12,marginTop:2 }}>
              Se alcanzó el límite de {ALERTA_PEDIDOS} pedidos. Verificar stock en ambos locales.
            </div>
          </div>
        </div>
      )}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:20 }}>
        {[{l:"Total",v:stats.total,c:"#D0E0D0"},{l:"Abiertos",v:stats.abiertos,c:"#F59E0B"},
          {l:"En proceso",v:stats.enProceso,c:"#60A5FA"},{l:"Listos",v:stats.listos,c:"#34D399"}
        ].map(s=>(
          <div key={s.l} style={{ background:"#141914",borderRadius:10,padding:"12px 8px",
            border:"1px solid #1E2820",textAlign:"center" }}>
            <div style={{ color:s.c,fontSize:24,fontWeight:700 }}>{s.v}</div>
            <div style={{ color:"#354035",fontSize:10,marginTop:2 }}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{ display:"flex",gap:8,marginBottom:16,flexWrap:"wrap",alignItems:"center" }}>
        <select value={fSuc} onChange={e=>setFSuc(e.target.value)}
          style={{ padding:"8px 10px",background:"#141914",border:"1px solid #1E2820",
            borderRadius:8,color:"#C0D0C0",fontSize:13,outline:"none",cursor:"pointer" }}>
          <option value="all">Todas las sucursales</option>
          {SUCURSALES.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <select value={fEst} onChange={e=>setFEst(e.target.value)}
          style={{ padding:"8px 10px",background:"#141914",border:"1px solid #1E2820",
            borderRadius:8,color:"#C0D0C0",fontSize:13,outline:"none",cursor:"pointer" }}>
          <option value="all">Todos los estados</option>
          {Object.entries(ESTADOS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
        </select>
        <div style={{ flex:1 }}/>
        <button onClick={()=>setShowDias(s=>!s)}
          style={{ padding:"8px 14px",background:showDias?"#60A5FA18":"transparent",
            border:`1px solid ${showDias?"#60A5FA":"#1E2820"}`,borderRadius:8,
            color:showDias?"#60A5FA":"#607060",cursor:"pointer",fontSize:13,whiteSpace:"nowrap" }}>
          📅 Días
        </button>
        <button onClick={()=>setShowStock(s=>!s)}
          style={{ padding:"8px 14px",background:showStock?"#C9A84C18":"transparent",
            border:`1px solid ${showStock?"#C9A84C":"#1E2820"}`,borderRadius:8,
            color:showStock?"#C9A84C":"#607060",cursor:"pointer",fontSize:13,whiteSpace:"nowrap" }}>
          🍱 Stock promos
        </button>
        <button onClick={()=>setShowM(true)}
          style={{ padding:"8px 16px",background:"#C9A84C",border:"none",borderRadius:8,
            color:"#0A0D0A",fontWeight:700,cursor:"pointer",fontSize:13,whiteSpace:"nowrap" }}>
          + Pedido manual
        </button>
      </div>

      {/* Días panel */}
      {showDias&&(
        <div style={{ background:"#141914",borderRadius:12,border:"1px solid #1E3050",
          padding:16,marginBottom:20 }}>
          <div style={{ color:"#60A5FA",fontSize:12,fontWeight:700,letterSpacing:1,marginBottom:4 }}>
            DÍAS DE ATENCIÓN — próximos 7 días
          </div>
          <p style={{ color:"#354050",fontSize:11,marginBottom:12 }}>
            Lun, Mar y Dom están bloqueados por defecto. Activá un día puntual si van a trabajar excepcionalmente.
          </p>
          <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
            {getFechasDisponibles(diasDesbloqueados).map(({iso,dow,bloqueado})=>{
              const desbloqueadoManual = diasDesbloqueados.includes(iso);
              const esPorDefecto = !DIAS_BLOQUEADOS_DEFAULT.includes(dow);
              return (
                <div key={iso} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",
                  padding:"10px 14px",background:"#0A0D0A",borderRadius:8,
                  border:`1px solid ${bloqueado?"#3A1A1A":esPorDefecto?"#1A3A1A":"#1A2A3A"}` }}>
                  <div>
                    <span style={{ color:bloqueado?"#604040":esPorDefecto?"#70C070":"#70A0D0",
                      fontSize:13,fontWeight:600 }}>
                      {NOMBRES_DIAS[dow]}
                    </span>
                    <span style={{ color:"#354035",fontSize:12,marginLeft:8 }}>{formatFecha(iso)}</span>
                    {esPorDefecto&&<span style={{ color:"#3A6A3A",fontSize:10,marginLeft:8 }}>día habitual</span>}
                    {desbloqueadoManual&&<span style={{ color:"#4080C0",fontSize:10,marginLeft:8 }}>desbloqueado manualmente</span>}
                  </div>
                  {!esPorDefecto&&(
                    <button onClick={()=>onToggleDia(iso)}
                      style={{ padding:"6px 14px",borderRadius:20,border:"1px solid",
                        cursor:"pointer",fontSize:12,fontWeight:700,
                        borderColor:desbloqueadoManual?"#3A5A7A":"#5A3A3A",
                        background:desbloqueadoManual?"#1A2A3A":"#2A1A1A",
                        color:desbloqueadoManual?"#70A0D0":"#C07070" }}>
                      {desbloqueadoManual?"● Abierto":"○ Cerrado"}
                    </button>
                  )}
                  {esPorDefecto&&(
                    <span style={{ color:"#2A4A2A",fontSize:11 }}>siempre abierto</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stock panel */}
      {showStock&&(
        <div style={{ background:"#141914",borderRadius:12,border:"1px solid #252F28",
          padding:16,marginBottom:20 }}>
          <div style={{ color:"#C9A84C",fontSize:12,fontWeight:700,letterSpacing:1,marginBottom:12 }}>
            DISPONIBILIDAD DE PROMOS, HANDROLLS Y ROLLS
          </div>
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            {["Promos","Handrolls","Rolls"].map(catName=>(
              <div key={catName}>
                <div style={{ color:"#405040",fontSize:10,letterSpacing:1,
                  marginBottom:6,marginTop:catName==="Promos"?0:12 }}>
                  {catName.toUpperCase()}
                </div>
                {MENU.filter(m=>m.cat===catName).map(producto=>{
                  const activa = stock[producto.id]!==false;
                  return (
                    <div key={producto.id} style={{ marginBottom:6,
                      display:"flex",justifyContent:"space-between",alignItems:"center",
                      padding:"10px 14px",background:"#0A0D0A",borderRadius:8,
                      border:`1px solid ${activa?"#1E2820":"#3A1A1A"}` }}>
                      <div>
                        <span style={{ color:activa?"#D0E0D0":"#604040",fontSize:13,fontWeight:600 }}>
                          {producto.nombre}
                        </span>
                        {producto.piezas&&(
                          <span style={{ color:"#354035",fontSize:12,marginLeft:8 }}>
                            {producto.piezas} {producto.cat==="Handrolls"?"u":"bocados"} · {fmt(producto.precio)}
                          </span>
                        )}
                        {producto.desc&&!producto.piezas&&(
                          <span style={{ color:"#354035",fontSize:12,marginLeft:8 }}>{fmt(producto.precio)}</span>
                        )}
                      </div>
                      <button onClick={()=>onToggleStock(producto.id)}
                        style={{ padding:"6px 14px",borderRadius:20,border:"1px solid",
                          cursor:"pointer",fontSize:12,fontWeight:700,transition:"all 0.15s",
                          borderColor:activa?"#3A5A3A":"#5A3A3A",
                          background:activa?"#1A2A1A":"#2A1A1A",
                          color:activa?"#70C070":"#C07070" }}>
                        {activa?"● Activo":"○ Agotado"}
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <p style={{ color:"#354035",fontSize:11,marginTop:10 }}>
            Los productos agotados no aparecen disponibles para el cliente.
          </p>
        </div>
      )}
      {filtered.length===0
        ?<div style={{ textAlign:"center",padding:"48px 0",color:"#252F28" }}>
            <div style={{ fontSize:32,marginBottom:8 }}>🍱</div>
            <p style={{ fontSize:14 }}>Sin pedidos con estos filtros</p>
          </div>
        :filtered.map(o=>(
          <OrderCard key={o.id} order={o} onStatusChange={onStatusChange}
            onDelete={onDeleteOrder}
            onEdit={o=>setEditOrder({...o})}
          />
        ))
      }

      {/* Edit order modal */}
      {editOrder&&(
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:200,
          display:"flex",alignItems:"flex-start",justifyContent:"center",overflowY:"auto",padding:"20px 0" }}>
          <div style={{ background:"#141914",borderRadius:16,border:"1px solid #252F28",
            padding:24,width:"100%",maxWidth:500,margin:"0 16px" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
              <h3 style={{ color:"#F0EBE0",fontFamily:"serif",fontSize:20,margin:0,fontWeight:400 }}>
                Editar pedido {editOrder.orderId}
              </h3>
              <button onClick={()=>setEditOrder(null)}
                style={{ background:"transparent",border:"none",color:"#50605A",fontSize:22,cursor:"pointer" }}>×</button>
            </div>
            {/* Editable fields */}
            {[{k:"nombre",l:"NOMBRE",p:"Nombre",f:"cliente"},
              {k:"telefono",l:"TELÉFONO",p:"+56 9...",f:"cliente"}
            ].map(({k,l,p,f})=>(
              <div key={k} style={{ marginBottom:12 }}>
                <label style={{ color:"#50605A",fontSize:11,letterSpacing:1,display:"block",marginBottom:4 }}>{l}</label>
                <input value={f?editOrder[f][k]:editOrder[k]} placeholder={p}
                  onChange={e=>f
                    ?setEditOrder(o=>({...o,[f]:{...o[f],[k]:e.target.value}}))
                    :setEditOrder(o=>({...o,[k]:e.target.value}))}
                  style={{ width:"100%",padding:"9px 11px",background:"#0A0D0A",border:"1px solid #1E2820",
                    borderRadius:8,color:"#F0EBE0",fontSize:13,outline:"none",boxSizing:"border-box" }}/>
              </div>
            ))}
            <div style={{ marginBottom:12 }}>
              <label style={{ color:"#50605A",fontSize:11,letterSpacing:1,display:"block",marginBottom:4 }}>DIRECCIÓN</label>
              <input value={editOrder.direccion||""} placeholder="Dirección de entrega"
                onChange={e=>setEditOrder(o=>({...o,direccion:e.target.value}))}
                style={{ width:"100%",padding:"9px 11px",background:"#0A0D0A",border:"1px solid #1E2820",
                  borderRadius:8,color:"#F0EBE0",fontSize:13,outline:"none",boxSizing:"border-box" }}/>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12 }}>
              <div>
                <label style={{ color:"#50605A",fontSize:11,letterSpacing:1,display:"block",marginBottom:4 }}>HORARIO</label>
                <select value={editOrder.horario}
                  onChange={e=>setEditOrder(o=>({...o,horario:e.target.value}))}
                  style={{ width:"100%",padding:"9px",background:"#0A0D0A",border:"1px solid #1E2820",
                    borderRadius:8,color:"#F0EBE0",fontSize:13,outline:"none" }}>
                  {HORARIOS_BASE.map(h=><option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color:"#50605A",fontSize:11,letterSpacing:1,display:"block",marginBottom:4 }}>ESTADO</label>
                <select value={editOrder.estado}
                  onChange={e=>setEditOrder(o=>({...o,estado:e.target.value}))}
                  style={{ width:"100%",padding:"9px",background:"#0A0D0A",border:"1px solid #1E2820",
                    borderRadius:8,color:"#F0EBE0",fontSize:13,outline:"none" }}>
                  {Object.entries(ESTADOS).map(([k,v])=>(
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ color:"#50605A",fontSize:11,letterSpacing:1,display:"block",marginBottom:4 }}>OBSERVACIONES</label>
              <textarea rows={2} value={editOrder.observaciones||""}
                onChange={e=>setEditOrder(o=>({...o,observaciones:e.target.value}))}
                style={{ width:"100%",padding:"9px",background:"#0A0D0A",border:"1px solid #1E2820",
                  borderRadius:8,color:"#F0EBE0",fontSize:13,outline:"none",resize:"none",boxSizing:"border-box" }}/>
            </div>
            <div style={{ display:"flex",gap:8 }}>
              <button onClick={()=>{ printComanda(editOrder); }}
                style={{ flex:1,padding:"11px",background:"transparent",border:"1px solid #252F28",
                  borderRadius:8,color:"#D0E0D0",cursor:"pointer",fontSize:13 }}>
                🖨️ Reimprimir
              </button>
              <button onClick={()=>{ onUpdateOrder(editOrder.id,editOrder); setEditOrder(null); }}
                style={{ flex:2,padding:"11px",background:"#C9A84C",border:"none",
                  borderRadius:8,color:"#0A0D0A",fontWeight:700,cursor:"pointer",fontSize:14 }}>
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {showM&&(
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:100,
          display:"flex",alignItems:"flex-start",justifyContent:"center",overflowY:"auto",padding:"20px 0" }}>
          <div style={{ background:"#141914",borderRadius:16,border:"1px solid #252F28",
            padding:24,width:"100%",maxWidth:500,margin:"0 16px" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
              <h3 style={{ color:"#F0EBE0",fontFamily:"serif",fontSize:20,margin:0,fontWeight:400 }}>Pedido manual</h3>
              <button onClick={()=>{setShowM(false);setMf(emptyForm("presencial"));}}
                style={{ background:"transparent",border:"none",color:"#50605A",fontSize:22,cursor:"pointer" }}>×</button>
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ color:"#50605A",fontSize:11,letterSpacing:1,display:"block",marginBottom:8 }}>ORIGEN</label>
              <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                {FUENTES.map(f=>(
                  <button key={f.id} onClick={()=>setMf(m=>({...m,fuente:f.id}))}
                    style={{ padding:"6px 10px",borderRadius:8,border:"1px solid",fontSize:12,cursor:"pointer",
                      borderColor:mf.fuente===f.id?"#C9A84C":"#1E2820",
                      background:mf.fuente===f.id?"#C9A84C18":"transparent",
                      color:mf.fuente===f.id?"#C9A84C":"#607060" }}>{f.label}</button>
                ))}
              </div>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14 }}>
              <div>
                <label style={{ color:"#50605A",fontSize:11,letterSpacing:1,display:"block",marginBottom:6 }}>SUCURSAL</label>
                <select value={mf.sucursal} onChange={e=>setMf(m=>({...m,sucursal:e.target.value,cart:[]}))} style={iS}>
                  {SUCURSALES.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color:"#50605A",fontSize:11,letterSpacing:1,display:"block",marginBottom:6 }}>TIPO</label>
                <select value={mf.tipo} onChange={e=>setMf(m=>({...m,tipo:e.target.value,metodoPago:"transferencia"}))} style={iS}>
                  <option value="retiro">🏪 Retiro</option>
                  <option value="delivery">🚗 Delivery</option>
                </select>
              </div>
            </div>
            {mf.tipo==="delivery"&&(
              <div style={{ background:"#1A2800",border:"1px solid #3A5A00",borderRadius:8,
                padding:"8px 12px",marginBottom:12,fontSize:12,color:"#A0D040" }}>
                🛵 Se sumará despacho de {fmt(COSTO_DELIVERY)} al total.
              </div>
            )}
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14 }}>
              <div>
                <label style={{ color:"#50605A",fontSize:11,letterSpacing:1,display:"block",marginBottom:6 }}>NOMBRE</label>
                <input value={mf.cliente.nombre} placeholder="Nombre" style={iS}
                  onChange={e=>setMf(m=>({...m,cliente:{...m.cliente,nombre:e.target.value}}))}/>
              </div>
              <div>
                <label style={{ color:"#50605A",fontSize:11,letterSpacing:1,display:"block",marginBottom:6 }}>TELÉFONO</label>
                <input value={mf.cliente.telefono} placeholder="+56 9..." style={iS}
                  onChange={e=>setMf(m=>({...m,cliente:{...m.cliente,telefono:e.target.value}}))}/>
              </div>
            </div>
            {mf.tipo==="delivery"&&(<>
              <div style={{ marginBottom:12 }}>
                <label style={{ color:"#50605A",fontSize:11,letterSpacing:1,display:"block",marginBottom:6 }}>DIRECCIÓN</label>
                <input value={mf.direccion} placeholder="Calle, número..." style={iS}
                  onChange={e=>setMf(m=>({...m,direccion:e.target.value}))}/>
              </div>
              <div style={{ marginBottom:14 }}>
                <label style={{ color:"#50605A",fontSize:11,letterSpacing:1,display:"block",marginBottom:6 }}>REFERENCIA</label>
                <input value={mf.referencia} placeholder="Color de casa, referencia..." style={iS}
                  onChange={e=>setMf(m=>({...m,referencia:e.target.value}))}/>
              </div>
            </>)}
            <div style={{ marginBottom:14 }}>
              <label style={{ color:"#50605A",fontSize:11,letterSpacing:1,display:"block",marginBottom:6 }}>FECHA</label>
              <select value={mf.fecha||new Date().toISOString().split("T")[0]}
                onChange={e=>setMf(m=>({...m,fecha:e.target.value}))} style={iS}>
                {getFechasDisponibles().map(f=><option key={f} value={f}>{formatFecha(f)}</option>)}
              </select>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14 }}>
              <div>
                <label style={{ color:"#50605A",fontSize:11,letterSpacing:1,display:"block",marginBottom:6 }}>HORARIO</label>
                <select value={mf.horario} onChange={e=>setMf(m=>({...m,horario:e.target.value}))} style={iS}>
                  {HORARIOS_BASE.map(h=><option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color:"#50605A",fontSize:11,letterSpacing:1,display:"block",marginBottom:6 }}>PAGO</label>
                <select value={mf.metodoPago} onChange={e=>setMf(m=>({...m,metodoPago:e.target.value}))} style={iS}>
                  {mfPagos.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ color:"#50605A",fontSize:11,letterSpacing:1,display:"block",marginBottom:8 }}>PRODUCTOS</label>
              <ProductSelector
                cart={mf.cart}
                onAdd={item=>setMf(m=>({...m,cart:[...m.cart,item]}))}
                onRemove={cartId=>setMf(m=>({...m,cart:m.cart.filter(i=>i.cartId!==cartId)}))}
                sucursal={mf.sucursal}
                stock={stock}
              />
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ color:"#50605A",fontSize:11,letterSpacing:1,display:"block",marginBottom:6 }}>OBSERVACIONES</label>
              <textarea rows={2} value={mf.observaciones} placeholder="Notas adicionales..."
                onChange={e=>setMf(m=>({...m,observaciones:e.target.value}))}
                style={{ ...iS,resize:"none" }}/>
            </div>
            {mf.cart.length>0&&(
              <div style={{ background:"#C9A84C12",border:"1px solid #C9A84C30",borderRadius:8,
                padding:"10px 14px",marginBottom:16,display:"flex",justifyContent:"space-between" }}>
                <span style={{ color:"#C9A84C",fontWeight:700 }}>Total del pedido</span>
                <span style={{ color:"#C9A84C",fontWeight:700 }}>{fmt(mfTot)}</span>
              </div>
            )}
            <button onClick={handleAddManual}
              style={{ width:"100%",padding:"13px",background:"#C9A84C",border:"none",
                borderRadius:8,color:"#0A0D0A",fontWeight:700,cursor:"pointer",fontSize:14 }}>
              Crear pedido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── KITCHEN CARD ──────────────────────────────────────────────────────────────
function KitchenCard({ order, onStatusChange }) {
  const [showPreview,setShowPreview]=useState(false);
  const est=ESTADOS[order.estado];
  return (
    <div style={{ background:"#141914",borderRadius:10,border:"1px solid #1A211A",
      padding:12,marginBottom:8,borderLeft:`3px solid ${est.color}` }}>
      <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}>
        <span style={{ color:"#F0EBE0",fontWeight:700,fontFamily:"monospace",fontSize:13 }}>{order.orderId}</span>
        <span style={{ color:"#50605A",fontSize:11 }}>{timeAgo(order.timestamp)}</span>
      </div>
      <div style={{ color:"#405040",fontSize:11,marginBottom:6 }}>
        {order.sucursal} · {order.tipo==="delivery"?"🚗":"🏪"} · {order.fecha?formatFecha(order.fecha):""} · {order.horario}
      </div>
      <div style={{ color:"#90A090",fontSize:13,marginBottom:8,fontWeight:600 }}>
        {order.cliente.nombre||"Cliente"}
      </div>
      {order.items.map((item,i)=>(
        <div key={i} style={{ marginBottom:5 }}>
          <div style={{ fontSize:13,color:"#B0C4B0" }}>
            <b style={{ color:"#D8E8D8" }}>{item.qty}×</b> {item.nombre}
          </div>
          {item.desc&&!item.cambios.length&&(
            <div style={{ fontSize:11,color:"#354035",paddingLeft:14 }}>{item.desc}</div>
          )}
          {item.cambios.map((c,j)=>(
            <div key={j} style={{ fontSize:12,color:"#5A9A5A",paddingLeft:14,marginTop:1,fontWeight:600 }}>
              ↳ Cambio: {c.nombre}
            </div>
          ))}
          {item.opcionesStr&&(
            <div style={{ fontSize:12,color:"#C9A84C",paddingLeft:14,marginTop:2,fontWeight:700 }}>
              🎯 {item.opcionesStr}
            </div>
          )}
          {item.obsModal&&(
            <div style={{ fontSize:11,color:"#4A7A4A",paddingLeft:14,marginTop:2,fontStyle:"italic" }}>
              📝 {item.obsModal}
            </div>
          )}
        </div>
      ))}
      {order.observaciones&&(
        <div style={{ marginTop:6,padding:"4px 8px",background:"#0A0D0A",
          borderRadius:6,color:"#607060",fontSize:11,fontStyle:"italic" }}>
          💬 {order.observaciones}
        </div>
      )}
      <div style={{ display:"flex",gap:6,marginTop:10 }}>
        {est.prev&&(
          <button onClick={()=>onStatusChange(order.id,est.prev)}
            style={{ padding:"7px 8px",background:"transparent",
              border:`1px solid ${ESTADOS[est.prev].color}40`,
              borderRadius:6,color:ESTADOS[est.prev].color,
              cursor:"pointer",fontSize:11 }}>
            ← {ESTADOS[est.prev].label}
          </button>
        )}
        {est.next&&(
          <button onClick={()=>onStatusChange(order.id,est.next)}
            style={{ flex:1,padding:"7px",background:ESTADOS[est.next].bg,
              border:`1px solid ${ESTADOS[est.next].color}40`,
              borderRadius:6,color:ESTADOS[est.next].color,
              fontWeight:700,cursor:"pointer",fontSize:12 }}>
            → {est.next==="completado"?labelCompletado(order.tipo):ESTADOS[est.next].label}
          </button>
        )}
        <button onClick={()=>setShowPreview(true)}
          style={{ padding:"7px 8px",background:"transparent",border:"1px solid #1E2820",
            borderRadius:6,color:"#405040",cursor:"pointer",fontSize:11 }}>🧾</button>
        <button onClick={()=>printComanda(order)}
          style={{ padding:"7px 10px",background:"transparent",border:"1px solid #1E2820",
            borderRadius:6,color:"#405040",cursor:"pointer",fontSize:11 }}>🖨️</button>
      </div>
      {showPreview&&<ComandaPreview order={order} onClose={()=>setShowPreview(false)}/>}
    </div>
  );
}

// ── KITCHEN VIEW ──────────────────────────────────────────────────────────────
function KitchenView({ orders, onStatusChange }) {
  const [fSuc,setFSuc]=useState("all");
  const active=["abierto","en_proceso","listo"];
  const filtered=orders.filter(o=>(fSuc==="all"||o.sucursal===fSuc)&&active.includes(o.estado));
  return (
    <div style={{ padding:"16px" }}>
      <div style={{ display:"flex",gap:6,marginBottom:14,alignItems:"center",flexWrap:"wrap" }}>
        <span style={{ color:"#405040",fontSize:12 }}>Sucursal:</span>
        {["all",...SUCURSALES].map(s=>(
          <button key={s} onClick={()=>setFSuc(s)}
            style={{ padding:"4px 12px",borderRadius:20,border:"1px solid",fontSize:12,cursor:"pointer",
              borderColor:fSuc===s?"#C9A84C":"#1E2820",
              background:fSuc===s?"#C9A84C18":"transparent",
              color:fSuc===s?"#C9A84C":"#607060" }}>
            {s==="all"?"Todas":s}
          </button>
        ))}
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,minWidth:580 }}>
        {active.map(estado=>{
          const est=ESTADOS[estado];
          const col=filtered.filter(o=>o.estado===estado).sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));
          return (
            <div key={estado} style={{ background:"#0E130E",borderRadius:12,border:`1px solid ${est.color}22`,padding:12 }}>
              <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:12,paddingBottom:10,
                borderBottom:`1px solid ${est.color}20` }}>
                <span style={{ width:8,height:8,borderRadius:"50%",background:est.color,display:"inline-block" }}/>
                <span style={{ color:est.color,fontWeight:700,fontSize:13 }}>{est.label}</span>
                <span style={{ marginLeft:"auto",background:est.bg,color:est.color,
                  borderRadius:20,padding:"2px 8px",fontSize:12,fontWeight:700 }}>{col.length}</span>
              </div>
              {col.length===0
                ?<div style={{ color:"#1E2820",textAlign:"center",padding:"24px 0",fontSize:12 }}>Sin pedidos</div>
                :col.map(o=><KitchenCard key={o.id} order={o} onStatusChange={onStatusChange}/>)
              }
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── REPORTES VIEW ─────────────────────────────────────────────────────────────
function ReportesView({ orders }) {
  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroSuc,   setFiltroSuc]   = useState("all");

  const filtered = orders
    .filter(o => !filtroFecha || o.fecha===filtroFecha)
    .filter(o => filtroSuc==="all" || o.sucursal===filtroSuc)
    .sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));

  const totalVentas = filtered
    .filter(o=>o.estado!=="abierto") // solo los que avanzaron
    .reduce((s,o)=>{
      const sub = o.items.reduce((ss,i)=>ss+(i.precio+cambiosCosto(i.cambios))*i.qty,0);
      return s + sub + (o.tipo==="delivery"?COSTO_DELIVERY:0);
    },0);

  const exportCSV = () => {
    const headers = ["N°Orden","Fecha","Hora","Sucursal","Cliente","Teléfono","Tipo","Horario","Productos","Total","Pago","Estado"];
    const rows = filtered.map(o=>{
      const tot = o.items.reduce((s,i)=>s+(i.precio+cambiosCosto(i.cambios))*i.qty,0)+(o.tipo==="delivery"?COSTO_DELIVERY:0);
      const productos = o.items.map(i=>`${i.qty}x ${i.nombre}`).join(" | ");
      const hora = new Date(o.timestamp).toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit"});
      const pago = getPagos(o.tipo).find(m=>m.id===o.metodoPago)?.label||o.metodoPago;
      const estado = o.estado==="completado"?labelCompletado(o.tipo):ESTADOS[o.estado]?.label||o.estado;
      return [o.orderId,o.fecha||"",hora,o.sucursal,o.cliente.nombre,o.cliente.telefono,
        o.tipo,o.horario,`"${productos}"`,tot,pago,estado].join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8;"});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href=url; a.download=`pedidos_sushi_${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding:"20px 16px",maxWidth:900,margin:"0 auto" }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:8 }}>
        <h2 style={{ color:"#F0EBE0",fontFamily:"'Crimson Pro',serif",fontSize:22,fontWeight:400,fontStyle:"italic" }}>
          Reportes de pedidos
        </h2>
        <button onClick={exportCSV}
          style={{ padding:"8px 16px",background:"#1A3A1A",border:"1px solid #3A6A3A",borderRadius:8,
            color:"#70C070",cursor:"pointer",fontSize:13,fontWeight:600 }}>
          ⬇ Exportar CSV
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display:"flex",gap:8,marginBottom:16,flexWrap:"wrap" }}>
        <input type="date" value={filtroFecha} onChange={e=>setFiltroFecha(e.target.value)}
          style={{ padding:"8px 10px",background:"#141914",border:"1px solid #1E2820",
            borderRadius:8,color:"#C0D0C0",fontSize:13,outline:"none" }}/>
        <select value={filtroSuc} onChange={e=>setFiltroSuc(e.target.value)}
          style={{ padding:"8px 10px",background:"#141914",border:"1px solid #1E2820",
            borderRadius:8,color:"#C0D0C0",fontSize:13,outline:"none",cursor:"pointer" }}>
          <option value="all">Todas las sucursales</option>
          {SUCURSALES.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        {(filtroFecha||filtroSuc!=="all")&&(
          <button onClick={()=>{setFiltroFecha("");setFiltroSuc("all");}}
            style={{ padding:"8px 12px",background:"transparent",border:"1px solid #252F28",
              borderRadius:8,color:"#607060",cursor:"pointer",fontSize:13 }}>
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Resumen */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:20 }}>
        {[
          { l:"Pedidos",   v:filtered.length,       c:"#D0E0D0" },
          { l:"Completados", v:filtered.filter(o=>o.estado==="completado").length, c:"#34D399" },
          { l:"Total ventas", v:fmt(totalVentas),   c:"#C9A84C" },
        ].map(s=>(
          <div key={s.l} style={{ background:"#141914",borderRadius:10,padding:"14px",
            border:"1px solid #1E2820",textAlign:"center" }}>
            <div style={{ color:s.c,fontSize:s.l==="Total ventas"?18:24,fontWeight:700 }}>{s.v}</div>
            <div style={{ color:"#354035",fontSize:11,marginTop:2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Tabla */}
      {filtered.length===0 ? (
        <div style={{ textAlign:"center",padding:"48px 0",color:"#252F28" }}>
          <div style={{ fontSize:32,marginBottom:8 }}>📋</div>
          <p>Sin pedidos para este filtro</p>
        </div>
      ) : (
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%",borderCollapse:"collapse",fontSize:12 }}>
            <thead>
              <tr>
                {["N° Orden","Fecha","Sucursal","Cliente","Tipo","Horario","Productos","Total","Pago","Estado"].map(h=>(
                  <th key={h} style={{ padding:"8px 10px",textAlign:"left",color:"#50605A",
                    borderBottom:"1px solid #1E2820",whiteSpace:"nowrap",fontWeight:600,letterSpacing:0.5,fontSize:10 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(o=>{
                const tot = o.items.reduce((s,i)=>s+(i.precio+cambiosCosto(i.cambios))*i.qty,0)+(o.tipo==="delivery"?COSTO_DELIVERY:0);
                const pago = getPagos(o.tipo).find(m=>m.id===o.metodoPago)?.label||o.metodoPago;
                const estadoLabel = o.estado==="completado"?labelCompletado(o.tipo):ESTADOS[o.estado]?.label||o.estado;
                const estadoColor = ESTADOS[o.estado]?.color||"#6B7280";
                return (
                  <tr key={o.id} style={{ borderBottom:"1px solid #141914" }}>
                    <td style={{ padding:"10px",color:"#F0EBE0",fontFamily:"monospace",fontWeight:700 }}>{o.orderId}</td>
                    <td style={{ padding:"10px",color:"#A0B0A0",whiteSpace:"nowrap" }}>
                      {o.fecha?formatFecha(o.fecha):""}<br/>
                      <span style={{ color:"#50605A" }}>{new Date(o.timestamp).toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit"})}</span>
                    </td>
                    <td style={{ padding:"10px",color:"#A0B0A0" }}>{o.sucursal}</td>
                    <td style={{ padding:"10px" }}>
                      <div style={{ color:"#D0E0D0" }}>{o.cliente.nombre||"—"}</div>
                      <div style={{ color:"#50605A" }}>{o.cliente.telefono}</div>
                    </td>
                    <td style={{ padding:"10px",color:"#A0B0A0",whiteSpace:"nowrap" }}>
                      {o.tipo==="delivery"?"🚗 Delivery":"🏪 Retiro"}
                    </td>
                    <td style={{ padding:"10px",color:"#A0B0A0",whiteSpace:"nowrap" }}>{o.horario}</td>
                    <td style={{ padding:"10px",maxWidth:200 }}>
                      {o.items.map((item,i)=>(
                        <div key={i} style={{ color:"#8AA080",marginBottom:2 }}>
                          {item.qty}× {item.nombre}
                          {item.opcionesStr&&<span style={{ color:"#C9A84C",marginLeft:4 }}>({item.opcionesStr})</span>}
                          {item.cambios.length>0&&<span style={{ color:"#607060",marginLeft:4 }}>[{item.cambios.map(c=>c.nombre).join(",")}]</span>}
                        </div>
                      ))}
                      {o.observaciones&&<div style={{ color:"#405040",fontSize:11,fontStyle:"italic",marginTop:2 }}>💬 {o.observaciones}</div>}
                    </td>
                    <td style={{ padding:"10px",color:"#E03030",fontWeight:700,whiteSpace:"nowrap" }}>{fmt(tot)}</td>
                    <td style={{ padding:"10px",color:"#607060",fontSize:11 }}>{pago}</td>
                    <td style={{ padding:"10px",whiteSpace:"nowrap" }}>
                      <span style={{ background:ESTADOS[o.estado]?.bg||"#1A1F1A",color:estadoColor,
                        padding:"3px 8px",borderRadius:10,fontSize:11,fontWeight:600 }}>
                        {estadoLabel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── APP ROOT ──────────────────────────────────────────────────────────────────
export default function App() {
  const [view,setView]           = useState("customer");
  const [orders,setOrders]       = useState([]);
  const [stock,setStock]         = useState(stockInicial);
  const [diasDesbloqueados,setDiasDesbloqueados] = useState(diasDesbloqueadosInicial);
  const [loaded,setLoaded]       = useState(false);
  const [pinTarget,setPinTarget] = useState(null);
  const [adminOk,setAdminOk]       = useState(false);
  const [kitchenOk,setKitchenOk]   = useState(false);
  const [reportesOk,setReportesOk] = useState(false);

  useEffect(()=>{
    (async()=>{
      try{
        const r=await window.storage.get("sushi-v4");
        if(r) setOrders(JSON.parse(r.value));
        const s=await window.storage.get("sushi-stock");
        if(s) setStock(JSON.parse(s.value));
        const dd=await window.storage.get("sushi-dias");
        if(dd) setDiasDesbloqueados(JSON.parse(dd.value));
      }catch(_){}
      setLoaded(true);
    })();
  },[]);
  useEffect(()=>{
    if(!loaded) return;
    (async()=>{ try{ await window.storage.set("sushi-v4",JSON.stringify(orders)); }catch(_){} })();
  },[orders,loaded]);
  useEffect(()=>{
    if(!loaded) return;
    (async()=>{ try{ await window.storage.set("sushi-stock",JSON.stringify(stock)); }catch(_){} })();
  },[stock,loaded]);
  useEffect(()=>{
    if(!loaded) return;
    (async()=>{ try{ await window.storage.set("sushi-dias",JSON.stringify(diasDesbloqueados)); }catch(_){} })();
  },[diasDesbloqueados,loaded]);

  const addOrder  = o=>setOrders(p=>[{...o,id:uid()},...p]);
  const updStatus = (id,estado)=>setOrders(p=>p.map(o=>o.id===id?{...o,estado}:o));
  const deleteOrder = id=>setOrders(p=>p.filter(o=>o.id!==id));
  const updateOrder = (id,changes)=>setOrders(p=>p.map(o=>o.id===id?{...o,...changes}:o));
  const navigate  = t=>{
    if(t==="admin"   &&!adminOk)    return setPinTarget("admin");
    if(t==="kitchen" &&!kitchenOk)  return setPinTarget("kitchen");
    if(t==="reportes"&&!reportesOk) return setPinTarget("reportes");
    setView(t);
  };
  const onPinOk=()=>{
    if(pinTarget==="admin")    setAdminOk(true);
    if(pinTarget==="kitchen")  setKitchenOk(true);
    if(pinTarget==="reportes") setReportesOk(true);
    setView(pinTarget); setPinTarget(null);
  };

  const pending=orders.filter(o=>o.estado==="abierto").length;
  if(!loaded) return (
    <div style={{ background:"#0A0D0A",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center" }}>
      <span style={{ fontSize:40 }}>🍣</span>
    </div>
  );

  const nav=[
    {id:"customer", label:"📱 Pedido",   public:true },
    {id:"admin",    label:pending>0?`📋 Admin (${pending})`:"📋 Admin", public:false},
    {id:"kitchen",  label:"👨‍🍳 Cocina",  public:false},
    {id:"reportes", label:"📊 Reportes", public:false},
  ];

  return (
    <div style={{ background:"#0A0D0A",minHeight:"100vh",color:"#F0EBE0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&family=Crimson+Pro:ital,wght@0,400;0,600;1,400&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans',system-ui,sans-serif}
        select option{background:#141914;color:#F0EBE0}
        ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:#0A0D0A}
        ::-webkit-scrollbar-thumb{background:#252F28;border-radius:2px}
        input::placeholder,textarea::placeholder{color:#354035}
        select{font-family:'DM Sans',system-ui,sans-serif}
      `}</style>
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
              <button key={item.id} onClick={()=>navigate(item.id)}
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
      {view==="customer" &&<CustomerView onAddOrder={addOrder} stock={stock} orders={orders} diasDesbloqueados={diasDesbloqueados}/>}
      {view==="admin"    &&<AdminView orders={orders} onAddOrder={addOrder} onStatusChange={updStatus} onDeleteOrder={deleteOrder} onUpdateOrder={updateOrder} stock={stock} onToggleStock={id=>setStock(s=>({...s,[id]:!s[id]}))} diasDesbloqueados={diasDesbloqueados} onToggleDia={iso=>setDiasDesbloqueados(prev=>prev.includes(iso)?prev.filter(d=>d!==iso):[...prev,iso])}/>}
      {view==="kitchen"  &&<KitchenView orders={orders} onStatusChange={updStatus}/>}
      {view==="reportes" &&<ReportesView orders={orders}/>}
      {pinTarget&&<PinModal target={pinTarget} onSuccess={onPinOk} onClose={()=>setPinTarget(null)}/>}
    </div>
  );
}
