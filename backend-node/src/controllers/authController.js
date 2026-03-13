const crypto = require('crypto');
const { User, Category } = require('../models/index');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken, generateResetToken } = require('../config/jwt');

const sendTokenResponse = (user, statusCode, res) => {
  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);
  return res.status(statusCode).json({
    success: true,
    accessToken,
    refreshToken,
    user,
  });
};

// @desc    Register
// @route   POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password, currency } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email déjà utilisé' });
    }

    const user = await User.create({ name, email, password, currency });

    // Seed catégories par défaut
    const defaults = Category.DEFAULT_CATEGORIES.map(cat => ({
      ...cat,
      userId: user.id,
      isDefault: true,
    }));
    await Category.bulkCreate(defaults, { ignoreDuplicates: true });

    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Login
// @route   POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });
    }

    user.lastLogin = new Date();
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout
// @route   POST /api/auth/logout
const logout = async (req, res) => {
  res.status(200).json({ success: true, message: 'Déconnecté avec succès' });
};

// @desc    Refresh token
// @route   POST /api/auth/refresh-token
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Refresh token requis' });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch {
      return res.status(401).json({ success: false, message: 'Token invalide ou expiré' });
    }

    const user = await User.findByPk(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Utilisateur introuvable' });
    }

    res.status(200).json({
      success: true,
      accessToken: generateAccessToken(user.id),
      refreshToken: generateRefreshToken(user.id),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(200).json({ success: true, message: 'Si cet email existe, un lien a été envoyé.' });
    }

    const { rawToken, hashedToken } = generateResetToken();
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${rawToken}`;
    console.log(`[DEV] Reset URL: ${resetUrl}`);

    res.status(200).json({
      success: true,
      message: 'Si cet email existe, un lien a été envoyé.',
      ...(process.env.NODE_ENV === 'development' && { resetUrl }),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password/:token
const resetPassword = async (req, res, next) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      where: {
        passwordResetToken: hashedToken,
      },
    });

    if (!user || user.passwordResetExpires < new Date()) {
      return res.status(400).json({ success: false, message: 'Token invalide ou expiré' });
    }

    user.password = req.body.password;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Update password
// @route   PUT /api/auth/update-password
const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id);

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Mot de passe actuel incorrect' });
    }

    user.password = newPassword;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Update profile
// @route   PUT /api/auth/profile
const updateProfile = async (req, res, next) => {
  try {
    const { name, currency, theme, budgetAlertsEnabled, budgetAlertsThreshold } = req.body;

    const user = await User.findByPk(req.user.id);
    await user.update({ name, currency, theme, budgetAlertsEnabled, budgetAlertsThreshold });

    res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe, logout, refreshToken, forgotPassword, resetPassword, updatePassword, updateProfile };