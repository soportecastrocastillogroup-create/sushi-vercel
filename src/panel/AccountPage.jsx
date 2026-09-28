import { useState } from "react";
import { useAuth } from "../context/auth-context.js";
import { changeOwnPassword } from "../services/staff.js";

export default function AccountPage() {
  const auth = useAuth();
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (pass.length < 8) return setError("Usa al menos 8 caracteres.");
    if (pass !== confirm) return setError("Las contraseñas no coinciden.");
    setBusy(true);
    try {
      await changeOwnPassword(pass);
      await auth.refreshProfile();
      setDone(true);
      setPass("");
      setConfirm("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel-page panel-page--narrow">
      <h1 className="panel-title">Cambiar contraseña</h1>
      <p className="panel-muted">La nueva contraseña reemplaza a la actual en todos tus dispositivos.</p>
      <form className="panel-card" onSubmit={submit}>
        <label className="field">
          <span>Nueva contraseña</span>
          <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="new-password" />
        </label>
        <label className="field">
          <span>Repite la contraseña</span>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
        </label>
        {error && <p className="login__error" role="alert">{error}</p>}
        {done && <p className="panel-ok" role="status">Contraseña actualizada.</p>}
        <button type="submit" className="btn btn--primary btn--block" disabled={busy || !pass}>
          {busy ? "Guardando…" : "Guardar contraseña"}
        </button>
      </form>
    </div>
  );
}
