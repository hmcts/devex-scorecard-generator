import { generateAIScorecardTemplate, generateAIScorecardRerunComment } from '../../src/services/ai-scorecard-template';
import { ScorecardResult, Repository } from '../../src/types';

describe('AI Scorecard Template', () => {
  const mockRepository: Repository = {
    name: 'test-repo',
    full_name: 'hmcts/test-repo',
    owner: {
      login: 'hmcts'
    }
  };
  describe('generateAIScorecardTemplate', () => {
    it('should generate template for high score (green)', () => {
      const result: ScorecardResult = {
        score: 85,
        color: 'green',
        analysis: 'Excellent repository with comprehensive documentation and good practices.',
        recommendations: [
          'Consider adding more integration tests',
          'Update dependency versions'
        ]
      };

      const template = generateAIScorecardTemplate(result);

      expect(template).toContain('# 🎯 DevEx Scorecard');
      expect(template).toContain('## 📊 Overall Score: 85/100 🟢');
      expect(template).toContain('**Category:** Very Good'); // Score 85 = Very Good (80-89)
      expect(template).toContain('## 🤖 AI Analysis');
      expect(template).toContain('Excellent repository with comprehensive documentation and good practices.');
      expect(template).toContain('## 💡 Recommendations');
      expect(template).toContain('1. Consider adding more integration tests');
      expect(template).toContain('2. Update dependency versions');
      expect(template).toContain('- [ ] **Re-run AI analysis**');
      expect(template).toContain('This scorecard was generated automatically using AI analysis');
    });

    it('should generate template for medium score (yellow)', () => {
      const result: ScorecardResult = {
        score: 60,
        color: 'yellow',
        analysis: 'Good foundation but room for improvement in several areas.',
        recommendations: [
          'Add comprehensive README',
          'Implement automated testing',
          'Set up CI/CD pipeline'
        ]
      };

      const template = generateAIScorecardTemplate(result);

      expect(template).toContain('## 📊 Overall Score: 60/100 🟡');
      expect(template).toContain('**Category:** Moderate'); // Score 60 = Moderate (60-69)
      expect(template).toContain('Good foundation but room for improvement in several areas.');
      expect(template).toContain('1. Add comprehensive README');
      expect(template).toContain('2. Implement automated testing');
      expect(template).toContain('3. Set up CI/CD pipeline');
    });

    it('should generate template for low score (red)', () => {
      const result: ScorecardResult = {
        score: 25,
        color: 'red',
        analysis: 'Repository needs significant improvements in documentation and structure.',
        recommendations: [
          'Create basic README file',
          'Add project structure',
          'Define contribution guidelines'
        ]
      };

      const template = generateAIScorecardTemplate(result);

      expect(template).toContain('## 📊 Overall Score: 25/100 🔴');
      expect(template).toContain('**Category:** Needs Improvement');
      expect(template).toContain('Repository needs significant improvements in documentation and structure.');
      expect(template).toContain('1. Create basic README file');
      expect(template).toContain('2. Add project structure');
      expect(template).toContain('3. Define contribution guidelines');
    });

    it('should include all required sections', () => {
      const result: ScorecardResult = {
        score: 70,
        color: 'yellow',
        analysis: 'Test analysis',
        recommendations: ['Test recommendation']
      };

      const template = generateAIScorecardTemplate(result);

      // Check for all main sections
      expect(template).toContain('## 📊 Overall Score:');
      expect(template).toContain('## 🤖 AI Analysis');
      expect(template).toContain('## 💡 Recommendations');
      expect(template).toContain('## 🔄 Actions');
      
      // Check that timestamp is included
      expect(template).toMatch(/_Last updated: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z_/);
    });

    it('should handle empty recommendations', () => {
      const result: ScorecardResult = {
        score: 50,
        color: 'yellow',
        analysis: 'Test analysis',
        recommendations: []
      };

      const template = generateAIScorecardTemplate(result);

      expect(template).toContain('## 💡 Recommendations');
      // Should not have numbered recommendations
      expect(template).not.toMatch(/\d+\. /);
    });

    it('should generate GitHub issue links when repository is provided', () => {
      const result: ScorecardResult = {
        score: 70,
        color: 'yellow',
        analysis: 'Test analysis',
        recommendations: [
          'Add comprehensive documentation',
          'Implement automated testing'
        ]
      };

      const template = generateAIScorecardTemplate(result, undefined, mockRepository);

      expect(template).toContain('1. Add comprehensive documentation');
      expect(template).toContain('👉 [Create GitHub Issue](https://github.com/hmcts/test-repo/issues/new');
      expect(template).toContain('assignees=copilot');
      expect(template).toContain('title=%E2%9C%A8+DevEx+Improvement+%231');
      expect(template).toContain('2. Implement automated testing');
      expect(template).toContain('💡 Tip:** Click the "Create GitHub Issue" links above to automatically create actionable issues that Copilot can help implement!');
    });

    it('should fall back to plain text when no repository is provided', () => {
      const result: ScorecardResult = {
        score: 70,
        color: 'yellow',
        analysis: 'Test analysis',
        recommendations: [
          'Add comprehensive documentation',
          'Implement automated testing'
        ]
      };

      const template = generateAIScorecardTemplate(result);

      expect(template).toContain('1. Add comprehensive documentation');
      expect(template).toContain('2. Implement automated testing');
      expect(template).not.toContain('👉 [Create GitHub Issue]');
      expect(template).not.toContain('💡 Tip:**');
    });

    it('should properly encode URLs for GitHub issue creation', () => {
      const result: ScorecardResult = {
        score: 70,
        color: 'yellow',
        analysis: 'Test analysis',
        recommendations: [
          'Add documentation with special characters: & = ? #'
        ]
      };

      const template = generateAIScorecardTemplate(result, undefined, mockRepository);

      expect(template).toContain('Create GitHub Issue');
      // URL should be properly encoded
      expect(template).toContain('https://github.com/hmcts/test-repo/issues/new?');
      expect(template).toContain('assignees=copilot');
    });

    it('should handle multiple recommendations with unique issue links', () => {
      const result: ScorecardResult = {
        score: 60,
        color: 'yellow',
        analysis: 'Test analysis',
        recommendations: [
          'First recommendation',
          'Second recommendation',
          'Third recommendation'
        ]
      };

      const template = generateAIScorecardTemplate(result, undefined, mockRepository);

      expect(template).toContain('DevEx+Improvement+%231');
      expect(template).toContain('DevEx+Improvement+%232');
      expect(template).toContain('DevEx+Improvement+%233');
      // Should have 3 recommendation links plus 1 in the tip text = 4 total
      expect(template.match(/Create GitHub Issue/g)).toHaveLength(4);
    });
  });

  describe('generateAIScorecardRerunComment', () => {
    it('should generate rerun comment with score and insights', () => {
      const result: ScorecardResult = {
        score: 78,
        color: 'green',
        analysis: 'This repository demonstrates good practices.\nIt has comprehensive documentation.\nThe code structure is well organized.',
        recommendations: ['Add more tests', 'Update dependencies']
      };

      const comment = generateAIScorecardRerunComment(result);

      expect(comment).toContain('🔄 **AI Scorecard Analysis Completed**');
      expect(comment).toContain('**Score:** 78/100 🟢');
      expect(comment).toContain('Please review the updated analysis and recommendations above.');
      expect(comment).toMatch(/_Generated at: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z_/);
    });

    it('should show correct emoji for different colors', () => {
      const redResult: ScorecardResult = {
        score: 30,
        color: 'red',
        analysis: 'Needs improvement',
        recommendations: []
      };

      const yellowResult: ScorecardResult = {
        score: 55,
        color: 'yellow',
        analysis: 'Room for improvement',
        recommendations: []
      };

      const greenResult: ScorecardResult = {
        score: 80,
        color: 'green',
        analysis: 'Good practices',
        recommendations: []
      };

      expect(generateAIScorecardRerunComment(redResult)).toContain('**Score:** 30/100 🔴');
      expect(generateAIScorecardRerunComment(yellowResult)).toContain('**Score:** 55/100 🟡');
      expect(generateAIScorecardRerunComment(greenResult)).toContain('**Score:** 80/100 🟢');
    });
  });
});