import { DEVEX_SCORECARD_TEMPLATE, generateScorecardRerunComment } from '../../src/services/scorecard-template';

describe('ScorecardTemplateService', () => {
  describe('DEVEX_SCORECARD_TEMPLATE', () => {
    it('should contain the main DevEx Scorecard title', () => {
      expect(DEVEX_SCORECARD_TEMPLATE).toContain('# 🎯 DevEx Scorecard');
    });

    it('should contain all major sections', () => {
      const sections = [
        '### 📚 Documentation',
        '### 🏗️ Project Structure',
        '### 🔧 Development Setup',
        '### 🧪 Testing',
        '### 🚀 CI/CD',
        '### 🔒 Security',
        '### 🤝 Community'
      ];

      sections.forEach(section => {
        expect(DEVEX_SCORECARD_TEMPLATE).toContain(section);
      });
    });

    it('should contain the re-run scorecard checkbox', () => {
      expect(DEVEX_SCORECARD_TEMPLATE).toContain('- [ ] **Re-run scorecard**');
    });
  });

  describe('generateScorecardRerunComment', () => {
    it('should generate a comment with timestamp', () => {
      const comment = generateScorecardRerunComment();
      
      expect(comment).toContain('🔄 **Scorecard re-run completed**');
      expect(comment).toContain('_Generated at:');
      expect(comment).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO timestamp format
    });

    it('should generate different timestamps for multiple calls', (done) => {
      const comment1 = generateScorecardRerunComment();
      
      setTimeout(() => {
        const comment2 = generateScorecardRerunComment();
        expect(comment1).not.toBe(comment2);
        done();
      }, 1);
    });
  });
});