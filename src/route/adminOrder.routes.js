const express = require("express");

const {
  getAllOrders,
  getAdminOrder,
  updateOrderStatus,
} = require(
  "../controllers/adminOrder.controller"
);

const adminAuth = require(
  "../middleware/adminAuth"
);

const validate = require(
  "../middleware/validation"
);

const {
  updateOrderStatusValidation,
} = require(
  "../validators/adminOrder.validator"
);

const {
  orderIdValidation,
} = require(
  "../validators/order.validator"
);

const {
  paginationValidation,
} = require(
  "../validators/pagination.validator"
);


const router = express.Router();

// All admin order routes require admin authentication
router.use(adminAuth);

router.get(
  "/",
  paginationValidation,
  validate,
  getAllOrders
);

router.get(
  "/:id",
  orderIdValidation,
  validate,
  getAdminOrder
);

router.patch(
  "/:id/status",
  updateOrderStatusValidation,
  validate,
  updateOrderStatus
);

module.exports = router;