import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import { fetchBranchesCaja, fetchCashSummary, fetchClosing, fetchRecentClosings, saveClosing } from "../services/caja.js";
import { calcularCuadratura } from "../utils/caja.js";
import { fmt } from "../utils/format.js";
import { formatFecha, isoLocal, sumarDias } from "../utils/dates.js";
import { getPagos } from "../constants/estados.js";
import { useFlash } from "./useFlash.jsx";

const METODOS = Object.fromEntries(getPagos("retiro").map((p) => [p.id, p.id === "pago_contra_entrega" ? "Pago al retirar" : p.label]));

const emptyDeclarado = () => ({
  fondo_inicial: "",
  efectivo_contado: "",
  tarjetas: "",
  transferencias: "",
  otros_egresos: [],
  observaciones: "",
});

const fromClosing = (c) => ({
  fondo_inicial: c.fondo_inicial,
  efectivo_contado: c.efectivo_contado,
  tarjetas: c.tarjetas,
  transferencias: c.transferencias,
  otros_egresos: c.otros_egresos ?? [],
  observaciones: c.observaciones ?? "",
});

const fechaHora = (ts) =>
  new Date(ts).toLocaleString("es-CL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function Diferencia({ label, value, strong = false }) {
  const estado = value === 0 ? "ok" : "bad";
  return (
    <div className={`caja-dif caja-dif--${estado}${strong ? " caja-dif--total" : ""}`}>
      <span>{label}</span>
      <strong>
        {value > 0 ? "+" : value < 0 ? "−" : ""}
        {fmt(Math.abs(value))}
      </strong>
      <small>{value === 0 ? "Cuadra" : value > 0 ? "Sobra" : "Falta"}</small>
    </div>
  );
}

function Money({ label, value, onChange, hint }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type="number" min="0" step="1" inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value)} placeholder="0" />
      {hint && <small className="panel-muted">{hint}</small>}
    </label>
  );
}

export default function CajaPage() {
  const panel = useOutletContext();
  const [branches, setBranches] = useState(null);
  const [branchId, setBranchId] = useState("");
  const [fecha, setFecha] = useState(() => isoLocal());
  const [sistema, setSistema] = useState(null);
  const [cierre, setCierre] = useState(null);
  const [recientes, setRecientes] = useState([]);
  const [declarado, setDeclarado] = useState(emptyDeclarado);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [verPedidos, setVerPedidos] = useState(false);
  const [flashNode, flash] = useFlash();

  useEffect(() => {
    let cancelled = false;
    fetchBranchesCaja()
      .then((b) => {
        if (cancelled) return;
        setBranches(b);
        setBranchId(b[0]?.id ?? "");
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!branchId) return;
    let cancelled = false;
    Promise.all([fetchCashSummary(branchId, fecha), fetchClosing(branchId, fecha), fetchRecentClosings(branchId)])
      .then(([s, c, r]) => {
        if (cancelled) return;
        setSistema(s);
        setCierre(c);
        setRecientes(r);
        setDeclarado(c ? fromClosing(c) : emptyDeclarado());
        setError("");
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [branchId, fecha, version]);

  const branch = branches?.find((b) => b.id === branchId);
  const pedidosDia = (panel.orders ?? [])
    .filter((o) => o.sucursal === branch?.name && o.fecha === fecha)
    .sort((a, b) => a.horario.localeCompare(b.horario));
  const r = sistema ? calcularCuadratura(sistema, declarado) : null;

  const set = (k) => (v) => setDeclarado((d) => ({ ...d, [k]: v }));
  const setEgreso = (i, patch) =>
    setDeclarado((d) => ({ ...d, otros_egresos: d.otros_egresos.map((e, j) => (j === i ? { ...e, ...patch } : e)) }));

  const guardar = async (e) => {
    e.preventDefault();
    if (sistema.pedidos_pendientes > 0 && !cierre) {
      const ok = window.confirm(
        `Hay ${sistema.pedidos_pendientes} pedido(s) sin completar en ${branch.name}. ¿Cerrar la caja igual?`
      );
      if (!ok) return;
    }
    setBusy(true);
    try {
      const body = {
        ...declarado,
        otros_egresos: declarado.otros_egresos.filter((x) => Number(x.monto) > 0).map((x) => ({ detalle: x.detalle, monto: Math.round(Number(x.monto)) })),
      };
      for (const k of ["fondo_inicial", "efectivo_contado", "tarjetas", "transferencias"]) body[k] = Math.round(Number(body[k]) || 0);
      await saveClosing(branchId, fecha, body);
      flash(cierre ? "Cierre actualizado." : "Caja cerrada.");
      setVersion((v) => v + 1);
    } catch (err) {
      flash(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel-page panel-page--wide">
      <div className="panel-head">
        <div>
          <h1 className="panel-title">Caja</h1>
          <p className="panel-muted">Cuadratura del día por local: lo que dice el sistema contra lo que hay en caja.</p>
        </div>
      </div>
      {flashNode}
      {error && <p className="flash flash--error">{error}</p>}
      {!branches && !error && <p className="panel-muted">Cargando…</p>}

      {branches && (
        <div className="kanban__bar">
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} aria-label="Sucursal">
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <div className="kanban__day">
            <button type="button" onClick={() => setFecha((f) => sumarDias(f, -1))} aria-label="Día anterior">
              ‹
            </button>
            <span>{formatFecha(fecha)}</span>
            <button type="button" onClick={() => setFecha((f) => sumarDias(f, 1))} aria-label="Día siguiente">
              ›
            </button>
          </div>
          {fecha !== isoLocal() && (
            <button type="button" className="kanban__today" onClick={() => setFecha(isoLocal())}>
              Hoy
            </button>
          )}
          <span className={`caja-estado ${cierre ? "is-closed" : ""}`}>
            {cierre
              ? `Cerrada por ${cierre.cerrado_por_nombre || "—"} · ${fechaHora(cierre.cerrado_at)}${
                  cierre.editado_por_nombre ? ` · editada por ${cierre.editado_por_nombre} (${fechaHora(cierre.updated_at)})` : ""
                }`
              : "Sin cerrar"}
          </span>
        </div>
      )}

      {sistema && r && (
        <form className="caja" onSubmit={guardar}>
          <section className="panel-card caja-card">
            <h2 className="panel-subtitle">Lo que trae el sistema</h2>
            <dl className="caja-kv">
              <div>
                <dt>Pedidos del día</dt>
                <dd>{sistema.pedidos}</dd>
              </div>
              <div>
                <dt>Total vendido</dt>
                <dd>{fmt(sistema.ventas_total)}</dd>
              </div>
              {Object.entries(sistema.ventas_por_metodo).map(([m, total]) => (
                <div key={m} className="caja-kv__sub">
                  <dt>{METODOS[m] ?? m}</dt>
                  <dd>{fmt(total)}</dd>
                </div>
              ))}
              <div>
                <dt>
                  Repartidor: {sistema.deliveries} delivery × {fmt(sistema.tarifa_repartidor)}
                </dt>
                <dd className={sistema.total_repartidor ? "is-out" : ""}>
                  {sistema.total_repartidor ? "−" : ""}
                  {fmt(sistema.total_repartidor)}
                </dd>
              </div>
            </dl>
            {sistema.pedidos_pendientes > 0 && (
              <p className="caja-warn">
                ⚠️ {sistema.pedidos_pendientes} pedido(s) siguen sin completar. Revísalos antes de cerrar.
              </p>
            )}
            {cierre && cierre.pedidos !== sistema.pedidos && (
              <p className="caja-warn">
                Los pedidos cambiaron desde el cierre ({cierre.pedidos} → {sistema.pedidos}). Guarda de nuevo para actualizar las cifras.
              </p>
            )}
            {pedidosDia.length > 0 && (
              <>
                <button type="button" className="caja-toggle" onClick={() => setVerPedidos((v) => !v)} aria-expanded={verPedidos}>
                  {verPedidos ? "Ocultar pedidos" : `Ver los ${pedidosDia.length} pedidos por hora`}
                </button>
                {verPedidos && (
                  <ul className="caja-pedidos">
                    {pedidosDia.map((o) => (
                      <li key={o.id}>
                        <span>{o.horario}</span>
                        <b>{o.orderId}</b>
                        <span className="caja-pedidos__cli">{o.cliente.nombre || "Sin nombre"}</span>
                        <span className="panel-muted">
                          {o.tipo === "delivery" ? "Delivery" : "Retiro"} · {METODOS[o.metodoPago] ?? o.metodoPago}
                          {o.estado !== "completado" && " · sin completar"}
                        </span>
                        <span>{fmt(o.total)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </section>

          <section className="panel-card caja-card">
            <h2 className="panel-subtitle">Lo que hay en caja</h2>
            <div className="editor__row">
              <Money label="Fondo inicial" value={declarado.fondo_inicial} onChange={set("fondo_inicial")} hint="Efectivo con que partió la caja." />
              <Money label="Efectivo contado" value={declarado.efectivo_contado} onChange={set("efectivo_contado")} hint="Todo el efectivo al cerrar." />
            </div>
            <div className="editor__row">
              <Money label="Tarjetas (según el POS)" value={declarado.tarjetas} onChange={set("tarjetas")} />
              <Money label="Transferencias" value={declarado.transferencias} onChange={set("transferencias")} />
            </div>
            <fieldset className="field">
              <legend>Otros egresos en efectivo</legend>
              {declarado.otros_egresos.map((eg, i) => (
                <div key={i} className="caja-egreso">
                  <input
                    value={eg.detalle}
                    placeholder="Detalle (ej. compra de hielo)"
                    onChange={(e) => setEgreso(i, { detalle: e.target.value })}
                    aria-label="Detalle del egreso"
                  />
                  <input
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    value={eg.monto}
                    placeholder="Monto"
                    onChange={(e) => setEgreso(i, { monto: e.target.value })}
                    aria-label="Monto del egreso"
                  />
                  <button
                    type="button"
                    aria-label="Quitar egreso"
                    onClick={() => setDeclarado((d) => ({ ...d, otros_egresos: d.otros_egresos.filter((_, j) => j !== i) }))}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setDeclarado((d) => ({ ...d, otros_egresos: [...d.otros_egresos, { detalle: "", monto: "" }] }))}
              >
                + Agregar egreso
              </button>
            </fieldset>
            <label className="field">
              <span>Observaciones</span>
              <textarea rows={2} value={declarado.observaciones} onChange={(e) => set("observaciones")(e.target.value)} />
            </label>
          </section>

          <section className="panel-card caja-card caja-result">
            <h2 className="panel-subtitle">Resultado</h2>
            <dl className="caja-kv">
              <div>
                <dt>Fondo inicial</dt>
                <dd>{fmt(Number(declarado.fondo_inicial) || 0)}</dd>
              </div>
              <div>
                <dt>+ Ventas en efectivo (pago al retirar − tarjetas)</dt>
                <dd>{r.ventasEfectivo < 0 ? "−" : ""}{fmt(Math.abs(r.ventasEfectivo))}</dd>
              </div>
              <div>
                <dt>− Egresos en efectivo (repartidor y otros)</dt>
                <dd className={r.egresosEfectivo ? "is-out" : ""}>
                  {r.egresosEfectivo ? "−" : ""}
                  {fmt(r.egresosEfectivo)}
                </dd>
              </div>
              <div className="caja-kv__total">
                <dt>Efectivo esperado</dt>
                <dd>{r.esperado < 0 ? "−" : ""}{fmt(Math.abs(r.esperado))}</dd>
              </div>
            </dl>
            <div className="caja-difs">
              <Diferencia label="Diferencia de efectivo" value={r.difEfectivo} />
              <Diferencia label="Diferencia de transferencias" value={r.difTransferencias} />
              <Diferencia label="Diferencia total" value={r.difTotal} strong />
            </div>
            <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
              {busy ? "Guardando…" : cierre ? "Guardar cambios del cierre" : "Cerrar caja"}
            </button>
          </section>
        </form>
      )}

      {recientes.length > 0 && (
        <section className="caja-recientes">
          <h2 className="panel-subtitle">Cierres anteriores · {branch?.name}</h2>
          <ul>
            {recientes.map((c) => (
              <li key={c.fecha}>
                <button type="button" onClick={() => setFecha(c.fecha)} className={c.fecha === fecha ? "is-active" : ""}>
                  <span>{formatFecha(c.fecha)}</span>
                  <span className="panel-muted">{c.cerrado_por_nombre}</span>
                  <strong className={c.diferencia_total === 0 ? "is-in" : "is-out"}>
                    {c.diferencia_total === 0
                      ? "Cuadra"
                      : `${c.diferencia_total > 0 ? "Sobra" : "Falta"} ${fmt(Math.abs(c.diferencia_total))}`}
                  </strong>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
