const BRAND = { name: "Decocars", tagline: "Calcomanías de vinilo premium", year: new Date().getFullYear() };
const CATEGORY_EMOJI = { Naturaleza: "🌿", Astral: "🪐", Retro: "📼", Minimal: "⚡", Animales: "🦋", Urbano: "🏙️", Arte: "🎨", Especial: "🎁" };
const State = {
  activeFilter: "all", searchQuery: "", page: 1, totalPages: 1, darkMode: false,
  categories: [], catalogItems: [], catalogRequestId: 0, loadingCatalog: false,
};

window.addEventListener("DOMContentLoaded", async () => {
  applyBrand(); initDarkMode(); initNavbar(); initMobileMenu(); initSearchToggle(); initSearchInputs(); initModal(); initLogin(); initReveal(); initSort(); initAdminButton(); initMobileLogin();
  if (new URLSearchParams(location.search).get("login") === "1") openLogin();
  try {
    await Promise.all([loadCategories(), loadFeatured()]);
    await loadCatalog();
    await updateStats();
  } catch (e) {
    console.error(e);
    showCatalogMessage(e.message || "No se pudo conectar con el catálogo.");
  }
});

function applyBrand() {
  document.title = BRAND.name;
  ["page-title", "nav-brand", "footer-brand"].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = BRAND.name; });
  const copy = document.getElementById("footer-copy"); if (copy) copy.textContent = `© ${BRAND.year} ${BRAND.name}. Todos los derechos reservados.`;
}
function initDarkMode() { const saved = localStorage.getItem("decocars-dark"); setDark(saved === "true"); document.getElementById("dark-toggle")?.addEventListener("click", () => setDark(!State.darkMode)); }
function setDark(enabled) { State.darkMode = enabled; document.documentElement.classList.toggle("dark", enabled); localStorage.setItem("decocars-dark", String(enabled)); const m = document.getElementById("icon-moon"), s = document.getElementById("icon-sun"); if (m) m.style.display = enabled ? "none" : ""; if (s) s.style.display = enabled ? "" : "none"; }
function initNavbar() {
  const n = document.getElementById("navbar");
  if (n) window.addEventListener("scroll", () => n.classList.toggle("scrolled", scrollY > 20), { passive: true });
  const links = [...document.querySelectorAll(".nav-link[data-section]")];
  const sections = links.map(a => document.getElementById(a.dataset.section)).filter(Boolean);
  if (links.length && sections.length && window.IntersectionObserver) {
    const io = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      links.forEach(a => a.classList.toggle("active", a.dataset.section === entry.target.id));
    }), { rootMargin: "-35% 0px -55% 0px", threshold: 0 });
    sections.forEach(s => io.observe(s));
  }
}
function initMobileMenu() {
  const b = document.getElementById("mobile-menu-btn"), m = document.getElementById("mobile-menu"); if (!b || !m) return;
  b.addEventListener("click", () => { const open = !m.classList.contains("open"); m.classList.toggle("open", open); b.setAttribute("aria-expanded", String(open)); const o = document.getElementById("ham-open"), c = document.getElementById("ham-close"); if (o) o.style.display = open ? "none" : ""; if (c) c.style.display = open ? "" : "none"; });
}
window.closeMobileMenu = () => { const m = document.getElementById("mobile-menu"), b = document.getElementById("mobile-menu-btn"); m?.classList.remove("open"); b?.setAttribute("aria-expanded", "false"); document.getElementById("ham-open")?.style.removeProperty("display"); document.getElementById("ham-close")?.style.setProperty("display", "none"); };
function initSearchToggle() { const b = document.getElementById("search-toggle-btn"), w = document.getElementById("nav-search-wrap"), i = document.getElementById("nav-search-input"); if (!b || !w || !i) return; b.addEventListener("click", () => { const show = w.style.display === "none" || !w.style.display; w.style.display = show ? "flex" : "none"; if (show) i.focus(); }); }
function initSearchInputs() {
  const inputs = ["catalog-search", "nav-search-input", "mobile-search-input"].map(id => document.getElementById(id)).filter(Boolean); let timer;
  inputs.forEach(input => input.addEventListener("input", () => {
    const value = input.value.trim(); inputs.forEach(other => { if (other !== input) other.value = value; }); clearTimeout(timer);
    timer = setTimeout(() => { State.searchQuery = value; State.page = 1; State.catalogItems = []; loadCatalog(); }, 300);
  }));
}
function initSort() { document.getElementById("sort-select")?.addEventListener("change", () => { State.page = 1; State.catalogItems = []; loadCatalog(); }); }
function initMobileLogin() { const b = document.getElementById("mobile-login-btn"); if (b) b.addEventListener("click", () => { closeMobileMenu(); openLogin(); }); }
function initAdminButton() {
  const button = document.getElementById("admin-panel-btn"); if (!button) return;
  API.me().then(() => { button.style.display = "inline-flex"; const mobile = document.getElementById("mobile-admin-btn"); if (mobile) mobile.style.display = "block"; const goAdmin = () => { closeMobileMenu(); location.href = "admin.html"; }; button.addEventListener("click", goAdmin); mobile?.addEventListener("click", goAdmin); }).catch(() => {});
}

async function loadCategories() {
  const container = document.getElementById("categories-grid"); if (!container) return;
  const response = await API.getCategories(); State.categories = response.data || [];
  renderCategories(State.categories, container); renderFilterPills(State.categories);
  document.getElementById("categories-skeleton")?.style.setProperty("display", "none"); container.style.display = "grid";
}
function renderCategories(categories, container) {
  container.innerHTML = categories.map(cat => {
    const emoji = cat.emoji || CATEGORY_EMOJI[cat.name] || "📌";
    const image = cat.image ? `<img class="category-card-bg" src="${escapeAttr(cat.image)}" alt="" loading="lazy">` : "";
    return `<button class="category-card" data-category="${escapeAttr(cat.name)}">${image}<span class="category-card-overlay"></span><span class="category-card-content"><span class="category-card-icon">${escapeHtml(emoji)}</span><strong>${escapeHtml(cat.name)}</strong><small>${cat.count || 0} diseño${cat.count === 1 ? "" : "s"}</small></span></button>`;
  }).join("") || `<p style="grid-column:1/-1;text-align:center;">Aún no hay categorías.</p>`;
  container.querySelectorAll("[data-category]").forEach(btn => btn.addEventListener("click", () => filterByCategory(btn.dataset.category)));
}
function renderFilterPills(categories) {
  const box = document.getElementById("filter-pills"); if (!box) return;
  box.innerHTML = `<button class="filter-pill ${State.activeFilter === "all" ? "active" : ""}" data-filter="all">Todos</button>` + categories.map(c => `<button class="filter-pill ${State.activeFilter === c.name ? "active" : ""}" data-filter="${escapeAttr(c.name)}">${escapeHtml(c.name)}</button>`).join("");
  box.querySelectorAll(".filter-pill").forEach(btn => btn.addEventListener("click", () => { State.activeFilter = btn.dataset.filter; State.page = 1; State.catalogItems = []; renderFilterPills(categories); loadCatalog(); }));
}
window.filterByCategory = category => { State.activeFilter = category; State.page = 1; State.catalogItems = []; renderFilterPills(State.categories); loadCatalog(); document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" }); };

async function loadCatalog({ append = false } = {}) {
  const grid = document.getElementById("catalog-grid"); if (!grid) return;
  const skeleton = document.getElementById("catalog-skeleton"), empty = document.getElementById("empty-state"), pagination = document.getElementById("pagination-wrap"), more = document.getElementById("load-more-btn");
  const requestId = ++State.catalogRequestId; State.loadingCatalog = true;
  if (!append) { if (skeleton) skeleton.style.display = "grid"; grid.style.display = "none"; }
  if (more) { more.disabled = true; more.textContent = "Cargando…"; }
  try {
    const select = document.getElementById("sort-select")?.value || "createdAt_desc"; const [sort, order] = select.split("_");
    const response = await API.getProducts({ category: State.activeFilter, search: State.searchQuery, page: State.page, limit: 12, sort, order });
    if (requestId !== State.catalogRequestId) return;
    State.totalPages = response.pages || 1;
    const incoming = response.data || [];
    State.catalogItems = append ? [...State.catalogItems, ...incoming] : incoming;
    renderProducts(State.catalogItems, grid);
    if (skeleton) skeleton.style.display = "none";
    grid.style.display = State.catalogItems.length ? "grid" : "none";
    if (empty) empty.style.display = State.catalogItems.length ? "none" : "block";
    if (pagination) pagination.style.display = State.totalPages > State.page ? "block" : "none";
    if (more) { more.disabled = false; more.innerHTML = `Cargar más diseños <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12l7 7 7-7" /></svg>`; }
    const info = document.getElementById("result-info"); if (info) info.textContent = `${response.total || 0} diseño${response.total === 1 ? "" : "s"} disponible${response.total === 1 ? "" : "s"}.`;
  } catch (error) {
    if (requestId !== State.catalogRequestId) return;
    if (skeleton) skeleton.style.display = "none"; if (more) { more.disabled = false; more.textContent = "Cargar más diseños"; } showCatalogMessage(error.message);
  } finally { if (requestId === State.catalogRequestId) State.loadingCatalog = false; }
}
function renderProducts(products, container) {
  container.innerHTML = products.map(p => {
    const image = p.image ? `<img src="${escapeAttr(p.image)}" alt="${escapeAttr(p.name)}" loading="lazy">` : `<span class="product-image-emoji">${escapeHtml(p.emoji || "🏷️")}</span>`;
    const badge = p.badge ? `<span class="card-badge">${escapeHtml(p.badge)}</span>` : "";
    return `<article class="product-card reveal on"><div class="product-image-wrap">${image}${badge}</div><div class="product-card-body"><span class="product-category">${escapeHtml(p.category)}</span><h3 class="product-title">${escapeHtml(p.name)}</h3><p class="product-desc">${escapeHtml(p.description)}</p><div class="product-footer"><strong class="product-price">₡${Number(p.price).toLocaleString("es-CR")}</strong><button class="btn-detail" data-product-id="${escapeAttr(p._id)}">Ver más</button></div></div></article>`;
  }).join("");
  container.querySelectorAll("[data-product-id]").forEach(btn => btn.addEventListener("click", () => openProductModal(btn.dataset.productId)));
}

async function loadFeatured() {
  const cards = [...document.querySelectorAll("#featured-card-1, #featured-card-2, #featured-card-3")]; if (!cards.length) return;
  const response = await API.getFeatured(); const products = response.data || [];
  cards.forEach((card, index) => {
    const p = products[index];
    if (!p) { card.style.display = "none"; return; }
    card.style.display = "flex"; card.querySelector(".fc-icon").textContent = p.image ? "🖼️" : (p.emoji || "🏷️"); card.querySelector(".fc-name").textContent = p.name; card.querySelector(".fc-cat").textContent = `${p.category}${p.badge ? ` · ${p.badge}` : ""}`; card.querySelector(".fc-price").textContent = `₡${Number(p.price).toLocaleString("es-CR")}`; card.dataset.productId = p._id;
    card.onclick = () => openProductModal(p._id); card.setAttribute("role", "button"); card.setAttribute("tabindex", "0");
  });
}
async function updateStats() {
  try {
    const response = await API.getProducts({ page: 1, limit: 1 });
    const featuredCount = await API.getProducts({ featured: true, page: 1, limit: 1 });
    const stats = { "stat-designs": `${response.total || 0}`, "stat-categories": `${State.categories.length}`, "stat-featured": `${featuredCount.total || 0}`, "stat-country": "Costa Rica" };
    Object.entries(stats).forEach(([id, value]) => { const el = document.getElementById(id); if (el) el.textContent = value; });
  } catch {}
}

window.openProductModal = async id => {
  try {
    const p = (await API.getProduct(id)).data, modal = document.getElementById("product-modal"); if (!modal) return;
    setText("modal-category-el", p.category); setText("modal-name-el", p.name); setText("modal-desc-el", p.description); setText("modal-price-el", `₡${Number(p.price).toLocaleString("es-CR")}`); setText("modal-emoji-el", p.image ? "" : (p.emoji || "🏷️")); setText("modal-badge-el", p.badge || "");
    const area = document.getElementById("modal-image-area"); if (area) {
      area.innerHTML = p.image ? `<img class="modal-image-real" src="${escapeAttr(p.image)}" alt="${escapeAttr(p.name)}">` : `<span class="modal-image-emoji">${escapeHtml(p.emoji || "🏷️")}</span>`;
    }
    const tags = document.getElementById("modal-tags-el"); if (tags) tags.innerHTML = (p.tags || []).map(t => `<span>${escapeHtml(t)}</span>`).join("");
    const wa = document.querySelector("#product-modal a[href^='https://wa.me/']"); const number = String(window.APP_CONFIG?.WHATSAPP || "").replace(/\D/g, "");
    if (wa) { if (number) { wa.href = `https://wa.me/${number}?text=${encodeURIComponent(`Hola, me interesa la calcomanía "${p.name}".`)}`; wa.style.display = "inline-flex"; } else { wa.removeAttribute("href"); wa.style.display = "none"; } }
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
document.getElementById("load-more-btn")?.addEventListener("click", () => { if (!State.loadingCatalog && State.page < State.totalPages) { State.page += 1; loadCatalog({ append: true }); } });
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c])); }
function escapeAttr(value) { return escapeHtml(value).replace(/`/g, "&#096;"); }
