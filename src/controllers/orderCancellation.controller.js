const Order = require("../models/Order");
const Transaction = require("../models/Transaction");

const stripe = require(
  "../services/stripe.service"
);

const {
  restoreStock,
} = require("../services/inventory.service");

const {
  sendRefundConfirmation,
} = require("../services/email.service");

// ==========================================
// CANCEL CUSTOMER ORDER
// ==========================================

const cancelMyOrder = async (
  req,
  res
) => {
  try {
    const order =
      await Order.findOne({
        _id: req.params.id,
        user: req.user._id,
      });

    if (!order) {
      return res.status(404).json({
        success: false,
        message:
          "Order not found.",
      });
    }

    const cancellableStatuses = [
      "pending",
      "processing",
    ];

    if (
      !cancellableStatuses.includes(
        order.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This order can no longer be cancelled.",
      });
    }

    // --------------------------------------
    // UNPAID ORDER
    // --------------------------------------

    if (
      order.paymentStatus ===
      "pending"
    ) {
      order.status =
        "cancelled";

      await order.save();

      return res.status(200).json({
        success: true,
        message:
          "Order cancelled successfully.",
        order,
      });
    }

    // --------------------------------------
    // FAILED PAYMENT
    // --------------------------------------

    if (
      order.paymentStatus ===
      "failed"
    ) {
      order.status =
        "cancelled";

      await order.save();

      return res.status(200).json({
        success: true,
        message:
          "Order cancelled successfully.",
        order,
      });
    }

    // --------------------------------------
    // PAID ORDER
    // --------------------------------------

    if (
      order.paymentStatus ===
      "paid"
    ) {
      const transaction =
        await Transaction.findOne({
          order: order._id,
          provider: "stripe",
          status: "success",
        });

      if (
        !transaction ||
        !transaction.providerReference
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Payment transaction could not be found.",
        });
      }

      const paymentIntent =
        await stripe.paymentIntents.retrieve(
          transaction.providerReference
        );

      if (
        paymentIntent.status !==
        "succeeded"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "The payment is not eligible for refund.",
        });
      }

      const refund =
        await stripe.refunds.create({
          payment_intent:
            paymentIntent.id,
        });

      if (
        refund.status !==
        "succeeded"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Unable to process the refund.",
        });
      }

      order.status =
        "cancelled";

      order.paymentStatus =
        "refunded";

      await order.save();

      transaction.status =
        "refunded";

      await transaction.save();

      await restoreStock(
         order.items
       );

       if (
  order.customer &&
  order.customer.email
) {
  try {
    await sendRefundConfirmation({
      email:
        order.customer.email,

      firstName:
        order.customer.firstName,

      orderNumber:
        order.orderNumber,

      total:
        order.total,

      currency:
        order.currency,
    });
  } catch (emailError) {
    console.error(
      "Refund email failed:",
      emailError
    );
  }
}

      return res.status(200).json({
        success: true,
        message:
          "Order cancelled and payment refunded successfully.",
        order,
      });
    }

    return res.status(400).json({
      success: false,
      message:
        "This order cannot be cancelled.",
    });
  } catch (error) {
    console.error(
      "Cancel order error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to cancel order.",
    });
  }
};

module.exports = {
  cancelMyOrder,
};