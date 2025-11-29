# Contributing to MCPForge

Thank you for your interest in contributing to MCPForge. This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## How to Contribute

### Reporting Issues

Before creating an issue, please:

1. Search existing issues to avoid duplicates
2. Use the appropriate issue template
3. Provide clear reproduction steps
4. Include relevant environment information

### Submitting Pull Requests

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes
4. Write or update tests as needed
5. Ensure all tests pass
6. Submit a pull request

### Branch Naming

Use descriptive branch names:

- `feature/add-rust-templates`
- `fix/cli-validation-error`
- `docs/update-patterns`
- `refactor/simplify-adapter`

### Commit Messages

Follow conventional commits:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build/tooling changes

Examples:

```
feat(cli): add diagram generation command
fix(templates): correct Python import paths
docs(patterns): add circuit breaker documentation
```

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Python >= 3.11 (for testing Python templates)
- Go >= 1.21 (for testing Go templates)
- Rust >= 1.75 (for testing Rust templates)

### Local Development

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/mcpforge.git
cd mcpforge

# Install dependencies
npm install

# Build the project
npm run build

# Link for local testing
npm link

# Run tests
npm test
```

### Testing Templates

```bash
# Test Python templates
cd templates/python/basic
python -m pytest

# Test TypeScript templates
cd templates/typescript/basic
npm test

# Test Go templates
cd templates/go/basic
go test ./...

# Test Rust templates
cd templates/rust/basic
cargo test
```

## Project Structure

```
mcpforge/
  cli/
    src/
      index.ts          # CLI entry point
      commands/         # Command implementations
      utils/            # Utility functions
    templates/          # Handlebars templates for scaffolding
  templates/
    python/             # Python project templates
    typescript/         # TypeScript project templates
    go/                 # Go project templates
    rust/               # Rust project templates
  docs/
    patterns/           # Design pattern documentation
    guides/             # User guides
    api/                # API reference
  examples/             # Example implementations
  .github/              # GitHub configuration
```

## Adding a New Pattern

1. Create documentation in `docs/patterns/`
2. Add implementations for each language in `templates/`
3. Add example usage in `examples/`
4. Update the README patterns table
5. Add CLI support if needed

### Pattern Documentation Template

```markdown
# Pattern Name

## Intent

Brief description of what the pattern achieves.

## Problem

The problem this pattern solves.

## Solution

How the pattern solves the problem.

## Structure

Diagram showing the pattern structure.

## Implementation

### Python

```python
# Implementation code
```

### TypeScript

```typescript
// Implementation code
```

## When to Use

- Scenario 1
- Scenario 2

## Related Patterns

- Related Pattern 1
- Related Pattern 2
```

## Adding a New Language

1. Create template structure in `templates/<language>/`
2. Add CLI support in `cli/src/commands/new.ts`
3. Create examples in `examples/<language>/`
4. Update documentation
5. Add CI workflow for the language

## Style Guidelines

### TypeScript

- Use ESLint configuration provided
- Prefer `const` over `let`
- Use async/await over raw promises
- Document public APIs with JSDoc

### Python

- Follow PEP 8
- Use type hints
- Document with docstrings
- Use black for formatting

### Documentation

- Use clear, concise language
- Include code examples
- Keep examples runnable
- Update table of contents

## Review Process

1. All PRs require at least one approval
2. CI checks must pass
3. Documentation must be updated
4. Tests must be included for new features

## Release Process

Releases are managed by maintainers using semantic versioning:

- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes

## Questions?

- Open a GitHub Discussion for questions
- Join our Discord for real-time help
- Check existing issues and discussions first

Thank you for contributing to MCPForge.
