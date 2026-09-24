import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useCart } from "../../context/cart-context.js";
import { fmt } from "../../utils/format.js";
import { waLink } from "../../utils/whatsapp.js";
import { buildOrderMessage } from "../../utils/whatsappOrder.js";
import { CloseIcon, WhatsAppIcon } from "./Icons.jsx";

export default function CartDrawer({ branch, branches, onBranchChange, costoDelivery, whatsappNum, horario }) {
  const cart = useCart();
  const [tipo, setTipo] = useState("retiro");
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [comentarios, setComentarios] = useState("");
  const [sent, setSent] = useState(false);

  const { open, setOpen } = cart;

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, setOpen]);

  if (!open) return null;

  const despacho = tipo === "delivery" ? costoDelivery || 0 : 0;
  const total = cart.subtotal + despacho;
  const ready =
    cart.count > 0 && nombre.trim().length > 1 && (tipo === "retiro" || direccion.trim().length > 3) && whatsappNum;

  const send = () => {
    const text = buildOrderMessage({ items: cart.items, branch, tipo, nombre, direccion, comentarios, costoDelivery });
    window.open(waLink(whatsappNum, text), "_blank", "noopener");
    setSent(true);
  };

  const finish = () => {
    cart.clear();
    setSent(false);
    setComentarios("");
    setOpen(false);
  };

  return (
    <div className="drawer drawer--cart" role="dialog" aria-modal="true" aria-label="Tu pedido">
      <button type="button" className="drawer__backdrop" aria-label="Cerrar" onClick={() => setOpen(false)} />
      <div className="drawer__panel cart">
        <div className="drawer__top">
          <h2 className="cart__title">Tu pedido</h2>
          <button type="button" className="icon-btn" aria-label="Cerrar" onClick={() => setOpen(false)}>
            <CloseIcon />
          </button>
        </div>

        {cart.count === 0 ? (
          <div className="cart__empty">
            <p>Tu carrito está vacío.</p>
            <Link to="/carta" className="btn btn--primary" onClick={() => setOpen(false)}>
              Ver la carta
            </Link>
          </div>
        ) : sent ? (
          <div className="cart__empty">
            <p className="cart__sent-title">Abrimos WhatsApp con tu pedido</p>
            <p>
              Envía el mensaje para que el equipo lo confirme. Si WhatsApp no se abrió, vuelve a intentarlo.
            </p>
            <button type="button" className="btn btn--primary" onClick={finish}>
              Listo, ya lo envié
            </button>
            <button type="button" className="btn btn--ghost" onClick={send}>
              Abrir WhatsApp otra vez
            </button>
          </div>
        ) : (
          <>
            <div className="cart__scroll">
              <ul className="cart__items">
                {cart.items.map((i) => (
                  <li key={i.key} className="cart-item">
                    <div className="cart-item__info">
                      <p className="cart-item__name">{i.nombre}</p>
                      {i.opciones.length > 0 && <p className="cart-item__opts">{i.opciones.join(" · ")}</p>}
                      <p className="cart-item__price">{fmt(i.precio * i.qty)}</p>
                    </div>
                    <div className="stepper" aria-label={`Cantidad de ${i.nombre}`}>
                      <button type="button" aria-label="Quitar uno" onClick={() => cart.setQty(i.key, i.qty - 1)}>
                        −
                      </button>
                      <span>{i.qty}</span>
                      <button type="button" aria-label="Agregar uno" onClick={() => cart.setQty(i.key, i.qty + 1)}>
                        +
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <fieldset className="field">
                <legend>Sucursal</legend>
                <div className="seg">
                  {branches.map((b) => (
                    <button
                      key={b}
                      type="button"
                      className={b === branch ? "is-active" : ""}
                      aria-pressed={b === branch}
                      onClick={() => onBranchChange(b)}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="field">
                <legend>Tipo de pedido</legend>
                <div className="seg">
                  {[
                    ["retiro", "Retiro en local"],
                    ["delivery", "Delivery"],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={tipo === id ? "is-active" : ""}
                      aria-pressed={tipo === id}
                      onClick={() => setTipo(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="field">
                <span>Nombre</span>
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" />
              </label>

              {tipo === "delivery" && (
                <label className="field">
                  <span>Dirección de entrega</span>
                  <input
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    placeholder="Calle y número"
                    autoComplete="street-address"
                  />
                </label>
              )}

              <label className="field">
                <span>Comentarios (opcional)</span>
                <textarea
                  rows={2}
                  value={comentarios}
                  onChange={(e) => setComentarios(e.target.value)}
                  placeholder="Horario de retiro, cambios, sabor de handroll…"
                />
              </label>
            </div>

            <div className="cart__footer">
              <div className="cart__row">
                <span>Subtotal</span>
                <span>{fmt(cart.subtotal)}</span>
              </div>
              {despacho > 0 && (
                <div className="cart__row">
                  <span>Despacho</span>
                  <span>{fmt(despacho)}</span>
                </div>
              )}
              <div className="cart__row cart__row--total">
                <span>Total</span>
                <span>{fmt(total)}</span>
              </div>
              <button type="button" className="btn btn--primary btn--block" disabled={!ready} onClick={send}>
                <WhatsAppIcon /> Enviar pedido por WhatsApp
              </button>
              <p className="cart__note">
                El pedido queda confirmado cuando el equipo te responde. Atención: {horario}.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
