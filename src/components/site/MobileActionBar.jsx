import { Link } from "react-router";
import { MenuBookIcon, WhatsAppIcon } from "./Icons.jsx";
import { waLink } from "../../utils/whatsapp.js";

// Barra fija inferior en móvil, equivalente a "Carta / Repetir pedido" de la
// referencia. "Repetir pedido" requiere cuentas de cliente (fuera de alcance),
// por eso el segundo botón es WhatsApp.
export default function MobileActionBar({ whatsappNum }) {
  return (
    <div className="mobile-bar">
      <Link to="/carta" className="mobile-bar__btn mobile-bar__btn--primary">
        <MenuBookIcon /> Carta
      </Link>
      {whatsappNum && (
        <a className="mobile-bar__btn" href={waLink(whatsappNum)} target="_blank" rel="noreferrer">
          <WhatsAppIcon /> WhatsApp
        </a>
      )}
    </div>
  );
}
