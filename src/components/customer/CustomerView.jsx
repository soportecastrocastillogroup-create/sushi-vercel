import { useState } from "react";
import { fmt } from "../../utils/format.js";
import { cambiosCosto, cartSubtotal, cartTotal } from "../../utils/cart.js";
import { getFechasDisponibles, getHorariosDisponibles, formatFecha } from "../../utils/dates.js";
import { emptyForm } from "../../utils/orders.js";
import { getPagos } from "../../constants/estados.js";

import ProductSelector from "./ProductSelector.jsx";
import { buildComandaData, ComandaPreview, printComanda } from "../shared/Comanda.jsx";

// ── CUSTOMER VIEW ─────────────────────────────────────────────────────────────
export default function CustomerView({ onAddOrder, stock, orders, diasDesbloqueados=[], menu, customizations, settings, branches }) {
  const [step,setStep]                 = useState(1);
  const [form,setForm]                 = useState(emptyForm("web", branches[0]));
  const [lastOrder,setLastOrder]       = useState(null);
  const [showPreview,setShowPreview]   = useState(false);
  const [mostrarOtrasFechas,setMostrarOtrasFechas] = useState(false);

  const sub   = cartSubtotal(form.cart);
  const tot   = cartTotal(form.cart,form.tipo,settings.costoDelivery);
  const count = form.cart.reduce((s,i)=>s+i.qty,0);
  const pagos = getPagos(form.tipo);

  const todasFechas = getFechasDisponibles(diasDesbloqueados, settings.blockedWeekdays);
  const fechas = todasFechas.filter(f=>!f.bloqueado);
  const horariosDisp = getHorariosDisponibles(form.fecha, orders, settings.timeSlots, settings.maxPorHorario);
  const horarioActivo = form.horario || horariosDisp[0] || "";

  const handleFechaChange = (f) => {
    const disp = getHorariosDisponibles(f, orders, settings.timeSlots, settings.maxPorHorario);
    setForm(prev=>({...prev, fecha:f, horario: disp[0]||""}));
  };

  const clearForSucursal = s=>{
    const valid=menu.filter(m=>m.sucursales.includes(s)).map(m=>m.id);
    setForm(f=>({...f,sucursal:s,cart:f.cart.filter(i=>valid.includes(i.productId))}));
  };

  const canNext = ()=>{
    if(step===1){
      if(form.tipo==="delivery" && form.direccion.trim().length<4) return false;
      if(!horarioActivo) return false;
      return true;
    }
    if(step===2) return count>0;
    if(step===3) return form.cliente.nombre.trim()&&form.cliente.telefono.trim();
    return true;
  };

  const handleSubmit = async ()=>{
    const order={...form, horario: horarioActivo, items:form.cart, estado:"abierto", fuente:"web", timestamp:new Date().toISOString()};
    const created = await onAddOrder(order);
    setLastOrder(created);
  };

  // ── SUCCESS SCREEN ──────────────────────────────────────────────────────────
  if(lastOrder){
    const { del:oDel, tot:oTot}=buildComandaData({...lastOrder,items:lastOrder.items}, settings.costoDelivery);
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
                <span style={{ color:"#C9A84C" }}>{fmt(settings.costoDelivery)}</span>
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
          <a href={`https://wa.me/${settings.whatsappNum}?text=${waText}`} target="_blank" rel="noreferrer"
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
            <button onClick={()=>printComanda(lastOrder, settings.costoDelivery)}
              style={{ flex:1,padding:"11px",background:"transparent",border:"1px solid #1E2820",
                borderRadius:8,color:"#C0C8C0",fontWeight:500,cursor:"pointer",fontSize:13 }}>
              🖨️ Imprimir
            </button>
          </div>
          <button onClick={()=>{ setForm(emptyForm("web", branches[0] || "Loncoche")); setStep(1); setLastOrder(null); }}
            style={{ width:"100%",padding:"11px",background:"transparent",border:"1px solid #141914",
              borderRadius:8,color:"#354035",cursor:"pointer",fontSize:13 }}>
            Hacer otro pedido
          </button>
        </div>
        {showPreview&&<ComandaPreview order={lastOrder} settings={settings} onClose={()=>setShowPreview(false)}/>}
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
            ¿Dónde retiras o recibes?
          </h2>

          {branches.length>1&&(
            <>
              <label style={{ color:"#50605A",fontSize:11,letterSpacing:1,display:"block",marginBottom:6 }}>SUCURSAL</label>
              <div style={{ display:"grid",gridTemplateColumns:`repeat(${branches.length},1fr)`,gap:8,marginBottom:20 }}>
                {branches.map(s=>(
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
                    Costo de despacho: {fmt(settings.costoDelivery)}
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
                  const sinCupos=getHorariosDisponibles(f.iso, orders, settings.timeSlots, settings.maxPorHorario).length===0;
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
                  const pedidosEnSlot = orders.filter(o=>o.fecha===form.fecha&&o.horario===h&&o.estado!=="completado").length;
                  const disponibles = settings.maxPorHorario - pedidosEnSlot;
                  return (
                    <button key={h} onClick={()=>setForm(f=>({...f,horario:h}))}
                      style={{ padding:"8px 16px",borderRadius:8,border:"2px solid",cursor:"pointer",
                        fontSize:14,fontWeight:horarioActivo===h?700:400,
                        borderColor:horarioActivo===h?"#C9A84C":"#1E2820",
                        background:horarioActivo===h?"#C9A84C14":"#0A0D0A",
                        color:horarioActivo===h?"#C9A84C":"#607060" }}>
                      {h}
                      {disponibles<=2&&<span style={{ fontSize:10,marginLeft:4,
                        color:horarioActivo===h?"#A07030":"#806040" }}>({disponibles} cupos)</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <p style={{ color:"#354035",fontSize:11,marginBottom:20 }}>
            Horario de atención: 17:00 — 21:30 · Máximo {settings.maxPorHorario} pedidos por horario
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
          <ProductSelector menu={menu} customizations={customizations} settings={settings}
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
                  <span style={{ color:"#707870",fontSize:12 }}>+{fmt(settings.costoDelivery)}</span>
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
              ["Horario",horarioActivo],
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
                <span style={{ color:"#C9A84C" }}>{fmt(settings.costoDelivery)}</span>
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

