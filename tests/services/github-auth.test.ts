// Mock fs before importing the service
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
}));

jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn(),
}));

jest.mock('@octokit/auth-app', () => ({
  createAppAuth: jest.fn(),
}));

// Mock the config module
jest.mock('../../src/config', () => ({
  config: {
    nodeEnv: 'test',
    githubAppId: '12345',
    githubPrivateKeyPath: '/mock/path/to/private-key.pem',
    homeDirectory: '/mock/home',
  },
  getConfig: jest.fn(() => ({
    nodeEnv: 'test',
    githubAppId: '12345',
    githubPrivateKeyPath: '/mock/path/to/private-key.pem',
    homeDirectory: '/mock/home',
  })),
}));

import { GitHubAuthService } from '../../src/services/github-auth';
import * as fs from 'fs';
import { Octokit } from '@octokit/rest';
import { config } from '../../src/config';

describe('GitHubAuthService', () => {
  let service: GitHubAuthService;
  const mockReadFileSync = fs.readFileSync as jest.MockedFunction<typeof fs.readFileSync>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton instance
    (GitHubAuthService as any).instance = undefined;
    
    service = GitHubAuthService.getInstance();
  });

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const instance1 = GitHubAuthService.getInstance();
      const instance2 = GitHubAuthService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('getPrivateKey', () => {
    it('should return mocked key in test environment', () => {
      process.env.NODE_ENV = 'test';
      
      const privateKey = service.getPrivateKey();
      
      expect(privateKey).toBe('mocked-private-key');
      expect(mockReadFileSync).not.toHaveBeenCalled();
    });

    it('should read private key from file in non-test environment', () => {
      // Mock config to return production environment
      (config as any).nodeEnv = 'production';
      mockReadFileSync.mockReturnValue('real-private-key-content');
      
      // Create new service instance to use updated config
      (GitHubAuthService as any).instance = undefined;
      const prodService = GitHubAuthService.getInstance();
      
      const privateKey = prodService.getPrivateKey();
      
      expect(privateKey).toBe('real-private-key-content');
      expect(mockReadFileSync).toHaveBeenCalledWith('/mock/path/to/private-key.pem', 'utf8');
      
      // Reset config
      (config as any).nodeEnv = 'test';
    });

    it('should resolve home directory path starting with ~', () => {
      // Mock config with tilde path
      (config as any).nodeEnv = 'production';
      (config as any).githubPrivateKeyPath = '~/.ssh/private-key.pem';
      mockReadFileSync.mockReturnValue('private-key-content');
      
      // Create new service instance
      (GitHubAuthService as any).instance = undefined;
      const tildeService = GitHubAuthService.getInstance();
      
      tildeService.getPrivateKey();
      
      expect(mockReadFileSync).toHaveBeenCalledWith('/mock/home/.ssh/private-key.pem', 'utf8');
      
      // Reset config
      (config as any).nodeEnv = 'test';
      (config as any).githubPrivateKeyPath = '/mock/path/to/private-key.pem';
    });

    it('should throw error when private key path is not set in non-test environment', () => {
      // Mock config with missing private key path
      (config as any).nodeEnv = 'production';
      (config as any).githubPrivateKeyPath = '';
      
      // Create new service instance
      (GitHubAuthService as any).instance = undefined;
      const noKeyService = GitHubAuthService.getInstance();
      
      expect(() => noKeyService.getPrivateKey()).toThrow('GITHUB_PRIVATE_KEY_PATH environment variable is required');
      
      // Reset config
      (config as any).nodeEnv = 'test';
      (config as any).githubPrivateKeyPath = '/mock/path/to/private-key.pem';
    });

    it('should throw error when private key file cannot be read', () => {
      // Mock config for production
      (config as any).nodeEnv = 'production';
      mockReadFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });
      
      // Create new service instance
      (GitHubAuthService as any).instance = undefined;
      const errorService = GitHubAuthService.getInstance();
      
      expect(() => errorService.getPrivateKey()).toThrow('Failed to read private key from /mock/path/to/private-key.pem: Error: File not found');
      
      // Reset config
      (config as any).nodeEnv = 'test';
    });
  });

  describe('getOctokit', () => {
    it('should return the initialized Octokit instance', () => {
      const octokit = service.getOctokit();
      
      expect(octokit).toBeDefined();
      expect(Octokit).toHaveBeenCalledWith({
        authStrategy: expect.any(Function),
        auth: {
          appId: '12345',
          privateKey: 'mocked-private-key',
        },
      });
    });
  });

  describe('getInstallationOctokit', () => {
    it('should create installation-specific Octokit instance', async () => {
      const installationId = 12345;
      
      const installationOctokit = await service.getInstallationOctokit(installationId);
      
      expect(installationOctokit).toBeDefined();
      expect(Octokit).toHaveBeenCalledWith({
        authStrategy: expect.any(Function),
        auth: {
          appId: '12345',
          privateKey: 'mocked-private-key',
          installationId: installationId,
        },
      });
    });
  });
});