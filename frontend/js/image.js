async function fileToDataUrl(file, maxBytes = 1024 * 1024) {
  if (!file) return "";
  if (!file.type.startsWith("image/")) throw new Error("Seleccione un archivo de imagen válido.");
  if (file.size > 8 * 1024 * 1024) throw new Error("La imagen original no puede superar 8 MB.");

  const source = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(file);
  });

  const img = await new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("No se pudo procesar la imagen."));
    el.src = source;
  });

  const maxSide = 1200;
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
  canvas.height = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  let quality = 0.82;
  let data = canvas.toDataURL("image/jpeg", quality);
  while (data.length > maxBytes * 1.37 && quality > 0.45) {
    quality -= 0.07;
    data = canvas.toDataURL("image/jpeg", quality);
  }
  if (data.length > maxBytes * 1.37) throw new Error("No se pudo reducir la imagen a un tamaño seguro.");
  return data;
}
