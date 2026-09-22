const express = require("express");

const {
  createOrder,
  getMyOrders,
  getMyOrder,
  getGuestOrder,
} = require("../controllers/order.controller");

const auth = require("../middleware/auth");
const optionalAuth = require("../middleware/optionalAuth");
const {
  cancelMyOrder,
} = require(
  "../controllers/orderCancellation.controller"
);

const {
  orderIdValidation,
} = require(
  "../validators/order.validator"
);

const validate = require("../middleware/validation");

const router = express.Router();

// Create order for guest OR registered customer
router.post(
  "/",
  optionalAuth,
  createOrder
);

router.get(
  "/guest/:id",
  optionalAuth,
  orderIdValidation,
  validate,
  getGuestOrder
);

// Registered customer order history
router.get(
  "/my-orders",
  auth,
  getMyOrders
);

// Registered customer order details
router.get(
  "/my-orders/:id",
  auth,
  orderIdValidation,
   validate,
  getMyOrder
);

router.patch(
  "/my-orders/:id/cancel",
  auth,
  orderIdValidation,
   validate,
  cancelMyOrder
);

module.exports = router;