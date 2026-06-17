export default function GlobalStyles() {
  return (
    <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&family=Crimson+Pro:ital,wght@0,400;0,600;1,400&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans',system-ui,sans-serif}
        select option{background:#141914;color:#F0EBE0}
        ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:#0A0D0A}
        ::-webkit-scrollbar-thumb{background:#252F28;border-radius:2px}
        input::placeholder,textarea::placeholder{color:#354035}
        select{font-family:'DM Sans',system-ui,sans-serif}
      `}</style>
  );
}
