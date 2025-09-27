import { Octokit } from '@octokit/rest';
import { Repository, Issue, AgentConfig } from '../types';
import { DEVEX_SCORECARD_TEMPLATE, generateScorecardRerunComment } from './scorecard-template';
import { generateAIScorecardTemplate, generateAIScorecardRerunComment } from './ai-scorecard-template';
import { GitHubAuthService } from './github-auth';
import { AgentService } from './agent';
import { ScoringConfigService } from './scoring-config';

/**
 * Service responsible for managing DevEx Scorecard issues
 * 
 * Follows SRP by focusing solely on GitHub issue management for scorecards
 */
export class IssueManagerService {
  private githubAuth: GitHubAuthService;
  private agentService?: AgentService;
  private azureConfig?: AgentConfig;

  constructor(azureConfig?: AgentConfig) {
    this.githubAuth = GitHubAuthService.getInstance();
    this.azureConfig = azureConfig;
    
    // Initialize AI agent service if Azure configuration is provided
    if (azureConfig) {
      this.agentService = new AgentService(azureConfig);
    }
  }

  /**
   * Get scoring configuration service
   */
  private getScoringConfig(): ScoringConfigService {
    return new ScoringConfigService(this.azureConfig?.scoringConfig);
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
   * Create a new DevEx Scorecard issue with AI analysis
   */
  public async createAIScorecardIssue(octokitInstance: Octokit, repository: Repository): Promise<any> {
    console.log(`Creating new AI-powered scorecard issue for ${repository.full_name}`);
    
    let issueBody = DEVEX_SCORECARD_TEMPLATE; // Fallback to static template
    
    if (this.agentService) {
      try {
        const aiResult = await this.agentService.generateScorecard(
          octokitInstance,
          repository.owner.login,
          repository.name
        );
        issueBody = generateAIScorecardTemplate(aiResult, this.getScoringConfig());
        console.log(`AI analysis completed for ${repository.full_name} - Score: ${aiResult.score}`);
      } catch (error) {
        console.error(`AI analysis failed for ${repository.full_name}, using static template:`, error);
      }
    } else {
      console.log(`AI service not configured, using static template for ${repository.full_name}`);
    }
    
    const issue = await octokitInstance.rest.issues.create({
      owner: repository.owner.login,
      repo: repository.name,
      title: '🎯 DevEx Scorecard',
      body: issueBody,
      labels: ['devex-scorecard', 'documentation']
    });

    console.log(`Created issue #${issue.data.number} for ${repository.full_name}`);
    return issue.data;
  }

  /**
   * Update an existing DevEx Scorecard issue with AI analysis
   */
  public async updateAIScorecardIssue(
    octokitInstance: Octokit, 
    repository: Repository, 
    issueNumber: number,
    reopenIfClosed: boolean = true
  ): Promise<any> {
    console.log(`Updating existing scorecard issue #${issueNumber} for ${repository.full_name} with AI analysis`);
    
    let issueBody = DEVEX_SCORECARD_TEMPLATE; // Fallback to static template
    
    if (this.agentService) {
      try {
        const aiResult = await this.agentService.generateScorecard(
          octokitInstance,
          repository.owner.login,
          repository.name
        );
        issueBody = generateAIScorecardTemplate(aiResult, this.getScoringConfig());
        console.log(`AI analysis completed for ${repository.full_name} - Score: ${aiResult.score}`);
      } catch (error) {
        console.error(`AI analysis failed for ${repository.full_name}, using static template:`, error);
      }
    } else {
      console.log(`AI service not configured, using static template for ${repository.full_name}`);
    }
    
    const updateData: any = {
      owner: repository.owner.login,
      repo: repository.name,
      issue_number: issueNumber,
      title: '🎯 DevEx Scorecard',
      body: issueBody,
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
          return await this.updateAIScorecardIssue(octokitInstance, repository, existingIssue.number);
        } else {
          console.log(`Existing scorecard issue #${existingIssue.number} is already open for ${repository.full_name}. Skipping creation.`);
          return existingIssue;
        }
      } else {
        return await this.createAIScorecardIssue(octokitInstance, repository);
      }
    } catch (error) {
      console.error(`Error creating/updating scorecard issue for ${repository.full_name}:`, error);
      throw error;
    }
  }

  /**
   * Handle scorecard re-run request from issue edit with AI analysis
   */
  public async handleScorecardRerun(
    repository: Repository, 
    issue: Issue, 
    installationId: number
  ): Promise<void> {
    console.log('Re-run AI scorecard requested');

    // Get installation-specific Octokit instance
    const installationOctokit = await this.githubAuth.getInstallationOctokit(installationId);
    
    let issueBody = DEVEX_SCORECARD_TEMPLATE;
    let commentBody = generateScorecardRerunComment();
    
    if (this.agentService) {
      try {
        const aiResult = await this.agentService.generateScorecard(
          installationOctokit,
          repository.owner.login,
          repository.name
        );
        issueBody = generateAIScorecardTemplate(aiResult, this.getScoringConfig());
        commentBody = generateAIScorecardRerunComment(aiResult, this.getScoringConfig());
        console.log(`AI re-analysis completed for ${repository.full_name} - Score: ${aiResult.score}`);
      } catch (error) {
        console.error(`AI re-analysis failed for ${repository.full_name}, using static template:`, error);
      }
    } else {
      console.log(`AI service not configured, using static template for ${repository.full_name}`);
    }
    
    // Regenerate the scorecard by updating the issue with fresh analysis
    await installationOctokit.rest.issues.update({
      owner: repository.owner.login,
      repo: repository.name,
      issue_number: issue.number,
      body: issueBody
    });

    // Add a comment indicating the re-run
    await installationOctokit.rest.issues.createComment({
      owner: repository.owner.login,
      repo: repository.name,
      issue_number: issue.number,
      body: commentBody
    });
  }

  /**
   * Create a new DevEx Scorecard issue (legacy method without AI)
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
   * Update an existing DevEx Scorecard issue (legacy method without AI)
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
}