import express from 'express';
import { router } from './routes';
import { config } from './config';

/**
 * Create and configure Express application
 */
export function createApp(): express.Application {
  const app = express();

  // Middleware configuration
  app.use(express.raw({ type: 'text/plain' })); // For simple webhook test
  app.use(express.raw({ type: 'application/json' })); // For JSON webhook tests  
  app.use(express.json());

  // Routes
  app.use('/', router);

  return app;
}

/**
 * Start the server
 */
export function startServer(app: express.Application): any {
  const server = app.listen(config.port, () => {
    console.log(`DevEx Scorecard Generator Bot running on port ${config.port}`);
    console.log(`Webhook endpoint: http://localhost:${config.port}/webhook`);
  });

  return server;
}

// Create app instance
export const app = createApp();