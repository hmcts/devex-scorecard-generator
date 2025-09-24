import { generateAIScorecardTemplate, generateAIScorecardRerunComment } from '../../src/services/ai-scorecard-template';
import { ScorecardResult } from '../../src/types';

describe('AI Scorecard Template', () => {
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
      expect(template).toContain('**Category:** Excellent');
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
      expect(template).toContain('**Category:** Good');
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
      expect(template).toContain('## 📋 Detailed Criteria Checklist');
      expect(template).toContain('### 📚 Documentation');
      expect(template).toContain('### 🏗️ Project Structure');
      expect(template).toContain('### 🔧 Development Setup');
      expect(template).toContain('### 🧪 Testing');
      expect(template).toContain('### 🚀 CI/CD');
      expect(template).toContain('### 🔒 Security');
      expect(template).toContain('### 🤝 Community');
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
      expect(comment).toContain('**Key Insights:**');
      expect(comment).toContain('This repository demonstrates good practices.');
      expect(comment).toContain('It has comprehensive documentation.');
      expect(comment).toContain('The code structure is well organized.');
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

    it('should handle short analysis text', () => {
      const result: ScorecardResult = {
        score: 65,
        color: 'yellow',
        analysis: 'Short analysis',
        recommendations: []
      };

      const comment = generateAIScorecardRerunComment(result);

      expect(comment).toContain('**Key Insights:**');
      expect(comment).toContain('Short analysis');
    });

    it('should limit key insights to first 3 lines', () => {
      const result: ScorecardResult = {
        score: 65,
        color: 'yellow',
        analysis: 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5',
        recommendations: []
      };

      const comment = generateAIScorecardRerunComment(result);

      expect(comment).toContain('Line 1');
      expect(comment).toContain('Line 2');
      expect(comment).toContain('Line 3');
      expect(comment).not.toContain('Line 4');
      expect(comment).not.toContain('Line 5');
    });
  });
});