const mongoose = require("mongoose");

const Category = require("../models/Category");
const Product = require("../models/Product");

const slugify = require("../utils/slugify");

// ==========================================
// GET CATEGORIES
// ==========================================

const getAdminCategories = async (
  req,
  res
) => {
  try {
    const categories =
      await Category.find()
        .sort({
          name: 1,
        });

    return res.status(200).json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error(
      "Get admin categories error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve categories.",
    });
  }
};

// ==========================================
// CREATE CATEGORY
// ==========================================

const createCategory = async (
  req,
  res
) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message:
          "Category name is required.",
      });
    }

    const cleanName =
      name.trim();

    const slug =
      slugify(cleanName);

    const existing =
      await Category.findOne({
        $or: [
          {
            name: {
              $regex: `^${cleanName}$`,
              $options: "i",
            },
          },
          {
            slug,
          },
        ],
      });

    if (existing) {
      return res.status(409).json({
        success: false,
        message:
          "Category already exists.",
      });
    }

    const category =
      await Category.create({
        name: cleanName,
        slug,
      });

    return res.status(201).json({
      success: true,
      message:
        "Category created successfully.",
      category,
    });
  } catch (error) {
    console.error(
      "Create category error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to create category.",
    });
  }
};

// ==========================================
// UPDATE CATEGORY
// ==========================================

const updateCategory = async (
  req,
  res
) => {
  try {
    const { id } = req.params;
    const { name, isActive } =
      req.body;

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid category ID.",
      });
    }

    const category =
      await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message:
          "Category not found.",
      });
    }

    if (
      name !== undefined &&
      name.trim()
    ) {
      const cleanName =
        name.trim();

      const slug =
        slugify(cleanName);

      const duplicate =
        await Category.findOne({
          _id: {
            $ne: id,
          },
          $or: [
            {
              name: {
                $regex: `^${cleanName}$`,
                $options: "i",
              },
            },
            {
              slug,
            },
          ],
        });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message:
            "Another category with this name already exists.",
        });
      }

      category.name =
        cleanName;

      category.slug =
        slug;
    }

    if (
      isActive !== undefined
    ) {
      category.isActive =
        Boolean(isActive);
    }

    await category.save();

    return res.status(200).json({
      success: true,
      message:
        "Category updated successfully.",
      category,
    });
  } catch (error) {
    console.error(
      "Update category error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update category.",
    });
  }
};

// ==========================================
// DELETE CATEGORY
// ==========================================

const deleteCategory = async (
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
        message:
          "Invalid category ID.",
      });
    }

    const category =
      await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message:
          "Category not found.",
      });
    }

    const productCount =
      await Product.countDocuments({
        category: id,
      });

    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message:
          "This category cannot be deleted because products are using it. Move or delete those products first.",
      });
    }

    await category.deleteOne();

    return res.status(200).json({
      success: true,
      message:
        "Category deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Delete category error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to delete category.",
    });
  }
};

module.exports = {
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};