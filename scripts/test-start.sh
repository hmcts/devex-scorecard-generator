#!/bin/bash

# Simple test script to verify the bot works
echo "🤖 Starting DevEx Scorecard Generator Bot..."

# Check if environment file exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Copying from .env.example..."
    cp .env.example .env
    echo "📝 Please edit .env file with your actual GitHub credentials"
fi

# Start the bot
echo "🚀 Starting bot on port 3000..."
GITHUB_TOKEN="test-token" WEBHOOK_SECRET="test-secret" node src/index.js