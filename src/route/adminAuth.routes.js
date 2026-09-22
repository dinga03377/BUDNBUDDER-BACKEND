const express = require("express");

const {
  registerAdmin,
  loginAdmin,
  logoutAdmin,
  getAdminMe,
} = require("../controllers/adminAuth.controller");

const protectAdmin = require("../middleware/adminAuth");

const router = express.Router();

// Admin account creation
router.post("/register", registerAdmin);

// Login
router.post("/login", loginAdmin);

// Logout
router.post("/logout", logoutAdmin);

// Current admin
router.get("/me", protectAdmin, getAdminMe);

module.exports = router;