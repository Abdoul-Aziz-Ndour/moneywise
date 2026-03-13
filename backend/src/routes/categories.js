const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryStats,
} = require('../controllers/categoryController');
const { protect } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

// All category routes require authentication
router.use(protect);

// ─── Validation Rules ────────────────────────────────────────────────────────

const categoryValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Category name must be 1–50 characters'),
  body('type')
    .optional()
    .isIn(['income', 'expense', 'both'])
    .withMessage('Type must be "income", "expense", or "both"'),
  body('icon').optional().isString().withMessage('Icon must be a string'),
  body('color')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Color must be a valid hex color (e.g. #FF5733)'),
];

const updateCategoryValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Category name must be 1–50 characters'),
  body('type')
    .optional()
    .isIn(['income', 'expense', 'both'])
    .withMessage('Type must be "income", "expense", or "both"'),
  body('icon').optional().isString(),
  body('color')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Color must be a valid hex color'),
];

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/categories/stats:
 *   get:
 *     summary: Get aggregated stats per category (total, count, avg)
 *     tags: [Categories]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: type, schema: { type: string, enum: [income, expense] } }
 *       - { in: query, name: month, schema: { type: integer } }
 *       - { in: query, name: year, schema: { type: integer } }
 */
router.get('/stats', getCategoryStats);

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all categories for the current user
 *     tags: [Categories]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [income, expense, both] }
 *         description: Filter by category type
 */
router.get('/', getCategories);

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create a new custom category
 *     tags: [Categories]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, example: "Voyages" }
 *               type: { type: string, enum: [income, expense, both], example: "expense" }
 *               icon: { type: string, example: "✈️" }
 *               color: { type: string, example: "#3b82f6" }
 */
router.post('/', categoryValidation, handleValidationErrors, createCategory);

/**
 * @swagger
 * /api/categories/{id}:
 *   get:
 *     summary: Get a single category by ID
 *     tags: [Categories]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/:id', getCategory);

/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     summary: Update a category
 *     tags: [Categories]
 *     security: [{ bearerAuth: [] }]
 */
router.put('/:id', updateCategoryValidation, handleValidationErrors, updateCategory);

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Delete a category (soft delete if has transactions)
 *     tags: [Categories]
 *     security: [{ bearerAuth: [] }]
 */
router.delete('/:id', deleteCategory);

module.exports = router;