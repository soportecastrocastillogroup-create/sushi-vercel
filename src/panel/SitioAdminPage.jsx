import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import { deleteSlide, fetchSiteAdmin, removeImage, saveBranchInfo, saveBusiness, saveSlide } from "../services/cms.js";
import RollArt from "../components/site/RollArt.jsx";
import { ImagePicker, Tabs, Toggle } from "./ui.jsx";
import { useFlash } from "./useFlash.jsx";

const DESTINOS = [
  { to: "/carta", label: "Carta" },
  { to: "/locales", label: "Locales" },
];
const ARTES = [
  { id: "salmon", label: "Salmón" },
  { id: "avocado", label: "Palta" },
  { id: "tempura", label: "Tempura" },
];
const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function SlideCard({ slide, index, total, onChange, onSave, onMove, onDelete, dirty }) {
  const set = (k, v) => onChange({ ...slide, [k]: v });
  return (
    <li className={`slide-card${slide.active ? "" : " is-off"}`}>
      <div className="slide-card__preview">
        <div className="slide-preview">
          <div className="slide-preview__copy">
            <p className="slide-preview__kicker">{slide.kicker || "Texto superior"}</p>
            <p className="slide-preview__title">
              <span>{slide.titulo_1 || "Título"}</span>
              <span className="is-red">{slide.titulo_2}</span>
            </p>
            <p className="slide-preview__text">{slide.texto}</p>
            <span className="slide-preview__btn">{slide.cta_label || "Botón"}</span>
          </div>
          <div className="slide-preview__art">
            {slide.image_url ? <img src={slide.image_url} alt="" /> : <RollArt variant={slide.arte} />}
          </div>
        </div>
        <div className="slide-card__order">
          <span className="panel-muted">Slide {index + 1}</span>
          <button type="button" className="btn btn--ghost btn--sm" disabled={index === 0} onClick={() => onMove(-1)}>
            ▲ Subir
          </button>
          <button type="button" className="btn btn--ghost btn--sm" disabled={index === total - 1} onClick={() => onMove(1)}>
            ▼ Bajar
          </button>
        </div>
      </div>

      <div className="slide-card__form">
        <label className="field">
          <span>Texto superior</span>
          <input value={slide.kicker} onChange={(e) => set("kicker", e.target.value)} placeholder="Ej. Loncoche · La Paz" />
        </label>
        <div className="editor__row">
          <label className="field">
            <span>Título (blanco)</span>
            <input value={slide.titulo_1} onChange={(e) => set("titulo_1", e.target.value)} />
          </label>
          <label className="field">
            <span>Título (rojo)</span>
            <input value={slide.titulo_2} onChange={(e) => set("titulo_2", e.target.value)} />
          </label>
        </div>
        <label className="field">
          <span>Texto</span>
          <textarea rows={2} value={slide.texto} onChange={(e) => set("texto", e.target.value)} />
        </label>
        <div className="editor__row">
          <label className="field">
            <span>Texto del botón</span>
            <input value={slide.cta_label} onChange={(e) => set("cta_label", e.target.value)} />
          </label>
          <label className="field">
            <span>El botón lleva a</span>
            <select value={slide.cta_to} onChange={(e) => set("cta_to", e.target.value)}>
              {DESTINOS.map((d) => (
                <option key={d.to} value={d.to}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="editor__row editor__row--image">
          <ImagePicker
            bucket="site-media"
            maxSize={1600}
            value={slide.image_url}
            onChange={(url) => set("image_url", url)}
            placeholder={<RollArt variant={slide.arte} />}
          />
          {!slide.image_url && (
            <label className="field">
              <span>Sin foto, usar ilustración</span>
              <select value={slide.arte} onChange={(e) => set("arte", e.target.value)}>
                {ARTES.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <div className="slide-card__actions">
          <Toggle checked={slide.active} onChange={(v) => set("active", v)} label="Visible en la portada" />
          <span className="spacer" />
          <button type="button" className="btn btn--ghost btn--sm btn--danger" onClick={onDelete}>
            Eliminar
          </button>
          <button type="button" className="btn btn--primary btn--sm" disabled={!dirty} onClick={onSave}>
            {dirty ? "Guardar cambios" : "Guardado"}
          </button>
        </div>
      </div>
    </li>
  );
}

function PortadaTab({ data, reload, flash }) {
  const [slides, setSlides] = useState(data.slides);
  const [dirty, setDirty] = useState({});

  const persistOrder = async (next) => {
    try {
      await Promise.all(next.map((s, i) => saveSlide({ ...s, sort_order: i + 1 })));
      await reload();
      flash("Orden actualizado.");
    } catch (err) {
      flash(err.message, "error");
    }
  };

  const add = async () => {
    try {
      await saveSlide({
        sort_order: slides.length + 1,
        active: false,
        kicker: "",
        titulo_1: "Nuevo",
        titulo_2: "destacado",
        texto: "",
        cta_label: "Ver la carta",
        cta_to: "/carta",
        image_url: null,
        arte: "salmon",
      });
      await reload();
      flash("Slide creado (oculto). Complétalo y actívalo.");
    } catch (err) {
      flash(err.message, "error");
    }
  };

  return (
    <>
      <div className="toolbar">
        <p className="panel-muted">Los slides visibles rotan en la portada del sitio. Se recomienda entre 2 y 4.</p>
        <span className="spacer" />
        <a className="btn btn--ghost btn--sm" href="/" target="_blank" rel="noreferrer">
          Ver portada ↗
        </a>
        <button type="button" className="btn btn--primary btn--sm" onClick={add}>
          + Nuevo slide
        </button>
      </div>
      <ul className="slide-list">
        {slides.map((s, i) => (
          <SlideCard
            key={s.id}
            slide={s}
            index={i}
            total={slides.length}
            dirty={Boolean(dirty[s.id])}
            onChange={(next) => {
              setSlides(slides.map((x) => (x.id === s.id ? next : x)));
              setDirty({ ...dirty, [s.id]: true });
            }}
            onSave={async () => {
              try {
                await saveSlide(slides[i]);
                const before = data.slides.find((x) => x.id === s.id)?.image_url;
                if (before && before !== slides[i].image_url) await removeImage("site-media", before);
                setDirty({ ...dirty, [s.id]: false });
                await reload();
                flash("Slide guardado.");
              } catch (err) {
                flash(err.message, "error");
              }
            }}
            onMove={(d) => {
              const next = [...slides];
              [next[i], next[i + d]] = [next[i + d], next[i]];
              setSlides(next);
              persistOrder(next);
            }}
            onDelete={async () => {
              if (!window.confirm("¿Eliminar este slide de la portada?")) return;
              try {
                await deleteSlide(s.id);
                await removeImage("site-media", data.slides.find((x) => x.id === s.id)?.image_url);
                await reload();
                flash("Slide eliminado.");
              } catch (err) {
                flash(err.message, "error");
              }
            }}
          />
        ))}
      </ul>
    </>
  );
}

function LocalesTab({ data, reload, flash }) {
  const [rows, setRows] = useState(() => data.branches.map((b) => ({ ...b, serviciosText: (b.servicios ?? []).join(", ") })));
  const edit = (id, patch) => setRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <div className="locales-admin">
      {rows.map((b) => (
        <form
          key={b.id}
          className="panel-card"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await saveBranchInfo(b);
              await reload();
              flash(`${b.name} actualizado.`);
            } catch (err) {
              flash(err.message, "error");
            }
          }}
        >
          <h3 className="panel-subtitle">{b.name}</h3>
          <label className="field">
            <span>Dirección</span>
            <input value={b.direccion ?? ""} onChange={(e) => edit(b.id, { direccion: e.target.value })} placeholder="Calle y número, comuna" />
          </label>
          <label className="field">
            <span>Referencia</span>
            <input value={b.referencia ?? ""} onChange={(e) => edit(b.id, { referencia: e.target.value })} placeholder="Ej. Frente a la plaza" />
          </label>
          <label className="field">
            <span>Búsqueda en Google Maps</span>
            <input value={b.mapa ?? ""} onChange={(e) => edit(b.id, { mapa: e.target.value })} placeholder="Ej. Arturo Prat 597, La Paz, Araucanía" />
            <small className="panel-muted">Si queda vacío, no se muestra el mapa ni "Cómo llegar".</small>
          </label>
          <label className="field">
            <span>Servicios (separados por coma)</span>
            <input value={b.serviciosText} onChange={(e) => edit(b.id, { serviciosText: e.target.value })} placeholder="Retiro en local, Delivery" />
          </label>
          <button type="submit" className="btn btn--primary btn--sm">
            Guardar {b.name}
          </button>
        </form>
      ))}
    </div>
  );
}

function NegocioTab({ data, reload, flash }) {
  const [content, setContent] = useState(data.content);
  const [settings, setSettings] = useState(data.settings);
  const [slots, setSlots] = useState(data.slots);
  const [blocked, setBlocked] = useState(data.blocked);
  const [newSlot, setNewSlot] = useState("");
  const [busy, setBusy] = useState(false);
  const num = (k) => (e) => setSettings({ ...settings, [k]: Math.max(0, parseInt(e.target.value, 10) || 0) });

  const addSlot = () => {
    if (!/^\d{2}:\d{2}$/.test(newSlot) || slots.includes(newSlot)) return;
    setSlots([...slots, newSlot].sort());
    setNewSlot("");
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await saveBusiness({ content, settings, slots, blocked });
      await reload();
      flash("Datos del negocio guardados.");
    } catch (err) {
      flash(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="negocio" onSubmit={submit}>
      <div className="panel-card">
        <h3 className="panel-subtitle">Contacto y horario</h3>
        <label className="field">
          <span>Horario que se muestra en el sitio</span>
          <input value={content.horario} onChange={(e) => setContent({ ...content, horario: e.target.value })} />
        </label>
        <label className="field">
          <span>Instagram (enlace)</span>
          <input value={content.instagram} onChange={(e) => setContent({ ...content, instagram: e.target.value })} />
        </label>
        <label className="field">
          <span>WhatsApp para pedidos</span>
          <input
            value={settings.whatsapp_num}
            inputMode="tel"
            onChange={(e) => setSettings({ ...settings, whatsapp_num: e.target.value })}
            placeholder="56912345678"
          />
          <small className="panel-muted">Con código de país y sin espacios. Es el número al que llegan los pedidos de la carta.</small>
        </label>
      </div>

      <div className="panel-card">
        <h3 className="panel-subtitle">Pedidos</h3>
        <div className="editor__row">
          <label className="field">
            <span>Costo de delivery (CLP)</span>
            <input type="number" min="0" step="1" value={settings.costo_delivery} onChange={num("costo_delivery")} />
          </label>
          <label className="field">
            <span>Máx. pedidos por horario</span>
            <input type="number" min="1" value={settings.max_por_horario} onChange={num("max_por_horario")} />
          </label>
          <label className="field">
            <span>Máx. cambios por producto</span>
            <input type="number" min="0" value={settings.max_cambios} onChange={num("max_cambios")} />
          </label>
        </div>

        <fieldset className="field">
          <legend>Días cerrados por defecto</legend>
          <div className="checks">
            {DIAS.map((d, i) => (
              <label key={d} className="check">
                <input
                  type="checkbox"
                  checked={blocked.includes(i)}
                  onChange={(e) => setBlocked(e.target.checked ? [...blocked, i] : blocked.filter((x) => x !== i))}
                />
                {d}
              </label>
            ))}
          </div>
          <small className="panel-muted">Un día cerrado se puede abrir puntualmente desde Pedidos → Días.</small>
        </fieldset>

        <fieldset className="field">
          <legend>Horarios de pedido</legend>
          <div className="slot-chips">
            {slots.map((s) => (
              <span key={s} className="slot-chip">
                {s}
                <button type="button" aria-label={`Quitar ${s}`} onClick={() => setSlots(slots.filter((x) => x !== s))}>
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="inline-add">
            <input type="time" value={newSlot} onChange={(e) => setNewSlot(e.target.value)} step="900" />
            <button type="button" className="btn btn--ghost btn--sm" onClick={addSlot} disabled={!newSlot}>
              Agregar horario
            </button>
          </div>
        </fieldset>
      </div>

      <div className="negocio__save">
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? "Guardando…" : "Guardar datos del negocio"}
        </button>
      </div>
    </form>
  );
}

export default function SitioAdminPage() {
  const panel = useOutletContext();
  const [tab, setTab] = useState("portada");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [flashNode, flash] = useFlash();

  useEffect(() => {
    let cancelled = false;
    fetchSiteAdmin()
      .then((d) => !cancelled && setData(d))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, []);

  const reload = useCallback(async () => {
    setData(await fetchSiteAdmin());
    panel.refreshAll();
  }, [panel]);

  const key = data ? JSON.stringify([data.slides.map((s) => s.id), data.branches.length]) : "";

  return (
    <div className="panel-page panel-page--wide">
      <div className="panel-head">
        <div>
          <h1 className="panel-title">Sitio</h1>
          <p className="panel-muted">Portada, locales y datos del negocio que se ven en el sitio público.</p>
        </div>
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "portada", label: "Portada" },
          { id: "locales", label: "Locales" },
          { id: "negocio", label: "Datos del negocio" },
        ]}
      />
      {error && <p className="login__error">{error}</p>}
      {!data ? (
        !error && (
          <div className="page-state" role="status">
            <span className="spinner" aria-hidden="true" />
          </div>
        )
      ) : tab === "portada" ? (
        <PortadaTab key={key} data={data} reload={reload} flash={flash} />
      ) : tab === "locales" ? (
        <LocalesTab data={data} reload={reload} flash={flash} />
      ) : (
        <NegocioTab data={data} reload={reload} flash={flash} />
      )}
      {flashNode}
    </div>
  );
}
