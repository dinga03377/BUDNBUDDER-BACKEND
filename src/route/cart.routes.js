const express = require("express");

const {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  mergeGuestCart,
} = require("../controllers/cart.controller");

const {
  addToCartValidation,
  updateCartValidation,
} = require(
  "../validators/cart.validator"
);

const optionalAuth = require("../middleware/optionalAuth");

const validate = require(
  "../middleware/validation"
);

const router = express.Router();

router.use(optionalAuth);

router.get("/", getCart);

router.post(
  "/items",
  addToCartValidation,
  validate,
  addItem
);

router.patch(
  "/items/:productId",
  updateCartValidation,
  validate,
  updateItem
);

router.delete(
  "/items/:productId",
  removeItem
);

router.delete(
  "/",
  clearCart
);

router.post(
  "/merge",
  mergeGuestCart
);

module.exports = router;