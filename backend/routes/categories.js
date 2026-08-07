const express = require("express");
const Category = require("../models/Category");
const Product = require("../models/Product");
const auth = require("../middleware/auth");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const categories = await Category.find({ active: true }).sort({ name: 1 }).lean();
    const counts = await Product.aggregate([
      { $match: { available: true } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [c._id, c.count]));

    res.json({
      success: true,
      data: categories.map((c) => ({ ...c, count: countMap.get(c.name) || 0 })),
    });
  } catch (error) {
    console.error("GET categories:", error);
    res.status(500).json({ success: false, message: "Error al obtener categorías." });
  }
});

router.get("/admin", auth, async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 }).lean();
    const counts = await Product.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]);
    const countMap = new Map(counts.map(c => [c._id, c.count]));
    res.json({ success: true, data: categories.map(c => ({ ...c, count: countMap.get(c.name) || 0 })) });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener categorías del administrador." });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const image = String(req.body.image || "");
    if (!name) return res.status(400).json({ success: false, message: "El nombre es obligatorio." });
    if (image.length > 1500000) return res.status(400).json({ success: false, message: "La imagen es demasiado grande." });
    const category = await Category.create({
      name,
      image,
      emoji: String(req.body.emoji || "📌").trim(),
      active: req.body.active !== false,
    });
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    const message = error.code === 11000 ? "Ya existe una categoría con ese nombre." : error.message;
    res.status(400).json({ success: false, message });
  }
});

router.put("/:id", auth, async (req, res) => {
  try {
    const update = {
      name: String(req.body.name || "").trim(),
      image: String(req.body.image || ""),
      emoji: String(req.body.emoji || "📌").trim(),
      active: req.body.active !== false,
    };
    if (update.image.length > 1500000) return res.status(400).json({ success: false, message: "La imagen es demasiado grande." });
    const previous = await Category.findById(req.params.id).lean();
    if (!previous) return res.status(404).json({ success: false, message: "Categoría no encontrada." });
    const category = await Category.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }).lean();
    if (previous.name !== category.name) await Product.updateMany({ category: previous.name }, { $set: { category: category.name } });
    res.json({ success: true, data: category });
  } catch (error) {
    const message = error.code === 11000 ? "Ya existe una categoría con ese nombre." : error.message;
    res.status(400).json({ success: false, message });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).lean();
    if (!category) return res.status(404).json({ success: false, message: "Categoría no encontrada." });
    const inUse = await Product.exists({ category: category.name });
    if (inUse) return res.status(409).json({ success: false, message: "No puede eliminar una categoría que todavía tiene productos. Primero cambie sus productos de categoría." });
    await Category.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Categoría eliminada." });
  } catch {
    res.status(400).json({ success: false, message: "ID de categoría inválido." });
  }
});

module.exports = router;
