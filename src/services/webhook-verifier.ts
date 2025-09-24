import { Webhooks } from '@octokit/webhooks';
import { config } from '../config';

/**
 * Service responsible for webhook signature verification
 */
export class WebhookVerifierService {
  private static instance: WebhookVerifierService;
  private webhooks: Webhooks;

  private constructor() {
    this.webhooks = new Webhooks({
      secret: config.webhookSecret
    });
  }

  public static getInstance(): WebhookVerifierService {
    if (!WebhookVerifierService.instance) {
      WebhookVerifierService.instance = new WebhookVerifierService();
    }
    return WebhookVerifierService.instance;
  }

  /**
   * Get the Webhooks instance
   */
  public getWebhooks(): Webhooks {
    return this.webhooks;
  }

  /**
   * Verify webhook signature
   */
  public async verifySignature(payload: string, signature: string): Promise<boolean> {
    try {
      return await this.webhooks.verify(payload, signature);
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      return false;
    }
  }

  /**
   * Check if webhook secret is properly configured
   */
  public isWebhookSecretConfigured(): boolean {
    return Boolean(config.webhookSecret);
  }

  /**
   * Validate webhook configuration for production environment
   */
  public validateProductionConfig(): void {
    if (!this.isWebhookSecretConfigured() && config.nodeEnv === 'production') {
      throw new Error('WEBHOOK_SECRET environment variable is not set');
    }
  }
}