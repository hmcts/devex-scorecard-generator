import { ScorecardResult } from '../types';

/**
 * Generate a DevEx Scorecard issue body using AI analysis results
 */
export function generateAIScorecardTemplate(result: ScorecardResult): string {
  const colorEmoji = {
    red: '🔴',
    yellow: '🟡',
    green: '🟢'
  };

  const scoreCategory = result.score >= 71 ? 'Excellent' : result.score >= 41 ? 'Good' : 'Needs Improvement';

  return `# 🎯 DevEx Scorecard

This repository has been automatically analyzed for developer experience using AI. Here are the results:

## 📊 Overall Score: ${result.score}/100 ${colorEmoji[result.color]}

**Category:** ${scoreCategory}

## 🤖 AI Analysis

${result.analysis}

## 💡 Recommendations

${result.recommendations.map((rec, index) => `${index + 1}. ${rec}`).join('\n')}

## 🔄 Actions

- [ ] **Re-run AI analysis** - Check this box to trigger a fresh AI-powered analysis

> This scorecard was generated automatically using AI analysis. Check the box above to request an updated analysis.

_Last updated: ${new Date().toISOString()}_`;
}

export function generateAIScorecardRerunComment(result: ScorecardResult): string {
  return `🔄 **AI Scorecard Analysis Completed**

The DevEx Scorecard has been refreshed with a new AI analysis:

**Score:** ${result.score}/100 ${result.color === 'green' ? '🟢' : result.color === 'yellow' ? '🟡' : '🔴'}

**Key Insights:**
${result.analysis.split('\n').slice(0, 3).join('\n')}

Please review the updated analysis and recommendations above.

_Generated at: ${new Date().toISOString()}_`;
}