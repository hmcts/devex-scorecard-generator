import { Octokit } from '@octokit/rest';

export interface GitHubFileContent {
  filename: string;
  content: string | null;
}

export interface RepositoryMetadata {
  description: string | null;
  topics: string[];
  language: string | null;
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
}

export interface CommitInfo {
  sha: string;
  message: string;
  author: string;
  date: string;
}

export interface PullRequestInfo {
  number: number;
  title: string;
  created_at: string;
  labels: string[];
}

export interface IssueInfo {
  number: number;
  title: string;
  state: string;
  created_at: string;
  labels: string[];
}

export interface DirectoryStructure {
  rootFiles: string[];
  directories: string[];
  testDirectories: string[];
  docsDirectories: string[];
}

/**
 * Service responsible for fetching GitHub repository data
 */
export class GitHubRepositoryService {
  constructor(private octokit: Octokit) {}

  /**
   * Fetch file content from GitHub repository
   */
  public async fetchFile(
    owner: string,
    repo: string,
    filename: string
  ): Promise<string | null> {
    try {
      if (!this.octokit?.rest?.repos?.getContent) {
        console.log(`Octokit not properly configured for ${owner}/${repo}`);
        return null;
      }
      
      const response = await this.octokit.rest.repos.getContent({
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
   * Fetch multiple files in parallel
   */
  public async fetchFiles(
    owner: string,
    repo: string,
    filenames: string[]
  ): Promise<GitHubFileContent[]> {
    console.log(`Fetching ${filenames.length} files from ${owner}/${repo}...`);
    
    const filePromises = filenames.map(async (filename) => {
      const content = await this.fetchFile(owner, repo, filename);
      return { filename, content };
    });

    return await Promise.all(filePromises);
  }

  /**
   * Fetch directory listing from GitHub repository
   */
  public async fetchDirectory(
    owner: string,
    repo: string,
    path: string
  ): Promise<string[]> {
    try {
      if (!this.octokit?.rest?.repos?.getContent) {
        console.log(`Octokit not properly configured for ${owner}/${repo}`);
        return [];
      }
      
      const response = await this.octokit.rest.repos.getContent({
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
  public async fetchRepositoryMetadata(
    owner: string,
    repo: string
  ): Promise<RepositoryMetadata | null> {
    try {
      if (!this.octokit?.rest?.repos?.get) {
        console.log(`Octokit not properly configured for ${owner}/${repo}`);
        return null;
      }
      
      const response = await this.octokit.rest.repos.get({
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
        visibility: response.data.visibility || 'public',
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
      console.error(`Error fetching repository metadata for ${owner}/${repo}:`, error);
      return null;
    }
  }

  /**
   * Fetch recent commits
   */
  public async fetchRecentCommits(
    owner: string,
    repo: string,
    count: number = 10
  ): Promise<CommitInfo[]> {
    try {
      if (!this.octokit?.rest?.repos?.listCommits) {
        console.log(`Octokit not properly configured for ${owner}/${repo}`);
        return [];
      }
      
      const response = await this.octokit.rest.repos.listCommits({
        owner,
        repo,
        per_page: count,
      });

      return response.data.map(commit => ({
        sha: commit.sha.substring(0, 7),
        message: commit.commit.message.split('\n')[0], // First line only
        author: commit.commit.author?.name || 'Unknown',
        date: commit.commit.author?.date || '',
      }));
    } catch (error) {
      console.error(`Error fetching commits for ${owner}/${repo}:`, error);
      return [];
    }
  }

  /**
   * Fetch open pull requests
   */
  public async fetchOpenPullRequests(
    owner: string,
    repo: string
  ): Promise<PullRequestInfo[]> {
    try {
      if (!this.octokit?.rest?.pulls?.list) {
        console.log(`Octokit not properly configured for ${owner}/${repo}`);
        return [];
      }
      
      const response = await this.octokit.rest.pulls.list({
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
  public async fetchRecentIssues(
    owner: string,
    repo: string
  ): Promise<IssueInfo[]> {
    try {
      if (!this.octokit?.rest?.issues?.listForRepo) {
        console.log(`Octokit not properly configured for ${owner}/${repo}`);
        return [];
      }
      
      const response = await this.octokit.rest.issues.listForRepo({
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
          labels: issue.labels.map(label => typeof label === 'string' ? label : label.name).filter((name): name is string => name !== undefined),
        }));
    } catch (error) {
      console.error(`Error fetching issues for ${owner}/${repo}:`, error);
      return [];
    }
  }

  /**
   * Analyze directory structure
   */
  public async analyzeDirectoryStructure(
    owner: string,
    repo: string
  ): Promise<DirectoryStructure> {
    try {
      const rootContents = await this.fetchDirectory(owner, repo, '');
      
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
   * Fetch GitHub workflow information
   */
  public async fetchWorkflowInfo(
    owner: string,
    repo: string
  ): Promise<{ [key: string]: string }> {
    console.log('Fetching GitHub workflows...');
    const workflowFiles = await this.fetchDirectory(owner, repo, '.github/workflows');
    const workflowInfo: { [key: string]: string } = {};
    
    if (workflowFiles.length > 0) {
      workflowInfo['.github/workflows'] = `GitHub Actions workflows found: ${workflowFiles.join(', ')}`;
      
      // Fetch content of up to 3 workflow files for analysis
      const workflowPromises = workflowFiles.slice(0, 3).map(async (workflowFile) => {
        const content = await this.fetchFile(owner, repo, `.github/workflows/${workflowFile}`);
        return { workflowFile, content };
      });
      
      const workflowResults = await Promise.all(workflowPromises);
      workflowResults.forEach(({ workflowFile, content }) => {
        if (content !== null) {
          workflowInfo[`.github/workflows/${workflowFile}`] = content;
        }
      });
    }

    return workflowInfo;
  }

  /**
   * Fetch issue template information
   */
  public async fetchIssueTemplates(
    owner: string,
    repo: string
  ): Promise<string | null> {
    console.log('Fetching issue templates...');
    const issueTemplates = await this.fetchDirectory(owner, repo, '.github/ISSUE_TEMPLATE');
    
    if (issueTemplates.length > 0) {
      return `Issue templates found: ${issueTemplates.join(', ')}`;
    }
    
    return null;
  }
}