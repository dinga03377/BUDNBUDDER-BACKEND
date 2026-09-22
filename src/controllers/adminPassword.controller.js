const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const Admin = require("../models/Admin");
const {
  sendAdminResetCode,
} = require("../services/email.service");

const hashCode = (code) => {
  return crypto
    .createHash("sha256")
    .update(code)
    .digest("hex");
};

// ==========================================
// SEND RESET CODE
// ==========================================

const sendResetCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    const admin = await Admin.findOne({
      email: normalizedEmail,
    }).select(
      "+resetCodeHash +resetCodeExpiresAt"
    );

    // Don't reveal whether an admin exists.
    if (!admin) {
      return res.status(200).json({
        success: true,
        message:
          "If an admin account exists with that email, a verification code has been sent.",
      });
    }

    const code = crypto
      .randomInt(100000, 1000000)
      .toString();

    const codeHash = hashCode(code);

    admin.resetCodeHash = codeHash;
    admin.resetCodeExpiresAt =
      new Date(Date.now() + 10 * 60 * 1000);
    admin.resetCodeVerified = false;

    await admin.save();

    await sendAdminResetCode(
      normalizedEmail,
      code
    );

    return res.status(200).json({
      success: true,
      message:
        "Verification code sent.",
    });
  } catch (error) {
    console.error(
      "Send reset code error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to send verification code.",
    });
  }
};

// ==========================================
// VERIFY RESET CODE
// ==========================================

const verifyResetCode = async (req, res) => {
  try {
    const {
      email,
      code,
    } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message:
          "Email and verification code are required.",
      });
    }

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    const admin = await Admin.findOne({
      email: normalizedEmail,
    }).select(
      "+resetCodeHash +resetCodeExpiresAt"
    );

    if (
      !admin ||
      !admin.resetCodeHash ||
      !admin.resetCodeExpiresAt
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid or expired verification code.",
      });
    }

    if (
      admin.resetCodeExpiresAt.getTime() <
      Date.now()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Verification code has expired.",
      });
    }

    const submittedHash = hashCode(code);

    if (
      submittedHash !== admin.resetCodeHash
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid verification code.",
      });
    }

    admin.resetCodeVerified = true;

    await admin.save();

    return res.status(200).json({
      success: true,
      message:
        "Verification code accepted.",
    });
  } catch (error) {
    console.error(
      "Verify reset code error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to verify code.",
    });
  }
};

// ==========================================
// RESET PASSWORD
// ==========================================

const resetPassword = async (req, res) => {
  try {
    const {
      email,
      code,
      newPassword,
    } = req.body;

    if (
      !email ||
      !code ||
      !newPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Email, code and new password are required.",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters.",
      });
    }

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    const admin = await Admin.findOne({
      email: normalizedEmail,
    }).select(
      "+password +resetCodeHash +resetCodeExpiresAt +resetCodeVerified"
    );

    if (
      !admin ||
      !admin.resetCodeHash ||
      !admin.resetCodeExpiresAt ||
      !admin.resetCodeVerified
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Password reset authorization is invalid.",
      });
    }

    if (
      admin.resetCodeExpiresAt.getTime() <
      Date.now()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Verification code has expired.",
      });
    }

    const submittedHash = hashCode(code);

    if (
      submittedHash !== admin.resetCodeHash
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid verification code.",
      });
    }

    admin.password =
      await bcrypt.hash(
        newPassword,
        12
      );

    admin.resetCodeHash = null;
    admin.resetCodeExpiresAt = null;
    admin.resetCodeVerified = false;

    await admin.save();

    return res.status(200).json({
      success: true,
      message:
        "Password reset successfully.",
    });
  } catch (error) {
    console.error(
      "Reset password error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to reset password.",
    });
  }
};

module.exports = {
  sendResetCode,
  verifyResetCode,
  resetPassword,
};