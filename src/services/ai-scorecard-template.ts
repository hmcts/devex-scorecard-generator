import { ScorecardResult, Repository } from '../types';
import { ScoringConfigService, defaultScoringConfig } from './scoring-config';

/**
 * Create a GitHub issue URL with pre-filled title, body, and assignees
 */
function createGitHubIssueLink(repository: Repository, title: string, body: string, assignees: string[] = ['copilot']): string {
  const baseUrl = `https://github.com/${repository.full_name}/issues/new`;
  const params = new URLSearchParams({
    title,
    body,
    assignees: assignees.join(',')
  });
  
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Generate a recommendation as a GitHub issue link
 */
function formatRecommendationAsIssueLink(recommendation: string, repository: Repository, index: number): string {
  // Extract the main action from the recommendation for the title
  const title = `✨ DevEx Improvement #${index + 1}`;
  
  // Create the issue body with the full recommendation and context
  const body = `${recommendation}

---

This issue was automatically generated from the DevEx Scorecard analysis to help improve the developer experience of this repository.

**Priority:** Based on AI analysis
**Category:** Developer Experience
**Source:** DevEx Scorecard

<Copilot, please analyze this recommendation and create an implementation plan>`;

  return createGitHubIssueLink(repository, title, body);
}

/**
 * Format recommendations as a numbered list with GitHub issue links
 */
function formatRecommendationsWithLinks(recommendations: string[], repository?: Repository): string {
  if (!repository) {
    // Fallback to plain text list if no repository context
    return recommendations.map((rec, index) => `${index + 1}. ${rec}`).join('\n');
  }

  return recommendations
    .map((rec, index) => {
      const issueLink = formatRecommendationAsIssueLink(rec, repository, index);
      return `${index + 1}. ${rec}\n   👉 [Create GitHub Issue](${issueLink})`;
    })
    .join('\n\n');
}

/**
 * Generate a DevEx Scorecard issue body using AI analysis results
 */
export function generateAIScorecardTemplate(
  result: ScorecardResult, 
  scoringConfig?: ScoringConfigService, 
  repository?: Repository
): string {
  const config = scoringConfig || defaultScoringConfig;
  const colorEmoji = {
    red: '🔴',
    yellow: '🟡',
    green: '🟢'
  };

  const { category } = config.getScoreCategory(result.score);

  return `# 🎯 DevEx Scorecard

This repository has been automatically analyzed for developer experience using AI. Here are the results:

## 📊 Overall Score: ${result.score}/100 ${colorEmoji[result.color]}

**Category:** ${category}

## 🤖 AI Analysis

${result.analysis}

## 💡 Recommendations

${formatRecommendationsWithLinks(result.recommendations, repository)}

## 🔄 Actions

- [ ] **Re-run AI analysis** - Check this box to trigger a fresh AI-powered analysis

> This scorecard was generated automatically using AI analysis. Check the box above to request an updated analysis.${repository ? '\n\n**💡 Tip:** Click the "Create GitHub Issue" links above to automatically create actionable issues that Copilot can help implement!' : ''}

_Last updated: ${new Date().toISOString()}_`;
}

export function generateAIScorecardRerunComment(result: ScorecardResult): string {
  return `🔄 **AI Scorecard Analysis Completed**

The DevEx Scorecard has been refreshed with a new AI analysis:

**Score:** ${result.score}/100 ${result.color === 'green' ? '🟢' : result.color === 'yellow' ? '🟡' : '🔴'}

Please review the updated analysis and recommendations above.

_Generated at: ${new Date().toISOString()}_`;
}