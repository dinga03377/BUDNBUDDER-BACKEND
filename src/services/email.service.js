const { Resend } = require("resend");

const resend = new Resend(
  process.env.RESEND_API_KEY
);

const sendAdminResetCode = async (
  email,
  code
) => {
  await resend.emails.send({
    from: process.env.RESEND_FROM,
    to: email,
    subject:
      "Your Bud N' Budder Admin Verification Code",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Bud N' Budder Admin</h2>

        <p>
          You requested to reset your admin password.
        </p>

        <p>
          Your verification code is:
        </p>

        <h1 style="letter-spacing: 8px;">
          ${code}
        </h1>

        <p>
          This code expires in 10 minutes.
        </p>

        <p>
          If you did not request this, you can safely
          ignore this email.
        </p>
      </div>
    `,
  });
};

const sendCustomerResetCode = async (
  email,
  code
) => {
  await resend.emails.send({
    from: process.env.RESEND_FROM,
    to: email,
    subject:
      "Your Bud N' Budder Password Reset Code",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Bud N' Budder</h2>

        <p>
          You requested to reset your account password.
        </p>

        <p>
          Your verification code is:
        </p>

        <h1 style="letter-spacing: 8px;">
          ${code}
        </h1>

        <p>
          This code expires in 10 minutes.
        </p>

        <p>
          If you did not request this, you can safely
          ignore this email.
        </p>
      </div>
    `,
  });
};

// ==========================================
// SEND ORDER CONFIRMATION
// ==========================================

const sendOrderConfirmation = async ({
  email,
  firstName,
  orderNumber,
  total,
  currency,
}) => {
  await resend.emails.send({
    from: process.env.RESEND_FROM,
    to: email,
    subject: `Order ${orderNumber} confirmed`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Bud N' Budder</h2>

        <p>
          Hi ${firstName},
        </p>

        <p>
          Thank you for your order.
        </p>

        <p>
          Your order
          <strong>${orderNumber}</strong>
          has been confirmed.
        </p>

        <p>
          <strong>Total:</strong>
          ${currency} ${Number(total).toFixed(2)}
        </p>

        <p>
          We'll keep you updated as your order progresses.
        </p>

        <p>
          Thank you for shopping with Bud N' Budder.
        </p>
      </div>
    `,
  });
};

// ==========================================
// SEND ORDER STATUS UPDATE
// ==========================================

const sendOrderStatusUpdate = async ({
  email,
  firstName,
  orderNumber,
  status,
}) => {
  await resend.emails.send({
    from: process.env.RESEND_FROM,
    to: email,
    subject: `Order ${orderNumber} update`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Bud N' Budder</h2>

        <p>
          Hi ${firstName},
        </p>

        <p>
          Your order
          <strong>${orderNumber}</strong>
          has been updated.
        </p>

        <p>
          <strong>Current status:</strong>
          ${status}
        </p>

        <p>
          Thank you for shopping with us.
        </p>
      </div>
    `,
  });
};

// ==========================================
// SEND PAYMENT CONFIRMATION
// ==========================================

const sendPaymentConfirmation = async ({
  email,
  firstName,
  orderNumber,
  total,
  currency,
}) => {
  await resend.emails.send({
    from: process.env.RESEND_FROM,
    to: email,
    subject: `Payment confirmed for ${orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Payment Confirmed</h2>

        <p>
          Hi ${firstName},
        </p>

        <p>
          We've successfully received your payment
          for order <strong>${orderNumber}</strong>.
        </p>

        <p>
          <strong>Amount:</strong>
          ${currency} ${Number(total).toFixed(2)}
        </p>

        <p>
          Your order is now being processed.
        </p>

        <p>
          Thank you for choosing Bud N' Budder.
        </p>
      </div>
    `,
  });
};

// ==========================================
// SEND REFUND CONFIRMATION
// ==========================================

const sendRefundConfirmation = async ({
  email,
  firstName,
  orderNumber,
  total,
  currency,
}) => {
  await resend.emails.send({
    from: process.env.RESEND_FROM,
    to: email,
    subject: `Refund processed for ${orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Refund Processed</h2>

        <p>
          Hi ${firstName},
        </p>

        <p>
          Your refund for order
          <strong>${orderNumber}</strong>
          has been processed.
        </p>

        <p>
          <strong>Refund amount:</strong>
          ${currency} ${Number(total).toFixed(2)}
        </p>

        <p>
          Please allow your payment provider some time
          to reflect the refund in your account.
        </p>
      </div>
    `,
  });
};

module.exports = {
  sendAdminResetCode,
  sendOrderConfirmation,
  sendOrderStatusUpdate,
  sendPaymentConfirmation,
  sendRefundConfirmation,
};