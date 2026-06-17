export const fmt = (n) => `$${n.toLocaleString("es-CL")}`;

export const uid = () =>
  `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

export const timeAgo = (iso) => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${m > 0 ? ` ${m}m` : ""}`;
};
