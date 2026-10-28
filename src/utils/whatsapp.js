// Directo a api.whatsapp.com: la redirección de wa.me cambia los emojis de
// 4 bytes (🍣) por "�". En el teléfono abre la app igual que wa.me.
export function waLink(num, text = "") {
  const clean = String(num ?? "").replace(/\D/g, "");
  return `https://api.whatsapp.com/send?phone=${clean}${text ? `&text=${encodeURIComponent(text)}` : ""}`;
}
