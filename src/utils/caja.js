// Cuadratura de caja (PRD 02 · 5.4). Misma fórmula que save_cash_closing()
// en la base (migración cash_closings); tests/db/caja.test.js compara ambas.
//
// "Pago al retirar" no distingue tarjeta de efectivo: las ventas en efectivo
// son las de "pago al retirar" menos lo declarado en tarjetas. El repartidor y
// los otros egresos se pagan en efectivo.

const n = (v) => Math.round(Number(v) || 0);

export function calcularCuadratura(sistema, declarado) {
  const ventasRetiro = n(sistema?.ventas_por_metodo?.pago_contra_entrega);
  const ventasTransferencia = n(sistema?.ventas_por_metodo?.transferencia);
  const otrosEgresos = (declarado.otros_egresos ?? []).reduce((s, e) => s + Math.max(0, n(e.monto)), 0);
  const egresosEfectivo = n(sistema?.total_repartidor) + otrosEgresos;
  const ventasEfectivo = ventasRetiro - n(declarado.tarjetas);
  const esperado = n(declarado.fondo_inicial) + ventasEfectivo - egresosEfectivo;
  const difEfectivo = n(declarado.efectivo_contado) - esperado;
  const difTransferencias = n(declarado.transferencias) - ventasTransferencia;
  return {
    ventasRetiro,
    ventasTransferencia,
    ventasEfectivo,
    otrosEgresos,
    egresosEfectivo,
    esperado,
    difEfectivo,
    difTransferencias,
    difTotal: difEfectivo + difTransferencias,
  };
}
