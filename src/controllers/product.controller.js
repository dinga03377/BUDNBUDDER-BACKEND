const Product = require("../models/Product");

// ==========================================
// GET ALL PRODUCTS
// ==========================================

const getProducts = async (req, res) => {
  try {
    const {
      search = "",
      category = "",
      minPrice,
      maxPrice,
      status = "active",
      sort = "newest",
      page = 1,
      limit = 12,
    } = req.query;

    const currentPage = Math.max(Number(page) || 1, 1);
    const perPage = Math.min(Math.max(Number(limit) || 12, 1), 100);

    const query = {};

    // Only active products should appear
    // on the customer-facing shop by default.
    if (status !== "all") {
      query.status = status;
    }

    // Search
    if (search.trim()) {
      query.$or = [
        {
          name: {
            $regex: search.trim(),
            $options: "i",
          },
        },
        {
          description: {
            $regex: search.trim(),
            $options: "i",
          },
        },
        {
          tagLabel: {
            $regex: search.trim(),
            $options: "i",
          },
        },
      ];
    }

    // Category
    if (category.trim()) {
      query.category = category.trim();
    }

    // Price range
    if (minPrice !== undefined || maxPrice !== undefined) {
      query.price = {};

      if (minPrice !== undefined && minPrice !== "") {
        query.price.$gte = Number(minPrice);
      }

      if (maxPrice !== undefined && maxPrice !== "") {
        query.price.$lte = Number(maxPrice);
      }
    }

    // Sorting
    let sortOption = {};

    switch (sort) {
      case "price-low":
        sortOption = { price: 1 };
        break;

      case "price-high":
        sortOption = { price: -1 };
        break;

      case "name-asc":
        sortOption = { name: 1 };
        break;

      case "name-desc":
        sortOption = { name: -1 };
        break;

      case "best-selling":
        sortOption = {
          isBestSeller: -1,
          createdAt: -1,
        };
        break;

      case "featured":
        sortOption = {
          isFeatured: -1,
          createdAt: -1,
        };
        break;

      case "newest":
      default:
        sortOption = { createdAt: -1 };
        break;
    }

    const skip = (currentPage - 1) * perPage;

    const [products, totalProducts] = await Promise.all([
      Product.find(query)
        .populate("category", "name slug")
        .sort(sortOption)
        .skip(skip)
        .limit(perPage),

      Product.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalProducts / perPage);

    return res.status(200).json({
      success: true,
      products,
      pagination: {
        currentPage,
        perPage,
        totalProducts,
        totalPages,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
      },
    });
  } catch (error) {
    console.error("Get products error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve products.",
    });
  }
};

// ==========================================
// GET SINGLE PRODUCT
// ==========================================

const getProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findOne({
      _id: id,
      status: "active",
    }).populate("category", "name slug");

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
    console.error("Get product error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve product.",
    });
  }
};

module.exports = {
  getProducts,
  getProduct,
};