import { ScoringConfig } from '../types';

/**
 * Default scoring configuration for DevEx Scorecard
 * 
 * This configuration defines the thresholds and ranges used to determine
 * score colors, categories, and descriptions throughout the application.
 */
export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  // Color thresholds (used for visual indicators)
  greenThreshold: 70,    // Score >= 70 shows green
  yellowThreshold: 50,   // Score >= 50 shows yellow  
  redThreshold: 0,       // Score < 50 shows red
  
  // Default fallback score when parsing fails
  defaultScore: 50,
  
  // Detailed score ranges with categories and descriptions
  ranges: {
    excellent: {
      min: 90,
      max: 100,
      description: 'Excellent developer experience, comprehensive setup, very well maintained'
    },
    veryGood: {
      min: 80,
      max: 89,
      description: 'Very good developer experience, minor improvements possible'
    },
    good: {
      min: 70,
      max: 79,
      description: 'Good developer experience, some areas for enhancement'
    },
    moderate: {
      min: 60,
      max: 69,
      description: 'Moderate developer experience, several improvement opportunities'
    },
    belowAverage: {
      min: 50,
      max: 59,
      description: 'Below average developer experience, needs attention'
    },
    poor: {
      min: 40,
      max: 49,
      description: 'Poor developer experience, significant issues present'
    },
    veryPoor: {
      min: 0,
      max: 39,
      description: 'Very poor developer experience, major overhaul needed'
    }
  }
};

/**
 * Service for managing scoring configuration
 */
export class ScoringConfigService {
  private config: ScoringConfig;

  constructor(customConfig?: Partial<ScoringConfig>) {
    this.config = this.mergeConfig(DEFAULT_SCORING_CONFIG, customConfig);
    this.validateConfig();
  }

  /**
   * Get the current scoring configuration
   */
  public getConfig(): ScoringConfig {
    return { ...this.config };
  }

  /**
   * Determine color based on score
   */
  public getScoreColor(score: number): 'red' | 'yellow' | 'green' {
    if (score >= this.config.greenThreshold) return 'green';
    if (score >= this.config.yellowThreshold) return 'yellow';
    return 'red';
  }

  /**
   * Get score category and description
   */
  public getScoreCategory(score: number): { category: string; description: string } {
    const ranges = this.config.ranges;
    
    if (score >= ranges.excellent.min) {
      return { category: 'Excellent', description: ranges.excellent.description };
    }
    if (score >= ranges.veryGood.min) {
      return { category: 'Very Good', description: ranges.veryGood.description };
    }
    if (score >= ranges.good.min) {
      return { category: 'Good', description: ranges.good.description };
    }
    if (score >= ranges.moderate.min) {
      return { category: 'Moderate', description: ranges.moderate.description };
    }
    if (score >= ranges.belowAverage.min) {
      return { category: 'Below Average', description: ranges.belowAverage.description };
    }
    if (score >= ranges.poor.min) {
      return { category: 'Poor', description: ranges.poor.description };
    }
    
    return { category: 'Needs Improvement', description: ranges.veryPoor.description };
  }

  /**
   * Get the default fallback score
   */
  public getDefaultScore(): number {
    return this.config.defaultScore;
  }

  /**
   * Generate scoring guide text for prompts
   */
  public generateScoringGuide(): string {
    const ranges = this.config.ranges;
    
    return `Use this scoring guide:

- **${ranges.excellent.min}-${ranges.excellent.max} (Green)**: ${ranges.excellent.description}
- **${ranges.veryGood.min}-${ranges.veryGood.max} (Green)**: ${ranges.veryGood.description}
- **${ranges.good.min}-${ranges.good.max} (Green)**: ${ranges.good.description}
- **${ranges.moderate.min}-${ranges.moderate.max} (Yellow)**: ${ranges.moderate.description}
- **${ranges.belowAverage.min}-${ranges.belowAverage.max} (Yellow)**: ${ranges.belowAverage.description}
- **${ranges.poor.min}-${ranges.poor.max} (Yellow)**: ${ranges.poor.description}
- **${ranges.veryPoor.min}-${ranges.veryPoor.max} (Red)**: ${ranges.veryPoor.description}`;
  }

  /**
   * Merge custom configuration with default configuration
   */
  private mergeConfig(defaultConfig: ScoringConfig, customConfig?: Partial<ScoringConfig>): ScoringConfig {
    if (!customConfig) {
      return { ...defaultConfig };
    }

    return {
      greenThreshold: customConfig.greenThreshold ?? defaultConfig.greenThreshold,
      yellowThreshold: customConfig.yellowThreshold ?? defaultConfig.yellowThreshold,
      redThreshold: customConfig.redThreshold ?? defaultConfig.redThreshold,
      defaultScore: customConfig.defaultScore ?? defaultConfig.defaultScore,
      ranges: customConfig.ranges ? {
        ...defaultConfig.ranges,
        ...customConfig.ranges
      } : defaultConfig.ranges
    };
  }

  /**
   * Validate the scoring configuration
   */
  private validateConfig(): void {
    const { greenThreshold, yellowThreshold, redThreshold, defaultScore, ranges } = this.config;

    // Validate threshold order
    if (greenThreshold <= yellowThreshold) {
      throw new Error('Green threshold must be greater than yellow threshold');
    }
    if (yellowThreshold <= redThreshold) {
      throw new Error('Yellow threshold must be greater than red threshold');
    }

    // Validate score ranges
    if (defaultScore < 0 || defaultScore > 100) {
      throw new Error('Default score must be between 0 and 100');
    }

    // Validate all ranges
    Object.entries(ranges).forEach(([key, range]) => {
      if (range.min < 0 || range.max > 100 || range.min > range.max) {
        throw new Error(`Invalid range for ${key}: min=${range.min}, max=${range.max}`);
      }
    });

    console.log('Scoring configuration validated successfully');
  }
}

/**
 * Create a default scoring config service instance
 */
export const defaultScoringConfig = new ScoringConfigService();