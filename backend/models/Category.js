const mongoose = require("mongoose");

const imageValidator = {
  validator: value => !value || /^(https?:\/\/|data:image\/)/i.test(value),
  message: "La imagen debe ser una URL http(s) o una imagen cargada desde el panel.",
};

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, maxlength: 80 },
    image: { type: String, default: "", maxlength: 1500000, validate: imageValidator },
    emoji: { type: String, default: "📌", maxlength: 20 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, strict: true }
);

categorySchema.index({ name: 1 });
module.exports = mongoose.model("Category", categorySchema);
