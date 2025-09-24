import 'dotenv/config';

export interface AppConfig {
  port: number;
  nodeEnv: string;
  githubAppId: string;
  githubPrivateKeyPath: string;
  webhookSecret: string;
  homeDirectory: string;
  azure?: {
    endpoint: string;
    deploymentName: string;
    apiKey?: string;
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

  // Add Azure configuration if available
  if (process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_DEPLOYMENT_NAME) {
    config.azure = {
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
      apiKey: process.env.AZURE_OPENAI_API_KEY,
    };
  }

  return config;
}

export const config = getConfig();