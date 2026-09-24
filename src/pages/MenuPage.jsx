import { useMemo, useState } from "react";
import { useOutletContext } from "react-router";
import { useCart } from "../context/cart-context.js";
import ProductArt from "../components/site/ProductArt.jsx";
import ProductModal from "../components/site/ProductModal.jsx";
import { BagIcon } from "../components/site/Icons.jsx";
import { fmt } from "../utils/format.js";
import { usePageTitle } from "../hooks/usePageTitle.js";

const normalize = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export default function MenuPage() {
  usePageTitle("Carta · Sushi Loncoche");
  const { publicMenu, branch, changeBranch } = useOutletContext();
  const { menu, branches, stock, loading, error, reload } = publicMenu;
  const cart = useCart();
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState(null);
  const [selected, setSelected] = useState(null);

  const visible = useMemo(() => menu.filter((m) => m.sucursales.includes(branch)), [menu, branch]);
  const cats = useMemo(() => [...new Set(visible.map((m) => m.cat))], [visible]);
  const activeCat = cats.includes(cat) ? cat : cats[0];

  const q = normalize(query.trim());
  const products = q
    ? visible.filter((m) => normalize(`${m.nombre} ${m.desc || ""} ${m.cat}`).includes(q))
    : visible.filter((m) => m.cat === activeCat);

  const available = (p) => stock[p.id] !== false;

  const quickAdd = (p) => {
    if (!available(p)) return;
    if (p.opciones?.length || p.rolls?.length) return setSelected(p);
    cart.add(p);
  };

  if (loading) {
    return (
      <div className="page-state" role="status">
        <span className="spinner" aria-hidden="true" />
        Cargando la carta…
      </div>
    );
  }
  if (error) {
    return (
      <div className="page-state">
        <p>No pudimos cargar la carta en este momento.</p>
        <button type="button" className="btn btn--primary" onClick={reload}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="menu">
      <aside className="menu__side">
        <label className="menu__search">
          <span className="sr-only">Buscar</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Busca tu roll" type="search" />
        </label>

        {branches.length > 1 && (
          <div className="seg menu__branch" role="group" aria-label="Sucursal">
            {branches.map((b) => (
              <button key={b} type="button" className={b === branch ? "is-active" : ""} aria-pressed={b === branch} onClick={() => changeBranch(b)}>
                {b}
              </button>
            ))}
          </div>
        )}

        <nav className="menu__cats" aria-label="Categorías">
          {cats.map((c) => (
            <button
              key={c}
              type="button"
              className={!q && c === activeCat ? "is-active" : ""}
              aria-current={!q && c === activeCat}
              onClick={() => {
                setCat(c);
                setQuery("");
              }}
            >
              {c}
            </button>
          ))}
        </nav>
      </aside>

      <section className="menu__grid" aria-label={q ? "Resultados de búsqueda" : activeCat}>
        {products.length === 0 && <p className="menu__empty">No encontramos productos{q ? ` para “${query}”` : ""}.</p>}
        {products.map((p) => {
          const ok = available(p);
          return (
            <article key={p.id} className={`product-card${ok ? "" : " is-out"}`}>
              <button type="button" className="product-card__open" onClick={() => setSelected(p)} aria-label={`Ver ${p.nombre}`}>
                <div className="product-card__art">
                  <ProductArt product={p} />
                  {!ok && <span className="product-card__badge">Agotado</span>}
                </div>
              </button>
              <div className="product-card__info">
                <h3 className="product-card__name">{p.nombre}</h3>
                {p.desc && <p className="product-card__desc">{p.desc}</p>}
                <p className="product-card__price">{fmt(p.precio)}</p>
              </div>
              <button
                type="button"
                className="product-card__add"
                disabled={!ok}
                aria-label={ok ? `Agregar ${p.nombre}` : `${p.nombre} agotado`}
                onClick={() => quickAdd(p)}
              >
                <BagIcon />
                <span aria-hidden="true">+</span>
              </button>
            </article>
          );
        })}
      </section>

      {selected && <ProductModal product={selected} onClose={() => setSelected(null)} onAdd={cart.add} />}

      {cart.count > 0 && (
        <button type="button" className="cart-fab" onClick={() => cart.setOpen(true)}>
          <span>
            Ver pedido <strong>({cart.count})</strong>
          </span>
          <span>{fmt(cart.subtotal)}</span>
        </button>
      )}
    </div>
  );
}
