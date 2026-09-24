import { useEffect, useState } from "react";

// Mensaje breve de confirmación o error en las pantallas del panel.
export function useFlash() {
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    if (!msg) return;
    const id = setTimeout(() => setMsg(null), 3500);
    return () => clearTimeout(id);
  }, [msg]);
  const node = msg && (
    <div className={`flash flash--${msg.type}`} role="status">
      {msg.text}
    </div>
  );
  return [node, (text, type = "ok") => setMsg({ text, type })];
}
