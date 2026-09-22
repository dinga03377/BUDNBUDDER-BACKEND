const express = require("express");

const {
  getDashboardOverview,
  getDashboardAnalytics,
  getRecentOrders,
  getRecentTransactions,
} = require(
  "../controllers/adminDashboard.controller"
);

const adminAuth = require(
  "../middleware/adminAuth"
);

const router = express.Router();

router.use(adminAuth);

router.get(
  "/overview",
  getDashboardOverview
);

router.get(
  "/analytics",
  getDashboardAnalytics
);

router.get(
  "/recent-orders",
  getRecentOrders
);

router.get(
  "/recent-transactions",
  getRecentTransactions
);

module.exports = router;