process.on('unhandledRejection', (reason) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  console.error(`[process] Unhandled promise rejection: ${message}`);
});

process.on('uncaughtException', (error) => {
  console.error(`[process] Uncaught exception: ${error.message}`);
  process.exit(1);
});

import app from './src/app.js';
import env from './src/config/env.js';
import connectDB from './src/config/db.js';
import { initQdrant } from './src/services/vector-db.service.js';

const startServer = async () => {
  try {
    await connectDB();
  } catch (error) {
    console.error(`[db] ${error.message}`);
    process.exitCode = 1;
    return;
  }

  app.listen(env.port, () => {
    console.log(`[server] Mentriv 2.0 backend running on http://localhost:${env.port}`);
  });

  initQdrant()
    .then(() => console.log('[startup] Qdrant client ready'))
    .catch((error) => console.warn(`[startup] Qdrant warmup failed (will retry on first request): ${error.message}`));
};

startServer();
