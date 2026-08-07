const BRAND = { name: "CalcoDesign", tagline: "Calcomanías de vinilo premium", year: new Date().getFullYear() };
const CATEGORY_EMOJI = { Naturaleza: "🌿", Astral: "🪐", Retro: "📼", Minimal: "⚡", Animales: "🦋", Urbano: "🏙️", Arte: "🎨", Especial: "🎁" };
const State = { activeFilter: "all", searchQuery: "", page: 1, totalPages: 1, darkMode: false, categories: [] };

window.addEventListener("DOMContentLoaded", async () => {
  applyBrand(); initDarkMode(); initNavbar(); initMobileMenu(); initSearchToggle(); initSearchInputs(); initModal(); initLogin(); initReveal(); initSort();
  if (new URLSearchParams(location.search).get("login") === "1") openLogin();
  try { await loadCategories(); await loadCatalog(); } catch (e) { console.error(e); showCatalogMessage(e.message || "No se pudo conectar con el catálogo."); }
});

function applyBrand() {
  document.title = BRAND.name;
  ["page-title", "nav-brand", "footer-brand"].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = BRAND.name; });
  const copy = document.getElementById("footer-copy"); if (copy) copy.textContent = `© ${BRAND.year} ${BRAND.name}. Todos los derechos reservados.`;
}
function initDarkMode() { const saved = localStorage.getItem("calco-dark"); setDark(saved === "true"); document.getElementById("dark-toggle")?.addEventListener("click", () => setDark(!State.darkMode)); }
function setDark(enabled) { State.darkMode = enabled; document.documentElement.classList.toggle("dark", enabled); localStorage.setItem("calco-dark", String(enabled)); const m = document.getElementById("icon-moon"), s = document.getElementById("icon-sun"); if (m) m.style.display = enabled ? "none" : ""; if (s) s.style.display = enabled ? "" : "none"; }
function initNavbar() { const n = document.getElementById("navbar"); if (!n) return; window.addEventListener("scroll", () => n.classList.toggle("scrolled", scrollY > 20), { passive: true }); }
function initMobileMenu() { const b = document.getElementById("mobile-menu-btn"), m = document.getElementById("mobile-menu"); if (!b || !m) return; b.addEventListener("click", () => m.classList.toggle("open")); }
window.closeMobileMenu = () => document.getElementById("mobile-menu")?.classList.remove("open");
function initSearchToggle() { const b = document.getElementById("search-toggle-btn"), w = document.getElementById("nav-search-wrap"), i = document.getElementById("nav-search-input"); if (!b || !w || !i) return; b.addEventListener("click", () => { const show = w.style.display === "none" || !w.style.display; w.style.display = show ? "flex" : "none"; if (show) i.focus(); }); }
function initSearchInputs() { const inputs = ["catalog-search", "nav-search-input", "mobile-search-input"].map(id => document.getElementById(id)).filter(Boolean); let timer; inputs.forEach(input => input.addEventListener("input", () => { const value = input.value.trim(); inputs.forEach(other => { if (other !== input) other.value = value; }); clearTimeout(timer); timer = setTimeout(() => { State.searchQuery = value; State.page = 1; loadCatalog(); }, 300); })); }
function initSort() { document.getElementById("sort-select")?.addEventListener("change", () => { State.page = 1; loadCatalog(); }); }

async function loadCategories() {
  const container = document.getElementById("categories-grid"); if (!container) return;
  const response = await API.getCategories(); State.categories = response.data || [];
  renderCategories(State.categories, container); renderFilterPills(State.categories);
  document.getElementById("categories-skeleton")?.style.setProperty("display", "none"); container.style.display = "grid";
}
function renderCategories(categories, container) {
  container.innerHTML = categories.map(cat => {
    const image = cat.image ? `url("${escapeAttr(cat.image)}")` : "none";
    const emoji = cat.emoji || CATEGORY_EMOJI[cat.name] || "📌";
    return `<button class="category-card" onclick="filterByCategory('${escapeAttr(cat.name)}')" style="background-image:${image};"><span class="category-card-overlay"></span><span class="category-card-content"><span class="category-card-icon">${escapeHtml(emoji)}</span><strong>${escapeHtml(cat.name)}</strong><small>${cat.count || 0} diseño${cat.count === 1 ? "" : "s"}</small></span></button>`;
  }).join("") || `<p style="grid-column:1/-1;text-align:center;">Aún no hay categorías.</p>`;
}
function renderFilterPills(categories) {
  const box = document.getElementById("filter-pills"); if (!box) return;
  box.innerHTML = `<button class="filter-pill ${State.activeFilter === "all" ? "active" : ""}" data-filter="all">Todos</button>` + categories.map(c => `<button class="filter-pill ${State.activeFilter === c.name ? "active" : ""}" data-filter="${escapeAttr(c.name)}">${escapeHtml(c.name)}</button>`).join("");
  box.querySelectorAll(".filter-pill").forEach(btn => btn.addEventListener("click", () => { State.activeFilter = btn.dataset.filter; State.page = 1; renderFilterPills(categories); loadCatalog(); }));
}
window.filterByCategory = category => { State.activeFilter = category; State.page = 1; renderFilterPills(State.categories); loadCatalog(); document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" }); };

async function loadCatalog() {
  const grid = document.getElementById("catalog-grid"); if (!grid) return;
  const skeleton = document.getElementById("catalog-skeleton"), empty = document.getElementById("empty-state"), pagination = document.getElementById("pagination-wrap");
  if (skeleton) skeleton.style.display = "grid"; grid.style.display = "none";
  try {
    const select = document.getElementById("sort-select")?.value || "createdAt_desc";
    const [sort, order] = select.split("_");
    const response = await API.getProducts({ category: State.activeFilter, search: State.searchQuery, page: State.page, limit: 12, sort, order });
    State.totalPages = response.pages || 1; renderProducts(response.data || [], grid);
    if (skeleton) skeleton.style.display = "none"; grid.style.display = response.data?.length ? "grid" : "none"; if (empty) empty.style.display = response.data?.length ? "none" : "block"; if (pagination) pagination.style.display = State.totalPages > State.page ? "block" : "none";
    const info = document.getElementById("result-info"); if (info) info.textContent = `${response.total || 0} diseño${response.total === 1 ? "" : "s"} disponible${response.total === 1 ? "" : "s"}.`;
  } catch (error) { if (skeleton) skeleton.style.display = "none"; showCatalogMessage(error.message); }
}
function renderProducts(products, container) {
  container.innerHTML = products.map(p => {
    const image = p.image ? `<img src="${escapeAttr(p.image)}" alt="${escapeAttr(p.name)}" loading="lazy">` : `<span class="product-image-emoji">${escapeHtml(p.emoji || "🏷️")}</span>`;
    const badge = p.badge ? `<span class="card-badge">${escapeHtml(p.badge)}</span>` : "";
    return `<article class="product-card reveal on"><div class="product-image-wrap">${image}${badge}</div><div class="product-card-body"><span class="product-category">${escapeHtml(p.category)}</span><h3 class="product-title">${escapeHtml(p.name)}</h3><p class="product-desc">${escapeHtml(p.description)}</p><div class="product-footer"><strong class="product-price">₡${Number(p.price).toLocaleString("es-CR")}</strong><button class="btn-detail" onclick="openProductModal('${escapeAttr(p._id)}')">Ver más</button></div></div></article>`;
  }).join("");
}
window.openProductModal = async id => {
  try {
    const p = (await API.getProduct(id)).data, modal = document.getElementById("product-modal"); if (!modal) return;
    setText("modal-category-el", p.category); setText("modal-name-el", p.name); setText("modal-desc-el", p.description); setText("modal-price-el", `₡${Number(p.price).toLocaleString("es-CR")}`); setText("modal-emoji-el", p.image ? "" : (p.emoji || "🏷️")); setText("modal-badge-el", p.badge || "");
    const area = document.getElementById("modal-image-area"); if (area) { area.style.backgroundImage = p.image ? `url("${p.image}")` : ""; area.style.backgroundSize = "cover"; area.style.backgroundPosition = "center"; }
    const tags = document.getElementById("modal-tags-el"); if (tags) tags.innerHTML = (p.tags || []).map(t => `<span>${escapeHtml(t)}</span>`).join("");
    const wa = document.querySelector("#product-modal a[href^='https://wa.me/']"); if (wa) wa.href = `https://wa.me/${window.APP_CONFIG?.WHATSAPP || "50612345678"}?text=${encodeURIComponent(`Hola, me interesa la calcomanía "${p.name}".`)}`;
    modal.classList.add("open"); document.body.style.overflow = "hidden";
  } catch (error) { alert(error.message); }
};
function initModal() { const modal = document.getElementById("product-modal"); document.getElementById("modal-close-btn")?.addEventListener("click", closeModal); document.getElementById("modal-close-btn2")?.addEventListener("click", closeModal); modal?.addEventListener("click", e => { if (e.target === modal) closeModal(); }); document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); }); }
function closeModal() { document.getElementById("product-modal")?.classList.remove("open"); document.body.style.overflow = ""; }
function setText(id, text) { const el = document.getElementById(id); if (el) el.textContent = text ?? ""; }
function initLogin() { const form = document.getElementById("login-form"); document.getElementById("login-btn")?.addEventListener("click", openLogin); document.getElementById("close-login")?.addEventListener("click", closeLogin); document.getElementById("login-modal")?.addEventListener("click", e => { if (e.target.id === "login-modal") closeLogin(); }); form?.addEventListener("submit", async e => { e.preventDefault(); const button = form.querySelector("button[type=submit]"); try { button.disabled = true; button.textContent = "Verificando..."; await API.login(document.getElementById("login-email").value.trim(), document.getElementById("login-password").value); closeLogin(); location.href = "admin.html"; } catch (error) { alert(error.message); } finally { button.disabled = false; button.textContent = "Iniciar sesión"; } }); }
function openLogin() { document.getElementById("login-modal")?.classList.add("active"); document.getElementById("login-email")?.focus(); }
function closeLogin() { document.getElementById("login-modal")?.classList.remove("active"); }
function showCatalogMessage(message) { const grid = document.getElementById("catalog-grid"); if (grid) { grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;">${escapeHtml(message)}</p>`; grid.style.display = "grid"; } document.getElementById("catalog-skeleton")?.style.setProperty("display", "none"); }
function initReveal() { if (!window.IntersectionObserver) return; const io = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("on"); io.unobserve(e.target); } }), { threshold: .08 }); document.querySelectorAll(".reveal").forEach(el => io.observe(el)); }
document.getElementById("load-more-btn")?.addEventListener("click", () => { if (State.page < State.totalPages) { State.page += 1; loadCatalog(); } });
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c])); }
function escapeAttr(value) { return escapeHtml(value).replace(/`/g, "&#096;"); }
