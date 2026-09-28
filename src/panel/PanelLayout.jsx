import { useEffect, useRef, useState } from "react";
import { Link, Navigate, NavLink, Outlet, useLocation } from "react-router";
import { useAuth } from "../context/auth-context.js";
import { useOrderingData } from "../hooks/useOrderingData.js";
import { usePageTitle } from "../hooks/usePageTitle.js";
import { BrandLogo } from "../components/site/Brand.jsx";
import { UserIcon } from "../components/site/Icons.jsx";
import "../styles/panel.css";

const ROL_LABEL = { administrador: "Administrador", colaborador: "Colaborador" };

function UserMenu({ profile, onSignOut }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  return (
    <div className="user-menu" ref={ref}>
      <button type="button" className="user-menu__btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <UserIcon width={18} height={18} />
        <span className="user-menu__name">{profile.nombre}</span>
      </button>
      {open && (
        <div className="user-menu__pop">
          <p className="user-menu__who">
            <strong>{profile.nombre}</strong>
            <span>{profile.email}</span>
            <span className={`role-badge role-badge--${profile.rol}`}>{ROL_LABEL[profile.rol]}</span>
          </p>
          <Link to="/panel/cuenta" onClick={() => setOpen(false)}>
            Cambiar contraseña
          </Link>
          <Link to="/" onClick={() => setOpen(false)}>
            Ver sitio público
          </Link>
          <button type="button" onClick={onSignOut}>
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

function PanelShell() {
  usePageTitle("Panel · Sushi Loncoche");
  const auth = useAuth();
  const data = useOrderingData();
  const pending = data.orders.filter((o) => o.estado === "abierto").length;

  const nav = [
    { to: "/panel/pedidos", label: "Pedidos", badge: pending },
    { to: "/panel/nuevo-pedido", label: "Nuevo pedido" },
    { to: "/panel/cocina", label: "Cocina" },
    ...(auth.isAdmin
      ? [
          { to: "/panel/carta", label: "Carta" },
          { to: "/panel/sitio", label: "Sitio" },
          { to: "/panel/reportes", label: "Reportes" },
          { to: "/panel/usuarios", label: "Usuarios" },
        ]
      : []),
  ];

  return (
    <div className="panel">
      <header className="panel-bar">
        <div className="panel-bar__inner">
          <Link to="/panel" className="panel-bar__logo" aria-label="Inicio del panel">
            <BrandLogo size="sm" />
            <span className="panel-bar__tag">Equipo</span>
          </Link>
          <nav className="panel-nav" aria-label="Secciones">
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} className="panel-nav__link">
                {n.label}
                {n.badge > 0 && <span className="panel-nav__badge">{n.badge}</span>}
              </NavLink>
            ))}
          </nav>
          <UserMenu profile={auth.profile} onSignOut={auth.signOut} />
        </div>
      </header>

      <main className="panel-main">
        {!data.loaded ? (
          <div className="page-state" role="status">
            <span className="spinner" aria-hidden="true" />
            Cargando datos…
          </div>
        ) : data.loadError ? (
          <div className="page-state">
            <p>No pudimos cargar los datos del panel.</p>
            <p className="panel-muted">{data.loadError}</p>
            <button type="button" className="btn btn--primary" onClick={data.refreshAll}>
              Reintentar
            </button>
          </div>
        ) : (
          <Outlet context={data} />
        )}
      </main>
    </div>
  );
}

// Protege todo /panel: exige sesión y un perfil de equipo activo.
export default function PanelLayout() {
  const auth = useAuth();
  const location = useLocation();

  if (auth.loading) {
    return (
      <div className="panel panel--center">
        <span className="spinner" aria-label="Cargando" />
      </div>
    );
  }
  if (!auth.session || !auth.profile?.active) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <PanelShell />;
}
