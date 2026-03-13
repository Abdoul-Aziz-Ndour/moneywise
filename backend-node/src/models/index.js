const User = require('./User');
const Category = require('./category');
const Transaction = require('./transaction');

// Associations
User.hasMany(Category, { foreignKey: 'userId', as: 'categories' });
Category.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Transaction, { foreignKey: 'userId', as: 'transactions' });
Transaction.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Category.hasMany(Transaction, { foreignKey: 'categoryId', as: 'transactions' });
Transaction.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

module.exports = { User, Category, Transaction };