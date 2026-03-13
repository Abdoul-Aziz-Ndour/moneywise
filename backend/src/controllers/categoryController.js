const Category = require('../models/Category');
const Transaction = require('../models/Transaction');

/**
 * @desc    Get all categories for the current user (custom + defaults)
 * @route   GET /api/categories
 * @access  Private
 * @query   type (income | expense | both)
 */
const getCategories = async (req, res, next) => {
  try {
    const { type } = req.query;

    const filter = { user: req.user._id, isActive: true };
    if (type) filter.type = { $in: [type, 'both'] };

    const categories = await Category.find(filter).sort({ isDefault: -1, name: 1 });

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single category
 * @route   GET /api/categories/:id
 * @access  Private
 */
const getCategory = async (req, res, next) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    res.status(200).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new custom category
 * @route   POST /api/categories
 * @access  Private
 */
const createCategory = async (req, res, next) => {
  try {
    const { name, type, icon, color } = req.body;

    // Check for duplicate name for this user
    const existing = await Category.findOne({ name, user: req.user._id });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A category named "${name}" already exists`,
      });
    }

    const category = await Category.create({
      name,
      type: type || 'both',
      icon: icon || '📂',
      color: color || '#6366f1',
      user: req.user._id,
      isDefault: false,
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a category
 * @route   PUT /api/categories/:id
 * @access  Private
 */
const updateCategory = async (req, res, next) => {
  try {
    const { name, type, icon, color } = req.body;

    const category = await Category.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    // Check name uniqueness if changed
    if (name && name !== category.name) {
      const existing = await Category.findOne({ name, user: req.user._id });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `A category named "${name}" already exists`,
        });
      }
    }

    const updated = await Category.findByIdAndUpdate(
      req.params.id,
      { name, type, icon, color },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a category (soft delete if has transactions, hard delete otherwise)
 * @route   DELETE /api/categories/:id
 * @access  Private
 */
const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    // Check if category has transactions
    const transactionCount = await Transaction.countDocuments({
      category: req.params.id,
      user: req.user._id,
    });

    if (transactionCount > 0) {
      // Soft delete: deactivate instead of deleting
      category.isActive = false;
      await category.save();
      return res.status(200).json({
        success: true,
        message: `Category deactivated. It has ${transactionCount} transaction(s) and cannot be permanently deleted.`,
        data: category,
      });
    }

    // Hard delete if no transactions
    await category.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get category stats (how much spent/earned per category)
 * @route   GET /api/categories/stats
 * @access  Private
 * @query   month, year, type
 */
const getCategoryStats = async (req, res, next) => {
  try {
    const { month, year, type } = req.query;

    const matchFilter = { user: req.user._id };
    if (type) matchFilter.type = type;

    if (month && year) {
      matchFilter.date = {
        $gte: new Date(year, month - 1, 1),
        $lte: new Date(year, month, 0, 23, 59, 59),
      };
    } else if (year) {
      matchFilter.date = {
        $gte: new Date(year, 0, 1),
        $lte: new Date(year, 11, 31, 23, 59, 59),
      };
    }

    const stats = await Transaction.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: { category: '$category', type: '$type' },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          avgAmount: { $avg: '$amount' },
          lastTransaction: { $max: '$date' },
        },
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id.category',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: '$category' },
      {
        $project: {
          _id: 0,
          categoryId: '$_id.category',
          type: '$_id.type',
          name: '$category.name',
          icon: '$category.icon',
          color: '$category.color',
          total: 1,
          count: 1,
          avgAmount: { $round: ['$avgAmount', 2] },
          lastTransaction: 1,
        },
      },
      { $sort: { total: -1 } },
    ]);

    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryStats,
};