import { useEffect } from "react";
import { Outlet, useLocation } from "react-router";
import SiteHeader from "./SiteHeader.jsx";
import SiteFooter from "./SiteFooter.jsx";
import MobileActionBar from "./MobileActionBar.jsx";
import CartDrawer from "./CartDrawer.jsx";
import CartProvider from "../../context/CartProvider.jsx";
import { useCart } from "../../context/cart-context.js";
import { useSettings } from "../../hooks/useSettings.js";
import { usePublicMenu } from "../../hooks/usePublicMenu.js";
import { usePublicSite } from "../../hooks/usePublicSite.js";

function SiteShell() {
  const { pathname } = useLocation();
  const { settings } = useSettings();
  const publicMenu = usePublicMenu();
  const site = usePublicSite();
  const cart = useCart();

  const whatsappNum = settings?.whatsappNum;
  const { branches, menu } = publicMenu;
  const branch = branches.includes(cart.branch) ? cart.branch : branches[0];
  const changeBranch = (b) => cart.setBranch(b, menu);
  // En /carta la barra inferior se reemplaza por el botón "Ver pedido".
  const showBar = pathname !== "/carta";

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className={`site${showBar ? " site--with-bar" : ""}`}>
      <SiteHeader
        whatsappNum={whatsappNum}
        site={site}
        branches={branches}
        branch={branch}
        onBranchChange={changeBranch}
      />
      <main className="site-main">
        <Outlet context={{ whatsappNum, publicMenu, branch, changeBranch, site }} />
      </main>
      <SiteFooter whatsappNum={whatsappNum} site={site} />
      {showBar && <MobileActionBar whatsappNum={whatsappNum} />}
      <CartDrawer
        branch={branch}
        branches={branches}
        onBranchChange={changeBranch}
        costoDelivery={settings?.costoDelivery}
        horario={site.horario}
        whatsappNum={whatsappNum}
      />
    </div>
  );
}

export default function SiteLayout() {
  return (
    <CartProvider>
      <SiteShell />
    </CartProvider>
  );
}
