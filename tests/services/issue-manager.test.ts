jest.mock('../../src/services/github-auth');
jest.mock('../../src/services/agent');

import { IssueManagerService } from '../../src/services/issue-manager';
import { GitHubAuthService } from '../../src/services/github-auth';
import { AgentService } from '../../src/services/agent';
import { Repository, Issue } from '../../src/types';

describe('IssueManagerService', () => {
  let service: IssueManagerService;
  let mockGitHubAuth: jest.Mocked<GitHubAuthService>;
  let mockAgentService: jest.Mocked<AgentService>;
  let mockOctokit: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock Octokit
    mockOctokit = {
      rest: {
        issues: {
          listForRepo: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          createComment: jest.fn(),
        },
      },
    };

    // Setup mock GitHubAuthService
    mockGitHubAuth = {
      getInstance: jest.fn(),
      getOctokit: jest.fn().mockReturnValue(mockOctokit),
      getInstallationOctokit: jest.fn().mockResolvedValue(mockOctokit),
      getPrivateKey: jest.fn(),
    } as any;

    // Setup mock AgentService
    mockAgentService = {
      generateScorecard: jest.fn().mockResolvedValue({
        score: 75,
        color: 'green',
        analysis: 'Test analysis',
        recommendations: ['Test recommendation']
      }),
    } as any;

    (GitHubAuthService.getInstance as jest.Mock).mockReturnValue(mockGitHubAuth);
    (AgentService as jest.Mock).mockImplementation(() => mockAgentService);

    service = new IssueManagerService();
  });

  const mockRepository: Repository = {
    name: 'test-repo',
    full_name: 'owner/test-repo',
    owner: { login: 'owner' }
  };

  describe('findExistingScorecardIssue', () => {
    it('should find existing scorecard issue', async () => {
      const mockIssues = [
        { number: 1, title: 'Regular issue' },
        { number: 2, title: '🎯 DevEx Scorecard' }
      ];
      mockOctokit.rest.issues.listForRepo.mockResolvedValue({ data: mockIssues });

      const result = await service.findExistingScorecardIssue(mockOctokit, mockRepository);

      expect(result).toEqual(mockIssues[1]);
      expect(mockOctokit.rest.issues.listForRepo).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'test-repo',
        state: 'all',
        labels: 'devex-scorecard'
      });
    });

    it('should return null when no scorecard issue exists', async () => {
      const mockIssues = [
        { number: 1, title: 'Regular issue' },
        { number: 2, title: 'Another issue' }
      ];
      mockOctokit.rest.issues.listForRepo.mockResolvedValue({ data: mockIssues });

      const result = await service.findExistingScorecardIssue(mockOctokit, mockRepository);

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      mockOctokit.rest.issues.listForRepo.mockRejectedValue(new Error('API Error'));

      const result = await service.findExistingScorecardIssue(mockOctokit, mockRepository);

      expect(result).toBeNull();
    });
  });

  describe('createScorecardIssue', () => {
    it('should create a new scorecard issue', async () => {
      const mockIssue = { data: { number: 5 } };
      mockOctokit.rest.issues.create.mockResolvedValue(mockIssue);

      const result = await service.createScorecardIssue(mockOctokit, mockRepository);

      expect(result).toEqual(mockIssue.data);
      expect(mockOctokit.rest.issues.create).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'test-repo',
        title: '🎯 DevEx Scorecard',
        body: expect.stringContaining('DevEx Scorecard'),
        labels: ['devex-scorecard', 'documentation']
      });
    });
  });

  describe('updateScorecardIssue', () => {
    it('should update an existing scorecard issue', async () => {
      const mockUpdatedIssue = { data: { number: 3 } };
      mockOctokit.rest.issues.update.mockResolvedValue(mockUpdatedIssue);

      const result = await service.updateScorecardIssue(mockOctokit, mockRepository, 3);

      expect(result).toEqual(mockUpdatedIssue.data);
      expect(mockOctokit.rest.issues.update).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'test-repo',
        issue_number: 3,
        title: '🎯 DevEx Scorecard',
        body: expect.stringContaining('DevEx Scorecard'),
        state: 'open',
        labels: ['devex-scorecard', 'documentation']
      });
    });

    it('should not reopen issue when reopenIfClosed is false', async () => {
      const mockUpdatedIssue = { data: { number: 3 } };
      mockOctokit.rest.issues.update.mockResolvedValue(mockUpdatedIssue);

      await service.updateScorecardIssue(mockOctokit, mockRepository, 3, false);

      expect(mockOctokit.rest.issues.update).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'test-repo',
        issue_number: 3,
        title: '🎯 DevEx Scorecard',
        body: expect.stringContaining('DevEx Scorecard'),
        labels: ['devex-scorecard', 'documentation']
      });
    });
  });

  describe('createOrUpdateScorecardIssue', () => {
    it('should create new issue when none exists', async () => {
      mockOctokit.rest.issues.listForRepo.mockResolvedValue({ data: [] });
      const mockIssue = { data: { number: 5 } };
      mockOctokit.rest.issues.create.mockResolvedValue(mockIssue);

      const result = await service.createOrUpdateScorecardIssue(mockRepository, 12345);

      expect(result).toEqual(mockIssue.data);
      expect(mockGitHubAuth.getInstallationOctokit).toHaveBeenCalledWith(12345);
    });

    it('should update existing closed issue', async () => {
      const existingIssue = { number: 3, title: '🎯 DevEx Scorecard', state: 'closed' };
      mockOctokit.rest.issues.listForRepo.mockResolvedValue({ data: [existingIssue] });
      const mockUpdatedIssue = { data: { number: 3 } };
      mockOctokit.rest.issues.update.mockResolvedValue(mockUpdatedIssue);

      const result = await service.createOrUpdateScorecardIssue(mockRepository, 12345);

      expect(result).toEqual(mockUpdatedIssue.data);
      expect(mockOctokit.rest.issues.update).toHaveBeenCalled();
    });

    it('should skip update for existing open issue without force update', async () => {
      const existingIssue = { number: 3, title: '🎯 DevEx Scorecard', state: 'open' };
      mockOctokit.rest.issues.listForRepo.mockResolvedValue({ data: [existingIssue] });

      const result = await service.createOrUpdateScorecardIssue(mockRepository, 12345, false);

      expect(result).toEqual(existingIssue);
      expect(mockOctokit.rest.issues.update).not.toHaveBeenCalled();
      expect(mockOctokit.rest.issues.create).not.toHaveBeenCalled();
    });

    it('should throw error when Octokit instance is not available', async () => {
      mockGitHubAuth.getOctokit.mockReturnValue(undefined);

      await expect(service.createOrUpdateScorecardIssue(mockRepository)).rejects.toThrow('Octokit instance not available');
    });
  });

  describe('handleScorecardRerun', () => {
    const mockIssue: Issue = {
      number: 3,
      title: '🎯 DevEx Scorecard',
      body: 'Issue body'
    };

    it('should update issue and add comment for scorecard rerun', async () => {
      mockOctokit.rest.issues.update.mockResolvedValue({ data: {} });
      mockOctokit.rest.issues.createComment.mockResolvedValue({ data: {} });

      await service.handleScorecardRerun(mockRepository, mockIssue, 12345);

      expect(mockGitHubAuth.getInstallationOctokit).toHaveBeenCalledWith(12345);
      expect(mockOctokit.rest.issues.update).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'test-repo',
        issue_number: 3,
        body: expect.stringContaining('DevEx Scorecard')
      });
      expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'test-repo',
        issue_number: 3,
        body: expect.stringContaining('AI Scorecard Analysis Completed')
      });
    });
  });
});