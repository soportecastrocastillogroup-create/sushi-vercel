import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router";
import { useAuth } from "../context/auth-context.js";
import { BrandLogo } from "../components/site/Brand.jsx";
import { usePageTitle } from "../hooks/usePageTitle.js";

export default function LoginPage() {
  usePageTitle("Acceso equipo · Sushi Loncoche");
  const auth = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!auth.loading && auth.profile?.active) {
    return <Navigate to={location.state?.from ?? "/panel"} replace />;
  }

  const noAccess = !auth.loading && auth.session && !auth.profile?.active;

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const err = await auth.signIn(email, password);
    if (err) setError(err);
    setBusy(false);
  };

  return (
    <div className="login">
      <div className="login__card">
        <Link to="/" className="login__logo" aria-label="Volver al sitio">
          <BrandLogo />
        </Link>
        <h1 className="login__title">Acceso equipo</h1>
        <p className="login__sub">Ingresa con la cuenta que te entregó el administrador.</p>

        {noAccess ? (
          <div className="login__alert" role="alert">
            <p>Tu cuenta no tiene acceso al panel o está desactivada.</p>
            <button type="button" className="btn btn--ghost btn--block" onClick={auth.signOut}>
              Cerrar sesión
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <label className="field">
              <span>Correo</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                autoFocus
                required
              />
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
            <p className="login__help">¿Olvidaste tu contraseña? Pídele a un administrador que la restablezca.</p>
          </form>
        )}
      </div>
    </div>
  );
}
