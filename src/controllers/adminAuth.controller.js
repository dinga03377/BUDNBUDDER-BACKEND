const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Admin = require("../models/Admin");

const generateAdminToken = (adminId) => {
  return jwt.sign(
    {
      adminId,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
};

const setAdminCookie = (res, token, remember = false) => {
  res.cookie("adminToken", token, {
    httpOnly: true,

    secure: process.env.NODE_ENV === "production",

    sameSite:
      process.env.NODE_ENV === "production"
        ? "none"
        : "lax",

    maxAge: remember
      ? 30 * 24 * 60 * 60 * 1000
      : 24 * 60 * 60 * 1000,
  });
};

// ==========================================
// ADMIN SIGN UP
// ==========================================

const registerAdmin = async (req, res) => {
  try {

    const adminCount = await Admin.countDocuments();

if (adminCount > 0) {
  return res.status(403).json({
    success: false,
    message: "Admin account setup has already been completed.",
  });
}
    const {
      email,
      password,
      accessCode,
      masterKey,
    } = req.body;

    if (
      !email ||
      !password ||
      !accessCode ||
      !masterKey
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Email, password, access code and master key are required.",
      });
    }

    if (!/^[0-9]{6}$/.test(accessCode)) {
      return res.status(400).json({
        success: false,
        message: "Access code must be exactly 6 digits.",
      });
    }

    if (/\s/.test(masterKey)) {
      return res.status(400).json({
        success: false,
        message:
          "Admin master key cannot contain spaces.",
      });
    }

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    const existingAdmin = await Admin.findOne({
      email: normalizedEmail,
    });

    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message:
          "An admin account with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(
      password,
      12
    );

    const accessCodeMatches =
  accessCode === process.env.ADMIN_ACCESS_CODE;

if (!accessCodeMatches) {
  return res.status(403).json({
    success: false,
    message: "Invalid admin access code.",
  });
}

console.log("MASTER KEY DEBUG:", {
  received: {
    exists: Boolean(masterKey),
    length: masterKey?.length,
    valueStart: masterKey?.slice(0, 3),
    valueEnd: masterKey?.slice(-3)
  },
  env: {
    exists: Boolean(process.env.ADMIN_MASTER_KEY),
    length: process.env.ADMIN_MASTER_KEY?.length,
    valueStart: process.env.ADMIN_MASTER_KEY?.slice(0, 3),
    valueEnd: process.env.ADMIN_MASTER_KEY?.slice(-3)
  }
});

const masterKeyMatches =
  masterKey === process.env.ADMIN_MASTER_KEY;

if (!masterKeyMatches) {
  return res.status(403).json({
    success: false,
    message: "Invalid admin master key.",
  });
}

    const admin = await Admin.create({
  email: normalizedEmail,
  password: hashedPassword,
});

    return res.status(201).json({
      success: true,
      message:
        "Admin account created successfully.",
      admin: {
        id: admin._id,
        email: admin.email,
        isActive: admin.isActive,
      },
    });
  } catch (error) {
    console.error(
      "Admin registration error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to create admin account.",
    });
  }
};

// ==========================================
// ADMIN LOGIN
// ==========================================

const loginAdmin = async (req, res) => {
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

    const admin = await Admin.findOne({
      email: normalizedEmail,
    }).select("+password");

    if (!admin) {
      return res.status(401).json({
        success: false,
        message:
          "Incorrect email or password.",
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message:
          "This admin account is inactive.",
      });
    }

    const passwordMatches =
      await bcrypt.compare(
        password,
        admin.password
      );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message:
          "Incorrect email or password.",
      });
    }

    admin.lastLogin = new Date();

    await admin.save();

    const token = generateAdminToken(
      admin._id
    );

    setAdminCookie(
      res,
      token,
      Boolean(remember)
    );

    return res.status(200).json({
      success: true,
      message:
        "Admin login successful.",
      admin: {
        id: admin._id,
        email: admin.email,
        isActive: admin.isActive,
        lastLogin: admin.lastLogin,
      },
    });
  } catch (error) {
    console.error(
      "Admin login error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to log in as admin.",
    });
  }
};

// ==========================================
// ADMIN LOGOUT
// ==========================================

const logoutAdmin = (req, res) => {
  res.clearCookie("adminToken", {
    httpOnly: true,

    secure: process.env.NODE_ENV === "production",

    sameSite:
      process.env.NODE_ENV === "production"
        ? "none"
        : "lax",
  });

  return res.status(200).json({
    success: true,
    message:
      "Admin logged out successfully.",
  });
};

// ==========================================
// CURRENT ADMIN
// ==========================================

const getAdminMe = async (req, res) => {
  return res.status(200).json({
    success: true,

    admin: {
      id: req.admin._id,
      email: req.admin.email,
      isActive: req.admin.isActive,
      lastLogin: req.admin.lastLogin,
    },
  });
};

module.exports = {
  registerAdmin,
  loginAdmin,
  logoutAdmin,
  getAdminMe,
};