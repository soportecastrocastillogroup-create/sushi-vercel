import { useState } from "react";
import { fmt } from "../../utils/format.js";
import { cambiosCosto } from "../../utils/cart.js";

// ── CUSTOMIZATION MODAL ──────────────────────────────────────────────────────
export default function CustomizationModal({ product, onConfirm, onClose, customizations, settings }) {
  const isHandroll = product.cat==="Handrolls";
  const initialTab = product.cat==="Rolls" ? "envoltura" : "relleno";
  const [tab,setTab]           = useState(initialTab);
  const [cambios,setCambios]   = useState([]);
  const [salsaQty,setSalsaQty] = useState({});
  const [handrollSabores,setHandrollSabores] = useState(Array.from({length:product.piezas||1},()=>""));
  const [opcionesSeleccionadas,setOpcionesSeleccionadas] = useState({}); // { opcionIdx: choiceStr }
  const [obsModal,setObsModal] = useState("");

  // salsas as flat list from salsaQty
  const salsasCambios = Object.entries(salsaQty)
    .filter(([,q])=>q>0)
    .flatMap(([id,q])=>{
      const s=customizations.salsas.find(x=>x.id===id);
      return Array.from({length:q},()=>({...s,tipo:"salsa"}));
    });

  const totalCambios = cambiosCosto(cambios) + salsasCambios.reduce((s,c)=>s+c.precio,0);
  const canAdd = cambios.length<settings.maxCambios;

  const toggle = (opt,tipo)=>{
    const idx=cambios.findIndex(c=>c.id===opt.id);
    if(idx>=0){setCambios(cambios.filter((_,i)=>i!==idx));return;}
    if(!canAdd) return;
    setCambios([...cambios,{...opt,tipo}]);
  };
  const isSel = id=>cambios.some(c=>c.id===id);

  const tabs = isHandroll ? [] : [
    {id:"relleno",   label:"Relleno",   opts:customizations.rellenos   },
    {id:"envoltura", label:"Envoltura", opts:customizations.envolturas },
    {id:"salsa",     label:"Salsas",    opts:null       }, // custom rendering
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
    // validate opciones
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
      <div style={{ background:"#141416",borderRadius:"24px 24px 0 0",border:"1px solid #2D2D31",
        width:"100%",maxWidth:520,maxHeight:"92vh",display:"flex",flexDirection:"column" }}>

        <div style={{ display:"flex",justifyContent:"center",padding:"12px 0 0" }}>
          <div style={{ width:36,height:4,borderRadius:2,background:"#313135" }}/>
        </div>

        {/* Product header */}
        <div style={{ padding:"14px 22px 12px",borderBottom:"1px solid #222226" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12 }}>
            <div style={{ flex:1 }}>
              <div style={{ color:"#F5F5F5",fontWeight:700,fontSize:18,marginBottom:4,
                fontFamily:"var(--font-display)" }}>
                {product.nombre}
              </div>
              {product.piezas&&(
                <div style={{ color:"#E03030",fontSize:12,fontWeight:700,marginBottom:6 }}>
                  {product.piezas} {product.cat==="Handrolls"?"unidad(es)":"bocados"}
                </div>
              )}
              {product.rolls&&product.rolls.map((r,i)=>(
                <div key={i} style={{ fontSize:12,marginBottom:2,display:"flex",gap:4 }}>
                  <span style={{ color:"#ACACB0" }}>Roll de {r.envoltura}</span>
                  <span style={{ color:"#6A6A72" }}>· {r.relleno}</span>
                </div>
              ))}
              {product.desc&&!product.rolls&&(
                <div style={{ fontSize:13,color:"#9A9AA2",lineHeight:1.4 }}>{product.desc}</div>
              )}
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ color:"#E03030",fontWeight:700,fontSize:18 }}>{fmt(product.precio)}</div>
              {totalCambios>0&&(
                <div style={{ color:"#A07830",fontSize:12,marginTop:2 }}>+{fmt(totalCambios)}</div>
              )}
              <button onClick={onClose}
                style={{ background:"transparent",border:"none",color:"#8A8A92",fontSize:22,
                  cursor:"pointer",lineHeight:1,marginTop:4,padding:0 }}>×</button>
            </div>
          </div>

          {/* Handroll: sabor por unidad */}
          {isHandroll&&(
            <div style={{ marginTop:10 }}>
              <div style={{ color:"#59595D",fontSize:11,letterSpacing:1,marginBottom:8 }}>
                ELIGE EL SABOR DE CADA HANDROLL — obligatorio
              </div>
              {Array.from({length:product.piezas||1},(_,i)=>(
                <div key={i} style={{ marginBottom:8 }}>
                  <div style={{ color:"#8A8A92",fontSize:11,marginBottom:4 }}>Handroll {i+1}</div>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:6 }}>
                    {[{id:"palta",label:"Pollo, palta y queso crema"},{id:"cebollin",label:"Pollo, queso crema y cebollín"}].map(s=>{
                      const sel=(handrollSabores[i]||"")===s.id;
                      return (
                        <button key={s.id}
                          onClick={()=>setHandrollSabores(prev=>{const n=[...prev];n[i]=s.id;return n;})}
                          style={{ padding:"10px 8px",borderRadius:10,border:"2px solid",cursor:"pointer",
                            textAlign:"center",fontSize:12,lineHeight:1.4,
                            borderColor:sel?"#E53935":"#222226",background:sel?"#E5393514":"#121214",
                            color:sel?"#E53935":"#ACACB0",fontWeight:sel?700:400 }}>
                          {sel?"✓ ":""}{s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Opciones de envoltura para promos con elección (Promo Fría, Mini Mixta) */}
          {product.opciones&&product.opciones.map((op,opIdx)=>(
            <div key={opIdx} style={{ marginTop:10,padding:"12px 14px",background:"#121214",
              borderRadius:10,border:"1px solid #343438" }}>
              <div style={{ color:"#E53935",fontSize:12,marginBottom:8,fontWeight:700 }}>
                🎯 {op.label} — sin costo
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
                {op.choices.map(choice=>{
                  const sel = opcionesSeleccionadas[opIdx]===choice;
                  return (
                    <button key={choice} onClick={()=>setOpcionesSeleccionadas(prev=>({...prev,[opIdx]:choice}))}
                      style={{ padding:"12px 8px",borderRadius:10,border:"2px solid",cursor:"pointer",
                        textAlign:"center",fontWeight:sel?700:400,fontSize:13,
                        borderColor:sel?"#E53935":"#222226",background:sel?"#E5393518":"#18181B",
                        color:sel?"#E53935":"#C8C8CC" }}>
                      {sel?"✓ ":""}{choice}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div style={{ marginTop:8,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            {!isHandroll&&(
              <span style={{ color:"#5A5A62",fontSize:12 }}>Cambios opcionales · máx. {settings.maxCambios}</span>
            )}
            {!isHandroll&&(
              <span style={{ color:cambios.length>0?"#E53935":"#5A5A62",fontSize:12,fontWeight:700 }}>
                {cambios.length}/{settings.maxCambios}
              </span>
            )}
          </div>
        </div>

        {/* Tabs + options — only for non-handrolls */}
        {!isHandroll&&(
          <div style={{ flex:1,overflowY:"auto",padding:"14px 22px" }}>
            {/* Solo pollo — promos only */}
            {product.cat==="Promos"&&(()=>{
              const sel=cambios.some(c=>c.id===customizations.soloPollo.id);
              return (
                <div style={{ marginBottom:12 }}>
                  <div style={{ color:"#59595D",fontSize:11,letterSpacing:1,marginBottom:6 }}>OPCIÓN RÁPIDA</div>
                  <button onClick={()=>{
                    if(sel){setCambios(cambios.filter(c=>c.id!==customizations.soloPollo.id));return;}
                    if(!canAdd) return;
                    setCambios([...cambios,customizations.soloPollo]);
                  }}
                    style={{ width:"100%",padding:"12px 16px",borderRadius:10,border:"2px solid",
                      cursor:!sel&&!canAdd?"not-allowed":"pointer",textAlign:"left",
                      borderColor:sel?"#E53935":"#46464A",background:sel?"#E5393514":"#18181C",
                      opacity:!sel&&!canAdd?0.4:1,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                    <div>
                      <span style={{ fontSize:14,fontWeight:700,color:sel?"#E53935":"#D0D0D5" }}>
                        {sel?"✓ ":""}{customizations.soloPollo.nombre}
                      </span>
                      <div style={{ fontSize:11,color:"#6A6A72",marginTop:2 }}>
                        Cambia el relleno de toda la promo a solo pollo
                      </div>
                    </div>
                    <span style={{ color:"#E53935",fontWeight:700,fontSize:15,whiteSpace:"nowrap",marginLeft:12 }}>
                      +{fmt(customizations.soloPollo.precio)}
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
                    borderColor:tab===t.id?"#E53935":"#2C2C31",
                    background:tab===t.id?"#E5393520":"transparent",
                    color:tab===t.id?"#E53935":"#9A9AA2",fontWeight:tab===t.id?700:400 }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Context hint */}
            {contextLabel&&(
              <div style={{ background:"#121214",borderRadius:8,padding:"7px 12px",
                marginBottom:10,fontSize:12,color:"#757579",borderLeft:"2px solid #59595D" }}>
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
                        borderColor:sel?"#E53935":blocked?"#141416":"#222226",
                        background:sel?"#E5393514":"#121214",opacity:blocked?0.3:1 }}>
                      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",gap:4 }}>
                        <span style={{ color:sel?"#E53935":"#D0D0D5",fontSize:13,fontWeight:sel?700:400 }}>
                          {sel?"✓ ":""}{opt.nombre}
                        </span>
                        <span style={{ color:"#E53935",fontSize:12,whiteSpace:"nowrap",fontWeight:600 }}>
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
                <div style={{ color:"#59595D",fontSize:11,marginBottom:4 }}>
                  Podés agregar varias salsas del mismo tipo o distintas.
                </div>
                {customizations.salsas.map(s=>{
                  const q=salsaQty[s.id]||0;
                  return (
                    <div key={s.id}
                      style={{ display:"flex",justifyContent:"space-between",alignItems:"center",
                        padding:"10px 14px",background:"#121214",borderRadius:10,
                        border:`1px solid ${q>0?"#E5393540":"#222226"}` }}>
                      <div>
                        <span style={{ color:q>0?"#E53935":"#D0D0D5",fontSize:13,fontWeight:q>0?700:400 }}>
                          {s.nombre}
                        </span>
                        <span style={{ color:"#E53935",fontSize:12,marginLeft:8 }}>+{fmt(s.precio)} c/u</span>
                      </div>
                      <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                        {q>0&&(
                          <button onClick={()=>setSalsaQty(prev=>({...prev,[s.id]:Math.max(0,q-1)}))}
                            style={{ width:28,height:28,borderRadius:"50%",border:"1px solid #34343A",
                              background:"transparent",color:"#BFBFC3",cursor:"pointer",
                              fontSize:16,display:"flex",alignItems:"center",justifyContent:"center" }}>−</button>
                        )}
                        {q>0&&<span style={{ color:"#F5F5F5",fontWeight:700,minWidth:16,textAlign:"center" }}>{q}</span>}
                        <button onClick={()=>setSalsaQty(prev=>({...prev,[s.id]:(prev[s.id]||0)+1}))}
                          style={{ width:28,height:28,borderRadius:"50%",border:"none",
                            background:q>0?"#E53935":"#2C2C31",
                            color:q>0?"#FFFFFF":"#9A9AA2",cursor:"pointer",
                            fontSize:16,display:"flex",alignItems:"center",justifyContent:"center" }}>+</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Selected summary */}
            {(cambios.length>0||salsasCambios.length>0)&&(
              <div style={{ background:"#121214",borderRadius:10,padding:"10px 14px",marginTop:12,
                border:"1px solid #28282C" }}>
                <div style={{ color:"#59595D",fontSize:11,letterSpacing:1,marginBottom:6 }}>CAMBIOS SELECCIONADOS</div>
                {[...cambios,...salsasCambios].map((c,i)=>(
                  <div key={i} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                      <span style={{ color:"#5A5A62",fontSize:10,background:"#18181B",
                        padding:"1px 6px",borderRadius:8,textTransform:"capitalize" }}>
                        {c.tipo||"especial"}
                      </span>
                      <span style={{ color:"#DCDCE0",fontSize:13 }}>{c.nombre}</span>
                    </div>
                    <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                      <span style={{ color:"#E53935",fontSize:13 }}>+{fmt(c.precio)}</span>
                      {c.tipo!=="salsa"&&(
                        <button onClick={()=>{
                          if(c.id===customizations.soloPollo.id){setCambios(cambios.filter(x=>x.id!==c.id));}
                          else{toggle(c,c.tipo);}
                        }}
                          style={{ background:"transparent",border:"none",color:"#6A6A72",cursor:"pointer",fontSize:18,lineHeight:1 }}>×</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Observations */}
            <div style={{ marginTop:14 }}>
              <label style={{ color:"#59595D",fontSize:11,letterSpacing:1,display:"block",marginBottom:6 }}>
                ¿A QUÉ ROLL APLICA EL CAMBIO? <span style={{ color:"#3B3B3F",fontWeight:400 }}>(opcional)</span>
              </label>
              <textarea rows={2} value={obsModal}
                placeholder="Ej: El cambio aplica solo al roll de Panko..."
                onChange={e=>setObsModal(e.target.value)}
                style={{ width:"100%",padding:"9px 12px",background:"#121214",
                  border:"1px solid #28282C",borderRadius:8,color:"#D0D0D5",
                  fontSize:13,outline:"none",resize:"none",boxSizing:"border-box",
                  fontFamily:"inherit",lineHeight:1.5 }}/>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ padding:"14px 22px 24px",borderTop:"1px solid #222226" }}>
          <button onClick={handleConfirm}
            style={{ width:"100%",padding:"15px",background:"#E53935",border:"none",
              borderRadius:12,color:"#FFFFFF",fontWeight:700,cursor:"pointer",fontSize:15,
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

