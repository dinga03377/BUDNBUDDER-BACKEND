const Transaction = require("../models/Transaction");

// ==========================================
// GET ALL TRANSACTIONS
// ==========================================

const getAllTransactions = async (req, res) => {
  try {
    const {
      status,
      type,
      method,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};

    if (status) {
      query.status = status;
    }

    if (type) {
      query.type = type;
    }

    if (method) {
      query.method = method;
    }

    if (search) {
      query.$or = [
        {
          transactionId: {
            $regex: search,
            $options: "i",
          },
        },
        {
          providerReference: {
            $regex: search,
            $options: "i",
          },
        },
        {
          title: {
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
      transactions,
      totalTransactions,
    ] = await Promise.all([
      Transaction.find(query)
        .populate(
          "user",
          "firstName lastName email"
        )
        .populate(
          "order",
          "orderNumber total status paymentStatus"
        )
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limitNumber),

      Transaction.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,

      transactions,

      pagination: {
        page: pageNumber,
        limit: limitNumber,
        totalTransactions,
        totalPages: Math.ceil(
          totalTransactions /
            limitNumber
        ),
      },
    });
  } catch (error) {
    console.error(
      "Get admin transactions error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve transactions.",
    });
  }
};

// ==========================================
// GET SINGLE TRANSACTION
// ==========================================

const getTransaction = async (
  req,
  res
) => {
  try {
    const transaction =
      await Transaction.findById(
        req.params.id
      )
        .populate(
          "user",
          "firstName lastName email phone"
        )
        .populate(
          "order",
          "orderNumber customer items subtotal tax shipping total currency status paymentStatus placedAt"
        );

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message:
          "Transaction not found.",
      });
    }

    return res.status(200).json({
      success: true,
      transaction,
    });
  } catch (error) {
    console.error(
      "Get transaction error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve transaction.",
    });
  }
};

// ==========================================
// DELETE TRANSACTION
// ==========================================
const deleteTransaction = async (req, res) => {
  try {
    const identifier = String(req.params.id || "").trim();

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: "Transaction ID is required.",
      });
    }

    // The admin frontend uses transactionId values such as:
    // TXN-100003
    //
    // MongoDB also has its own _id:
    // 6a99a3dcfe556f171c90ab74
    //
    // Support BOTH identifiers.

    let transaction = null;

    // First try the human-readable transactionId.
    transaction = await Transaction.findOne({
      transactionId: identifier,
    });

    // If not found and the value looks like a MongoDB ObjectId,
    // try MongoDB _id as a fallback.
    if (!transaction && /^[0-9a-fA-F]{24}$/.test(identifier)) {
      transaction = await Transaction.findById(identifier);
    }

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found.",
      });
    }

    await Transaction.deleteOne({
      _id: transaction._id,
    });

    return res.status(200).json({
      success: true,
      message: "Transaction deleted successfully.",
      transactionId: transaction.transactionId,
    });
  } catch (error) {
    console.error(
      "Delete transaction error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to delete transaction.",
    });
  }
};

module.exports = {
  getAllTransactions,
  getTransaction,
  deleteTransaction,
};