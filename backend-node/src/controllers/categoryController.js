const { Category, Transaction } = require('../models/index');

// @route GET /api/categories
const getCategories = async (req, res, next) => {
  try {
    const { type } = req.query;
    const where = { userId: req.user.id, isActive: true };
    if (type) where.type = [type, 'both'];

    const categories = await Category.findAll({ where, order: [['name', 'ASC']] });
    res.status(200).json({ success: true, count: categories.length, data: categories });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/categories/:id
const getCategory = async (req, res, next) => {
  try {
    const category = await Category.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!category) return res.status(404).json({ success: false, message: 'Catégorie introuvable' });
    res.status(200).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/categories
const createCategory = async (req, res, next) => {
  try {
    const { name, type, icon, color } = req.body;

    const existing = await Category.findOne({ where: { name, userId: req.user.id } });
    if (existing) return res.status(400).json({ success: false, message: `Catégorie "${name}" existe déjà` });

    const category = await Category.create({
      name, type: type || 'both', icon: icon || '📂', color: color || '#6366f1',
      userId: req.user.id, isDefault: false,
    });

    res.status(201).json({ success: true, message: 'Catégorie créée', data: category });
  } catch (error) {
    next(error);
  }
};

// @route PUT /api/categories/:id
const updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!category) return res.status(404).json({ success: false, message: 'Catégorie introuvable' });

    const { name, type, icon, color } = req.body;
    if (name && name !== category.name) {
      const existing = await Category.findOne({ where: { name, userId: req.user.id } });
      if (existing) return res.status(400).json({ success: false, message: `Catégorie "${name}" existe déjà` });
    }

    await category.update({ name, type, icon, color });
    res.status(200).json({ success: true, message: 'Catégorie mise à jour', data: category });
  } catch (error) {
    next(error);
  }
};

// @route DELETE /api/categories/:id
const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!category) return res.status(404).json({ success: false, message: 'Catégorie introuvable' });

    const count = await Transaction.count({ where: { categoryId: req.params.id } });
    if (count > 0) {
      await category.update({ isActive: false });
      return res.status(200).json({ success: true, message: `Catégorie désactivée (${count} transaction(s) liée(s))` });
    }

    await category.destroy();
    res.status(200).json({ success: true, message: 'Catégorie supprimée' });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/categories/stats
const getCategoryStats = async (req, res, next) => {
  try {
    const { sequelize } = require('../config/database');
    const { QueryTypes } = require('sequelize');
    const { month, year, type } = req.query;

    let dateFilter = '';
    const replacements = { userId: req.user.id };

    if (month && year) {
      dateFilter = `AND t.date >= :start AND t.date <= :end`;
      replacements.start = new Date(year, month - 1, 1);
      replacements.end = new Date(year, month, 0, 23, 59, 59);
    } else if (year) {
      dateFilter = `AND t.date >= :start AND t.date <= :end`;
      replacements.start = new Date(year, 0, 1);
      replacements.end = new Date(year, 11, 31, 23, 59, 59);
    }

    const typeFilter = type ? `AND t.type = :type` : '';
    if (type) replacements.type = type;

    const stats = await sequelize.query(`
      SELECT c.id, c.name, c.icon, c.color, t.type,
             SUM(t.amount) as total, COUNT(t.id) as count,
             AVG(t.amount) as avgAmount
      FROM "Transactions" t
      JOIN "Categories" c ON t."categoryId" = c.id
      WHERE t."userId" = :userId ${dateFilter} ${typeFilter}
      GROUP BY c.id, c.name, c.icon, c.color, t.type
      ORDER BY total DESC
    `, { replacements, type: QueryTypes.SELECT });

    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

module.exports = { getCategories, getCategory, createCategory, updateCategory, deleteCategory, getCategoryStats };