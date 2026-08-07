const express = require("express");
const Product = require("../models/Product");
const auth = require("../middleware/auth");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const {
      category,
      search,
      featured,
      available,
      sort = "createdAt",
      order = "desc",
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};
    if (category && category !== "all") filter.category = category;
    if (featured !== undefined) filter.featured = featured === "true";
    if (available !== undefined) filter.available = available === "true";

    if (search) {
      const safe = String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { name: { $regex: safe, $options: "i" } },
        { description: { $regex: safe, $options: "i" } },
        { category: { $regex: safe, $options: "i" } },
        { tags: { $regex: safe, $options: "i" } },
      ];
    }

    const allowedSort = ["createdAt", "price", "name"];
    const sortKey = allowedSort.includes(sort) ? sort : "createdAt";
    const sortObj = { [sortKey]: order === "asc" ? 1 : -1 };
    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const pageLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (currentPage - 1) * pageLimit;

    const [products, total] = await Promise.all([
      Product.find(filter).sort(sortObj).skip(skip).limit(pageLimit).lean(),
      Product.countDocuments(filter),
    ]);

    res.json({
      success: true,
      total,
      page: currentPage,
      pages: Math.max(Math.ceil(total / pageLimit), 1),
      data: products,
    });
  } catch (error) {
    console.error("GET products:", error);
    res.status(500).json({ success: false, message: "Error interno del servidor." });
  }
});

router.get("/featured", async (req, res) => {
  try {
    const products = await Product.find({ featured: true, available: true })
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();
    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener destacados." });
  }
});

router.get("/categories", async (req, res) => {
  try {
    const categories = await Product.aggregate([
      { $match: { available: true } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ]);
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener categorías." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) return res.status(404).json({ success: false, message: "Producto no encontrado." });
    res.json({ success: true, data: product });
  } catch {
    res.status(400).json({ success: false, message: "ID de producto inválido." });
  }
});

const allowedFields = ["name", "description", "price", "category", "emoji", "image", "colorAccent", "featured", "available", "badge", "tags"];
function cleanProduct(body) {
  const result = {};
  for (const field of allowedFields) if (body[field] !== undefined) result[field] = body[field];
  if (result.tags !== undefined) result.tags = Array.isArray(result.tags) ? result.tags.map(v => String(v).trim()).filter(Boolean).slice(0, 30) : [];
  if (result.image && String(result.image).length > 1500000) throw new Error("La imagen es demasiado grande.");
  return result;
}

router.post("/", auth, async (req, res) => {
  try {
    const product = await Product.create(cleanProduct(req.body));
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put("/:id", auth, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, cleanProduct(req.body), { new: true, runValidators: true });
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
