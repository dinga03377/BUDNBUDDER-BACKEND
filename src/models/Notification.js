const mongoose = require("mongoose");

const notificationSchema =
  new mongoose.Schema(
    {
      recipientType: {
        type: String,
        enum: [
          "admin",
          "user",
        ],
        required: true,
      },

      recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      type: {
        type: String,
        enum: [
          "new_order",
          "payment_success",
          "payment_failed",
          "low_stock",
          "order_status",
          "refund",
          "system",
        ],
        required: true,
      },

      title: {
        type: String,
        required: true,
        trim: true,
      },

      message: {
        type: String,
        required: true,
        trim: true,
      },

      order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
        default: null,
      },

      transaction: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Transaction",
        default: null,
      },

      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        default: null,
      },

      isRead: {
        type: Boolean,
        default: false,
      },

      readAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,
    }
  );

notificationSchema.index({
  recipientType: 1,
  recipient: 1,
  isRead: 1,
  createdAt: -1,
});

notificationSchema.index({
  type: 1,
  createdAt: -1,
});

module.exports =
  mongoose.model(
    "Notification",
    notificationSchema
  );