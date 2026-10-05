const express = require("express");

const {
  handleStripeWebhook,
  handlePayPalWebhook,
} = require(
  "../controllers/webhook.controller"
);

const router = express.Router();

router.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);

router.post(
  "/paypal",
  express.raw({ type: "application/json" }),
  handlePayPalWebhook
);

module.exports = router;