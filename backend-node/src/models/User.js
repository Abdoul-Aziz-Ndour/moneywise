const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(50), allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
  password: { type: DataTypes.STRING, allowNull: false },
  currency: { type: DataTypes.STRING(10), defaultValue: 'EUR' },
  theme: { type: DataTypes.ENUM('light', 'dark'), defaultValue: 'light' },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  lastLogin: { type: DataTypes.DATE },
  passwordResetToken: { type: DataTypes.STRING },
  passwordResetExpires: { type: DataTypes.DATE },
  budgetAlertsEnabled: { type: DataTypes.BOOLEAN, defaultValue: false },
  budgetAlertsThreshold: { type: DataTypes.FLOAT, defaultValue: 1000 },
}, {
  hooks: {
    beforeCreate: async (user) => {
      user.password = await bcrypt.hash(user.password, 12);
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    },
  },
});

User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

User.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.password;
  delete values.passwordResetToken;
  delete values.passwordResetExpires;
  return values;
};

module.exports = User;