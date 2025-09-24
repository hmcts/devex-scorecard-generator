jest.mock('../../src/services/webhook-verifier');
jest.mock('../../src/services/issue-manager');

import { Request, Response } from 'express';
import { WebhookHandler } from '../../src/handlers/webhook-handler';
import { WebhookVerifierService } from '../../src/services/webhook-verifier';
import { IssueManagerService } from '../../src/services/issue-manager';

describe('WebhookHandler', () => {
  let handler: WebhookHandler;
  let mockWebhookVerifier: jest.Mocked<WebhookVerifierService>;
  let mockIssueManager: jest.Mocked<IssueManagerService>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock services
    mockWebhookVerifier = {
      getInstance: jest.fn(),
      validateProductionConfig: jest.fn(),
      verifySignature: jest.fn(),
      getWebhooks: jest.fn(),
      isWebhookSecretConfigured: jest.fn(),
    } as any;

    mockIssueManager = {
      createOrUpdateScorecardIssue: jest.fn(),
      handleScorecardRerun: jest.fn(),
      findExistingScorecardIssue: jest.fn(),
      createScorecardIssue: jest.fn(),
      updateScorecardIssue: jest.fn(),
    } as any;

    (WebhookVerifierService.getInstance as jest.Mock).mockReturnValue(mockWebhookVerifier);
    (IssueManagerService as jest.Mock).mockImplementation(() => mockIssueManager);

    handler = new WebhookHandler();

    // Setup mock request and response
    mockReq = {
      headers: {},
      body: 'test-payload'
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as any;
  });

  describe('handleWebhook', () => {
    beforeEach(() => {
      mockReq.headers = {
        'x-hub-signature-256': 'sha256=valid-signature',
        'x-github-event': 'ping',
        'x-github-delivery': 'delivery-id'
      };
    });

    it('should handle webhook with valid signature', async () => {
      mockWebhookVerifier.verifySignature.mockResolvedValue(true);

      const result = await handler.handleWebhook(mockReq as Request, mockRes as Response);

      expect(mockWebhookVerifier.validateProductionConfig).toHaveBeenCalled();
      expect(mockWebhookVerifier.verifySignature).toHaveBeenCalledWith('test-payload', 'sha256=valid-signature');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Webhook processed successfully' });
    });

    it('should reject webhook without signature', async () => {
      delete mockReq.headers!['x-hub-signature-256'];

      await handler.handleWebhook(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized: Missing signature' });
    });

    it('should reject webhook without event type', async () => {
      delete mockReq.headers!['x-github-event'];

      await handler.handleWebhook(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Bad Request: Missing event type' });
    });

    it('should reject webhook with invalid signature', async () => {
      mockWebhookVerifier.verifySignature.mockResolvedValue(false);

      await handler.handleWebhook(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized: Invalid signature' });
    });

    it('should handle configuration error', async () => {
      mockWebhookVerifier.validateProductionConfig.mockImplementation(() => {
        throw new Error('WEBHOOK_SECRET environment variable is not set');
      });

      await handler.handleWebhook(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Server configuration error' });
    });

    it('should handle generic errors', async () => {
      mockWebhookVerifier.validateProductionConfig.mockImplementation(() => {
        throw new Error('Generic error');
      });

      await handler.handleWebhook(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });

    describe('payload processing', () => {
      beforeEach(() => {
        mockWebhookVerifier.verifySignature.mockResolvedValue(true);
      });

      it('should handle issue edited event for scorecard rerun', async () => {
        const payload = JSON.stringify({
          action: 'edited',
          repository: { name: 'test-repo', full_name: 'owner/test-repo', owner: { login: 'owner' } },
          installation: { id: 12345 },
          issue: {
            number: 3,
            title: '🎯 DevEx Scorecard',
            body: '- [x] **Re-run scorecard**'
          }
        });
        mockReq.body = payload;

        await handler.handleWebhook(mockReq as Request, mockRes as Response);

        expect(mockIssueManager.handleScorecardRerun).toHaveBeenCalledWith(
          { name: 'test-repo', full_name: 'owner/test-repo', owner: { login: 'owner' } },
          { number: 3, title: '🎯 DevEx Scorecard', body: '- [x] **Re-run scorecard**' },
          12345
        );
      });

      it('should handle installation added event', async () => {
        const payload = JSON.stringify({
          action: 'added',
          installation: { id: 12345 },
          repositories_added: [
            {
              id: 1,
              name: 'test-repo',
              full_name: 'owner/test-repo',
              private: false
            }
          ]
        });
        mockReq.body = payload;

        await handler.handleWebhook(mockReq as Request, mockRes as Response);

        expect(mockIssueManager.createOrUpdateScorecardIssue).toHaveBeenCalledWith(
          { name: 'test-repo', full_name: 'owner/test-repo', owner: { login: 'owner' } },
          12345
        );
      });

      it('should handle repository events', async () => {
        mockReq.headers!['x-github-event'] = 'repository';
        const payload = JSON.stringify({
          action: 'created',
          repository: { name: 'test-repo', full_name: 'owner/test-repo', owner: { login: 'owner' } },
          installation: { id: 12345 }
        });
        mockReq.body = payload;

        await handler.handleWebhook(mockReq as Request, mockRes as Response);

        expect(mockIssueManager.createOrUpdateScorecardIssue).toHaveBeenCalledWith(
          { name: 'test-repo', full_name: 'owner/test-repo', owner: { login: 'owner' } },
          12345
        );
      });

      it('should handle non-JSON payloads gracefully', async () => {
        mockReq.body = 'non-json-payload';

        await handler.handleWebhook(mockReq as Request, mockRes as Response);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Webhook processed successfully' });
      });
    });
  });
});