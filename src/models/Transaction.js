const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "USD",
      uppercase: true,
      trim: true,
    },

    method: {
      type: String,
      default: "Stripe",
      trim: true,
    },

    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },

    status: {
      type: String,
      enum: ["success", "pending", "failed", "refunded"],
      default: "pending",
    },

    provider: {
      type: String,
      default: "stripe",
      lowercase: true,
      trim: true,
    },

    providerReference: {
      type: String,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = Transaction;