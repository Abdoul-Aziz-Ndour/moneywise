const app = require('./src/app');

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║       💰 MoneyWise API Server            ║
  ╠══════════════════════════════════════════╣
  ║  Status  : Running                       ║
  ║  Port    : ${PORT}                           ║
  ║  Env     : ${(process.env.NODE_ENV || 'development').padEnd(29)} ║
  ║  Docs    : http://localhost:${PORT}/api      ║
  ║  Health  : http://localhost:${PORT}/health   ║
  ╚══════════════════════════════════════════╝
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! Shutting down...', err.name, err.message);
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! Shutting down...', err.name, err.message);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated.');
    process.exit(0);
  });
});

module.exports = server;