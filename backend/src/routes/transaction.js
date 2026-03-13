const express = require('express');
const { body, query } = require('express-validator');
const router = express.Router();

const {
  getTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getSummary,
  getByCategory,
  getMonthlyEvolution,
  getTransactionsForExport,
} = require('../controllers/transactionController');
const { protect } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

// All transaction routes require authentication
router.use(protect);

// ─── Validation Rules ────────────────────────────────────────────────────────

const transactionValidation = [
  body('type').isIn(['income', 'expense']).withMessage('Type must be "income" or "expense"'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number greater than 0'),
  body('category').isMongoId().withMessage('Invalid category ID'),
  body('description')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
  body('date').optional().isISO8601().withMessage('Date must be a valid ISO 8601 date'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
];

const updateValidation = [
  body('type').optional().isIn(['income', 'expense']).withMessage('Type must be "income" or "expense"'),
  body('amount').optional().isFloat({ min: 0.01 }).withMessage('Amount must be positive'),
  body('category').optional().isMongoId().withMessage('Invalid category ID'),
  body('description').optional().isLength({ max: 200 }),
  body('date').optional().isISO8601(),
];

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/transactions/summary:
 *   get:
 *     summary: Get income/expense/balance summary
 *     tags: [Transactions]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: month
 *         schema: { type: integer, minimum: 1, maximum: 12 }
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 */
router.get('/summary', getSummary);

/**
 * @swagger
 * /api/transactions/by-category:
 *   get:
 *     summary: Get spending breakdown by category (for pie chart)
 *     tags: [Transactions]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/by-category', getByCategory);

/**
 * @swagger
 * /api/transactions/monthly-evolution:
 *   get:
 *     summary: Get monthly income vs expense evolution for a year (for bar/line chart)
 *     tags: [Transactions]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *         description: Defaults to current year
 */
router.get('/monthly-evolution', getMonthlyEvolution);

/**
 * @swagger
 * /api/transactions/export:
 *   get:
 *     summary: Get all transactions for export (no pagination)
 *     tags: [Transactions]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/export', getTransactionsForExport);

/**
 * @swagger
 * /api/transactions:
 *   get:
 *     summary: Get paginated list of transactions with filters
 *     tags: [Transactions]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: type, schema: { type: string, enum: [income, expense] } }
 *       - { in: query, name: category, schema: { type: string } }
 *       - { in: query, name: month, schema: { type: integer } }
 *       - { in: query, name: year, schema: { type: integer } }
 *       - { in: query, name: startDate, schema: { type: string, format: date } }
 *       - { in: query, name: endDate, schema: { type: string, format: date } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20 } }
 *       - { in: query, name: sortBy, schema: { type: string, default: date } }
 *       - { in: query, name: order, schema: { type: string, enum: [asc, desc], default: desc } }
 */
router.get('/', getTransactions);

/**
 * @swagger
 * /api/transactions:
 *   post:
 *     summary: Create a new transaction
 *     tags: [Transactions]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, amount, category]
 *             properties:
 *               type: { type: string, enum: [income, expense] }
 *               amount: { type: number, example: 150.00 }
 *               category: { type: string, description: "Category ID" }
 *               description: { type: string, example: "Courses au supermarché" }
 *               date: { type: string, format: date-time }
 *               notes: { type: string }
 *               tags: { type: array, items: { type: string } }
 */
router.post('/', transactionValidation, handleValidationErrors, createTransaction);

/**
 * @swagger
 * /api/transactions/{id}:
 *   get:
 *     summary: Get a single transaction by ID
 *     tags: [Transactions]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/:id', getTransaction);

/**
 * @swagger
 * /api/transactions/{id}:
 *   put:
 *     summary: Update a transaction
 *     tags: [Transactions]
 *     security: [{ bearerAuth: [] }]
 */
router.put('/:id', updateValidation, handleValidationErrors, updateTransaction);

/**
 * @swagger
 * /api/transactions/{id}:
 *   delete:
 *     summary: Delete a transaction
 *     tags: [Transactions]
 *     security: [{ bearerAuth: [] }]
 */
router.delete('/:id', deleteTransaction);

module.exports = router;