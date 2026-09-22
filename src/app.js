const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const authRoutes = require("./route/auth.routes");
const cartRoutes = require("./route/cart.routes");
const productRoutes = require("./route/product.routes");
const categoryRoutes = require("./route/category.routes");
const adminAuthRoutes = require("./route/adminAuth.routes");
const adminPasswordRoutes = require("./route/adminPassword.routes");
const adminProductRoutes = require("./route/adminProduct.routes");
const adminCategoryRoutes = require("./route/adminCategory.routes");
const orderRoutes = require("./route/order.routes");
const paymentRoutes = require("./route/payment.routes");
const webhookRoutes = require("./route/webhook.routes");
const adminOrderRoutes = require( "./route/adminOrder.routes");
const adminTransactionRoutes = require( "./route/adminTransaction.routes");
const adminDashboardRoutes = require( "./route/adminDashboard.routes");
const notificationRoutes = require("./route/notification.routes");

const app = express();

// ================================
// GLOBAL MIDDLEWARE
// ================================

const allowedOrigins = (
  process.env.FRONTEND_URL || "http://localhost:5500"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

  app.disable("x-powered-by");

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no Origin header.
      // Useful for Postman, server-to-server requests,
      // and local health checks.
      console.log("CORS request from:", origin);
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error("CORS origin not allowed")
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
    ],
  })
);

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


app.use(cookieParser());
app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb",
  })
);


app.use(
  "/api/webhooks",
  webhookRoutes
);

app.use(
  express.json({
    limit: "1mb",
  })
);

// ================================
// HEALTH CHECK
// ================================

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Bud N' Budder API is running",
  });
});

// ================================
// 404 HANDLER
// ================================

app.use("/api/auth", authRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/admin/auth", adminAuthRoutes);
app.use( "/api/admin/forgot-password", adminPasswordRoutes);
app.use( "/api/admin/products", adminProductRoutes);
app.use( "/api", paymentRoutes);
app.use( "/api/admin/orders", adminOrderRoutes);
app.use("/api/admin/transactions", adminTransactionRoutes);
app.use( "/api/admin/dashboard", adminDashboardRoutes);
app.use( "/api/admin/categories", adminCategoryRoutes);
app.use("/api/admin/notifications", notificationRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use((err, req, res, next) => {
  console.error(
    "Unhandled server error:",
    err
  );

  if (
    err.message ===
    "CORS origin not allowed"
  ) {
    return res.status(403).json({
      success: false,
      message:
        "Request origin is not allowed.",
    });
  }

  return res.status(500).json({
    success: false,
    message:
      "An unexpected server error occurred.",
  });
});

module.exports = app;