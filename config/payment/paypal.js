const paypal = require("@paypal/checkout-server-sdk");

// Set up PayPal environment (sandbox or live)
const environment =
  process.env.PAYPAL_MODE === "live"
    ? new paypal.core.LiveEnvironment(
        process.env.PAYPAL_CLIENT_ID,
        process.env.PAYPAL_CLIENT_SECRET
      )
    : new paypal.core.SandboxEnvironment(
        process.env.PAYPAL_CLIENT_ID,
        process.env.PAYPAL_CLIENT_SECRET
      );

const client = new paypal.core.PayPalHttpClient(environment);

/**
 * Create a PayPal order
 *
 * @param {Object} payload
 * @param {number} payload.amount    - e.g. "10.00"
 * @param {string} payload.currency  - e.g. "USD"
 * @param {string} payload.reference_id - your internal order/reference ID
 *
 * @returns {Object} { success, order_id, status, approve_url }
 */
const createPayPalOrder = async (payload) => {
  const { amount, currency = "USD", reference_id = "" } = payload;

  if (!amount) {
    const err = new Error("amount is required");
    err.statusCode = 400;
    throw err;
  }

  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer("return=representation");
  request.requestBody({
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id,
        amount: {
          currency_code: currency,
          value: String(amount), // e.g. "10.00"
        },
      },
    ],
    application_context: {
      return_url: process.env.PAYPAL_RETURN_URL || "http://localhost:8080/return",
      cancel_url: process.env.PAYPAL_CANCEL_URL || "http://localhost:8080/cancel",
    },
  });

  const response = await client.execute(request);
  const order = response.result;

  // Find the approve URL for redirecting the user
  const approveUrl = order.links.find((l) => l.rel === "approve")?.href;

  return {
    success: true,
    order_id: order.id,
    status: order.status,
    approve_url: approveUrl, // redirect user to this URL to approve payment
  };
};

/**
 * Capture a PayPal order (after user approves)
 *
 * @param {string} orderId - PayPal order ID from createPayPalOrder
 * @returns {Object} { success, capture_id, status, amount, currency }
 */
const capturePayPalOrder = async (orderId) => {
  if (!orderId) {
    const err = new Error("orderId is required");
    err.statusCode = 400;
    throw err;
  }

  const request = new paypal.orders.OrdersCaptureRequest(orderId);
  request.requestBody({});

  const response = await client.execute(request);
  const capture = response.result;
  const captureDetail =
    capture.purchase_units[0]?.payments?.captures[0];

  return {
    success: true,
    capture_id: captureDetail?.id,
    status: capture.status,
    amount: captureDetail?.amount?.value,
    currency: captureDetail?.amount?.currency_code,
  };
};

module.exports = { createPayPalOrder, capturePayPalOrder };