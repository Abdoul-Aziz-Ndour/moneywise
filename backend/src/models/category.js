const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      minlength: [1, 'Category name must be at least 1 character'],
      maxlength: [50, 'Category name cannot exceed 50 characters'],
    },
    type: {
      type: String,
      required: [true, 'Category type is required'],
      enum: ['income', 'expense', 'both'],
      default: 'both',
    },
    icon: {
      type: String,
      default: '💰',
    },
    color: {
      type: String,
      default: '#6366f1',
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please enter a valid hex color'],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null = default system category
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index: unique name per user (or for system defaults)
categorySchema.index({ name: 1, user: 1 }, { unique: true });

// Default categories to seed per new user
categorySchema.statics.DEFAULT_CATEGORIES = [
  // Expense categories
  { name: 'Alimentation', type: 'expense', icon: '🛒', color: '#f59e0b' },
  { name: 'Loyer', type: 'expense', icon: '🏠', color: '#ef4444' },
  { name: 'Transport', type: 'expense', icon: '🚗', color: '#3b82f6' },
  { name: 'Santé', type: 'expense', icon: '💊', color: '#10b981' },
  { name: 'Loisirs', type: 'expense', icon: '🎉', color: '#8b5cf6' },
  { name: 'Vêtements', type: 'expense', icon: '👗', color: '#ec4899' },
  { name: 'Éducation', type: 'expense', icon: '📚', color: '#06b6d4' },
  { name: 'Abonnements', type: 'expense', icon: '📱', color: '#f97316' },
  { name: 'Restaurants', type: 'expense', icon: '🍽️', color: '#84cc16' },
  { name: 'Autre dépense', type: 'expense', icon: '💸', color: '#6b7280' },
  // Income categories
  { name: 'Salaire', type: 'income', icon: '💼', color: '#22c55e' },
  { name: 'Freelance', type: 'income', icon: '💻', color: '#14b8a6' },
  { name: 'Investissements', type: 'income', icon: '📈', color: '#a855f7' },
  { name: 'Cadeau', type: 'income', icon: '🎁', color: '#f43f5e' },
  { name: 'Autre revenu', type: 'income', icon: '💵', color: '#64748b' },
];

module.exports = mongoose.model('Category', categorySchema);