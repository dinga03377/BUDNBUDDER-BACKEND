const {
  param,
} = require("express-validator");

const orderIdValidation = [
  param("id")
    .isMongoId()
    .withMessage(
      "Invalid order ID."
    ),
];

module.exports = {
  orderIdValidation,
};