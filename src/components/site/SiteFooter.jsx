import { Link } from "react-router";
import { BrandLogo } from "./Brand.jsx";
import { InstagramIcon, WhatsAppIcon } from "./Icons.jsx";
import { SITE } from "../../content/site.js";
import { waLink } from "../../utils/whatsapp.js";

export default function SiteFooter({ whatsappNum, site }) {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__social">
          <span className="site-footer__label">Síguenos</span>
          <div className="site-footer__icons">
            <a href={site.instagram} target="_blank" rel="noreferrer" aria-label="Instagram">
              <InstagramIcon />
            </a>
            {whatsappNum && (
              <a href={waLink(whatsappNum)} target="_blank" rel="noreferrer" aria-label="WhatsApp">
                <WhatsAppIcon />
              </a>
            )}
          </div>
        </div>

        <div className="site-footer__info">
          <p>Horario de atención: {site.horario}</p>
          <p className="site-footer__links">
            <span>© {new Date().getFullYear()} {SITE.nombre}</span>
            <Link to="/locales">Locales</Link>
            <Link to="/login">Acceso equipo</Link>
          </p>
        </div>

        <BrandLogo size="sm" />
      </div>
    </footer>
  );
}
