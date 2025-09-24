import { Router, Request, Response } from 'express';
import { BotInfo, HealthStatus } from '../types';
import { WebhookHandler } from '../handlers/webhook-handler';

const router = Router();
const webhookHandler = new WebhookHandler();

/**
 * Root endpoint - Bot information
 */
router.get('/', (req: Request, res: Response) => {
  const botInfo: BotInfo = {
    name: 'DevEx Scorecard Generator',
    description: 'GitHub Bot for generating Developer Experience Scorecards',
    version: '1.0.0'
  };
  res.json(botInfo);
});

/**
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  const healthStatus: HealthStatus = {
    status: 'OK',
    timestamp: new Date().toISOString()
  };
  res.status(200).json(healthStatus);
});

/**
 * Webhook endpoint
 */
router.post('/webhook', async (req: Request, res: Response) => {
  return await webhookHandler.handleWebhook(req, res);
});

export { router };