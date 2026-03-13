const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  register,
  login,
  getMe,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  updatePassword,
  updateProfile,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

// ─── Validation Rules ────────────────────────────────────────────────────────

const registerValidation = [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2–50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/\d/)
    .withMessage('Password must contain at least one number'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

const forgotPasswordValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
];

const resetPasswordValidation = [
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/\d/)
    .withMessage('Password must contain at least one number'),
];

const updatePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters')
    .matches(/\d/)
    .withMessage('New password must contain at least one number'),
];

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, example: "Alice Dupont" }
 *               email: { type: string, example: "alice@example.com" }
 *               password: { type: string, example: "SecurePass1" }
 *               currency: { type: string, example: "EUR" }
 *     responses:
 *       201:
 *         description: User created, returns tokens
 *       400:
 *         description: Validation error or email already in use
 */
router.post('/register', registerValidation, handleValidationErrors, register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login a user
 *     tags: [Auth]
 */
router.post('/login', loginValidation, handleValidationErrors, login);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout the current user
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/logout', protect, logout);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get the current logged-in user
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/me', protect, getMe);

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Update user profile (name, currency, theme, alerts)
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 */
router.put('/profile', protect, updateProfile);

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 */
router.post('/refresh-token', refreshToken);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset link by email
 *     tags: [Auth]
 */
router.post('/forgot-password', forgotPasswordValidation, handleValidationErrors, forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password/{token}:
 *   post:
 *     summary: Reset password using token from email
 *     tags: [Auth]
 */
router.post(
  '/reset-password/:token',
  resetPasswordValidation,
  handleValidationErrors,
  resetPassword
);

/**
 * @swagger
 * /api/auth/update-password:
 *   put:
 *     summary: Update password when already logged in
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 */
router.put(
  '/update-password',
  protect,
  updatePasswordValidation,
  handleValidationErrors,
  updatePassword
);

module.exports = router;