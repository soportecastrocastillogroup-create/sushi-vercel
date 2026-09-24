import { useEffect, useRef, useState } from "react";
import { PinIcon } from "./Icons.jsx";

// Selector de sucursal del header, equivalente al selector de ciudad de la
// referencia. Define qué productos se muestran en la carta.
export default function BranchSelect({ branches, value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!branches.length) return null;

  return (
    <div className="branch-select" ref={ref}>
      <button
        type="button"
        className="branch-select__btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <PinIcon width={18} height={18} />
        {value}
        <span className="branch-select__caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <ul className="branch-select__menu" role="listbox" aria-label="Sucursal">
          {branches.map((b) => (
            <li key={b}>
              <button
                type="button"
                role="option"
                aria-selected={b === value}
                className={b === value ? "is-active" : ""}
                onClick={() => {
                  onChange(b);
                  setOpen(false);
                }}
              >
                {b}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
