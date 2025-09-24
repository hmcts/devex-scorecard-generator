import { Octokit } from '@octokit/rest';
import { Repository, Issue } from '../types';
import { DEVEX_SCORECARD_TEMPLATE, generateScorecardRerunComment } from './scorecard-template';
import { GitHubAuthService } from './github-auth';

/**
 * Service responsible for managing DevEx Scorecard issues
 */
export class IssueManagerService {
  private githubAuth: GitHubAuthService;

  constructor() {
    this.githubAuth = GitHubAuthService.getInstance();
  }

  /**
   * Find existing DevEx Scorecard issue in a repository
   */
  public async findExistingScorecardIssue(octokitInstance: Octokit, repository: Repository): Promise<any | null> {
    try {
      const issues = await octokitInstance.rest.issues.listForRepo({
        owner: repository.owner.login,
        repo: repository.name,
        state: 'all',
        labels: 'devex-scorecard'
      });

      // Look for an issue with the DevEx Scorecard title
      const existingIssue = issues.data.find(issue => 
        issue.title.includes('DevEx Scorecard') || issue.title.includes('🎯 DevEx Scorecard')
      );

      return existingIssue || null;
    } catch (error) {
      console.error(`Error searching for existing scorecard issue in ${repository.full_name}:`, error);
      return null;
    }
  }

  /**
   * Create a new DevEx Scorecard issue
   */
  public async createScorecardIssue(octokitInstance: Octokit, repository: Repository): Promise<any> {
    console.log(`Creating new scorecard issue for ${repository.full_name}`);
    
    const issue = await octokitInstance.rest.issues.create({
      owner: repository.owner.login,
      repo: repository.name,
      title: '🎯 DevEx Scorecard',
      body: DEVEX_SCORECARD_TEMPLATE,
      labels: ['devex-scorecard', 'documentation']
    });

    console.log(`Created issue #${issue.data.number} for ${repository.full_name}`);
    return issue.data;
  }

  /**
   * Update an existing DevEx Scorecard issue
   */
  public async updateScorecardIssue(
    octokitInstance: Octokit, 
    repository: Repository, 
    issueNumber: number,
    reopenIfClosed: boolean = true
  ): Promise<any> {
    console.log(`Updating existing scorecard issue #${issueNumber} for ${repository.full_name}`);
    
    const updateData: any = {
      owner: repository.owner.login,
      repo: repository.name,
      issue_number: issueNumber,
      title: '🎯 DevEx Scorecard',
      body: DEVEX_SCORECARD_TEMPLATE,
      labels: ['devex-scorecard', 'documentation']
    };

    if (reopenIfClosed) {
      updateData.state = 'open';
    }

    const updatedIssue = await octokitInstance.rest.issues.update(updateData);

    console.log(`Updated issue #${issueNumber} for ${repository.full_name}`);
    return updatedIssue.data;
  }

  /**
   * Create or update a DevEx Scorecard issue
   */
  public async createOrUpdateScorecardIssue(
    repository: Repository, 
    installationId?: number, 
    forceUpdate: boolean = false
  ): Promise<any> {
    try {
      // Use installation-specific Octokit instance if installationId is provided
      const octokitInstance = installationId 
        ? await this.githubAuth.getInstallationOctokit(installationId)
        : this.githubAuth.getOctokit();
      
      if (!octokitInstance) {
        throw new Error('Octokit instance not available');
      }

      // Check if an existing scorecard issue exists
      const existingIssue = await this.findExistingScorecardIssue(octokitInstance, repository);

      if (existingIssue) {
        console.log(`Found existing scorecard issue #${existingIssue.number} for ${repository.full_name}`);
        
        if (forceUpdate || existingIssue.state === 'closed') {
          return await this.updateScorecardIssue(octokitInstance, repository, existingIssue.number);
        } else {
          console.log(`Existing scorecard issue #${existingIssue.number} is already open for ${repository.full_name}. Skipping creation.`);
          return existingIssue;
        }
      } else {
        return await this.createScorecardIssue(octokitInstance, repository);
      }
    } catch (error) {
      console.error(`Error creating/updating scorecard issue for ${repository.full_name}:`, error);
      throw error;
    }
  }

  /**
   * Handle scorecard re-run request from issue edit
   */
  public async handleScorecardRerun(
    repository: Repository, 
    issue: Issue, 
    installationId: number
  ): Promise<void> {
    console.log('Re-run scorecard requested');

    // Get installation-specific Octokit instance
    const installationOctokit = await this.githubAuth.getInstallationOctokit(installationId);
    
    // Regenerate the scorecard by updating the issue with fresh template
    await installationOctokit.rest.issues.update({
      owner: repository.owner.login,
      repo: repository.name,
      issue_number: issue.number,
      body: DEVEX_SCORECARD_TEMPLATE
    });

    // Add a comment indicating the re-run
    await installationOctokit.rest.issues.createComment({
      owner: repository.owner.login,
      repo: repository.name,
      issue_number: issue.number,
      body: generateScorecardRerunComment()
    });
  }
}