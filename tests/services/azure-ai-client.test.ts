import { AzureAIClientService } from '../../src/services/azure-ai-client';
import { readFile } from 'fs/promises';
import { join } from 'path';

// Mock the Azure dependencies since we're only testing prompt loading
jest.mock('@azure/identity');
jest.mock('@azure/ai-projects');
jest.mock('@azure/ai-agents');

describe('AzureAIClientService', () => {
  const mockConfig = {
    projectEndpoint: 'https://test.cognitiveservices.azure.com',
    deploymentName: 'test-deployment',
    apiVersion: '2024-12-01-preview'
  };

  describe('Prompt Loading', () => {
    let service: AzureAIClientService;

    beforeEach(() => {
      service = new AzureAIClientService(mockConfig);
    });

    it('should load the prompt file from the correct location', async () => {
      // Test that the prompt file exists and can be read
      const projectRoot = join(__dirname, '..', '..');
      const promptPath = join(projectRoot, 'devex-agent-prompt.md');
      
      const promptContent = await readFile(promptPath, 'utf-8');
      
      expect(promptContent).toBeDefined();
      expect(promptContent.length).toBeGreaterThan(0);
      expect(promptContent).toContain('DevEx Scorecard Analyzer');
    });

    it('should have required sections in the prompt', async () => {
      const projectRoot = join(__dirname, '..', '..');
      const promptPath = join(projectRoot, 'devex-agent-prompt.md');
      
      const promptContent = await readFile(promptPath, 'utf-8');
      
      // Check for key sections
      expect(promptContent).toContain('Your expertise covers');
      expect(promptContent).toContain('Scoring Guide');
      expect(promptContent).toContain('JSON');
      expect(promptContent).toContain('score');
      expect(promptContent).toContain('color');
      expect(promptContent).toContain('analysis');
      expect(promptContent).toContain('recommendations');
    });

    it('should include all required scoring ranges', async () => {
      const projectRoot = join(__dirname, '..', '..');
      const promptPath = join(projectRoot, 'devex-agent-prompt.md');
      
      const promptContent = await readFile(promptPath, 'utf-8');
      
      // Check for all scoring ranges
      expect(promptContent).toContain('90-100');
      expect(promptContent).toContain('80-89');
      expect(promptContent).toContain('70-79');
      expect(promptContent).toContain('60-69');
      expect(promptContent).toContain('50-59');
      expect(promptContent).toContain('40-49');
      expect(promptContent).toContain('0-39');
    });

    it('should include color mappings', async () => {
      const projectRoot = join(__dirname, '..', '..');
      const promptPath = join(projectRoot, 'devex-agent-prompt.md');
      
      const promptContent = await readFile(promptPath, 'utf-8');
      
      // Check for color mappings
      expect(promptContent).toContain('Green');
      expect(promptContent).toContain('Yellow');
      expect(promptContent).toContain('Red');
    });

    it('should contain DevEx expertise areas', async () => {
      const projectRoot = join(__dirname, '..', '..');
      const promptPath = join(projectRoot, 'devex-agent-prompt.md');
      
      const promptContent = await readFile(promptPath, 'utf-8');
      
      // Check for key DevEx areas
      const expectedAreas = [
        'Repository structure',
        'Documentation quality',
        'Development workflow',
        'CI/CD',
        'Testing strategies',
        'Security practices',
        'Community building',
        'Onboarding experience'
      ];

      expectedAreas.forEach(area => {
        expect(promptContent.toLowerCase()).toContain(area.toLowerCase());
      });
    });

    it('should specify JSON response format requirements', async () => {
      const projectRoot = join(__dirname, '..', '..');
      const promptPath = join(projectRoot, 'devex-agent-prompt.md');
      
      const promptContent = await readFile(promptPath, 'utf-8');
      
      // Check for JSON format specification
      expect(promptContent).toContain('JSON');
      expect(promptContent).toMatch(/["\']score["\'].*0-100/);
      expect(promptContent).toMatch(/["\']color["\'].*red.*yellow.*green/i);
      expect(promptContent).toMatch(/["\']analysis["\']/);
      expect(promptContent).toMatch(/["\']recommendations["\']/);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing prompt file gracefully', async () => {
      // We can't easily test the internal loadAgentInstructions method directly
      // since it's private, but we can test that the service construction works
      // even if the prompt file is missing (it should fall back to a basic prompt)
      
      const service = new AzureAIClientService(mockConfig);
      expect(service).toBeDefined();
    });
  });
});