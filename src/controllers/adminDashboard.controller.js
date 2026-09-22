const Order = require("../models/Order");
const Transaction = require("../models/Transaction");
const Product = require("../models/Product");
const User = require("../models/User");

// ==========================================
// ADMIN DASHBOARD OVERVIEW
// ==========================================

const getDashboardOverview = async (
  req,
  res
) => {
  try {
    const [
  totalOrders,
  totalCustomers,
  totalProducts,
  pendingOrders,
  processingOrders,
  completedOrders,
  cancelledOrders,
] = await Promise.all([
  Order.countDocuments(),

  User.countDocuments(),

  Product.countDocuments(),

  Order.countDocuments({
    status: "pending",
  }),

  Order.countDocuments({
    status: "processing",
  }),

  Order.countDocuments({
    status: "completed",
  }),

  Order.countDocuments({
    status: "cancelled",
  }),
]);

    const revenueResult =
      await Transaction.aggregate([
        {
          $match: {
            status: "success",
            type: "credit",
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: {
              $sum: "$amount",
            },
          },
        },
      ]);

    const totalRevenue =
      revenueResult.length > 0
        ? revenueResult[0].totalRevenue
        : 0;

    return res.status(200).json({
      success: true,

      overview: {
        totalOrders,
        totalCustomers,
        totalProducts,

        totalRevenue,

        orders: {
          pending:
            pendingOrders,

          processing:
            processingOrders,

          completed: completedOrders,

          cancelled:
            cancelledOrders,
        },
      },
    });
  } catch (error) {
    console.error(
      "Admin dashboard overview error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load dashboard overview.",
    });
  }
};

// ==========================================
// DASHBOARD ANALYTICS
// ==========================================

const getDashboardAnalytics = async (
  req,
  res
) => {
  try {
    const now = new Date();

    const last24Hours =
      new Date(
        now.getTime() -
          24 * 60 * 60 * 1000
      );

    const last7Days =
      new Date(
        now.getTime() -
          7 * 24 * 60 * 60 * 1000
      );

    const last30Days =
      new Date(
        now.getTime() -
          30 * 24 * 60 * 60 * 1000
      );

    const [
      todayResult,
      weekResult,
      monthResult,
    ] = await Promise.all([
      Transaction.aggregate([
        {
          $match: {
            status: "success",
            type: "credit",
            createdAt: {
              $gte: last24Hours,
            },
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$amount",
            },
          },
        },
      ]),

      Transaction.aggregate([
        {
          $match: {
            status: "success",
            type: "credit",
            createdAt: {
              $gte: last7Days,
            },
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$amount",
            },
          },
        },
      ]),

      Transaction.aggregate([
        {
          $match: {
            status: "success",
            type: "credit",
            createdAt: {
              $gte: last30Days,
            },
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$amount",
            },
          },
        },
      ]),
    ]);

    const today =
      todayResult[0]?.total || 0;

    const week =
      weekResult[0]?.total || 0;

    const month =
      monthResult[0]?.total || 0;

    return res.status(200).json({
      success: true,

      earnings: {
        today,
        week,
        month,
      },

      currency: "USD",

      generatedAt: now,
    });
  } catch (error) {
    console.error(
      "Dashboard analytics error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load dashboard analytics.",
    });
  }
};

// ==========================================
// RECENT ORDERS
// ==========================================

const getRecentOrders = async (
  req,
  res
) => {
  try {
    const limit = Math.min(
      20,
      Math.max(
        1,
        Number(req.query.limit) || 5
      )
    );

    const orders =
      await Order.find()
        .populate(
          "user",
          "firstName lastName email"
        )
        .populate(
          "items.product",
          "name image"
        )
        .sort({
          placedAt: -1,
        })
        .limit(limit);

    return res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error(
      "Recent orders error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load recent orders.",
    });
  }
};

// ==========================================
// RECENT TRANSACTIONS
// ==========================================

const getRecentTransactions = async (
  req,
  res
) => {
  try {
    const limit = Math.min(
      20,
      Math.max(
        1,
        Number(req.query.limit) || 5
      )
    );

    const transactions =
      await Transaction.find()
        .populate(
          "order",
          "orderNumber"
        )
        .sort({
          createdAt: -1,
        })
        .limit(limit);

    return res.status(200).json({
      success: true,
      transactions,
    });
  } catch (error) {
    console.error(
      "Recent transactions error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load recent transactions.",
    });
  }
};

module.exports = {
  getDashboardOverview,
  getDashboardAnalytics,
  getRecentOrders,
  getRecentTransactions,
};