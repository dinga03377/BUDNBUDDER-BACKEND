const express = require("express");

const {
  getProducts,
  getProduct,
} = require("../controllers/product.controller");

const {
  productIdValidation,
} = require(
  "../validators/product.validator"
);

const validate = require("../middleware/validation");

const router = express.Router();

router.get("/", getProducts);
router.get("/:id", productIdValidation, validate, getProduct);

module.exports = router;