const Order = require("../models/Order");
const Transaction = require("../models/Transaction");

const {
  sendOrderStatusUpdate,
} = require("../services/email.service");

// ==========================================
// GET ALL ORDERS
// ==========================================

const getAllOrders = async (req, res) => {
  try {
    const {
      status,
      paymentStatus,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};

    if (status) {
      query.status = status;
    }

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    if (search) {
      query.$or = [
        {
          orderNumber: {
            $regex: search,
            $options: "i",
          },
        },
        {
          "customer.email": {
            $regex: search,
            $options: "i",
          },
        },
        {
          "customer.firstName": {
            $regex: search,
            $options: "i",
          },
        },
        {
          "customer.lastName": {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    const pageNumber = Math.max(
      1,
      Number(page)
    );

    const limitNumber = Math.min(
      100,
      Math.max(1, Number(limit))
    );

    const skip =
      (pageNumber - 1) *
      limitNumber;

    const [
      orders,
      totalOrders,
    ] = await Promise.all([
      Order.find(query)
        .populate(
          "user",
          "firstName lastName email"
        )
        .populate(
          "items.product",
          "name image price"
        )
        .sort({
          placedAt: -1,
        })
        .skip(skip)
        .limit(limitNumber),

      Order.countDocuments(query),
    ]);

    const totalPages =
      Math.ceil(
        totalOrders / limitNumber
      );

    return res.status(200).json({
      success: true,

      orders,

      pagination: {
        page: pageNumber,
        limit: limitNumber,
        totalOrders,
        totalPages,
      },
    });
  } catch (error) {
    console.error(
      "Get admin orders error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve orders.",
    });
  }
};

// ==========================================
// GET SINGLE ORDER
// ==========================================

const getAdminOrder = async (
  req,
  res
) => {
  try {
    const order =
      await Order.findById(
        req.params.id
      )
        .populate(
          "user",
          "firstName lastName email phone"
        )
        .populate(
          "items.product",
          "name image price stock"
        );

    if (!order) {
      return res.status(404).json({
        success: false,
        message:
          "Order not found.",
      });
    }

    const transactions =
      await Transaction.find({
        order: order._id,
      }).sort({
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,

      order,

      transactions,
    });
  } catch (error) {
    console.error(
      "Get admin order error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve order.",
    });
  }
};

// ==========================================
// UPDATE ORDER STATUS
// ==========================================

const updateOrderStatus = async (
  req,
  res
) => {
  try {
    const { status } = req.body;

    const allowedStatuses = [
      "pending",
      "processing",
      "completed",
      "cancelled",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status.",
      });
    }

    const order = await Order.findById(
      req.params.id
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    /*
     * A paid order should not be
     * moved backwards into pending.
     */

    if (
      order.paymentStatus === "paid" &&
      status === "pending"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A paid order cannot be moved back to pending.",
      });
    }

    order.status = status;

    await order.save();

    /*
     * Send the status update email only
     * after the order has been successfully
     * retrieved and saved.
     *
     * Email failure should not cause the
     * order status update to fail.
     */

    if (
      order.customer &&
      order.customer.email
    ) {
      try {
        await sendOrderStatusUpdate({
          email: order.customer.email,
          firstName: order.customer.firstName,
          orderNumber: order.orderNumber,
          status: order.status,
        });
      } catch (emailError) {
        console.error(
          "Order status email failed:",
          emailError
        );
      }
    }

    return res.status(200).json({
      success: true,
      message:
        "Order status updated successfully.",
      order,
    });
  } catch (error) {
    console.error(
      "Update order status error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update order status.",
    });
  }
};

module.exports = {
  getAllOrders,
  getAdminOrder,
  updateOrderStatus,
};