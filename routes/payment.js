// const express = require("express");
// const router = express.Router();
// const { processStripePayment } = require("../config/payment/stripe");
// const { createPayPalOrder, capturePayPalOrder } = require("../config/payment/paypal");

// /**
//  * POST /api/payment/stripe
//  * Process a Stripe card payment using a Stripe.js token
//  */
// router.post("/stripe", async (req, res) => {
//   try {
//     const result = await processStripePayment(req.body);
//     return res.status(200).json(result);
//   } catch (err) {
//     console.error("Stripe Route Error:", err.message);
//     return res.status(err.statusCode || 500).json({
//       success: false,
//       error: err.message,
//       code: err.code || null,
//       decline_code: err.decline_code || null,
//     });
//   }
// });

// //paypal//
// /**
//  * POST /api/payment/paypal/create
//  * Create a PayPal order and get the approve URL
//  *MethodEndpointPurposePOST/api/payment/stripeCharge card via StripePOST/api/payment/paypal/createCreate PayPal order → get approve_urlPOST/api/payment/paypal/captureCapture after user approves

// PayPal flow is 2 steps (unlike Stripe which is 1):

// Call /create → redirect user to approve_url
// After user approves on PayPal, call /capture with the order_id
//  * Body: { amount, currency, reference_id }
//  */
// router.post("/paypal/create", async (req, res) => {
//   try {
//     const result = await createPayPalOrder(req.body);
//     return res.status(200).json(result);
//   } catch (err) {
//     console.error("PayPal Create Error:", err.message);
//     return res.status(err.statusCode || 500).json({
//       success: false,
//       error: err.message,
//     });
//   }
// });

// /**
//  * POST /api/payment/paypal/capture
//  * Capture payment after user approves on PayPal
//  *
//  * Body: { order_id }
//  */
// router.post("/paypal/capture", async (req, res) => {
//   try {
//     const { order_id } = req.body;
//     const result = await capturePayPalOrder(order_id);
//     return res.status(200).json(result);
//   } catch (err) {
//     console.error("PayPal Capture Error:", err.message);
//     return res.status(err.statusCode || 500).json({
//       success: false,
//       error: err.message,
//     });
//   }
// });

// module.exports = router;

const express = require("express");
const router = express.Router();
const db = require("../config/db");
const auth = require("../middlewares/auth");

// Import Payment Gateway SDK Wrappers
const { processStripePayment } = require("../config/payment/stripe");
const {
  createPayPalOrder,
  capturePayPalOrder,
} = require("../config/payment/paypal");

// Import Email & PDF Service
const {
  sendRegistrationSuccessfullNotification,
} = require("../emailService/index");

/**
 * HELPER: Update Order Status securely in MySQL
 */
async function updateOrderStatus(conn, orderSysId, eventSysId, status) {
  const payload = JSON.stringify([
    {
      ITEM: "UPDATE_STATUS",
      ORDER_SYS_ID: orderSysId,
      EVENT_SYS_ID: eventSysId,
      STATUS: status,
    },
  ]);

  await conn.execute(
    "CALL USP_POST_EVENT_ORDER_DETAILS_ACTIVITY(?, ?, @ERRNO, @ERRMSG);",
    ["ADD_UPDATE_EVENT_ORDER_DETAILS", payload],
  );
}

/**
 * @swagger
 * /api/payment/checkout:
 * post:
 * tags:
 * - Payment
 * security:
 * - bearerAuth: []
 * summary: Secure, unified checkout processor for Tickets
 */
router.post("/checkout", auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { per_order_DATA, reg_DATA, PAYMENT_DATA } = req.body;

    if (!per_order_DATA || !reg_DATA || !PAYMENT_DATA) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payload structure." });
    }

    const EVENT_SYS_ID = per_order_DATA[0].EVENT_SYS_ID;

    // =====================================================================
    // STEP 1: CREATE THE INITIAL ORDER IN THE DATABASE
    // =====================================================================
    per_order_DATA[0].ITEM = "ADD";
    const orderPayload = JSON.stringify(per_order_DATA);

    const [orderRows] = await conn.execute(
      "CALL USP_POST_EVENT_ORDER_DETAILS_ACTIVITY(?, ?, @ERRNO, @ERRMSG);",
      ["ADD_UPDATE_EVENT_ORDER_DETAILS", orderPayload],
    );

    const orderResult = orderRows[0][0].JSON_VALUE;
    if (orderResult.status !== "true") {
      throw new Error("Failed to create Order in Database.");
    }

    // Extract the newly generated DB Order ID
    const GENERATED_ORDER_SYS_ID =
      orderResult.ORDER_SYS_ID || orderResult.response;

    // =====================================================================
    // STEP 2: SAVE THE REGISTRATIONS LINKED TO THE NEW ORDER ID
    // =====================================================================
    // Inject the generated ORDER_SYS_ID into every attendee's record
    const updatedRegData = reg_DATA.map((attendee) => ({
      ...attendee,
      ITEM: "ADD",
      ORDER_SYS_ID: GENERATED_ORDER_SYS_ID,
    }));

    const regPayload = JSON.stringify(updatedRegData);
    const [regRows] = await conn.execute(
      "CALL USP_POST_EVENT_NEW_REGISTRATION_DETAILS_ACTIVITY(?, ?, @ERRNO, @ERRMSG);",
      ["ADD_UPDATE_EVENT_NEW_REGISTRATION_DETAILS", regPayload],
    );

    const regResult = regRows[0][0].JSON_VALUE;
    if (regResult.status !== "true") {
      throw new Error("Failed to save Registrations in Database.");
    }

    const GENERATED_REG_IDS = regResult.REGISTRATION_SYS_IDS || [];

    // =====================================================================
    // STEP 3: PROCESS SECURE PAYMENT
    // =====================================================================
    const paymentMethod = String(PAYMENT_DATA.payment_method).toUpperCase();

    // SCENARIO A: FREE TICKET
    if (
      paymentMethod === "FREE" ||
      parseFloat(per_order_DATA[0].GRAND_TOTAL) === 0
    ) {
      // Update order to Success
      await updateOrderStatus(
        conn,
        GENERATED_ORDER_SYS_ID,
        EVENT_SYS_ID,
        "Success",
      );

      // Dispatch Emails in the background
      for (const regId of GENERATED_REG_IDS) {
        sendRegistrationSuccessfullNotification(EVENT_SYS_ID, regId).catch(
          console.error,
        );
      }

      return res
        .status(200)
        .json({
          success: true,
          message: "Free registration completed.",
          order_id: GENERATED_ORDER_SYS_ID,
        });
    }

    // SCENARIO B: STRIPE PAYMENT
    if (paymentMethod === "STRIPE") {
      const stripeResult = await processStripePayment({
        amount: PAYMENT_DATA.amount,
        currency: PAYMENT_DATA.currency,
        paymentMethodId: PAYMENT_DATA.paymentMethodId,
      });

      if (stripeResult.success) {
        // Payment Captured Successfully
        await updateOrderStatus(
          conn,
          GENERATED_ORDER_SYS_ID,
          EVENT_SYS_ID,
          "Success",
        );

        for (const regId of GENERATED_REG_IDS) {
          sendRegistrationSuccessfullNotification(EVENT_SYS_ID, regId).catch(
            console.error,
          );
        }
        return res
          .status(200)
          .json({
            success: true,
            ...stripeResult,
            order_id: GENERATED_ORDER_SYS_ID,
          });
      }

      if (stripeResult.requires_action) {
        // 3D Secure / OTP Required - Mark Pending, return client_secret to Frontend
        await updateOrderStatus(
          conn,
          GENERATED_ORDER_SYS_ID,
          EVENT_SYS_ID,
          "Pending_3DS",
        );
        return res
          .status(200)
          .json({
            success: true,
            requires_action: true,
            client_secret: stripeResult.client_secret,
            order_id: GENERATED_ORDER_SYS_ID,
          });
      }

      // Stripe Declined
      await updateOrderStatus(
        conn,
        GENERATED_ORDER_SYS_ID,
        EVENT_SYS_ID,
        "Failed",
      );
      return res
        .status(400)
        .json({ success: false, message: stripeResult.message });
    }

    // SCENARIO C: PAYPAL PAYMENT (INITIATION)
    if (paymentMethod === "PAYPAL") {
      const paypalResult = await createPayPalOrder({
        amount: PAYMENT_DATA.amount,
        currency: PAYMENT_DATA.currency,
        reference_id: `SYS_${GENERATED_ORDER_SYS_ID}`,
      });

      if (paypalResult.success) {
        // Keep Order as Pending while user is redirected to PayPal
        await updateOrderStatus(
          conn,
          GENERATED_ORDER_SYS_ID,
          EVENT_SYS_ID,
          "Pending",
        );

        return res.status(200).json({
          success: true,
          approve_url: paypalResult.approve_url,
          order_id: GENERATED_ORDER_SYS_ID,
          gateway_order_id: paypalResult.order_id,
          generated_reg_ids: GENERATED_REG_IDS, // Pass back to frontend to use in capture step
        });
      }

      // PayPal Creation Failed
      await updateOrderStatus(
        conn,
        GENERATED_ORDER_SYS_ID,
        EVENT_SYS_ID,
        "Failed",
      );
      return res
        .status(400)
        .json({ success: false, message: "Failed to initiate PayPal." });
    }

    return res
      .status(400)
      .json({ success: false, message: "Invalid Payment Method provided." });
  } catch (error) {
    console.error("Checkout Finalization Error:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    if (conn) conn.release();
  }
});

/**
 * @swagger
 * /api/payment/paypal-capture:
 * post:
 * tags:
 * - Payment
 * security:
 * - bearerAuth: []
 * summary: Capture PayPal order after frontend approval
 */
router.post("/paypal-capture", auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const {
      gateway_order_id,
      ORDER_SYS_ID,
      EVENT_SYS_ID,
      REGISTRATION_SYS_IDS,
    } = req.body;

    const captureResult = await capturePayPalOrder(gateway_order_id);

    if (captureResult.success && captureResult.status === "COMPLETED") {
      // 1. Mark Order as Success in MySQL
      await updateOrderStatus(conn, ORDER_SYS_ID, EVENT_SYS_ID, "Success");

      // 2. Dispatch Emails in the background
      if (Array.isArray(REGISTRATION_SYS_IDS)) {
        for (const regId of REGISTRATION_SYS_IDS) {
          sendRegistrationSuccessfullNotification(EVENT_SYS_ID, regId).catch(
            console.error,
          );
        }
      }

      return res
        .status(200)
        .json({
          success: true,
          message: "PayPal payment captured successfully.",
        });
    }

    // Capture failed
    await updateOrderStatus(
      conn,
      ORDER_SYS_ID,
      EVENT_SYS_ID,
      `FAILED: ${captureResult.status}`,
    );
    return res
      .status(400)
      .json({ success: false, message: "PayPal capture failed." });
  } catch (error) {
    console.error("PayPal Capture Error:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;
