import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useCart } from "../../context/cart-context.js";
import { useAuth } from "../../context/auth-context.js";
import { fmt } from "../../utils/format.js";
import { waLink } from "../../utils/whatsapp.js";
import { buildAccountOrderMessage } from "../../utils/whatsappOrder.js";
import { formatFecha, getFechasDisponibles } from "../../utils/dates.js";
import { PAGOS, pagoLabel } from "../../constants/estados.js";
import { createCustomerOrder, fetchAvailableBlocks, fetchUnlockedDates } from "../../services/customers.js";
import { CloseIcon, WhatsAppIcon } from "./Icons.jsx";

// "aprox. a las 18:35" si el pedido sale apenas esté listo; "para las 20:00"
// si se eligió un bloque más tarde (la base pone la hora: available_blocks).
const cuando = (horario, aprox) => (aprox ? `aprox. a las ${horario}` : `para las ${horario}`);

// El pedido con cuenta es solo para hoy (es comida): { iso, abierto }, o null
// mientras se cargan los días desbloqueados.
function useHoy(blockedWeekdays) {
  const [unlocked, setUnlocked] = useState(null);
  useEffect(() => {
    let cancelled = false;
    fetchUnlockedDates()
      .then((d) => !cancelled && setUnlocked(d))
      .catch(() => !cancelled && setUnlocked([]));
    return () => {
      cancelled = true;
    };
  }, []);
  if (!unlocked) return null;
  const [hoy] = getFechasDisponibles(unlocked, blockedWeekdays ?? []);
  return { iso: hoy.iso, abierto: !hoy.bloqueado };
}

// Bloques del día con su cupo y la hora que tendría el pedido (sin ver los
// pedidos): [{ bloque, fin, horario, disponible, label, aprox }].
const conLabel = (bloques) =>
  bloques.map((b) => ({ ...b, label: b.fin ? `${b.bloque} – ${b.fin}` : b.bloque, aprox: b.horario !== b.bloque }));

function useBloques(branch, fecha, version) {
  const [state, setState] = useState({ key: "", slots: null });
  const key = `${branch}|${fecha}|${version}`;
  useEffect(() => {
    if (!branch || !fecha) return;
    let cancelled = false;
    fetchAvailableBlocks(branch, fecha)
      .then((s) => !cancelled && setState({ key, slots: conLabel(s) }))
      .catch(() => !cancelled && setState({ key, slots: [] }));
    return () => {
      cancelled = true;
    };
  }, [branch, fecha, key]);
  return state.key === key ? state.slots : null;
}

function Checkout({ customer, cart, branch, branches, onBranchChange, costoDelivery, whatsappNum, blockedWeekdays, onDone }) {
  const hoy = useHoy(blockedWeekdays);
  const [tipo, setTipo] = useState("retiro");
  const [horario, setHorario] = useState("");
  const [version, setVersion] = useState(0);
  const [nombre, setNombre] = useState(customer.nombre);
  const [telefono, setTelefono] = useState(customer.telefono);
  const [direccion, setDireccion] = useState(customer.direccion);
  const [referencia, setReferencia] = useState(customer.referencia);
  const [metodoPago, setMetodoPago] = useState("transferencia");
  const [comentarios, setComentarios] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const fecha = hoy?.abierto ? hoy.iso : "";
  const slots = useBloques(branch, fecha, version);
  const libres = (slots ?? []).filter((s) => s.disponible);
  // Preseleccionado: el primer bloque con cupo (el actual, si tiene espacio).
  const elegido = libres.find((s) => s.bloque === horario) ?? libres[0] ?? null;
  const horarioOk = elegido?.bloque ?? "";
  const pago = metodoPago;
  const despacho = tipo === "delivery" ? costoDelivery || 0 : 0;

  const ready =
    cart.count > 0 &&
    fecha &&
    horarioOk &&
    nombre.trim().length > 1 &&
    telefono.trim().length >= 8 &&
    (tipo === "retiro" || direccion.trim().length > 3);

  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    // WhatsApp se abre solo al guardar: la ventana se abre ahora, dentro del
    // toque, porque los navegadores bloquean las que se abren después.
    const ventana = window.open("", "_blank");
    try {
      const order = await createCustomerOrder(
        {
          sucursal: branch,
          tipo,
          fecha,
          horario: horarioOk,
          metodoPago: pago,
          cliente: { nombre: nombre.trim(), telefono: telefono.trim() },
          direccion: tipo === "delivery" ? direccion.trim() : "",
          referencia: tipo === "delivery" ? referencia.trim() : "",
          observaciones: comentarios.trim(),
        },
        cart.items
      );
      // La base pone la hora: si no es el inicio del bloque, es la estimada.
      const aprox = order.horario !== horarioOk;
      const link = waLink(whatsappNum, buildAccountOrderMessage(order, pagoLabel(pago), aprox));
      if (ventana) ventana.location.href = link;
      onDone(order, pagoLabel(pago), aprox, Boolean(ventana));
    } catch (err) {
      ventana?.close();
      if (err.code === "SL409") {
        // El bloque se llenó: se recargan los cupos y se proponen los siguientes.
        const frescos = conLabel(await fetchAvailableBlocks(branch, fecha).catch(() => []));
        const propuestas = frescos.filter((b) => b.disponible && b.bloque > horarioOk).slice(0, 3);
        setError({ lleno: true, hora: elegido.label, propuestas });
        setHorario("");
        setVersion((v) => v + 1);
      } else {
        setError({ text: err.message || "No pudimos enviar tu pedido. Intenta nuevamente." });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
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
              <button key={b} type="button" className={b === branch ? "is-active" : ""} aria-pressed={b === branch} onClick={() => onBranchChange(b)}>
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
              <button key={id} type="button" className={tipo === id ? "is-active" : ""} aria-pressed={tipo === id} onClick={() => setTipo(id)}>
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend>Horario de hoy</legend>
          {!hoy || (hoy.abierto && !slots) ? (
            <p className="cart__hint">Cargando horarios…</p>
          ) : !hoy.abierto ? (
            <p className="cart__hint">Hoy no estamos recibiendo pedidos. Escríbenos por WhatsApp.</p>
          ) : libres.length === 0 ? (
            <p className="cart__hint">Ya no quedan horarios con cupo hoy. Escríbenos por WhatsApp.</p>
          ) : (
            <>
              <p className="cart__hint">{formatFecha(fecha)}</p>
              <div className="chips chips--slots">
                {slots.map((s) => (
                  <button
                    key={s.bloque}
                    type="button"
                    disabled={!s.disponible}
                    className={s.bloque === horarioOk ? "is-active" : ""}
                    aria-pressed={s.bloque === horarioOk}
                    title={s.disponible ? undefined : "Lleno"}
                    onClick={() => {
                      setHorario(s.bloque);
                      setError(null);
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              {elegido && <p className="cart__eta">Tu pedido estará listo {cuando(elegido.horario, elegido.aprox)}.</p>}
            </>
          )}
        </fieldset>

        <label className="field">
          <span>Nombre</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" />
        </label>
        <label className="field">
          <span>Teléfono</span>
          <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} autoComplete="tel" />
        </label>
        {tipo === "delivery" && (
          <>
            <label className="field">
              <span>Dirección de entrega</span>
              <input value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Calle y número" autoComplete="street-address" />
            </label>
            <label className="field">
              <span>Referencia (opcional)</span>
              <input value={referencia} onChange={(e) => setReferencia(e.target.value)} />
            </label>
          </>
        )}
        <fieldset className="field">
          <legend>Pago</legend>
          <div className="seg seg--stack">
            {PAGOS.map((p) => (
              <button key={p.id} type="button" className={pago === p.id ? "is-active" : ""} aria-pressed={pago === p.id} onClick={() => setMetodoPago(p.id)}>
                {p.label}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="field">
          <span>Comentarios (opcional)</span>
          <textarea rows={2} value={comentarios} onChange={(e) => setComentarios(e.target.value)} placeholder="Cambios, sabor de handroll…" />
        </label>
      </div>

      <div className="cart__footer">
        {error && (
          <div className="cart__error" role="alert">
            {error.lleno ? (
              <>
                <p>
                  Ese horario ({error.hora}) ya está lleno.
                  {error.propuestas.length ? " Te proponemos:" : " No quedan horarios más tarde hoy. Escríbenos por WhatsApp."}
                </p>
                {error.propuestas.length > 0 && (
                  <div className="chips">
                    {error.propuestas.map((b) => (
                      <button
                        key={b.bloque}
                        type="button"
                        onClick={() => {
                          setHorario(b.bloque);
                          setError(null);
                        }}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p>{error.text}</p>
            )}
          </div>
        )}
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
          <span>{fmt(cart.subtotal + despacho)}</span>
        </div>
        <button type="button" className="btn btn--primary btn--block" disabled={!ready || busy || !whatsappNum} onClick={submit}>
          {busy ? "Enviando…" : "Confirmar pedido"}
        </button>
        <p className="cart__note">Guardamos tu pedido y se abre WhatsApp con el resumen para que nos lo envíes.</p>
      </div>
    </>
  );
}

export default function CartDrawer({ branch, branches, onBranchChange, costoDelivery, whatsappNum, blockedWeekdays }) {
  const cart = useCart();
  const auth = useAuth();
  const [done, setDone] = useState(null); // { order, pago, aprox, abierto }

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

  const close = () => {
    setOpen(false);
    setDone(null);
  };
  const whatsapp = done ? waLink(whatsappNum, buildAccountOrderMessage(done.order, done.pago, done.aprox)) : "";

  return (
    <div className="drawer drawer--cart" role="dialog" aria-modal="true" aria-label="Tu pedido">
      <button type="button" className="drawer__backdrop" aria-label="Cerrar" onClick={close} />
      <div className="drawer__panel cart">
        <div className="drawer__top">
          <h2 className="cart__title">Tu pedido</h2>
          <button type="button" className="icon-btn" aria-label="Cerrar" onClick={close}>
            <CloseIcon />
          </button>
        </div>

        {!auth.customer ? (
          <div className="cart__empty">
            <p className="cart__sent-title">Crea tu cuenta para pedir aquí</p>
            <p>Con tu cuenta eliges el horario de hoy y sigues tu pedido. Si prefieres, pide directo por WhatsApp.</p>
            <Link to="/registro" className="btn btn--primary" onClick={close}>
              Crear cuenta
            </Link>
            <Link to="/ingresar" className="btn btn--ghost" onClick={close}>
              Ya tengo cuenta
            </Link>
            {whatsappNum && (
              <a className="btn btn--ghost" href={waLink(whatsappNum, "¡Hola Sushi Loncoche! Quiero hacer un pedido 🍣")} target="_blank" rel="noreferrer">
                <WhatsAppIcon /> Pedir por WhatsApp
              </a>
            )}
          </div>
        ) : done ? (
          <div className="cart__empty">
            <p className="cart__sent-title">¡Recibimos tu pedido {done.order.order_number}!</p>
            <p>
              {formatFecha(done.order.fecha)}, {cuando(done.order.horario, done.aprox)}, en {done.order.sucursal}. Total {fmt(done.order.total)}.
            </p>
            <p>
              {done.abierto
                ? "Abrimos WhatsApp con el resumen: tócalo para enviárnoslo. Si no se abrió, usa el botón."
                : "Envíanos el resumen por WhatsApp para coordinar el pago."}{" "}
              Puedes ver el estado en Mi cuenta.
            </p>
            <a className="btn btn--primary" href={whatsapp} target="_blank" rel="noreferrer">
              <WhatsAppIcon /> {done.abierto ? "Abrir WhatsApp de nuevo" : "Enviar por WhatsApp"}
            </a>
            <Link to="/mi-cuenta" className="btn btn--ghost" onClick={close}>
              Ver mis pedidos
            </Link>
          </div>
        ) : cart.count === 0 ? (
          <div className="cart__empty">
            <p>Tu carrito está vacío.</p>
            <Link to="/carta" className="btn btn--primary" onClick={close}>
              Ver la carta
            </Link>
          </div>
        ) : (
          <Checkout
            customer={auth.customer}
            cart={cart}
            branch={branch}
            branches={branches}
            onBranchChange={onBranchChange}
            costoDelivery={costoDelivery}
            whatsappNum={whatsappNum}
            blockedWeekdays={blockedWeekdays}
            onDone={(order, pago, aprox, abierto) => {
              cart.clear();
              setDone({ order, pago, aprox, abierto });
            }}
          />
        )}
      </div>
    </div>
  );
}
