import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import { fetchBranchesCaja, fetchCashSummary, fetchClosing, fetchRecentClosings, saveClosing } from "../services/caja.js";
import { calcularCuadratura } from "../utils/caja.js";
import { fmt } from "../utils/format.js";
import { formatFecha, isoLocal, sumarDias } from "../utils/dates.js";
import { PAGOS, pagoLabel } from "../constants/estados.js";
import { Aviso, Tabs } from "./ui.jsx";
import { useFlash } from "./useFlash.jsx";

// Cuadratura de caja en una pantalla: (1) fondo y gastos en efectivo, (2) contar
// cada medio de pago al lado de lo que debería haber, y abajo una barra fija
// con el resultado y el botón de cerrar.
// Las cifras las calcula la base (cash_summary / save_cash_closing) con la
// misma fórmula que utils/caja.js.

const emptyDeclarado = () => ({
  fondo_inicial: "",
  efectivo_contado: "",
  tarjetas: "",
  transferencias: "",
  pago_repartidor: "",
  otros_egresos: [],
  observaciones: "",
});

const fromClosing = (c) => ({
  fondo_inicial: c.fondo_inicial,
  efectivo_contado: c.efectivo_contado,
  tarjetas: c.tarjetas,
  transferencias: c.transferencias,
  pago_repartidor: c.total_repartidor,
  otros_egresos: c.otros_egresos ?? [],
  observaciones: c.observaciones ?? "",
});

const hora = (ts) => new Date(ts).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const vacio = (v) => v === "" || v === null || v === undefined;

// "Cuadra", "Falta $1.000" o "Sobra $500".
function Resultado({ value, grande = false }) {
  const estado = value === 0 ? "ok" : value < 0 ? "falta" : "sobra";
  return (
    <span className={`caja-res caja-res--${estado}${grande ? " caja-res--grande" : ""}`}>
      {value === 0 ? "✓ Cuadra" : `${value < 0 ? "Falta" : "Sobra"} ${fmt(Math.abs(value))}`}
    </span>
  );
}

// Monto en pesos. Es texto, no "number": en Chile el punto separa los miles y
// un campo numérico leía "10.000" como 10. Se guardan solo los dígitos y se
// muestra con puntos ("10.000").
const miles = new Intl.NumberFormat("es-CL");
function Monto({ value, onChange, label, autoFocus }) {
  const digitos = String(value ?? "").replace(/\D/g, "");
  return (
    <input
      className="caja-monto"
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="$0"
      aria-label={label}
      autoFocus={autoFocus}
      value={digitos === "" ? "" : `$${miles.format(Number(digitos))}`}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, ""))}
    />
  );
}

// Una fila del conteo: lo que debería haber, lo contado y la diferencia.
function Fila({ titulo, ayuda, deberia, detalle, value, onChange, dif }) {
  return (
    <tr>
      <td>
        <strong>{titulo}</strong>
        <small>{ayuda}</small>
      </td>
      <td className="num" data-label="Debería haber">
        <strong>{fmt(deberia)}</strong>
        {detalle && <small>{detalle}</small>}
      </td>
      <td className="num" data-label="Contaste">
        <Monto value={value} onChange={onChange} label={`${titulo}: lo que contaste`} />
      </td>
      <td className="num" data-label="Resultado">
        {vacio(value) ? <span className="caja-res caja-res--pend">—</span> : <Resultado value={dif} />}
      </td>
    </tr>
  );
}

// Panel lateral: los pedidos del día, del más reciente al más antiguo, con
// cuánto y cómo pagaron. Los filtros por medio de pago ayudan a contar.
function PedidosDelDia({ pedidos }) {
  const [filtro, setFiltro] = useState("todos");
  const orden = (m) => {
    const i = PAGOS.findIndex((p) => p.id === m);
    return i < 0 ? PAGOS.length : i;
  };
  const metodos = [...new Set(pedidos.map((o) => o.metodoPago))].sort((a, b) => orden(a) - orden(b));
  const total = (lista) => lista.reduce((n, o) => n + (Number(o.total) || 0), 0);
  const visibles = filtro === "todos" ? pedidos : pedidos.filter((o) => o.metodoPago === filtro);
  const corto = (m) => pagoLabel(m).replace(" bancaria", "").replace("Pago al retirar (tarjeta o efectivo)", "Al retirar");
  return (
    <aside className="panel-card caja-lado">
      <h2 className="caja-paso__titulo">Pedidos del día</h2>
      <p className="panel-muted caja-paso__ayuda">El más reciente arriba. Filtra por medio de pago para contar.</p>
      {pedidos.length === 0 ? (
        <p className="panel-muted">No hay pedidos este día.</p>
      ) : (
        <>
          <div className="caja-lado__filtros" role="group" aria-label="Filtrar por medio de pago">
            {[["todos", "Todos", pedidos], ...metodos.map((m) => [m, corto(m), pedidos.filter((o) => o.metodoPago === m)])].map(([id, label, lista]) => (
              <button key={id} type="button" className={filtro === id ? "is-active" : ""} aria-pressed={filtro === id} onClick={() => setFiltro(id)}>
                {label} <small>{fmt(total(lista))}</small>
              </button>
            ))}
          </div>
          <ul className="caja-lado__lista">
            {visibles.map((o) => (
              <li key={o.id}>
                <div className="caja-lado__fila">
                  <span className="caja-lado__hora" title="Hora en que se tomó el pedido">
                    {o.timestamp ? hora(o.timestamp) : o.horario}
                  </span>
                  <b>{o.orderId}</b>
                  <span className="caja-lado__cli">{o.cliente.nombre || "Sin nombre"}</span>
                  <strong>{fmt(o.total)}</strong>
                </div>
                <div className="caja-lado__fila caja-lado__fila--meta">
                  <span className={`caja-pago caja-pago--${o.metodoPago}`}>{corto(o.metodoPago)}</span>
                  <span className="panel-muted">
                    {o.tipo === "delivery" ? "Delivery" : "Retiro"} para las {o.horario}
                    {o.estado !== "completado" && " · sin completar"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <p className="caja-lado__total">
            {visibles.length} {visibles.length === 1 ? "pedido" : "pedidos"} · <strong>{fmt(total(visibles))}</strong>
          </p>
        </>
      )}
    </aside>
  );
}

// ── Cerrar caja ───────────────────────────────────────────────────────────────
function Cierre({ branch, fecha, pedidosDia, flash }) {
  const [sistema, setSistema] = useState(null);
  const [cierre, setCierre] = useState(null);
  const [declarado, setDeclarado] = useState(emptyDeclarado);
  const [editando, setEditando] = useState(false);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchCashSummary(branch.id, fecha), fetchClosing(branch.id, fecha)])
      .then(([s, c]) => {
        if (cancelled) return;
        setSistema(s);
        setCierre(c);
        // El pago al repartidor parte con el calculado (deliveries × tarifa) y se puede cambiar.
        setDeclarado(c ? fromClosing(c) : { ...emptyDeclarado(), pago_repartidor: s.total_repartidor });
        setEditando(false);
        setError("");
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [branch.id, fecha, version]);

  if (error) return <p className="flash flash--error">{error}</p>;
  if (!sistema) return <p className="panel-muted">Cargando…</p>;

  const r = calcularCuadratura(sistema, declarado);
  const completo = !vacio(declarado.efectivo_contado) && !vacio(declarado.tarjetas) && !vacio(declarado.transferencias);
  const set = (k) => (v) => setDeclarado((d) => ({ ...d, [k]: v }));
  const setEgreso = (i, patch) =>
    setDeclarado((d) => ({ ...d, otros_egresos: d.otros_egresos.map((e, j) => (j === i ? { ...e, ...patch } : e)) }));

  const guardar = async (e) => {
    e.preventDefault();
    if (!completo) return;
    if (sistema.pedidos_pendientes > 0 && !cierre) {
      const ok = window.confirm(`Hay ${sistema.pedidos_pendientes} pedido(s) sin completar en ${branch.name}. ¿Cerrar la caja igual?`);
      if (!ok) return;
    }
    setBusy(true);
    try {
      const body = {
        ...declarado,
        otros_egresos: declarado.otros_egresos
          .filter((x) => Number(x.monto) > 0)
          .map((x) => ({ detalle: x.detalle, monto: Math.round(Number(x.monto)) })),
      };
      for (const k of ["fondo_inicial", "efectivo_contado", "tarjetas", "transferencias", "pago_repartidor"]) body[k] = Math.round(Number(body[k]) || 0);
      await saveClosing(branch.id, fecha, body);
      flash(cierre ? "Cierre actualizado." : "Caja cerrada.");
      setVersion((v) => v + 1);
    } catch (err) {
      flash(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const ventas = (
    <section className="caja-ventas">
      <div className="caja-ventas__fila">
        <span>
          Vendido <strong>{fmt(sistema.ventas_total)}</strong> en {sistema.pedidos} {sistema.pedidos === 1 ? "pedido" : "pedidos"}
        </span>
        {Object.entries(sistema.ventas_por_metodo).map(([m, total]) => (
          <span key={m} className="caja-ventas__metodo">
            {pagoLabel(m).replace(" bancaria", "")} <strong>{fmt(total)}</strong>
          </span>
        ))}
      </div>
      {sistema.pedidos_pendientes > 0 && (
        <Aviso id={`caja-pendientes-${branch.id}-${fecha}`} firma={sistema.pedidos_pendientes}>
          {sistema.pedidos_pendientes} {sistema.pedidos_pendientes === 1 ? "pedido sigue" : "pedidos siguen"} sin completar. Revísalos antes de cerrar.
        </Aviso>
      )}
    </section>
  );

  // Caja ya cerrada: resumen claro, con la opción de editar.
  if (cierre && !editando) {
    const rc = calcularCuadratura({ ventas_por_metodo: cierre.ventas_por_metodo, total_repartidor: cierre.total_repartidor }, fromClosing(cierre));
    return (
      <div className="caja-grid caja-grid--cerrada">
        <section className="panel-card caja-cerrada">
          <div className="caja-cerrada__head">
            <div>
              <h2>Caja cerrada</h2>
              <p className="panel-muted">
                Por {cierre.cerrado_por_nombre || "—"} a las {hora(cierre.cerrado_at)}
                {cierre.editado_por_nombre && ` · editada por ${cierre.editado_por_nombre} a las ${hora(cierre.updated_at)}`}
              </p>
            </div>
            <Resultado value={cierre.diferencia_total} grande />
          </div>
          <table className="caja-tabla">
            <thead>
              <tr>
                <th>Medio</th>
                <th className="num">Debería haber</th>
                <th className="num">Contaron</th>
                <th className="num">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Efectivo en caja", rc.esperado, cierre.efectivo_contado, rc.difEfectivo],
                ["Débito (POS)", rc.ventasDebito, cierre.tarjetas, rc.difTarjetas],
                ["Transferencias", rc.ventasTransferencia, cierre.transferencias, rc.difTransferencias],
              ].map(([medio, deberia, conto, dif]) => (
                <tr key={medio}>
                  <td>{medio}</td>
                  <td className="num">{fmt(deberia)}</td>
                  <td className="num">{fmt(conto)}</td>
                  <td className="num">
                    <Resultado value={dif} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="panel-muted caja-cerrada__nota">
            Fondo inicial {fmt(cierre.fondo_inicial)} · repartidor {fmt(rc.repartidor)}
            {rc.otrosEgresos > 0 && ` · otros gastos ${fmt(rc.otrosEgresos)}`}
            {cierre.observaciones && ` · “${cierre.observaciones}”`}
          </p>
          {cierre.pedidos !== sistema.pedidos && (
            <Aviso id={`caja-cambio-${branch.id}-${fecha}`} firma={sistema.pedidos}>
              Los pedidos cambiaron después del cierre ({cierre.pedidos} → {sistema.pedidos}). Edita el cierre y guárdalo para actualizar las cifras.
            </Aviso>
          )}
          <button type="button" className="btn btn--ghost" onClick={() => setEditando(true)}>
            Editar cierre
          </button>
        </section>
        <PedidosDelDia pedidos={pedidosDia} />
      </div>
    );
  }

  return (
    <form className="caja-flujo caja-flujo--form" onSubmit={guardar}>
      {ventas}
      <div className="caja-grid">
        <div className="caja-principal">
          <section className="panel-card caja-paso">
            <h2 className="caja-paso__titulo">
              <span>1</span> Fondo y gastos
            </h2>
            <label className="caja-linea">
              <span>
                <strong>Fondo inicial</strong>
                <small>Efectivo con que se abrió la caja.</small>
              </span>
              <Monto value={declarado.fondo_inicial} onChange={set("fondo_inicial")} label="Fondo inicial" />
            </label>
            <label className="caja-linea">
              <span>
                <strong>Pago al repartidor</strong>
                <small>
                  Sugerido: {sistema.deliveries} × {fmt(sistema.tarifa_repartidor)} = {fmt(sistema.total_repartidor)}
                </small>
              </span>
              <Monto value={declarado.pago_repartidor} onChange={set("pago_repartidor")} label="Pago al repartidor" />
            </label>
            {declarado.otros_egresos.map((eg, i) => (
              <div key={i} className="caja-egreso">
                <input
                  value={eg.detalle}
                  placeholder="Otro gasto (ej. gas)"
                  onChange={(e) => setEgreso(i, { detalle: e.target.value })}
                  aria-label="Detalle del gasto"
                />
                <Monto value={eg.monto} onChange={(v) => setEgreso(i, { monto: v })} label="Monto del gasto" />
                <button
                  type="button"
                  aria-label="Quitar gasto"
                  onClick={() => setDeclarado((d) => ({ ...d, otros_egresos: d.otros_egresos.filter((_, j) => j !== i) }))}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              className="caja-toggle"
              onClick={() => setDeclarado((d) => ({ ...d, otros_egresos: [...d.otros_egresos, { detalle: "", monto: "" }] }))}
            >
              + Otro gasto pagado con efectivo
            </button>
            <label className="field">
              <span>Observaciones (opcional)</span>
              <input value={declarado.observaciones} onChange={(e) => set("observaciones")(e.target.value)} />
            </label>
          </section>

          <section className="panel-card caja-paso">
            <h2 className="caja-paso__titulo">
              <span>2</span> Cuenta y anota
            </h2>
            <table className="caja-tabla caja-tabla--conteo">
              <thead>
                <tr>
                  <th>Medio</th>
                  <th className="num">Debería haber</th>
                  <th className="num">Contaste</th>
                  <th className="num">Resultado</th>
                </tr>
              </thead>
              <tbody>
                <Fila
                  titulo="Efectivo"
                  ayuda="Billetes y monedas, con el fondo."
                  deberia={r.esperado}
                  detalle={`${fmt(Number(declarado.fondo_inicial) || 0)} + ${fmt(r.ventasEfectivo)} − ${fmt(r.egresosEfectivo)}`}
                  value={declarado.efectivo_contado}
                  onChange={set("efectivo_contado")}
                  dif={r.difEfectivo}
                />
                <Fila
                  titulo="Débito"
                  ayuda="Total del cierre del POS."
                  deberia={r.ventasDebito}
                  value={declarado.tarjetas}
                  onChange={set("tarjetas")}
                  dif={r.difTarjetas}
                />
                <Fila
                  titulo="Transferencias"
                  ayuda="Lo que llegó a la cuenta."
                  deberia={r.ventasTransferencia}
                  value={declarado.transferencias}
                  onChange={set("transferencias")}
                  dif={r.difTransferencias}
                />
              </tbody>
            </table>
            <p className="panel-muted caja-paso__ayuda">Efectivo que debería haber = fondo + ventas en efectivo − repartidor y gastos.</p>
          </section>
        </div>
        <PedidosDelDia pedidos={pedidosDia} />
      </div>

      <div className="caja-barra">
        <div className="caja-barra__resultado">
          {completo ? (
            <>
              <Resultado value={r.difTotal} grande />
              <small className="panel-muted">{r.difTotal === 0 ? "Todo coincide." : "Revisa el conteo o explícalo en observaciones."}</small>
            </>
          ) : (
            <small className="panel-muted">Anota efectivo, débito y transferencias (0 si no hubo) para ver el resultado.</small>
          )}
        </div>
        <div className="caja-acciones">
          {cierre && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                setDeclarado(fromClosing(cierre));
                setEditando(false);
              }}
            >
              Cancelar
            </button>
          )}
          <button type="submit" className="btn btn--primary" disabled={busy || !completo}>
            {busy ? "Guardando…" : cierre ? "Guardar cambios" : `Cerrar caja de ${branch.name}`}
          </button>
        </div>
      </div>
    </form>
  );
}

// ── Historial ─────────────────────────────────────────────────────────────────
function Historial({ branch, onVer }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchRecentClosings(branch.id, 30)
      .then((r) => !cancelled && (setRows(r), setError("")))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [branch.id]);

  if (error) return <p className="flash flash--error">{error}</p>;
  if (!rows) return <p className="panel-muted">Cargando…</p>;
  if (rows.length === 0) return <p className="panel-muted">Todavía no hay cierres en {branch.name}.</p>;

  const celda = (v) => (v === 0 ? <span className="caja-ok">✓</span> : <Resultado value={v} />);
  return (
    <div className="panel-card caja-historial">
      <p className="panel-muted">Últimos cierres de {branch.name}. Toca un día para ver el detalle.</p>
      <table className="caja-tabla caja-tabla--historial">
        <thead>
          <tr>
            <th>Día</th>
            <th className="num">Vendido</th>
            <th className="num">Efectivo</th>
            <th className="num">Débito</th>
            <th className="num">Transf.</th>
            <th className="num">Resultado</th>
            <th>Cerró</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.fecha} onClick={() => onVer(c.fecha)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onVer(c.fecha)}>
              <td data-label="Día">{formatFecha(c.fecha)}</td>
              <td className="num" data-label="Vendido">
                {fmt(c.ventas_total)}
              </td>
              <td className="num" data-label="Efectivo">
                {celda(c.diferencia_efectivo)}
              </td>
              <td className="num" data-label="Débito">
                {celda(c.diferencia_tarjetas)}
              </td>
              <td className="num" data-label="Transf.">
                {celda(c.diferencia_transferencias)}
              </td>
              <td className="num" data-label="Resultado">
                <Resultado value={c.diferencia_total} />
              </td>
              <td className="panel-muted" data-label="Cerró">
                {c.cerrado_por_nombre}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CajaPage() {
  const panel = useOutletContext();
  const [branches, setBranches] = useState(null);
  const [branchId, setBranchId] = useState("");
  const [fecha, setFecha] = useState(() => isoLocal());
  const [tab, setTab] = useState("cierre");
  const [error, setError] = useState("");
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

  const branch = branches?.find((b) => b.id === branchId);
  const pedidosDia = (panel.orders ?? [])
    .filter((o) => o.sucursal === branch?.name && o.fecha === fecha)
    // Del más reciente al más antiguo (por cuándo se tomó el pedido).
    .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));

  return (
    <div className="panel-page panel-page--wide">
      <div className="panel-head">
        <div>
          <h1 className="panel-title">Caja</h1>
          <p className="panel-muted">Al final del día, cuenta lo que hay y compáralo con lo que se vendió.</p>
        </div>
      </div>
      {flashNode}
      {error && <p className="flash flash--error">{error}</p>}
      {!branches && !error && <p className="panel-muted">Cargando…</p>}

      {branch && (
        <>
          <Tabs
            tabs={[
              { id: "cierre", label: "Cerrar caja" },
              { id: "historial", label: "Historial" },
            ]}
            value={tab}
            onChange={setTab}
          />
          <div className="kanban__bar">
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)} aria-label="Local">
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            {tab === "cierre" && (
              <>
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
              </>
            )}
          </div>
          {tab === "cierre" ? (
            <Cierre key={`${branch.id}|${fecha}`} branch={branch} fecha={fecha} pedidosDia={pedidosDia} flash={flash} />
          ) : (
            <Historial
              branch={branch}
              onVer={(f) => {
                setFecha(f);
                setTab("cierre");
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
