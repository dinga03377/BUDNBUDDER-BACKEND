const mongoose = require("mongoose");

const Product = require("../models/Product");
const Category = require("../models/Category");

// ==========================================
// GET ADMIN PRODUCTS
// ==========================================

const getAdminProducts = async (req, res) => {
  try {
    const {
      search = "",
      category = "",
      status = "",
      page = 1,
      limit = 20,
    } = req.query;

    const currentPage = Math.max(
      Number(page) || 1,
      1
    );

    const perPage = Math.min(
      Math.max(Number(limit) || 20, 1),
      100
    );

    const query = {};

    if (search.trim()) {
      query.name = {
        $regex: search.trim(),
        $options: "i",
      };
    }

    if (category.trim()) {
      if (
        mongoose.Types.ObjectId.isValid(category)
      ) {
        query.category = category;
      }
    }

    if (status.trim()) {
      query.status = status;
    }

    const skip =
      (currentPage - 1) * perPage;

    const [
      products,
      totalProducts,
    ] = await Promise.all([
      Product.find(query)
        .populate(
          "category",
          "name slug"
        )
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(perPage),

      Product.countDocuments(query),
    ]);

    const totalPages = Math.ceil(
      totalProducts / perPage
    );

    return res.status(200).json({
      success: true,
      products,
      pagination: {
        currentPage,
        perPage,
        totalProducts,
        totalPages,
        hasNextPage:
          currentPage < totalPages,
        hasPreviousPage:
          currentPage > 1,
      },
    });
  } catch (error) {
    console.error(
      "Get admin products error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve products.",
    });
  }
};

// ==========================================
// GET ONE PRODUCT
// ==========================================

const getAdminProduct = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    const product =
      await Product.findById(id).populate(
        "category",
        "name slug"
      );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    return res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    console.error(
      "Get admin product error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve product.",
    });
  }
};

// ==========================================
// CREATE PRODUCT
// ==========================================

const createProduct = async (
  req,
  res
) => {
  try {
    const {
      name,
      category,
      status,
      price,
      stock,
      image,
      tagType,
      tagLabel,
    } = req.body;

    if (
      !name ||
      !category ||
      price === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, category and price are required.",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        category
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid category.",
      });
    }

    const categoryExists =
      await Category.findOne({
        _id: category,
        isActive: true,
      });

    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message:
          "Selected category does not exist.",
      });
    }

    const numericPrice = Number(price);
    const numericStock =
      Number(stock || 0);

    if (
      Number.isNaN(numericPrice) ||
      numericPrice < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid price.",
      });
    }

    if (
      Number.isNaN(numericStock) ||
      numericStock < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid stock.",
      });
    }

    const product =
      await Product.create({
        name: name.trim(),
        category,
        status:
          status === "inactive"
            ? "inactive"
            : "active",
        price: numericPrice,
        stock: numericStock,
        image: image || "",
        tagType: tagType || "",
        tagLabel: tagLabel || "",
      });

    await product.populate(
      "category",
      "name slug"
    );

    return res.status(201).json({
      success: true,
      message:
        "Product created successfully.",
      product,
    });
  } catch (error) {
    console.error(
      "Create product error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to create product.",
    });
  }
};

// ==========================================
// UPDATE PRODUCT
// ==========================================

const updateProduct = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    const product =
      await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    const {
      name,
      category,
      status,
      price,
      stock,
      image,
      tagType,
      tagLabel,
    } = req.body;

    if (name !== undefined) {
      product.name =
        name.trim();
    }

    if (category !== undefined) {
      if (
        !mongoose.Types.ObjectId.isValid(
          category
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid category.",
        });
      }

      const categoryExists =
        await Category.findOne({
          _id: category,
          isActive: true,
        });

      if (!categoryExists) {
        return res.status(400).json({
          success: false,
          message:
            "Selected category does not exist.",
        });
      }

      product.category = category;
    }

    if (status !== undefined) {
      if (
        !["active", "inactive"].includes(
          status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid product status.",
        });
      }

      product.status = status;
    }

    if (price !== undefined) {
      const numericPrice =
        Number(price);

      if (
        Number.isNaN(numericPrice) ||
        numericPrice < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid price.",
        });
      }

      product.price =
        numericPrice;
    }

    if (stock !== undefined) {
      const numericStock =
        Number(stock);

      if (
        Number.isNaN(numericStock) ||
        numericStock < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid stock.",
        });
      }

      product.stock =
        numericStock;
    }

    if (image !== undefined) {
      product.image = image;
    }

    if (tagType !== undefined) {
      product.tagType =
        tagType;
    }

    if (tagLabel !== undefined) {
      product.tagLabel =
        tagLabel;
    }

    await product.save();

    await product.populate(
      "category",
      "name slug"
    );

    return res.status(200).json({
      success: true,
      message:
        "Product updated successfully.",
      product,
    });
  } catch (error) {
    console.error(
      "Update product error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update product.",
    });
  }
};

// ==========================================
// DELETE PRODUCT
// ==========================================

const deleteProduct = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    const product =
      await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    await product.deleteOne();

    return res.status(200).json({
      success: true,
      message:
        "Product deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Delete product error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to delete product.",
    });
  }
};

module.exports = {
  getAdminProducts,
  getAdminProduct,
  createProduct,
  updateProduct,
  deleteProduct,
};