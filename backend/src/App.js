require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { connectDB } = require('./config/database');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const authRoutes = require('./routes/Auth');
const transactionRoutes = require('./routes/transactions');
const categoryRoutes = require('./routes/categories');

connectDB();

const app = express();

app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Trop de requêtes, réessayez plus tard.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Trop de tentatives, réessayez dans 15 minutes.' },
});

app.use('/api', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'OK',
    message: 'MoneyWise API is running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);

app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'MoneyWise REST API v1.0',
    endpoints: {
      auth: {
        'POST /api/auth/register': 'Inscription',
        'POST /api/auth/login': 'Connexion',
        'POST /api/auth/logout': 'Déconnexion',
        'GET /api/auth/me': 'Utilisateur courant',
        'PUT /api/auth/profile': 'Modifier profil',
        'POST /api/auth/refresh-token': 'Rafraîchir token',
        'POST /api/auth/forgot-password': 'Mot de passe oublié',
        'POST /api/auth/reset-password/:token': 'Réinitialiser mot de passe',
        'PUT /api/auth/update-password': 'Changer mot de passe',
      },
      transactions: {
        'GET /api/transactions': 'Liste des transactions',
        'POST /api/transactions': 'Créer une transaction',
        'GET /api/transactions/:id': 'Voir une transaction',
        'PUT /api/transactions/:id': 'Modifier une transaction',
        'DELETE /api/transactions/:id': 'Supprimer une transaction',
        'GET /api/transactions/summary': 'Résumé solde',
        'GET /api/transactions/by-category': 'Dépenses par catégorie',
        'GET /api/transactions/monthly-evolution': 'Évolution mensuelle',
        'GET /api/transactions/export': 'Export données',
      },
      categories: {
        'GET /api/categories': 'Liste catégories',
        'POST /api/categories': 'Créer catégorie',
        'GET /api/categories/:id': 'Voir catégorie',
        'PUT /api/categories/:id': 'Modifier catégorie',
        'DELETE /api/categories/:id': 'Supprimer catégorie',
        'GET /api/categories/stats': 'Stats catégories',
      },
    },
  });
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;