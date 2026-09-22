const jwt = require("jsonwebtoken");

const User = require("../models/User");

const optionalAuth = async (
  req,
  res,
  next
) => {
  req.user = null;

  try {
    const token =
      req.cookies.token;

    if (!token) {
      return next();
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

    if (user && user.isActive) {
      req.user = user;
    }

    next();
  } catch (error) {
    // Invalid authentication does not
    // prevent guest access.
    req.user = null;

    next();
  }
};

module.exports = optionalAuth;