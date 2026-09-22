const {
  param,
  body,
} = require("express-validator");

const updateOrderStatusValidation = [
  param("id")
    .isMongoId()
    .withMessage(
      "Invalid order ID."
    ),

  body("status")
    .isIn([
      "pending",
      "processing",
      "completed",
      "cancelled",
    ])
    .withMessage(
      "Invalid order status."
    ),
];

module.exports = {
  updateOrderStatusValidation,
};