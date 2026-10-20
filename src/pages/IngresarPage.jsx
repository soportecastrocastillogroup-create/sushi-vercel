import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router";
import { useAuth } from "../context/auth-context.js";
import { BrandLogo } from "../components/site/Brand.jsx";
import { usePageTitle } from "../hooks/usePageTitle.js";
import { useSettings } from "../hooks/useSettings.js";
import { waLink } from "../utils/whatsapp.js";

// Ingreso de clientes (PRD 02 · 5.5). El del equipo sigue en /login.
export default function IngresarPage() {
  usePageTitle("Ingresar · Sushi Loncoche");
  const auth = useAuth();
  const location = useLocation();
  const { settings } = useSettings();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!auth.loading && auth.customer) {
    return <Navigate to={location.state?.from ?? "/carta"} replace />;
  }
  const staffOnly = !auth.loading && auth.session && !auth.customer;

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const err = await auth.signIn(email, password);
    if (err) setError(err);
    setBusy(false);
  };

  const olvido = waLink(
    settings?.whatsappNum,
    `Hola, olvidé mi contraseña de la cuenta de Sushi Loncoche. Mi correo es ${email.trim() || "…"}`
  );

  return (
    <div className="login">
      <div className="login__card">
        <Link to="/" className="login__logo" aria-label="Volver al sitio">
          <BrandLogo />
        </Link>
        <h1 className="login__title">Ingresar</h1>
        <p className="login__sub">Entra con tu cuenta para armar tu pedido.</p>

        {staffOnly ? (
          <div className="login__alert" role="alert">
            <p>Esta es una cuenta del equipo, no de cliente.</p>
            {auth.profile?.active && (
              <Link to="/panel" className="btn btn--primary btn--block">
                Ir al panel
              </Link>
            )}
            <button type="button" className="btn btn--ghost btn--block" onClick={auth.signOut}>
              Cerrar sesión
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <label className="field">
              <span>Correo</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" autoFocus required />
            </label>
            <label className="field">
              <span>Contraseña</span>
              <div className="login__pass">
                <input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button type="button" onClick={() => setShow((s) => !s)} aria-pressed={show}>
                  {show ? "Ocultar" : "Ver"}
                </button>
              </div>
            </label>
            {error && (
              <p className="login__error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="btn btn--primary btn--block" disabled={busy || !email || !password}>
              {busy ? "Ingresando…" : "Ingresar"}
            </button>
            <p className="login__help">
              ¿No tienes cuenta? <Link to="/registro">Créala aquí</Link>
            </p>
            <p className="login__help">
              ¿Olvidaste tu contraseña?{" "}
              <a href={olvido} target="_blank" rel="noreferrer">
                Escríbenos por WhatsApp
              </a>{" "}
              y te ayudamos.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
