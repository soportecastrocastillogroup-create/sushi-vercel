import { useEffect, useState } from "react";
import { Link, Navigate, useOutletContext } from "react-router";
import { useAuth } from "../context/auth-context.js";
import { usePageTitle } from "../hooks/usePageTitle.js";
import { changeMyPassword, fetchMyOrders, updateMyCustomer } from "../services/customers.js";
import { fmt } from "../utils/format.js";
import { formatFecha, rangoBloque } from "../utils/dates.js";

// Estados del pedido como los ve el cliente.
const ESTADO_CLIENTE = {
  abierto: "Recibido",
  en_proceso: "En preparación",
  listo: "Listo",
  completado: "Entregado",
};
const estadoLabel = (o) => (o.estado === "completado" && o.tipo === "retiro" ? "Retirado" : ESTADO_CLIENTE[o.estado] ?? o.estado);

const datosDe = (c) => ({
  nombre: c.nombre,
  telefono: c.telefono,
  direccion: c.direccion,
  acepta_marketing: c.acepta_marketing,
});

function Pedidos() {
  const { timeSlots } = useOutletContext();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchMyOrders()
      .then((o) => !cancelled && setOrders(o))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p className="login__error">{error}</p>;
  if (!orders) return <p className="account__muted">Cargando tus pedidos…</p>;
  if (orders.length === 0) {
    return (
      <p className="account__muted">
        Todavía no tienes pedidos. <Link to="/carta" className="text-link">Ve la carta</Link> y arma el primero.
      </p>
    );
  }
  return (
    <ul className="account-orders">
      {orders.map((o) => (
        <li key={o.id} className={`account-order account-order--${o.estado}`}>
          <div className="account-order__top">
            <strong>Pedido {o.order_number}</strong>
            <span className="account-order__estado">{estadoLabel(o)}</span>
          </div>
          <p className="account__muted">
            {formatFecha(o.fecha)} · {rangoBloque(o.horario, timeSlots)} · {o.sucursal} · {o.tipo === "delivery" ? "Delivery" : "Retiro"}
          </p>
          <p className="account-order__items">
            {o.order_items.map((i) => `${i.qty}× ${i.nombre}${i.opciones_str ? ` (${i.opciones_str})` : ""}`).join(" · ")}
          </p>
          <p className="account-order__total">{fmt(o.total)}</p>
        </li>
      ))}
    </ul>
  );
}

function Datos({ customer, onSaved }) {
  const [form, setForm] = useState(() => datosDe(customer));
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await updateMyCustomer(form);
      await onSaved();
      setMsg({ ok: true, text: "Datos guardados." });
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <p className="account__muted">
        Correo: <strong>{customer.email}</strong>. Para cambiarlo, escríbenos por WhatsApp.
      </p>
      <label className="field">
        <span>Nombre</span>
        <input value={form.nombre} onChange={set("nombre")} required />
      </label>
      <label className="field">
        <span>Teléfono (WhatsApp)</span>
        <input type="tel" value={form.telefono} onChange={set("telefono")} required />
      </label>
      <label className="field">
        <span>Dirección para delivery</span>
        <input value={form.direccion} onChange={set("direccion")} />
      </label>
      <label className="check-line">
        <input type="checkbox" checked={form.acepta_marketing} onChange={set("acepta_marketing")} />
        <span>Acepto recibir novedades y promociones por correo.</span>
      </label>
      {msg && <p className={msg.ok ? "account__ok" : "login__error"}>{msg.text}</p>}
      <button type="submit" className="btn btn--primary" disabled={busy}>
        {busy ? "Guardando…" : "Guardar datos"}
      </button>
    </form>
  );
}

function Password() {
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (pass.length < 8) return setMsg({ ok: false, text: "La contraseña debe tener al menos 8 caracteres." });
    if (pass !== pass2) return setMsg({ ok: false, text: "Las contraseñas no coinciden." });
    setBusy(true);
    setMsg(null);
    try {
      await changeMyPassword(pass);
      setPass("");
      setPass2("");
      setMsg({ ok: true, text: "Contraseña cambiada." });
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <label className="field">
        <span>Contraseña nueva</span>
        <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="new-password" />
      </label>
      <label className="field">
        <span>Repite la contraseña</span>
        <input type="password" value={pass2} onChange={(e) => setPass2(e.target.value)} autoComplete="new-password" />
      </label>
      {msg && <p className={msg.ok ? "account__ok" : "login__error"}>{msg.text}</p>}
      <button type="submit" className="btn btn--ghost" disabled={busy || !pass}>
        {busy ? "Cambiando…" : "Cambiar contraseña"}
      </button>
    </form>
  );
}

export default function MiCuentaPage() {
  usePageTitle("Mi cuenta · Sushi Loncoche");
  const auth = useAuth();

  if (auth.loading) {
    return (
      <div className="page-state" role="status">
        <span className="spinner" aria-hidden="true" />
      </div>
    );
  }
  if (!auth.customer) return <Navigate to="/ingresar" replace state={{ from: "/mi-cuenta" }} />;

  return (
    <div className="account">
      <div className="account__head">
        <div>
          <p className="page-head__kicker">Mi cuenta</p>
          <h1 className="page-head__title">Hola, {auth.customer.nombre.split(" ")[0] || "Sushero"}</h1>
        </div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={auth.signOut}>
          Cerrar sesión
        </button>
      </div>
      <section className="account__card">
        <h2>Mis pedidos</h2>
        <Pedidos />
        <Link to="/carta" className="btn btn--primary">
          Hacer un pedido
        </Link>
      </section>
      <section className="account__card">
        <h2>Mis datos</h2>
        <Datos customer={auth.customer} onSaved={auth.refreshProfile} />
      </section>
      <section className="account__card">
        <h2>Contraseña</h2>
        <Password />
      </section>
    </div>
  );
}
