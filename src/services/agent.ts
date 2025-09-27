import { Octokit } from '@octokit/rest';
import { ScorecardResult, AgentConfig } from '../types';
import { RepositoryContextService } from './repository-context';
import { PromptGenerationService } from './prompt-generation';
import { AIResponseParserService } from './ai-response-parser';
import { AzureAIClientService } from './azure-ai-client';

/**
 * Service for orchestrating DevEx scorecard generation using AI
 * 
 * This service follows the Single Responsibility Principle by focusing
 * solely on coordinating the scorecard generation process.
 */
export class AgentService {
  private azureAIClient: AzureAIClientService;
  private promptService: PromptGenerationService;
  private responseParser: AIResponseParserService;

  constructor(config: AgentConfig) {
    this.azureAIClient = new AzureAIClientService(config);
    this.promptService = new PromptGenerationService();
    this.responseParser = new AIResponseParserService();
  }



  /**
   * Generate a developer experience scorecard using AI Foundry Agent
   */
  public async generateScorecard(
    octokit: Octokit,
    owner: string,
    repo: string
  ): Promise<ScorecardResult> {
    try {
      console.log(`Generating scorecard for ${owner}/${repo} using AI Foundry Agent`);

      // 1. Fetch repository context using dedicated service
      const contextService = new RepositoryContextService(octokit);
      const context = await contextService.fetchRepoContext(owner, repo);

      // 2. Generate analysis prompt using dedicated service
      const prompt = this.promptService.createAnalysisPrompt(owner, repo, context);

      // 3. Start AI conversation
      const conversation = await this.azureAIClient.startConversation();

      try {
        // 4. Send message and get response
        const aiResponse = await this.azureAIClient.sendMessage(conversation, prompt);

        // 5. Parse the AI response using dedicated service
        const result = this.responseParser.parseAIResponse(aiResponse);

        return result;
      } finally {
        // 6. Clean up the conversation
        await this.azureAIClient.cleanupConversation(conversation);
      }

    } catch (error) {
      console.error(`Error generating scorecard for ${owner}/${repo}:`, error);
      throw error;
    }
  }

}