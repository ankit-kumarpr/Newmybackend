const express = require("express");
const router = express.Router();
const upload = require("../middlewares/uploadCategoryImage");
const categoryController = require("../controllers/categoryController");
const authMiddleware = require("../middlewares/authMiddleware");
const { permit } = require("../middlewares/roleMiddleware");

// Add category (with image)
router.post(
  "/add",
  upload.single("image"),
  authMiddleware,
  permit("super_admin", "admin"),
  categoryController.addCategory
);

// Get all categories
router.get("/allcategory", categoryController.getAllCategories);

// Get single category
router.get("/single/:id", categoryController.getCategory);

// Update category
router.put(
  "/update/:id",
  upload.single("image"),
  authMiddleware,
  permit("super_admin", "admin"),
  categoryController.updateCategory
);

// Delete category
router.delete(
  "/delete/:id",
  authMiddleware,
  permit("super_admin", "admin"),
  categoryController.deleteCategory
);

module.exports = router;
