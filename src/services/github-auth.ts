import * as fs from 'fs';
import * as path from 'path';
import { Octokit } from '@octokit/rest';
import { createAppAuth } from '@octokit/auth-app';
import { config } from '../config';

/**
 * Service responsible for GitHub authentication and Octokit instance management
 */
export class GitHubAuthService {
  private static instance: GitHubAuthService;
  private octokit: Octokit | undefined;

  private constructor() {
    this.initializeOctokit();
  }

  public static getInstance(): GitHubAuthService {
    if (!GitHubAuthService.instance) {
      GitHubAuthService.instance = new GitHubAuthService();
    }
    return GitHubAuthService.instance;
  }

  /**
   * Get the private key for GitHub App authentication
   */
  public getPrivateKey(): string {
    // Return mock key for test environment
    if (config.nodeEnv === 'test') {
      return 'mocked-private-key';
    }
    
    if (!config.githubPrivateKeyPath) {
      throw new Error('GITHUB_PRIVATE_KEY_PATH environment variable is required');
    }
    
    // Resolve home directory if path starts with ~
    const resolvedPath = config.githubPrivateKeyPath.startsWith('~') 
      ? path.join(config.homeDirectory, config.githubPrivateKeyPath.slice(1))
      : config.githubPrivateKeyPath;
        
    try {
      return fs.readFileSync(resolvedPath, 'utf8');
    } catch (error) {
      throw new Error(`Failed to read private key from ${resolvedPath}: ${error}`);
    }
  }

  /**
   * Initialize the global Octokit instance
   */
  private initializeOctokit(): void {
    try {
      this.octokit = new Octokit({
        authStrategy: createAppAuth,
        auth: {
          appId: config.githubAppId,
          privateKey: this.getPrivateKey(),
        },
      });
    } catch (error) {
      if (config.nodeEnv !== 'test') {
        console.error('Failed to initialize Octokit:', error);
      }
    }
  }

  /**
   * Get the global Octokit instance
   */
  public getOctokit(): Octokit | undefined {
    return this.octokit;
  }

  /**
   * Get an installation-specific Octokit instance
   */
  public async getInstallationOctokit(installationId: number): Promise<Octokit> {
    return new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: config.githubAppId,
        privateKey: this.getPrivateKey(),
        installationId: installationId,
      },
    });
  }
}