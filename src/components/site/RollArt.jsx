// Ilustración vectorial de un roll para el hero. Es arte provisional hasta
// contar con fotografías propias (se reemplaza por la imagen del slide en la
// Etapa D).

const TOPPINGS = {
  salmon: { outer: "#F47C5A", stripe: "#FFB199" },
  avocado: { outer: "#8DBB4E", stripe: "#C3E08A" },
  tempura: { outer: "#D99A3E", stripe: "#F2C879" },
};

// Granos de arroz en posiciones deterministas para que el SVG no cambie entre
// renders.
const GRAINS = Array.from({ length: 70 }, (_, i) => {
  const a = (i * 137.508 * Math.PI) / 180;
  const r = 118 + ((i * 29) % 34);
  return {
    x: 200 + Math.cos(a) * r,
    y: 200 + Math.sin(a) * r,
    rot: (i * 47) % 180,
  };
});

export default function RollArt({ variant = "salmon", className = "" }) {
  const t = TOPPINGS[variant] ?? TOPPINGS.salmon;
  const stripes = Array.from({ length: 16 }, (_, i) => i * 22.5);

  return (
    <svg className={className} viewBox="0 0 400 400" aria-hidden="true">
      <defs>
        <radialGradient id={`shade-${variant}`} cx="40%" cy="35%" r="75%">
          <stop offset="60%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.35" />
        </radialGradient>
      </defs>

      {/* Cobertura exterior */}
      <circle cx="200" cy="200" r="186" fill={t.outer} />
      {stripes.map((deg) => (
        <path
          key={deg}
          d="M200 200 Q246 110 200 16"
          stroke={t.stripe}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          opacity="0.5"
          transform={`rotate(${deg} 200 200)`}
        />
      ))}
      <circle cx="200" cy="200" r="186" fill={`url(#shade-${variant})`} />

      {/* Arroz */}
      <circle cx="200" cy="200" r="156" fill="#F6F2EA" />
      {GRAINS.map((g, i) => (
        <ellipse
          key={i}
          cx={g.x}
          cy={g.y}
          rx="7"
          ry="3.2"
          fill="#E4DDD0"
          transform={`rotate(${g.rot} ${g.x} ${g.y})`}
        />
      ))}

      {/* Nori */}
      <circle cx="200" cy="200" r="104" fill="#1C221C" />
      <circle cx="200" cy="200" r="96" fill="#F6F2EA" />

      {/* Relleno */}
      <circle cx="172" cy="184" r="44" fill="#FFF6E4" />
      <circle cx="232" cy="176" r="40" fill="#FF8762" />
      <path d="M232 150 q14 14 0 28 q-14 14 0 28" stroke="#FFC2AD" strokeWidth="5" fill="none" strokeLinecap="round" />
      <circle cx="206" cy="238" r="36" fill="#6FA83E" />
      <circle cx="206" cy="238" r="20" fill="#9CCB5E" />
    </svg>
  );
}
