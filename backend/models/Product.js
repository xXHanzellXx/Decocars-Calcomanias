const mongoose = require("mongoose");

const imageValidator = {
  validator: value => !value || /^(https?:\/\/|data:image\/)/i.test(value),
  message: "La imagen debe ser una URL http(s) o una imagen cargada desde el panel.",
};

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 1000 },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true, maxlength: 80 },
    emoji: { type: String, default: "🎨", maxlength: 20 },
    image: { type: String, default: "", maxlength: 1500000, validate: imageValidator },
    colorAccent: { type: String, default: "#3b82f6", maxlength: 20 },
    featured: { type: Boolean, default: true },
    available: { type: Boolean, default: true },
    badge: { type: String, default: "", maxlength: 30 },
    tags: { type: [String], default: [] },
  },
  { timestamps: true, strict: true }
);

productSchema.index({ name: "text", description: "text", category: "text" });

module.exports = mongoose.model("Product", productSchema);
