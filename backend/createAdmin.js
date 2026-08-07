require("dotenv").config();
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const Admin = require("./models/Admin");

async function main() {
  const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || "");

  if (!process.env.MONGO_URI || !email || !password) {
    throw new Error("Defina MONGO_URI, ADMIN_EMAIL y ADMIN_PASSWORD antes de crear el administrador.");
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET debe tener al menos 32 caracteres.");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const hash = await bcrypt.hash(password, 12);
  await Admin.findOneAndUpdate(
    { email },
    { email, password: hash, name: process.env.ADMIN_NAME || "Administrador" },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log(`Administrador creado/actualizado: ${email}`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err.message);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
