// Logo provisional de SUSHI LONCOCHE, redibujado a partir de la captura de
// agents/identity/logo.jpeg. Reemplazar por el archivo oficial cuando el
// cliente lo entregue (PRD 01, pendientes).

export function BrandMark({ size = 28, className = "" }) {
  return (
    <svg
      className={className}
      width={size * 1.25}
      height={size}
      viewBox="0 0 40 32"
      aria-hidden="true"
    >
      <circle cx="17" cy="17" r="13" fill="var(--brand-red)" />
      <path d="M9 29 38 3" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M14 30.5 39.5 8" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function BrandLogo({ size = "md" }) {
  return (
    <span className={`brand-logo brand-logo--${size}`}>
      <span className="brand-logo__word">SUSHI LONCOCHE</span>
      <BrandMark className="brand-logo__mark" />
    </span>
  );
}
