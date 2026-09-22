const express = require("express");

const {
  sendResetCode,
  verifyResetCode,
  resetPassword,
} = require("../controllers/adminPassword.controller");

const router = express.Router();

router.post(
  "/send-code",
  sendResetCode
);

router.post(
  "/verify-code",
  verifyResetCode
);

router.post(
  "/reset",
  resetPassword
);

module.exports = router;