const Transaction = require('../models/Transaction');
const Category = require('../models/Category');

/**
 * @desc    Get all transactions for current user
 * @route   GET /api/transactions
 * @access  Private
 * @query   type, category, startDate, endDate, month, year, page, limit, sortBy, order
 */
const getTransactions = async (req, res, next) => {
  try {
    const {
      type,
      category,
      startDate,
      endDate,
      month,
      year,
      page = 1,
      limit = 20,
      sortBy = 'date',
      order = 'desc',
      search,
    } = req.query;

    // Build filter
    const filter = { user: req.user._id };

    if (type && ['income', 'expense'].includes(type)) filter.type = type;
    if (category) filter.category = category;

    // Date range filter
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    } else if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      filter.date = { $gte: start, $lte: end };
    } else if (year) {
      filter.date = {
        $gte: new Date(year, 0, 1),
        $lte: new Date(year, 11, 31, 23, 59, 59),
      };
    }

    // Text search on description
    if (search) {
      filter.description = { $regex: search, $options: 'i' };
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === 'asc' ? 1 : -1;

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .populate('category', 'name icon color type')
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(parseInt(limit)),
      Transaction.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: transactions.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single transaction
 * @route   GET /api/transactions/:id
 * @access  Private
 */
const getTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).populate('category', 'name icon color type');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    res.status(200).json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new transaction
 * @route   POST /api/transactions
 * @access  Private
 */
const createTransaction = async (req, res, next) => {
  try {
    const { type, amount, category, description, date, notes, tags, isRecurring, recurringFrequency } = req.body;

    // Verify category belongs to user or is a default category
    const cat = await Category.findOne({
      _id: category,
      $or: [{ user: req.user._id }, { isDefault: true, user: req.user._id }],
    });
    if (!cat) {
      return res.status(400).json({
        success: false,
        message: 'Category not found or does not belong to you',
      });
    }

    const transaction = await Transaction.create({
      user: req.user._id,
      type,
      amount,
      category,
      description,
      date: date || new Date(),
      notes,
      tags,
      isRecurring,
      recurringFrequency,
    });

    const populated = await transaction.populate('category', 'name icon color type');

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a transaction
 * @route   PUT /api/transactions/:id
 * @access  Private
 */
const updateTransaction = async (req, res, next) => {
  try {
    const { type, amount, category, description, date, notes, tags, isRecurring, recurringFrequency } = req.body;

    // Verify transaction belongs to user
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    // Verify new category if provided
    if (category && category !== String(transaction.category)) {
      const cat = await Category.findOne({
        _id: category,
        $or: [{ user: req.user._id }, { isDefault: true, user: req.user._id }],
      });
      if (!cat) {
        return res.status(400).json({
          success: false,
          message: 'Category not found or does not belong to you',
        });
      }
    }

    const updated = await Transaction.findByIdAndUpdate(
      req.params.id,
      { type, amount, category, description, date, notes, tags, isRecurring, recurringFrequency },
      { new: true, runValidators: true }
    ).populate('category', 'name icon color type');

    res.status(200).json({
      success: true,
      message: 'Transaction updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a transaction
 * @route   DELETE /api/transactions/:id
 * @access  Private
 */
const deleteTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Transaction deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get balance summary (total income, expenses, balance)
 * @route   GET /api/transactions/summary
 * @access  Private
 * @query   month, year, startDate, endDate
 */
const getSummary = async (req, res, next) => {
  try {
    const { month, year, startDate, endDate } = req.query;

    const matchFilter = { user: req.user._id };

    if (startDate || endDate) {
      matchFilter.date = {};
      if (startDate) matchFilter.date.$gte = new Date(startDate);
      if (endDate) matchFilter.date.$lte = new Date(endDate);
    } else if (month && year) {
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

    const summary = await Transaction.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const result = {
      income: 0,
      expense: 0,
      balance: 0,
      incomeCount: 0,
      expenseCount: 0,
    };

    summary.forEach(({ _id, total, count }) => {
      if (_id === 'income') {
        result.income = total;
        result.incomeCount = count;
      } else if (_id === 'expense') {
        result.expense = total;
        result.expenseCount = count;
      }
    });

    result.balance = result.income - result.expense;

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get spending by category (for pie chart)
 * @route   GET /api/transactions/by-category
 * @access  Private
 * @query   type, month, year, startDate, endDate
 */
const getByCategory = async (req, res, next) => {
  try {
    const { type = 'expense', month, year, startDate, endDate } = req.query;

    const matchFilter = { user: req.user._id, type };

    if (startDate || endDate) {
      matchFilter.date = {};
      if (startDate) matchFilter.date.$gte = new Date(startDate);
      if (endDate) matchFilter.date.$lte = new Date(endDate);
    } else if (month && year) {
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

    const data = await Transaction.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: '$category' },
      {
        $project: {
          _id: 0,
          categoryId: '$_id',
          name: '$category.name',
          icon: '$category.icon',
          color: '$category.color',
          total: 1,
          count: 1,
        },
      },
    ]);

    // Calculate percentages
    const grandTotal = data.reduce((sum, item) => sum + item.total, 0);
    const dataWithPercent = data.map((item) => ({
      ...item,
      percentage: grandTotal > 0 ? Math.round((item.total / grandTotal) * 100 * 10) / 10 : 0,
    }));

    res.status(200).json({
      success: true,
      total: grandTotal,
      data: dataWithPercent,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get monthly evolution data (for bar/line chart)
 * @route   GET /api/transactions/monthly-evolution
 * @access  Private
 * @query   year (default current year)
 */
const getMonthlyEvolution = async (req, res, next) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const data = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          date: {
            $gte: new Date(year, 0, 1),
            $lte: new Date(year, 11, 31, 23, 59, 59),
          },
        },
      },
      {
        $group: {
          _id: {
            month: { $month: '$date' },
            type: '$type',
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.month': 1 } },
    ]);

    // Build 12-month array
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      monthName: new Date(year, i, 1).toLocaleString('fr-FR', { month: 'short' }),
      income: 0,
      expense: 0,
      balance: 0,
    }));

    data.forEach(({ _id, total }) => {
      const monthData = months[_id.month - 1];
      if (_id.type === 'income') monthData.income = total;
      else if (_id.type === 'expense') monthData.expense = total;
    });

    months.forEach((m) => {
      m.balance = m.income - m.expense;
    });

    res.status(200).json({ success: true, year, data: months });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all transactions for export (no pagination)
 * @route   GET /api/transactions/export
 * @access  Private
 */
const getTransactionsForExport = async (req, res, next) => {
  try {
    const { month, year, type, startDate, endDate } = req.query;
    const filter = { user: req.user._id };

    if (type) filter.type = type;

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    } else if (month && year) {
      filter.date = {
        $gte: new Date(year, month - 1, 1),
        $lte: new Date(year, month, 0, 23, 59, 59),
      };
    } else if (year) {
      filter.date = {
        $gte: new Date(year, 0, 1),
        $lte: new Date(year, 11, 31, 23, 59, 59),
      };
    }

    const transactions = await Transaction.find(filter)
      .populate('category', 'name icon color type')
      .sort({ date: -1 })
      .limit(10000); // Safety cap

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getSummary,
  getByCategory,
  getMonthlyEvolution,
  getTransactionsForExport,
};