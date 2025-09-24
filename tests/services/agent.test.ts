import { AgentService } from '../../src/services/agent';
import { Octokit } from '@octokit/rest';

// Mock Azure OpenAI
jest.mock('openai', () => {
  return {
    AzureOpenAI: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    })),
  };
});

// Mock Azure Identity
jest.mock('@azure/identity', () => {
  return {
    DefaultAzureCredential: jest.fn(),
    AzureCliCredential: jest.fn(),
    ManagedIdentityCredential: jest.fn(),
    ChainedTokenCredential: jest.fn(),
    getBearerTokenProvider: jest.fn(),
  };
});

// Mock Octokit
const mockGetContent = jest.fn();
const mockGet = jest.fn();
const mockGetBranch = jest.fn();
const mockGetTree = jest.fn();

const mockOctokit = {
  rest: {
    repos: {
      getContent: mockGetContent,
      get: mockGet,
      getBranch: mockGetBranch,
    },
    git: {
      getTree: mockGetTree,
    },
  },
} as unknown as Octokit;

describe('AgentService', () => {
  let agentService: AgentService;
  const mockConfig = {
    endpoint: 'https://test.openai.azure.com/',
    deploymentName: 'gpt-4',
    apiKey: 'test-api-key',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetContent.mockClear();
    mockGet.mockClear();
    mockGetBranch.mockClear();
    mockGetTree.mockClear();
  });

  describe('constructor', () => {
    it('should create instance with API key', () => {
      expect(() => {
        agentService = new AgentService(mockConfig);
      }).not.toThrow();
    });

    it('should create instance without API key using Azure authentication', () => {
      const configWithoutKey = { 
        endpoint: mockConfig.endpoint,
        deploymentName: mockConfig.deploymentName
      };
      
      expect(() => {
        new AgentService(configWithoutKey);
      }).not.toThrow();
    });
  });

  describe('generateScorecard', () => {
    beforeEach(() => {
      agentService = new AgentService(mockConfig);
    });

    it('should generate scorecard successfully', async () => {
      // Mock repository info
      mockGet.mockResolvedValue({
        data: { default_branch: 'main' }
      });

      // Mock branch info
      mockGetBranch.mockResolvedValue({
        data: { commit: { sha: 'abc123' } }
      });

      // Mock repository tree
      mockGetTree.mockResolvedValue({
        data: {
          tree: [
            { path: 'README.md', type: 'blob', size: 100, sha: '123' },
            { path: 'package.json', type: 'blob', size: 200, sha: '456' },
            { path: 'src', type: 'tree', sha: '789' },
            { path: 'src/index.ts', type: 'blob', size: 300, sha: '101112' }
          ]
        }
      });

      // Mock file contents
      mockGetContent
        .mockResolvedValueOnce({
          data: {
            content: Buffer.from('# Test Repository\nThis is a test README.').toString('base64'),
          },
        })
        .mockResolvedValueOnce({
          data: {
            content: Buffer.from('{"name": "test-repo", "version": "1.0.0"}').toString('base64'),
          },
        })
        .mockResolvedValueOnce({
          data: {
            content: Buffer.from('console.log("Hello World");').toString('base64'),
          },
        });

      // Mock Azure OpenAI response
      const mockOpenAIResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                score: 75,
                color: 'green',
                analysis: 'This repository has good documentation and structure.',
                recommendations: ['Add unit tests', 'Implement CI/CD pipeline'],
              }),
            },
          },
        ],
      };

      const mockCreate = agentService['client'].chat.completions.create as jest.Mock;
      mockCreate.mockResolvedValue(mockOpenAIResponse);

      const result = await agentService.generateScorecard(mockOctokit, 'test-owner', 'test-repo');

      expect(result).toEqual({
        score: 75,
        color: 'green',
        analysis: 'This repository has good documentation and structure.',
        recommendations: ['Add unit tests', 'Implement CI/CD pipeline'],
      });

      expect(mockGet).toHaveBeenCalledWith({ owner: 'test-owner', repo: 'test-repo' });
      expect(mockGetBranch).toHaveBeenCalledWith({ owner: 'test-owner', repo: 'test-repo', branch: 'main' });
      expect(mockGetTree).toHaveBeenCalledWith({ owner: 'test-owner', repo: 'test-repo', tree_sha: 'abc123', recursive: 'true' });
      expect(mockGetContent).toHaveBeenCalledTimes(3);
    });

    it('should handle GitHub API errors gracefully', async () => {
      // Mock repository info - successful
      mockGet.mockResolvedValue({
        data: { default_branch: 'main' }
      });

      // Mock branch info - successful
      mockGetBranch.mockResolvedValue({
        data: { commit: { sha: 'abc123' } }
      });

      // Mock repository tree - successful but with files
      mockGetTree.mockResolvedValue({
        data: {
          tree: [
            { path: 'README.md', type: 'blob', size: 100, sha: '123' },
            { path: 'package.json', type: 'blob', size: 200, sha: '456' }
          ]
        }
      });

      // Mock file content errors
      mockGetContent
        .mockRejectedValueOnce(new Error('File not found'))
        .mockRejectedValueOnce(new Error('File not found'));

      // Mock Azure OpenAI response
      const mockOpenAIResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                score: 30,
                color: 'red',
                analysis: 'Limited documentation available.',
                recommendations: ['Add README file', 'Add package.json file'],
              }),
            },
          },
        ],
      };

      const mockCreate = agentService['client'].chat.completions.create as jest.Mock;
      mockCreate.mockResolvedValue(mockOpenAIResponse);

      const result = await agentService.generateScorecard(mockOctokit, 'test-owner', 'test-repo');

      expect(result.score).toBe(30);
      expect(result.color).toBe('red');
      expect(mockGetContent).toHaveBeenCalledTimes(2);
    });

    it('should handle Azure OpenAI API errors', async () => {
      // Mock successful GitHub API responses
      mockGet.mockResolvedValue({
        data: { default_branch: 'main' }
      });
      mockGetBranch.mockResolvedValue({
        data: { commit: { sha: 'abc123' } }
      });
      mockGetTree.mockResolvedValue({
        data: {
          tree: [
            { path: 'README.md', type: 'blob', size: 100, sha: '123' }
          ]
        }
      });
      mockGetContent.mockResolvedValue({
        data: {
          content: Buffer.from('# Test Repository').toString('base64'),
        },
      });

      // Mock Azure OpenAI error
      const mockCreate = agentService['client'].chat.completions.create as jest.Mock;
      mockCreate.mockRejectedValue(new Error('Azure OpenAI API error'));

      await expect(
        agentService.generateScorecard(mockOctokit, 'test-owner', 'test-repo')
      ).rejects.toThrow('Azure OpenAI API error');
    });

    it('should handle malformed Azure OpenAI responses', async () => {
      // Mock successful GitHub API responses
      mockGet.mockResolvedValue({
        data: { default_branch: 'main' }
      });
      mockGetBranch.mockResolvedValue({
        data: { commit: { sha: 'abc123' } }
      });
      mockGetTree.mockResolvedValue({
        data: {
          tree: [
            { path: 'README.md', type: 'blob', size: 100, sha: '123' }
          ]
        }
      });
      mockGetContent.mockResolvedValue({
        data: {
          content: Buffer.from('# Test Repository').toString('base64'),
        },
      });

      // Mock malformed Azure OpenAI response
      const mockOpenAIResponse = {
        choices: [
          {
            message: {
              content: 'This is not valid JSON response',
            },
          },
        ],
      };

      const mockCreate = agentService['client'].chat.completions.create as jest.Mock;
      mockCreate.mockResolvedValue(mockOpenAIResponse);

      const result = await agentService.generateScorecard(mockOctokit, 'test-owner', 'test-repo');

      // Should fallback to default parsing
      expect(result).toEqual({
        score: 50,
        color: 'yellow',
        analysis: 'This is not valid JSON response',
        recommendations: ['Review repository documentation and structure'],
      });
    });

    it('should handle empty Azure OpenAI response', async () => {
      // Mock successful GitHub API responses
      mockGet.mockResolvedValue({
        data: { default_branch: 'main' }
      });
      mockGetBranch.mockResolvedValue({
        data: { commit: { sha: 'abc123' } }
      });
      mockGetTree.mockResolvedValue({
        data: {
          tree: [
            { path: 'README.md', type: 'blob', size: 100, sha: '123' }
          ]
        }
      });
      mockGetContent.mockResolvedValue({
        data: {
          content: Buffer.from('# Test Repository').toString('base64'),
        },
      });

      // Mock empty Azure OpenAI response
      const mockOpenAIResponse = {
        choices: [],
      };

      const mockCreate = agentService['client'].chat.completions.create as jest.Mock;
      mockCreate.mockResolvedValue(mockOpenAIResponse);

      await expect(
        agentService.generateScorecard(mockOctokit, 'test-owner', 'test-repo')
      ).rejects.toThrow('No response from AI agent');
    });
  });
});