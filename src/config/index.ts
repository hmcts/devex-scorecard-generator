import 'dotenv/config';

export interface AppConfig {
  port: number;
  nodeEnv: string;
  githubAppId: string;
  githubPrivateKeyPath: string;
  webhookSecret: string;
  homeDirectory: string;
  azure?: {
    projectEndpoint: string;
    deploymentName: string;
    apiKey?: string;
    apiVersion?: string;
    agentId?: string;
  };
}

export function getConfig(): AppConfig {
  const requiredEnvVars = ['GITHUB_APP_ID', 'GITHUB_PRIVATE_KEY_PATH'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0 && process.env.NODE_ENV !== 'test') {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  const config: AppConfig = {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    githubAppId: process.env.GITHUB_APP_ID || '',
    githubPrivateKeyPath: process.env.GITHUB_PRIVATE_KEY_PATH || '',
    webhookSecret: process.env.WEBHOOK_SECRET || 'test-secret-for-development',
    homeDirectory: process.env.HOME || '',
  };

  // Add Azure AI Foundry configuration if available
  if (process.env.AZURE_AI_PROJECT_ENDPOINT && process.env.AZURE_AI_DEPLOYMENT_NAME) {
    config.azure = {
      projectEndpoint: process.env.AZURE_AI_PROJECT_ENDPOINT,
      deploymentName: process.env.AZURE_AI_DEPLOYMENT_NAME,
      apiKey: process.env.AZURE_AI_API_KEY,
      apiVersion: process.env.AZURE_AI_API_VERSION || '2024-12-01-preview',
      agentId: process.env.AZURE_AI_AGENT_ID,
    };
  }

  // Legacy support for existing Azure OpenAI configuration
  if (!config.azure && process.env.PROJECT_ENDPOINT && process.env.MODEL_DEPLOYMENT_NAME) {
    config.azure = {
      projectEndpoint: process.env.PROJECT_ENDPOINT,
      deploymentName: process.env.MODEL_DEPLOYMENT_NAME,
      apiKey: process.env.AZURE_AI_API_KEY,
      apiVersion: process.env.AZURE_AI_API_VERSION || '2024-12-01-preview',
      agentId: process.env.AZURE_AI_AGENT_ID,
    };
  }

  return config;
}

export const config = getConfig();