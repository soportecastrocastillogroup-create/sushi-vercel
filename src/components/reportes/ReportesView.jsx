import { useState } from "react";
import { fmt } from "../../utils/format.js";
import { cambiosCosto } from "../../utils/cart.js";
import { formatFecha } from "../../utils/dates.js";
import { labelCompletado } from "../../utils/orders.js";
import { ESTADOS, getPagos } from "../../constants/estados.js";

// ── REPORTES VIEW ─────────────────────────────────────────────────────────────
export default function ReportesView({ orders, settings, branches }) {
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
      return s + sub + (o.tipo==="delivery"?settings.costoDelivery:0);
    },0);

  const exportCSV = () => {
    const headers = ["N°Orden","Fecha","Hora","Sucursal","Cliente","Teléfono","Tipo","Horario","Productos","Total","Pago","Estado"];
    const rows = filtered.map(o=>{
      const tot = o.items.reduce((s,i)=>s+(i.precio+cambiosCosto(i.cambios))*i.qty,0)+(o.tipo==="delivery"?settings.costoDelivery:0);
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
          {branches.map(s=><option key={s} value={s}>{s}</option>)}
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
                const tot = o.items.reduce((s,i)=>s+(i.precio+cambiosCosto(i.cambios))*i.qty,0)+(o.tipo==="delivery"?settings.costoDelivery:0);
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

