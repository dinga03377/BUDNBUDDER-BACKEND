const crypto = require("crypto");

const Cart = require("../models/Cart");
const Product = require("../models/Product");

const GUEST_CART_COOKIE = "guestCartId";

const createGuestCartId = () => {
  return crypto.randomUUID();
};

const getGuestCartId = (req, res) => {
  let guestCartId = req.cookies[GUEST_CART_COOKIE];

  if (!guestCartId) {
    guestCartId = createGuestCartId();

    res.cookie(
      GUEST_CART_COOKIE,
      guestCartId,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV === "production",
        sameSite:
          process.env.NODE_ENV === "production"
            ? "none"
            : "lax",
        maxAge:
          30 * 24 * 60 * 60 * 1000,
      }
    );
  }

  return guestCartId;
};

const getCartOwner = (req, res) => {
  if (req.user) {
    return {
      user: req.user._id,
    };
  }

  return {
    guestCartId: getGuestCartId(
      req,
      res
    ),
  };
};

// ==========================================
// GET CART
// ==========================================

const getCart = async (req, res) => {
  try {
    const owner = getCartOwner(
      req,
      res
    );

    let cart = await Cart.findOne(
      owner
    ).populate({
      path: "items.product",
      select:
        "name price image stock status category tagType tagLabel",
      populate: {
        path: "category",
        select: "name slug",
      },
    });

    if (!cart) {
      cart = await Cart.create(owner);

      await cart.populate({
        path: "items.product",
        select:
          "name price image stock status category tagType tagLabel",
      });
    }

    return res.status(200).json({
      success: true,
      cart,
    });
  } catch (error) {
    console.error(
      "Get cart error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve cart.",
    });
  }
};

// ==========================================
// ADD ITEM
// ==========================================

const addItem = async (req, res) => {
  try {
    const {
      productId,
      quantity = 1,
    } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message:
          "Product ID is required.",
      });
    }

    const numericQuantity =
      Number(quantity);

    if (
      !Number.isInteger(
        numericQuantity
      ) ||
      numericQuantity < 1
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Quantity must be a positive whole number.",
      });
    }

    const product =
      await Product.findById(
        productId
      );

    if (!product) {
      return res.status(404).json({
        success: false,
        message:
          "Product not found.",
      });
    }

    if (product.status !== "active") {
      return res.status(400).json({
        success: false,
        message:
          "This product is currently unavailable.",
      });
    }

    if (product.stock < numericQuantity) {
      return res.status(400).json({
        success: false,
        message:
          "Requested quantity is unavailable.",
      });
    }

    const owner = getCartOwner(
      req,
      res
    );

    let cart = await Cart.findOne(
      owner
    );

    if (!cart) {
      cart = await Cart.create(owner);
    }

    const existingItem =
      cart.items.find(
        (item) =>
          item.product.toString() ===
          productId.toString()
      );

    if (existingItem) {
      const newQuantity =
        existingItem.quantity +
        numericQuantity;

      if (
        newQuantity >
        product.stock
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Requested quantity exceeds available stock.",
        });
      }

      existingItem.quantity =
        newQuantity;
    } else {
      cart.items.push({
        product: productId,
        quantity:
          numericQuantity,
      });
    }

    await cart.save();

    await cart.populate({
      path: "items.product",
      select:
        "name price image stock status category tagType tagLabel",
    });

    return res.status(200).json({
      success: true,
      message:
        "Item added to cart.",
      cart,
    });
  } catch (error) {
    console.error(
      "Add cart item error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to add item to cart.",
    });
  }
};

// ==========================================
// UPDATE QUANTITY
// ==========================================

const updateItem = async (
  req,
  res
) => {
  try {
    const {
      productId,
    } = req.params;

    const {
      quantity,
    } = req.body;

    const numericQuantity =
      Number(quantity);

    if (
      !Number.isInteger(
        numericQuantity
      ) ||
      numericQuantity < 1
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Quantity must be a positive whole number.",
      });
    }

    const product =
      await Product.findById(
        productId
      );

    if (!product) {
      return res.status(404).json({
        success: false,
        message:
          "Product not found.",
      });
    }

    if (
      numericQuantity >
      product.stock
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Requested quantity exceeds available stock.",
      });
    }

    const owner = getCartOwner(
      req,
      res
    );

    const cart =
      await Cart.findOne(owner);

    if (!cart) {
      return res.status(404).json({
        success: false,
        message:
          "Cart not found.",
      });
    }

    const item =
      cart.items.find(
        (cartItem) =>
          cartItem.product.toString() ===
          productId.toString()
      );

    if (!item) {
      return res.status(404).json({
        success: false,
        message:
          "Product is not in the cart.",
      });
    }

    item.quantity =
      numericQuantity;

    await cart.save();

    await cart.populate({
      path: "items.product",
      select:
        "name price image stock status category tagType tagLabel",
    });

    return res.status(200).json({
      success: true,
      message:
        "Cart updated successfully.",
      cart,
    });
  } catch (error) {
    console.error(
      "Update cart item error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update cart.",
    });
  }
};

// ==========================================
// REMOVE ITEM
// ==========================================

const removeItem = async (
  req,
  res
) => {
  try {
    const {
      productId,
    } = req.params;

    const owner = getCartOwner(
      req,
      res
    );

    const cart =
      await Cart.findOne(owner);

    if (!cart) {
      return res.status(404).json({
        success: false,
        message:
          "Cart not found.",
      });
    }

    cart.items =
      cart.items.filter(
        (item) =>
          item.product.toString() !==
          productId.toString()
      );

    await cart.save();

    await cart.populate({
      path: "items.product",
      select:
        "name price image stock status category tagType tagLabel",
    });

    return res.status(200).json({
      success: true,
      message:
        "Item removed from cart.",
      cart,
    });
  } catch (error) {
    console.error(
      "Remove cart item error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to remove item.",
    });
  }
};

// ==========================================
// CLEAR CART
// ==========================================

const clearCart = async (
  req,
  res
) => {
  try {
    const owner = getCartOwner(
      req,
      res
    );

    const cart =
      await Cart.findOne(owner);

    if (cart) {
      cart.items = [];

      await cart.save();
    }

    return res.status(200).json({
      success: true,
      message:
        "Cart cleared successfully.",
    });
  } catch (error) {
    console.error(
      "Clear cart error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to clear cart.",
    });
  }
};

// ==========================================
// MERGE GUEST CART INTO USER CART
// ==========================================

const mergeGuestCart = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const guestCartId =
      req.cookies[GUEST_CART_COOKIE];

    if (!guestCartId) {
      return res.status(200).json({
        success: true,
        message: "No guest cart to merge.",
      });
    }

    const guestCart =
      await Cart.findOne({
        guestCartId,
      });

    if (!guestCart || guestCart.items.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No guest cart to merge.",
      });
    }

    let userCart =
      await Cart.findOne({
        user: req.user._id,
      });

    if (!userCart) {
      userCart = await Cart.create({
        user: req.user._id,
        items: [],
      });
    }

    for (const guestItem of guestCart.items) {
      const product =
        await Product.findById(
          guestItem.product
        );

      if (!product) {
        continue;
      }

      if (product.status !== "active") {
        continue;
      }

      const existingItem =
        userCart.items.find(
          (item) =>
            item.product.toString() ===
            guestItem.product.toString()
        );

      if (existingItem) {
        const combinedQuantity =
          existingItem.quantity +
          guestItem.quantity;

        existingItem.quantity =
          Math.min(
            combinedQuantity,
            product.stock
          );
      } else {
        userCart.items.push({
          product:
            guestItem.product,
          quantity:
            Math.min(
              guestItem.quantity,
              product.stock
            ),
        });
      }
    }

    await userCart.save();

    await Cart.deleteOne({
      _id: guestCart._id,
    });

    res.clearCookie(
      GUEST_CART_COOKIE
    );

    await userCart.populate({
      path: "items.product",
      select:
        "name price image stock status category tagType tagLabel",
    });

    return res.status(200).json({
      success: true,
      message:
        "Guest cart merged successfully.",
      cart: userCart,
    });
  } catch (error) {
    console.error(
      "Merge guest cart error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to merge guest cart.",
    });
  }
};

module.exports = {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  mergeGuestCart,
};