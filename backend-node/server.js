require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`✅ MoneyWise API running on http://localhost:${PORT}`);
  console.log(`📖 Docs: http://localhost:${PORT}/api`);
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err.message);
  server.close(() => process.exit(1));
});