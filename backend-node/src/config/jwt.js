const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const generateAccessToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const generateRefreshToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' });

const verifyAccessToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

const verifyRefreshToken = (token) => jwt.verify(token, process.env.JWT_REFRESH_SECRET);

const generateResetToken = () => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  return { rawToken, hashedToken };
};

module.exports = { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken, generateResetToken };