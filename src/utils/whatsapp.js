export function waLink(num, text = "") {
  const clean = String(num ?? "").replace(/\D/g, "");
  return `https://wa.me/${clean}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
