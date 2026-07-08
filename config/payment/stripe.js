const Stripe = require("stripe");

// Initialize Stripe with secret key from .env
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Process a Stripe payment
 *
 * @param {Object} payload - Request body from client
 * @param {Object} payload.billing_details        - { email, name, phone }
 * @param {Object} payload.card                   - { token: "tok_xxx" }
 * @param {Object} payload.client_attribution_metadata
 * @param {Object} payload.radar_options          - { hcaptcha_token }
 * @param {string} payload.referrer
 * @param {string} payload.time_on_page
 * @param {number} payload.amount                 - in smallest unit e.g. 1000 = $10.00
 * @param {string} payload.currency               - e.g. "usd", "sgd"
 *
 * @returns {Object} result
 */
const processStripePayment = async (payload) => {
  const {
    billing_details,
    card,
    client_attribution_metadata = {},
    radar_options = {},
    referrer = "",
    time_on_page = "",
    amount = 1000,
    currency = "usd",
  } = payload;

  // --- Validate required fields ---
  if (!card?.token) {
    const err = new Error("card.token is required");
    err.statusCode = 400;
    throw err;
  }
  if (!billing_details?.email) {
    const err = new Error("billing_details.email is required");
    err.statusCode = 400;
    throw err;
  }

  // --- Step 1: Create PaymentMethod from card token ---
  const paymentMethod = await stripe.paymentMethods.create({
    type: "card",
    card: { token: card.token },
    billing_details: {
      email: billing_details.email,
      name: billing_details.name || "",
      phone: billing_details.phone || "",
    },
  });

  // --- Step 2: Create and confirm PaymentIntent ---
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency,
    payment_method: paymentMethod.id,
    confirm: true,
    return_url: process.env.STRIPE_RETURN_URL || "http://localhost:8080/return",
    metadata: {
      client_session_id: client_attribution_metadata.client_session_id || "",
      merchant_integration_source: client_attribution_metadata.merchant_integration_source || "",
      merchant_integration_subtype: client_attribution_metadata.merchant_integration_subtype || "",
      referrer,
      time_on_page: String(time_on_page),
    },
    ...(radar_options?.hcaptcha_token && {
      radar_options: { session: radar_options.hcaptcha_token },
    }),
  });

  // --- Step 3: Return based on status ---
  if (paymentIntent.status === "succeeded") {
    return {
      success: true,
      payment_intent_id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    };
  }

  if (paymentIntent.status === "requires_action") {
    return {
      success: false,
      requires_action: true,
      payment_intent_client_secret: paymentIntent.client_secret,
      status: paymentIntent.status,
    };
  }

  return {
    success: false,
    status: paymentIntent.status,
    message: "Payment was not completed.",
  };
};

module.exports = { processStripePayment };
