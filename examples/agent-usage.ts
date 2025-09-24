/**
 * Example showing how to use the AgentService for programmatic scorecard generation
 */

import { AgentService } from '../src/services/agent';
import { Octokit } from '@octokit/rest';

async function generateScorecardExample() {
  // Initialize the agent service with Azure OpenAI configuration
  const agentService = new AgentService({
    endpoint: 'https://your-resource.openai.azure.com/',
    deploymentName: 'gpt-4',
    // Option 1: Use API key
    apiKey: 'your-api-key',
    // Option 2: For Azure CLI auth (local development), omit apiKey
    // Option 3: For managed identity (production), omit apiKey
    apiVersion: '2024-10-21', // Optional, defaults to 2024-10-21
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
    endpoint: process.env.AZURE_OPENAI_ENDPOINT!,
    deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME!,
    apiKey: process.env.AZURE_OPENAI_API_KEY, // Optional - uses Azure auth if not provided
    apiVersion: process.env.AZURE_OPENAI_API_VERSION,
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

// Example showing Azure CLI authentication setup for local development
async function setupLocalDevelopment() {
  console.log('🔧 Setting up local development with Azure CLI authentication:');
  console.log('');
  console.log('1. Install Azure CLI: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli');
  console.log('2. Run: az login');
  console.log('3. Ensure your account has "Cognitive Services OpenAI User" role on the Azure OpenAI resource');
  console.log('4. Set environment variables (without AZURE_OPENAI_API_KEY):');
  console.log('   AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/');
  console.log('   AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4');
  console.log('');
  console.log('The AgentService will automatically use Azure CLI credentials!');
}

// Example showing managed identity setup for production
async function setupProductionDeployment() {
  console.log('🚀 Setting up production deployment with Managed Identity:');
  console.log('');
  console.log('1. Enable system-assigned managed identity on your Azure resource (App Service, Container Instance, etc.)');
  console.log('2. Grant the managed identity "Cognitive Services OpenAI User" role on your Azure OpenAI resource');
  console.log('3. Set environment variables (without AZURE_OPENAI_API_KEY):');
  console.log('   AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/');
  console.log('   AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4');
  console.log('');
  console.log('The AgentService will automatically use managed identity credentials!');
}

// Export functions for use in other modules
export {
  generateScorecardExample,
  batchGenerateScorecard,
  setupLocalDevelopment,
  setupProductionDeployment,
};

// Example usage (uncomment to run directly)
/*
if (require.main === module) {
  generateScorecardExample().catch(console.error);
}
*/