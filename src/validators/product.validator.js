const {
  param,
} = require("express-validator");

const productIdValidation = [
  param("id")
    .isMongoId()
    .withMessage(
      "Invalid product ID."
    ),
];

module.exports = {
  productIdValidation,
};