import { DefaultAzureCredential } from '@azure/identity';
import { AIProjectClient } from '@azure/ai-projects';
import { AgentsClient, Agent } from '@azure/ai-agents';
import { AgentConfig } from '../types';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { ScoringConfigService } from './scoring-config';

export interface AIConversation {
  threadId: string;
  agent: Agent;
  agentsClient: AgentsClient;
}

/**
 * Service responsible for managing Azure AI Foundry clients and agents
 */
export class AzureAIClientService {
  private projectClient: AIProjectClient;
  private agentsClient: AgentsClient | null = null;
  private deploymentName: string;
  private apiVersion: string;
  private agentId?: string;
  private cachedPrompt?: string;
  private scoringConfig: ScoringConfigService;

  constructor(config: AgentConfig) {
    this.deploymentName = config.deploymentName;
    this.apiVersion = config.apiVersion || '2024-12-01-preview';
    this.agentId = config.agentId;
    this.scoringConfig = new ScoringConfigService(config.scoringConfig);

    // Create Azure AI Project client with proper authentication
    const credential = new DefaultAzureCredential();
    this.projectClient = new AIProjectClient(config.projectEndpoint, credential);
  }

  /**
   * Get or initialize the Azure AI Agents client
   */
  private async getAgentsClient(): Promise<AgentsClient> {
    if (!this.agentsClient) {
      this.agentsClient = this.projectClient.agents;
    }
    return this.agentsClient;
  }

  /**
   * Get or create the DevEx analysis agent
   */
  private async getOrCreateAgent(): Promise<Agent> {
    const agentsClient = await this.getAgentsClient();
    
    // If agentId is provided, use existing agent
    if (this.agentId) {
      try {
        return await agentsClient.getAgent(this.agentId);
      } catch (error) {
        console.error(`Failed to get agent ${this.agentId}:`, error);
        throw new Error(`Agent ${this.agentId} not found or inaccessible`);
      }
    }

    // Create a new agent for DevEx analysis
    return await this.createDevExAgent(agentsClient);
  }

  /**
   * Create a new DevEx analysis agent
   */
  private async createDevExAgent(agentsClient: AgentsClient): Promise<Agent> {
    const instructions = await this.loadAgentInstructions();

    return await agentsClient.createAgent(this.deploymentName, {
      name: 'DevEx Scorecard Analyzer',
      description: 'Analyzes GitHub repositories to generate developer experience scorecards',
      instructions,
      responseFormat: { type: 'json_object' }
    });
  }

  /**
   * Load agent instructions from external file
   */
  private async loadAgentInstructions(): Promise<string> {
    if (this.cachedPrompt) {
      return this.cachedPrompt;
    }

    try {
      // Get the project root directory
      const projectRoot = join(__dirname, '..', '..');       // From src/services/
      const promptPath = join(projectRoot, 'devex-agent-prompt.md');
      
      const promptContent = await readFile(promptPath, 'utf-8');
      
      // Replace the default scoring guide with the configured one
      const dynamicScoringGuide = this.scoringConfig.generateScoringGuide();
      const updatedPrompt = this.replaceScoringGuide(promptContent, dynamicScoringGuide);
      
      // Extract just the prompt content, removing markdown formatting
      const cleanPrompt = updatedPrompt
        .replace(/^#.*$/gm, '') // Remove headers
        .replace(/^```.*$/gm, '') // Remove code block markers
        .replace(/^-\s+\*\*.*?\*\*:/gm, (match: string) => match.replace(/\*\*/g, '')) // Clean bullet points
        .replace(/\n{3,}/g, '\n\n') // Normalize line breaks
        .trim();
      
      this.cachedPrompt = cleanPrompt;
      return cleanPrompt;
    } catch (error) {
      console.error('Failed to load agent prompt from file:', error);
      // Fallback to a basic prompt if file loading fails
      const fallbackPrompt = `You are a DevEx analyzer. Analyze repositories and respond with JSON containing: score (0-100), color (red/yellow/green), analysis, and recommendations array.\n\n${this.scoringConfig.generateScoringGuide()}`;
      this.cachedPrompt = fallbackPrompt;
      return fallbackPrompt;
    }
  }

  /**
   * Replace the default scoring guide in the prompt with the configured one
   */
  private replaceScoringGuide(promptContent: string, dynamicScoringGuide: string): string {
    // Find the scoring guide section in the markdown
    const scoringGuideRegex = /## Scoring Guide\s*\n\s*Use this scoring guide:\s*\n\s*([\s\S]*?)(?=\n\s*$|\n\s*##|\n\s*```)/;
    
    // Replace the existing scoring guide with the dynamic one
    if (scoringGuideRegex.test(promptContent)) {
      return promptContent.replace(scoringGuideRegex, `## Scoring Guide\n\n${dynamicScoringGuide}`);
    }
    
    // If no scoring guide section found, append it
    console.warn('No scoring guide section found in prompt, appending dynamic guide');
    return `${promptContent}\n\n## Scoring Guide\n\n${dynamicScoringGuide}`;
  }

  /**
   * Clear cached prompt (useful when scoring configuration changes)
   */
  public clearPromptCache(): void {
    this.cachedPrompt = undefined;
  }

  /**
   * Start a new conversation with the agent
   */
  public async startConversation(): Promise<AIConversation> {
    const agent = await this.getOrCreateAgent();
    const agentsClient = await this.getAgentsClient();

    console.log(`Using agent ${agent.id} for analysis`);

    // Create a thread for this analysis
    const thread = await agentsClient.threads.create();

    return {
      threadId: thread.id,
      agent,
      agentsClient
    };
  }

  /**
   * Send a message and get response from the agent
   */
  public async sendMessage(
    conversation: AIConversation,
    message: string
  ): Promise<string> {
    const { threadId, agent, agentsClient } = conversation;

    // Add the message to the thread
    await agentsClient.messages.create(threadId, 'user', message);

    // Create and execute a run with polling
    const runPoller = agentsClient.runs.createAndPoll(threadId, agent.id, {
      maxCompletionTokens: 2500,
      temperature: 0.2
    });

    // Wait for completion
    const completedRun = await runPoller.pollUntilDone();
    
    if (completedRun.status !== 'completed') {
      throw new Error(`Agent run failed with status: ${completedRun.status}`);
    }

    // Get the messages from the thread to find the agent's response
    const messages = agentsClient.messages.list(threadId);
    
    for await (const message of messages) {
      if (message.role === 'assistant' && message.content && message.content.length > 0) {
        const content = message.content[0];
        if (content.type === 'text' && 'text' in content) {
          return (content as any).text.value;
        }
      }
    }

    throw new Error('No response from AI agent');
  }

  /**
   * Clean up a conversation thread
   */
  public async cleanupConversation(conversation: AIConversation): Promise<void> {
    try {
      await conversation.agentsClient.threads.delete(conversation.threadId);
    } catch (cleanupError) {
      console.warn('Failed to cleanup thread:', cleanupError);
    }
  }
}