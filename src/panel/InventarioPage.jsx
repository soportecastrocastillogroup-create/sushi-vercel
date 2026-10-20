import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router";
import { useAuth } from "../context/auth-context.js";
import {
  TIPOS,
  deleteItem,
  deleteMovement,
  fetchDaily,
  fetchInventoryConfig,
  fetchMovements,
  saveItem,
  saveMovement,
} from "../services/inventory.js";
import { formatFecha, isoLocal, sumarDias } from "../utils/dates.js";
import { Dialog, Tabs, Toggle } from "./ui.jsx";
import { useFlash } from "./useFlash.jsx";

const nf = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 3 });
const cant = (n) => nf.format(Number(n) || 0);
// "+12,5", "−3,5" o "0".
const conSigno = (n) => (Number(n) > 0 ? `+${cant(n)}` : Number(n) < 0 ? `−${cant(Math.abs(n))}` : "0");
const UNIDADES = ["kg", "g", "L", "ml", "unidades", "cajas", "paquetes", "bolsas"];
const SEMAFORO = { rojo: "Bajo el mínimo", amarillo: "Revisar", verde: "OK" };

const fechaHora = (ts) =>
  new Date(ts).toLocaleString("es-CL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function Semaforo({ value }) {
  return (
    <span className={`semaforo semaforo--${value}`} title={SEMAFORO[value]}>
      <span aria-hidden="true" />
      {SEMAFORO[value]}
    </span>
  );
}

function DayPicker({ fecha, onChange }) {
  return (
    <div className="kanban__day">
      <button type="button" onClick={() => onChange(sumarDias(fecha, -1))} aria-label="Día anterior">
        ‹
      </button>
      <span>{formatFecha(fecha)}</span>
      <button type="button" onClick={() => onChange(sumarDias(fecha, 1))} aria-label="Día siguiente">
        ›
      </button>
    </div>
  );
}

// ── Planilla del día ─────────────────────────────────────────────────────────
function Planilla({ config, branchId, setBranchId, flash, onChanged, goToConfig, isAdmin }) {
  const [fecha, setFecha] = useState(() => isoLocal());
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [abierto, setAbierto] = useState(null); // { itemId, tipo }
  const [form, setForm] = useState({ cantidad: "", observacion: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchDaily(branchId, fecha)
      .then((r) => !cancelled && (setRows(r), setError("")))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [branchId, fecha, version]);

  const abrir = (itemId, tipo) => {
    setAbierto(abierto?.itemId === itemId && abierto.tipo === tipo ? null : { itemId, tipo });
    setForm({ cantidad: "", observacion: "" });
  };

  const guardar = async (e, row) => {
    e.preventDefault();
    const valor = Number(String(form.cantidad).replace(",", "."));
    if (!Number.isFinite(valor) || form.cantidad === "") return;
    const cantidad = abierto.tipo === "ajuste" ? valor - Number(row.actual) : valor;
    if (abierto.tipo === "ajuste" && Math.abs(cantidad) < 0.0005) return flash("El conteo coincide con el sistema: no hay nada que ajustar.");
    if (abierto.tipo !== "ajuste" && valor <= 0) return flash("La cantidad debe ser mayor que cero.", "error");
    setBusy(true);
    try {
      await saveMovement({ item_id: row.item_id, branch_id: branchId, tipo: abierto.tipo, cantidad, fecha, observacion: form.observacion });
      flash(`${TIPOS[abierto.tipo].label} de ${row.nombre} registrado.`);
      setAbierto(null);
      setVersion((v) => v + 1);
      onChanged();
    } catch (err) {
      flash(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const criticos = (rows ?? []).filter((r) => r.critico && r.semaforo === "rojo");

  return (
    <div className="inv">
      <div className="kanban__bar">
        <select value={branchId} onChange={(e) => setBranchId(e.target.value)} aria-label="Sucursal">
          {config.branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <DayPicker fecha={fecha} onChange={setFecha} />
        {fecha !== isoLocal() && (
          <button type="button" className="kanban__today" onClick={() => setFecha(isoLocal())}>
            Hoy
          </button>
        )}
      </div>

      {error && <p className="flash flash--error">{error}</p>}
      {!rows && !error && <p className="panel-muted">Cargando planilla…</p>}

      {criticos.length > 0 && (
        <div className="inv-alert" role="alert">
          <strong>⚠️ Insumos críticos bajo el mínimo</strong>
          <span>{criticos.map((r) => `${r.nombre} (${cant(r.actual)} ${r.unidad}, mín. ${cant(r.stock_minimo)})`).join(" · ")}</span>
        </div>
      )}

      {rows?.length === 0 && (
        <div className="panel-card inv-empty">
          <p>No hay insumos configurados para esta sucursal.</p>
          {isAdmin ? (
            <button type="button" className="btn btn--primary btn--sm" onClick={goToConfig}>
              Configurar insumos
            </button>
          ) : (
            <p className="panel-muted">Pídele al administrador que los cargue.</p>
          )}
        </div>
      )}

      <div className="inv-list">
        {rows?.map((r) => {
          const open = abierto?.itemId === r.item_id ? abierto.tipo : null;
          return (
            <article key={r.item_id} className={`inv-row inv-row--${r.semaforo}`}>
              <div className="inv-row__head">
                <div>
                  <h3>
                    {r.nombre}
                    {r.critico && <span className="inv-tag">Crítico</span>}
                  </h3>
                  <Semaforo value={r.semaforo} />
                </div>
                <div className="inv-row__stock">
                  <strong>{cant(r.actual)}</strong>
                  <span>
                    {r.unidad} · mín. {cant(r.stock_minimo)}
                  </span>
                </div>
              </div>
              <dl className="inv-row__day">
                <div>
                  <dt>Inicio</dt>
                  <dd>{cant(r.inicio)}</dd>
                </div>
                <div>
                  <dt>Entró</dt>
                  <dd className="is-in">{conSigno(r.ingresos)}</dd>
                </div>
                <div>
                  <dt>Uso</dt>
                  <dd className="is-out">{conSigno(-r.usos)}</dd>
                </div>
                <div>
                  <dt>Merma</dt>
                  <dd className="is-out">{conSigno(-r.mermas)}</dd>
                </div>
                {Number(r.ajustes) !== 0 && (
                  <div>
                    <dt>Ajuste</dt>
                    <dd>{conSigno(r.ajustes)}</dd>
                  </div>
                )}
              </dl>
              <div className="inv-row__actions">
                {Object.entries(TIPOS).map(([tipo, t]) => (
                  <button
                    key={tipo}
                    type="button"
                    className={`inv-btn inv-btn--${tipo} ${open === tipo ? "is-active" : ""}`}
                    onClick={() => abrir(r.item_id, tipo)}
                  >
                    {tipo === "ingreso" ? "+ " : tipo === "ajuste" ? "" : "− "}
                    {tipo === "ajuste" ? "Conteo" : t.label}
                  </button>
                ))}
              </div>
              {open && (
                <form className="inv-quick" onSubmit={(e) => guardar(e, r)}>
                  <label className="field">
                    <span>{open === "ajuste" ? `Stock contado (${r.unidad})` : `Cantidad (${r.unidad})`}</span>
                    <input
                      autoFocus
                      type="number"
                      inputMode="decimal"
                      step="any"
                      min={open === "ajuste" ? undefined : "0"}
                      value={form.cantidad}
                      onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
                      required
                    />
                    {open === "ajuste" && form.cantidad !== "" && (
                      <small className="panel-muted">
                        Diferencia con el sistema: {conSigno(Number(form.cantidad) - Number(r.actual))} {r.unidad}
                      </small>
                    )}
                  </label>
                  <label className="field">
                    <span>Observación (opcional)</span>
                    <input value={form.observacion} onChange={(e) => setForm({ ...form, observacion: e.target.value })} />
                  </label>
                  <div className="inv-quick__actions">
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => setAbierto(null)}>
                      Cancelar
                    </button>
                    <button type="submit" className="btn btn--primary btn--sm" disabled={busy}>
                      {busy ? "Guardando…" : `Registrar ${open === "ajuste" ? "conteo" : TIPOS[open].label.toLowerCase()}`}
                    </button>
                  </div>
                </form>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

// ── Movimientos ──────────────────────────────────────────────────────────────
function Movimientos({ config, branchId, flash, onChanged }) {
  const hoy = isoLocal();
  const [f, setF] = useState({ branchId, itemId: "", tipo: "", desde: sumarDias(hoy, -6), hasta: hoy, persona: "" });
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchMovements(f)
      .then((r) => !cancelled && (setRows(r), setError("")))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [f, version]);

  const item = (id) => config.items.find((i) => i.id === id);
  const branch = (id) => config.branches.find((b) => b.id === id)?.name ?? id;
  const personas = useMemo(
    () => [...new Set([...(rows ?? []).map((r) => r.created_by_nombre), f.persona].filter(Boolean))].sort(),
    [rows, f.persona]
  );

  const guardar = async (e) => {
    e.preventDefault();
    const cantidad = Number(String(edit.cantidad).replace(",", "."));
    if (!Number.isFinite(cantidad) || cantidad === 0 || (edit.tipo !== "ajuste" && cantidad < 0)) {
      return flash(edit.tipo === "ajuste" ? "El ajuste no puede ser cero." : "La cantidad debe ser mayor que cero.", "error");
    }
    setBusy(true);
    try {
      await saveMovement({ ...edit, cantidad });
      flash("Movimiento actualizado.");
      setEdit(null);
      setVersion((v) => v + 1);
      onChanged();
    } catch (err) {
      flash(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const borrar = async (m) => {
    if (!window.confirm(`¿Borrar este movimiento de ${item(m.item_id)?.nombre ?? "insumo"} (${TIPOS[m.tipo].label}, ${cant(m.cantidad)})?`)) return;
    try {
      await deleteMovement(m.id);
      flash("Movimiento borrado.");
      setVersion((v) => v + 1);
      onChanged();
    } catch (err) {
      flash(err.message, "error");
    }
  };

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="inv">
      <div className="inv-filters">
        <select value={f.branchId} onChange={set("branchId")} aria-label="Sucursal">
          <option value="">Todas las sucursales</option>
          {config.branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select value={f.itemId} onChange={set("itemId")} aria-label="Insumo">
          <option value="">Todos los insumos</option>
          {config.items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.nombre}
            </option>
          ))}
        </select>
        <select value={f.tipo} onChange={set("tipo")} aria-label="Tipo">
          <option value="">Todos los tipos</option>
          {Object.entries(TIPOS).map(([k, t]) => (
            <option key={k} value={k}>
              {t.label}
            </option>
          ))}
        </select>
        <select value={f.persona} onChange={set("persona")} aria-label="Persona">
          <option value="">Todas las personas</option>
          {personas.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <label>
          Desde <input type="date" value={f.desde} onChange={set("desde")} />
        </label>
        <label>
          Hasta <input type="date" value={f.hasta} onChange={set("hasta")} />
        </label>
      </div>

      {error && <p className="flash flash--error">{error}</p>}
      {rows?.length === 0 && <p className="panel-muted">No hay movimientos con estos filtros.</p>}

      <ul className="inv-moves">
        {rows?.map((m) => {
          const it = item(m.item_id);
          return (
            <li key={m.id} className="inv-move">
              <div className="inv-move__main">
                <span className={`inv-move__tipo inv-move__tipo--${m.tipo}`}>{TIPOS[m.tipo].label}</span>
                <strong>{it?.nombre ?? "Insumo eliminado"}</strong>
                <span className={Number(m.cantidad) > 0 ? "is-in" : "is-out"}>
                  {conSigno(m.cantidad)} {it?.unidad}
                </span>
              </div>
              <div className="inv-move__meta panel-muted">
                {formatFecha(m.fecha)} · {branch(m.branch_id)} · Anotó {m.created_by_nombre || "—"} ({fechaHora(m.created_at)})
                {m.updated_by_nombre && ` · Editó ${m.updated_by_nombre} (${fechaHora(m.updated_at)})`}
                {m.observacion && <em> · “{m.observacion}”</em>}
              </div>
              <div className="inv-move__actions">
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => setEdit({ ...m, cantidad: m.tipo === "ajuste" ? Number(m.cantidad) : Math.abs(m.cantidad) })}
                >
                  Editar
                </button>
                <button type="button" className="btn btn--ghost btn--sm btn--danger" onClick={() => borrar(m)}>
                  Borrar
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {edit && (
        <Dialog title={`Editar movimiento · ${item(edit.item_id)?.nombre ?? ""}`} onClose={() => setEdit(null)}>
          <form onSubmit={guardar}>
            <label className="field">
              <span>Tipo</span>
              <select value={edit.tipo} onChange={(e) => setEdit({ ...edit, tipo: e.target.value })}>
                {Object.entries(TIPOS).map(([k, t]) => (
                  <option key={k} value={k}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{edit.tipo === "ajuste" ? "Ajuste (+ suma, − resta)" : "Cantidad"}</span>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                value={edit.cantidad}
                onChange={(e) => setEdit({ ...edit, cantidad: e.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>Fecha</span>
              <input type="date" value={edit.fecha} onChange={(e) => setEdit({ ...edit, fecha: e.target.value })} required />
            </label>
            <label className="field">
              <span>Observación</span>
              <input value={edit.observacion} onChange={(e) => setEdit({ ...edit, observacion: e.target.value })} />
            </label>
            <div className="panel-dialog__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setEdit(null)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn--primary" disabled={busy}>
                {busy ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}

// ── Insumos (solo administrador) ─────────────────────────────────────────────
const emptyItem = (branches, n) => ({
  item: { id: null, nombre: "", unidad: "kg", critico: false, active: true, sort_order: n },
  branchRows: branches.map((b) => ({ branch_id: b.id, name: b.name, usa: true, stock_minimo: 0 })),
});

function Insumos({ config, reloadConfig, flash, onChanged }) {
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);

  const abrir = (item) => {
    if (!item) return setEdit(emptyItem(config.branches, (config.items.at(-1)?.sort_order ?? 0) + 1));
    setEdit({
      item: { ...item },
      branchRows: config.branches.map((b) => {
        const ib = config.itemBranches.find((x) => x.item_id === item.id && x.branch_id === b.id);
        return { branch_id: b.id, name: b.name, usa: !!ib, stock_minimo: ib ? Number(ib.stock_minimo) : 0 };
      }),
    });
  };

  const guardar = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await saveItem(edit.item, edit.branchRows);
      flash(`${edit.item.nombre} guardado.`);
      setEdit(null);
      await reloadConfig();
      onChanged();
    } catch (err) {
      flash(err.message.includes("inventory_items_nombre_key") ? "Ya existe un insumo con ese nombre." : err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const borrar = async () => {
    if (!window.confirm(`¿Eliminar ${edit.item.nombre}? Solo se puede si no tiene movimientos.`)) return;
    try {
      await deleteItem(edit.item.id);
      flash(`${edit.item.nombre} eliminado.`);
      setEdit(null);
      await reloadConfig();
      onChanged();
    } catch (err) {
      flash(err.message, "error");
    }
  };

  const setRow = (id, patch) =>
    setEdit({ ...edit, branchRows: edit.branchRows.map((r) => (r.branch_id === id ? { ...r, ...patch } : r)) });

  return (
    <div className="inv">
      <div className="inv-config-head">
        <p className="panel-muted">
          Insumos del local, en qué sucursal se usan y su stock mínimo. Los críticos bajo el mínimo aparecen como alerta en el menú.
        </p>
        <button type="button" className="btn btn--primary btn--sm" onClick={() => abrir(null)}>
          + Nuevo insumo
        </button>
      </div>
      {config.items.length === 0 && <p className="panel-muted">Todavía no hay insumos. Crea el primero.</p>}
      <ul className="inv-items">
        {config.items.map((i) => {
          const usos = config.itemBranches.filter((x) => x.item_id === i.id);
          return (
            <li key={i.id} className={`inv-item ${i.active ? "" : "is-inactive"}`}>
              <button type="button" onClick={() => abrir(i)}>
                <strong>
                  {i.nombre}
                  {i.critico && <span className="inv-tag">Crítico</span>}
                  {!i.active && <span className="inv-tag inv-tag--off">Inactivo</span>}
                </strong>
                <span className="panel-muted">
                  {i.unidad} ·{" "}
                  {usos.length
                    ? usos.map((u) => `${config.branches.find((b) => b.id === u.branch_id)?.name ?? u.branch_id} mín. ${cant(u.stock_minimo)}`).join(" · ")
                    : "Sin sucursal"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {edit && (
        <Dialog title={edit.item.id ? `Editar ${edit.item.nombre}` : "Nuevo insumo"} onClose={() => setEdit(null)}>
          <form onSubmit={guardar}>
            <label className="field">
              <span>Nombre</span>
              <input value={edit.item.nombre} onChange={(e) => setEdit({ ...edit, item: { ...edit.item, nombre: e.target.value } })} required />
            </label>
            <div className="editor__row">
              <label className="field">
                <span>Unidad</span>
                <input
                  list="inv-unidades"
                  value={edit.item.unidad}
                  onChange={(e) => setEdit({ ...edit, item: { ...edit.item, unidad: e.target.value } })}
                  required
                />
                <datalist id="inv-unidades">
                  {UNIDADES.map((u) => (
                    <option key={u} value={u} />
                  ))}
                </datalist>
              </label>
              <label className="field">
                <span>Orden</span>
                <input
                  type="number"
                  step="1"
                  value={edit.item.sort_order}
                  onChange={(e) => setEdit({ ...edit, item: { ...edit.item, sort_order: e.target.value } })}
                />
              </label>
            </div>
            <div className="inv-toggles">
              <Toggle checked={edit.item.critico} onChange={(v) => setEdit({ ...edit, item: { ...edit.item, critico: v } })} label="Insumo crítico" />
              <Toggle checked={edit.item.active} onChange={(v) => setEdit({ ...edit, item: { ...edit.item, active: v } })} label="Activo" />
            </div>
            <fieldset className="field">
              <legend>Sucursales y stock mínimo</legend>
              {edit.branchRows.map((r) => (
                <div key={r.branch_id} className="inv-branch-row">
                  <label className="check">
                    <input type="checkbox" checked={r.usa} onChange={(e) => setRow(r.branch_id, { usa: e.target.checked })} />
                    {r.name}
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    disabled={!r.usa}
                    value={r.stock_minimo}
                    onChange={(e) => setRow(r.branch_id, { stock_minimo: e.target.value })}
                    aria-label={`Mínimo en ${r.name}`}
                  />
                  <span className="panel-muted">{edit.item.unidad}</span>
                </div>
              ))}
            </fieldset>
            <div className="panel-dialog__actions">
              {edit.item.id && (
                <button type="button" className="btn btn--ghost btn--danger" onClick={borrar}>
                  Eliminar
                </button>
              )}
              <span className="spacer" />
              <button type="button" className="btn btn--ghost" onClick={() => setEdit(null)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn--primary" disabled={busy}>
                {busy ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}

export default function InventarioPage() {
  const panel = useOutletContext();
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState("planilla");
  const [config, setConfig] = useState(null);
  const [branchId, setBranchId] = useState("");
  const [error, setError] = useState("");
  const [flashNode, flash] = useFlash();

  useEffect(() => {
    let cancelled = false;
    fetchInventoryConfig()
      .then((c) => {
        if (cancelled) return;
        setConfig(c);
        setBranchId(c.branches[0]?.id ?? "");
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  const reloadConfig = async () => setConfig(await fetchInventoryConfig());
  const onChanged = () => panel.refreshInventoryAlerts?.();

  const tabs = [
    { id: "planilla", label: "Planilla del día" },
    { id: "movimientos", label: "Movimientos" },
    ...(isAdmin ? [{ id: "insumos", label: "Insumos" }] : []),
  ];

  return (
    <div className="panel-page panel-page--wide">
      <div className="panel-head">
        <div>
          <h1 className="panel-title">Inventario</h1>
          <p className="panel-muted">Lo que entra y se ocupa cada día en cada local.</p>
        </div>
      </div>
      {flashNode}
      {error && <p className="flash flash--error">{error}</p>}
      {!config && !error && <p className="panel-muted">Cargando…</p>}
      {config && (
        <>
          <Tabs value={tab} onChange={setTab} tabs={tabs} />
          {tab === "planilla" && branchId && (
            <Planilla
              key={config.items.length}
              config={config}
              branchId={branchId}
              setBranchId={setBranchId}
              flash={flash}
              onChanged={onChanged}
              goToConfig={() => setTab("insumos")}
              isAdmin={isAdmin}
            />
          )}
          {tab === "movimientos" && <Movimientos config={config} branchId={branchId} flash={flash} onChanged={onChanged} />}
          {tab === "insumos" && isAdmin && <Insumos config={config} reloadConfig={reloadConfig} flash={flash} onChanged={onChanged} />}
        </>
      )}
    </div>
  );
}
