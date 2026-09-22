const crypto = require("crypto");

const GUEST_COOKIE_NAME = "guestId";

const ensureGuestId = (req, res, next) => {
  let guestId = req.cookies[GUEST_COOKIE_NAME];

  if (!guestId) {
    guestId = crypto.randomUUID();

    res.cookie(GUEST_COOKIE_NAME, guestId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }

  req.guestId = guestId;

  next();
};

module.exports = ensureGuestId;