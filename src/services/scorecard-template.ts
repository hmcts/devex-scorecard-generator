export const DEVEX_SCORECARD_TEMPLATE = `# 🎯 DevEx Scorecard

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

export function generateScorecardRerunComment(): string {
  return `🔄 **Scorecard re-run completed**\n\nThe DevEx Scorecard has been refreshed with the latest template. Please review the updated criteria above.\n\n_Generated at: ${new Date().toISOString()}_`;
}