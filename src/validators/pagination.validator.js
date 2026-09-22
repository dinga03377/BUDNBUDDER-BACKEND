const {
  query,
} = require("express-validator");

const paginationValidation = [
  query("page")
    .optional()
    .isInt({
      min: 1,
    })
    .withMessage(
      "Page must be at least 1."
    ),

  query("limit")
    .optional()
    .isInt({
      min: 1,
      max: 100,
    })
    .withMessage(
      "Limit must be between 1 and 100."
    ),
];

module.exports = {
  paginationValidation,
};