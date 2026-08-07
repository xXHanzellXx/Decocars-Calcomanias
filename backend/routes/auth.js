const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const auth = require("../middleware/auth");

const router = express.Router();

function cookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction || process.env.COOKIE_SECURE === "true",
    sameSite: process.env.COOKIE_SAMESITE || "lax",
    maxAge: 8 * 60 * 60 * 1000,
    path: "/",
  };
}

router.post("/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Correo y contraseña son obligatorios." });
    }

    const admin = await Admin.findOne({ email });
    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      return res.status(401).json({ success: false, message: "Correo o contraseña incorrectos." });
    }

    const token = jwt.sign(
      { id: admin._id.toString(), email: admin.email, name: admin.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
    );

    res.cookie("admin_token", token, cookieOptions());
    res.json({ success: true, admin: { id: admin._id, email: admin.email, name: admin.name } });
  } catch (error) {
    console.error("Login:", error);
    res.status(500).json({ success: false, message: "Error interno del servidor." });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("admin_token", { httpOnly: true, sameSite: process.env.COOKIE_SAMESITE || "lax", secure: process.env.NODE_ENV === "production" || process.env.COOKIE_SECURE === "true", path: "/" });
  res.json({ success: true });
});

router.get("/me", auth, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select("-password").lean();
    if (!admin) return res.status(401).json({ success: false, message: "Administrador no encontrado." });
    res.json({ success: true, admin });
  } catch {
    res.status(500).json({ success: false, message: "No se pudo validar la sesión." });
  }
});

module.exports = router;
