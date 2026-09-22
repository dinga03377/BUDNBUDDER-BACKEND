const Category = require("../models/Category");

// ==========================================
// GET CATEGORIES
// ==========================================

const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({
      isActive: true,
    }).sort({
      name: 1,
    });

    return res.status(200).json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error("Get categories error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve categories.",
    });
  }
};

// ==========================================
// GET SINGLE CATEGORY
// ==========================================

const getCategory = async (req, res) => {
  try {
    const { slug } = req.params;

    const category = await Category.findOne({
      slug: slug.toLowerCase(),
      isActive: true,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }

    return res.status(200).json({
      success: true,
      category,
    });
  } catch (error) {
    console.error("Get category error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve category.",
    });
  }
};

module.exports = {
  getCategories,
  getCategory,
};