/* Cliente único de la API. Por defecto usa el mismo servidor que sirve la web. */
const API = (() => {
  const BASE_URL = (window.APP_CONFIG?.API_BASE || "/api").replace(/\/$/, "");

  async function request(path, options = {}) {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.message || "Error de comunicación con el servidor.");
      error.status = response.status;
      throw error;
    }
    return data;
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
    getFeatured: () => request("/products/featured"),
    getCategories: () => request("/categories"),
    getAdminCategories: () => request("/categories/admin"),
    getProduct: (id) => request(`/products/${encodeURIComponent(id)}`),
    login: (email, password) => request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
    logout: () => request("/auth/logout", { method: "POST" }),
    me: () => request("/auth/me"),
    saveProduct: (data, id = null) => request(id ? `/products/${id}` : "/products", { method: id ? "PUT" : "POST", body: JSON.stringify(data) }),
    deleteProduct: (id) => request(`/products/${id}`, { method: "DELETE" }),
    saveCategory: (data, id = null) => request(id ? `/categories/${id}` : "/categories", { method: id ? "PUT" : "POST", body: JSON.stringify(data) }),
    deleteCategory: (id) => request(`/categories/${id}`, { method: "DELETE" }),
  };
})();
