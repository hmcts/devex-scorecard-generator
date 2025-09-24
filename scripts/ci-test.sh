#!/bin/bash

# CI Test Script
# This script validates that tests can run in a CI environment without external dependencies

echo "🧪 Running CI environment validation tests..."

# Clear all environment variables except essentials
export NODE_ENV=test
export PATH=$PATH

# Remove any potentially problematic environment variables
unset GITHUB_APP_ID
unset GITHUB_PRIVATE_KEY_PATH  
unset WEBHOOK_SECRET
unset HOME
unset PORT
unset AZURE_AI_PROJECT_ENDPOINT
unset AZURE_AI_DEPLOYMENT_NAME
unset AZURE_AI_API_KEY
unset AZURE_AI_API_VERSION

echo "📝 Environment cleared, running tests..."

# Run tests
if npm test; then
  echo "✅ All tests passed in CI simulation!"
  exit 0
else
  echo "❌ Tests failed in CI simulation"
  exit 1
fi