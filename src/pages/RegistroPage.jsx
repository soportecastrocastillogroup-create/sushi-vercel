import { useState } from "react";
import { Link, Navigate } from "react-router";
import { useAuth } from "../context/auth-context.js";
import { BrandLogo } from "../components/site/Brand.jsx";
import { usePageTitle } from "../hooks/usePageTitle.js";
import { EMAIL_RE, normalizeEmail, signUpCustomer } from "../services/customers.js";

const empty = {
  nombre: "",
  email: "",
  password: "",
  telefono: "",
  direccion: "",
  acepta_marketing: false,
};

// Registro de clientes (PRD 02 · 5.5). Sin confirmación por correo: la cuenta
// queda lista al tiro, por eso se muestra el correo en grande al terminar.
export default function RegistroPage() {
  usePageTitle("Crear cuenta · Sushi Loncoche");
  const auth = useAuth();
  const [form, setForm] = useState(empty);
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");

  if (!done && !auth.loading && auth.customer) return <Navigate to="/mi-cuenta" replace />;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const email = normalizeEmail(form.email);
  const valid = form.nombre.trim().length > 1 && EMAIL_RE.test(email) && form.password.length >= 8 && form.telefono.trim().length >= 8;

  const submit = async (e) => {
    e.preventDefault();
    if (busy || !valid) return;
    setBusy(true);
    setError("");
    try {
      await signUpCustomer(form);
      setDone(email);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <div className="login__card">
        <Link to="/" className="login__logo" aria-label="Volver al sitio">
          <BrandLogo />
        </Link>
        {done ? (
          <div className="login__alert" role="status">
            <h1 className="login__title">¡Listo!</h1>
            <p>Tu cuenta es</p>
            <p className="signup-email">{done}</p>
            <p>Revisa que esté bien escrito: con ese correo vas a ingresar.</p>
            <Link to="/carta" className="btn btn--primary btn--block">
              Ir a la carta
            </Link>
          </div>
        ) : (
          <>
            <h1 className="login__title">Crear cuenta</h1>
            <p className="login__sub">Arma tu pedido, elige horario y síguelo desde aquí.</p>
            <form onSubmit={submit} noValidate>
              <label className="field">
                <span>Nombre</span>
                <input value={form.nombre} onChange={set("nombre")} autoComplete="name" required />
              </label>
              <label className="field">
                <span>Correo</span>
                <input type="email" value={form.email} onChange={set("email")} autoComplete="email" required />
              </label>
              <label className="field">
                <span>Contraseña (mínimo 8 caracteres)</span>
                <div className="login__pass">
                  <input
                    type={show ? "text" : "password"}
                    value={form.password}
                    onChange={set("password")}
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                  <button type="button" onClick={() => setShow((s) => !s)} aria-pressed={show}>
                    {show ? "Ocultar" : "Ver"}
                  </button>
                </div>
              </label>
              <label className="field">
                <span>Teléfono (WhatsApp)</span>
                <input type="tel" value={form.telefono} onChange={set("telefono")} autoComplete="tel" placeholder="+56 9 …" required />
              </label>
              <label className="field">
                <span>Dirección para delivery (opcional)</span>
                <input value={form.direccion} onChange={set("direccion")} autoComplete="street-address" placeholder="Calle y número" />
              </label>
              <label className="check-line">
                <input type="checkbox" checked={form.acepta_marketing} onChange={set("acepta_marketing")} />
                <span>Acepto recibir novedades y promociones por correo.</span>
              </label>
              {error && (
                <p className="login__error" role="alert">
                  {error}
                </p>
              )}
              <button type="submit" className="btn btn--primary btn--block" disabled={busy || !valid}>
                {busy ? "Creando cuenta…" : "Crear cuenta"}
              </button>
              <p className="login__help">
                ¿Ya tienes cuenta? <Link to="/ingresar">Ingresa aquí</Link>
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
