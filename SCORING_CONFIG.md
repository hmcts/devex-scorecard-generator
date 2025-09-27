# Scoring Configuration Examples

This file shows how to customize the DevEx Scorecard scoring thresholds and ranges.

## Dynamic AI Prompt Integration

The scoring configuration is automatically integrated into the AI agent's instructions at runtime. When you provide a custom scoring configuration, the system:

1. **Loads the base prompt** from `devex-agent-prompt.md`
2. **Replaces the default scoring guide** with your custom configuration
3. **Provides the updated prompt** to the AI agent

This ensures that the AI agent always uses your configured scoring thresholds and category descriptions, maintaining consistency across all analysis results.

## Default Configuration

The default scoring configuration uses these thresholds:

```typescript
import { ScoringConfig } from './src/types';

const defaultConfig: ScoringConfig = {
  // Color thresholds
  greenThreshold: 70,    // Score >= 70 shows green
  yellowThreshold: 50,   // Score >= 50 shows yellow  
  redThreshold: 0,       // Score < 50 shows red
  
  // Default fallback score when parsing fails
  defaultScore: 50,
  
  // Detailed score ranges with categories and descriptions
  ranges: {
    excellent: {
      min: 90, max: 100,
      description: 'Excellent developer experience, comprehensive setup, very well maintained'
    },
    veryGood: {
      min: 80, max: 89,
      description: 'Very good developer experience, minor improvements possible'
    },
    good: {
      min: 70, max: 79,
      description: 'Good developer experience, some areas for enhancement'
    },
    moderate: {
      min: 60, max: 69,
      description: 'Moderate developer experience, several improvement opportunities'
    },
    belowAverage: {
      min: 50, max: 59,
      description: 'Below average developer experience, needs attention'
    },
    poor: {
      min: 40, max: 49,
      description: 'Poor developer experience, significant issues present'
    },
    veryPoor: {
      min: 0, max: 39,
      description: 'Very poor developer experience, major overhaul needed'
    }
  }
};
```

## Custom Configuration Examples

### Example 1: Stricter Scoring (Higher Standards)

```typescript
import { AgentService } from './src/services/agent';

const strictScoringConfig = {
  greenThreshold: 80,    // Only scores >= 80 are green
  yellowThreshold: 60,   // Scores 60-79 are yellow
  redThreshold: 0,       // Scores < 60 are red
  defaultScore: 40,      // Lower default for stricter standards
  
  ranges: {
    excellent: { min: 95, max: 100, description: 'Exceptional developer experience' },
    veryGood: { min: 85, max: 94, description: 'Very good developer experience' },
    good: { min: 75, max: 84, description: 'Good developer experience' },
    moderate: { min: 65, max: 74, description: 'Moderate developer experience' },
    belowAverage: { min: 55, max: 64, description: 'Below average developer experience' },
    poor: { min: 40, max: 54, description: 'Poor developer experience' },
    veryPoor: { min: 0, max: 39, description: 'Very poor developer experience' }
  }
};

const agentService = new AgentService({
  projectEndpoint: 'https://your-project.services.ai.azure.com/api/projects/your-project',
  deploymentName: 'gpt-4',
  apiKey: 'your-api-key',
  scoringConfig: strictScoringConfig
});
```

### Example 2: Lenient Scoring (Encouraging Standards)

```typescript
import { AgentService } from './src/services/agent';

const lenientScoringConfig = {
  greenThreshold: 60,    // Scores >= 60 are green (encouraging)
  yellowThreshold: 35,   // Scores 35-59 are yellow
  redThreshold: 0,       // Only scores < 35 are red
  defaultScore: 60,      // Higher default to be encouraging
  
  ranges: {
    excellent: { min: 85, max: 100, description: 'Excellent developer experience' },
    veryGood: { min: 75, max: 84, description: 'Very good developer experience' },
    good: { min: 65, max: 74, description: 'Good developer experience' },
    moderate: { min: 50, max: 64, description: 'Moderate developer experience' },
    belowAverage: { min: 40, max: 49, description: 'Below average developer experience' },
    poor: { min: 25, max: 39, description: 'Poor developer experience' },
    veryPoor: { min: 0, max: 24, description: 'Very poor developer experience' }
  }
};

const agentService = new AgentService({
  projectEndpoint: 'https://your-project.services.ai.azure.com/api/projects/your-project',
  deploymentName: 'gpt-4',
  apiKey: 'your-api-key',
  scoringConfig: lenientScoringConfig
});
```

### Example 3: Custom Enterprise Standards

```typescript
import { AgentService } from './src/services/agent';

const enterpriseScoringConfig = {
  greenThreshold: 75,
  yellowThreshold: 50,
  redThreshold: 0,
  defaultScore: 50,
  
  ranges: {
    excellent: { 
      min: 90, max: 100, 
      description: 'Meets all enterprise DevEx standards with exemplary practices' 
    },
    veryGood: { 
      min: 80, max: 89, 
      description: 'Meets enterprise standards with minor optimization opportunities' 
    },
    good: { 
      min: 70, max: 79, 
      description: 'Meets most enterprise standards, some areas need improvement' 
    },
    moderate: { 
      min: 60, max: 69, 
      description: 'Partially meets enterprise standards, requires attention' 
    },
    belowAverage: { 
      min: 45, max: 59, 
      description: 'Below enterprise standards, significant improvements needed' 
    },
    poor: { 
      min: 30, max: 44, 
      description: 'Does not meet enterprise standards, major overhaul required' 
    },
    veryPoor: { 
      min: 0, max: 29, 
      description: 'Far below enterprise standards, complete redesign needed' 
    }
  }
};

const agentService = new AgentService({
  projectEndpoint: 'https://your-project.services.ai.azure.com/api/projects/your-project',
  deploymentName: 'gpt-4',
  apiKey: 'your-api-key',
  scoringConfig: enterpriseScoringConfig
});
```

## Using Custom Scoring Configuration

### In Code

```typescript
import { AgentService } from './src/services/agent';
import { IssueManagerService } from './src/services/issue-manager';

// Define your custom scoring config
const customScoringConfig = {
  greenThreshold: 75,
  yellowThreshold: 45,
  // ... other config options
};

// Create agent service with custom config
const agentConfig = {
  projectEndpoint: 'https://your-project.services.ai.azure.com/api/projects/your-project',
  deploymentName: 'gpt-4',
  apiKey: 'your-api-key',
  scoringConfig: customScoringConfig
};

// The scoring config will be automatically used throughout the system
const agentService = new AgentService(agentConfig);
const issueManager = new IssueManagerService(agentConfig);
```

### Environment-Based Configuration

You can also set up different configurations for different environments:

```typescript
import { ScoringConfig } from './src/types';

function getScoringConfig(): Partial<ScoringConfig> | undefined {
  const env = process.env.NODE_ENV;
  
  switch (env) {
    case 'strict':
      return {
        greenThreshold: 80,
        yellowThreshold: 60,
        defaultScore: 40
      };
    
    case 'lenient':
      return {
        greenThreshold: 60,
        yellowThreshold: 35,
        defaultScore: 60
      };
    
    default:
      return undefined; // Use default configuration
  }
}

const agentService = new AgentService({
  projectEndpoint: process.env.AZURE_AI_PROJECT_ENDPOINT!,
  deploymentName: process.env.AZURE_AI_DEPLOYMENT_NAME!,
  apiKey: process.env.AZURE_AI_API_KEY,
  scoringConfig: getScoringConfig()
});
```

## Validation

The scoring configuration is automatically validated when created:

- Green threshold must be greater than yellow threshold
- Yellow threshold must be greater than red threshold  
- Default score must be between 0 and 100
- All range min/max values must be valid (0-100, min <= max)

Invalid configurations will throw an error with a descriptive message.

## How Dynamic Prompt Replacement Works

The system automatically updates the AI agent's prompt with your custom scoring configuration:

### Original Prompt (devex-agent-prompt.md)
```markdown
## Scoring Guide

Use this scoring guide:

- **90-100 (Green)**: Excellent developer experience, comprehensive setup, very well maintained
- **80-89 (Green)**: Very good developer experience, minor improvements possible  
- **70-79 (Green)**: Good developer experience, some areas for enhancement
- **60-69 (Yellow)**: Moderate developer experience, several improvement opportunities
- **50-59 (Yellow)**: Below average developer experience, needs attention
- **40-49 (Yellow)**: Poor developer experience, significant issues present
- **0-39 (Red)**: Very poor developer experience, major overhaul needed
```

### After Custom Configuration
If you configure stricter scoring:

```typescript
const customConfig = {
  greenThreshold: 80,
  yellowThreshold: 60,
  ranges: {
    excellent: { min: 95, max: 100, description: 'Outstanding DevEx practices' },
    veryGood: { min: 85, max: 94, description: 'Excellent DevEx practices' },
    // ... other ranges
  }
};
```

The AI agent receives this updated prompt:

```markdown
## Scoring Guide

Use this scoring guide:

- **95-100 (Green)**: Outstanding DevEx practices
- **85-94 (Green)**: Excellent DevEx practices  
- **75-84 (Green)**: Very good DevEx practices
- **65-74 (Yellow)**: Good DevEx practices
- **55-64 (Yellow)**: Moderate DevEx practices
- **45-54 (Yellow)**: Below average DevEx practices
- **0-44 (Red)**: Poor DevEx practices
```

This ensures complete consistency between your scoring configuration and the AI's evaluation criteria.