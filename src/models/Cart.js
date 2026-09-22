const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  {
    _id: false,
  }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    guestCartId: {
      type: String,
    },

    items: {
      type: [cartItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

/*
 * A registered user can have only one cart.
 * The partial filter means guest carts do not participate
 * in this unique index at all.
 */
cartSchema.index(
  { user: 1 },
  {
    unique: true,
    partialFilterExpression: {
      user: {
        $type: "objectId",
      },
    },
  }
);

/*
 * A guest cart ID must also be unique.
 * Only documents that actually have a guestCartId
 * participate in this index.
 */
cartSchema.index(
  { guestCartId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      guestCartId: {
        $type: "string",
      },
    },
  }
);

module.exports = mongoose.model(
  "Cart",
  cartSchema
);