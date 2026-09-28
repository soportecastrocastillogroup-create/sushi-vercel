import { useState } from "react";
import { timeAgo } from "../../utils/format.js";
import { formatFecha } from "../../utils/dates.js";
import { labelCompletado } from "../../utils/orders.js";
import { ESTADOS } from "../../constants/estados.js";

import { ComandaPreview, printComanda } from "../shared/Comanda.jsx";

// ── KITCHEN CARD ──────────────────────────────────────────────────────────────
export default function KitchenCard({ order, onStatusChange, settings }) {
  const [showPreview,setShowPreview]=useState(false);
  const est=ESTADOS[order.estado];
  return (
    <div style={{ background:"#18181B",borderRadius:10,border:"1px solid #232327",
      padding:12,marginBottom:8,borderLeft:`3px solid ${est.color}` }}>
      <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}>
        <span style={{ color:"#F5F5F5",fontWeight:700,fontFamily:"monospace",fontSize:13 }}>{order.orderId}</span>
        <span style={{ color:"#8A8A92",fontSize:11 }}>{timeAgo(order.timestamp)}</span>
      </div>
      <div style={{ color:"#6A6A72",fontSize:11,marginBottom:6 }}>
        {order.sucursal} · {order.tipo==="delivery"?"🚗":"🏪"} · {order.fecha?formatFecha(order.fecha):""} · {order.horario}
      </div>
      <div style={{ color:"#B0B0B4",fontSize:13,marginBottom:8,fontWeight:600 }}>
        {order.cliente.nombre||"Cliente"}
      </div>
      {order.items.map((item,i)=>(
        <div key={i} style={{ marginBottom:5 }}>
          <div style={{ fontSize:13,color:"#D8D8DC" }}>
            <b style={{ color:"#FFFFFF" }}>{item.qty}×</b> {item.nombre}
          </div>
          {item.desc&&!item.cambios.length&&(
            <div style={{ fontSize:11,color:"#5A5A62",paddingLeft:14 }}>{item.desc}</div>
          )}
          {item.cambios.map((c,j)=>(
            <div key={j} style={{ fontSize:12,color:"#939397",paddingLeft:14,marginTop:1,fontWeight:600 }}>
              ↳ Cambio: {c.nombre}
            </div>
          ))}
          {item.opcionesStr&&(
            <div style={{ fontSize:12,color:"#E53935",paddingLeft:14,marginTop:2,fontWeight:700 }}>
              🎯 {item.opcionesStr}
            </div>
          )}
          {item.obsModal&&(
            <div style={{ fontSize:11,color:"#76767A",paddingLeft:14,marginTop:2,fontStyle:"italic" }}>
              📝 {item.obsModal}
            </div>
          )}
        </div>
      ))}
      {order.observaciones&&(
        <div style={{ marginTop:6,padding:"4px 8px",background:"#0E0E10",
          borderRadius:6,color:"#9A9AA2",fontSize:11,fontStyle:"italic" }}>
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
          style={{ padding:"7px 8px",background:"transparent",border:"1px solid #2C2C31",
            borderRadius:6,color:"#6A6A72",cursor:"pointer",fontSize:11 }}>🧾</button>
        <button onClick={()=>printComanda(order, settings.costoDelivery)}
          style={{ padding:"7px 10px",background:"transparent",border:"1px solid #2C2C31",
            borderRadius:6,color:"#6A6A72",cursor:"pointer",fontSize:11 }}>🖨️</button>
      </div>
      {showPreview&&<ComandaPreview order={order} settings={settings} onClose={()=>setShowPreview(false)}/>}
    </div>
  );
}

