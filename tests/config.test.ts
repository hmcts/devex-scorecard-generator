import { getConfig } from '../src/config';

describe('Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getConfig', () => {
    it('should return default configuration in test environment', () => {
      process.env.NODE_ENV = 'test';
      process.env.GITHUB_APP_ID = '12345';
      process.env.GITHUB_PRIVATE_KEY_PATH = '/mock/path/to/private-key.pem';
      process.env.WEBHOOK_SECRET = 'test-secret';
      process.env.PORT = '3001';
      process.env.HOME = '/mock/home';

      const config = getConfig();

      expect(config.port).toBe(3001);
      expect(config.nodeEnv).toBe('test');
      expect(config.githubAppId).toBe('12345');
      expect(config.githubPrivateKeyPath).toBe('/mock/path/to/private-key.pem');
      expect(config.webhookSecret).toBe('test-secret');
      expect(config.homeDirectory).toBe('/mock/home');
    });

    it('should use default port when PORT is not set', () => {
      process.env.NODE_ENV = 'test';
      process.env.GITHUB_APP_ID = '12345';
      process.env.GITHUB_PRIVATE_KEY_PATH = '/mock/path/to/private-key.pem';
      delete process.env.PORT;

      const config = getConfig();

      expect(config.port).toBe(3000);
    });

    it('should use default webhook secret when not set', () => {
      process.env.NODE_ENV = 'test';
      process.env.GITHUB_APP_ID = '12345';
      process.env.GITHUB_PRIVATE_KEY_PATH = '/mock/path/to/private-key.pem';
      delete process.env.WEBHOOK_SECRET;

      const config = getConfig();

      expect(config.webhookSecret).toBe('test-secret-for-development');
    });

    it('should throw error for missing required variables in production', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.GITHUB_APP_ID;

      expect(() => getConfig()).toThrow('Missing required environment variables: GITHUB_APP_ID');
    });

    it('should not throw error for missing required variables in test environment', () => {
      process.env.NODE_ENV = 'test';
      delete process.env.GITHUB_APP_ID;
      delete process.env.GITHUB_PRIVATE_KEY_PATH;

      expect(() => getConfig()).not.toThrow();
    });
  });
});