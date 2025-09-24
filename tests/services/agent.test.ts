import { AgentService } from '../../src/services/agent';
import { Octokit } from '@octokit/rest';

// Mock OpenAI
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  }));
});

// Mock Octokit
const mockGetContent = jest.fn();
const mockOctokit = {
  rest: {
    repos: {
      getContent: mockGetContent,
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
  });

  describe('constructor', () => {
    it('should create instance with API key', () => {
      expect(() => {
        agentService = new AgentService(mockConfig);
      }).not.toThrow();
    });

    it('should throw error when no API key provided', () => {
      const configWithoutKey = { 
        endpoint: mockConfig.endpoint,
        deploymentName: mockConfig.deploymentName
      };
      
      expect(() => {
        new AgentService(configWithoutKey);
      }).toThrow('Azure OpenAI API key is required');
    });
  });

  describe('generateScorecard', () => {
    beforeEach(() => {
      agentService = new AgentService(mockConfig);
    });

    it('should generate scorecard successfully', async () => {
      // Mock GitHub API responses
      mockGetContent
        .mockResolvedValueOnce({
          data: {
            content: Buffer.from('# Test Repository\nThis is a test README.').toString('base64'),
          },
        })
        .mockResolvedValueOnce({
          data: {
            content: Buffer.from('* @team-lead').toString('base64'),
          },
        });

      // Mock OpenAI response
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

      expect(mockGetContent).toHaveBeenCalledTimes(2);
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user' }),
        ]),
        max_tokens: 1000,
        temperature: 0.3,
      });
    });

    it('should handle GitHub API errors gracefully', async () => {
      // Mock GitHub API errors
      mockGetContent
        .mockRejectedValueOnce(new Error('File not found'))
        .mockRejectedValueOnce(new Error('File not found'));

      // Mock OpenAI response
      const mockOpenAIResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                score: 30,
                color: 'red',
                analysis: 'Limited documentation available.',
                recommendations: ['Add README file', 'Add CODEOWNERS file'],
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

    it('should handle OpenAI API errors', async () => {
      // Mock GitHub API responses
      mockGetContent
        .mockResolvedValueOnce({
          data: {
            content: Buffer.from('# Test Repository').toString('base64'),
          },
        })
        .mockResolvedValueOnce({
          data: {
            content: Buffer.from('* @team-lead').toString('base64'),
          },
        });

      // Mock OpenAI error
      const mockCreate = agentService['client'].chat.completions.create as jest.Mock;
      mockCreate.mockRejectedValue(new Error('OpenAI API error'));

      await expect(
        agentService.generateScorecard(mockOctokit, 'test-owner', 'test-repo')
      ).rejects.toThrow('OpenAI API error');
    });

    it('should handle malformed OpenAI responses', async () => {
      // Mock GitHub API responses
      mockGetContent
        .mockResolvedValueOnce({
          data: {
            content: Buffer.from('# Test Repository').toString('base64'),
          },
        })
        .mockResolvedValueOnce({
          data: {
            content: Buffer.from('* @team-lead').toString('base64'),
          },
        });

      // Mock malformed OpenAI response
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

    it('should handle empty OpenAI response', async () => {
      // Mock GitHub API responses
      mockGetContent
        .mockResolvedValueOnce({
          data: {
            content: Buffer.from('# Test Repository').toString('base64'),
          },
        })
        .mockResolvedValueOnce({
          data: {
            content: Buffer.from('* @team-lead').toString('base64'),
          },
        });

      // Mock empty OpenAI response
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