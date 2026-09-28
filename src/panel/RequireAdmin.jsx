import { Navigate } from "react-router";
import { useAuth } from "../context/auth-context.js";

export default function RequireAdmin({ children }) {
  const { isAdmin } = useAuth();
  return isAdmin ? children : <Navigate to="/panel/pedidos" replace />;
}
