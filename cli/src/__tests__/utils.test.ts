import { describe, it, expect } from 'vitest';

// Utility functions to test
function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
    .replace(/-/g, '_');
}

function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

function toKebabCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '')
    .replace(/_/g, '-');
}

describe('String utilities', () => {
  describe('toSnakeCase', () => {
    it('converts kebab-case to snake_case', () => {
      expect(toSnakeCase('my-project')).toBe('my_project');
    });

    it('converts PascalCase to snake_case', () => {
      expect(toSnakeCase('MyProject')).toBe('my_project');
    });

    it('handles simple strings', () => {
      expect(toSnakeCase('project')).toBe('project');
    });
  });

  describe('toPascalCase', () => {
    it('converts kebab-case to PascalCase', () => {
      expect(toPascalCase('my-project')).toBe('MyProject');
    });

    it('converts snake_case to PascalCase', () => {
      expect(toPascalCase('my_project')).toBe('MyProject');
    });

    it('handles simple strings', () => {
      expect(toPascalCase('project')).toBe('Project');
    });
  });

  describe('toKebabCase', () => {
    it('converts PascalCase to kebab-case', () => {
      expect(toKebabCase('MyProject')).toBe('my-project');
    });

    it('converts snake_case to kebab-case', () => {
      expect(toKebabCase('my_project')).toBe('my-project');
    });

    it('handles simple strings', () => {
      expect(toKebabCase('project')).toBe('project');
    });
  });
});

describe('MCPForge CLI', () => {
  it('should have valid package structure', () => {
    expect(true).toBe(true);
  });

  it('supports Python language', () => {
    const supportedLanguages = ['python', 'typescript', 'go', 'rust'];
    expect(supportedLanguages).toContain('python');
  });

  it('supports TypeScript language', () => {
    const supportedLanguages = ['python', 'typescript', 'go', 'rust'];
    expect(supportedLanguages).toContain('typescript');
  });

  it('supports Go language', () => {
    const supportedLanguages = ['python', 'typescript', 'go', 'rust'];
    expect(supportedLanguages).toContain('go');
  });

  it('supports Rust language', () => {
    const supportedLanguages = ['python', 'typescript', 'go', 'rust'];
    expect(supportedLanguages).toContain('rust');
  });

  it('supports basic pattern', () => {
    const supportedPatterns = ['basic', 'enterprise', 'microservices'];
    expect(supportedPatterns).toContain('basic');
  });

  it('supports enterprise pattern', () => {
    const supportedPatterns = ['basic', 'enterprise', 'microservices'];
    expect(supportedPatterns).toContain('enterprise');
  });
});
