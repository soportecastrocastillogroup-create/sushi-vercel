import { useState } from "react";
import { Link, useOutletContext } from "react-router";
import { ClockIcon, PinIcon, WhatsAppIcon } from "../components/site/Icons.jsx";
import { usePageTitle } from "../hooks/usePageTitle.js";
import { waLink } from "../utils/whatsapp.js";

const mapsEmbed = (q) => `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
const mapsLink = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

export default function LocalesPage() {
  usePageTitle("Locales · Sushi Loncoche");
  const { whatsappNum, site } = useOutletContext();
  const locales = site.locales;
  const [selected, setSelected] = useState(null);
  const local = locales.find((l) => l.name === selected) ?? locales[0];

  return (
    <div className="page page--locales">
      <aside className="locales-list">
        <h1 className="locales-list__title">Encuentra tu local</h1>
        {locales.map((l) => (
          <article
            key={l.name}
            className={`local-card${l.name === local?.name ? " is-active" : ""}`}
          >
            <button type="button" className="local-card__select" onClick={() => setSelected(l.name)}>
              <h2 className="local-card__name">{l.name}</h2>
              {l.referencia && <p className="local-card__ref">{l.referencia}</p>}
            </button>
            <ul className="local-card__rows">
              <li>
                <PinIcon width={16} height={16} />
                {l.direccion ?? "Dirección por confirmar"}
              </li>
              <li className="is-red">
                <ClockIcon width={16} height={16} />
                {site.horario}
              </li>
            </ul>
            {l.servicios.length > 0 && <p className="local-card__tags">{l.servicios.join(" · ")}</p>}
            <div className="local-card__actions">
              <Link to="/carta" className="btn btn--primary btn--sm">Pedir</Link>
              {whatsappNum && (
                <a className="btn btn--ghost btn--sm" href={waLink(whatsappNum)} target="_blank" rel="noreferrer">
                  <WhatsAppIcon width={16} height={16} /> WhatsApp
                </a>
              )}
              {l.mapa && (
                <a className="btn btn--ghost btn--sm" href={mapsLink(l.mapa)} target="_blank" rel="noreferrer">
                  Cómo llegar
                </a>
              )}
            </div>
          </article>
        ))}
      </aside>

      <div className="locales-map">
        {local?.mapa ? (
          <iframe
            key={local.name}
            title={`Mapa de ${local.name}`}
            src={mapsEmbed(local.mapa)}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <div className="locales-map__empty">
            <PinIcon width={32} height={32} />
            <p>La ubicación de {local?.name} en el mapa se publicará cuando se confirme la dirección.</p>
          </div>
        )}
      </div>
    </div>
  );
}
