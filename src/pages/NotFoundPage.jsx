import { Link } from "react-router";
import { usePageTitle } from "../hooks/usePageTitle.js";

export default function NotFoundPage() {
  usePageTitle("Página no encontrada · Sushi Loncoche");
  return (
    <div className="page-state page-state--full">
      <p className="page-head__kicker">Error 404</p>
      <h1 className="page-head__title">Página no encontrada</h1>
      <Link to="/" className="btn btn--primary">Volver al inicio</Link>
    </div>
  );
}
