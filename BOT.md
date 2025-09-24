# DevEx Scorecard Generator

A GitHub Bot that automatically generates Developer Experience (DevEx) Scorecards for repositories using AI-powered analysis. The bot creates comprehensive issues with detailed criteria to evaluate how easy it is for developers to use and contribute to your project.

## Features

- **🤖 AI-Powered Analysis**: Uses Azure OpenAI to intelligently analyze repositories and provide tailored recommendations
- **📊 Automated Scorecard Generation**: Creates detailed GitHub issues with scoring (0-100) and actionable recommendations  
- **🔄 Smart Fallback**: Works with or without AI configuration - gracefully falls back to comprehensive static templates
- **⚡ Easy Integration**: Simple GitHub App installation with webhook-based operation
- **🎯 Comprehensive Evaluation**: Analyzes documentation, project structure, development setup, testing, CI/CD, security, and community practices
- **🔄 Re-run Capability**: Users can trigger fresh analysis by checking a box in the generated issue

## How It Works

1. **Install the GitHub App** on your repositories or organization
2. **Automatic Trigger**: Bot activates when added to new repositories or existing ones
3. **Repository Analysis**: Fetches and analyzes key files (README.md, CODEOWNERS, etc.)
4. **AI Processing**: If Azure OpenAI is configured, generates intelligent analysis and scoring
5. **Issue Creation**: Creates a detailed DevEx Scorecard issue with recommendations and checklist
6. **Interactive Updates**: Users can check the "Re-run AI analysis" box to trigger fresh analysis

## Scorecard Criteria

The generated scorecard evaluates repositories across multiple dimensions:

- **📚 Documentation**: README, setup instructions, usage examples, contribution guidelines
- **🏗️ Project Structure**: File organization, naming conventions, separation of concerns
- **🔧 Development Setup**: Local development, dependency management, development scripts
- **🧪 Testing**: Unit tests, coverage reporting, integration tests
- **🚀 CI/CD**: Automated builds, testing, code quality checks
- **🔒 Security**: Security best practices, vulnerability scanning, secrets management
- **🤝 Community**: Issue templates, PR templates, code of conduct, license

## Installation & Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Build the TypeScript code: `npm run build`
4. Copy `.env.example` to `.env` and configure your GitHub credentials
5. Start the bot: `npm start`

## Running Locally

### Prerequisites
- Node.js 18+ installed
- A GitHub App or Personal Access Token (see [SETUP.md](./SETUP.md) for GitHub App creation)

### Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your actual GitHub credentials
   ```

3. **Build and start**:
   ```bash
   npm run build
   npm start
   ```

   Or for development with hot reload:
   ```bash
   npm run dev
   ```

4. **Test the bot**:
   - Visit `http://localhost:3000` for bot info
   - Visit `http://localhost:3000/health` for health check

### Webhook Testing

**Note**: GitHub webhooks won't work with localhost by default. For local webhook testing:

#### Option 1: Use ngrok (Recommended)
```bash
# Install ngrok
brew install ngrok

# Start your bot
npm run dev

# In another terminal, expose your local server
ngrok http 3000

# Update your GitHub App webhook URL to: https://abc123.ngrok.io/webhook
```

#### Option 2: Test webhooks manually
```bash
# Simulate a repository creation event
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "action": "created",
    "repository": {
      "name": "test-repo",
      "full_name": "owner/test-repo",
      "owner": { "login": "owner" }
    }
  }'
```

#### Option 3: Use the test script
```bash
chmod +x scripts/test-start.sh
./scripts/test-start.sh
```

### Environment Variables

Required in your `.env` file:
```bash
GITHUB_TOKEN=your_github_app_installation_token
WEBHOOK_SECRET=your_webhook_secret
PORT=3000
NODE_ENV=development
```

## Technical Stack

- **TypeScript** with Node.js 18+ and Express.js
- GitHub API integration via @octokit/rest
- Webhook handling with @octokit/webhooks
- Jest testing framework with ts-jest and supertest
- ESLint with TypeScript support for code quality
- Docker containerization support

## Development

- `npm run build`: Build TypeScript to JavaScript
- `npm run dev`: Start with nodemon and ts-node for development
- `npm test`: Run tests
- `npm run lint`: Run ESLint
- `npm run lint:fix`: Fix ESLint issues
- `npm run clean`: Remove build output

## GitHub App Setup

To use this bot, you'll need to create a GitHub App with the following permissions:

- **Repository permissions**:
  - Issues: Read & Write
  - Metadata: Read
  - Pull requests: Read

- **Subscribe to events**:
  - Repository
  - Installation
  - Issues

## License

MIT