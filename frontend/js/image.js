async function fileToDataUrl(file, maxBytes = 1024 * 1024) {
  if (!file) return "";
  if (!file.type.startsWith("image/")) throw new Error("Seleccione un archivo de imagen válido.");
  if (file.size > 8 * 1024 * 1024) throw new Error("La imagen original no puede superar 8 MB.");

  const source = await new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error("No se pudo leer la imagen.")); reader.readAsDataURL(file);
  });
  const img = await new Promise((resolve, reject) => { const el = new Image(); el.onload = () => resolve(el); el.onerror = () => reject(new Error("No se pudo procesar la imagen.")); el.src = source; });

  const maxSide = 1200;
  const width = img.naturalWidth || img.width, height = img.naturalHeight || img.height;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const canvas = document.createElement("canvas"); canvas.width = Math.max(1, Math.round(width * scale)); canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true }); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  let hasTransparency = false;
  if (file.type === "image/png" || file.type === "image/webp") {
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < pixels.length; i += 4) { if (pixels[i] < 255) { hasTransparency = true; break; } }
  }

  if (hasTransparency) {
    let data = canvas.toDataURL("image/png");
    if (data.length <= maxBytes * 1.37) return data;
    // PNG no siempre comprime bien; reducir dimensiones antes de destruir transparencia.
    let factor = 0.85;
    while (data.length > maxBytes * 1.37 && factor >= 0.45) {
      canvas.width = Math.max(1, Math.round(width * scale * factor)); canvas.height = Math.max(1, Math.round(height * scale * factor));
      ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0, canvas.width, canvas.height); data = canvas.toDataURL("image/png"); factor -= 0.08;
    }
    if (data.length > maxBytes * 1.37) throw new Error("La imagen PNG transparente es demasiado pesada incluso después de reducirla.");
    return data;
  }

  let quality = 0.82, data = canvas.toDataURL("image/jpeg", quality);
  while (data.length > maxBytes * 1.37 && quality > 0.42) { quality -= 0.06; data = canvas.toDataURL("image/jpeg", quality); }
  if (data.length > maxBytes * 1.37) throw new Error("No se pudo reducir la imagen a un tamaño seguro.");
  return data;
}
