require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("./models/Product");
const Category = require("./models/Category");

const categories = [
  ["Naturaleza", "🌿"], ["Astral", "🪐"], ["Retro", "📼"], ["Minimal", "⚡"],
  ["Animales", "🦋"], ["Urbano", "🏙️"], ["Arte", "🎨"], ["Especial", "🎁"],
];

const products = [
  { name: "Sakura Bloom", description: "Flores de sakura para darle un toque delicado a tus objetos.", price: 1500, category: "Naturaleza", emoji: "🌸", badge: "Nuevo", tags: ["flores", "sakura"], featured: true, available: true },
  { name: "Cosmos", description: "Saturno y estrellas en una ilustración inspirada en el espacio.", price: 1600, category: "Astral", emoji: "🪐", badge: "Limitado", tags: ["espacio", "saturno"], featured: true, available: true },
  { name: "Rayo Studio", description: "Diseño geométrico limpio para un estilo moderno.", price: 900, category: "Minimal", emoji: "⚡", tags: ["rayo", "minimal"], featured: true, available: true },
  { name: "Cassette", description: "Una calcomanía retro inspirada en los clásicos casetes.", price: 1100, category: "Retro", emoji: "📼", tags: ["retro", "música"], featured: false, available: true },
  { name: "Mariposa", description: "Mariposa estilizada para laptops, botellas y cuadernos.", price: 1200, category: "Animales", emoji: "🦋", tags: ["mariposa", "animal"], featured: false, available: true },
];

async function seed() {
  if (!process.env.MONGO_URI) throw new Error("Falta MONGO_URI.");
  await mongoose.connect(process.env.MONGO_URI);
  for (const [name, emoji] of categories) await Category.updateOne({ name }, { $setOnInsert: { name, emoji } }, { upsert: true });
  for (const product of products) await Product.updateOne({ name: product.name }, { $setOnInsert: product }, { upsert: true });
  console.log("Datos de ejemplo preparados sin borrar productos existentes.");
  await mongoose.disconnect();
}
seed().catch(async e => { console.error(e.message); try { await mongoose.disconnect(); } catch {} process.exit(1); });
