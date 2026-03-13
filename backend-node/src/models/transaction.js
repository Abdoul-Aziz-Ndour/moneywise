const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Transaction = sequelize.define('Transaction', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  type: { type: DataTypes.ENUM('income', 'expense'), allowNull: false },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0.01 } },
  description: { type: DataTypes.STRING(200), defaultValue: '' },
  date: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  notes: { type: DataTypes.STRING(500) },
  tags: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
  userId: { type: DataTypes.UUID, allowNull: false },
  categoryId: { type: DataTypes.UUID, allowNull: false },
});

module.exports = Transaction;