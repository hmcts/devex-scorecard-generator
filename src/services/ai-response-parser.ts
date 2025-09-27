import { ScorecardResult } from '../types';
import { ScoringConfigService, defaultScoringConfig } from './scoring-config';

/**
 * Service responsible for parsing AI responses into structured results
 */
export class AIResponseParserService {
  private scoringConfig: ScoringConfigService;

  constructor(scoringConfig?: ScoringConfigService) {
    this.scoringConfig = scoringConfig || defaultScoringConfig;
  }
  /**
   * Parse AI response into structured result
   */
  public parseAIResponse(response: string): ScorecardResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return this.validateAndNormalizeScorecardResult(parsed);
      }
    } catch (error) {
      console.error('Error parsing AI response as JSON:', error);
    }

    // Fallback parsing if JSON parsing fails
    console.warn('Using fallback parsing for AI response');
    return this.createFallbackResult(response);
  }

  /**
   * Validate and normalize a parsed scorecard result
   */
  private validateAndNormalizeScorecardResult(parsed: any): ScorecardResult {
    const score = this.validateScore(parsed.score);
    const color = this.determineColor(score, parsed.color);
    const analysis = this.validateAnalysis(parsed.analysis);
    const recommendations = this.validateRecommendations(parsed.recommendations);

    return {
      score,
      color,
      analysis,
      recommendations
    };
  }

  /**
   * Validate and normalize score value
   */
  private validateScore(score: any): number {
    const numScore = typeof score === 'number' ? score : parseInt(String(score), 10);
    
    if (isNaN(numScore)) {
      const defaultScore = this.scoringConfig.getDefaultScore();
      console.warn(`Invalid score value, defaulting to ${defaultScore}`);
      return defaultScore;
    }
    
    // Clamp score between 0 and 100
    return Math.max(0, Math.min(100, numScore));
  }

  /**
   * Determine color based on score and provided color
   */
  private determineColor(score: number, providedColor?: any): 'red' | 'yellow' | 'green' {
    // If a valid color is provided, use it
    if (providedColor && ['red', 'yellow', 'green'].includes(providedColor)) {
      return providedColor as 'red' | 'yellow' | 'green';
    }

    // Determine color based on configured scoring thresholds
    return this.scoringConfig.getScoreColor(score);
  }

  /**
   * Validate and normalize analysis text
   */
  private validateAnalysis(analysis: any): string {
    if (typeof analysis === 'string' && analysis.trim().length > 0) {
      return analysis.trim();
    }
    
    console.warn('Invalid or missing analysis, using default');
    return 'No detailed analysis provided by the AI service.';
  }

  /**
   * Validate and normalize recommendations array
   */
  private validateRecommendations(recommendations: any): string[] {
    if (Array.isArray(recommendations)) {
      const validRecommendations = recommendations
        .filter(rec => typeof rec === 'string' && rec.trim().length > 0)
        .map(rec => rec.trim());
      
      if (validRecommendations.length > 0) {
        return validRecommendations;
      }
    }
    
    console.warn('Invalid or missing recommendations, using defaults');
    return ['Review repository documentation and structure'];
  }

  /**
   * Create fallback result when parsing fails
   */
  private createFallbackResult(response: string): ScorecardResult {
    const defaultScore = this.scoringConfig.getDefaultScore();
    const color = this.scoringConfig.getScoreColor(defaultScore);
    
    return {
      score: defaultScore,
      color,
      analysis: response || 'AI analysis failed to provide a structured response.',
      recommendations: ['Review repository documentation and structure']
    };
  }

  /**
   * Validate that response contains required JSON structure
   */
  public validateResponseStructure(response: string): boolean {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return false;
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Check for required fields
      return (
        typeof parsed.score !== 'undefined' &&
        typeof parsed.analysis !== 'undefined' &&
        Array.isArray(parsed.recommendations)
      );
    } catch {
      return false;
    }
  }
}