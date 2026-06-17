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
  const [handrollSabor,setHandrollSabor] = useState("");
  const [opcionesSeleccionadas,setOpcionesSeleccionadas] = useState({}); // { opcionIdx: choiceStr }
  const [obsModal,setObsModal] = useState("");

  // salsas as flat list from salsaQty
  const salsasCambios = Object.entries(salsaQty)
    .filter(([,q])=>q>0)
    .flatMap(([id,q])=>{
      const s=customizations.salsas.find(x=>x.id===id);
      return Array.from({length:q},()=>({...s,tipo:"salsa"}));
    });

  const totalCambios = cambiosCosto(cambios) + salsasCambios.reduce((s,c)=>s+c.precio,0)
    + (handrollSabor?0:0); // handroll choice is free
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
    if(isHandroll && !handrollSabor) return alert("Elige palta o cebollín para tu handroll");
    // validate opciones
    if(product.opciones){
      for(let i=0;i<product.opciones.length;i++){
        if(!opcionesSeleccionadas[i]) return alert(`Por favor elige: ${product.opciones[i].label}`);
      }
    }
    const allCambios = [...cambios, ...salsasCambios];
    onConfirm(allCambios, obsModal, handrollSabor, opcionesSeleccionadas);
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

          {/* Handroll: sabor choice */}
          {isHandroll&&(
            <div style={{ marginTop:10 }}>
              <div style={{ color:"#3A5A3A",fontSize:11,letterSpacing:1,marginBottom:8 }}>
                ELIGE TU SABOR — obligatorio
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
                {[
                  {id:"palta",   label:"Pollo, palta y queso crema"},
                  {id:"cebollin",label:"Pollo, queso crema y cebollín"},
                ].map(s=>(
                  <button key={s.id} onClick={()=>setHandrollSabor(s.id)}
                    style={{ padding:"12px 10px",borderRadius:10,border:"2px solid",cursor:"pointer",
                      textAlign:"center",
                      borderColor:handrollSabor===s.id?"#C9A84C":"#1A221A",
                      background:handrollSabor===s.id?"#C9A84C14":"#0D120D",
                      color:handrollSabor===s.id?"#C9A84C":"#8AA080",
                      fontWeight:handrollSabor===s.id?700:400,fontSize:12,lineHeight:1.4 }}>
                    {handrollSabor===s.id?"✓ ":""}{s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Opciones de envoltura para promos con elección (Promo Fría, Mini Mixta) */}
          {product.opciones&&product.opciones.map((op,opIdx)=>(
            <div key={opIdx} style={{ marginTop:10 }}>
              <div style={{ color:"#C9A84C",fontSize:11,letterSpacing:1,marginBottom:6,fontWeight:700 }}>
                {op.label.toUpperCase()} — sin costo adicional
              </div>
              <div style={{ display:"grid",gridTemplateColumns:`repeat(${op.choices.length},1fr)`,gap:8 }}>
                {op.choices.map(choice=>{
                  const sel = opcionesSeleccionadas[opIdx]===choice;
                  return (
                    <button key={choice} onClick={()=>setOpcionesSeleccionadas(prev=>({...prev,[opIdx]:choice}))}
                      style={{ padding:"11px 8px",borderRadius:10,border:"2px solid",cursor:"pointer",
                        textAlign:"center",fontWeight:sel?700:400,fontSize:13,
                        borderColor:sel?"#C9A84C":"#1A221A",
                        background:sel?"#C9A84C18":"#0D120D",
                        color:sel?"#C9A84C":"#8AA080" }}>
                      {sel?"✓ ":""}{choice}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div style={{ marginTop:8,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            {!isHandroll&&(
              <span style={{ color:"#354035",fontSize:12 }}>Cambios opcionales · máx. {settings.maxCambios}</span>
            )}
            {!isHandroll&&(
              <span style={{ color:cambios.length>0?"#C9A84C":"#354035",fontSize:12,fontWeight:700 }}>
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
                  <div style={{ color:"#3A5A3A",fontSize:11,letterSpacing:1,marginBottom:6 }}>OPCIÓN RÁPIDA</div>
                  <button onClick={()=>{
                    if(sel){setCambios(cambios.filter(c=>c.id!==customizations.soloPollo.id));return;}
                    if(!canAdd) return;
                    setCambios([...cambios,customizations.soloPollo]);
                  }}
                    style={{ width:"100%",padding:"12px 16px",borderRadius:10,border:"2px solid",
                      cursor:!sel&&!canAdd?"not-allowed":"pointer",textAlign:"left",
                      borderColor:sel?"#C9A84C":"#2A4A2A",background:sel?"#C9A84C14":"#0D1A0D",
                      opacity:!sel&&!canAdd?0.4:1,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                    <div>
                      <span style={{ fontSize:14,fontWeight:700,color:sel?"#C9A84C":"#80C060" }}>
                        {sel?"✓ ":""}{customizations.soloPollo.nombre}
                      </span>
                      <div style={{ fontSize:11,color:"#405040",marginTop:2 }}>
                        Cambia el relleno de toda la promo a solo pollo
                      </div>
                    </div>
                    <span style={{ color:"#C9A84C",fontWeight:700,fontSize:15,whiteSpace:"nowrap",marginLeft:12 }}>
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
                {customizations.salsas.map(s=>{
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
                          if(c.id===customizations.soloPollo.id){setCambios(cambios.filter(x=>x.id!==c.id));}
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

