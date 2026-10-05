const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const stripe = require('../services/stripe.service');
const paypal = require('../services/paypal.service');
const { calculateOrderTotals } = require('../utils/orderPricing');
const { settleSuccessfulPayment } = require('../services/paymentSettlement.service');
const { createAdminNotification } = require('../services/notification.service');

const GUEST_CART_COOKIE = 'guestCartId';

function generateOrderNumber() {
  return `BNB-${Date.now().toString().slice(-8)}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

async function buildOrderFromCart(req, { customer, shippingAddress, notes = '', paymentMethod }) {
  let cart;
  let guestCartId = null;

  if (req.user) {
    cart = await Cart.findOne({ user: req.user._id });
  } else {
    guestCartId = req.cookies[GUEST_CART_COOKIE];
    if (guestCartId) cart = await Cart.findOne({ guestCartId });
  }

  if (!cart?.items?.length) throw new Error('Your cart is empty.');

  const orderItems = [];
  let subtotal = 0;

  for (const cartItem of cart.items) {
    const product = await Product.findById(cartItem.product);
    if (!product) throw new Error('A product in your cart no longer exists.');
    if (product.status !== 'active') throw new Error(`${product.name} is currently unavailable.`);
    if (product.stock < cartItem.quantity) throw new Error(`Insufficient stock for ${product.name}.`);

    subtotal += product.price * cartItem.quantity;
    orderItems.push({
      product: product._id,
      name: product.name,
      price: product.price,
      quantity: cartItem.quantity,
      image: product.image,
    });
  }

  const totals = calculateOrderTotals(subtotal);
  const normalizedMethod = String(paymentMethod || 'Stripe').trim();

  const order = await Order.create({
    orderNumber: generateOrderNumber(),
    user: req.user ? req.user._id : null,
    isGuest: !req.user,
    guestCartId,
    customer: {
      firstName: String(customer.firstName).trim(),
      lastName: String(customer.lastName).trim(),
      email: String(customer.email).trim().toLowerCase(),
      phone: String(customer.phone).trim(),
    },
    items: orderItems,
    ...totals,
    currency: 'USD',
    shippingAddress,
    notes: String(notes || '').trim(),
    status: 'pending',
    paymentStatus: 'pending',
    paymentMethod: normalizedMethod,
  });

  await createAdminNotification({
    type: 'new_order',
    title: 'New order received',
    message: `Order ${order.orderNumber} has been placed.`,
    order: order._id,
  });

  return { order, cart, total: totals.total };
}

async function getPaymentConfig(req, res) {
  return res.json({
    success: true,
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    paypalClientId: process.env.PAYPAL_CLIENT_ID || '',
    paypalEnvironment: paypal.PAYPAL_ENV,
    venmoEnabled: Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),
    zelleEnabled: Boolean(process.env.ZELLE_PAYMENT_RECIPIENT),
  });
}

async function createPaymentIntent(req, res) {
  try {
    const { customer, shippingAddress, notes = '', paymentMethod = 'Stripe' } = req.body;
    if (!customer || !shippingAddress) {
      return res.status(400).json({ success: false, message: 'Customer information and shipping address are required.' });
    }

    if (String(paymentMethod).toLowerCase() !== 'stripe') {
      return res.status(400).json({ success: false, message: 'This endpoint is only for Stripe payments.' });
    }

    const { order, total } = await buildOrderFromCart(req, {
      customer, shippingAddress, notes, paymentMethod: 'Stripe',
    });

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(total * 100),
        currency: 'usd',
        automatic_payment_methods: { enabled: true },
        receipt_email: order.customer.email,
        metadata: { orderId: order._id.toString(), orderNumber: order.orderNumber },
      });

      await Transaction.create({
        transactionId: `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        order: order._id,
        user: req.user ? req.user._id : null,
        title: `Order ${order.orderNumber}`,
        description: "Stripe payment for Bud N' Budder order.",
        amount: total,
        currency: 'USD',
        method: 'Stripe',
        type: 'credit',
        status: 'pending',
        provider: 'stripe',
        providerReference: paymentIntent.id,
      });

      return res.status(201).json({
        success: true,
        paymentMethod: 'Stripe',
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        orderId: order._id,
        orderNumber: order.orderNumber,
        amount: total,
        currency: 'USD',
      });
    } catch (error) {
      await Order.findByIdAndDelete(order._id).catch(() => {});
      throw error;
    }
  } catch (error) {
    console.error('Create payment intent error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Unable to initialize payment.' });
  }
}

async function createVenmoOrder(req, res) {
  try {
    const { customer, shippingAddress, notes = '' } = req.body;
    if (!customer || !shippingAddress) {
      return res.status(400).json({ success: false, message: 'Customer information and shipping address are required.' });
    }
    if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
      return res.status(503).json({ success: false, message: 'Venmo is not configured on the server.' });
    }

    const { order, total } = await buildOrderFromCart(req, {
      customer, shippingAddress, notes, paymentMethod: 'Venmo',
    });

    try {
      const paypalOrder = await paypal.createOrder({
        amount: total,
        currency: 'USD',
        referenceId: order._id.toString(),
        description: `Bud N' Budder order ${order.orderNumber}`,
      });

      await Transaction.create({
        transactionId: `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        order: order._id,
        user: req.user ? req.user._id : null,
        title: `Order ${order.orderNumber}`,
        description: "Venmo payment for Bud N' Budder order.",
        amount: total,
        currency: 'USD',
        method: 'Venmo',
        type: 'credit',
        status: 'pending',
        provider: 'venmo',
        providerReference: paypalOrder.id,
      });

      return res.status(201).json({
        success: true,
        paymentMethod: 'Venmo',
        paypalOrderId: paypalOrder.id,
        paypalClientId: process.env.PAYPAL_CLIENT_ID,
        paypalEnvironment: paypal.PAYPAL_ENV,
        orderId: order._id,
        orderNumber: order.orderNumber,
        amount: total,
        currency: 'USD',
      });
    } catch (error) {
      await Order.findByIdAndDelete(order._id).catch(() => {});
      throw error;
    }
  } catch (error) {
    console.error('Create Venmo order error:', error);
    return res.status(error.status === 400 ? 400 : 500).json({ success: false, message: error.message || 'Unable to initialize Venmo payment.' });
  }
}

async function createZelleOrder(req, res) {
  try {
    const { customer, shippingAddress, notes = '' } = req.body;
    if (!customer || !shippingAddress) {
      return res.status(400).json({ success: false, message: 'Customer information and shipping address are required.' });
    }
    if (!process.env.ZELLE_PAYMENT_RECIPIENT) {
      return res.status(503).json({ success: false, message: 'Zelle is not configured on the server.' });
    }

    const { order, total } = await buildOrderFromCart(req, {
      customer, shippingAddress, notes, paymentMethod: 'Zelle',
    });

    try {
      const transaction = await Transaction.create({
        transactionId: `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        order: order._id,
        user: req.user ? req.user._id : null,
        title: `Order ${order.orderNumber}`,
        description: "Zelle payment pending customer transfer.",
        amount: total,
        currency: 'USD',
        method: 'Zelle',
        type: 'credit',
        status: 'pending',
        provider: 'zelle',
        providerReference: order.orderNumber,
      });

      return res.status(201).json({
        success: true,
        paymentMethod: 'Zelle',
        orderId: order._id,
        orderNumber: order.orderNumber,
        transactionId: transaction._id,
        amount: total,
        currency: 'USD',
        recipient: process.env.ZELLE_PAYMENT_RECIPIENT,
        instructions: process.env.ZELLE_PAYMENT_INSTRUCTIONS || 'Send the exact order total using Zelle. Your order will be processed after payment is verified.',
      });
    } catch (error) {
      await Order.findByIdAndDelete(order._id).catch(() => {});
      throw error;
    }
  } catch (error) {
    console.error('Create Zelle order error:', error);
    return res.status(error.status === 400 ? 400 : 500).json({ success: false, message: error.message || 'Unable to initialize Zelle payment.' });
  }
}

async function claimZellePayment(req, res) {
  try {
    const { transactionId } = req.body;

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID is required.',
      });
    }

    const transaction = await Transaction.findById(transactionId).populate('order');
    if (!transaction || transaction.provider !== 'zelle') {
      return res.status(404).json({
        success: false,
        message: 'Zelle transaction not found.',
      });
    }

    if (!transaction.order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found for this Zelle transaction.',
      });
    }

    if (transaction.status === 'success' || transaction.order.paymentStatus === 'paid') {
      return res.status(409).json({
        success: false,
        message: 'This payment has already been verified.',
        alreadyPaid: true,
      });
    }

    if (transaction.status !== 'pending' || transaction.order.paymentStatus !== 'pending') {
      return res.status(409).json({
        success: false,
        message: 'This Zelle payment is no longer awaiting verification.',
      });
    }

    // A logged-in customer may only claim their own transaction.
    if (req.user && transaction.user && transaction.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to claim this payment.',
      });
    }

    if (!transaction.customerClaimedPayment) {
      transaction.customerClaimedPayment = true;
      transaction.customerClaimedAt = new Date();
      transaction.description = `Zelle payment claimed by customer; awaiting admin verification.`;
      await transaction.save();
    }

    return res.json({
      success: true,
      message: 'Payment notification recorded. Your Zelle payment is awaiting store verification.',
      transactionId: transaction._id,
      orderId: transaction.order._id,
      orderNumber: transaction.order.orderNumber,
      paymentStatus: transaction.order.paymentStatus,
      customerClaimedPayment: true,
      customerClaimedAt: transaction.customerClaimedAt,
    });
  } catch (error) {
    console.error('Claim Zelle payment error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to record Zelle payment notification.',
    });
  }
}

async function captureVenmoOrder(req, res) {
  try {
    const { paypalOrderId } = req.body;
    if (!paypalOrderId) return res.status(400).json({ success: false, message: 'PayPal order ID is required.' });

    const transaction = await Transaction.findOne({ provider: 'venmo', providerReference: paypalOrderId });
    if (!transaction) return res.status(404).json({ success: false, message: 'Venmo transaction not found.' });

    const order = await Order.findById(transaction.order);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (order.paymentMethod.toLowerCase() !== 'venmo') return res.status(400).json({ success: false, message: 'Payment method mismatch.' });

    if (order.paymentStatus === 'paid') {
      return res.json({ success: true, alreadyPaid: true, orderId: order._id, orderNumber: order.orderNumber });
    }

    const capture = await paypal.captureOrder(paypalOrderId);
    const captureStatus = capture?.status;
    const captureRecord = capture?.purchase_units?.[0]?.payments?.captures?.[0];
    const captureState = captureRecord?.status;

    if (captureStatus !== 'COMPLETED' || captureState !== 'COMPLETED') {
      return res.status(402).json({ success: false, message: 'Venmo payment was not completed.', paypalStatus: captureState || captureStatus });
    }

    const capturedAmount = Number(captureRecord?.amount?.value);
    const capturedCurrency = String(captureRecord?.amount?.currency_code || '').toUpperCase();
    if (!Number.isFinite(capturedAmount) || capturedAmount !== Number(order.total) || capturedCurrency !== 'USD') {
      console.error('Venmo capture amount mismatch:', { capturedAmount, capturedCurrency, expected: order.total });
      return res.status(400).json({ success: false, message: 'Venmo payment amount could not be verified.' });
    }

    const captureId = captureRecord.id;
    transaction.providerReference = paypalOrderId;
    transaction.description = `Venmo payment captured (${captureId}).`;
    await transaction.save();

    const settled = await settleSuccessfulPayment({
      orderId: order._id,
      providerReference: paypalOrderId,
      provider: 'venmo',
    });

    return res.json({
      success: true,
      orderId: settled.order._id,
      orderNumber: settled.order.orderNumber,
      paymentStatus: settled.order.paymentStatus,
    });
  } catch (error) {
    console.error('Capture Venmo order error:', error);
    return res.status(error.status === 422 ? 422 : 500).json({ success: false, message: error.message || 'Unable to capture Venmo payment.' });
  }
}

module.exports = { getPaymentConfig, createPaymentIntent, createVenmoOrder, captureVenmoOrder, createZelleOrder, claimZellePayment, buildOrderFromCart };
