import { useEffect, useMemo, useState } from "react";
import {
  fetchCustomerOrders,
  fetchSusheros,
  resetCustomerPassword,
  saveNotas,
  setCustomerBlocked,
  updateCustomerEmail,
} from "../services/susheros.js";
import { generatePassword } from "../services/staff.js";
import { ESTADOS } from "../constants/estados.js";
import { labelCompletado } from "../utils/orders.js";
import { formatFecha } from "../utils/dates.js";
import { fmt } from "../utils/format.js";
import { waLink } from "../utils/whatsapp.js";
import { Dialog } from "./ui.jsx";
import { useFlash } from "./useFlash.jsx";

const normalize = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

const fechaCorta = (ts) => (ts ? new Date(ts).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" }) : "—");

const FILTROS = [
  { id: "todos", label: "Todos", test: () => true },
  { id: "correos", label: "Aceptan correos", test: (c) => c.acepta_marketing },
  { id: "compraron", label: "Con compras", test: (c) => c.stats.compras > 0 },
  { id: "bloqueados", label: "Bloqueados", test: (c) => c.bloqueado },
];

function Badges({ c }) {
  return (
    <>
      {c.acepta_marketing && <span className="sh-badge sh-badge--ok">Acepta correos</span>}
      {!c.auth_user_id && <span className="sh-badge">Sin cuenta</span>}
      {c.bloqueado && <span className="sh-badge sh-badge--bad">Bloqueado</span>}
    </>
  );
}

// Contraseña nueva: se muestra una sola vez para enviarla por WhatsApp.
function NuevaClave({ c, password, onClose }) {
  const texto = `Hola ${c.nombre.split(" ")[0] || ""}, restablecimos tu contraseña de Sushi Loncoche.\nCorreo: ${c.email}\nContraseña: ${password}\nPuedes cambiarla en Mi cuenta.`;
  return (
    <div className="sh-clave">
      <p className="panel-muted">Envíasela al cliente por WhatsApp. No se volverá a mostrar.</p>
      <pre className="credentials">{texto}</pre>
      <div className="panel-dialog__actions">
        {c.telefono && (
          <a className="btn btn--primary" href={waLink(c.telefono, texto)} target="_blank" rel="noreferrer">
            Enviar por WhatsApp
          </a>
        )}
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          Listo
        </button>
      </div>
    </div>
  );
}

function Ficha({ c, onChanged, flash }) {
  const [orders, setOrders] = useState(null);
  const [ordersError, setOrdersError] = useState("");
  const [notas, setNotas] = useState(c.notas);
  const [email, setEmail] = useState(null); // null = sin editar
  const [clave, setClave] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchCustomerOrders(c.id)
      .then((o) => !cancelled && setOrders(o))
      .catch((e) => !cancelled && setOrdersError(e.message));
    return () => {
      cancelled = true;
    };
  }, [c.id]);

  const accion = async (fn, ok) => {
    setBusy(true);
    try {
      await fn();
      flash(ok);
      await onChanged();
    } catch (err) {
      flash(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const restablecer = () => {
    if (!window.confirm(`¿Restablecer la contraseña de ${c.email}? La actual dejará de funcionar.`)) return;
    const password = generatePassword();
    accion(async () => {
      await resetCustomerPassword(c.id, password);
      setClave(password);
    }, "Contraseña restablecida.");
  };

  const bloquear = () => {
    const texto = c.bloqueado ? `¿Desbloquear a ${c.email}?` : `¿Bloquear a ${c.email}? No podrá ingresar ni hacer pedidos.`;
    if (!window.confirm(texto)) return;
    accion(() => setCustomerBlocked(c.id, !c.bloqueado), c.bloqueado ? "Cuenta desbloqueada." : "Cuenta bloqueada.");
  };

  const s = c.stats;
  return (
    <div className="sh-ficha">
      <div className="sh-ficha__head">
        <Badges c={c} />
      </div>

      <div className="sh-ficha__grid">
        <section>
          <h3 className="panel-subtitle">Datos</h3>
          <dl className="caja-kv">
            <div>
              <dt>Correo</dt>
              <dd className="sh-wrap">{c.email}</dd>
            </div>
            <div>
              <dt>Teléfono</dt>
              <dd>
                {c.telefono ? (
                  <a href={waLink(c.telefono)} target="_blank" rel="noreferrer">
                    {c.telefono}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt>Dirección</dt>
              <dd className="sh-wrap">{c.direccion || "—"}</dd>
            </div>
            <div>
              <dt>Registrado</dt>
              <dd>{fechaCorta(c.created_at)}</dd>
            </div>
            <div>
              <dt>Novedades por correo</dt>
              <dd>
                {c.acepta_marketing
                  ? `Sí, desde ${fechaCorta(c.consentimiento_at)}${c.consentimiento_origen ? ` (${c.consentimiento_origen})` : ""}`
                  : c.baja_at
                    ? `No (se dio de baja el ${fechaCorta(c.baja_at)})`
                    : "No"}
              </dd>
            </div>
          </dl>
        </section>
        <section>
          <h3 className="panel-subtitle">Compras</h3>
          <dl className="caja-kv">
            <div>
              <dt>Pedidos</dt>
              <dd>{s.compras}</dd>
            </div>
            <div>
              <dt>Gasto total</dt>
              <dd>{fmt(s.gasto)}</dd>
            </div>
            <div>
              <dt>Ticket promedio</dt>
              <dd>{fmt(s.ticket_promedio)}</dd>
            </div>
            <div>
              <dt>Primera / última compra</dt>
              <dd>{s.compras ? `${formatFecha(s.primera_compra)} / ${formatFecha(s.ultima_compra)}` : "—"}</dd>
            </div>
            <div>
              <dt>En curso</dt>
              <dd>{s.en_curso}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section>
        <h3 className="panel-subtitle">Pedidos</h3>
        {ordersError ? (
          <p className="flash flash--error">{ordersError}</p>
        ) : !orders ? (
          <p className="panel-muted">Cargando…</p>
        ) : orders.length === 0 ? (
          <p className="panel-muted">Todavía no tiene pedidos.</p>
        ) : (
          <ul className="sh-orders">
            {orders.map((o) => {
              const e = ESTADOS[o.estado] ?? ESTADOS.abierto;
              return (
                <li key={o.id}>
                  <div className="sh-orders__top">
                    <b>{o.order_number}</b>
                    <span>
                      {formatFecha(o.fecha)} · {o.horario} · {o.sucursal} · {o.tipo === "delivery" ? "Delivery" : "Retiro"}
                    </span>
                    <span className="kcard__estado" style={{ background: e.bg, color: e.color }}>
                      {o.estado === "completado" ? labelCompletado(o.tipo) : e.label}
                    </span>
                    <strong>{fmt(o.total)}</strong>
                  </div>
                  <p className="panel-muted">
                    {o.order_items.map((i) => `${i.qty}× ${i.nombre}${i.opciones_str ? ` (${i.opciones_str})` : ""}`).join(" · ")}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h3 className="panel-subtitle">Notas internas</h3>
        <textarea className="sh-notas" rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Solo las ve el administrador" />
        {notas !== c.notas && (
          <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => accion(() => saveNotas(c.id, notas), "Notas guardadas.")}>
            Guardar notas
          </button>
        )}
      </section>

      {clave ? (
        <NuevaClave c={c} password={clave} onClose={() => setClave(null)} />
      ) : (
        <section className="sh-acciones">
          <h3 className="panel-subtitle">Cuenta</h3>
          {email !== null ? (
            <form
              className="inline-add"
              onSubmit={(e) => {
                e.preventDefault();
                accion(async () => {
                  await updateCustomerEmail(c.id, email);
                  setEmail(null);
                }, "Correo actualizado.");
              }}
            >
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Correo nuevo" required />
              <button type="submit" className="btn btn--primary btn--sm" disabled={busy}>
                Guardar
              </button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEmail(null)}>
                Cancelar
              </button>
            </form>
          ) : (
            <div className="sh-acciones__btns">
              {c.auth_user_id && (
                <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={restablecer}>
                  Restablecer contraseña
                </button>
              )}
              <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => setEmail(c.email)}>
                Cambiar correo
              </button>
              <button type="button" className="btn btn--ghost btn--sm btn--danger" disabled={busy} onClick={bloquear}>
                {c.bloqueado ? "Desbloquear" : "Bloquear"}
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default function SusherosPage() {
  const [list, setList] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [selId, setSelId] = useState(null);
  const [version, setVersion] = useState(0);
  const [flashNode, flash] = useFlash();

  useEffect(() => {
    let cancelled = false;
    fetchSusheros()
      .then((l) => !cancelled && setList(l))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [version]);

  const reload = async () => {
    setList(await fetchSusheros());
  };

  const visibles = useMemo(() => {
    const q = normalize(query.trim());
    const test = FILTROS.find((f) => f.id === filtro).test;
    return (list ?? []).filter((c) => test(c) && (!q || normalize(`${c.nombre} ${c.email} ${c.telefono}`).includes(q)));
  }, [list, query, filtro]);

  const sel = list?.find((c) => c.id === selId);

  return (
    <div className="panel-page panel-page--wide">
      <div className="panel-head">
        <div>
          <h1 className="panel-title">Susheros</h1>
          <p className="panel-muted">
            {list ? `${list.length} clientes registrados · ${list.filter((c) => c.acepta_marketing).length} aceptan correos` : "Clientes registrados en el sitio."}
          </p>
        </div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setVersion((v) => v + 1)}>
          ↻ Actualizar
        </button>
      </div>
      {flashNode}
      {error && <p className="flash flash--error">{error}</p>}

      <div className="sh-bar">
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre, correo o teléfono" aria-label="Buscar" />
        <div className="sh-filtros" role="group" aria-label="Filtro">
          {FILTROS.map((f) => (
            <button key={f.id} type="button" className={filtro === f.id ? "is-active" : ""} aria-pressed={filtro === f.id} onClick={() => setFiltro(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {!list && !error && <p className="panel-muted">Cargando…</p>}
      {list && visibles.length === 0 && <p className="panel-muted">No hay Susheros con estos filtros.</p>}

      <ul className="sh-list">
        {visibles.map((c) => (
          <li key={c.id}>
            <button type="button" className={`sh-row${c.bloqueado ? " is-blocked" : ""}`} onClick={() => setSelId(c.id)}>
              <span className="sh-row__who">
                <strong>{c.nombre || "Sin nombre"}</strong>
                <Badges c={c} />
                <span className="panel-muted sh-wrap">
                  {c.email}
                  {c.telefono && ` · ${c.telefono}`}
                </span>
              </span>
              <span className="sh-row__nums">
                <span>
                  <b>{c.stats.compras}</b> pedidos
                </span>
                <span>
                  <b>{fmt(c.stats.gasto)}</b>
                </span>
                <span className="panel-muted">{c.stats.ultima_compra ? `Última: ${formatFecha(c.stats.ultima_compra)}` : "Sin compras"}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {sel && (
        <Dialog title={sel.nombre || sel.email} onClose={() => setSelId(null)} wide>
          <Ficha key={sel.id} c={sel} onChanged={reload} flash={flash} />
        </Dialog>
      )}
    </div>
  );
}
