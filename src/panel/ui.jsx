import { useEffect, useRef, useState } from "react";
import { uploadImage } from "../services/cms.js";

export function Dialog({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="drawer__backdrop" aria-label="Cerrar" onClick={onClose} />
      <div className={`panel-dialog${wide ? " panel-dialog--wide" : ""}`}>
        <h2 className="panel-dialog__title">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="panel-tabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          className={value === t.id ? "is-active" : ""}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle__track" aria-hidden="true" />
      <span>{label}</span>
    </label>
  );
}

// Sube la imagen apenas se elige (comprimida a WebP) y entrega la URL pública.
export function ImagePicker({ bucket, value, onChange, maxSize = 1200, placeholder, aspect = "1" }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      onChange(await uploadImage(bucket, file, maxSize));
    } catch (err) {
      setError(err.message || "No pudimos subir la imagen.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="image-picker">
      <div className="image-picker__preview" style={{ aspectRatio: aspect }}>
        {value ? <img src={value} alt="" /> : placeholder}
        {busy && (
          <span className="image-picker__busy">
            <span className="spinner" aria-hidden="true" /> Subiendo…
          </span>
        )}
      </div>
      <div className="image-picker__actions">
        <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => input.current?.click()}>
          {value ? "Cambiar foto" : "Subir foto"}
        </button>
        {value && (
          <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => onChange(null)}>
            Quitar
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={pick} />
      {error && <p className="login__error">{error}</p>}
    </div>
  );
}
