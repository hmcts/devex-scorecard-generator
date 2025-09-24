import { DefaultAzureCredential, AzureCliCredential, ManagedIdentityCredential, ChainedTokenCredential, getBearerTokenProvider } from '@azure/identity';
import { AzureOpenAI } from 'openai';
import { Octokit } from '@octokit/rest';

export interface ScorecardResult {
  score: number;
  color: 'red' | 'yellow' | 'green';
  analysis: string;
  recommendations: string[];
}

export interface AgentConfig {
  endpoint: string;
  deploymentName: string;
  apiKey?: string;
  apiVersion?: string;
}

export interface RepoContext {
  'README.md': string;
  'CODEOWNERS': string;
  [key: string]: string;
}

/**
 * Service for interacting with Azure OpenAI to generate DevEx scorecards
 */
export class AgentService {
  private client: AzureOpenAI;
  private deploymentName: string;

  constructor(config: AgentConfig) {
    this.deploymentName = config.deploymentName;
    
    if (config.apiKey) {
      // Use API key authentication
      this.client = new AzureOpenAI({
        endpoint: config.endpoint,
        deployment: config.deploymentName,
        apiKey: config.apiKey,
        apiVersion: config.apiVersion || '2024-10-21',
      });
    } else {
      // Use Azure authentication with chained credentials
      // Priority: Azure CLI (for local development) -> Managed Identity (for production)
      const credential = new ChainedTokenCredential(
        new AzureCliCredential(),
        new ManagedIdentityCredential(),
        new DefaultAzureCredential()
      );
      
      const scope = 'https://cognitiveservices.azure.com/.default';
      const azureADTokenProvider = getBearerTokenProvider(credential, scope);
      
      this.client = new AzureOpenAI({
        endpoint: config.endpoint,
        deployment: config.deploymentName,
        azureADTokenProvider,
        apiVersion: config.apiVersion || '2024-10-21',
      });
    }
  }

  /**
   * Fetch file content from GitHub repository
   */
  private async fetchFileFromGitHub(
    octokit: Octokit,
    owner: string,
    repo: string,
    filename: string
  ): Promise<string> {
    try {
      const response = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: filename,
      });

      if ('content' in response.data && response.data.content) {
        return Buffer.from(response.data.content, 'base64').toString('utf-8');
      }
      
      return `${filename} not found or inaccessible.`;
    } catch (error) {
      console.log(`Error fetching ${filename} from ${owner}/${repo}:`, error);
      return `${filename} not found or inaccessible.`;
    }
  }

  /**
   * Fetch repository context from GitHub
   */
  private async fetchRepoContext(
    octokit: Octokit,
    owner: string,
    repo: string
  ): Promise<RepoContext> {
    const filesToRead = ['README.md', 'CODEOWNERS'];
    const context: RepoContext = {} as RepoContext;

    for (const filename of filesToRead) {
      context[filename] = await this.fetchFileFromGitHub(octokit, owner, repo, filename);
    }

    return context;
  }

  /**
   * Generate a developer experience scorecard using AI
   */
  public async generateScorecard(
    octokit: Octokit,
    owner: string,
    repo: string
  ): Promise<ScorecardResult> {
    try {
      console.log(`Generating scorecard for ${owner}/${repo}`);
      
      // Fetch repository context
      const context = await this.fetchRepoContext(octokit, owner, repo);
      
      // Create the prompt for AI analysis
      const prompt = this.createAnalysisPrompt(owner, repo, context);
      
      // Call Azure OpenAI to analyze the repository
      const response = await this.client.chat.completions.create({
        model: '', // Model is specified by deployment name in Azure OpenAI
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that analyzes GitHub repositories and generates developer experience scorecards. You should provide a numerical score (0-100), a traffic light color (red, yellow, green), detailed analysis, and actionable recommendations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      });

      const result = response.choices[0]?.message?.content;
      if (!result) {
        throw new Error('No response from AI agent');
      }

      // Parse the AI response
      return this.parseAIResponse(result);
      
    } catch (error) {
      console.error(`Error generating scorecard for ${owner}/${repo}:`, error);
      throw error;
    }
  }

  /**
   * Create analysis prompt for the AI
   */
  private createAnalysisPrompt(owner: string, repo: string, context: RepoContext): string {
    return `Analyze the following GitHub repository for developer experience and provide a scorecard:

Repository: ${owner}/${repo}

Repository Files:
${Object.entries(context).map(([filename, content]) => 
  `=== ${filename} ===
${content}
`).join('\n')}

Please analyze this repository and provide a JSON response with the following structure:
{
  "score": <number between 0-100>,
  "color": "<red|yellow|green>",
  "analysis": "<detailed analysis of the repository's developer experience>",
  "recommendations": ["<actionable recommendation 1>", "<actionable recommendation 2>", ...]
}

Consider these aspects:
- Documentation quality (README, setup instructions, examples)
- Project structure and organization
- Development setup ease
- Testing presence and quality
- CI/CD automation
- Security practices
- Community features (templates, guidelines, etc.)

Scoring guide:
- 0-40: Red (Poor developer experience, major issues)
- 41-70: Yellow (Moderate developer experience, room for improvement)
- 71-100: Green (Good developer experience, well-maintained)`;
  }

  /**
   * Parse AI response into structured result
   */
  private parseAIResponse(response: string): ScorecardResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          score: parsed.score || 0,
          color: parsed.color || 'red',
          analysis: parsed.analysis || 'No analysis provided',
          recommendations: parsed.recommendations || []
        };
      }
    } catch (error) {
      console.error('Error parsing AI response:', error);
    }

    // Fallback parsing if JSON parsing fails
    return {
      score: 50,
      color: 'yellow',
      analysis: response,
      recommendations: ['Review repository documentation and structure']
    };
  }
}