const express = require("express");

const {
  createPaymentIntent,
} = require(
  "../controllers/payment.controller"
);

const optionalAuth = require(
  "../middleware/optionalAuth"
);

// const {
//   productIdValidation,
// } = require(
//   "../validators/product.validator"
// );

// const validate = require("../middleware/validation");

const router = express.Router();

router.post(
  "/create-payment-intent",
  optionalAuth,
  createPaymentIntent
);

module.exports = router;