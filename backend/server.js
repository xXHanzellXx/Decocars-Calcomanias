const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const productRoutes = require("./routes/products");
const categoryRoutes = require("./routes/categories");
const authRoutes = require("./routes/auth");
const Category = require("./models/Category");
const { csrfProtection } = require("./middleware/csrf");

const app = express();
const frontendPath = path.join(__dirname, "..", "frontend");

// ===============================
// VARIABLES DE ENTORNO
// ===============================

if (!process.env.MONGO_URI) {
  throw new Error(
    "Falta MONGO_URI en las variables de entorno."
  );
}

if (
  !process.env.JWT_SECRET ||
  process.env.JWT_SECRET.length < 32
) {
  throw new Error(
    "JWT_SECRET debe tener al menos 32 caracteres."
  );
}

// ===============================
// CONFIGURACIÓN GENERAL
// ===============================

app.disable("x-powered-by");
app.set("trust proxy", 1);

// ===============================
// HEADERS DE SEGURIDAD
// ===============================

app.use((req, res, next) => {
  res.setHeader(
    "X-Content-Type-Options",
    "nosniff"
  );

  res.setHeader(
    "X-Frame-Options",
    "SAMEORIGIN"
  );

  res.setHeader(
    "Referrer-Policy",
    "strict-origin-when-cross-origin"
  );

  next();
});

// ===============================
// CORS
// ===============================

const allowedOrigins = process.env.FRONTEND_ORIGIN
  ? process.env.FRONTEND_ORIGIN
      .split(",")
      .map((v) =>
        v.trim().replace(/\/$/, "")
      )
      .filter(Boolean)
  : [];

const renderOrigin =
  "https://decocars-calcomanias.onrender.com";

app.use(
  cors({
    origin(origin, callback) {
      // Peticiones sin Origin
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin =
        origin.replace(/\/$/, "");

      // Frontend de Netlify
      if (
        allowedOrigins.includes(
          normalizedOrigin
        )
      ) {
        return callback(null, true);
      }

      // Backend de Render
      if (
        normalizedOrigin === renderOrigin
      ) {
        return callback(null, true);
      }

      console.warn(
        `Origen bloqueado por CORS: ${origin}`
      );

      return callback(
        new Error(
          "Origen no permitido por CORS."
        )
      );
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-CSRF-Token",
    ],
  })
);

// ===============================
// JSON
// ===============================

app.use(
  express.json({
    limit: "4mb",
  })
);

// ===============================
// COOKIES
// ===============================

function parseCookies(req) {
  const header =
    req.headers.cookie || "";

  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const i = part.indexOf("=");

        if (i === -1) {
          return [part, ""];
        }

        return [
          part.slice(0, i),
          decodeURIComponent(
            part.slice(i + 1)
          ),
        ];
      })
  );
}

app.use((req, res, next) => {
  try {
    req.cookies = parseCookies(req);
    next();
  } catch {
    req.cookies = {};
    next();
  }
});

// ===============================
// CSRF
// ===============================

app.use(
  "/api",
  csrfProtection
);

// ===============================
// LIMITADOR DE LOGIN
// ===============================

const loginAttempts = new Map();

const LOGIN_WINDOW =
  15 * 60 * 1000;

const LOGIN_MAX_KEYS = 5000;

setInterval(() => {
  const now = Date.now();

  for (
    const [key, value]
    of loginAttempts
  ) {
    if (now > value.reset) {
      loginAttempts.delete(key);
    }
  }
}, 10 * 60 * 1000).unref();

app.use(
  "/api/auth/login",
  (req, res, next) => {
    if (req.method !== "POST") {
      return next();
    }

    const key =
      req.ip || "unknown";

    const now = Date.now();

    if (
      !loginAttempts.has(key) &&
      loginAttempts.size >=
        LOGIN_MAX_KEYS
    ) {
      return res.status(429).json({
        success: false,
        message:
          "Demasiados intentos. Espere unos minutos e inténtelo de nuevo.",
      });
    }

    const current =
      loginAttempts.get(key) || {
        count: 0,
        reset:
          now + LOGIN_WINDOW,
      };

    if (
      now > current.reset
    ) {
      current.count = 0;
      current.reset =
        now + LOGIN_WINDOW;
    }

    current.count += 1;

    loginAttempts.set(
      key,
      current
    );

    if (
      current.count > 10
    ) {
      return res.status(429).json({
        success: false,
        message:
          "Demasiados intentos. Espere unos minutos e inténtelo de nuevo.",
      });
    }

    next();
  }
);

// ===============================
// HEALTH CHECK
// ===============================

app.get(
  "/api/health",
  (req, res) => {
    res.json({
      success: true,
      message:
        "API funcionando correctamente.",
    });
  }
);

// ===============================
// RUTAS API
// ===============================

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/products",
  productRoutes
);

app.use(
  "/api/categories",
  categoryRoutes
);

// ===============================
// FRONTEND
// ===============================

app.get(
  "/",
  (req, res) => {
    res.sendFile(
      path.join(
        frontendPath,
        "index.html"
      )
    );
  }
);

app.use(
  express.static(
    frontendPath,
    {
      extensions: ["html"],
    }
  )
);

// ===============================
// MANEJO DE ERRORES
// ===============================

app.use(
  (err, req, res, next) => {
    console.error(err);

    if (res.headersSent) {
      return next(err);
    }

    res.status(500).json({
      success: false,
      message:
        "Error interno del servidor.",
    });
  }
);

// ===============================
// INICIAR SERVIDOR
// ===============================

async function start() {
  try {
    await mongoose.connect(
      process.env.MONGO_URI
    );

    console.log(
      "Conectado exitosamente a MongoDB Atlas"
    );

    const defaults = [
      ["Naturaleza", "🌿"],
      ["Astral", "🪐"],
      ["Retro", "📼"],
      ["Minimal", "⚡"],
      ["Animales", "🦋"],
      ["Urbano", "🏙️"],
      ["Arte", "🎨"],
      ["Especial", "🎁"],
    ];

    await Promise.all(
      defaults.map(
        ([name, emoji]) =>
          Category.updateOne(
            { name },
            {
              $setOnInsert: {
                name,
                emoji,
              },
            },
            {
              upsert: true,
            }
          )
      )
    );

    const PORT =
      process.env.PORT || 5000;

    app.listen(
      PORT,
      () => {
        console.log(
          `Servidor corriendo en http://localhost:${PORT}`
        );
      }
    );
  } catch (err) {
    console.error(
      "Error al iniciar:",
      err
    );

    process.exit(1);
  }
}

start();
