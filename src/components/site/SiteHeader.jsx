import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router";
import { BrandLogo } from "./Brand.jsx";
import BranchSelect from "./BranchSelect.jsx";
import { useCart } from "../../context/cart-context.js";
import { BagIcon, CloseIcon, InstagramIcon, MenuIcon, UserIcon, WhatsAppIcon } from "./Icons.jsx";
import { waLink } from "../../utils/whatsapp.js";

const pill = ({ isActive }) => `site-nav__pill${isActive ? " is-active" : ""}`;

export default function SiteHeader({ whatsappNum, site, branches, branch, onBranchChange }) {
  const [open, setOpen] = useState(false);
  const cart = useCart();
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to="/" className="site-header__logo" aria-label="Sushi Loncoche, inicio">
          <BrandLogo />
        </Link>

        <nav className="site-nav" aria-label="Principal">
          <NavLink to="/carta" className={pill}>Carta</NavLink>
          <NavLink to="/locales" className={pill}>Locales</NavLink>
          <BranchSelect branches={branches} value={branch} onChange={onBranchChange} />
        </nav>

        <div className="site-header__actions">
          <button
            type="button"
            className="icon-btn icon-btn--cart"
            aria-label={cart.count ? `Ver pedido, ${cart.count} productos` : "Ver pedido"}
            onClick={() => cart.setOpen(true)}
          >
            <BagIcon />
            {cart.count > 0 && <span className="icon-btn__badge">{cart.count}</span>}
          </button>
          <Link to="/login" className="icon-btn icon-btn--desktop" aria-label="Acceso del equipo">
            <UserIcon />
          </Link>
          <button
            type="button"
            className="icon-btn icon-btn--mobile"
            aria-label="Abrir menú"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <MenuIcon />
          </button>
        </div>
      </div>

      {open && (
        <div className="drawer" role="dialog" aria-modal="true" aria-label="Menú">
          <button type="button" className="drawer__backdrop" aria-label="Cerrar menú" onClick={() => setOpen(false)} />
          <div className="drawer__panel" onClick={(e) => e.target.closest("a") && setOpen(false)}>
            <div className="drawer__top">
              <BrandLogo size="sm" />
              <button type="button" className="icon-btn" aria-label="Cerrar menú" onClick={() => setOpen(false)}>
                <CloseIcon />
              </button>
            </div>
            <NavLink to="/" end className="drawer__link">Inicio</NavLink>
            <NavLink to="/carta" className="drawer__link">Carta</NavLink>
            <NavLink to="/locales" className="drawer__link">Locales</NavLink>
            <div className="drawer__sep" />
            {whatsappNum && (
              <a className="drawer__link drawer__link--icon" href={waLink(whatsappNum)} target="_blank" rel="noreferrer">
                <WhatsAppIcon /> WhatsApp
              </a>
            )}
            <a className="drawer__link drawer__link--icon" href={site.instagram} target="_blank" rel="noreferrer">
              <InstagramIcon /> Instagram
            </a>
            <Link to="/login" className="drawer__link drawer__link--icon drawer__link--muted">
              <UserIcon /> Acceso equipo
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
