const Cart = require("../models/Cart");
const Order = require("../models/Order");
const Transaction = require("../models/Transaction");
const Product = require("../models/Product");

const stripe = require("../services/stripe.service");

const GUEST_CART_COOKIE = "guestCartId";

const {
  createAdminNotification,
} = require(
  "../services/notification.service"
);

// ==========================================
// CREATE PAYMENT INTENT
// ==========================================

const createPaymentIntent = async (
  req,
  res
) => {
  try {
    const {
      customer,
      shippingAddress,
      notes = "",
    } = req.body;

    if (
      !customer ||
      !shippingAddress
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Customer information and shipping address are required.",
      });
    }

    // --------------------------------------
    // FIND CART
    // --------------------------------------

    let cart;
let guestCartId = null;

if (req.user) {
  cart = await Cart.findOne({
    user: req.user._id,
  });
} else {
  guestCartId =
    req.cookies[GUEST_CART_COOKIE];

  if (guestCartId) {
    cart = await Cart.findOne({
      guestCartId,
    });
  }
}

    if (
      !cart ||
      !cart.items ||
      cart.items.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Your cart is empty.",
      });
    }

    // --------------------------------------
    // BUILD SECURE TOTAL
    // --------------------------------------

    const orderItems = [];

    let subtotal = 0;

    for (const cartItem of cart.items) {
      const product =
        await Product.findById(
          cartItem.product
        );

      if (!product) {
        return res.status(400).json({
          success: false,
          message:
            "A product in your cart no longer exists.",
        });
      }

      if (
        product.status !== "active"
      ) {
        return res.status(400).json({
          success: false,
          message:
            `${product.name} is currently unavailable.`,
        });
      }

      if (
        product.stock <
        cartItem.quantity
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Insufficient stock for ${product.name}.`,
        });
      }

      const itemTotal =
        product.price *
        cartItem.quantity;

      subtotal += itemTotal;

      orderItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity:
          cartItem.quantity,
        image: product.image,
      });
    }

    const tax =
      Math.round(
        subtotal * 0.0875 * 100
      ) / 100;

    const shipping = 0;

    const total =
      Math.round(
        (subtotal +
          tax +
          shipping) *
          100
      ) / 100;

    // Stripe works with the
    // smallest currency unit.
    const amountInCents =
      Math.round(total * 100);

    // --------------------------------------
    // CREATE ORDER FIRST
    // --------------------------------------

    const order = await Order.create({
      orderNumber:
        "BNB-" +
        Date.now()
          .toString()
          .slice(-8) +
        "-" +
        Math.random()
          .toString(36)
          .slice(2, 8)
          .toUpperCase(),

      user: req.user
        ? req.user._id
        : null,

      isGuest: !req.user,

      guestCartId: guestCartId,

      customer: {
        firstName:
          customer.firstName.trim(),

        lastName:
          customer.lastName.trim(),

        email:
          customer.email
            .trim()
            .toLowerCase(),

        phone:
          customer.phone.trim(),
      },

      items: orderItems,

      subtotal,

      tax,

      shipping,

      total,

      currency: "USD",

      shippingAddress,

      notes,

      status: "pending",

      paymentStatus: "pending",

      paymentMethod: "Stripe",
    });

    await createAdminNotification({
  type: "new_order",

  title: "New order received",

  message:
    `Order ${order.orderNumber} has been placed.`,

  order: order._id,
});

    // --------------------------------------
    // CREATE STRIPE PAYMENT INTENT
    // --------------------------------------

    const paymentIntent =
      await stripe.paymentIntents.create(
        {
          amount:
            amountInCents,

          currency: "usd",

          automatic_payment_methods: {
            enabled: true,
          },

          receipt_email:
            customer.email
              .trim()
              .toLowerCase(),

          metadata: {
            orderId:
              order._id.toString(),

            orderNumber:
              order.orderNumber,
          },
        }
      );

    // --------------------------------------
    // TRANSACTION RECORD
    // --------------------------------------

    await Transaction.create({
      transactionId:
        `TXN-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)
          .toUpperCase()}`,

      order: order._id,

      user: req.user
        ? req.user._id
        : null,

      title:
        `Order ${order.orderNumber}`,

      description:
        "Stripe payment for Bud N' Budder order.",

      amount: total,

      currency: "USD",

      method: "Stripe",

      type: "credit",

      status: "pending",

      provider: "stripe",

      providerReference:
        paymentIntent.id,
    });

    return res.status(201).json({
      success: true,

      clientSecret:
        paymentIntent.client_secret,

      paymentIntentId:
        paymentIntent.id,

      orderId:
        order._id,

      orderNumber:
        order.orderNumber,

      amount: total,

      currency: "USD",
    });
  } catch (error) {
    console.error(
      "Create payment intent error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to initialize payment.",
    });
  }
};

module.exports = {
  createPaymentIntent,
};