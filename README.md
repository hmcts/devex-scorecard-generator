# DevEx Scorecard Generator

A GitHub Bot that automatically generates Developer Experience (DevEx) Scorecards for repositories using AI-powered analysis. The bot creates comprehensive issues with detailed criteria to evaluate how easy it is for developers to use and contribute to your project.

## Features

- **AI-Powered Analysis**: Uses Azure OpenAI to intelligently analyze repositories and provide tailored recommendations
- **Automated Scorecard Generation**: Creates detailed GitHub issues with scoring and actionable recommendations  
- **Smart Fallback**: Works with or without AI configuration - falls back to comprehensive static templates
- **Easy Integration**: Simple GitHub App installation with webhook-based operation
- **Comprehensive Evaluation**: Analyzes documentation, project structure, development setup, testing, CI/CD, security, and community practices

## How It Works

1. **Install the GitHub App** on your repositories
2. **Automatic Analysis**: The bot analyzes repository content (README, CODEOWNERS, etc.)
3. **AI Scoring**: If configured with Azure OpenAI, generates intelligent analysis and scoring (0-100)
4. **Issue Creation**: Creates a detailed DevEx Scorecard issue with recommendations
5. **Re-run Capability**: Check a box in the issue to trigger fresh analysis

## Quick Start

### Prerequisites
- Node.js 18+
- GitHub App credentials
- (Optional) Azure OpenAI access for AI-powered analysis

### Installation

1. **Clone and install**:
   ```bash
   git clone https://github.com/hmcts/devex-scorecard-generator.git
   cd devex-scorecard-generator
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Build and start**:
   ```bash
   npm run build
   npm start
   ```

4. **Development mode**:
   ```bash
   npm run dev
   ```

## Configuration

### Required Environment Variables
```bash
GITHUB_APP_ID=your-github-app-id
GITHUB_PRIVATE_KEY_PATH=/path/to/private-key.pem
WEBHOOK_SECRET=your-webhook-secret
```

### Optional AI Configuration
```bash
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4
AZURE_OPENAI_API_KEY=your-api-key
```

## API Usage

The agent service provides a simple interface for programmatic use:

```typescript
import { AgentService } from './src/services/agent';

const agentService = new AgentService({
  endpoint: 'https://your-resource.openai.azure.com/',
  deploymentName: 'gpt-4',
  apiKey: 'your-api-key'
});

const result = await agentService.generateScorecard(octokit, 'owner', 'repo');
console.log(`Score: ${result.score}/100`);
console.log(`Analysis: ${result.analysis}`);
```

## Scorecard Criteria

The generated scorecards evaluate repositories across multiple dimensions:

- **📚 Documentation**: README, setup instructions, usage examples, contribution guidelines
- **🏗️ Project Structure**: File organization, naming conventions, separation of concerns  
- **🔧 Development Setup**: Local development, dependency management, development scripts
- **🧪 Testing**: Unit tests, coverage reporting, integration tests
- **🚀 CI/CD**: Automated builds, testing, code quality checks, deployment automation
- **🔒 Security**: Security best practices, vulnerability scanning, secrets management
- **🤝 Community**: Issue templates, PR templates, code of conduct, license

## Development

- `npm run build`: Build TypeScript to JavaScript
- `npm run dev`: Start with nodemon for development  
- `npm test`: Run comprehensive test suite
- `npm run lint`: Run ESLint
- `npm run lint:fix`: Fix ESLint issues
- `npm run clean`: Remove build output

## GitHub App Setup

Create a GitHub App with these permissions:

**Repository permissions**:
- Issues: Read & Write
- Metadata: Read
- Pull requests: Read

**Subscribe to events**:
- Repository
- Installation  
- Issues

## Architecture

- **TypeScript** with Node.js 18+ and Express.js
- **GitHub API** integration via @octokit/rest
- **Azure OpenAI** for AI-powered analysis (optional)
- **Webhook handling** with signature verification
- **Jest testing** framework with comprehensive coverage
- **Docker** containerization support

## Migration from Python

This project has been migrated from Python (Azure AI Foundry) to TypeScript (Azure OpenAI) for better integration with the GitHub Bot infrastructure. The TypeScript implementation provides:

- Better integration with existing GitHub Bot codebase
- Improved error handling and fallback mechanisms  
- Comprehensive test coverage
- Easier deployment and maintenance

## Contributing

Contributions are welcome! Please ensure:
- All tests pass (`npm test`)
- Code follows style guidelines (`npm run lint`)
- New features include appropriate tests

## License

MIT
