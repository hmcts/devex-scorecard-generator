import { Octokit } from '@octokit/rest';
import { 
  GitHubRepositoryService, 
  RepositoryMetadata, 
  CommitInfo, 
  PullRequestInfo, 
  IssueInfo, 
  DirectoryStructure 
} from './github-repository';

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
  repositoryInfo?: RepositoryMetadata;
  
  // Recent activity
  recentCommits?: CommitInfo[];
  
  // Pull request info
  openPullRequests?: PullRequestInfo[];
  
  // Issues info
  recentIssues?: IssueInfo[];
  
  // Directory structure summary
  directoryStructure?: DirectoryStructure;
  
  [key: string]: any;
}

/**
 * Service responsible for aggregating comprehensive repository context
 */
export class RepositoryContextService {
  private githubRepoService: GitHubRepositoryService;

  constructor(octokit: Octokit) {
    this.githubRepoService = new GitHubRepositoryService(octokit);
  }

  /**
   * Fetch comprehensive repository context from GitHub
   */
  public async fetchRepoContext(
    owner: string,
    repo: string
  ): Promise<RepoContext> {
    console.log(`Fetching comprehensive repository context for ${owner}/${repo}`);
    
    const context: RepoContext = {} as RepoContext;

    // Define file categories
    const coreFiles = ['README.md', 'CODEOWNERS', '.gitignore'];
    const optionalDocs = [
      'CONTRIBUTING.md',
      'CODE_OF_CONDUCT.md',
      'SECURITY.md',
      'LICENSE',
      'LICENSE.md',
      'LICENSE.txt',
    ];
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
    const infraFiles = [
      'Dockerfile',
      'docker-compose.yml',
      'docker-compose.yaml',
      '.dockerignore',
    ];
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
    const devFiles = [
      '.env.example',
      'Vagrantfile',
      '.devcontainer/devcontainer.json',
      'devcontainer.json',
    ];
    const githubFiles = [
      '.github/PULL_REQUEST_TEMPLATE.md',
    ];

    // Fetch all files in parallel
    const allFiles = [...coreFiles, ...optionalDocs, ...configFiles, ...infraFiles, ...testingFiles, ...devFiles, ...githubFiles];
    const fileResults = await this.githubRepoService.fetchFiles(owner, repo, allFiles);
    
    // Process file results
    fileResults.forEach(({ filename, content }) => {
      if (content !== null) {
        context[filename] = content;
      }
    });

    // Fetch additional GitHub-specific data in parallel
    const [
      workflowInfo,
      issueTemplates,
      repositoryInfo,
      recentCommits,
      openPullRequests,
      recentIssues,
      directoryStructure
    ] = await Promise.all([
      this.githubRepoService.fetchWorkflowInfo(owner, repo),
      this.githubRepoService.fetchIssueTemplates(owner, repo),
      this.githubRepoService.fetchRepositoryMetadata(owner, repo),
      this.githubRepoService.fetchRecentCommits(owner, repo, 5),
      this.githubRepoService.fetchOpenPullRequests(owner, repo),
      this.githubRepoService.fetchRecentIssues(owner, repo),
      this.githubRepoService.analyzeDirectoryStructure(owner, repo)
    ]);

    // Add workflow information
    Object.assign(context, workflowInfo);
    
    // Add issue templates if found
    if (issueTemplates) {
      context['.github/ISSUE_TEMPLATE'] = issueTemplates;
    }

    // Add aggregated data
    context.repositoryInfo = repositoryInfo || undefined;
    context.recentCommits = recentCommits;
    context.openPullRequests = openPullRequests;
    context.recentIssues = recentIssues;
    context.directoryStructure = directoryStructure;

    console.log(`Repository context fetching completed. Found ${Object.keys(context).length} pieces of information.`);
    
    return context;
  }
}