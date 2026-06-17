export const labelCompletado = (tipo) =>
  tipo === "delivery" ? "Entregado" : "Recibido";

export const emptyForm = (fuente = "web", defaultBranch = "Loncoche") => ({
  sucursal: defaultBranch,
  cart: [],
  tipo: "retiro",
  direccion: "",
  referencia: "",
  fecha: new Date().toISOString().split("T")[0],
  horario: "",
  cliente: { nombre: "", telefono: "" },
  metodoPago: "transferencia",
  observaciones: "",
  fuente,
});
