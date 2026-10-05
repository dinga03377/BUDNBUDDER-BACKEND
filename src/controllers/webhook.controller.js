const stripe = require("../services/stripe.service");
const paypal = require("../services/paypal.service");
const { settleSuccessfulPayment } = require("../services/paymentSettlement.service");

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
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata?.orderId;
        if (!orderId) break;

        const order = await Order.findById(orderId);
        if (!order) break;

        const expectedAmount = Math.round(Number(order.total) * 100);
        if (Number(paymentIntent.amount_received) !== expectedAmount) {
          console.error("Stripe amount mismatch:", { orderId, received: paymentIntent.amount_received, expected: expectedAmount });
          return res.status(400).json({ success: false, message: "Stripe amount mismatch." });
        }

        await settleSuccessfulPayment({
          orderId,
          providerReference: paymentIntent.id,
          provider: "stripe",
        });
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


const handlePayPalWebhook = async (req, res) => {
  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : null;
  let event = null;
  try {
    if (rawBody) event = JSON.parse(rawBody);
  } catch (error) {
    console.error('PayPal webhook rejected: invalid JSON payload.', error.message);
    return res.status(400).json({ success: false, message: 'Invalid PayPal webhook JSON payload.' });
  }

  const requiredHeaders = [
    'paypal-transmission-id',
    'paypal-transmission-time',
    'paypal-cert-url',
    'paypal-auth-algo',
    'paypal-transmission-sig',
  ];
  const missingHeaders = requiredHeaders.filter((name) => !req.headers[name]);

  if (missingHeaders.length || !rawBody || !event || typeof event !== 'object' || Array.isArray(event)) {
    console.error('PayPal webhook rejected: missing signature headers or JSON body.', {
      missingHeaders,
      hasBody: Boolean(rawBody),
    });
    return res.status(400).json({
      success: false,
      message: 'PayPal webhook is missing required signature headers or payload.',
    });
  }

  const eventId = event.id || 'unknown';
  const eventType = event.event_type || 'unknown';

  try {
    const verified = await paypal.verifyWebhook({
      transmissionId: req.headers['paypal-transmission-id'],
      transmissionTime: req.headers['paypal-transmission-time'],
      certUrl: req.headers['paypal-cert-url'],
      authAlgo: req.headers['paypal-auth-algo'],
      transmissionSig: req.headers['paypal-transmission-sig'],
      webhookEvent: event,
      rawWebhookBody: rawBody,
    });

    if (!verified) {
      console.error('PayPal webhook signature verification failed.', { eventId, eventType });
      return res.status(400).json({ success: false, message: 'Invalid PayPal webhook signature.' });
    }

    console.log('PayPal webhook signature verified.', { eventId, eventType });

    // Ignore verified event types that this application does not process.
    if (!['PAYMENT.CAPTURE.COMPLETED', 'PAYMENT.CAPTURE.DENIED', 'CHECKOUT.ORDER.DECLINED'].includes(eventType)) {
      console.log('PayPal webhook acknowledged without payment changes.', { eventId, eventType });
      return res.status(200).json({ received: true, ignored: true });
    }

    const paypalOrderId = event?.resource?.supplementary_data?.related_ids?.order_id
      || (eventType === 'CHECKOUT.ORDER.DECLINED' ? event?.resource?.id : null);

    if (!paypalOrderId) {
      console.error('PayPal payment webhook has no related PayPal order ID.', { eventId, eventType });
      return res.status(400).json({ success: false, message: 'PayPal event is missing the related order ID.' });
    }

    const transaction = await Transaction.findOne({
      provider: 'venmo',
      providerReference: paypalOrderId,
    });

    if (!transaction) {
      console.error('PayPal webhook could not find the Venmo transaction.', { eventId, eventType, paypalOrderId });
      // A 5xx response lets PayPal retry transient database/consistency issues.
      return res.status(500).json({ success: false, message: 'Matching Venmo transaction was not found.' });
    }

    const order = await Order.findById(transaction.order);
    if (!order) {
      console.error('PayPal webhook transaction references a missing order.', {
        eventId, eventType, paypalOrderId, transactionId: transaction._id,
      });
      return res.status(500).json({ success: false, message: 'Matching order was not found.' });
    }

    if (String(order.paymentMethod || '').toLowerCase() !== 'venmo') {
      console.error('PayPal webhook payment method mismatch.', {
        eventId, paypalOrderId, orderId: order._id, paymentMethod: order.paymentMethod,
      });
      return res.status(400).json({ success: false, message: 'Payment method does not match the PayPal transaction.' });
    }

    if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
      const capture = event.resource;
      const paidAmount = Number(capture?.amount?.value);
      const currency = String(capture?.amount?.currency_code || '').toUpperCase();

      if (capture?.status !== 'COMPLETED') {
        console.error('PayPal completed event has a non-completed capture status.', {
          eventId, paypalOrderId, captureStatus: capture?.status,
        });
        return res.status(400).json({ success: false, message: 'PayPal capture is not completed.' });
      }

      // Compare in cents to avoid floating-point rounding differences.
      const paidCents = Math.round(paidAmount * 100);
      const expectedCents = Math.round(Number(order.total) * 100);
      if (!Number.isFinite(paidAmount) || currency !== 'USD' || paidCents !== expectedCents) {
        console.error('PayPal webhook amount/currency mismatch.', {
          eventId, paypalOrderId, paidAmount, currency, expectedAmount: order.total, expectedCurrency: order.currency,
        });
        return res.status(400).json({ success: false, message: 'PayPal amount or currency mismatch.' });
      }

      const settled = await settleSuccessfulPayment({
        orderId: order._id,
        providerReference: paypalOrderId,
        provider: 'venmo',
      });
      console.log('PayPal capture webhook processed.', {
        eventId,
        paypalOrderId,
        orderNumber: settled.order?.orderNumber,
        alreadySettled: Boolean(settled.alreadySettled),
      });
      return res.status(200).json({ received: true, processed: true });
    }

    // A delayed denial/decline must never overwrite a successful payment.
    if (transaction.status !== 'success' && order.paymentStatus !== 'paid') {
      transaction.status = 'failed';
      await transaction.save();
      order.paymentStatus = 'failed';
      order.status = 'cancelled';
      await order.save();
      console.log('PayPal/Venmo payment marked failed.', { eventId, eventType, orderNumber: order.orderNumber });
    } else {
      console.log('PayPal denial/decline ignored because payment is already successful.', {
        eventId, eventType, orderNumber: order.orderNumber,
      });
    }

    return res.status(200).json({ received: true, processed: true });
  } catch (error) {
    console.error('PayPal webhook processing error.', {
      eventId,
      eventType,
      message: error.message,
      status: error.status,
    });
    return res.status(500).json({ success: false, message: 'PayPal webhook processing failed.' });
  }
};

module.exports = {
  handleStripeWebhook,
  handlePayPalWebhook,
};