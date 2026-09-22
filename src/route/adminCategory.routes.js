const express = require("express");

const {
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/adminCategory.controller");

const {
  paginationValidation,
} = require(
  "../validators/pagination.validator"
);

const validate = require(
  "../middleware/validation"
);

const protectAdmin = require("../middleware/adminAuth");

const router = express.Router();

router.use(protectAdmin);

router.get("/", paginationValidation, validate, getAdminCategories);

router.post("/", createCategory);

router.patch("/:id", updateCategory);

router.delete("/:id", deleteCategory);

module.exports = router;