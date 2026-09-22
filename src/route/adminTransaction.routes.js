const express = require("express");

const {
  getAllTransactions,
  getTransaction,
  deleteTransaction,
} = require(
  "../controllers/adminTransaction.controller"
);

const adminAuth = require(
  "../middleware/adminAuth"
);

const validate = require(
  "../middleware/validation"
);

const {
  paginationValidation,
} = require(
  "../validators/pagination.validator"
);

const router = express.Router();

router.use(adminAuth);

router.get(
  "/",
  paginationValidation,
  getAllTransactions
);

router.get(
  "/:id",
  getTransaction
);

router.delete(
  "/:id",
  deleteTransaction
);

module.exports = router;