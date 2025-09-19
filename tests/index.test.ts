// Mock the dependencies before requiring the app
jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    rest: {
      issues: {
        create: jest.fn(),
        update: jest.fn(),
        createComment: jest.fn(),
      },
      apps: {
        listReposAccessibleToInstallation: jest.fn(),
      },
    },
  })),
}));

import request from 'supertest';
import { app, server } from '../src/index';

describe('DevEx Scorecard Generator Bot', () => {
  afterAll((done) => {
    server.close(done);
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
    });
  });

  describe('POST /webhook', () => {
    it('should handle webhook requests', async () => {
      const response = await request(app)
        .post('/webhook')
        .send({})
        .expect(200);
      
      expect(response.body.message).toBe('Webhook processed successfully');
    });
  });
});