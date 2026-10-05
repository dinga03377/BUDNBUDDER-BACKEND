const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const { reduceStock } = require('./inventory.service');
const { createAdminNotification, createUserNotification } = require('./notification.service');
const { checkLowStockForItems } = require('./stockAlert.service');
const { sendPaymentConfirmation } = require('./email.service');

async function settleSuccessfulPayment({ orderId, providerReference, provider }) {
  const normalizedProvider = String(provider).toLowerCase();
  const order = await Order.findById(orderId);
  if (!order) throw new Error(`Order not found: ${orderId}`);

  const transaction = await Transaction.findOne({
    providerReference,
    provider: normalizedProvider,
  });
  if (!transaction) throw new Error(`Transaction not found for ${normalizedProvider} reference ${providerReference}`);
  if (transaction.order && transaction.order.toString() !== order._id.toString()) {
    throw new Error(`Transaction ${transaction._id} does not belong to order ${order._id}`);
  }

  if (order.paymentStatus === 'paid') {
    if (transaction.status !== 'success') {
      transaction.status = 'success';
      await transaction.save();
    }
    // Legacy paid orders have a null marker and must not replay inventory deductions.
    if (['processing', 'needs_review'].includes(order.paymentFulfillmentStatus)) {
      // A process crash may leave the marker at processing. Never replay stock deductions
      // automatically because a previous attempt may have partially changed inventory.
      if (order.paymentFulfillmentStatus === 'processing') {
        order.paymentFulfillmentStatus = 'needs_review';
        await order.save();
      }
      console.error('Paid order requires post-payment reconciliation; automatic side effects were not repeated.', {
        orderNumber: order.orderNumber,
        orderId: order._id,
        paymentFulfillmentStatus: order.paymentFulfillmentStatus,
      });
      return { order, transaction, alreadySettled: true, needsManualReview: true };
    }
    return { order, transaction, alreadySettled: true };
  }

  // Atomically claim the order. Only the caller that changes pending -> paid may run side effects.
  const claimedOrder = await Order.findOneAndUpdate(
    { _id: orderId, paymentStatus: 'pending' },
    { $set: { paymentStatus: 'paid', status: 'processing', paymentFulfillmentStatus: 'processing' } },
    { new: true }
  );

  if (!claimedOrder) {
    const latest = await Order.findById(orderId);
    return { order: latest, transaction, alreadySettled: true };
  }

  try {
    transaction.status = 'success';
    await transaction.save();

    // This operation may update multiple products. If it fails part-way, do not retry it
    // automatically: doing so could deduct stock twice. Flag the paid order for reconciliation.
    await reduceStock(claimedOrder.items);
    await checkLowStockForItems(claimedOrder.items);

    if (claimedOrder.user) await Cart.deleteOne({ user: claimedOrder.user });
    if (claimedOrder.isGuest && claimedOrder.guestCartId) await Cart.deleteOne({ guestCartId: claimedOrder.guestCartId });

    await createAdminNotification({
      type: 'payment_success',
      title: 'Payment confirmed',
      message: `Payment for order ${claimedOrder.orderNumber} has been confirmed.`,
      order: claimedOrder._id,
      transaction: transaction._id,
    });

    if (claimedOrder.user) {
      await createUserNotification({
        userId: claimedOrder.user,
        type: 'payment_success',
        title: 'Payment confirmed',
        message: `Your payment for order ${claimedOrder.orderNumber} was successful.`,
        order: claimedOrder._id,
        transaction: transaction._id,
      });
    }

    if (claimedOrder.customer?.email) {
      try {
        await sendPaymentConfirmation({
          email: claimedOrder.customer.email,
          firstName: claimedOrder.customer.firstName,
          orderNumber: claimedOrder.orderNumber,
          total: claimedOrder.total,
          currency: claimedOrder.currency,
        });
      } catch (error) {
        // Email failure should not reverse a successfully settled payment.
        console.error('Payment confirmation email failed:', error);
      }
    }

    claimedOrder.paymentFulfillmentStatus = 'completed';
    await claimedOrder.save();
    return { order: claimedOrder, transaction, alreadySettled: false };
  } catch (error) {
    await Order.findByIdAndUpdate(claimedOrder._id, {
      $set: { paymentFulfillmentStatus: 'needs_review' },
    }).catch((markerError) => {
      console.error('Could not mark payment fulfillment for review.', {
        orderId: claimedOrder._id,
        message: markerError.message,
      });
    });
    console.error('Post-payment fulfillment failed; manual inventory/order reconciliation is required.', {
      orderNumber: claimedOrder.orderNumber,
      orderId: claimedOrder._id,
      message: error.message,
    });
    throw error;
  }
}

async function settleManualPayment({ orderId, transactionId }) {
  const transaction = await Transaction.findById(transactionId);
  if (!transaction || !['zelle', 'venmo'].includes(transaction.provider)) {
    throw new Error('Manual payment transaction not found.');
  }
  if (transaction.order?.toString() !== orderId.toString()) {
    throw new Error('Transaction does not belong to this order.');
  }
  return settleSuccessfulPayment({
    orderId,
    providerReference: transaction.providerReference || transaction.transactionId,
    provider: transaction.provider,
  });
}

module.exports = { settleSuccessfulPayment, settleManualPayment };
