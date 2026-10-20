import { useState } from "react";
import { fmt } from "../../utils/format.js";
import { bloquesDe, cupoDe, formatFecha, horaDe, isoLocal, pedidosEnHora, sumarDias } from "../../utils/dates.js";
import { labelCompletado } from "../../utils/orders.js";
import { ESTADOS, FUENTES } from "../../constants/estados.js";
import { buildComandaData } from "../shared/Comanda.jsx";
import OrderCard from "../shared/OrderCard.jsx";
import { Dialog } from "../../panel/ui.jsx";

// Franja de destino al mover un pedido a otro bloque: conserva los minutos si
// esa franja existe ("20:15" → "21:15"); si no, la primera franja del bloque.
const franjaEnBloque = (timeSlots, bloque, horario) => {
  const mismaHora = `${bloque}:${String(horario).split(":")[1] ?? "00"}`;
  if (timeSlots.includes(mismaHora)) return mismaHora;
  return timeSlots.find((h) => horaDe(h) === bloque) ?? `${bloque}:00`;
};

// ── KANBAN DE PEDIDOS (PRD 02 · Etapa 2) ─────────────────────────────────────
// Un día y una sucursal; una columna por bloque de una hora con su ocupación.
export default function OrdersKanban({ orders, settings, branches, onStatusChange, onUpdateOrder, onDeleteOrder, onEdit }) {
  const [sucursal, setSucursal] = useState(branches[0]);
  const [fecha, setFecha] = useState(() => isoLocal());
  const [detalleId, setDetalleId] = useState(null);
  const [arrastrando, setArrastrando] = useState(null);
  const [destino, setDestino] = useState(null);

  const cupo = cupoDe(settings, sucursal);
  const delDia = orders.filter((o) => o.fecha === fecha && o.sucursal === sucursal);
  const bloques = [...new Set([...bloquesDe(settings.timeSlots), ...delDia.map((o) => horaDe(o.horario))])].sort();
  const detalle = orders.find((o) => o.id === detalleId);

  const stats = {
    total: delDia.length,
    abiertos: delDia.filter((o) => o.estado === "abierto").length,
    enProceso: delDia.filter((o) => o.estado === "en_proceso").length,
    listos: delDia.filter((o) => o.estado === "listo").length,
  };

  const mover = (order, bloque) => {
    if (horaDe(order.horario) === bloque) return;
    const ocupados = pedidosEnHora(order.fecha, orders, `${bloque}:00`, order.sucursal);
    if (ocupados >= cupo && !window.confirm(`El bloque de las ${bloque}:00 está lleno (${ocupados}/${cupo}). ¿Mover igual?`)) return;
    onUpdateOrder(order.id, { ...order, horario: franjaEnBloque(settings.timeSlots, bloque, order.horario) });
  };

  const cambiarHora = (order, horario) => {
    if (horaDe(horario) !== horaDe(order.horario)) {
      const ocupados = pedidosEnHora(order.fecha, orders, horario, order.sucursal);
      if (ocupados >= cupo && !window.confirm(`El bloque de las ${horaDe(horario)}:00 está lleno (${ocupados}/${cupo}). ¿Mover igual?`)) return;
    }
    onUpdateOrder(order.id, { ...order, horario });
  };

  return (
    <div className="kanban">
      <div className="kanban__bar">
        <select value={sucursal} onChange={(e) => setSucursal(e.target.value)} aria-label="Sucursal">
          {branches.map((s) => (
            <option key={s} value={s}>
              {s}
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
        <span className="kanban__cupo">Cupo: {cupo} por hora</span>
      </div>

      <div className="kanban__stats">
        {[
          { l: "Pedidos del día", v: stats.total, c: "#DCDCE0" },
          { l: "Abiertos", v: stats.abiertos, c: ESTADOS.abierto.color },
          { l: "En proceso", v: stats.enProceso, c: ESTADOS.en_proceso.color },
          { l: "Listos", v: stats.listos, c: ESTADOS.listo.color },
        ].map((s) => (
          <div key={s.l}>
            <strong style={{ color: s.c }}>{s.v}</strong>
            <span>{s.l}</span>
          </div>
        ))}
      </div>

      <div className="kanban__cols">
        {bloques.map((b) => {
          const pedidos = delDia
            .filter((o) => horaDe(o.horario) === b)
            .sort((x, y) => x.horario.localeCompare(y.horario) || new Date(x.timestamp) - new Date(y.timestamp));
          const estadoCol = pedidos.length > cupo ? "is-over" : pedidos.length === cupo ? "is-full" : "";
          return (
            <section
              key={b}
              className={`kanban__col ${estadoCol} ${destino === b ? "is-target" : ""}`}
              onDragOver={(e) => {
                if (!arrastrando) return;
                e.preventDefault();
                setDestino(b);
              }}
              onDragLeave={() => setDestino((d) => (d === b ? null : d))}
              onDrop={(e) => {
                e.preventDefault();
                const order = orders.find((o) => o.id === arrastrando);
                setArrastrando(null);
                setDestino(null);
                if (order) mover(order, b);
              }}
            >
              <header className="kanban__col-head">
                <h3>{b}:00</h3>
                <span className="kanban__occ">
                  {pedidos.length} / {cupo}
                  {estadoCol && <em>{estadoCol === "is-over" ? " · sobrecupo" : " · lleno"}</em>}
                </span>
              </header>
              {pedidos.length === 0 && <p className="kanban__empty">Sin pedidos</p>}
              {pedidos.map((o) => (
                <KanbanCard
                  key={o.id}
                  order={o}
                  settings={settings}
                  onOpen={() => setDetalleId(o.id)}
                  onStatusChange={onStatusChange}
                  onChangeHora={(h) => cambiarHora(o, h)}
                  onDragStart={() => setArrastrando(o.id)}
                  onDragEnd={() => {
                    setArrastrando(null);
                    setDestino(null);
                  }}
                />
              ))}
            </section>
          );
        })}
      </div>

      {detalle && (
        <Dialog title={`Pedido ${detalle.orderId}`} onClose={() => setDetalleId(null)}>
          <OrderCard
            order={detalle}
            settings={settings}
            onStatusChange={onStatusChange}
            onDelete={(id) => {
              setDetalleId(null);
              onDeleteOrder(id);
            }}
            onEdit={(o) => {
              setDetalleId(null);
              onEdit(o);
            }}
          />
        </Dialog>
      )}
    </div>
  );
}

function KanbanCard({ order, settings, onOpen, onStatusChange, onChangeHora, onDragStart, onDragEnd }) {
  const estado = ESTADOS[order.estado] ?? ESTADOS.abierto;
  const total = order.total ?? buildComandaData(order, settings.costoDelivery).tot;
  const fuente = FUENTES.find((f) => f.id === order.fuente)?.label || order.fuente;
  const etiqueta = (e) => (e === "completado" ? labelCompletado(order.tipo) : ESTADOS[e].label);
  const horas = settings.timeSlots.includes(order.horario) ? settings.timeSlots : [order.horario, ...settings.timeSlots];

  return (
    <article
      className={`kcard ${order.estado === "completado" ? "is-done" : ""}`}
      style={{ borderLeftColor: estado.color }}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", order.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
    >
      <button type="button" className="kcard__main" onClick={onOpen}>
        <span className="kcard__top">
          <b>{order.orderId}</b>
          <span>{order.horario}</span>
          <span className="kcard__estado" style={{ background: estado.bg, color: estado.color }}>
            {etiqueta(order.estado)}
          </span>
        </span>
        <span className="kcard__cliente">{order.cliente.nombre || "Sin nombre"}</span>
        <span className="kcard__meta">
          {order.tipo === "delivery" ? "🚗 Delivery" : "🏪 Retiro"} · {fuente} · <b>{fmt(total)}</b>
        </span>
      </button>
      <div className="kcard__actions">
        {estado.prev && (
          <button type="button" onClick={() => onStatusChange(order.id, estado.prev)} title={`Volver a ${etiqueta(estado.prev)}`}>
            ←
          </button>
        )}
        {estado.next && (
          <button
            type="button"
            className="kcard__next"
            style={{ color: ESTADOS[estado.next].color }}
            onClick={() => onStatusChange(order.id, estado.next)}
          >
            → {etiqueta(estado.next)}
          </button>
        )}
        <select value={order.horario} onChange={(e) => onChangeHora(e.target.value)} aria-label={`Cambiar hora de ${order.orderId}`}>
          {horas.map((h) => (
            <option key={h} value={h}>
              ⏰ {h}
            </option>
          ))}
        </select>
      </div>
    </article>
  );
}
