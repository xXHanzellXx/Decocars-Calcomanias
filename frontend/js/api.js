/* Cliente único de la API. Funciona en el mismo dominio o con un backend separado configurado en config.js. */
const API = (() => {
  const BASE_URL = (window.APP_CONFIG?.API_BASE || "/api").replace(/\/$/, "");
  let csrfToken = "";

  async function request(path, options = {}) {
    const method = String(options.method || "GET").toUpperCase();
    const headers = { ...(options.headers || {}) };
    if (options.body !== undefined && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && csrfToken) headers["X-CSRF-Token"] = csrfToken;
    const response = await fetch(`${BASE_URL}${path}`, { ...options, credentials: "include", headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.message || "Error de comunicación con el servidor.");
      error.status = response.status;
      throw error;
    }
    return data;
  }

  async function ensureCsrf() {
    if (csrfToken) return csrfToken;
    const data = await request("/auth/csrf");
    csrfToken = data.token || "";
    return csrfToken;
  }

  async function mutate(path, options) {
    await ensureCsrf();
    try {
      return await request(path, options);
    } catch (error) {
      if (error.status === 403) {
        csrfToken = "";
        await ensureCsrf();
        return request(path, options);
      }
      throw error;
    }
  }

  const qs = (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") query.set(key, value);
    });
    const result = query.toString();
    return result ? `?${result}` : "";
  };

  return {
    getProducts: (params) => request(`/products${qs(params)}`),
    getAdminProducts: (params) => request(`/products/admin${qs(params)}`),
    getFeatured: () => request("/products/featured"),
    getCategories: () => request("/categories"),
    getAdminCategories: () => request("/categories/admin"),
    getProduct: (id) => request(`/products/${encodeURIComponent(id)}`),
    getAdminProduct: (id) => request(`/products/admin/${encodeURIComponent(id)}`),
    login: (email, password) => request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
    logout: () => mutate("/auth/logout", { method: "POST" }),
    me: () => request("/auth/me"),
    saveProduct: (data, id = null) => mutate(id ? `/products/${id}` : "/products", { method: id ? "PUT" : "POST", body: JSON.stringify(data) }),
    deleteProduct: (id) => mutate(`/products/${id}`, { method: "DELETE" }),
    saveCategory: (data, id = null) => mutate(id ? `/categories/${id}` : "/categories", { method: id ? "PUT" : "POST", body: JSON.stringify(data) }),
    deleteCategory: (id) => mutate(`/categories/${id}`, { method: "DELETE" }),
  };
})();
