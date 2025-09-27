export interface Repository {
  name: string;
  full_name: string;
  owner: {
    login: string;
  };
}

export interface Issue {
  number: number;
  title: string;
  body: string;
  state?: string;
}

export interface WebhookPayload {
  action?: string;
  repository?: Repository;
  installation?: {
    id: number;
    client_id?: string;
  };
  issue?: Issue;
  repositories_added?: Array<{
    id: number;
    name: string;
    full_name: string;
    private: boolean;
  }>;
}

export interface BotInfo {
  name: string;
  description: string;
  version: string;
}

export interface HealthStatus {
  status: string;
  timestamp: string;
}

export interface ScorecardResult {
  score: number;
  color: 'red' | 'yellow' | 'green';
  analysis: string;
  recommendations: string[];
}

export interface AgentConfig {
  projectEndpoint: string;
  deploymentName: string;
  apiKey?: string;
  apiVersion?: string;
  agentId?: string;
}