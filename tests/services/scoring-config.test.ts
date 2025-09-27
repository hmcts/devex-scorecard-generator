import { ScoringConfigService, DEFAULT_SCORING_CONFIG } from '../../src/services/scoring-config';

describe('ScoringConfigService', () => {
  describe('constructor and validation', () => {
    it('should create service with default configuration', () => {
      const service = new ScoringConfigService();
      const config = service.getConfig();
      
      expect(config.greenThreshold).toBe(70);
      expect(config.yellowThreshold).toBe(50);
      expect(config.defaultScore).toBe(50);
    });

    it('should merge custom configuration with defaults', () => {
      const customConfig = {
        greenThreshold: 80,
        yellowThreshold: 60
      };
      
      const service = new ScoringConfigService(customConfig);
      const config = service.getConfig();
      
      expect(config.greenThreshold).toBe(80);
      expect(config.yellowThreshold).toBe(60);
      expect(config.defaultScore).toBe(50); // Should keep default
    });

    it('should throw error for invalid threshold order', () => {
      const invalidConfig = {
        greenThreshold: 50,
        yellowThreshold: 70 // Invalid: yellow > green
      };
      
      expect(() => new ScoringConfigService(invalidConfig)).toThrow('Green threshold must be greater than yellow threshold');
    });

    it('should throw error for invalid default score', () => {
      const invalidConfig = {
        defaultScore: 150 // Invalid: > 100
      };
      
      expect(() => new ScoringConfigService(invalidConfig)).toThrow('Default score must be between 0 and 100');
    });

    it('should throw error for invalid range', () => {
      const invalidConfig = {
        ranges: {
          excellent: {
            min: 90,
            max: 80, // Invalid: min > max
            description: 'Test'
          },
          veryGood: { min: 80, max: 89, description: 'Very good' },
          good: { min: 70, max: 79, description: 'Good' },
          moderate: { min: 60, max: 69, description: 'Moderate' },
          belowAverage: { min: 50, max: 59, description: 'Below average' },
          poor: { min: 40, max: 49, description: 'Poor' },
          veryPoor: { min: 0, max: 39, description: 'Very poor' }
        }
      };
      
      expect(() => new ScoringConfigService(invalidConfig)).toThrow('Invalid range for excellent');
    });
  });

  describe('getScoreColor', () => {
    let service: ScoringConfigService;

    beforeEach(() => {
      service = new ScoringConfigService();
    });

    it('should return green for scores >= greenThreshold', () => {
      expect(service.getScoreColor(85)).toBe('green');
      expect(service.getScoreColor(70)).toBe('green');
    });

    it('should return yellow for scores >= yellowThreshold but < greenThreshold', () => {
      expect(service.getScoreColor(65)).toBe('yellow');
      expect(service.getScoreColor(50)).toBe('yellow');
    });

    it('should return red for scores < yellowThreshold', () => {
      expect(service.getScoreColor(45)).toBe('red');
      expect(service.getScoreColor(0)).toBe('red');
    });

    it('should work with custom thresholds', () => {
      const customService = new ScoringConfigService({
        greenThreshold: 80,
        yellowThreshold: 60
      });

      expect(customService.getScoreColor(85)).toBe('green');
      expect(customService.getScoreColor(75)).toBe('yellow');
      expect(customService.getScoreColor(55)).toBe('red');
    });
  });

  describe('getScoreCategory', () => {
    let service: ScoringConfigService;

    beforeEach(() => {
      service = new ScoringConfigService();
    });

    it('should return correct category for excellent scores', () => {
      const result = service.getScoreCategory(95);
      expect(result.category).toBe('Excellent');
      expect(result.description).toContain('Excellent developer experience');
    });

    it('should return correct category for very good scores', () => {
      const result = service.getScoreCategory(85);
      expect(result.category).toBe('Very Good');
      expect(result.description).toContain('Very good developer experience');
    });

    it('should return correct category for good scores', () => {
      const result = service.getScoreCategory(75);
      expect(result.category).toBe('Good');
      expect(result.description).toContain('Good developer experience');
    });

    it('should return correct category for moderate scores', () => {
      const result = service.getScoreCategory(65);
      expect(result.category).toBe('Moderate');
      expect(result.description).toContain('Moderate developer experience');
    });

    it('should return correct category for below average scores', () => {
      const result = service.getScoreCategory(55);
      expect(result.category).toBe('Below Average');
      expect(result.description).toContain('Below average developer experience');
    });

    it('should return correct category for poor scores', () => {
      const result = service.getScoreCategory(45);
      expect(result.category).toBe('Poor');
      expect(result.description).toContain('Poor developer experience');
    });

    it('should return correct category for very poor scores', () => {
      const result = service.getScoreCategory(25);
      expect(result.category).toBe('Needs Improvement');
      expect(result.description).toContain('Very poor developer experience');
    });
  });

  describe('getDefaultScore', () => {
    it('should return configured default score', () => {
      const service = new ScoringConfigService();
      expect(service.getDefaultScore()).toBe(50);
    });

    it('should return custom default score', () => {
      const service = new ScoringConfigService({ defaultScore: 60 });
      expect(service.getDefaultScore()).toBe(60);
    });
  });

  describe('generateScoringGuide', () => {
    it('should generate scoring guide text', () => {
      const service = new ScoringConfigService();
      const guide = service.generateScoringGuide();
      
      expect(guide).toContain('Use this scoring guide:');
      expect(guide).toContain('90-100 (Green)');
      expect(guide).toContain('80-89 (Green)');
      expect(guide).toContain('70-79 (Green)');
      expect(guide).toContain('60-69 (Yellow)');
      expect(guide).toContain('50-59 (Yellow)');
      expect(guide).toContain('40-49 (Yellow)');
      expect(guide).toContain('0-39 (Red)');
    });

    it('should generate guide with custom ranges', () => {
      const customService = new ScoringConfigService({
        ranges: {
          excellent: { min: 95, max: 100, description: 'Custom excellent' },
          veryGood: { min: 85, max: 94, description: 'Custom very good' },
          good: { min: 75, max: 84, description: 'Custom good' },
          moderate: { min: 65, max: 74, description: 'Custom moderate' },
          belowAverage: { min: 55, max: 64, description: 'Custom below average' },
          poor: { min: 40, max: 54, description: 'Custom poor' },
          veryPoor: { min: 0, max: 39, description: 'Custom very poor' }
        }
      });

      const guide = customService.generateScoringGuide();
      
      expect(guide).toContain('**95-100 (Green)**: Custom excellent');
      expect(guide).toContain('**85-94 (Green)**: Custom very good');
      expect(guide).toContain('**75-84 (Green)**: Custom good');
    });
  });
});