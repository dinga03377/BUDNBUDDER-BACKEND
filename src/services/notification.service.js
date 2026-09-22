const Notification =
  require("../models/Notification");

// ==========================================
// CREATE NOTIFICATION
// ==========================================

const createNotification = async ({
  recipientType,
  recipient = null,
  type,
  title,
  message,
  order = null,
  transaction = null,
  product = null,
}) => {
  return Notification.create({
    recipientType,
    recipient,
    type,
    title,
    message,
    order,
    transaction,
    product,
  });
};

// ==========================================
// ADMIN NOTIFICATION
// ==========================================

const createAdminNotification = async ({
  type,
  title,
  message,
  order = null,
  transaction = null,
  product = null,
}) => {
  return createNotification({
    recipientType: "admin",
    type,
    title,
    message,
    order,
    transaction,
    product,
  });
};

// ==========================================
// USER NOTIFICATION
// ==========================================

const createUserNotification = async ({
  userId,
  type,
  title,
  message,
  order = null,
  transaction = null,
  product = null,
}) => {
  return createNotification({
    recipientType: "user",
    recipient: userId,
    type,
    title,
    message,
    order,
    transaction,
    product,
  });
};

module.exports = {
  createNotification,
  createAdminNotification,
  createUserNotification,
};