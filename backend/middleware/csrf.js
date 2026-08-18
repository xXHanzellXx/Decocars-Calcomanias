const crypto = require("crypto");

const CSRF_COOKIE = "csrf_token";

function cookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  const crossSiteFrontend = Boolean(process.env.FRONTEND_ORIGIN);
  return {
    httpOnly: false,
    secure: isProduction || process.env.COOKIE_SECURE === "true",
    sameSite: process.env.COOKIE_SAMESITE || (isProduction && crossSiteFrontend ? "none" : "lax"),
    maxAge: 8 * 60 * 60 * 1000,
    path: "/",
  };
}

function issueCsrfToken(res) {
  const token = crypto.randomBytes(32).toString("hex");
  res.cookie(CSRF_COOKIE, token, cookieOptions());
  return token;
}

function csrfProtection(req, res, next) {
  const method = req.method.toUpperCase();
  const path = req.path;
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return next();
  if (path === "/auth/login") return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.get("X-CSRF-Token");
  if (!cookieToken || !headerToken || cookieToken.length !== headerToken.length || !crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))) {
    return res.status(403).json({ success: false, message: "Solicitud rechazada por protección CSRF. Recargue la página e inténtelo de nuevo." });
  }
  next();
}

module.exports = { CSRF_COOKIE, issueCsrfToken, csrfProtection, cookieOptions };
