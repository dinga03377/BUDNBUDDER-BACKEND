const express = require("express");

const {
  getAdminProducts,
  getAdminProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/adminProduct.controller");

const {
  productIdValidation,
} = require(
  "../validators/product.validator"
);

const {
  paginationValidation,
} = require(
  "../validators/pagination.validator"
);

const protectAdmin = require("../middleware/adminAuth");

const validate = require(
  "../middleware/validation"
);

const router = express.Router();

router.use(protectAdmin);

router.get("/", paginationValidation, validate, getAdminProducts);

router.post("/", createProduct);

router.get("/:id", productIdValidation, validate, getAdminProduct);

router.patch("/:id", productIdValidation, validate, updateProduct);

router.delete("/:id", productIdValidation, validate, deleteProduct);

module.exports = router;