const {
  body,
  param,
} = require("express-validator");

const addToCartValidation = [
  body("productId")
    .isMongoId()
    .withMessage(
      "A valid product ID is required."
    ),

  body("quantity")
    .isInt({
      min: 1,
      max: 100,
    })
    .withMessage(
      "Quantity must be between 1 and 100."
    ),
];

const updateCartValidation = [
  param("productId")
    .isMongoId()
    .withMessage(
      "A valid product ID is required."
    ),

  body("quantity")
    .isInt({
      min: 1,
      max: 100,
    })
    .withMessage(
      "Quantity must be between 1 and 100."
    ),
];

module.exports = {
  addToCartValidation,
  updateCartValidation,
};