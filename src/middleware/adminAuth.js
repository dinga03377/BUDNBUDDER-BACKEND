const jwt = require("jsonwebtoken");

const Admin = require("../models/Admin");

const protectAdmin = async (req, res, next) => {
  try {
    // Safari/iOS can block the cross-site HTTP-only cookie used by the
    // Vercel frontend -> Render backend setup. Prefer the Bearer token
    // fallback when present, while keeping the cookie path for browsers
    // that accept it.
    const authHeader = req.headers.authorization || "";
    const bearerToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : "";
    const token = bearerToken || req.cookies.adminToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Admin authentication required.",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const admin = await Admin.findById(decoded.adminId);

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Admin account not found.",
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: "Admin account is inactive.",
      });
    }

    req.admin = admin;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired admin authentication.",
    });
  }
};

module.exports = protectAdmin;