import { useState } from "react";
import { ESTADOS } from "../../constants/estados.js";

import KitchenCard from "./KitchenCard.jsx";

// ── KITCHEN VIEW ──────────────────────────────────────────────────────────────
export default function KitchenView({ orders, onStatusChange, settings, branches, onRefresh }) {
  const [fSuc,setFSuc]=useState("all");
  const active=["abierto","en_proceso","listo"];
  const filtered=orders.filter(o=>(fSuc==="all"||o.sucursal===fSuc)&&active.includes(o.estado));
  return (
    <div style={{ padding:"16px" }}>
      {onRefresh&&(
        <button onClick={onRefresh} style={{ padding:"4px 12px",borderRadius:20,border:"1px solid #1E2820",
          background:"transparent",color:"#607060",cursor:"pointer",fontSize:12,marginBottom:14 }}>
          ↻ Actualizar
        </button>
      )}
      <div style={{ display:"flex",gap:6,marginBottom:14,alignItems:"center",flexWrap:"wrap" }}>
        <span style={{ color:"#405040",fontSize:12 }}>Sucursal:</span>
        {["all",...branches].map(s=>(
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
                :col.map(o=><KitchenCard key={o.id} order={o} onStatusChange={onStatusChange} settings={settings}/>)
              }
            </div>
          );
        })}
      </div>
    </div>
  );
}

