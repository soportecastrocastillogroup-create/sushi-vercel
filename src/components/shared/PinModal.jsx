import { useState } from "react";

// ── PIN MODAL ────────────────────────────────────────────────────────────────
export default function PinModal({ target, onSuccess, onClose, settings }) {
  const [p,setP]=useState(""); const [err,setErr]=useState(false);
  const exp = target==="admin" ? settings.adminPin : target==="kitchen" ? settings.kitchenPin : settings.reportesPin;
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

