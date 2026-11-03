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
      {/* Dos palillos que se cruzan levemente cerca del extremo inferior. */}
      <path d="M11 30 39 6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M13 29.5 34 4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
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
