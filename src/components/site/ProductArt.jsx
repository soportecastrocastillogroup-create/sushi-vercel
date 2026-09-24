import RollArt from "./RollArt.jsx";

// Imagen del producto. Mientras no existan fotos (Etapa D agrega
// `products.image_url`), muestra una ilustración provisional.
const VARIANTS = ["salmon", "avocado", "tempura"];

function variantFor(id) {
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return VARIANTS[h % VARIANTS.length];
}

export default function ProductArt({ product }) {
  if (product.imageUrl) {
    return <img className="product-art product-art--photo" src={product.imageUrl} alt={product.nombre} loading="lazy" />;
  }
  return <RollArt variant={variantFor(product.id)} className="product-art" />;
}
