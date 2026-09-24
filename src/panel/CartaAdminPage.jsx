import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router";
import {
  deleteCategory,
  deleteCustomization,
  deleteProduct,
  fetchCatalogAdmin,
  removeImage,
  saveCategory,
  saveCustomization,
  saveProduct,
  setProductActive,
} from "../services/cms.js";
import { fmt } from "../utils/format.js";
import ProductArt from "../components/site/ProductArt.jsx";
import { Dialog, ImagePicker, Tabs, Toggle } from "./ui.jsx";
import { useFlash } from "./useFlash.jsx";

// Categorías con comportamiento especial en "Nuevo pedido" (ProductSelector):
// no se pueden renombrar sin romper ese flujo.
const LOCKED_CATEGORIES = ["Promos", "Rolls", "Handrolls"];

const emptyProduct = (categoryId, branchIds) => ({
  id: null,
  category_id: categoryId,
  nombre: "",
  precio: 0,
  piezas: null,
  desc_text: "",
  envoltura_actual: null,
  active: true,
  sort_order: 999,
  image_url: null,
  branchIds,
  rolls: [],
  options: [],
});

function ProductEditor({ initial, categories, branches, onClose, onSaved }) {
  const [p, setP] = useState(() => ({
    ...initial,
    rolls: initial.rolls.map((r) => ({ envoltura: r.envoltura, relleno: r.relleno })),
    options: initial.options.map((o) => ({ label: o.label, roll_idx: o.roll_idx, choices: [...o.choices] })),
  }));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setP((x) => ({ ...x, [k]: v }));
  const setRoll = (i, k, v) => set("rolls", p.rolls.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const setOption = (i, patch) => set("options", p.options.map((o, j) => (j === i ? { ...o, ...patch } : o)));

  const valid = p.nombre.trim().length > 1 && p.precio > 0 && p.category_id && p.branchIds.length > 0;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await saveProduct(p);
      // La foto reemplazada o quitada se borra del Storage.
      if (initial.image_url && initial.image_url !== p.image_url) await removeImage("product-images", initial.image_url);
      onSaved(p.id ? "Producto actualizado." : "Producto creado.");
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`¿Eliminar "${p.nombre}" de la carta? Los pedidos anteriores no se ven afectados. Si solo quieres ocultarlo, desactiva "Visible en la carta".`)) return;
    setBusy(true);
    try {
      await deleteProduct(p.id);
      await removeImage("product-images", initial.image_url);
      if (p.image_url !== initial.image_url) await removeImage("product-images", p.image_url);
      onSaved("Producto eliminado.");
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Dialog title={p.id ? `Editar ${initial.nombre}` : "Nuevo producto"} onClose={onClose} wide>
      <form onSubmit={submit} className="editor">
        <div className="editor__side">
          <ImagePicker
            bucket="product-images"
            value={p.image_url}
            onChange={(url) => set("image_url", url)}
            placeholder={<ProductArt product={{ id: p.id ?? p.nombre }} />}
          />
          <p className="panel-muted editor__hint">Foto cuadrada, idealmente el producto sobre fondo oscuro o transparente.</p>
          <Toggle checked={p.active} onChange={(v) => set("active", v)} label="Visible en la carta" />
        </div>

        <div className="editor__main">
          <label className="field">
            <span>Nombre</span>
            <input value={p.nombre} onChange={(e) => set("nombre", e.target.value)} autoFocus={!p.id} />
          </label>
          <div className="editor__row">
            <label className="field">
              <span>Categoría</span>
              <select value={p.category_id} onChange={(e) => set("category_id", e.target.value)}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Precio (CLP)</span>
              <input
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={p.precio || ""}
                onChange={(e) => set("precio", Math.max(0, parseInt(e.target.value, 10) || 0))}
              />
            </label>
            <label className="field">
              <span>Piezas</span>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={p.piezas ?? ""}
                onChange={(e) => set("piezas", e.target.value === "" ? null : parseInt(e.target.value, 10) || 0)}
              />
            </label>
          </div>
          <label className="field">
            <span>Descripción</span>
            <textarea rows={2} value={p.desc_text ?? ""} onChange={(e) => set("desc_text", e.target.value)} />
          </label>

          <fieldset className="field">
            <legend>Disponible en</legend>
            <div className="checks">
              {branches.map((b) => (
                <label key={b.id} className="check">
                  <input
                    type="checkbox"
                    checked={p.branchIds.includes(b.id)}
                    onChange={(e) =>
                      set("branchIds", e.target.checked ? [...p.branchIds, b.id] : p.branchIds.filter((x) => x !== b.id))
                    }
                  />
                  {b.name}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="field">
            <legend>Rolls que incluye (promos)</legend>
            {p.rolls.map((r, i) => (
              <div key={i} className="repeat-row">
                <span className="repeat-row__n">{i + 1}</span>
                <input placeholder="Envoltura (ej. Panko)" value={r.envoltura} onChange={(e) => setRoll(i, "envoltura", e.target.value)} />
                <input placeholder="Relleno" value={r.relleno} onChange={(e) => setRoll(i, "relleno", e.target.value)} />
                <button type="button" className="icon-x" aria-label="Quitar roll" onClick={() => set("rolls", p.rolls.filter((_, j) => j !== i))}>
                  ×
                </button>
              </div>
            ))}
            <button type="button" className="link-btn" onClick={() => set("rolls", [...p.rolls, { envoltura: "", relleno: "" }])}>
              + Agregar roll
            </button>
          </fieldset>

          <fieldset className="field">
            <legend>Opciones que elige el cliente</legend>
            {p.options.map((o, i) => (
              <div key={i} className="repeat-row repeat-row--option">
                <input placeholder="Pregunta (ej. ¿Cómo quieres tu segundo roll?)" value={o.label} onChange={(e) => setOption(i, { label: e.target.value })} />
                <select value={o.roll_idx} onChange={(e) => setOption(i, { roll_idx: parseInt(e.target.value, 10) })} aria-label="Roll al que aplica">
                  {(p.rolls.length ? p.rolls : [{}]).map((_, j) => (
                    <option key={j} value={j}>
                      Roll {j + 1}
                    </option>
                  ))}
                </select>
                <input placeholder="Opción A" value={o.choices[0]} onChange={(e) => setOption(i, { choices: [e.target.value, o.choices[1]] })} />
                <input placeholder="Opción B" value={o.choices[1]} onChange={(e) => setOption(i, { choices: [o.choices[0], e.target.value] })} />
                <button type="button" className="icon-x" aria-label="Quitar opción" onClick={() => set("options", p.options.filter((_, j) => j !== i))}>
                  ×
                </button>
              </div>
            ))}
            <button type="button" className="link-btn" onClick={() => set("options", [...p.options, { label: "", roll_idx: 0, choices: ["", ""] }])}>
              + Agregar opción
            </button>
          </fieldset>

          {error && <p className="login__error" role="alert">{error}</p>}
          <div className="panel-dialog__actions">
            {p.id && (
              <button type="button" className="btn btn--ghost btn--danger" disabled={busy} onClick={remove}>
                Eliminar
              </button>
            )}
            <span className="spacer" />
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary" disabled={busy || !valid}>
              {busy ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}

function ProductsTab({ data, reload, flash }) {
  const [cat, setCat] = useState(data.categories[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);
  const branchName = (id) => data.branches.find((b) => b.id === id)?.name ?? id;

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.products.filter((p) => (q ? `${p.nombre} ${p.desc_text ?? ""}`.toLowerCase().includes(q) : p.category_id === cat));
  }, [data.products, cat, query]);

  const toggle = async (p) => {
    try {
      await setProductActive(p.id, !p.active);
      await reload();
      flash(p.active ? `"${p.nombre}" quedó oculto en la carta.` : `"${p.nombre}" vuelve a verse en la carta.`);
    } catch (err) {
      flash(err.message, "error");
    }
  };

  return (
    <>
      <div className="toolbar">
        <div className="chips">
          {data.categories.map((c) => (
            <button key={c.id} type="button" className={!query && c.id === cat ? "is-active" : ""} onClick={() => { setCat(c.id); setQuery(""); }}>
              {c.name}
              {!c.active && " (oculta)"}
            </button>
          ))}
        </div>
        <input className="toolbar__search" type="search" placeholder="Buscar producto" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={() => setEditing(emptyProduct(cat ?? data.categories[0]?.id, data.branches.map((b) => b.id)))}
        >
          + Nuevo producto
        </button>
      </div>

      <ul className="admin-grid">
        {list.map((p) => (
          <li key={p.id} className={`admin-card${p.active ? "" : " is-off"}`}>
            <button type="button" className="admin-card__art" onClick={() => setEditing(p)} aria-label={`Editar ${p.nombre}`}>
              <ProductArt product={{ id: p.id, nombre: p.nombre, imageUrl: p.image_url }} />
              {!p.image_url && <span className="admin-card__tag">Sin foto</span>}
            </button>
            <div className="admin-card__body">
              <p className="admin-card__name">{p.nombre}</p>
              {p.desc_text && <p className="admin-card__desc">{p.desc_text}</p>}
              <p className="admin-card__meta">
                <strong>{fmt(p.precio)}</strong>
                <span>{p.branchIds.map(branchName).join(" · ") || "Sin sucursal"}</span>
              </p>
            </div>
            <div className="admin-card__actions">
              <Toggle checked={p.active} onChange={() => toggle(p)} label={p.active ? "Visible" : "Oculto"} />
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing(p)}>
                Editar
              </button>
            </div>
          </li>
        ))}
        {list.length === 0 && <li className="panel-muted admin-empty">No hay productos {query ? "que coincidan" : "en esta categoría"}.</li>}
      </ul>

      {editing && (
        <ProductEditor
          initial={editing}
          categories={data.categories}
          branches={data.branches}
          onClose={() => setEditing(null)}
          onSaved={async (msg) => {
            setEditing(null);
            await reload();
            flash(msg);
          }}
        />
      )}
    </>
  );
}

function CategoriesTab({ data, reload, flash }) {
  const [rows, setRows] = useState(data.categories);
  const [newName, setNewName] = useState("");
  const count = (id) => data.products.filter((p) => p.category_id === id).length;

  const persist = async (next, msg) => {
    try {
      await Promise.all(next.map((c, i) => saveCategory({ ...c, sort_order: i + 1 })));
      await reload();
      flash(msg);
    } catch (err) {
      flash(err.message, "error");
    }
  };

  const move = (i, d) => {
    const next = [...rows];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setRows(next);
    persist(next, "Orden actualizado.");
  };

  const add = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await saveCategory({ name: newName, sort_order: rows.length + 1, active: true });
      setNewName("");
      await reload();
      flash("Categoría creada.");
    } catch (err) {
      flash(err.message, "error");
    }
  };

  const remove = async (c) => {
    if (count(c.id) > 0) return flash("Mueve o elimina sus productos antes de borrar la categoría.", "error");
    if (!window.confirm(`¿Eliminar la categoría "${c.name}"?`)) return;
    try {
      await deleteCategory(c.id);
      await reload();
      flash("Categoría eliminada.");
    } catch (err) {
      flash(err.message, "error");
    }
  };

  return (
    <div className="panel-card">
      <p className="panel-muted">El orden de esta lista es el de la carta pública. Una categoría oculta esconde todos sus productos.</p>
      <ul className="cat-list">
        {rows.map((c, i) => {
          const locked = LOCKED_CATEGORIES.includes(c.name);
          return (
            <li key={c.id} className="cat-row">
              <div className="cat-row__move">
                <button type="button" aria-label="Subir" disabled={i === 0} onClick={() => move(i, -1)}>▲</button>
                <button type="button" aria-label="Bajar" disabled={i === rows.length - 1} onClick={() => move(i, 1)}>▼</button>
              </div>
              <input
                value={c.name}
                disabled={locked}
                title={locked ? "Esta categoría tiene un comportamiento especial en Nuevo pedido y no se puede renombrar." : undefined}
                onChange={(e) => setRows(rows.map((x) => (x.id === c.id ? { ...x, name: e.target.value } : x)))}
                onBlur={() => c.name.trim() && c.name !== data.categories.find((x) => x.id === c.id)?.name && persist(rows, "Categoría renombrada.")}
              />
              <span className="panel-muted cat-row__count">{count(c.id)} productos</span>
              <Toggle
                checked={c.active}
                label={c.active ? "Visible" : "Oculta"}
                onChange={(v) => {
                  const next = rows.map((x) => (x.id === c.id ? { ...x, active: v } : x));
                  setRows(next);
                  persist(next, v ? "Categoría visible." : "Categoría oculta.");
                }}
              />
              {!locked && (
                <button type="button" className="icon-x" aria-label={`Eliminar ${c.name}`} onClick={() => remove(c)}>
                  ×
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <form className="inline-add" onSubmit={add}>
        <input placeholder="Nueva categoría (ej. Para Picar)" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button type="submit" className="btn btn--primary btn--sm" disabled={!newName.trim()}>
          Agregar
        </button>
      </form>
    </div>
  );
}

const TIPOS = [
  { id: "relleno", label: "Cambios de relleno" },
  { id: "envoltura", label: "Cambios de envoltura" },
  { id: "salsa", label: "Salsas" },
];

function ExtrasTab({ data, reload, flash }) {
  const [rows, setRows] = useState(data.customizations);
  const [draft, setDraft] = useState({ tipo: "relleno", nombre: "", precio: 0 });

  const save = async (c) => {
    try {
      await saveCustomization(c);
      await reload();
      flash("Guardado.");
    } catch (err) {
      flash(err.message, "error");
    }
  };

  const remove = async (c) => {
    if (!window.confirm(`¿Eliminar "${c.nombre}"?`)) return;
    try {
      await deleteCustomization(c.id);
      await reload();
      flash("Eliminado.");
    } catch (err) {
      flash(err.message, "error");
    }
  };

  const edit = (id, patch) => setRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <div className="extras">
      <p className="panel-muted">Cambios con costo que el equipo puede aplicar a rolls y promos en "Nuevo pedido".</p>
      {TIPOS.map((t) => (
        <div key={t.id} className="panel-card">
          <h3 className="panel-subtitle">{t.label}</h3>
          <ul className="extra-list">
            {rows
              .filter((r) => r.tipo === t.id)
              .map((r) => (
                <li key={r.id} className="extra-row">
                  <input value={r.nombre} onChange={(e) => edit(r.id, { nombre: e.target.value })} onBlur={() => save(r)} />
                  <label className="extra-row__price">
                    $
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={r.precio}
                      onChange={(e) => edit(r.id, { precio: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                      onBlur={() => save(r)}
                    />
                  </label>
                  <button type="button" className="icon-x" aria-label={`Eliminar ${r.nombre}`} onClick={() => remove(r)}>
                    ×
                  </button>
                </li>
              ))}
          </ul>
        </div>
      ))}
      <form
        className="inline-add panel-card"
        onSubmit={async (e) => {
          e.preventDefault();
          await save({ ...draft, sort_order: rows.length + 1 });
          setDraft({ ...draft, nombre: "", precio: 0 });
        }}
      >
        <select value={draft.tipo} onChange={(e) => setDraft({ ...draft, tipo: e.target.value })}>
          {TIPOS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <input placeholder="Nombre (ej. Salmón)" value={draft.nombre} onChange={(e) => setDraft({ ...draft, nombre: e.target.value })} />
        <input
          type="number"
          min="0"
          step="1"
          placeholder="Precio"
          value={draft.precio || ""}
          onChange={(e) => setDraft({ ...draft, precio: Math.max(0, parseInt(e.target.value, 10) || 0) })}
        />
        <button type="submit" className="btn btn--primary btn--sm" disabled={!draft.nombre.trim()}>
          Agregar
        </button>
      </form>
    </div>
  );
}

export default function CartaAdminPage() {
  const panel = useOutletContext();
  const [tab, setTab] = useState("productos");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [flashNode, flash] = useFlash();

  useEffect(() => {
    let cancelled = false;
    fetchCatalogAdmin()
      .then((d) => !cancelled && setData(d))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, []);

  // Recarga el catálogo del editor y el del panel (Nuevo pedido, Pedidos).
  const reload = useCallback(async () => {
    setData(await fetchCatalogAdmin());
    panel.refreshAll();
  }, [panel]);

  return (
    <div className="panel-page panel-page--wide">
      <div className="panel-head">
        <div>
          <h1 className="panel-title">Carta</h1>
          <p className="panel-muted">Productos, promociones, precios y fotos que se ven en la carta pública.</p>
        </div>
        <a className="btn btn--ghost btn--sm" href="/carta" target="_blank" rel="noreferrer">
          Ver carta pública ↗
        </a>
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "productos", label: "Productos y promos" },
          { id: "categorias", label: "Categorías" },
          { id: "extras", label: "Cambios y extras" },
        ]}
      />
      {error && <p className="login__error">{error}</p>}
      {!data ? (
        !error && (
          <div className="page-state" role="status">
            <span className="spinner" aria-hidden="true" />
          </div>
        )
      ) : tab === "productos" ? (
        <ProductsTab data={data} reload={reload} flash={flash} />
      ) : tab === "categorias" ? (
        <CategoriesTab key={data.categories.map((c) => c.id + c.name + c.active).join()} data={data} reload={reload} flash={flash} />
      ) : (
        <ExtrasTab key={data.customizations.length} data={data} reload={reload} flash={flash} />
      )}
      {flashNode}
    </div>
  );
}
