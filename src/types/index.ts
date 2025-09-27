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

export interface ScoreRange {
  min: number;
  max: number;
  description: string;
}

export interface ScoringRanges {
  excellent: ScoreRange;
  veryGood: ScoreRange;
  good: ScoreRange;
  moderate: ScoreRange;
  belowAverage: ScoreRange;
  poor: ScoreRange;
  veryPoor: ScoreRange;
}

export interface ScoringConfig {
  /** Threshold for green/excellent scores */
  greenThreshold: number;
  /** Threshold for yellow/moderate scores */
  yellowThreshold: number;
  /** Threshold for red/poor scores (below this) */
  redThreshold: number;
  /** Default fallback score when parsing fails */
  defaultScore: number;
  /** Score ranges with their corresponding categories and descriptions */
  ranges: ScoringRanges;
}

export interface AgentConfig {
  projectEndpoint: string;
  deploymentName: string;
  apiKey?: string;
  apiVersion?: string;
  agentId?: string;
  /** Optional custom scoring configuration */
  scoringConfig?: ScoringConfig;
}