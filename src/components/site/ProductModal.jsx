import { useEffect, useState } from "react";
import { fmt } from "../../utils/format.js";
import { CloseIcon } from "./Icons.jsx";
import ProductArt from "./ProductArt.jsx";

export default function ProductModal({ product, onClose, onAdd }) {
  const [qty, setQty] = useState(1);
  const [choices, setChoices] = useState(() => (product.opciones || []).map((o) => o.choices[0]));

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const confirm = () => {
    const opciones = (product.opciones || []).map((o, i) => `${o.label}: ${choices[i]}`);
    onAdd(product, { qty, opciones });
    onClose();
  };

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={product.nombre}>
      <button type="button" className="drawer__backdrop" aria-label="Cerrar" onClick={onClose} />
      <div className="modal__panel">
        <button type="button" className="icon-btn modal__close" aria-label="Cerrar" onClick={onClose}>
          <CloseIcon />
        </button>
        <div className="modal__art">
          <ProductArt product={product} />
        </div>
        <div className="modal__body">
          <p className="modal__cat">{product.cat}</p>
          <h2 className="modal__name">{product.nombre}</h2>
          {product.piezas ? <p className="modal__meta">{product.piezas} {product.piezas === 1 ? "unidad" : "piezas"}</p> : null}
          {product.desc && <p className="modal__desc">{product.desc}</p>}

          {product.rolls?.length > 0 && (
            <ul className="modal__rolls">
              {product.rolls.map((r, i) => (
                <li key={i}>
                  <strong>{r.envoltura}</strong> · {r.relleno}
                </li>
              ))}
            </ul>
          )}

          {(product.opciones || []).map((o, i) => (
            <fieldset key={o.label} className="field">
              <legend>{o.label}</legend>
              <div className="seg">
                {o.choices.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={choices[i] === c ? "is-active" : ""}
                    aria-pressed={choices[i] === c}
                    onClick={() => setChoices((prev) => prev.map((p, j) => (j === i ? c : p)))}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}

          <div className="modal__actions">
            <div className="stepper stepper--lg" aria-label="Cantidad">
              <button type="button" aria-label="Quitar uno" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                −
              </button>
              <span>{qty}</span>
              <button type="button" aria-label="Agregar uno" onClick={() => setQty((q) => q + 1)}>
                +
              </button>
            </div>
            <button type="button" className="btn btn--primary btn--block" onClick={confirm}>
              Agregar {fmt(product.precio * qty)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
