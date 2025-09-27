import { RepoContext } from './repository-context';
import { ScoringConfigService, defaultScoringConfig } from './scoring-config';

/**
 * Service responsible for generating AI analysis prompts
 */
export class PromptGenerationService {
  private scoringConfig: ScoringConfigService;

  constructor(scoringConfig?: ScoringConfigService) {
    this.scoringConfig = scoringConfig || defaultScoringConfig;
  }
  /**
   * Create comprehensive analysis prompt for the AI
   */
  public createAnalysisPrompt(owner: string, repo: string, context: RepoContext): string {
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

Please analyze this repository and provide your assessment as JSON.

${this.scoringConfig.generateScoringGuide()}`;
  }
}