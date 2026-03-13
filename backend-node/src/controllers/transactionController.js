const { Transaction, Category } = require('../models/index');
const { sequelize } = require('../config/database');
const { QueryTypes, Op } = require('sequelize');

// @route GET /api/transactions
const getTransactions = async (req, res, next) => {
  try {
    const { type, categoryId, month, year, startDate, endDate, page = 1, limit = 20, search } = req.query;

    const where = { userId: req.user.id };
    if (type) where.type = type;
    if (categoryId) where.categoryId = categoryId;
    if (search) where.description = { [Op.iLike]: `%${search}%` };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date[Op.gte] = new Date(startDate);
      if (endDate) where.date[Op.lte] = new Date(endDate);
    } else if (month && year) {
      where.date = {
        [Op.gte]: new Date(year, month - 1, 1),
        [Op.lte]: new Date(year, month, 0, 23, 59, 59),
      };
    } else if (year) {
      where.date = {
        [Op.gte]: new Date(year, 0, 1),
        [Op.lte]: new Date(year, 11, 31, 23, 59, 59),
      };
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Transaction.findAndCountAll({
      where,
      include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'] }],
      order: [['date', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    res.status(200).json({
      success: true,
      count: rows.length,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / parseInt(limit)),
      data: rows,
    });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/transactions/:id
const getTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      where: { id: req.params.id, userId: req.user.id },
      include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'] }],
    });
    if (!transaction) return res.status(404).json({ success: false, message: 'Transaction introuvable' });
    res.status(200).json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/transactions
const createTransaction = async (req, res, next) => {
  try {
    const { type, amount, categoryId, description, date, notes, tags } = req.body;

    const category = await Category.findOne({ where: { id: categoryId, userId: req.user.id } });
    if (!category) return res.status(400).json({ success: false, message: 'Catégorie introuvable' });

    const transaction = await Transaction.create({
      type, amount, categoryId, description, date: date || new Date(), notes, tags,
      userId: req.user.id,
    });

    const populated = await Transaction.findByPk(transaction.id, {
      include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'] }],
    });

    res.status(201).json({ success: true, message: 'Transaction créée', data: populated });
  } catch (error) {
    next(error);
  }
};

// @route PUT /api/transactions/:id
const updateTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!transaction) return res.status(404).json({ success: false, message: 'Transaction introuvable' });

    const { type, amount, categoryId, description, date, notes, tags } = req.body;
    await transaction.update({ type, amount, categoryId, description, date, notes, tags });

    const updated = await Transaction.findByPk(transaction.id, {
      include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'] }],
    });

    res.status(200).json({ success: true, message: 'Transaction mise à jour', data: updated });
  } catch (error) {
    next(error);
  }
};

// @route DELETE /api/transactions/:id
const deleteTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!transaction) return res.status(404).json({ success: false, message: 'Transaction introuvable' });

    await transaction.destroy();
    res.status(200).json({ success: true, message: 'Transaction supprimée' });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/transactions/summary
const getSummary = async (req, res, next) => {
  try {
    const { month, year, startDate, endDate } = req.query;
    let dateFilter = '';
    const replacements = { userId: req.user.id };

    if (startDate || endDate) {
      if (startDate) { dateFilter += ` AND date >= :start`; replacements.start = new Date(startDate); }
      if (endDate) { dateFilter += ` AND date <= :end`; replacements.end = new Date(endDate); }
    } else if (month && year) {
      dateFilter = ` AND date >= :start AND date <= :end`;
      replacements.start = new Date(year, month - 1, 1);
      replacements.end = new Date(year, month, 0, 23, 59, 59);
    } else if (year) {
      dateFilter = ` AND date >= :start AND date <= :end`;
      replacements.start = new Date(year, 0, 1);
      replacements.end = new Date(year, 11, 31, 23, 59, 59);
    }

    const rows = await sequelize.query(`
      SELECT type, SUM(amount) as total, COUNT(*) as count
      FROM "Transactions"
      WHERE "userId" = :userId ${dateFilter}
      GROUP BY type
    `, { replacements, type: QueryTypes.SELECT });

    const result = { income: 0, expense: 0, balance: 0, incomeCount: 0, expenseCount: 0 };
    rows.forEach(({ type, total, count }) => {
      if (type === 'income') { result.income = parseFloat(total); result.incomeCount = parseInt(count); }
      if (type === 'expense') { result.expense = parseFloat(total); result.expenseCount = parseInt(count); }
    });
    result.balance = result.income - result.expense;

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/transactions/by-category
const getByCategory = async (req, res, next) => {
  try {
    const { type = 'expense', month, year } = req.query;
    const replacements = { userId: req.user.id, type };
    let dateFilter = '';

    if (month && year) {
      dateFilter = `AND t.date >= :start AND t.date <= :end`;
      replacements.start = new Date(year, month - 1, 1);
      replacements.end = new Date(year, month, 0, 23, 59, 59);
    } else if (year) {
      dateFilter = `AND t.date >= :start AND t.date <= :end`;
      replacements.start = new Date(year, 0, 1);
      replacements.end = new Date(year, 11, 31, 23, 59, 59);
    }

    const data = await sequelize.query(`
      SELECT c.id as "categoryId", c.name, c.icon, c.color,
             SUM(t.amount) as total, COUNT(t.id) as count
      FROM "Transactions" t
      JOIN "Categories" c ON t."categoryId" = c.id
      WHERE t."userId" = :userId AND t.type = :type ${dateFilter}
      GROUP BY c.id, c.name, c.icon, c.color
      ORDER BY total DESC
    `, { replacements, type: QueryTypes.SELECT });

    const grandTotal = data.reduce((sum, i) => sum + parseFloat(i.total), 0);
    const result = data.map(i => ({
      ...i,
      total: parseFloat(i.total),
      percentage: grandTotal > 0 ? Math.round((parseFloat(i.total) / grandTotal) * 1000) / 10 : 0,
    }));

    res.status(200).json({ success: true, total: grandTotal, data: result });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/transactions/monthly-evolution
const getMonthlyEvolution = async (req, res, next) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const rows = await sequelize.query(`
      SELECT EXTRACT(MONTH FROM date) as month, type, SUM(amount) as total
      FROM "Transactions"
      WHERE "userId" = :userId
        AND date >= :start AND date <= :end
      GROUP BY EXTRACT(MONTH FROM date), type
      ORDER BY month
    `, {
      replacements: { userId: req.user.id, start: new Date(year, 0, 1), end: new Date(year, 11, 31) },
      type: QueryTypes.SELECT,
    });

    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      monthName: new Date(year, i, 1).toLocaleString('fr-FR', { month: 'short' }),
      income: 0, expense: 0, balance: 0,
    }));

    rows.forEach(({ month, type, total }) => {
      const m = months[parseInt(month) - 1];
      if (type === 'income') m.income = parseFloat(total);
      if (type === 'expense') m.expense = parseFloat(total);
    });

    months.forEach(m => { m.balance = m.income - m.expense; });

    res.status(200).json({ success: true, year, data: months });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/transactions/export
const getTransactionsForExport = async (req, res, next) => {
  try {
    const { month, year, type } = req.query;
    const where = { userId: req.user.id };
    if (type) where.type = type;
    if (month && year) {
      where.date = {
        [Op.gte]: new Date(year, month - 1, 1),
        [Op.lte]: new Date(year, month, 0, 23, 59, 59),
      };
    }

    const transactions = await Transaction.findAll({
      where,
      include: [{ model: Category, as: 'category', attributes: ['name', 'icon'] }],
      order: [['date', 'DESC']],
    });

    res.status(200).json({ success: true, count: transactions.length, data: transactions });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTransactions, getTransaction, createTransaction, updateTransaction,
  deleteTransaction, getSummary, getByCategory, getMonthlyEvolution, getTransactionsForExport,
};