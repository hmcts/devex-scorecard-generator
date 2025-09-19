# DevEx Scorecard Generator

A GitHub Bot that automatically generates Developer Experience (DevEx) Scorecards for repositories. The bot creates an issue with comprehensive criteria to evaluate how easy it is for developers to use and contribute to your project.

## Features

- **Automatic Issue Creation**: Creates a DevEx Scorecard issue when a repository is created or when the bot is installed
- **Interactive Checkbox**: Includes a "Re-run scorecard" checkbox that allows users to request a fresh analysis
- **Comprehensive Criteria**: Evaluates documentation, project structure, development setup, testing, CI/CD, security, and community aspects

## How It Works

1. **Installation**: When the bot is installed on a repository or when a new repository is created
2. **Issue Creation**: Automatically creates a "🎯 DevEx Scorecard" issue with evaluation criteria
3. **Re-run Feature**: Users can check the "Re-run scorecard" checkbox to trigger a fresh analysis
4. **Auto-update**: The bot automatically unchecks the box and adds a comment when re-run is completed

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

## Technical Stack

- **TypeScript** with Node.js 18+ and Express.js
- GitHub API integration via @octokit/rest
- Webhook handling with @octokit/webhooks
- Jest testing framework with ts-jest and supertest
- ESLint with TypeScript support for code quality
- Docker containerization support

## Environment Variables

- `GITHUB_TOKEN`: GitHub App token or Personal Access Token
- `WEBHOOK_SECRET`: Secret for webhook verification
- `PORT`: Server port (default: 3000)

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
