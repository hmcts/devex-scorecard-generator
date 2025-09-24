import { AgentService } from '../../src/services/agent';
import { Octokit } from '@octokit/rest';

// Mock Azure AI Agents
const mockCreateAgent = jest.fn();
const mockGetAgent = jest.fn();
const mockCreateThread = jest.fn();
const mockCreateMessage = jest.fn();
const mockDeleteThread = jest.fn();
const mockCreateAndPoll = jest.fn();
const mockListMessages = jest.fn();

const mockAgentsClient = {
  createAgent: mockCreateAgent,
  getAgent: mockGetAgent,
  threads: {
    create: mockCreateThread,
    delete: mockDeleteThread,
  },
  messages: {
    create: mockCreateMessage,
    list: mockListMessages,
  },
  runs: {
    createAndPoll: mockCreateAndPoll,
  },
};

jest.mock('@azure/ai-projects', () => ({
  AIProjectClient: jest.fn().mockImplementation(() => ({
    agents: mockAgentsClient,
  })),
}));

jest.mock('@azure/identity', () => ({
  DefaultAzureCredential: jest.fn(),
}));

// Mock Octokit
const mockGetContent = jest.fn();
const mockGetRepo = jest.fn();
const mockListCommits = jest.fn();
const mockListPulls = jest.fn();
const mockListIssues = jest.fn();

const mockOctokit = {
  rest: {
    repos: {
      getContent: mockGetContent,
      get: mockGetRepo,
      listCommits: mockListCommits,
    },
    pulls: {
      list: mockListPulls,
    },
    issues: {
      listForRepo: mockListIssues,
    },
  },
} as unknown as Octokit;

describe('AgentService', () => {
  let agentService: AgentService;
  const mockConfig = {
    projectEndpoint: 'https://test-project.services.ai.azure.com/api/projects/test-project',
    deploymentName: 'gpt-4',
    apiKey: 'test-api-key',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetContent.mockClear();
    mockGetRepo.mockClear();
    mockListCommits.mockClear();
    mockListPulls.mockClear();
    mockListIssues.mockClear();
    mockCreateAgent.mockClear();
    mockGetAgent.mockClear();
    mockCreateThread.mockClear();
    mockCreateMessage.mockClear();
    mockDeleteThread.mockClear();
    mockCreateAndPoll.mockClear();
    mockListMessages.mockClear();
  });

  describe('constructor', () => {
    it('should create instance with API key', () => {
      expect(() => {
        agentService = new AgentService(mockConfig);
      }).not.toThrow();
    });

    it('should create instance without API key (using managed identity)', () => {
      const configWithoutKey = { 
        projectEndpoint: mockConfig.projectEndpoint,
        deploymentName: mockConfig.deploymentName
      };
      
      expect(() => {
        new AgentService(configWithoutKey);
      }).not.toThrow();
    });

    it('should create instance with existing agent ID', () => {
      const configWithAgentId = { 
        ...mockConfig,
        agentId: 'existing-agent-123'
      };
      
      expect(() => {
        new AgentService(configWithAgentId);
      }).not.toThrow();
    });
  });

  describe('generateScorecard', () => {
    beforeEach(() => {
      agentService = new AgentService(mockConfig);
    });

    it('should generate scorecard successfully', async () => {
      // Setup comprehensive mock responses
      const setupMockResponses = () => {
        // Mock file content responses - some found, some not
        mockGetContent
          .mockImplementation((params) => {
            const { path } = params;
            
            if (path === 'README.md') {
              return Promise.resolve({
                data: {
                  content: Buffer.from('# Test Repository\nThis is a comprehensive test README with setup instructions.').toString('base64'),
                },
              });
            }
            
            if (path === 'CODEOWNERS') {
              return Promise.resolve({
                data: {
                  content: Buffer.from('* @team-lead @maintainer').toString('base64'),
                },
              });
            }
            
            if (path === '.gitignore') {
              return Promise.resolve({
                data: {
                  content: Buffer.from('node_modules/\n.env\n*.log').toString('base64'),
                },
              });
            }
            
            if (path === 'package.json') {
              return Promise.resolve({
                data: {
                  content: Buffer.from(JSON.stringify({
                    name: 'test-repo',
                    version: '1.0.0',
                    scripts: {
                      test: 'jest',
                      build: 'tsc',
                    },
                    dependencies: {},
                    devDependencies: {
                      jest: '^29.0.0',
                      typescript: '^4.9.0',
                    },
                  })).toString('base64'),
                },
              });
            }
            
            if (path === '.github/workflows') {
              return Promise.resolve({
                data: [
                  { name: 'ci.yml', type: 'file' },
                  { name: 'deploy.yml', type: 'file' },
                ],
              });
            }
            
            if (path === '.github/workflows/ci.yml') {
              return Promise.resolve({
                data: {
                  content: Buffer.from('name: CI\non: [push, pull_request]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v3\n      - run: npm test').toString('base64'),
                },
              });
            }
            
            if (path === '') {
              // Root directory listing
              return Promise.resolve({
                data: [
                  { name: 'README.md', type: 'file' },
                  { name: 'package.json', type: 'file' },
                  { name: 'src', type: 'dir' },
                  { name: 'tests', type: 'dir' },
                  { name: '.github', type: 'dir' },
                ],
              });
            }
            
            // File not found
            throw new Error('Not Found');
          });

        // Mock repository info
        mockGetRepo.mockResolvedValue({
          data: {
            description: 'A test repository for developer experience analysis',
            topics: ['typescript', 'testing', 'devex'],
            language: 'TypeScript',
            size: 1024,
            stargazers_count: 42,
            forks_count: 8,
            open_issues_count: 3,
            has_wiki: true,
            has_pages: false,
            has_projects: true,
            archived: false,
            disabled: false,
            visibility: 'public',
            default_branch: 'main',
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            pushed_at: '2024-01-15T00:00:00Z',
            license: {
              key: 'mit',
              name: 'MIT License',
            },
          },
        });

        // Mock recent commits
        mockListCommits.mockResolvedValue({
          data: [
            {
              sha: 'abc123def456',
              commit: {
                message: 'Add comprehensive test suite',
                author: {
                  name: 'Developer',
                  date: '2024-01-15T00:00:00Z',
                },
              },
            },
            {
              sha: 'def456ghi789',
              commit: {
                message: 'Update documentation',
                author: {
                  name: 'Maintainer',
                  date: '2024-01-14T00:00:00Z',
                },
              },
            },
          ],
        });

        // Mock open PRs
        mockListPulls.mockResolvedValue({
          data: [
            {
              number: 42,
              title: 'Improve test coverage',
              created_at: '2024-01-10T00:00:00Z',
              labels: [{ name: 'enhancement' }, { name: 'testing' }],
            },
          ],
        });

        // Mock recent issues
        mockListIssues.mockResolvedValue({
          data: [
            {
              number: 123,
              title: 'Add integration tests',
              state: 'open',
              created_at: '2024-01-12T00:00:00Z',
              labels: [{ name: 'enhancement' }],
              pull_request: undefined, // This is an issue, not a PR
            },
          ],
        });
      };

      setupMockResponses();

      // Mock agent creation/retrieval
      const mockAgent = { id: 'agent-123', name: 'DevEx Scorecard Analyzer' };
      mockCreateAgent.mockResolvedValue(mockAgent);

      // Mock thread creation
      const mockThread = { id: 'thread-456' };
      mockCreateThread.mockResolvedValue(mockThread);

      // Mock message creation
      mockCreateMessage.mockResolvedValue({ id: 'msg-789' });

      // Mock successful run completion
      const mockCompletedRun = { status: 'completed', id: 'run-abc' };
      const mockPoller = {
        pollUntilDone: jest.fn().mockResolvedValue(mockCompletedRun)
      };
      mockCreateAndPoll.mockReturnValue(mockPoller);

      // Mock assistant response message
      const mockMessages = [
        {
          role: 'user',
          content: [{ type: 'text', text: { value: 'User prompt...' } }]
        },
        {
          role: 'assistant',
          content: [{ 
            type: 'text', 
            text: { 
              value: JSON.stringify({
                score: 82,
                color: 'green',
                analysis: 'This repository demonstrates excellent developer experience practices with comprehensive documentation, well-structured CI/CD pipeline, proper testing setup, and active maintenance. The README provides clear setup instructions, and the project structure follows TypeScript best practices.',
                recommendations: [
                  'Add CONTRIBUTING.md to guide new contributors',
                  'Implement code coverage reporting',
                  'Add issue templates for better bug reports',
                  'Consider adding API documentation'
                ],
              })
            }
          }]
        }
      ];

      // Mock async iterator for messages
      mockListMessages.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const message of mockMessages) {
            yield message;
          }
        }
      });

      // Mock thread cleanup
      mockDeleteThread.mockResolvedValue({ status: 'deleted' });

      const result = await agentService.generateScorecard(mockOctokit, 'test-owner', 'test-repo');

      expect(result).toEqual({
        score: 82,
        color: 'green',
        analysis: 'This repository demonstrates excellent developer experience practices with comprehensive documentation, well-structured CI/CD pipeline, proper testing setup, and active maintenance. The README provides clear setup instructions, and the project structure follows TypeScript best practices.',
        recommendations: [
          'Add CONTRIBUTING.md to guide new contributors',
          'Implement code coverage reporting',
          'Add issue templates for better bug reports',
          'Consider adding API documentation'
        ],
      });

      // Verify comprehensive data fetching
      expect(mockGetContent).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        path: 'README.md',
      });
      
      expect(mockGetRepo).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
      });
      
      expect(mockListCommits).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        per_page: 5,
      });

      // Verify agent workflow calls
      expect(mockCreateAgent).toHaveBeenCalledWith('gpt-4', expect.objectContaining({
        name: 'DevEx Scorecard Analyzer',
        description: 'Analyzes GitHub repositories to generate developer experience scorecards',
        instructions: expect.stringContaining('senior software engineering consultant'),
        responseFormat: { type: 'json_object' }
      }));
      
      expect(mockCreateThread).toHaveBeenCalled();
      expect(mockCreateMessage).toHaveBeenCalledWith('thread-456', 'user', expect.stringContaining('Repository: test-owner/test-repo'));
      expect(mockCreateAndPoll).toHaveBeenCalledWith('thread-456', 'agent-123', expect.objectContaining({
        maxCompletionTokens: 2500,
        temperature: 0.2
      }));
    });

    it('should handle GitHub API errors gracefully', async () => {
      // Mock GitHub API errors for most files
      mockGetContent.mockRejectedValue(new Error('File not found'));
      
      // Mock minimal repository info
      mockGetRepo.mockResolvedValue({
        data: {
          description: null,
          topics: [],
          language: null,
          size: 0,
          stargazers_count: 0,
          forks_count: 0,
          open_issues_count: 0,
          has_wiki: false,
          has_pages: false,
          has_projects: false,
          archived: false,
          disabled: false,
          visibility: 'public',
          default_branch: 'main',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          pushed_at: '2024-01-01T00:00:00Z',
          license: null,
        },
      });
      
      // Mock empty responses for other data
      mockListCommits.mockResolvedValue({ data: [] });
      mockListPulls.mockResolvedValue({ data: [] });
      mockListIssues.mockResolvedValue({ data: [] });

      // Mock agent and workflow for minimal case
      const mockAgent = { id: 'agent-123', name: 'DevEx Scorecard Analyzer' };
      mockCreateAgent.mockResolvedValue(mockAgent);
      
      const mockThread = { id: 'thread-456' };
      mockCreateThread.mockResolvedValue(mockThread);
      
      mockCreateMessage.mockResolvedValue({ id: 'msg-789' });
      
      const mockCompletedRun = { status: 'completed', id: 'run-abc' };
      const mockPoller = {
        pollUntilDone: jest.fn().mockResolvedValue(mockCompletedRun)
      };
      mockCreateAndPoll.mockReturnValue(mockPoller);

      // Mock assistant response for minimal repo
      const mockMessages = [
        {
          role: 'assistant',
          content: [{ 
            type: 'text', 
            text: { 
              value: JSON.stringify({
                score: 25,
                color: 'red',
                analysis: 'This repository has very limited developer experience setup. Most essential files are missing, including README, documentation, and project configuration files.',
                recommendations: [
                  'Add comprehensive README.md with setup instructions',
                  'Add CODEOWNERS file for code review assignments', 
                  'Add project configuration files (package.json, etc.)',
                  'Set up CI/CD pipeline',
                  'Add testing framework'
                ],
              })
            }
          }]
        }
      ];

      mockListMessages.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const message of mockMessages) {
            yield message;
          }
        }
      });

      mockDeleteThread.mockResolvedValue({ status: 'deleted' });

      const result = await agentService.generateScorecard(mockOctokit, 'test-owner', 'test-repo');

      expect(result.score).toBe(25);
      expect(result.color).toBe('red');
      
      // Should still call various GitHub APIs even if they fail
      expect(mockGetContent).toHaveBeenCalled();
      expect(mockGetRepo).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
      });
    });

    it('should handle AI Foundry Agent API errors', async () => {
      // Mock basic GitHub API responses
      mockGetContent.mockImplementation((params) => {
        if (params.path === 'README.md') {
          return Promise.resolve({
            data: { content: Buffer.from('# Test Repository').toString('base64') },
          });
        }
        throw new Error('File not found');
      });
      
      mockGetRepo.mockResolvedValue({
        data: {
          description: 'Test repo',
          topics: [],
          language: 'JavaScript',
          size: 100,
          stargazers_count: 1,
          forks_count: 0,
          open_issues_count: 0,
          has_wiki: false,
          has_pages: false,
          has_projects: false,
          archived: false,
          disabled: false,
          visibility: 'public',
          default_branch: 'main',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          pushed_at: '2024-01-01T00:00:00Z',
          license: null,
        },
      });
      
      mockListCommits.mockResolvedValue({ data: [] });
      mockListPulls.mockResolvedValue({ data: [] });
      mockListIssues.mockResolvedValue({ data: [] });

      // Mock agent creation error
      mockCreateAgent.mockRejectedValue(new Error('Agent creation failed'));

      await expect(
        agentService.generateScorecard(mockOctokit, 'test-owner', 'test-repo')
      ).rejects.toThrow('Agent creation failed');
    });

    it('should handle malformed Agent responses', async () => {
      // Mock basic GitHub API responses
      mockGetContent.mockImplementation((params) => {
        if (params.path === 'README.md') {
          return Promise.resolve({
            data: { content: Buffer.from('# Test Repository').toString('base64') },
          });
        }
        throw new Error('File not found');
      });
      
      mockGetRepo.mockResolvedValue({
        data: {
          description: 'Test repo',
          topics: [],
          language: 'JavaScript',
          size: 100,
          stargazers_count: 1,
          forks_count: 0,
          open_issues_count: 0,
          has_wiki: false,
          has_pages: false,
          has_projects: false,
          archived: false,
          disabled: false,
          visibility: 'public',
          default_branch: 'main',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          pushed_at: '2024-01-01T00:00:00Z',
          license: null,
        },
      });
      
      mockListCommits.mockResolvedValue({ data: [] });
      mockListPulls.mockResolvedValue({ data: [] });
      mockListIssues.mockResolvedValue({ data: [] });

      // Mock agent and workflow setup
      const mockAgent = { id: 'agent-123', name: 'DevEx Scorecard Analyzer' };
      mockCreateAgent.mockResolvedValue(mockAgent);
      
      const mockThread = { id: 'thread-456' };
      mockCreateThread.mockResolvedValue(mockThread);
      
      mockCreateMessage.mockResolvedValue({ id: 'msg-789' });
      
      const mockCompletedRun = { status: 'completed', id: 'run-abc' };
      const mockPoller = {
        pollUntilDone: jest.fn().mockResolvedValue(mockCompletedRun)
      };
      mockCreateAndPoll.mockReturnValue(mockPoller);

      // Mock malformed agent response
      const mockMessages = [
        {
          role: 'assistant',
          content: [{ 
            type: 'text', 
            text: { 
              value: 'This is not valid JSON response - the AI failed to format properly'
            }
          }]
        }
      ];

      mockListMessages.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const message of mockMessages) {
            yield message;
          }
        }
      });

      mockDeleteThread.mockResolvedValue({ status: 'deleted' });

      const result = await agentService.generateScorecard(mockOctokit, 'test-owner', 'test-repo');

      // Should fallback to default parsing
      expect(result).toEqual({
        score: 50,
        color: 'yellow',
        analysis: 'This is not valid JSON response - the AI failed to format properly',
        recommendations: ['Review repository documentation and structure'],
      });
    });

    it('should handle empty Agent response', async () => {
      // Mock basic GitHub API responses
      mockGetContent.mockImplementation((params) => {
        if (params.path === 'README.md') {
          return Promise.resolve({
            data: { content: Buffer.from('# Test Repository').toString('base64') },
          });
        }
        throw new Error('File not found');
      });
      
      mockGetRepo.mockResolvedValue({
        data: {
          description: 'Test repo',
          topics: [],
          language: 'JavaScript',
          size: 100,
          stargazers_count: 1,
          forks_count: 0,
          open_issues_count: 0,
          has_wiki: false,
          has_pages: false,
          has_projects: false,
          archived: false,
          disabled: false,
          visibility: 'public',
          default_branch: 'main',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          pushed_at: '2024-01-01T00:00:00Z',
          license: null,
        },
      });
      
      mockListCommits.mockResolvedValue({ data: [] });
      mockListPulls.mockResolvedValue({ data: [] });
      mockListIssues.mockResolvedValue({ data: [] });

      // Mock agent and workflow setup
      const mockAgent = { id: 'agent-123', name: 'DevEx Scorecard Analyzer' };
      mockCreateAgent.mockResolvedValue(mockAgent);
      
      const mockThread = { id: 'thread-456' };
      mockCreateThread.mockResolvedValue(mockThread);
      
      mockCreateMessage.mockResolvedValue({ id: 'msg-789' });
      
      const mockCompletedRun = { status: 'completed', id: 'run-abc' };
      const mockPoller = {
        pollUntilDone: jest.fn().mockResolvedValue(mockCompletedRun)
      };
      mockCreateAndPoll.mockReturnValue(mockPoller);

      // Mock empty messages (no assistant response)
      const mockMessages: any[] = [];

      mockListMessages.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const message of mockMessages) {
            yield message;
          }
        }
      });

      await expect(
        agentService.generateScorecard(mockOctokit, 'test-owner', 'test-repo')
      ).rejects.toThrow('No response from AI agent');
    });
  });
});