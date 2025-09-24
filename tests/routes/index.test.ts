import request from 'supertest';
import express from 'express';
import { router } from '../../src/routes';

// Mock the webhook handler
jest.mock('../../src/handlers/webhook-handler', () => ({
  WebhookHandler: jest.fn().mockImplementation(() => ({
    handleWebhook: jest.fn().mockImplementation((req, res) => {
      return res.status(200).json({ message: 'Mocked webhook processed successfully' });
    })
  }))
}));

describe('Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.raw({ type: 'text/plain' }));
    app.use(express.raw({ type: 'application/json' }));
    app.use(express.json());
    app.use('/', router);
  });

  describe('GET /', () => {
    it('should return bot information', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);
      
      expect(response.body).toEqual({
        name: 'DevEx Scorecard Generator',
        description: 'GitHub Bot for generating Developer Experience Scorecards',
        version: '1.0.0'
      });
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body.status).toBe('OK');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('POST /webhook', () => {
    it('should call webhook handler', async () => {
      const response = await request(app)
        .post('/webhook')
        .send('test-payload')
        .expect(200);
      
      expect(response.body).toEqual({
        message: 'Mocked webhook processed successfully'
      });
    });
  });
});