// Redimensiona y comprime una imagen en el navegador antes de subirla, para
// no agotar el Storage gratuito (PRD 01, riesgos).
export async function compressImage(file, { maxSize = 1200, quality = 0.85 } = {}) {
  if (!file.type.startsWith("image/")) throw new Error("El archivo no es una imagen.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
  if (!blob) throw new Error("No pudimos procesar la imagen.");
  return blob;
}
