const express = require("express");

const {
  getAdminNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} = require(
  "../controllers/notification.controller"
);

const adminAuth = require(
  "../middleware/adminAuth"
);

const router = express.Router();

router.use(adminAuth);

router.get(
  "/",
  getAdminNotifications
);

router.get(
  "/unread-count",
  getUnreadNotificationCount
);

router.patch(
  "/read-all",
  markAllNotificationsAsRead
);

router.patch(
  "/:id/read",
  markNotificationAsRead
);

router.delete(
  "/:id",
  deleteNotification
);

module.exports = router;