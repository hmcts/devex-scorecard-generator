// Jest setup file to ensure proper environment variables are set for tests
// This prevents CI failures when environment variables are not available

// Set NODE_ENV to test to ensure test mode behavior
process.env.NODE_ENV = 'test';

// Set required GitHub App environment variables with mock values
process.env.GITHUB_APP_ID = '12345';
process.env.GITHUB_PRIVATE_KEY_PATH = '/mock/path/to/private-key.pem';
process.env.HOME = '/mock/home';

// Set webhook secret for testing
process.env.WEBHOOK_SECRET = "It's a Secret to Everybody";

// Set port for testing (different from production default)
process.env.PORT = '3001';

// Optional Azure AI configuration (not required for tests to pass)
// These are set to ensure consistent test behavior when Azure AI is tested
process.env.AZURE_AI_PROJECT_ENDPOINT = 'https://test-azure-endpoint.azure.com/';
process.env.AZURE_AI_DEPLOYMENT_NAME = 'test-gpt-model';
process.env.AZURE_AI_API_KEY = 'test-api-key';
process.env.AZURE_AI_API_VERSION = '2024-12-01-preview';

// Suppress console.error during tests to reduce noise in CI
const originalConsoleError = console.error;
console.error = (...args) => {
  // Only show console.error for non-test-specific errors
  const message = args[0];
  if (typeof message === 'string') {
    // Skip expected test error messages
    const skipPatterns = [
      'Missing x-hub-signature-256 header',
      'Missing x-github-event header', 
      'Invalid webhook signature',
      'WEBHOOK_SECRET environment variable is not set',
      'Error verifying webhook signature:',
      'Failed to initialize Octokit:',
      'Error searching for existing scorecard issue',
      'Error creating/updating scorecard issue',
      'Error generating scorecard for',
      'Error processing webhook:'
    ];
    
    const shouldSkip = skipPatterns.some(pattern => message.includes(pattern));
    if (shouldSkip) {
      return; // Skip this console.error in tests
    }
  }
  
  // Call original console.error for other messages
  originalConsoleError.apply(console, args);
};