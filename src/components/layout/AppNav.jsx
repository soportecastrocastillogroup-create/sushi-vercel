export default function AppNav({ view, nav, onNavigate }) {
  return (
    <div style={{ borderBottom:"1px solid #141914",position:"sticky",top:0,background:"#0A0D0A",zIndex:50 }}>
      <div style={{ maxWidth:720,margin:"0 auto",padding:"0 16px",
        display:"flex",alignItems:"center",justifyContent:"space-between",height:52 }}>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          <span style={{ fontSize:20 }}>🍣</span>
          <span style={{ fontFamily:"'Crimson Pro',serif",fontSize:18,fontWeight:600,
            color:"#D8E8C8",letterSpacing:0.3 }}>Sushi Loncoche</span>
        </div>
        <div style={{ display:"flex",gap:2 }}>
          {nav.map(item=>(
            <button key={item.id} onClick={()=>onNavigate(item.id)}
              style={{ padding:"6px 10px",borderRadius:8,border:"none",cursor:"pointer",
                fontSize:11,fontWeight:600,fontFamily:"'DM Sans',sans-serif",
                background:view===item.id?"#C9A84C18":"transparent",
                color:view===item.id?"#C9A84C":"#405040",transition:"all 0.15s" }}>
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
