// Mock the dependencies before requiring the app
jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    rest: {
      issues: {
        create: jest.fn(),
        update: jest.fn(),
        createComment: jest.fn(),
        listForRepo: jest.fn(),
      },
      apps: {
        listReposAccessibleToInstallation: jest.fn(),
      },
    },
  })),
}));

jest.mock('@octokit/auth-app', () => ({
  createAppAuth: jest.fn(),
}));

jest.mock('fs', () => ({
  readFileSync: jest.fn().mockReturnValue('mocked-private-key'),
}));

import request from 'supertest';
import { createApp, startServer } from '../src/server';

describe('DevEx Scorecard Generator Bot', () => {
  const app = createApp();
  let server: any;

  beforeAll(() => {
    server = startServer(app);
  });

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
    it('should reject requests without signature', async () => {
      const response = await request(app)
        .post('/webhook')
        .send({})
        .expect(401);
      
      expect(response.body.error).toBe('Unauthorized: Missing signature');
    });

    it('should reject requests with invalid signature', async () => {
      const response = await request(app)
        .post('/webhook')
        .set('x-hub-signature-256', 'sha256=invalid')
        .set('x-github-event', 'ping')
        .send({})
        .expect(401);
      
      expect(response.body.error).toBe('Unauthorized: Invalid signature');
    });

    it('should handle webhook requests with valid signature', async () => {
      // Using test values from GitHub docs:
      // secret: "It's a Secret to Everybody"
      // payload: "Hello, World!"  
      // expected signature: sha256=757107ea0eb2509fc211221cce984b8a37570b6d7586c22c46f4379c8b043e17
      const payload = 'Hello, World!';
      const validSignature = 'sha256=757107ea0eb2509fc211221cce984b8a37570b6d7586c22c46f4379c8b043e17';
      
      const response = await request(app)
        .post('/webhook')
        .set('x-hub-signature-256', validSignature)
        .set('x-github-event', 'ping')
        .set('x-github-delivery', 'test-delivery-id')
        .set('Content-Type', 'text/plain')
        .send(payload)
        .expect(200);
      
      expect(response.body.message).toBe('Webhook processed successfully');
    });

    it('should handle webhook requests without webhook secret configured in production', async () => {
      // This test needs to mock the WebhookVerifierService to throw the config error
      const { WebhookVerifierService } = require('../src/services/webhook-verifier');
      const originalValidate = WebhookVerifierService.prototype.validateProductionConfig;
      
      // Mock the validation to throw the expected error
      WebhookVerifierService.prototype.validateProductionConfig = jest.fn(() => {
        throw new Error('WEBHOOK_SECRET environment variable is not set');
      });
      
      const response = await request(app)
        .post('/webhook')
        .send({})
        .expect(500);
      
      expect(response.body.error).toBe('Server configuration error');
      
      // Restore the original method
      WebhookVerifierService.prototype.validateProductionConfig = originalValidate;
    });

    it('should handle installation added events with repositories_added (new repository)', async () => {
      const { Octokit } = require('@octokit/rest');
      const mockCreateIssue = jest.fn().mockResolvedValue({ data: { number: 1 } });
      const mockListForRepo = jest.fn().mockResolvedValue({ data: [] }); // No existing issues
      
      // Mock both the global Octokit and instance-specific ones
      (Octokit as jest.Mock).mockImplementation(() => ({
        rest: {
          issues: {
            create: mockCreateIssue,
            update: jest.fn(),
            createComment: jest.fn(),
            listForRepo: mockListForRepo,
          },
        },
      }));

      const mockPayload = {
        action: 'added',
        installation: {
          id: 87292957,
          client_id: 'Iv23lixMyafbZeBvvfC3'
        },
        repositories_added: [
          {
            id: 578590286,
            name: 'ado-agent',
            full_name: 'bancey/ado-agent',
            private: false
          }
        ]
      };

      // Generate valid signature for this payload
      const { Webhooks } = require('@octokit/webhooks');
      const testWebhooks = new Webhooks({ secret: "It's a Secret to Everybody" });
      const payloadString = JSON.stringify(mockPayload);
      const validSignature = await testWebhooks.sign(payloadString);

      const response = await request(app)
        .post('/webhook')
        .set('x-hub-signature-256', validSignature)
        .set('x-github-event', 'installation')
        .set('x-github-delivery', 'test-delivery-id')
        .set('Content-Type', 'application/json')
        .send(payloadString)
        .expect(200);
      
      expect(response.body.message).toBe('Webhook processed successfully');
      expect(mockListForRepo).toHaveBeenCalledWith({
        owner: 'bancey',
        repo: 'ado-agent',
        state: 'all',
        labels: 'devex-scorecard'
      });
      expect(mockCreateIssue).toHaveBeenCalledWith({
        owner: 'bancey',
        repo: 'ado-agent',
        title: '🎯 DevEx Scorecard',
        body: expect.stringContaining('DevEx Scorecard'),
        labels: ['devex-scorecard', 'documentation']
      });
    });

    it('should handle installation added events with existing scorecard issue', async () => {
      const { Octokit } = require('@octokit/rest');
      const mockUpdateIssue = jest.fn().mockResolvedValue({ data: { number: 5 } });
      const mockListForRepo = jest.fn().mockResolvedValue({ 
        data: [{
          number: 5,
          title: '🎯 DevEx Scorecard',
          state: 'closed'
        }]
      });
      
      // Mock both the global Octokit and instance-specific ones
      (Octokit as jest.Mock).mockImplementation(() => ({
        rest: {
          issues: {
            create: jest.fn(),
            update: mockUpdateIssue,
            createComment: jest.fn(),
            listForRepo: mockListForRepo,
          },
        },
      }));

      const mockPayload = {
        action: 'added',
        installation: {
          id: 87292957,
          client_id: 'Iv23lixMyafbZeBvvfC3'
        },
        repositories_added: [
          {
            id: 578590286,
            name: 'ado-agent',
            full_name: 'bancey/ado-agent',
            private: false
          }
        ]
      };

      // Generate valid signature for this payload
      const { Webhooks } = require('@octokit/webhooks');
      const testWebhooks = new Webhooks({ secret: "It's a Secret to Everybody" });
      const payloadString = JSON.stringify(mockPayload);
      const validSignature = await testWebhooks.sign(payloadString);

      const response = await request(app)
        .post('/webhook')
        .set('x-hub-signature-256', validSignature)
        .set('x-github-event', 'installation')
        .set('x-github-delivery', 'test-delivery-id')
        .set('Content-Type', 'application/json')
        .send(payloadString)
        .expect(200);
      
      expect(response.body.message).toBe('Webhook processed successfully');
      expect(mockListForRepo).toHaveBeenCalledWith({
        owner: 'bancey',
        repo: 'ado-agent',
        state: 'all',
        labels: 'devex-scorecard'
      });
      expect(mockUpdateIssue).toHaveBeenCalledWith({
        owner: 'bancey',
        repo: 'ado-agent',
        issue_number: 5,
        title: '🎯 DevEx Scorecard',
        body: expect.stringContaining('DevEx Scorecard'),
        state: 'open',
        labels: ['devex-scorecard', 'documentation']
      });
    });

    it('should handle issue edit events for re-run scorecard', async () => {
      const { Octokit } = require('@octokit/rest');
      const mockUpdateIssue = jest.fn().mockResolvedValue({ data: { number: 3 } });
      const mockCreateComment = jest.fn().mockResolvedValue({ data: { id: 1 } });
      const mockListForRepo = jest.fn().mockResolvedValue({ data: [] }); // Mock empty issues list
      
      (Octokit as jest.Mock).mockImplementation(() => ({
        rest: {
          issues: {
            create: jest.fn(),
            update: mockUpdateIssue,
            createComment: mockCreateComment,
            listForRepo: mockListForRepo,
          },
        },
      }));

      const mockPayload = {
        action: 'edited',
        repository: {
          name: 'test-repo',
          full_name: 'bancey/test-repo',
          owner: {
            login: 'bancey'
          }
        },
        installation: {
          id: 87292957
        },
        issue: {
          number: 3,
          title: '🎯 DevEx Scorecard',
          body: '# DevEx Scorecard\n\n- [x] **Re-run scorecard** - Check this box to trigger a fresh analysis'
        }
      };

      // Generate valid signature for this payload
      const { Webhooks } = require('@octokit/webhooks');
      const testWebhooks = new Webhooks({ secret: "It's a Secret to Everybody" });
      const payloadString = JSON.stringify(mockPayload);
      const validSignature = await testWebhooks.sign(payloadString);

      const response = await request(app)
        .post('/webhook')
        .set('x-hub-signature-256', validSignature)
        .set('x-github-event', 'issues')
        .set('x-github-delivery', 'test-delivery-id')
        .set('Content-Type', 'application/json')
        .send(payloadString)
        .expect(200);
      
      expect(response.body.message).toBe('Webhook processed successfully');
      expect(mockUpdateIssue).toHaveBeenCalledWith({
        owner: 'bancey',
        repo: 'test-repo',
        issue_number: 3,
        body: expect.stringContaining('DevEx Scorecard')
      });
      expect(mockCreateComment).toHaveBeenCalledWith({
        owner: 'bancey',
        repo: 'test-repo',
        issue_number: 3,
        body: expect.stringContaining('Scorecard re-run completed')
      });
    });
  });

  describe('Webhook Signature Verification', () => {
    it('should correctly generate and verify signatures using the configured WEBHOOK_SECRET', async () => {
      const { Webhooks } = require('@octokit/webhooks');
      const testSecret = "It's a Secret to Everybody"; // Use the test secret directly
      const webhooks = new Webhooks({ secret: testSecret });
      
      const testPayload = JSON.stringify({
        action: 'opened',
        repository: {
          name: 'test-repo',
          full_name: 'test-owner/test-repo',
          owner: { login: 'test-owner' }
        },
        installation: { id: 12345 }
      });
      
      // Generate signature (like what GitHub would do)
      const signature = await webhooks.sign(testPayload);
      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
      
      // Verify signature (like what our webhook endpoint does)
      const isValid = await webhooks.verify(testPayload, signature);
      expect(isValid).toBe(true);
      
      // Test with invalid signature
      const invalidSignature = 'sha256=invalid';
      const isInvalid = await webhooks.verify(testPayload, invalidSignature);
      expect(isInvalid).toBe(false);
    });

    it('should match GitHub documentation test vectors', async () => {
      const { Webhooks } = require('@octokit/webhooks');
      // Test values from GitHub docs: https://docs.github.com/en/webhooks/webhooks/securing-your-webhooks
      const githubTestSecret = "It's a Secret to Everybody";
      const githubTestPayload = "Hello, World!";
      const expectedSignature = 'sha256=757107ea0eb2509fc211221cce984b8a37570b6d7586c22c46f4379c8b043e17';
      
      const githubWebhooks = new Webhooks({ secret: githubTestSecret });
      const githubGeneratedSig = await githubWebhooks.sign(githubTestPayload);
      const githubIsValid = await githubWebhooks.verify(githubTestPayload, expectedSignature);
      
      expect(githubGeneratedSig).toBe(expectedSignature);
      expect(githubIsValid).toBe(true);
    });

    it('should verify that the current WEBHOOK_SECRET value works with the @octokit/webhooks library', async () => {
      const { Webhooks } = require('@octokit/webhooks');
      
      // Test with the actual secret from .env (FWeZz86ifW9UrcHrTPrs)
      const actualSecret = 'FWeZz86ifW9UrcHrTPrs';
      const webhooks = new Webhooks({ secret: actualSecret });
      
      const testPayload = JSON.stringify({ test: 'payload', timestamp: Date.now() });
      
      // This should not throw an error and should generate a valid signature
      const signature = await webhooks.sign(testPayload);
      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
      
      // Verification should work
      const isValid = await webhooks.verify(testPayload, signature);
      expect(isValid).toBe(true);
    });
  });
});