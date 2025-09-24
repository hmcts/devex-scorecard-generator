import { Request, Response } from 'express';
import { WebhookPayload, Repository } from '../types';
import { WebhookVerifierService } from '../services/webhook-verifier';
import { IssueManagerService } from '../services/issue-manager';

/**
 * Handler for GitHub webhook events
 */
export class WebhookHandler {
  private webhookVerifier: WebhookVerifierService;
  private issueManager: IssueManagerService;

  constructor() {
    this.webhookVerifier = WebhookVerifierService.getInstance();
    this.issueManager = new IssueManagerService();
  }

  /**
   * Handle incoming webhook requests
   */
  public async handleWebhook(req: Request, res: Response): Promise<Response> {
    try {
      // Verify webhook secret is configured (skip check in test environment)
      this.webhookVerifier.validateProductionConfig();

      // Get required headers
      const signature = req.headers['x-hub-signature-256'] as string;
      const githubEvent = req.headers['x-github-event'] as string;
      const deliveryId = req.headers['x-github-delivery'] as string;

      if (!signature) {
        console.error('Missing x-hub-signature-256 header');
        return res.status(401).json({ error: 'Unauthorized: Missing signature' });
      }

      if (!githubEvent) {
        console.error('Missing x-github-event header');
        return res.status(400).json({ error: 'Bad Request: Missing event type' });
      }

      // Prepare payload for verification
      const payload = this.extractPayload(req.body);
      
      // Verify the webhook signature
      const isValid = await this.webhookVerifier.verifySignature(payload, signature);

      if (!isValid) {
        console.error('Invalid webhook signature');
        return res.status(401).json({ error: 'Unauthorized: Invalid signature' });
      }

      console.log(`✓ Verified webhook signature for event: ${githubEvent}`);

      // Parse and process the webhook payload
      const webhookPayload = this.parsePayload(payload);
      await this.processWebhookEvent(webhookPayload, githubEvent, deliveryId);

      return res.status(200).json({ message: 'Webhook processed successfully' });
    } catch (error) {
      if (error instanceof Error && error.message === 'WEBHOOK_SECRET environment variable is not set') {
        console.error('WEBHOOK_SECRET environment variable is not set');
        return res.status(500).json({ error: 'Server configuration error' });
      }
      
      console.error('Error processing webhook:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Extract payload string from request body
   */
  private extractPayload(body: any): string {
    if (Buffer.isBuffer(body)) {
      return body.toString();
    } else if (typeof body === 'string') {
      return body;
    } else {
      return JSON.stringify(body);
    }
  }

  /**
   * Parse JSON payload, handling non-JSON payloads gracefully
   */
  private parsePayload(payload: string): WebhookPayload {
    try {
      return JSON.parse(payload);
    } catch (error) {
      // Handle non-JSON payloads (like test strings)
      console.log('Non-JSON payload received, treating as test payload');
      return {};
    }
  }

  /**
   * Process the webhook event based on its type and content
   */
  private async processWebhookEvent(
    webhookPayload: WebhookPayload, 
    githubEvent: string, 
    deliveryId: string
  ): Promise<void> {
    const { action, repository, issue, repositories_added, installation } = webhookPayload;

    console.log('Received webhook event:', { event: githubEvent, action, deliveryId });

    // Handle issue events first (has higher priority)
    if (issue && action === 'edited' && issue.title.includes('DevEx Scorecard')) {
      await this.handleIssueEditEvent(repository, issue, installation);
      return;
    }

    // Handle repository events (single repository) - only for actual repository events, not issues events
    if (repository && action && ['created', 'edited'].includes(action) && installation && githubEvent === 'repository') {
      console.log(`Repository event: ${action} for ${repository.full_name}`);
      await this.issueManager.createOrUpdateScorecardIssue(repository, installation.id);
      return;
    }

    // Handle installation events (when bot is added to existing repositories)
    if (action === 'added' && repositories_added && repositories_added.length > 0 && installation) {
      await this.handleInstallationAddedEvent(repositories_added, installation);
      return;
    }
  }

  /**
   * Handle issue edit events for scorecard re-run
   */
  private async handleIssueEditEvent(
    repository: Repository | undefined, 
    issue: any, 
    installation: any
  ): Promise<void> {
    console.log('Issue edited event for scorecard');

    if (issue.body.includes('- [x] **Re-run scorecard**')) {
      if (!repository) {
        throw new Error('Repository information missing from issue event');
      }

      if (!installation?.id) {
        throw new Error('Installation ID missing from issue event');
      }

      await this.issueManager.handleScorecardRerun(repository, issue, installation.id);
    }
  }

  /**
   * Handle installation added events
   */
  private async handleInstallationAddedEvent(
    repositories_added: Array<{
      id: number;
      name: string;
      full_name: string;
      private: boolean;
    }>, 
    installation: { id: number }
  ): Promise<void> {
    console.log(`Installation event: ${repositories_added.length} repositories added`);
    
    for (const repo of repositories_added) {
      console.log(`Processing repository: ${repo.full_name}`);
      
      // Convert the repository format to match our Repository interface
      const repoData: Repository = {
        name: repo.name,
        full_name: repo.full_name,
        owner: {
          login: repo.full_name.split('/')[0]
        }
      };
      
      await this.issueManager.createOrUpdateScorecardIssue(repoData, installation.id);
    }
  }
}