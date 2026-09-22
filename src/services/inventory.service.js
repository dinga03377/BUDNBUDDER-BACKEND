const Product = require(
  "../models/Product"
);

// ==========================================
// REDUCE STOCK
// ==========================================

const reduceStock = async (
  items
) => {
  for (const item of items) {
    const product =
      await Product.findOneAndUpdate(
        {
          _id: item.product,
          stock: {
            $gte: item.quantity,
          },
        },
        {
          $inc: {
            stock: -item.quantity,
          },
        },
        {
          new: true,
        }
      );

    if (!product) {
      throw new Error(
        `Insufficient stock for product ${item.product}`
      );
    }
  }
};

// ==========================================
// RESTORE STOCK
// ==========================================

const restoreStock = async (
  items
) => {
  for (const item of items) {
    await Product.findByIdAndUpdate(
      item.product,
      {
        $inc: {
          stock: item.quantity,
        },
      }
    );
  }
};

module.exports = {
  reduceStock,
  restoreStock,
};