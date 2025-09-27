# DevEx Scorecard Generator - Setup Guide

## GitHub App Configuration

To deploy this bot, you need to create a GitHub App. Follow these steps:

### 1. Create a GitHub App

1. Go to your GitHub organization settings
2. Navigate to "Developer settings" > "GitHub Apps"
3. Click "New GitHub App"

### 2. Configure the App

**Basic Information:**
- App name: `devex-scorecard-generator`
- Description: `Generates DevEx Scorecards for repositories`
- Homepage URL: Your deployment URL

**Webhook:**
- Webhook URL: `https://your-domain.com/webhook`
- Webhook secret: Generate a random secret

**Permissions:**
- Repository permissions:
  - Issues: Read & Write
  - Metadata: Read
  - Contents: Read

**Subscribe to events:**
- Repository
- Installation
- Issues

### 3. Environment Variables

Set the following environment variables in your deployment:

```bash
WEBHOOK_SECRET=your_webhook_secret
PORT=3000
```

### 4. Deployment Options

#### Option 1: Docker
```bash
docker build -t devex-scorecard-generator .
docker run -p 3000:3000 --env-file .env devex-scorecard-generator
```

#### Option 2: Node.js
```bash
npm install
npm start
```

### 5. Install the App

1. Go to your GitHub App settings
2. Generate a private key and download it
3. Install the app on your repositories
4. The bot will automatically create scorecard issues

## Troubleshooting

- Check webhook deliveries in GitHub App settings
- Verify environment variables are set correctly
- Check application logs for errors
- Ensure the bot has proper permissions