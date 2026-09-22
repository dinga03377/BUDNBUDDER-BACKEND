const Notification =
  require("../models/Notification");

// ==========================================
// GET ADMIN NOTIFICATIONS
// ==========================================

const getAdminNotifications = async (
  req,
  res
) => {
  try {
    const {
      unreadOnly = "false",
      limit = 30,
    } = req.query;

    const query = {
      recipientType: "admin",
    };

    if (unreadOnly === "true") {
      query.isRead = false;
    }

    const notifications =
      await Notification.find(query)
        .populate(
          "order",
          "orderNumber status paymentStatus total"
        )
        .populate(
          "product",
          "name stock"
        )
        .sort({
          createdAt: -1,
        })
        .limit(
          Math.min(
            100,
            Math.max(
              1,
              Number(limit)
            )
          )
        );

    const unreadCount =
      await Notification.countDocuments({
        recipientType: "admin",
        isRead: false,
      });

    return res.status(200).json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error(
      "Get admin notifications error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load notifications.",
    });
  }
};

 // ==========================================
// GET UNREAD COUNT
// ==========================================

const getUnreadNotificationCount =
  async (req, res) => {
    try {
      const unreadCount =
        await Notification.countDocuments({
          recipientType: "admin",
          isRead: false,
        });

      return res.status(200).json({
        success: true,
        unreadCount,
      });
    } catch (error) {
      console.error(
        "Get unread notification count error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to get notification count.",
      });
    }
  };

// ==========================================
// MARK ONE AS READ
// ==========================================

const markNotificationAsRead =
  async (req, res) => {
    try {
      const notification =
        await Notification.findOneAndUpdate(
          {
            _id: req.params.id,
            recipientType: "admin",
          },
          {
            isRead: true,
            readAt: new Date(),
          },
          {
            new: true,
          }
        );

      if (!notification) {
        return res.status(404).json({
          success: false,
          message:
            "Notification not found.",
        });
      }

      return res.status(200).json({
        success: true,
        notification,
      });
    } catch (error) {
      console.error(
        "Mark notification as read error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to update notification.",
      });
    }
  };

// ==========================================
// MARK ALL AS READ
// ==========================================

const markAllNotificationsAsRead =
  async (req, res) => {
    try {
      await Notification.updateMany(
        {
          recipientType: "admin",
          isRead: false,
        },
        {
          $set: {
            isRead: true,
            readAt: new Date(),
          },
        }
      );

      return res.status(200).json({
        success: true,
        message:
          "All notifications marked as read.",
      });
    } catch (error) {
      console.error(
        "Mark all notifications error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to update notifications.",
      });
    }
  };

// ==========================================
// DELETE NOTIFICATION
// ==========================================

const deleteNotification =
  async (req, res) => {
    try {
      const notification =
        await Notification.findOneAndDelete(
          {
            _id: req.params.id,
            recipientType: "admin",
          }
        );

      if (!notification) {
        return res.status(404).json({
          success: false,
          message:
            "Notification not found.",
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "Notification deleted successfully.",
      });
    } catch (error) {
      console.error(
        "Delete notification error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to delete notification.",
      });
    }
  };



module.exports = {
  getAdminNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,

};