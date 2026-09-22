const Product = require("../models/Product");

const {
  createAdminNotification,
} = require("./notification.service");

const LOW_STOCK_LIMIT = 8;

// ==========================================
// CHECK LOW STOCK
// ==========================================

const checkLowStock = async (product) => {
  if (!product) {
    return;
  }

  if (product.stock > LOW_STOCK_LIMIT) {
    return;
  }

  const existingNotification =
    await require("../models/Notification").findOne({
      recipientType: "admin",

      type: "low_stock",

      product: product._id,

      isRead: false,
    });

  if (existingNotification) {
    return;
  }

  const message =
    product.stock === 0
      ? `${product.name} is out of stock.`
      : `${product.name} is running low with ${product.stock} left.`;

  await createAdminNotification({
    type: "low_stock",

    title:
      product.stock === 0
        ? "Out of stock"
        : "Low stock alert",

    message,

    product: product._id,
  });
};

// ==========================================
// CHECK MULTIPLE PRODUCTS
// ==========================================

const checkLowStockForItems = async (
  items
) => {
  if (!Array.isArray(items)) {
    return;
  }

  for (const item of items) {
    const product =
      await Product.findById(
        item.product
      );

    if (product) {
      await checkLowStock(product);
    }
  }
};

module.exports = {
  LOW_STOCK_LIMIT,
  checkLowStock,
  checkLowStockForItems,
};