import { DefaultAzureCredential } from '@azure/identity';
import { AIProjectClient } from '@azure/ai-projects';
import { AgentsClient, Agent } from '@azure/ai-agents';
import { Octokit } from '@octokit/rest';

export interface ScorecardResult {
  score: number;
  color: 'red' | 'yellow' | 'green';
  analysis: string;
  recommendations: string[];
}

export interface AgentConfig {
  projectEndpoint: string;
  deploymentName: string;
  apiKey?: string;
  apiVersion?: string;
  agentId?: string;
}

export interface RepoContext {
  // Core documentation files
  'README.md': string;
  'CODEOWNERS': string;
  'CONTRIBUTING.md'?: string;
  'CODE_OF_CONDUCT.md'?: string;
  'SECURITY.md'?: string;
  'LICENSE'?: string;
  
  // Project configuration files
  'package.json'?: string;
  'composer.json'?: string;
  'requirements.txt'?: string;
  'Pipfile'?: string;
  'pom.xml'?: string;
  'build.gradle'?: string;
  'Cargo.toml'?: string;
  'go.mod'?: string;
  
  // CI/CD and automation
  '.github/workflows'?: string; // Directory listing
  'Dockerfile'?: string;
  'docker-compose.yml'?: string;
  '.dockerignore'?: string;
  
  // Testing and quality
  'jest.config.js'?: string;
  'jest.config.ts'?: string;
  'pytest.ini'?: string;
  'phpunit.xml'?: string;
  '.eslintrc.json'?: string;
  '.eslintrc.js'?: string;
  'tslint.json'?: string;
  'sonar-project.properties'?: string;
  
  // Development environment
  '.gitignore': string;
  '.env.example'?: string;
  'Vagrantfile'?: string;
  'devcontainer.json'?: string;
  
  // Issue and PR templates
  '.github/ISSUE_TEMPLATE'?: string;
  '.github/PULL_REQUEST_TEMPLATE.md'?: string;
  
  // Repository metadata
  repositoryInfo?: {
    description: string;
    topics: string[];
    language: string;
    size: number;
    stargazers_count: number;
    forks_count: number;
    open_issues_count: number;
    has_wiki: boolean;
    has_pages: boolean;
    has_projects: boolean;
    archived: boolean;
    disabled: boolean;
    visibility: string;
    default_branch: string;
    created_at: string;
    updated_at: string;
    pushed_at: string;
    license?: {
      key: string;
      name: string;
    };
  };
  
  // Recent activity
  recentCommits?: Array<{
    sha: string;
    message: string;
    author: string;
    date: string;
  }>;
  
  // Pull request info
  openPullRequests?: Array<{
    number: number;
    title: string;
    created_at: string;
    labels: string[];
  }>;
  
  // Issues info
  recentIssues?: Array<{
    number: number;
    title: string;
    state: string;
    created_at: string;
    labels: string[];
  }>;
  
  // Directory structure summary
  directoryStructure?: {
    rootFiles: string[];
    directories: string[];
    testDirectories: string[];
    docsDirectories: string[];
  };
  
  [key: string]: any;
}

/**
 * Service for interacting with Azure AI Foundry to generate DevEx scorecards
 */
export class AgentService {
  private projectClient: AIProjectClient;
  private agentsClient: AgentsClient | null = null;
  private deploymentName: string;
  private apiVersion: string;
  private agentId?: string;

  constructor(config: AgentConfig) {
    this.deploymentName = config.deploymentName;
    this.apiVersion = config.apiVersion || '2024-12-01-preview';
    this.agentId = config.agentId;

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
    const instructions = `You are a senior software engineering consultant specializing in developer experience (DevEx) evaluation. You analyze GitHub repositories comprehensively to assess how easy and pleasant it is for developers to contribute to and work with a project.

Your expertise covers:
- Repository structure and organization best practices
- Documentation quality and completeness  
- Development workflow optimization
- CI/CD pipeline evaluation
- Testing strategies and coverage
- Security practices and vulnerability management
- Community building and collaboration tools
- Onboarding experience for new contributors
- Maintenance practices and project health indicators

You provide detailed, constructive analysis with specific, actionable recommendations that will have measurable impact on developer productivity and satisfaction. Your scoring is calibrated against industry best practices and real-world project examples.

When analyzing a repository, always respond with valid JSON in this exact format:
{
  "score": <number between 0-100>,
  "color": "<red|yellow|green>",
  "analysis": "<detailed multi-paragraph analysis>",
  "recommendations": ["<specific actionable recommendation 1>", "<specific actionable recommendation 2>", ...]
}

Use this scoring guide:
- 90-100 (Green): Excellent developer experience, comprehensive setup, very well maintained
- 80-89 (Green): Very good developer experience, minor improvements possible  
- 70-79 (Green): Good developer experience, some areas for enhancement
- 60-69 (Yellow): Moderate developer experience, several improvement opportunities
- 50-59 (Yellow): Below average developer experience, needs attention
- 40-49 (Yellow): Poor developer experience, significant issues present
- 0-39 (Red): Very poor developer experience, major overhaul needed`;

    return await agentsClient.createAgent(this.deploymentName, {
      name: 'DevEx Scorecard Analyzer',
      description: 'Analyzes GitHub repositories to generate developer experience scorecards',
      instructions,
      responseFormat: { type: 'json_object' }
    });
  }

  /**
   * Fetch file content from GitHub repository
   */
  private async fetchFileFromGitHub(
    octokit: Octokit,
    owner: string,
    repo: string,
    filename: string
  ): Promise<string | null> {
    try {
      const response = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: filename,
      });

      if ('content' in response.data && response.data.content) {
        return Buffer.from(response.data.content, 'base64').toString('utf-8');
      }

      return null;
    } catch (error) {
      console.log(`File ${filename} not found in ${owner}/${repo}`);
      return null;
    }
  }

  /**
   * Fetch directory listing from GitHub repository
   */
  private async fetchDirectoryFromGitHub(
    octokit: Octokit,
    owner: string,
    repo: string,
    path: string
  ): Promise<string[]> {
    try {
      const response = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
      });

      if (Array.isArray(response.data)) {
        return response.data.map(item => item.name);
      }

      return [];
    } catch (error) {
      console.log(`Directory ${path} not found in ${owner}/${repo}`);
      return [];
    }
  }

  /**
   * Fetch repository metadata
   */
  private async fetchRepositoryInfo(
    octokit: Octokit,
    owner: string,
    repo: string
  ): Promise<any> {
    try {
      const response = await octokit.rest.repos.get({
        owner,
        repo,
      });

      return {
        description: response.data.description,
        topics: response.data.topics || [],
        language: response.data.language,
        size: response.data.size,
        stargazers_count: response.data.stargazers_count,
        forks_count: response.data.forks_count,
        open_issues_count: response.data.open_issues_count,
        has_wiki: response.data.has_wiki,
        has_pages: response.data.has_pages,
        has_projects: response.data.has_projects,
        archived: response.data.archived,
        disabled: response.data.disabled,
        visibility: response.data.visibility,
        default_branch: response.data.default_branch,
        created_at: response.data.created_at,
        updated_at: response.data.updated_at,
        pushed_at: response.data.pushed_at,
        license: response.data.license ? {
          key: response.data.license.key,
          name: response.data.license.name,
        } : undefined,
      };
    } catch (error) {
      console.error(`Error fetching repository info for ${owner}/${repo}:`, error);
      return null;
    }
  }

  /**
   * Fetch recent commits
   */
  private async fetchRecentCommits(
    octokit: Octokit,
    owner: string,
    repo: string,
    count: number = 10
  ): Promise<any[]> {
    try {
      const response = await octokit.rest.repos.listCommits({
        owner,
        repo,
        per_page: count,
      });

      return response.data.map(commit => ({
        sha: commit.sha.substring(0, 7),
        message: commit.commit.message.split('\n')[0], // First line only
        author: commit.commit.author?.name || 'Unknown',
        date: commit.commit.author?.date,
      }));
    } catch (error) {
      console.error(`Error fetching commits for ${owner}/${repo}:`, error);
      return [];
    }
  }

  /**
   * Fetch open pull requests
   */
  private async fetchOpenPullRequests(
    octokit: Octokit,
    owner: string,
    repo: string
  ): Promise<any[]> {
    try {
      const response = await octokit.rest.pulls.list({
        owner,
        repo,
        state: 'open',
        per_page: 10,
      });

      return response.data.map(pr => ({
        number: pr.number,
        title: pr.title,
        created_at: pr.created_at,
        labels: pr.labels.map(label => label.name),
      }));
    } catch (error) {
      console.error(`Error fetching pull requests for ${owner}/${repo}:`, error);
      return [];
    }
  }

  /**
   * Fetch recent issues
   */
  private async fetchRecentIssues(
    octokit: Octokit,
    owner: string,
    repo: string
  ): Promise<any[]> {
    try {
      const response = await octokit.rest.issues.listForRepo({
        owner,
        repo,
        state: 'all',
        per_page: 10,
        sort: 'updated',
      });

      return response.data
        .filter(issue => !issue.pull_request) // Filter out PRs
        .map(issue => ({
          number: issue.number,
          title: issue.title,
          state: issue.state,
          created_at: issue.created_at,
          labels: issue.labels.map(label => typeof label === 'string' ? label : label.name),
        }));
    } catch (error) {
      console.error(`Error fetching issues for ${owner}/${repo}:`, error);
      return [];
    }
  }

  /**
   * Analyze directory structure
   */
  private async analyzeDirectoryStructure(
    octokit: Octokit,
    owner: string,
    repo: string
  ): Promise<any> {
    try {
      const rootContents = await this.fetchDirectoryFromGitHub(octokit, owner, repo, '');
      
      const directories = rootContents.filter(name => 
        !name.includes('.') || 
        name.startsWith('.github') || 
        name.startsWith('.vscode')
      );
      
      const rootFiles = rootContents.filter(name => 
        name.includes('.') && 
        !name.startsWith('.github') && 
        !name.startsWith('.vscode')
      );

      const testDirectories = directories.filter(dir => 
        dir.toLowerCase().includes('test') || 
        dir.toLowerCase().includes('spec') ||
        dir === '__tests__'
      );

      const docsDirectories = directories.filter(dir => 
        dir.toLowerCase().includes('doc') || 
        dir.toLowerCase().includes('guide') ||
        dir === 'docs' ||
        dir === 'documentation'
      );

      return {
        rootFiles,
        directories,
        testDirectories,
        docsDirectories,
      };
    } catch (error) {
      console.error(`Error analyzing directory structure for ${owner}/${repo}:`, error);
      return {
        rootFiles: [],
        directories: [],
        testDirectories: [],
        docsDirectories: [],
      };
    }
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
    
    const context: RepoContext = {} as RepoContext;

    // Core documentation files (required)
    const coreFiles = ['README.md', 'CODEOWNERS', '.gitignore'];
    
    // Optional documentation files
    const optionalDocs = [
      'CONTRIBUTING.md',
      'CODE_OF_CONDUCT.md',
      'SECURITY.md',
      'LICENSE',
      'LICENSE.md',
      'LICENSE.txt',
    ];

    // Project configuration files
    const configFiles = [
      'package.json',
      'composer.json',
      'requirements.txt',
      'Pipfile',
      'pom.xml',
      'build.gradle',
      'Cargo.toml',
      'go.mod',
    ];

    // CI/CD and Docker files
    const infraFiles = [
      'Dockerfile',
      'docker-compose.yml',
      'docker-compose.yaml',
      '.dockerignore',
    ];

    // Testing and quality configuration
    const testingFiles = [
      'jest.config.js',
      'jest.config.ts',
      'pytest.ini',
      'phpunit.xml',
      '.eslintrc.json',
      '.eslintrc.js',
      'tslint.json',
      'sonar-project.properties',
      'codecov.yml',
      '.travis.yml',
    ];

    // Development environment files
    const devFiles = [
      '.env.example',
      'Vagrantfile',
      '.devcontainer/devcontainer.json',
      'devcontainer.json',
    ];

    // GitHub specific files
    const githubFiles = [
      '.github/PULL_REQUEST_TEMPLATE.md',
    ];

    // Fetch all files
    const allFiles = [...coreFiles, ...optionalDocs, ...configFiles, ...infraFiles, ...testingFiles, ...devFiles, ...githubFiles];
    
    console.log(`Fetching ${allFiles.length} potential files...`);
    
    // Fetch files in parallel for better performance
    const filePromises = allFiles.map(async (filename) => {
      const content = await this.fetchFileFromGitHub(octokit, owner, repo, filename);
      return { filename, content };
    });

    const fileResults = await Promise.all(filePromises);
    
    // Process results
    fileResults.forEach(({ filename, content }) => {
      if (content !== null) {
        context[filename] = content;
      }
    });

    // Fetch GitHub workflow files
    console.log('Fetching GitHub workflows...');
    const workflowFiles = await this.fetchDirectoryFromGitHub(octokit, owner, repo, '.github/workflows');
    if (workflowFiles.length > 0) {
      context['.github/workflows'] = `GitHub Actions workflows found: ${workflowFiles.join(', ')}`;
      
      // Fetch content of up to 3 workflow files for analysis
      const workflowPromises = workflowFiles.slice(0, 3).map(async (workflowFile) => {
        const content = await this.fetchFileFromGitHub(octokit, owner, repo, `.github/workflows/${workflowFile}`);
        return { workflowFile, content };
      });
      
      const workflowResults = await Promise.all(workflowPromises);
      workflowResults.forEach(({ workflowFile, content }) => {
        if (content !== null) {
          context[`.github/workflows/${workflowFile}`] = content;
        }
      });
    }

    // Fetch issue templates
    console.log('Fetching issue templates...');
    const issueTemplates = await this.fetchDirectoryFromGitHub(octokit, owner, repo, '.github/ISSUE_TEMPLATE');
    if (issueTemplates.length > 0) {
      context['.github/ISSUE_TEMPLATE'] = `Issue templates found: ${issueTemplates.join(', ')}`;
    }

    // Fetch repository metadata
    console.log('Fetching repository metadata...');
    context.repositoryInfo = await this.fetchRepositoryInfo(octokit, owner, repo);

    // Fetch recent commits
    console.log('Fetching recent commits...');
    context.recentCommits = await this.fetchRecentCommits(octokit, owner, repo, 5);

    // Fetch open pull requests
    console.log('Fetching pull requests...');
    context.openPullRequests = await this.fetchOpenPullRequests(octokit, owner, repo);

    // Fetch recent issues
    console.log('Fetching recent issues...');
    context.recentIssues = await this.fetchRecentIssues(octokit, owner, repo);

    // Analyze directory structure
    console.log('Analyzing directory structure...');
    context.directoryStructure = await this.analyzeDirectoryStructure(octokit, owner, repo);

    console.log(`Repository context fetching completed. Found ${Object.keys(context).length} pieces of information.`);
    
    return context;
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

      // Fetch repository context
      const context = await this.fetchRepoContext(octokit, owner, repo);

      // Create the analysis prompt for the agent
      const prompt = this.createAnalysisPrompt(owner, repo, context);

      // Get the AI agent
      const agent = await this.getOrCreateAgent();
      const agentsClient = await this.getAgentsClient();

      console.log(`Using agent ${agent.id} for analysis`);

      // Create a thread for this analysis
      const thread = await agentsClient.threads.create();

      // Add the repository context as a message to the thread
      await agentsClient.messages.create(thread.id, 'user', prompt);

      // Create and execute a run with polling
      const runPoller = agentsClient.runs.createAndPoll(thread.id, agent.id, {
        maxCompletionTokens: 2500,
        temperature: 0.2
      });

      // Wait for completion
      const completedRun = await runPoller.pollUntilDone();
      
      if (completedRun.status !== 'completed') {
        throw new Error(`Agent run failed with status: ${completedRun.status}`);
      }

      // Get the messages from the thread to find the agent's response
      const messages = agentsClient.messages.list(thread.id);
      let agentResponse: string | null = null;
      
      for await (const message of messages) {
        if (message.role === 'assistant' && message.content && message.content.length > 0) {
          const content = message.content[0];
          if (content.type === 'text' && 'text' in content) {
            agentResponse = (content as any).text.value;
            break;
          }
        }
      }

      if (!agentResponse) {
        throw new Error('No response from AI agent');
      }

      // Parse the AI response
      const result = this.parseAIResponse(agentResponse);
      
      // Clean up the thread (optional)
      try {
        await agentsClient.threads.delete(thread.id);
      } catch (cleanupError) {
        console.warn('Failed to cleanup thread:', cleanupError);
      }

      return result;

    } catch (error) {
      console.error(`Error generating scorecard for ${owner}/${repo}:`, error);
      throw error;
    }
  }

  /**
   * Create comprehensive analysis prompt for the AI
   */
  private createAnalysisPrompt(owner: string, repo: string, context: RepoContext): string {
    const formatContent = (key: string, value: any): string => {
      if (typeof value === 'string') {
        // Truncate very long files to avoid token limits
        return value.length > 2000 ? `${value.substring(0, 2000)}\n... (truncated, ${value.length} total characters)` : value;
      } else if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value, null, 2);
      }
      return String(value);
    };

    // Separate different types of information
    const coreFiles = Object.entries(context)
      .filter(([key]) => !key.includes('/') && typeof context[key] === 'string' && !key.startsWith('.'))
      .map(([key, value]) => `=== ${key} ===\n${formatContent(key, value)}`);

    const configFiles = Object.entries(context)
      .filter(([key]) => key.includes('.json') || key.includes('.yml') || key.includes('.yaml') || key.includes('.toml') || key.includes('.xml'))
      .map(([key, value]) => `=== ${key} ===\n${formatContent(key, value)}`);

    const githubFiles = Object.entries(context)
      .filter(([key]) => key.startsWith('.github/'))
      .map(([key, value]) => `=== ${key} ===\n${formatContent(key, value)}`);

    return `Analyze the following GitHub repository for developer experience and provide a comprehensive scorecard:

Repository: ${owner}/${repo}

## Repository Metadata
${context.repositoryInfo ? formatContent('Repository Info', context.repositoryInfo) : 'No repository metadata available'}

## Directory Structure
${context.directoryStructure ? formatContent('Directory Structure', context.directoryStructure) : 'No directory structure available'}

## Recent Activity
${context.recentCommits ? `Recent Commits:\n${formatContent('Recent Commits', context.recentCommits)}` : ''}

${context.openPullRequests ? `Open Pull Requests:\n${formatContent('Open Pull Requests', context.openPullRequests)}` : ''}

${context.recentIssues ? `Recent Issues:\n${formatContent('Recent Issues', context.recentIssues)}` : ''}

## Core Documentation Files
${coreFiles.join('\n\n')}

## Configuration Files
${configFiles.join('\n\n')}

## GitHub Integration Files
${githubFiles.join('\n\n')}

Please analyze this repository and provide your assessment as JSON.`;
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