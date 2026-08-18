const jwt = require("jsonwebtoken");

function getToken(req) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) return header.slice(7).trim();
  return req.cookies?.admin_token || "";
}

function auth(req, res, next) {
  try {
    const token = getToken(req);
    if (!token) {
      return res.status(401).json({ success: false, message: "Autenticación requerida." });
    }

    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Sesión inválida o expirada. Inicie sesión nuevamente.",
    });
  }
}

module.exports = auth;
module.exports.getToken = getToken;
