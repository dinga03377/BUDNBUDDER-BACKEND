const express = require("express");

const {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  changePassword,
  sendPasswordResetCode,
  verifyPasswordResetCode,
  resetPassword,
} = require("../controllers/auth.controller");

const {
  registerValidation,
  loginValidation,
} = require(
  "../validators/auth.validator"
);

const validate = require(
  "../middleware/validation"
);

const protect = require("../middleware/auth");

const router = express.Router();

router.post(
  "/register",
  registerValidation,
  validate,
  register
);

router.post(
  "/login",
  loginValidation,
  validate,
  login
);

router.post("/logout", logout);

router.post(
  "/forgot-password/send-code",
  sendPasswordResetCode
);

router.post(
  "/forgot-password/verify-code",
  verifyPasswordResetCode
);

router.post(
  "/forgot-password/reset",
  resetPassword
);

router.get("/me", protect, getMe);

router.patch( "/profile", protect, updateProfile);

router.patch("/change-password", protect, changePassword);

module.exports = router;