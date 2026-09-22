const crypto = require("crypto");

const Cart = require("../models/Cart");
const Order = require("../models/Order");
const Product = require("../models/Product");

const GUEST_CART_COOKIE = "guestCartId";

const generateOrderNumber = () => {
  return (
    "BNB-" +
    Date.now().toString().slice(-8) +
    "-" +
    crypto
      .randomBytes(3)
      .toString("hex")
      .toUpperCase()
  );
};

const getGuestCartId = (req) => {
  return req.cookies[GUEST_CART_COOKIE];
};

// ==========================================
// CREATE ORDER
// ==========================================

const createOrder = async (req, res) => {
  try {
    const {
      customer,
      shippingAddress,
      notes = "",
      paymentMethod = "stripe",
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

    const requiredCustomerFields = [
      "firstName",
      "lastName",
      "email",
      "phone",
    ];

    for (const field of requiredCustomerFields) {
      if (
        !customer[field] ||
        !String(customer[field]).trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            `${field} is required.`,
        });
      }
    }

    const requiredAddressFields = [
      "address1",
      "city",
      "state",
      "zip",
      "country",
    ];

    for (const field of requiredAddressFields) {
      if (
        !shippingAddress[field] ||
        !String(
          shippingAddress[field]
        ).trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            `${field} is required.`,
        });
      }
    }

    // --------------------------------------
    // FIND THE CORRECT CART
    // --------------------------------------

    let cart;

    if (req.user) {
      cart = await Cart.findOne({
        user: req.user._id,
      });
    } else {
      const guestCartId =
        getGuestCartId(req);

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
    // REBUILD ORDER ITEMS FROM DATABASE
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
            "One of the products in your cart no longer exists.",
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

    // --------------------------------------
    // TOTALS
    // --------------------------------------

    /*
     * Tax and shipping are calculated
     * server-side.
     *
     * The current frontend uses 8.75%
     * tax and free shipping.
     */

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

    // --------------------------------------
    // CREATE ORDER
    // --------------------------------------

    const order = await Order.create({
      orderNumber:
        generateOrderNumber(),

      user: req.user
        ? req.user._id
        : null,

      isGuest: !req.user,

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

      shippingAddress: {
        address1:
          shippingAddress.address1.trim(),

        address2:
          shippingAddress.address2
            ? shippingAddress.address2.trim()
            : "",

        city:
          shippingAddress.city.trim(),

        state:
          shippingAddress.state.trim(),

        zip:
          shippingAddress.zip.trim(),

        country:
          shippingAddress.country.trim(),
      },

      notes:
        notes.trim(),

      status: "pending",

      paymentStatus: "pending",

      paymentMethod:
        paymentMethod.trim(),
    });

    return res.status(201).json({
      success: true,
      message:
        "Order created successfully.",

      order: {
        id: order._id,
        orderNumber:
          order.orderNumber,
        customer:
          order.customer,
        items:
          order.items,
        subtotal:
          order.subtotal,
        tax:
          order.tax,
        shipping:
          order.shipping,
        total:
          order.total,
        currency:
          order.currency,
        shippingAddress:
          order.shippingAddress,
        notes:
          order.notes,
        status:
          order.status,
        paymentStatus:
          order.paymentStatus,
        paymentMethod:
          order.paymentMethod,
        placedAt:
          order.placedAt,
      },
    });
  } catch (error) {
    console.error(
      "Create order error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to create order.",
    });
  }
};

// ==========================================
// GET CUSTOMER ORDERS
// ==========================================

const getMyOrders = async (
  req,
  res
) => {
  try {
    const orders =
  await Order.find({
    user: req.user._id,
  })
    .populate(
      "items.product",
      "name image price"
    )
    .sort({
      placedAt: -1,
    });

    return res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error(
      "Get my orders error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve orders.",
    });
  }
};

// ==========================================
// GET CUSTOMER ORDER
// ==========================================

const getMyOrder = async (
  req,
  res
) => {
  try {
    const order =
  await Order.findOne({
    _id: req.params.id,
    user: req.user._id,
  }).populate(
    "items.product",
    "name image price"
  );

    if (!order) {
      return res.status(404).json({
        success: false,
        message:
          "Order not found.",
      });
    }

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error(
      "Get my order error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve order.",
    });
  }
};

const getGuestOrder = async (req, res) => {
  try {
    const guestCartId = getGuestCartId(req);

    if (!guestCartId) {
      return res.status(401).json({
        success: false,
        message: "Guest session not found.",
      });
    }

    const order = await Order.findOne({
      _id: req.params.id,
      isGuest: true,
      guestCartId,
    }).populate(
      "items.product",
      "name image price"
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Get guest order error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve order.",
    });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getMyOrder,
  getGuestOrder,
};