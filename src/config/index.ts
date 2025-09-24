import 'dotenv/config';

export interface AppConfig {
  port: number;
  nodeEnv: string;
  githubAppId: string;
  githubPrivateKeyPath: string;
  webhookSecret: string;
  homeDirectory: string;
}

export function getConfig(): AppConfig {
  const requiredEnvVars = ['GITHUB_APP_ID', 'GITHUB_PRIVATE_KEY_PATH'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0 && process.env.NODE_ENV !== 'test') {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  return {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    githubAppId: process.env.GITHUB_APP_ID || '',
    githubPrivateKeyPath: process.env.GITHUB_PRIVATE_KEY_PATH || '',
    webhookSecret: process.env.WEBHOOK_SECRET || 'test-secret-for-development',
    homeDirectory: process.env.HOME || '',
  };
}

export const config = getConfig();