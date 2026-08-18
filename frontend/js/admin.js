(() => {
  if (document.body?.dataset.page !== "admin") return;
  const $ = id => document.getElementById(id);
  const productForm = $("product-form"), categoryForm = $("category-form"), productsBox = $("admin-products"), categoriesBox = $("admin-categories");
  let editingProductId = null, editingCategoryId = null, productPage = 1, productPages = 1, productSearch = "", productRequestId = 0, categoryCache = [];

  function resetProductForm() {
    editingProductId = null; productForm.reset(); $("product-emoji").value = "🏷️"; $("product-featured").checked = true; $("product-available").checked = true;
    $("product-form-title").textContent = "Agregar calcomanía"; $("product-submit").textContent = "Guardar producto"; $("product-cancel").style.display = "none"; $("product-image-existing").value = ""; $("product-image").value = ""; $("product-image-preview").innerHTML = "";
  }
  function resetCategoryForm() { editingCategoryId = null; categoryForm.reset(); $("category-emoji").value = "📌"; $("category-active").checked = true; $("category-form-title").textContent = "Agregar categoría"; $("category-submit").textContent = "Guardar categoría"; $("category-cancel").style.display = "none"; $("category-image-existing").value = ""; $("category-image").value = ""; $("category-image-preview").innerHTML = ""; }
  function fileInputToData(id) { const file = $(id).files?.[0]; return file ? fileToDataUrl(file) : Promise.resolve(""); }
  function imagePreview(fileInput, previewId) { $(fileInput)?.addEventListener("change", async () => { try { const data = await fileInputToData(fileInput); $(previewId).innerHTML = data ? `<img src="${escapeHtml(data)}" alt="Vista previa">` : ""; } catch (e) { alert(e.message); $(fileInput).value = ""; } }); }

  async function requireAuth() {
    try { const result = await API.me(); $("admin-name").textContent = result.admin.name || result.admin.email; document.body.classList.remove("admin-locked"); document.body.classList.add("admin-ready"); await Promise.all([loadProducts(), loadCategories()]); return true; }
    catch { location.replace("index.html?login=1"); return false; }
  }

  async function loadProducts() {
    const requestId = ++productRequestId;
    try {
      const data = await API.getAdminProducts({ page: productPage, limit: 20, search: productSearch, sort: "createdAt", order: "desc" });
      if (requestId !== productRequestId) return;
      productPages = data.pages || 1;
      productsBox.innerHTML = data.data?.length ? data.data.map(p => `<article class="admin-product"><div style="display:flex;gap:12px;align-items:center;min-width:0;">${p.image ? `<img src="${escapeHtml(p.image)}" alt="" class="admin-thumb">` : `<span style="font-size:2rem;">${escapeHtml(p.emoji || "🏷️")}</span>`}<div><div class="admin-product-name">${escapeHtml(p.name)}</div><div class="admin-product-meta"><span>${escapeHtml(p.category)}</span><span>₡${Number(p.price).toLocaleString("es-CR")}</span><span>${p.available ? "Visible" : "Oculto"}</span><span>${p.featured ? "Destacado" : "Normal"}</span></div></div></div><div class="admin-actions"><button type="button" class="admin-btn-edit" data-edit-product="${p._id}">Editar</button><button type="button" class="admin-btn-delete" data-delete-product="${p._id}">Eliminar</button></div></article>`).join("") : "<p>No hay productos que coincidan con la búsqueda.</p>";
      $("admin-products-info").textContent = `${data.total || 0} producto${data.total === 1 ? "" : "s"} · página ${productPage} de ${productPages}`;
      $("admin-prev").disabled = productPage <= 1; $("admin-next").disabled = productPage >= productPages;
    } catch (e) { productsBox.innerHTML = `<p>${escapeHtml(e.message)}</p>`; }
  }
  async function loadCategories() {
    const data = await API.getAdminCategories(); categoryCache = data.data || [];
    const datalist = $("category-list"); if (datalist) datalist.innerHTML = categoryCache.map(c => `<option value="${escapeHtml(c.name)}">${c.active ? "Activa" : "Oculta"}</option>`).join("");
    categoriesBox.innerHTML = categoryCache.length ? categoryCache.map(c => `<article class="admin-product"><div style="display:flex;gap:12px;align-items:center;min-width:0;">${c.image ? `<img src="${escapeHtml(c.image)}" alt="" class="admin-thumb">` : `<span style="font-size:2rem;">${escapeHtml(c.emoji || "📌")}</span>`}<div><div class="admin-product-name">${escapeHtml(c.name)}</div><div class="admin-product-meta"><span>${c.count || 0} productos</span><span>${c.active ? "Activa" : "Oculta"}</span></div></div></div><div class="admin-actions"><button type="button" class="admin-btn-edit" data-edit-category="${c._id}">Editar</button><button type="button" class="admin-btn-delete" data-delete-category="${c._id}">Eliminar</button></div></article>`).join("") : "<p>No hay categorías.</p>";
  }

  productForm?.addEventListener("submit", async e => { e.preventDefault(); const button = $("product-submit"); const idAtStart = editingProductId; try { button.disabled = true; button.textContent = "Guardando..."; let image = $("product-image-existing").value || ""; if ($("product-image").files?.[0]) image = await fileInputToData("product-image"); const payload = { name: $("product-name").value.trim(), description: $("product-description").value.trim(), price: Number($("product-price").value), image, emoji: $("product-emoji").value.trim() || "🏷️", category: $("product-category").value.trim(), badge: $("product-badge").value.trim(), featured: $("product-featured").checked, available: $("product-available").checked, tags: $("product-tags").value.split(",").map(x => x.trim()).filter(Boolean).slice(0, 30) }; await API.saveProduct(payload, idAtStart); alert("Producto guardado correctamente."); resetProductForm(); await Promise.all([loadProducts(), loadCategories()]); } catch (e) { alert(e.message); } finally { button.disabled = false; button.textContent = editingProductId ? "Actualizar producto" : "Guardar producto"; } });
  categoryForm?.addEventListener("submit", async e => { e.preventDefault(); const button = $("category-submit"); const idAtStart = editingCategoryId; try { button.disabled = true; button.textContent = "Guardando..."; let image = $("category-image-existing").value || ""; if ($("category-image").files?.[0]) image = await fileInputToData("category-image"); await API.saveCategory({ name: $("category-name").value.trim(), image, emoji: $("category-emoji").value.trim() || "📌", active: $("category-active").checked }, idAtStart); alert("Categoría guardada correctamente."); resetCategoryForm(); await loadCategories(); } catch (e) { alert(e.message); } finally { button.disabled = false; button.textContent = editingCategoryId ? "Actualizar categoría" : "Guardar categoría"; } });

  productsBox?.addEventListener("click", async e => {
    const edit = e.target.closest("[data-edit-product]"), del = e.target.closest("[data-delete-product]");
    if (edit) { try { const p = (await API.getAdminProduct(edit.dataset.editProduct)).data; editingProductId = p._id; $("product-name").value=p.name||""; $("product-description").value=p.description||""; $("product-price").value=p.price??""; $("product-emoji").value=p.emoji||"🏷️"; $("product-category").value=p.category||""; $("product-badge").value=p.badge||""; $("product-tags").value=(p.tags||[]).join(", "); $("product-featured").checked=p.featured!==false; $("product-available").checked=p.available!==false; $("product-image-existing").value=p.image||""; $("product-image-preview").innerHTML=p.image?`<img src="${escapeHtml(p.image)}" alt="Vista previa">`:""; $("product-form-title").textContent="Editar calcomanía"; $("product-submit").textContent="Actualizar producto"; $("product-cancel").style.display="inline-flex"; window.scrollTo({top:0,behavior:"smooth"}); } catch(e){ alert(e.message); } }
    if (del) { if (!confirm("¿Eliminar esta calcomanía?")) return; try { await API.deleteProduct(del.dataset.deleteProduct); await Promise.all([loadProducts(), loadCategories()]); } catch(e){ alert(e.message); } }
  });
  categoriesBox?.addEventListener("click", async e => { const edit=e.target.closest("[data-edit-category]"), del=e.target.closest("[data-delete-category]"); if(edit){ const c=categoryCache.find(x=>x._id===edit.dataset.editCategory); if(!c)return; editingCategoryId=c._id; $("category-name").value=c.name||""; $("category-emoji").value=c.emoji||"📌"; $("category-active").checked=c.active!==false; $("category-image-existing").value=c.image||""; $("category-image-preview").innerHTML=c.image?`<img src="${escapeHtml(c.image)}" alt="Vista previa">`:""; $("category-form-title").textContent="Editar categoría"; $("category-submit").textContent="Actualizar categoría"; $("category-cancel").style.display="inline-flex"; window.scrollTo({top:0,behavior:"smooth"}); } if(del){ if(!confirm("¿Eliminar esta categoría?"))return; try{await API.deleteCategory(del.dataset.deleteCategory); await loadCategories();}catch(e){alert(e.message);} } });
  $("logout-btn")?.addEventListener("click", async () => { try { await API.logout(); } catch {} finally { location.replace("index.html"); } });
  $("product-cancel")?.addEventListener("click", resetProductForm); $("category-cancel")?.addEventListener("click", resetCategoryForm);
  $("admin-prev")?.addEventListener("click", () => { if (productPage > 1) { productPage--; loadProducts(); } });
  $("admin-next")?.addEventListener("click", () => { if (productPage < productPages) { productPage++; loadProducts(); } });
  let searchTimer; $("admin-product-search")?.addEventListener("input", e => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { productSearch = e.target.value.trim(); productPage = 1; loadProducts(); }, 250); });
  imagePreview("product-image", "product-image-preview"); imagePreview("category-image", "category-image-preview");
  function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));}
  requireAuth();
})();
