const express = require("express");
const multer = require("multer");

const {
  getAdminProducts,
  getAdminProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/adminProduct.controller");

const {
  productIdValidation,
} = require("../validators/product.validator");

const {
  paginationValidation,
} = require("../validators/pagination.validator");

const protectAdmin = require("../middleware/adminAuth");
const validate = require("../middleware/validation");

const { uploadImage } = require("../services/cloudinary.service");

const router = express.Router();

// Multer configuration
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed."));
    }

    cb(null, true);
  },
});

router.use(protectAdmin);

router.post(
  "/upload-image",
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No image uploaded.",
        });
      }

      const result = await uploadImage(req.file);

      return res.status(200).json({
        success: true,
        message: "Image uploaded successfully.",
        image: result.url,
        publicId: result.publicId,
      });
    } catch (error) {
      console.error(
        "Cloudinary upload error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to upload image.",
      });
    }
  }
);

router.get(
  "/",
  paginationValidation,
  validate,
  getAdminProducts
);

router.post(
  "/",
  createProduct
);

router.get(
  "/:id",
  productIdValidation,
  validate,
  getAdminProduct
);

router.patch(
  "/:id",
  productIdValidation,
  validate,
  updateProduct
);

router.delete(
  "/:id",
  productIdValidation,
  validate,
  deleteProduct
);

module.exports = router;