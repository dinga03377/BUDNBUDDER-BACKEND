const stripe = require("../services/stripe.service");

const Order = require("../models/Order");
const Transaction = require("../models/Transaction");
const Cart = require("../models/Cart");

const {
  reduceStock,
} = require("../services/inventory.service");

const {
  createAdminNotification,
  createUserNotification,
} = require(
  "../services/notification.service"
);

const {
  checkLowStockForItems,
} = require(
  "../services/stockAlert.service"
);

const {
  sendPaymentConfirmation,
} = require("../services/email.service");


const handleStripeWebhook = async (
  req,
  res
) => {
  const signature =
    req.headers["stripe-signature"];

  if (!signature) {
    return res.status(400).send(
      "Missing Stripe signature."
    );
  }

  let event;

  try {
    event =
      stripe.webhooks.constructEvent(
        req.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
  } catch (error) {
    console.error(
      "Stripe webhook signature verification failed:",
      error.message
    );

    return res.status(400).send(
      `Webhook Error: ${error.message}`
    );
  }

  try {
    switch (event.type) {
      // ====================================
      // PAYMENT SUCCEEDED
      // ====================================

      case "payment_intent.succeeded": {
        const paymentIntent =
          event.data.object;

        const orderId =
          paymentIntent.metadata
            ?.orderId;

        if (!orderId) {
          console.warn(
            "Stripe payment has no orderId metadata:",
            paymentIntent.id
          );

          break;
        }

        const order =
          await Order.findById(orderId);

        if (!order) {
          console.warn(
            "Order not found for Stripe payment:",
            orderId
          );

          break;
        }

        // Idempotency protection.
       // Stripe can send the same webhook more than once.

        if (
          order.paymentStatus ===
          "paid"
        ) {
          break;
        }

        const customerEmail =
  order.customer.email;

const customerFirstName =
  order.customer.firstName;

if (customerEmail) {
  try {
    await sendPaymentConfirmation({
      email: customerEmail,
      firstName: customerFirstName,
      orderNumber: order.orderNumber,
      total: order.total,
      currency: order.currency,
    });
  } catch (emailError) {
    console.error(
      "Payment confirmation email failed:",
      emailError
    );
  }
}

        // -------------------------------
        // UPDATE ORDER
        // -------------------------------

        order.paymentStatus =
          "paid";

        order.status =
          "processing";

        await order.save();

        // -------------------------------
        // UPDATE TRANSACTION
        // -------------------------------

        const transaction =
  await Transaction.findOneAndUpdate(
    {
      providerReference:
        paymentIntent.id,
    },
    {
      status: "success",
    },
    {
      new: true,
    }
  );

  await createAdminNotification({
  type: "payment_success",

  title: "Payment confirmed",

  message:
    `Payment for order ${order.orderNumber} has been confirmed.`,

  order: order._id,

  transaction:
    transaction?._id || null,
});

if (order.user) {
  await createUserNotification({
    userId: order.user,

    type: "payment_success",

    title: "Payment confirmed",

    message:
      `Your payment for order ${order.orderNumber} was successful.`,

    order: order._id,

    transaction:
      transaction?._id || null,
  });
}

        // -------------------------------
        // REDUCE STOCK
        // -------------------------------

        await reduceStock(order.items);

        await checkLowStockForItems(
          order.items
        );

        // -------------------------------
        // CLEAR CART
        // -------------------------------

        if (order.user) {
          await Cart.deleteOne({
            user: order.user,
          });
        }

        if (
  order.isGuest &&
  order.guestCartId
) {
  await Cart.deleteOne({
    guestCartId:
      order.guestCartId,
  });
}

        // Guest cart cleanup requires the
        // guestCartId to be associated with the order.

        console.log(
          `Payment successful for order ${order.orderNumber}`
        );

        break;
      }

      // ====================================
      // PAYMENT FAILED
      // ====================================

      case "payment_intent.payment_failed": {
        const paymentIntent =
          event.data.object;

        const orderId =
          paymentIntent.metadata
            ?.orderId;

        if (!orderId) {
          break;
        }

        const order =
          await Order.findById(orderId);

        if (!order) {
          break;
        }

        order.paymentStatus =
          "failed";

        order.status =
          "cancelled";

        await order.save();

        await Transaction.findOneAndUpdate(
          {
            providerReference:
              paymentIntent.id,
          },
          {
            status: "failed",
          }
        );

        console.log(
          `Payment failed for order ${order.orderNumber}`
        );

        break;
      }

      // ====================================
      // PAYMENT CANCELED
      // ====================================

      case "payment_intent.canceled": {
        const paymentIntent =
          event.data.object;

        const orderId =
          paymentIntent.metadata
            ?.orderId;

        if (!orderId) {
          break;
        }

        const order =
          await Order.findById(orderId);

        if (!order) {
          break;
        }

        order.paymentStatus =
          "failed";

        order.status =
          "cancelled";

        await order.save();

        await Transaction.findOneAndUpdate(
          {
            providerReference:
              paymentIntent.id,
          },
          {
            status: "failed",
          }
        );

        break;
      }

      default:
        console.log(
          `Unhandled Stripe event: ${event.type}`
        );
    }

    return res.status(200).json({
      received: true,
    });
  } catch (error) {
    console.error(
      "Stripe webhook processing error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Webhook processing failed.",
    });
  }
};

module.exports = {
  handleStripeWebhook,
};