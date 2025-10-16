const Category = require('../models/Category');
const fs = require('fs');
const path = require('path');

// Add Category
const addCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    // Check duplicate name
    const exists = await Category.findOne({ name });
    if (exists) return res.status(400).json({ success: false, message: 'Category name already exists' });

    let image = null;
    if (req.file) {
      image = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        path: req.file.path
      };
    }

    const category = new Category({ name, description, image });
    await category.save();

    res.json({ success: true, message: 'Category added successfully', category });
  } catch (err) {
    console.error('Add category error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Get all categories
const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    res.json({ success: true, categories });
  } catch (err) {
    console.error('Get categories error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Get single category
const getCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, category });
  } catch (err) {
    console.error('Get category error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Update category
const updateCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

    // Update fields
    if (name) category.name = name;
    if (description) category.description = description;

    // Update image if uploaded
    if (req.file) {
      // Delete old image
      if (category.image && category.image.path && fs.existsSync(category.image.path)) {
        fs.unlinkSync(category.image.path);
      }
      category.image = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        path: req.file.path
      };
    }

    await category.save();
    res.json({ success: true, message: 'Category updated successfully', category });
  } catch (err) {
    console.error('Update category error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Delete category
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

    // Delete image
    if (category.image && category.image.path && fs.existsSync(category.image.path)) {
      fs.unlinkSync(category.image.path);
    }

    await category.remove();
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (err) {
    console.error('Delete category error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

module.exports = {
  addCategory,
  getAllCategories,
  getCategory,
  updateCategory,
  deleteCategory
};
