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
  files: { [path: string]: string };
  structure: string[];
  summary: {
    totalFiles: number;
    fileTypes: { [extension: string]: number };
    directories: string[];
  };
}

export interface GitHubTreeItem {
  path: string;
  type: 'blob' | 'tree';
  size?: number;
  sha: string;
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
   * Fetch repository tree structure from GitHub
   */
  private async fetchRepositoryTree(
    octokit: Octokit,
    owner: string,
    repo: string
  ): Promise<GitHubTreeItem[]> {
    try {
      // Get the default branch
      const repoInfo = await octokit.rest.repos.get({ owner, repo });
      const defaultBranch = repoInfo.data.default_branch;

      // Get the commit SHA for the default branch
      const branchInfo = await octokit.rest.repos.getBranch({ 
        owner, 
        repo, 
        branch: defaultBranch 
      });
      const commitSha = branchInfo.data.commit.sha;

      // Get the complete tree (recursive)
      const treeResponse = await octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: commitSha,
        recursive: 'true'
      });

      return treeResponse.data.tree.map(item => ({
        path: item.path!,
        type: item.type as 'blob' | 'tree',
        size: item.size,
        sha: item.sha!
      }));
    } catch (error) {
      console.error(`Error fetching repository tree for ${owner}/${repo}:`, error);
      return [];
    }
  }

  /**
   * Determine if a file should be included in the analysis
   */
  private shouldIncludeFile(path: string, size?: number): boolean {
    // Skip binary files and large files (>100KB)
    if (size && size > 100000) return false;

    // Skip common ignore patterns
    const skipPatterns = [
      /node_modules/,
      /\.git/,
      /dist/,
      /build/,
      /coverage/,
      /\.nyc_output/,
      /\.next/,
      /\.nuxt/,
      /\.vscode/,
      /\.idea/,
      /\.DS_Store/,
      /thumbs\.db/i,
      /\.log$/,
      /\.tmp$/,
      /\.temp$/,
      /\.cache/,
      /vendor/,
      /target/,
      /bin/,
      /obj/,
      /\.class$/,
      /\.jar$/,
      /\.war$/,
      /\.zip$/,
      /\.tar/,
      /\.gz$/,
      /\.pdf$/,
      /\.exe$/,
      /\.dll$/,
      /\.so$/,
      /\.dylib$/,
      /\.png$/,
      /\.jpg$/,
      /\.jpeg$/,
      /\.gif$/,
      /\.svg$/,
      /\.ico$/,
      /\.woff/,
      /\.ttf$/,
      /\.eot$/,
      /\.mp4$/,
      /\.avi$/,
      /\.mov$/,
      /\.wmv$/,
      /package-lock\.json$/,
      /yarn\.lock$/,
      /pnpm-lock\.yaml$/,
      /composer\.lock$/,
      /Gemfile\.lock$/,
      /Pipfile\.lock$/,
      /poetry\.lock$/
    ];

    return !skipPatterns.some(pattern => pattern.test(path));
  }

  /**
   * Prioritize files for analysis - returns priority score (higher = more important)
   */
  private getFilePriority(path: string): number {
    // High priority files
    if (/^(README|CONTRIBUTING|LICENSE|CHANGELOG|SECURITY)(\.|$)/i.test(path)) return 100;
    if (/^(package\.json|composer\.json|Gemfile|requirements\.txt|Cargo\.toml|go\.mod|pom\.xml|build\.gradle)$/i.test(path)) return 90;
    if (/^(Dockerfile|docker-compose|\.github\/workflows|\.gitlab-ci|Jenkinsfile|azure-pipelines)/.test(path)) return 85;
    if (/^(\.eslintrc|\.prettierrc|tsconfig|jest\.config|webpack\.config|babel\.config|\.gitignore)/.test(path)) return 80;
    if (/\.(md|rst|txt)$/i.test(path)) return 70;
    if (/^(src|lib|app|components|pages|routes|controllers|models|services|utils|helpers)\//.test(path)) return 60;
    if (/\.(ts|js|tsx|jsx|py|java|cs|cpp|c|h|hpp|go|rs|rb|php|swift|kt)$/i.test(path)) return 50;
    if (/\.(json|yaml|yml|toml|ini|cfg|config)$/i.test(path)) return 40;
    if (/\.(css|scss|sass|less|styl)$/i.test(path)) return 30;
    if (/\.(html|htm|xml|svg)$/i.test(path)) return 25;
    if (/^(test|tests|spec|__tests__|\.test\.|\.spec\.)/.test(path)) return 20;
    
    return 10; // Default priority for other files
  }

  /**
   * Fetch comprehensive repository context from GitHub
   */
  private async fetchRepoContext(
    octokit: Octokit,
    owner: string,
    repo: string
  ): Promise<RepoContext> {
    console.log(`Fetching comprehensive repository context for ${owner}/${repo}`);
    
    // Get repository tree
    const treeItems = await this.fetchRepositoryTree(octokit, owner, repo);
    
    // Filter to only blob files (not directories) that we should include
    const relevantFiles = treeItems
      .filter(item => item.type === 'blob' && this.shouldIncludeFile(item.path, item.size))
      .sort((a, b) => this.getFilePriority(b.path) - this.getFilePriority(a.path));
    
    // Limit to top 50 most important files to avoid overwhelming the AI
    const filesToFetch = relevantFiles.slice(0, 50);
    
    const files: { [path: string]: string } = {};
    const fileTypes: { [extension: string]: number } = {};
    const directories = new Set<string>();
    
    // Fetch file contents
    for (const file of filesToFetch) {
      try {
        const response = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: file.path,
        });

        if ('content' in response.data && response.data.content) {
          const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
          files[file.path] = content;
          
          // Track file types
          const extension = file.path.split('.').pop()?.toLowerCase() || 'no-extension';
          fileTypes[extension] = (fileTypes[extension] || 0) + 1;
          
          // Track directories
          const dir = file.path.split('/').slice(0, -1).join('/');
          if (dir) directories.add(dir);
        }
      } catch (error) {
        console.log(`Error fetching ${file.path} from ${owner}/${repo}:`, error);
        files[file.path] = `Error: Could not fetch ${file.path}`;
      }
      
      // Add small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Get all directories from tree
    const allDirectories = treeItems
      .filter(item => item.type === 'tree')
      .map(item => item.path)
      .sort();
    
    const structure = treeItems.map(item => 
      item.type === 'tree' ? `${item.path}/` : item.path
    ).sort();
    
    console.log(`Fetched ${Object.keys(files).length} files from ${owner}/${repo}`);
    
    return {
      files,
      structure,
      summary: {
        totalFiles: Object.keys(files).length,
        fileTypes,
        directories: allDirectories,
      },
    };
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
   * Create analysis prompt for the AI with comprehensive repository data
   */
  private createAnalysisPrompt(owner: string, repo: string, context: RepoContext): string {
    const fileList = Object.keys(context.files).slice(0, 20).join(', ');
    const remainingCount = Math.max(0, Object.keys(context.files).length - 20);
    
    return `Analyze the following GitHub repository for developer experience and provide a scorecard:

Repository: ${owner}/${repo}

Repository Summary:
- Total files analyzed: ${context.summary.totalFiles}
- File types: ${Object.entries(context.summary.fileTypes).map(([ext, count]) => `${ext} (${count})`).join(', ')}
- Main directories: ${context.summary.directories.slice(0, 10).join(', ')}${context.summary.directories.length > 10 ? `... and ${context.summary.directories.length - 10} more` : ''}

Repository Structure:
${context.structure.slice(0, 30).join('\n')}${context.structure.length > 30 ? `\n... and ${context.structure.length - 30} more files/directories` : ''}

Key Files Content:
${Object.entries(context.files).slice(0, 10).map(([path, content]) => 
  `=== ${path} ===
${content.length > 2000 ? content.substring(0, 2000) + '\n... (truncated)' : content}
`).join('\n')}

Additional Files: ${fileList}${remainingCount > 0 ? ` and ${remainingCount} more files` : ''}

Please analyze this repository comprehensively and provide a JSON response with the following structure:
{
  "score": <number between 0-100>,
  "color": "<red|yellow|green>",
  "analysis": "<detailed analysis of the repository's developer experience covering all aspects>",
  "recommendations": ["<actionable recommendation 1>", "<actionable recommendation 2>", ...]
}

Consider these aspects in your analysis:
- **Documentation quality**: README, API docs, inline comments, examples
- **Project structure**: File organization, naming conventions, modularity
- **Development setup**: Dependency management, build scripts, environment setup
- **Testing**: Unit tests, integration tests, test coverage, testing framework
- **CI/CD automation**: Build pipelines, automated testing, deployment scripts
- **Security practices**: Dependency scanning, secrets management, security configurations
- **Code quality**: Linting, formatting, code style consistency, complexity
- **Community features**: Issue templates, PR templates, contributing guidelines, code of conduct
- **Technology choices**: Modern frameworks, best practices, maintainability
- **Configuration management**: Environment configs, build configurations, deployment configs

Scoring guide:
- 0-40: Red (Poor developer experience, major issues across multiple areas)
- 41-70: Yellow (Moderate developer experience, room for improvement in several areas)  
- 71-100: Green (Good developer experience, well-maintained with minor improvements needed)

Provide specific, actionable recommendations based on what you observe in the actual files and structure.`;
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