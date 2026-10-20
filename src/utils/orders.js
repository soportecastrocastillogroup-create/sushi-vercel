import { isoLocal } from "./dates.js";

export const labelCompletado = (tipo) =>
  tipo === "delivery" ? "Entregado" : "Recibido";

export const emptyForm = (fuente = "web", defaultBranch = "Loncoche") => ({
  sucursal: defaultBranch,
  cart: [],
  tipo: "retiro",
  direccion: "",
  referencia: "",
  fecha: isoLocal(),
  horario: "",
  cliente: { nombre: "", telefono: "" },
  metodoPago: "transferencia",
  observaciones: "",
  fuente,
});
