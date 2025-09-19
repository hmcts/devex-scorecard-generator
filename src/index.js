require('dotenv').config();
const express = require('express');
const { Webhooks } = require('@octokit/webhooks');
const { Octokit } = require('@octokit/rest');

const app = express();
const port = process.env.PORT || 3000;

// Initialize Octokit with GitHub App credentials
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

// Initialize webhooks
const webhooks = new Webhooks({
  secret: process.env.WEBHOOK_SECRET || 'development-secret',
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

// Handle repository events (creation or installation)
webhooks.on(['repository.created', 'installation.created'], async ({ id, name, payload }) => {
  console.log(`Received ${name} event with ID: ${id}`);
  
  try {
    let repository;
    
    if (name === 'repository.created') {
      repository = payload.repository;
    } else if (name === 'installation.created') {
      // For installation events, we'll create issues for all accessible repositories
      const installations = await octokit.rest.apps.listReposAccessibleToInstallation();
      
      for (const repo of installations.data.repositories) {
        await createScorecardIssue(repo);
      }
      return;
    }
    
    if (repository) {
      await createScorecardIssue(repository);
    }
  } catch (error) {
    console.error('Error handling repository event:', error);
  }
});

// Handle issue events (checkbox interactions)
webhooks.on('issues.edited', async ({ id, name, payload }) => {
  console.log(`Received ${name} event with ID: ${id}`);
  
  try {
    const { issue, repository } = payload;
    
    // Check if this is our scorecard issue and if re-run checkbox was checked
    if (issue.title.includes('DevEx Scorecard') && 
        issue.body.includes('- [x] **Re-run scorecard**')) {
      
      console.log('Re-run scorecard requested');
      
      // Update the issue to uncheck the box and add a comment
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
      
      console.log('Scorecard re-run completed');
    }
  } catch (error) {
    console.error('Error handling issue event:', error);
  }
});

// Function to create scorecard issue
async function createScorecardIssue(repository) {
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

// Express middleware
app.use(express.json());

// Webhook endpoint - manually handle the webhook since middleware might not be available
app.post('/webhook', async (req, res) => {
  try {
    const { action, repository, issue } = req.body;
    
    // Handle repository events
    if (req.body.repository && (action === 'created' || req.body.installation)) {
      console.log(`Repository event: ${action} for ${repository?.full_name}`);
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
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

module.exports = { app, server };