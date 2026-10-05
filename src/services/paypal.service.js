const PAYPAL_ENV_CONFIG = (process.env.PAYPAL_ENVIRONMENT || 'sandbox').trim().toLowerCase();
const PAYPAL_ENV = PAYPAL_ENV_CONFIG === 'live' ? 'production' : PAYPAL_ENV_CONFIG;
if (!['sandbox', 'production'].includes(PAYPAL_ENV)) {
  throw new Error('Invalid PAYPAL_ENVIRONMENT. Use "sandbox" for testing or "production" for live payments.');
}
const PAYPAL_BASE_URL = PAYPAL_ENV === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

function assertConfigured() {
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    throw new Error('PayPal is not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.');
  }
}

async function getAccessToken() {
  assertConfigured();

  const credentials = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64');

  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`PayPal authentication failed: ${data.error_description || data.error || response.status}`);
  }

  return data.access_token;
}

async function paypalRequest(path, options = {}) {
  const accessToken = await getAccessToken();
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(`${PAYPAL_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch (_) { data = { raw: text }; }

  
if (!response.ok) {
  console.error('PayPal API error details:', JSON.stringify(data, null, 2));

  const message = data?.details
    ?.map((d) => `${d.field || 'field'}: ${d.description || d.issue || 'Invalid value'}`)
    .filter(Boolean)
    .join('; ')
    || data?.message
    || `PayPal API error (${response.status})`;

  const error = new Error(message);
  error.status = response.status;
  error.paypal = data;
  throw error;
}

  return data;
}

async function createOrder({ amount, currency = 'USD', referenceId, description }) {
  return paypalRequest('/v2/checkout/orders', {
    method: 'POST',
    headers: {
      'PayPal-Request-Id': `BNB-${referenceId}-${Date.now()}`,
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: referenceId,
        custom_id: referenceId,
        description: description || `Bud N' Budder order ${referenceId}`,
        amount: {
          currency_code: currency,
          value: Number(amount).toFixed(2),
        },
      }],
      application_context: {
        user_action: 'PAY_NOW',
        shipping_preference: 'NO_SHIPPING',
      },
    }),
  });
}

async function captureOrder(orderId) {
  return paypalRequest(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: 'POST',
    headers: {
      'PayPal-Request-Id': `BNB-CAPTURE-${orderId}`,
    },
    body: '{}',
  });
}

async function verifyWebhook({ transmissionId, transmissionTime, certUrl, authAlgo, transmissionSig, webhookEvent, rawWebhookBody }) {
  if (!process.env.PAYPAL_WEBHOOK_ID) {
    console.error('PayPal webhook verification unavailable: PAYPAL_WEBHOOK_ID is not configured.');
    return false;
  }

  // Reject incomplete or malformed webhook metadata before making an authenticated API call.
  if (
    !transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig ||
    !webhookEvent || typeof webhookEvent !== 'object' || Array.isArray(webhookEvent) ||
    typeof rawWebhookBody !== 'string' || !rawWebhookBody.trim()
  ) {
    return false;
  }

  // PayPal requires the webhook_event payload to be sent back without parsing and
  // re-serializing its original JSON bytes. Embed the captured raw JSON into the
  // verification request after safely serializing the surrounding fields.
  const verificationFields = JSON.stringify({
    auth_algo: authAlgo,
    cert_url: certUrl,
    transmission_id: transmissionId,
    transmission_sig: transmissionSig,
    transmission_time: transmissionTime,
    webhook_id: process.env.PAYPAL_WEBHOOK_ID,
  });
  const verificationBody = `${verificationFields.slice(0, -1)},"webhook_event":${rawWebhookBody}}`;

  const data = await paypalRequest('/v1/notifications/verify-webhook-signature', {
    method: 'POST',
    body: verificationBody,
  });

  return data?.verification_status === 'SUCCESS';
}

module.exports = {
  PAYPAL_ENV,
  PAYPAL_BASE_URL,
  getAccessToken,
  createOrder,
  captureOrder,
  verifyWebhook,
};
