const express = require("express");
const Product = require("../models/Product");
const Category = require("../models/Category");
const auth = require("../middleware/auth");

const router = express.Router();

function publicCategoryFilter() {
  return Category.find({ active: true }).select("name").lean();
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildProductFilter(query, { publicOnly = false } = {}) {
  const { category, search, featured, available } = query;
  const filter = {};
  if (publicOnly) filter.available = true;
  else if (available !== undefined) filter.available = available === "true";
  if (featured !== undefined) filter.featured = featured === "true";
  if (category && category !== "all") filter.category = category;
  if (search) {
    const safe = escapeRegex(search.trim());
    filter.$or = [
      { name: { $regex: safe, $options: "i" } },
      { description: { $regex: safe, $options: "i" } },
      { category: { $regex: safe, $options: "i" } },
      { tags: { $regex: safe, $options: "i" } },
    ];
  }
  return filter;
}

async function restrictToActiveCategories(filter) {
  const categories = await publicCategoryFilter();
  const names = categories.map(c => c.name);
  if (filter.category) {
    if (!names.includes(filter.category)) return { ...filter, _id: { $exists: false } };
  } else {
    filter.category = { $in: names };
  }
  return filter;
}

router.get("/", async (req, res) => {
  try {
    let filter = buildProductFilter(req.query, { publicOnly: true });
    filter = await restrictToActiveCategories(filter);
    const { sort = "createdAt", order = "desc", page = 1, limit = 20 } = req.query;
    const allowedSort = ["createdAt", "price", "name"];
    const sortKey = allowedSort.includes(sort) ? sort : "createdAt";
    const sortObj = { [sortKey]: order === "asc" ? 1 : -1, _id: -1 };
    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const pageLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (currentPage - 1) * pageLimit;
    const [products, total] = await Promise.all([
      Product.find(filter).sort(sortObj).skip(skip).limit(pageLimit).lean(),
      Product.countDocuments(filter),
    ]);
    res.json({ success: true, total, page: currentPage, pages: Math.max(Math.ceil(total / pageLimit), 1), data: products });
  } catch (error) {
    console.error("GET products:", error);
    res.status(500).json({ success: false, message: "Error interno del servidor." });
  }
});

router.get("/admin", auth, async (req, res) => {
  try {
    const filter = buildProductFilter(req.query);
    const currentPage = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const pageLimit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    const sort = ["createdAt", "price", "name"].includes(req.query.sort) ? req.query.sort : "createdAt";
    const order = req.query.order === "asc" ? 1 : -1;
    const skip = (currentPage - 1) * pageLimit;
    const [products, total] = await Promise.all([
      Product.find(filter).sort({ [sort]: order, _id: -1 }).skip(skip).limit(pageLimit).lean(),
      Product.countDocuments(filter),
    ]);
    res.json({ success: true, total, page: currentPage, pages: Math.max(Math.ceil(total / pageLimit), 1), data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener productos del administrador." });
  }
});

router.get("/featured", async (req, res) => {
  try {
    const filter = await restrictToActiveCategories({ featured: true, available: true });
    const products = await Product.find(filter).sort({ createdAt: -1, _id: -1 }).limit(8).lean();
    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener destacados." });
  }
});

router.get("/categories", async (req, res) => {
  try {
    const activeCategories = await publicCategoryFilter();
    const names = activeCategories.map(c => c.name);
    const categories = await Product.aggregate([
      { $match: { available: true, category: { $in: names } } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ]);
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener categorías." });
  }
});

router.get("/admin/:id", auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) return res.status(404).json({ success: false, message: "Producto no encontrado." });
    res.json({ success: true, data: product });
  } catch {
    res.status(400).json({ success: false, message: "ID de producto inválido." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const filter = await restrictToActiveCategories({ _id: req.params.id, available: true });
    const product = await Product.findOne(filter).lean();
    if (!product) return res.status(404).json({ success: false, message: "Producto no encontrado o no disponible." });
    res.json({ success: true, data: product });
  } catch {
    res.status(400).json({ success: false, message: "ID de producto inválido." });
  }
});

const allowedFields = ["name", "description", "price", "category", "emoji", "image", "colorAccent", "featured", "available", "badge", "tags"];
function cleanProduct(body) {
  const result = {};
  for (const field of allowedFields) if (body[field] !== undefined) result[field] = body[field];
  if (result.name !== undefined) result.name = String(result.name).trim();
  if (result.description !== undefined) result.description = String(result.description).trim();
  if (result.category !== undefined) result.category = String(result.category).trim();
  if (result.emoji !== undefined) result.emoji = String(result.emoji).trim() || "🎨";
  if (result.badge !== undefined) result.badge = String(result.badge).trim();
  if (result.tags !== undefined) result.tags = Array.isArray(result.tags) ? result.tags.map(v => String(v).trim()).filter(Boolean).slice(0, 30) : [];
  if (result.image && String(result.image).length > 1500000) throw new Error("La imagen es demasiado grande.");
  return result;
}

async function validateProductData(data, id = null) {
  if (!data.name || !data.description || !data.category) throw new Error("Nombre, descripción y categoría son obligatorios.");
  if (data.price === undefined || !Number.isFinite(Number(data.price)) || Number(data.price) < 0) throw new Error("El precio debe ser un número mayor o igual a 0.");
  const category = await Category.findOne({ name: data.category }).lean();
  if (!category) throw new Error("La categoría seleccionada no existe.");
  if (!category.active) throw new Error("La categoría seleccionada está oculta. Actívela antes de asignarle productos.");
  const duplicateFilter = { name: { $regex: `^${escapeRegex(data.name)}$`, $options: "i" } };
  if (id) duplicateFilter._id = { $ne: id };
  if (await Product.exists(duplicateFilter)) throw new Error("Ya existe un producto con ese nombre.");
}

router.post("/", auth, async (req, res) => {
  try {
    const data = cleanProduct(req.body);
    await validateProductData(data);
    const product = await Product.create(data);
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put("/:id", auth, async (req, res) => {
  try {
    const data = cleanProduct(req.body);
    await validateProductData(data, req.params.id);
    const product = await Product.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ success: false, message: "Producto no encontrado." });
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: "Producto no encontrado." });
    res.json({ success: true, message: "Producto eliminado." });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
