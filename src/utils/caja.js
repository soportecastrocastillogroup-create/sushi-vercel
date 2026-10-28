// Cuadratura de caja (PRD 02 · 5.4). Misma fórmula que save_cash_closing()
// en la base (migración half_hour_blocks); tests/db/caja.test.js compara ambas.
//
// Desde el 26 oct 2026 el pago es efectivo, débito o transferencia. Los
// pedidos anteriores con "pago al retirar" cuentan como efectivo: si se
// pagaron con tarjeta, la diferencia de efectivo y la de tarjetas se
// compensan en la diferencia total. El repartidor y los otros egresos se
// pagan en efectivo; el pago al repartidor se puede anotar a mano
// (declarado.pago_repartidor) y, si está vacío, es deliveries × tarifa.

const n = (v) => Math.round(Number(v) || 0);

export function calcularCuadratura(sistema, declarado) {
  const porMetodo = sistema?.ventas_por_metodo ?? {};
  const ventasEfectivo = n(porMetodo.efectivo) + n(porMetodo.pago_contra_entrega);
  const ventasDebito = n(porMetodo.debito);
  const ventasTransferencia = n(porMetodo.transferencia);
  const otrosEgresos = (declarado.otros_egresos ?? []).reduce((s, e) => s + Math.max(0, n(e.monto)), 0);
  const repartidor =
    declarado.pago_repartidor === "" || declarado.pago_repartidor == null ? n(sistema?.total_repartidor) : n(declarado.pago_repartidor);
  const egresosEfectivo = repartidor + otrosEgresos;
  const esperado = n(declarado.fondo_inicial) + ventasEfectivo - egresosEfectivo;
  const difEfectivo = n(declarado.efectivo_contado) - esperado;
  const difTransferencias = n(declarado.transferencias) - ventasTransferencia;
  const difTarjetas = n(declarado.tarjetas) - ventasDebito;
  return {
    ventasEfectivo,
    ventasDebito,
    ventasTransferencia,
    repartidor,
    otrosEgresos,
    egresosEfectivo,
    esperado,
    difEfectivo,
    difTransferencias,
    difTarjetas,
    difTotal: difEfectivo + difTransferencias + difTarjetas,
  };
}
