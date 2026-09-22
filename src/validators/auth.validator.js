const {
  body,
} = require("express-validator");

const registerValidation = [
  body("firstName")
    .trim()
    .notEmpty()
    .withMessage(
      "First name is required."
    )
    .isLength({
      max: 50,
    })
    .withMessage(
      "First name is too long."
    ),

  body("lastName")
    .trim()
    .notEmpty()
    .withMessage(
      "Last name is required."
    )
    .isLength({
      max: 50,
    })
    .withMessage(
      "Last name is too long."
    ),

  body("email")
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage(
      "Please provide a valid email address."
    ),

  body("password")
    .isString()
    .isLength({
      min: 8,
      max: 128,
    })
    .withMessage(
      "Password must be between 8 and 128 characters."
    ),
];

const loginValidation = [
  body("email")
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage(
      "Please provide a valid email address."
    ),

  body("password")
    .isString()
    .notEmpty()
    .withMessage(
      "Password is required."
    ),
];

module.exports = {
  registerValidation,
  loginValidation,
};