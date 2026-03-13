const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Category = sequelize.define('Category', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(50), allowNull: false },
  type: { type: DataTypes.ENUM('income', 'expense', 'both'), defaultValue: 'both' },
  icon: { type: DataTypes.STRING(10), defaultValue: '📂' },
  color: { type: DataTypes.STRING(7), defaultValue: '#6366f1' },
  isDefault: { type: DataTypes.BOOLEAN, defaultValue: false },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  userId: { type: DataTypes.UUID, allowNull: true },
});

Category.DEFAULT_CATEGORIES = [
  { name: 'Alimentation', type: 'expense', icon: '🛒', color: '#f59e0b' },
  { name: 'Loyer', type: 'expense', icon: '🏠', color: '#ef4444' },
  { name: 'Transport', type: 'expense', icon: '🚗', color: '#3b82f6' },
  { name: 'Santé', type: 'expense', icon: '💊', color: '#10b981' },
  { name: 'Loisirs', type: 'expense', icon: '🎉', color: '#8b5cf6' },
  { name: 'Vêtements', type: 'expense', icon: '👗', color: '#ec4899' },
  { name: 'Restaurants', type: 'expense', icon: '🍽️', color: '#84cc16' },
  { name: 'Abonnements', type: 'expense', icon: '📱', color: '#f97316' },
  { name: 'Autre dépense', type: 'expense', icon: '💸', color: '#6b7280' },
  { name: 'Salaire', type: 'income', icon: '💼', color: '#22c55e' },
  { name: 'Freelance', type: 'income', icon: '💻', color: '#14b8a6' },
  { name: 'Investissements', type: 'income', icon: '📈', color: '#a855f7' },
  { name: 'Autre revenu', type: 'income', icon: '💵', color: '#64748b' },
];

module.exports = Category;