const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const User = require("../models/User");

const {
  sendCustomerResetCode,
} = require("../services/email.service");

const createToken = (userId) => {
  return jwt.sign(
    {
      userId,
    },
    process.env.JWT_SECRET,
    {
      expiresIn:
        process.env.JWT_EXPIRES_IN || "7d",
    }
  );
};

const setAuthCookie = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,

    secure:
      process.env.NODE_ENV === "production",

    sameSite:
      process.env.NODE_ENV === "production"
        ? "none"
        : "lax",

    maxAge:
      7 * 24 * 60 * 60 * 1000,
  });
};

// ==========================================
// REGISTER
// ==========================================

const register = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
    } = req.body;

    if (
      !firstName ||
      !lastName ||
      !email ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "First name, last name, email and password are required.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters.",
      });
    }

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    const existingUser =
      await User.findOne({
        email: normalizedEmail,
      });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "An account with this email already exists.",
      });
    }

    const hashedPassword =
      await bcrypt.hash(password, 12);

    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      phone: phone
        ? phone.trim()
        : "",
      password: hashedPassword,
    });

    const token = createToken(
      user._id
    );

    setAuthCookie(res, token);

    return res.status(201).json({
      success: true,
      message:
        "Account created successfully.",
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error(
      "Register error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to create account.",
    });
  }
};

// ==========================================
// LOGIN
// ==========================================

const login = async (req, res) => {
  try {
    const {
      email,
      password,
      remember = false,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Email and password are required.",
      });
    }

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    const user =
      await User.findOne({
        email: normalizedEmail,
      }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Incorrect email or password.",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message:
          "This account is inactive.",
      });
    }

    const passwordMatches =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message:
          "Incorrect email or password.",
      });
    }

    user.lastLogin = new Date();

    await user.save();

    const token = createToken(
      user._id
    );

    res.cookie("token", token, {
      httpOnly: true,

      secure:
        process.env.NODE_ENV ===
        "production",

      sameSite:
        process.env.NODE_ENV ===
        "production"
          ? "none"
          : "lax",

      maxAge: remember
        ? 30 * 24 * 60 * 60 * 1000
        : 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to log in.",
    });
  }
};

// ==========================================
// LOGOUT
// ==========================================

const logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,

    secure:
      process.env.NODE_ENV ===
      "production",

    sameSite:
      process.env.NODE_ENV ===
      "production"
        ? "none"
        : "lax",
  });

  return res.status(200).json({
    success: true,
    message:
      "Logged out successfully.",
  });
};

// ==========================================
// CURRENT USER
// ==========================================

const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      email: req.user.email,
      phone: req.user.phone,
      emailVerified:
        req.user.emailVerified,
    },
  });
};

const updateProfile = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phone,
    } = req.body;

    if (
      firstName !== undefined &&
      !firstName.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "First name cannot be empty.",
      });
    }

    if (
      lastName !== undefined &&
      !lastName.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Last name cannot be empty.",
      });
    }

    if (firstName !== undefined) {
      req.user.firstName =
        firstName.trim();
    }

    if (lastName !== undefined) {
      req.user.lastName =
        lastName.trim();
    }

    if (phone !== undefined) {
      req.user.phone =
        phone.trim();
    }

    await req.user.save();

    return res.status(200).json({
      success: true,
      message:
        "Profile updated successfully.",
      user: {
        id: req.user._id,
        firstName:
          req.user.firstName,
        lastName:
          req.user.lastName,
        email:
          req.user.email,
        phone:
          req.user.phone,
        emailVerified:
          req.user.emailVerified,
      },
    });
  } catch (error) {
    console.error(
      "Update profile error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update profile.",
    });
  }
};

const changePassword = async (
  req,
  res
) => {
  try {
    const {
      currentPassword,
      newPassword,
    } = req.body;

    if (
      !currentPassword ||
      !newPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Current password and new password are required.",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message:
          "New password must be at least 8 characters.",
      });
    }

    const user =
      await User.findById(
        req.user._id
      ).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User account not found.",
      });
    }

    const matches =
      await bcrypt.compare(
        currentPassword,
        user.password
      );

    if (!matches) {
      return res.status(401).json({
        success: false,
        message:
          "Current password is incorrect.",
      });
    }

    const samePassword =
      await bcrypt.compare(
        newPassword,
        user.password
      );

    if (samePassword) {
      return res.status(400).json({
        success: false,
        message:
          "New password must be different from your current password.",
      });
    }

    user.password =
      await bcrypt.hash(
        newPassword,
        12
      );

    await user.save();

    return res.status(200).json({
      success: true,
      message:
        "Password changed successfully.",
    });
  } catch (error) {
    console.error(
      "Change password error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to change password.",
    });
  }
};

const sendPasswordResetCode = async (
  req,
  res
) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message:
          "Email address is required.",
      });
    }

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    const user =
      await User.findOne({
        email: normalizedEmail,
      });

    /*
     * Don't reveal whether an email
     * belongs to an account.
     */
    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          "If an account exists for that email, a verification code has been sent.",
      });
    }

    const code = crypto
      .randomInt(100000, 1000000)
      .toString();

    const codeHash = crypto
      .createHash("sha256")
      .update(code)
      .digest("hex");

    user.passwordResetTokenHash =
      codeHash;

    user.passwordResetExpiresAt =
      new Date(
        Date.now() +
          10 * 60 * 1000
      );

    await user.save();

    await sendCustomerResetCode(
      normalizedEmail,
      code
    );

    return res.status(200).json({
      success: true,
      message:
        "If an account exists for that email, a verification code has been sent.",
    });
  } catch (error) {
    console.error(
      "Send customer reset code error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to process password reset request.",
    });
  }
};

const verifyPasswordResetCode = async (
  req,
  res
) => {
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

    const user =
      await User.findOne({
        email: normalizedEmail,
      }).select(
        "+passwordResetTokenHash +passwordResetExpiresAt"
      );

    if (!user) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid or expired verification code.",
      });
    }

    if (
      !user.passwordResetTokenHash ||
      !user.passwordResetExpiresAt ||
      user.passwordResetExpiresAt <
        new Date()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid or expired verification code.",
      });
    }

    const codeHash = crypto
      .createHash("sha256")
      .update(code.trim())
      .digest("hex");

    if (
      codeHash !==
      user.passwordResetTokenHash
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid verification code.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Verification code confirmed.",
    });
  } catch (error) {
    console.error(
      "Verify reset code error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to verify verification code.",
    });
  }
};

const resetPassword = async (
  req,
  res
) => {
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
          "Email, verification code and new password are required.",
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

    const user =
      await User.findOne({
        email: normalizedEmail,
      }).select(
        "+password +passwordResetTokenHash +passwordResetExpiresAt"
      );

    if (!user) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid or expired verification code.",
      });
    }

    if (
      !user.passwordResetTokenHash ||
      !user.passwordResetExpiresAt ||
      user.passwordResetExpiresAt <
        new Date()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid or expired verification code.",
      });
    }

    const codeHash = crypto
      .createHash("sha256")
      .update(code.trim())
      .digest("hex");

    if (
      codeHash !==
      user.passwordResetTokenHash
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid verification code.",
      });
    }

    const hashedPassword =
      await bcrypt.hash(
        newPassword,
        12
      );

    user.password =
      hashedPassword;

    user.passwordResetTokenHash =
      null;

    user.passwordResetExpiresAt =
      null;

    await user.save();

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
  register,
  login,
  logout,
  getMe,
  updateProfile,
  changePassword,
  sendPasswordResetCode,
  verifyPasswordResetCode,
  resetPassword,

};