/* eslint-disable react-refresh/only-export-components */
import { fmt } from "../../utils/format.js";
import { cambiosCosto } from "../../utils/cart.js";
import { FUENTES, getPagos } from "../../constants/estados.js";

export function buildComandaData(order, costoDelivery = 0) {
  const sub = order.items.reduce(
    (s, i) => s + (i.precio + cambiosCosto(i.cambios)) * i.qty,
    0
  );
  const del = order.tipo === "delivery" ? costoDelivery : 0;
  return { sub, del, tot: sub + del };
}

export function ComandaPreview({ order, onClose, settings }) {
  const { sub, del, tot } = buildComandaData(order, settings.costoDelivery);
  const pagos = getPagos(order.tipo);
  const pago =
    pagos.find((m) => m.id === order.metodoPago)?.label || order.metodoPago;
  const src = FUENTES.find((f) => f.id === order.fuente)?.label || order.fuente;
  const hora = new Date(order.timestamp).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const fecha = new Date(order.timestamp).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const divider = <div style={{ borderTop: "1.5px dashed #CCC", margin: "10px 0" }} />;
  const row = (l, v, b = false) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 4,
        gap: 8,
      }}
    >
      <span style={{ color: "#888", fontSize: 12, whiteSpace: "nowrap" }}>
        {l}
      </span>
      <span
        style={{
          color: b ? "#000" : "#333",
          fontSize: 12,
          fontWeight: b ? 700 : 400,
          textAlign: "right",
        }}
      >
        {v}
      </span>
    </div>
  );
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.88)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        overflowY: "auto",
      }}
    >
      <div
        style={{
          background: "#141914",
          borderRadius: 16,
          border: "1px solid #252F28",
          maxWidth: 440,
          width: "100%",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #1E2820",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ color: "#F0EBE0", fontWeight: 700, fontSize: 15 }}>
            Vista previa comanda
          </span>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#50605A",
              fontSize: 22,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: 20, display: "flex", justifyContent: "center" }}>
          <div
            style={{
              background: "#FAFAF8",
              fontFamily: "'Courier New',monospace",
              width: "100%",
              maxWidth: 300,
              borderRadius: 4,
              padding: "20px 18px 28px",
              boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -10,
                left: 0,
                right: 0,
                height: 10,
                background:
                  "repeating-linear-gradient(90deg,#FAFAF8 0,#FAFAF8 10px,transparent 10px,transparent 14px)",
              }}
            />
            <div style={{ textAlign: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>🍣</div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#111",
                  letterSpacing: 1,
                }}
              >
                SUSHI LONCOCHE
              </div>
              <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
                Sistema de Pedidos
              </div>
            </div>
            {divider}
            {row("N° Pedido", order.orderId, true)}
            {row("Fecha", fecha)}
            {row("Hora", hora)}
            {row("Sucursal", order.sucursal)}
            {row("Origen", src)}
            {divider}
            {row("Cliente", order.cliente.nombre || "—", true)}
            {order.cliente.telefono && row("Teléfono", order.cliente.telefono)}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 6,
                marginTop: 2,
              }}
            >
              <span style={{ fontSize: 12, color: "#888" }}>Tipo</span>
              <span
                style={{
                  background: order.tipo === "delivery" ? "#1a1a1a" : "#2a4a2a",
                  color: order.tipo === "delivery" ? "#fff" : "#90EE90",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 3,
                }}
              >
                {order.tipo === "delivery" ? "🚗 DELIVERY" : "🏪 RETIRO"}
              </span>
            </div>
            {order.tipo === "delivery" && order.direccion && row("Dirección", order.direccion)}
            {order.tipo === "delivery" && order.referencia && row("Referencia", order.referencia)}
            {row("Horario", order.horario)}
            {row("Pago", pago)}
            {divider}
            <div
              style={{
                fontSize: 11,
                color: "#888",
                fontWeight: 700,
                marginBottom: 6,
                letterSpacing: 1,
              }}
            >
              PRODUCTOS
            </div>
            {order.items.map((item, i) => (
              <div key={i} style={{ marginBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: "#111", fontWeight: 600 }}>
                    {item.qty}× {item.nombre}
                  </span>
                  <span style={{ fontSize: 13, color: "#444" }}>
                    {fmt(
                      (item.precio + cambiosCosto(item.cambios)) * item.qty
                    )}
                  </span>
                </div>
                {item.desc && (
                  <div style={{ fontSize: 11, color: "#888", paddingLeft: 12 }}>
                    {item.desc}
                  </div>
                )}
                {item.opcionesStr && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "#c04000",
                      paddingLeft: 12,
                      fontWeight: 700,
                    }}
                  >
                    🎯 {item.opcionesStr}
                  </div>
                )}
                {item.cambios.map((c, j) => (
                  <div
                    key={j}
                    style={{
                      fontSize: 11,
                      color: "#555",
                      paddingLeft: 12,
                      marginTop: 1,
                    }}
                  >
                    ↳ Cambio {c.tipo}: {c.nombre} (+{fmt(c.precio)})
                  </div>
                ))}
              </div>
            ))}
            {divider}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 3,
              }}
            >
              <span style={{ fontSize: 12, color: "#666" }}>Subtotal</span>
              <span style={{ fontSize: 12, color: "#444" }}>{fmt(sub)}</span>
            </div>
            {del > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 3,
                }}
              >
                <span style={{ fontSize: 12, color: "#666" }}>Despacho</span>
                <span style={{ fontSize: 12, color: "#444" }}>{fmt(del)}</span>
              </div>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 4,
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 700, color: "#000" }}>
                TOTAL
              </span>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#000" }}>
                {fmt(tot)}
              </span>
            </div>
            {order.observaciones && (
              <>
                {divider}
                <div
                  style={{
                    background: "#F0F0EE",
                    borderRadius: 4,
                    padding: "6px 10px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: "#888",
                      fontWeight: 700,
                      marginBottom: 2,
                    }}
                  >
                    OBSERVACIONES
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#333",
                      fontStyle: "italic",
                    }}
                  >
                    {order.observaciones}
                  </div>
                </div>
              </>
            )}
            {divider}
            <div style={{ textAlign: "center", fontSize: 10, color: "#BBB" }}>
              Impreso {new Date().toLocaleString("es-CL")}
            </div>
            <div
              style={{
                position: "absolute",
                bottom: -10,
                left: 0,
                right: 0,
                height: 10,
                background:
                  "repeating-linear-gradient(90deg,#FAFAF8 0,#FAFAF8 10px,transparent 10px,transparent 14px)",
              }}
            />
          </div>
        </div>
        <div style={{ padding: "0 20px 20px", display: "flex", gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "10px",
              background: "transparent",
              border: "1px solid #252F28",
              borderRadius: 8,
              color: "#50605A",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Cerrar
          </button>
          <button
            onClick={() => printComanda(order, settings.costoDelivery)}
            style={{
              flex: 2,
              padding: "10px",
              background: "#C9A84C",
              border: "none",
              borderRadius: 8,
              color: "#0A0D0A",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            🖨️ Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}

export function printComanda(order, costoDelivery = 0) {
  const { sub, del, tot } = buildComandaData(order, costoDelivery);
  const pagos = getPagos(order.tipo);
  const pago =
    pagos.find((m) => m.id === order.metodoPago)?.label || order.metodoPago;
  const src = FUENTES.find((f) => f.id === order.fuente)?.label || order.fuente;
  const hora = new Date(order.timestamp).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const win = window.open("", "_blank", "width=380,height=720");
  win.document.write(`<html><head><title>Comanda ${order.orderId}</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Courier New',monospace;font-size:13px;padding:16px;max-width:320px;color:#000}
  h1{font-size:18px;text-align:center;margin-bottom:4px}.sub{text-align:center;font-size:11px;color:#666;margin-bottom:12px}
  .row{display:flex;justify-content:space-between;margin-bottom:3px}.divider{border:none;border-top:1px dashed #aaa;margin:10px 0}
  .label{color:#555}.total-row{font-size:16px;font-weight:bold}
  .badge{display:inline-block;padding:2px 8px;background:#000;color:#fff;border-radius:4px;font-size:11px}
  .cambio{font-size:11px;color:#666;padding-left:12px;margin:1px 0}</style></head><body>
  <h1>🍣 SUSHI LONCOCHE</h1><div class="sub">Sistema de Pedidos</div><hr class="divider">
  <div class="row"><span class="label">Pedido</span><strong>${order.orderId}</strong></div>
  <div class="row"><span class="label">Hora</span><span>${hora}</span></div>
  <div class="row"><span class="label">Sucursal</span><span>${order.sucursal}</span></div>
  <div class="row"><span class="label">Origen</span><span>${src}</span></div>
  <hr class="divider">
  <div class="row"><span class="label">Cliente</span><strong>${order.cliente.nombre || "—"}</strong></div>
  ${order.cliente.telefono ? `<div class="row"><span class="label">Teléfono</span><span>${order.cliente.telefono}</span></div>` : ""}
  <div class="row"><span class="label">Tipo</span><span class="badge">${order.tipo === "delivery" ? "🚗 DELIVERY" : "🏪 RETIRO"}</span></div>
  ${order.tipo === "delivery" && order.direccion ? `<div class="row"><span class="label">Dirección</span><span style="max-width:180px;text-align:right">${order.direccion}</span></div>` : ""}
  ${order.tipo === "delivery" && order.referencia ? `<div class="row"><span class="label">Referencia</span><span>${order.referencia}</span></div>` : ""}
  <div class="row"><span class="label">Horario</span><span>${order.horario}</span></div>
  <div class="row"><span class="label">Pago</span><span style="max-width:180px;text-align:right">${pago}</span></div>
  <hr class="divider">
  ${order.items
    .map(
      (i) => `
    <div class="row"><span><strong>${i.qty}x</strong> ${i.nombre}</span><span>${fmt((i.precio + cambiosCosto(i.cambios)) * i.qty)}</span></div>
    ${i.desc ? `<div class="cambio">${i.desc}</div>` : ""}
    ${i.opcionesStr ? `<div class="cambio" style="color:#c04000;font-weight:bold">🎯 ${i.opcionesStr}</div>` : ""}
    ${i.cambios.map((c) => `<div class="cambio">↳ Cambio ${c.tipo}: ${c.nombre} (+${fmt(c.precio)})</div>`).join("")}
    ${i.obsModal ? `<div class="cambio" style="color:#2a6a2a;font-style:italic">📝 ${i.obsModal}</div>` : ""}
  `
    )
    .join("")}
  <hr class="divider">
  <div class="row"><span class="label">Subtotal</span><span>${fmt(sub)}</span></div>
  ${del > 0 ? `<div class="row"><span class="label">Despacho</span><span>${fmt(del)}</span></div>` : ""}
  <div class="row total-row"><span>TOTAL</span><span>${fmt(tot)}</span></div>
  ${order.observaciones ? `<hr class="divider"><div style="background:#f5f5f5;border:1px solid #ddd;border-radius:4px;padding:6px;font-style:italic">💬 ${order.observaciones}</div>` : ""}
  <hr class="divider"><p style="text-align:center;font-size:10px;color:#aaa">Impreso ${new Date().toLocaleString("es-CL")}</p>
  <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)};</script>
  </body></html>`);
  win.document.close();
}
