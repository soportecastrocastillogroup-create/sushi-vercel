import { useState } from "react";
import { fmt, uid } from "../../utils/format.js";
import { itemTotal } from "../../utils/cart.js";

import CustomizationModal from "./CustomizationModal.jsx";

// ── PRODUCT SELECTOR ─────────────────────────────────────────────────────────
export default function ProductSelector({ cart, onAdd, onRemove, sucursal, stock={}, menu, customizations, settings }) {
  const visible = menu.filter(m=>m.sucursales.includes(sucursal));
  const cats    = [...new Set(visible.map(m=>m.cat))];
  const [cat,setCat]   = useState(cats[0]||"");
  const activeCat = cats.includes(cat) ? cat : (cats[0] || "");
  const [modal,setModal] = useState(null);

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

  const confirmCustom = (cambios, obsModal, handrollSabor, opcionesSeleccionadas)=>{
    let nombreFinal = modal.nombre;
    if(handrollSabor) nombreFinal += ` — ${handrollSabor==="palta"?"Palta":"Cebollín"}`;
    // Build opcionesStr for display in comanda
    const opcionesStr = modal.opciones
      ? modal.opciones.map((op,i)=>`${op.label.replace("¿Cómo quieres tu ","").replace("?","")}: ${opcionesSeleccionadas?.[i]||"—"}`).join(" · ")
      : "";
    onAdd({ cartId:uid(), productId:modal.id, nombre:nombreFinal,
      precio:modal.precio, piezas:modal.piezas, cat:modal.cat,
      desc:modal.desc||"", cambios, obsModal:obsModal||"",
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
              borderColor:activeCat===c?"#C9A84C":"#1E2820",
              background:activeCat===c?"#C9A84C18":"transparent",
              color:activeCat===c?"#C9A84C":"#607060",fontWeight:activeCat===c?700:400 }}>
            {c}
          </button>
        ))}
      </div>

      <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
        {visible.filter(m=>m.cat===activeCat).map(product=>{
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

      {modal&&<CustomizationModal product={modal} onConfirm={confirmCustom} onClose={()=>setModal(null)} customizations={customizations} settings={settings}/>}
    </div>
  );
}

