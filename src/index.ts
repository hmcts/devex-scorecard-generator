import 'dotenv/config';
import express, { Request, Response } from 'express';
import { Octokit } from '@octokit/rest';

const app = express();
const port = process.env.PORT || 3000;

// Initialize Octokit with GitHub App credentials
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

// DevEx Scorecard criteria template
const DEVEX_SCORECARD_TEMPLATE = `# 🎯 DevEx Scorecard

Welcome! This repository has been analyzed for developer experience. Below are the key criteria to evaluate how easy it is for developers to use and contribute to this project.

## 📋 Scorecard Criteria

### 📚 Documentation
- [ ] README with clear project description
- [ ] Installation/setup instructions
- [ ] Usage examples
- [ ] Contribution guidelines
- [ ] API documentation (if applicable)

### 🏗️ Project Structure
- [ ] Clear and logical file organization
- [ ] Consistent naming conventions
- [ ] Separation of concerns
- [ ] Configuration files in appropriate locations

### 🔧 Development Setup
- [ ] Easy local development setup
- [ ] Clear dependency management
- [ ] Development scripts (build, test, lint)
- [ ] Environment configuration examples

### 🧪 Testing
- [ ] Unit tests present
- [ ] Test coverage reporting
- [ ] Integration tests (if applicable)
- [ ] Clear testing instructions

### 🚀 CI/CD
- [ ] Automated builds
- [ ] Automated testing
- [ ] Code quality checks
- [ ] Deployment automation

### 🔒 Security
- [ ] Security best practices
- [ ] Dependency vulnerability scanning
- [ ] Secrets management
- [ ] Security documentation

### 🤝 Community
- [ ] Issue templates
- [ ] Pull request templates
- [ ] Code of conduct
- [ ] License file

---

## 🔄 Actions

- [ ] **Re-run scorecard** - Check this box to trigger a fresh analysis

> This scorecard was generated automatically. Check the box above to request an updated analysis.`;

// Types for webhook payloads
interface Repository {
  name: string;
  full_name: string;
  owner: {
    login: string;
  };
}

interface Issue {
  number: number;
  title: string;
  body: string;
}

interface WebhookPayload {
  action?: string;
  repository?: Repository;
  installation?: any;
  issue?: Issue;
}

// Express middleware
app.use(express.json());

// Webhook endpoint - manually handle the webhook since middleware might not be available
app.post('/webhook', async (req: Request, res: Response) => {
  try {
    const { action, repository, issue }: WebhookPayload = req.body;
    
    // Handle repository events
    if (repository && (action === 'created' || req.body.installation)) {
      console.log(`Repository event: ${action} for ${repository.full_name}`);
      if (repository) {
        await createScorecardIssue(repository);
      }
    }
    
    // Handle installation events
    if (req.body.installation && action === 'created') {
      console.log('Installation created event');
      // Note: In a real implementation, you'd get the accessible repositories
      // For now, we'll just acknowledge the installation
    }
    
    // Handle issue events
    if (issue && action === 'edited' && issue.title.includes('DevEx Scorecard')) {
      console.log('Issue edited event for scorecard');
      
      if (issue.body.includes('- [x] **Re-run scorecard**')) {
        console.log('Re-run scorecard requested');
        
        if (!repository) {
          throw new Error('Repository information missing from issue event');
        }
        
        // Update the issue to uncheck the box
        const updatedBody = issue.body.replace('- [x] **Re-run scorecard**', '- [ ] **Re-run scorecard**');
        
        await octokit.rest.issues.update({
          owner: repository.owner.login,
          repo: repository.name,
          issue_number: issue.number,
          body: updatedBody
        });
        
        // Add a comment indicating the re-run
        await octokit.rest.issues.createComment({
          owner: repository.owner.login,
          repo: repository.name,
          issue_number: issue.number,
          body: `🔄 **Scorecard re-run requested**\n\nThe DevEx Scorecard has been refreshed. Please review the updated criteria above.\n\n_Generated at: ${new Date().toISOString()}_`
        });
      }
    }
    
    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Function to create scorecard issue
async function createScorecardIssue(repository: Repository): Promise<any> {
  try {
    console.log(`Creating scorecard issue for ${repository.full_name}`);
    
    const issue = await octokit.rest.issues.create({
      owner: repository.owner.login,
      repo: repository.name,
      title: '🎯 DevEx Scorecard',
      body: DEVEX_SCORECARD_TEMPLATE,
      labels: ['devex-scorecard', 'documentation']
    });
    
    console.log(`Created issue #${issue.data.number} for ${repository.full_name}`);
    return issue.data;
  } catch (error) {
    console.error(`Error creating scorecard issue for ${repository.full_name}:`, error);
    throw error;
  }
}

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'DevEx Scorecard Generator',
    description: 'GitHub Bot for generating Developer Experience Scorecards',
    version: '1.0.0'
  });
});

// Start server
const server = app.listen(port, () => {
  console.log(`DevEx Scorecard Generator Bot running on port ${port}`);
  console.log(`Webhook endpoint: http://localhost:${port}/webhook`);
});

export { app, server };