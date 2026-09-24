import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import RollArt from "./RollArt.jsx";
import { BrandMark } from "./Brand.jsx";
import { ChevronLeft, ChevronRight } from "./Icons.jsx";

const INTERVAL_MS = 6500;

function Seal() {
  return (
    <div className="hero-seal" aria-hidden="true">
      <svg viewBox="0 0 200 200" className="hero-seal__ring">
        <defs>
          <path id="seal-path" d="M100 100 m-78 0 a78 78 0 1 1 156 0 a78 78 0 1 1 -156 0" />
        </defs>
        <text>
          <textPath href="#seal-path" startOffset="0">
            RETIRO · DELIVERY · LONCOCHE · LA PAZ ·
          </textPath>
        </text>
      </svg>
      <BrandMark size={44} className="hero-seal__mark" />
    </div>
  );
}

export default function HeroCarousel({ slides }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;

  const go = useCallback((i) => setIndex((i + count) % count), [count]);

  useEffect(() => {
    if (paused || count < 2) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = setTimeout(() => go(index + 1), INTERVAL_MS);
    return () => clearTimeout(id);
  }, [index, paused, count, go]);

  return (
    <section
      className="hero"
      aria-roledescription="carrusel"
      aria-label="Destacados"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="hero__grain" aria-hidden="true" />

      {slides.map((s, i) => (
        <div
          key={s.id}
          className={`hero-slide${i === index ? " is-active" : ""}`}
          role="group"
          aria-roledescription="slide"
          aria-label={`${i + 1} de ${count}`}
          aria-hidden={i !== index}
        >
          <div className="hero-slide__copy">
            <p className="hero-slide__kicker">{s.kicker}</p>
            <h1 className="hero-slide__title">
              <span>{s.titulo[0]}</span>
              <span className="is-red">{s.titulo[1]}</span>
            </h1>
            <p className="hero-slide__text">{s.texto}</p>
            <Link to={s.cta.to} className="btn btn--primary" tabIndex={i === index ? 0 : -1}>
              {s.cta.label}
            </Link>
          </div>
          <div className="hero-slide__art">
            {s.imageUrl ? (
              <img className="hero-slide__photo" src={s.imageUrl} alt="" loading={i === 0 ? "eager" : "lazy"} />
            ) : (
              <RollArt variant={s.arte} className="hero-slide__roll" />
            )}
          </div>
        </div>
      ))}

      <Seal />

      {count > 1 && (
        <div className="hero__controls">
          <button type="button" className="hero__arrow" aria-label="Anterior" onClick={() => go(index - 1)}>
            <ChevronLeft />
          </button>
          <div className="hero__dots">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className={`hero__dot${i === index ? " is-active" : ""}`}
                aria-label={`Ir al destacado ${i + 1}`}
                aria-current={i === index}
                onClick={() => go(i)}
              />
            ))}
          </div>
          <button type="button" className="hero__arrow" aria-label="Siguiente" onClick={() => go(index + 1)}>
            <ChevronRight />
          </button>
        </div>
      )}
    </section>
  );
}
