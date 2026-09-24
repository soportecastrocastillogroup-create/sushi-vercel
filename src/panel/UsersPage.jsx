import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/auth-context.js";
import {
  createStaff,
  generatePassword,
  listStaff,
  resetStaffPassword,
  setStaffActive,
  updateStaff,
} from "../services/staff.js";
import { Dialog } from "./ui.jsx";

const ROLES = [
  { id: "colaborador", label: "Colaborador", hint: "Pedidos, cocina, stock y fechas" },
  { id: "administrador", label: "Administrador", hint: "Todo, incluidos reportes y usuarios" },
];
const rolLabel = (r) => ROLES.find((x) => x.id === r)?.label ?? r;

const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleString("es-CL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "Nunca";

function PasswordField({ value, onChange }) {
  return (
    <label className="field">
      <span>Contraseña temporal</span>
      <div className="login__pass">
        <input value={value} onChange={(e) => onChange(e.target.value)} autoComplete="off" spellCheck="false" />
        <button type="button" onClick={() => onChange(generatePassword())}>
          Generar
        </button>
      </div>
      <small className="panel-muted">La persona deberá cambiarla al entrar por primera vez.</small>
    </label>
  );
}

function RolePicker({ value, onChange }) {
  return (
    <fieldset className="field">
      <legend>Rol</legend>
      <div className="role-picker">
        {ROLES.map((r) => (
          <button
            key={r.id}
            type="button"
            className={value === r.id ? "is-active" : ""}
            aria-pressed={value === r.id}
            onClick={() => onChange(r.id)}
          >
            <strong>{r.label}</strong>
            <span>{r.hint}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

// Muestra la contraseña temporal una sola vez para entregarla a la persona.
function Credentials({ email, password, onClose }) {
  const [copied, setCopied] = useState(false);
  const text = `Acceso al panel de Sushi Loncoche\nCorreo: ${email}\nContraseña temporal: ${password}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <>
      <p className="panel-muted">
        Entrega estos datos a la persona por un canal privado. No se volverán a mostrar.
      </p>
      <pre className="credentials">{text}</pre>
      <div className="panel-dialog__actions">
        <button type="button" className="btn btn--ghost" onClick={copy}>
          {copied ? "Copiado" : "Copiar"}
        </button>
        <button type="button" className="btn btn--primary" onClick={onClose}>
          Listo
        </button>
      </div>
    </>
  );
}

function CreateDialog({ onClose, onDone }) {
  const [form, setForm] = useState(() => ({ nombre: "", email: "", rol: "colaborador", password: generatePassword() }));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await createStaff(form);
      setCreated({ email: form.email.trim().toLowerCase(), password: form.password });
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog title={created ? "Cuenta creada" : "Nueva cuenta"} onClose={onClose}>
      {created ? (
        <Credentials {...created} onClose={onClose} />
      ) : (
        <form onSubmit={submit}>
          <label className="field">
            <span>Nombre</span>
            <input value={form.nombre} onChange={(e) => set("nombre")(e.target.value)} autoFocus />
          </label>
          <label className="field">
            <span>Correo</span>
            <input type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} autoComplete="off" />
          </label>
          <RolePicker value={form.rol} onChange={set("rol")} />
          <PasswordField value={form.password} onChange={set("password")} />
          {error && <p className="login__error" role="alert">{error}</p>}
          <div className="panel-dialog__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={busy || form.nombre.trim().length < 2 || !form.email.includes("@") || form.password.length < 8}
            >
              {busy ? "Creando…" : "Crear cuenta"}
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

function EditDialog({ member, onClose, onDone }) {
  const [nombre, setNombre] = useState(member.nombre);
  const [rol, setRol] = useState(member.rol);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await updateStaff({ user_id: member.user_id, nombre, rol });
      onDone();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog title={`Editar a ${member.nombre}`} onClose={onClose}>
      <form onSubmit={submit}>
        <label className="field">
          <span>Nombre</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />
        </label>
        <RolePicker value={rol} onChange={setRol} />
        {error && <p className="login__error" role="alert">{error}</p>}
        <div className="panel-dialog__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn--primary" disabled={busy || nombre.trim().length < 2}>
            {busy ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function ResetDialog({ member, onClose, onDone }) {
  const [password, setPassword] = useState(generatePassword);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await resetStaffPassword(member.user_id, password);
      setDone(true);
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog title={done ? "Contraseña restablecida" : `Restablecer contraseña de ${member.nombre}`} onClose={onClose}>
      {done ? (
        <Credentials email={member.email} password={password} onClose={onClose} />
      ) : (
        <form onSubmit={submit}>
          <PasswordField value={password} onChange={setPassword} />
          {error && <p className="login__error" role="alert">{error}</p>}
          <div className="panel-dialog__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary" disabled={busy || password.length < 8}>
              {busy ? "Guardando…" : "Restablecer"}
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

export default function UsersPage() {
  const { user } = useAuth();
  const [staff, setStaff] = useState(null);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      setStaff(await listStaff());
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    listStaff()
      .then((list) => !cancelled && setStaff(list))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleActive = async (m) => {
    const verb = m.active ? "desactivar" : "reactivar";
    if (!window.confirm(`¿Seguro que quieres ${verb} la cuenta de ${m.nombre}?`)) return;
    setBusyId(m.user_id);
    try {
      await setStaffActive(m.user_id, !m.active);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const close = () => setDialog(null);

  return (
    <div className="panel-page">
      <div className="panel-head">
        <div>
          <h1 className="panel-title">Usuarios</h1>
          <p className="panel-muted">Cuentas del equipo con acceso al panel.</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setDialog({ type: "create" })}>
          + Nueva cuenta
        </button>
      </div>

      {error && <p className="login__error" role="alert">{error}</p>}

      {!staff ? (
        !error && (
          <div className="page-state" role="status">
            <span className="spinner" aria-hidden="true" />
          </div>
        )
      ) : (
        <ul className="staff-list">
          {staff.map((m) => {
            const self = m.user_id === user.id;
            return (
              <li key={m.user_id} className={`staff-row${m.active ? "" : " is-inactive"}`}>
                <div className="staff-row__who">
                  <p className="staff-row__name">
                    {m.nombre}
                    {self && <span className="panel-muted"> (tú)</span>}
                  </p>
                  <p className="staff-row__email">{m.email}</p>
                </div>
                <div className="staff-row__meta">
                  <span className={`role-badge role-badge--${m.rol}`}>{rolLabel(m.rol)}</span>
                  <span className={`status-dot${m.active ? " is-on" : ""}`}>{m.active ? "Activa" : "Desactivada"}</span>
                  <span className="panel-muted staff-row__last">Último acceso: {fmtDate(m.last_sign_in_at)}</span>
                </div>
                <div className="staff-row__actions">
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setDialog({ type: "edit", member: m })}>
                    Editar
                  </button>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setDialog({ type: "reset", member: m })}>
                    Contraseña
                  </button>
                  {!self && (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      disabled={busyId === m.user_id}
                      onClick={() => toggleActive(m)}
                    >
                      {m.active ? "Desactivar" : "Reactivar"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {dialog?.type === "create" && <CreateDialog onClose={close} onDone={load} />}
      {dialog?.type === "edit" && <EditDialog member={dialog.member} onClose={close} onDone={load} />}
      {dialog?.type === "reset" && <ResetDialog member={dialog.member} onClose={close} onDone={load} />}
    </div>
  );
}
