/**
 * Example showing how to use the AgentService for programmatic scorecard generation with AI Foundry Agents
 */

import { AgentService } from '../src/services/agent';
import { Octokit } from '@octokit/rest';

async function generateScorecardExample() {
  // Initialize the agent service with Azure AI Foundry configuration
  const agentService = new AgentService({
    projectEndpoint: 'https://your-project.services.ai.azure.com/api/projects/your-project',
    deploymentName: 'gpt-4',
    apiKey: 'your-api-key', // or use Azure managed identity (recommended)
    agentId: 'optional-existing-agent-id' // If provided, uses existing agent instead of creating new one
  });

  // Initialize Octokit for GitHub API access
  const octokit = new Octokit({
    auth: 'your-github-token', // or use GitHub App authentication
  });

  try {
    // Generate scorecard for a repository
    const result = await agentService.generateScorecard(
      octokit,
      'owner',      // Repository owner
      'repo-name'   // Repository name
    );

    // Display results
    console.log('🎯 DevEx Scorecard Results');
    console.log('==========================');
    console.log(`Score: ${result.score}/100`);
    console.log(`Status: ${result.color.toUpperCase()}`);
    console.log('\n📊 Analysis:');
    console.log(result.analysis);
    console.log('\n💡 Recommendations:');
    result.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });

    return result;
  } catch (error) {
    console.error('Error generating scorecard:', error);
    throw error;
  }
}

// Example of batch processing multiple repositories
async function batchGenerateScorecard(repositories: Array<{owner: string, repo: string}>) {
  const agentService = new AgentService({
    projectEndpoint: process.env.AZURE_AI_PROJECT_ENDPOINT!,
    deploymentName: process.env.AZURE_AI_DEPLOYMENT_NAME!,
    apiKey: process.env.AZURE_AI_API_KEY,
    agentId: process.env.AZURE_AI_AGENT_ID, // Optional: use existing agent
  });

  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });

  const results = [];

  for (const { owner, repo } of repositories) {
    try {
      console.log(`\n🔍 Analyzing ${owner}/${repo}...`);
      const result = await agentService.generateScorecard(octokit, owner, repo);
      
      results.push({
        repository: `${owner}/${repo}`,
        score: result.score,
        color: result.color,
        analysis: result.analysis.substring(0, 100) + '...',
      });

      // Rate limiting - be respectful to the APIs
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Failed to analyze ${owner}/${repo}:`, error);
      results.push({
        repository: `${owner}/${repo}`,
        score: 0,
        color: 'red' as const,
        analysis: 'Analysis failed',
      });
    }
  }

  // Display summary
  console.log('\n📊 Batch Analysis Summary');
  console.log('=========================');
  results.forEach(result => {
    const emoji = result.color === 'green' ? '🟢' : result.color === 'yellow' ? '🟡' : '🔴';
    console.log(`${emoji} ${result.repository}: ${result.score}/100`);
  });

  return results;
}

// Export functions for use in other modules
export {
  generateScorecardExample,
  batchGenerateScorecard,
};

// Example usage (uncomment to run directly)
/*
if (require.main === module) {
  generateScorecardExample().catch(console.error);
}
*/