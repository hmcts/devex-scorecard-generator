jest.mock('@octokit/webhooks', () => ({
  Webhooks: jest.fn().mockImplementation(() => ({
    verify: jest.fn(),
  })),
}));

// Mock the config module
jest.mock('../../src/config', () => ({
  config: {
    nodeEnv: 'test',
    webhookSecret: 'test-webhook-secret',
  },
  getConfig: jest.fn(() => ({
    nodeEnv: 'test',
    webhookSecret: 'test-webhook-secret',
  })),
}));

import { WebhookVerifierService } from '../../src/services/webhook-verifier';
import { Webhooks } from '@octokit/webhooks';
import { config } from '../../src/config';

describe('WebhookVerifierService', () => {
  let service: WebhookVerifierService;
  let mockWebhooks: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton instance
    (WebhookVerifierService as any).instance = undefined;
    
    // Setup mock webhooks
    mockWebhooks = {
      verify: jest.fn()
    };
    (Webhooks as jest.Mock).mockImplementation(() => mockWebhooks);
    
    service = WebhookVerifierService.getInstance();
  });

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const instance1 = WebhookVerifierService.getInstance();
      const instance2 = WebhookVerifierService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('getWebhooks', () => {
    it('should return the webhooks instance', () => {
      const webhooks = service.getWebhooks();
      
      expect(webhooks).toBe(mockWebhooks);
      expect(Webhooks).toHaveBeenCalledWith({
        secret: 'test-webhook-secret'
      });
    });
  });

  describe('verifySignature', () => {
    it('should verify valid signature', async () => {
      const payload = 'test-payload';
      const signature = 'sha256=valid-signature';
      mockWebhooks.verify.mockResolvedValue(true);
      
      const result = await service.verifySignature(payload, signature);
      
      expect(result).toBe(true);
      expect(mockWebhooks.verify).toHaveBeenCalledWith(payload, signature);
    });

    it('should return false for invalid signature', async () => {
      const payload = 'test-payload';
      const signature = 'sha256=invalid-signature';
      mockWebhooks.verify.mockResolvedValue(false);
      
      const result = await service.verifySignature(payload, signature);
      
      expect(result).toBe(false);
      expect(mockWebhooks.verify).toHaveBeenCalledWith(payload, signature);
    });

    it('should return false when verification throws error', async () => {
      const payload = 'test-payload';
      const signature = 'sha256=error-signature';
      mockWebhooks.verify.mockRejectedValue(new Error('Verification failed'));
      
      const result = await service.verifySignature(payload, signature);
      
      expect(result).toBe(false);
    });
  });

  describe('isWebhookSecretConfigured', () => {
    it('should return true when webhook secret is configured', () => {
      process.env.WEBHOOK_SECRET = 'test-secret';
      
      // Create new instance to pick up the environment change
      (WebhookVerifierService as any).instance = undefined;
      service = WebhookVerifierService.getInstance();
      
      expect(service.isWebhookSecretConfigured()).toBe(true);
    });

    it('should return false when webhook secret is not configured', () => {
      // Mock config with empty webhook secret
      (config as any).webhookSecret = '';
      
      // Create new instance to pick up the config change
      (WebhookVerifierService as any).instance = undefined;
      service = WebhookVerifierService.getInstance();
      
      expect(service.isWebhookSecretConfigured()).toBe(false);
      
      // Reset config
      (config as any).webhookSecret = 'test-webhook-secret';
    });
  });

  describe('validateProductionConfig', () => {
    it('should not throw error in test environment', () => {
      process.env.NODE_ENV = 'test';
      delete process.env.WEBHOOK_SECRET;
      
      // Create new instance to pick up the environment change
      (WebhookVerifierService as any).instance = undefined;
      service = WebhookVerifierService.getInstance();
      
      expect(() => service.validateProductionConfig()).not.toThrow();
    });

    it('should throw error in production without webhook secret', () => {
      // Mock config for production without webhook secret
      (config as any).nodeEnv = 'production';
      (config as any).webhookSecret = '';
      
      // Create new instance to pick up the config change
      (WebhookVerifierService as any).instance = undefined;
      service = WebhookVerifierService.getInstance();
      
      expect(() => service.validateProductionConfig()).toThrow('WEBHOOK_SECRET environment variable is not set');
      
      // Reset config
      (config as any).nodeEnv = 'test';
      (config as any).webhookSecret = 'test-webhook-secret';
    });

    it('should not throw error in production with webhook secret', () => {
      process.env.NODE_ENV = 'production';
      process.env.WEBHOOK_SECRET = 'production-secret';
      
      // Create new instance to pick up the environment change
      (WebhookVerifierService as any).instance = undefined;
      service = WebhookVerifierService.getInstance();
      
      expect(() => service.validateProductionConfig()).not.toThrow();
    });
  });
});