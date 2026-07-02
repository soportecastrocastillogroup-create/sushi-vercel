import { useState } from "react";
import { fmt, timeAgo } from "../../utils/format.js";
import { cambiosCosto } from "../../utils/cart.js";
import { formatFecha } from "../../utils/dates.js";
import { labelCompletado } from "../../utils/orders.js";
import { ESTADOS, FUENTES, getPagos } from "../../constants/estados.js";

import { buildComandaData, ComandaPreview, printComanda } from "./Comanda.jsx";

// ── ORDER CARD (Admin) ────────────────────────────────────────────────────────
export default function OrderCard({ order, onStatusChange, onDelete, onEdit, settings }) {
  const [showPreview,setShowPreview]=useState(false);
  const [confirmDelete,setConfirmDelete]=useState(false);
  const estado=ESTADOS[order.estado];
  const { del, tot } = buildComandaData(order, settings.costoDelivery);
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
        <button onClick={()=>printComanda(order, settings.costoDelivery)}
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
      {showPreview&&<ComandaPreview order={order} settings={settings} onClose={()=>setShowPreview(false)}/>}
    </div>
  );
}

