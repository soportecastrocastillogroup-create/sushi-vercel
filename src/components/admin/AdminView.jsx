import { useState } from "react";
import { fmt } from "../../utils/format.js";
import { cartTotal } from "../../utils/cart.js";
import { getFechasDisponibles, formatFecha } from "../../utils/dates.js";
import { emptyForm } from "../../utils/orders.js";
import { ESTADOS, FUENTES, getPagos, NOMBRES_DIAS } from "../../constants/estados.js";

import OrderCard from "../shared/OrderCard.jsx";
import ProductSelector from "../customer/ProductSelector.jsx";

// ── ADMIN VIEW ────────────────────────────────────────────────────────────────
export default function AdminView({ orders, onAddOrder, onStatusChange, stock, onToggleStock, diasDesbloqueados=[], onToggleDia, menu, customizations, settings, branches, onRefresh }) {
  const [fSuc,setFSuc]=useState("all");
  const [fEst,setFEst]=useState("all");
  const [showM,setShowM]=useState(false);
  const [showStock,setShowStock]=useState(false);
  const [showDias,setShowDias]=useState(false);
  const [mf,setMf]=useState(emptyForm("presencial", branches[0]));

  const filtered=orders
    .filter(o=>fSuc==="all"||o.sucursal===fSuc)
    .filter(o=>fEst==="all"||o.estado===fEst)
    .sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));

  const activos = orders.filter(o=>o.estado!=="completado").length;
  const alertaPedidos = activos >= settings.alertaPedidos;
  const stats={
    total:    orders.length,
    abiertos: orders.filter(o=>o.estado==="abierto").length,
    enProceso:orders.filter(o=>o.estado==="en_proceso").length,
    listos:   orders.filter(o=>o.estado==="listo").length,
  };

  const mfTot=cartTotal(mf.cart,mf.tipo,settings.costoDelivery);
  const mfPagos=getPagos(mf.tipo);

  const handleAddManual=()=>{
    if(!mf.cliente.nombre.trim()) return alert("Ingresá el nombre del cliente");
    if(mf.cart.length===0) return alert("Agregá al menos un producto");
    onAddOrder({...mf,items:mf.cart,estado:"abierto",timestamp:new Date().toISOString()});
    setShowM(false); setMf(emptyForm("presencial", branches[0]));
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
              Se alcanzó el límite de {settings.alertaPedidos} pedidos. Verificar stock en ambos locales.
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
          {branches.map(s=><option key={s} value={s}>{s}</option>)}
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
        {onRefresh&&(
          <button onClick={onRefresh}
            style={{ padding:"8px 14px",background:"transparent",border:"1px solid #1E2820",borderRadius:8,
              color:"#607060",cursor:"pointer",fontSize:13,whiteSpace:"nowrap" }}>
            ↻ Actualizar
          </button>
        )}
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
            {getFechasDisponibles(diasDesbloqueados, settings.blockedWeekdays).map(({iso,dow,bloqueado})=>{
              const desbloqueadoManual = diasDesbloqueados.includes(iso);
              const esPorDefecto = !settings.blockedWeekdays.includes(dow);
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
                {menu.filter(m=>m.cat===catName).map(producto=>{
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
        :filtered.map(o=><OrderCard key={o.id} settings={settings} order={o} onStatusChange={onStatusChange}/>)
      }

      {showM&&(
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:100,
          display:"flex",alignItems:"flex-start",justifyContent:"center",overflowY:"auto",padding:"20px 0" }}>
          <div style={{ background:"#141914",borderRadius:16,border:"1px solid #252F28",
            padding:24,width:"100%",maxWidth:500,margin:"0 16px" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
              <h3 style={{ color:"#F0EBE0",fontFamily:"serif",fontSize:20,margin:0,fontWeight:400 }}>Pedido manual</h3>
              <button onClick={()=>{setShowM(false);setMf(emptyForm("presencial", branches[0]));}}
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
                  {branches.map(s=><option key={s} value={s}>{s}</option>)}
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
                🛵 Se sumará despacho de {fmt(settings.costoDelivery)} al total.
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
                {getFechasDisponibles(diasDesbloqueados, settings.blockedWeekdays).map(({iso})=><option key={iso} value={iso}>{formatFecha(iso)}</option>)}
              </select>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14 }}>
              <div>
                <label style={{ color:"#50605A",fontSize:11,letterSpacing:1,display:"block",marginBottom:6 }}>HORARIO</label>
                <select value={mf.horario} onChange={e=>setMf(m=>({...m,horario:e.target.value}))} style={iS}>
                  {settings.timeSlots.map(h=><option key={h} value={h}>{h}</option>)}
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
              <ProductSelector menu={menu} customizations={customizations} settings={settings}
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

