const jwt = require("jsonwebtoken");

const User = require("../models/User");

const protect = async (
  req,
  res,
  next
) => {
  try {
    const token =
      req.cookies.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required.",
      });
    }

    const decoded =
      jwt.verify(
        token,
        process.env.JWT_SECRET
      );

    const user =
      await User.findById(
        decoded.userId
      );

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "User account no longer exists.",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message:
          "This account is inactive.",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message:
        "Invalid or expired authentication.",
    });
  }
};

module.exports = protect;