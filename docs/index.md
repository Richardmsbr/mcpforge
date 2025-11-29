---
layout: home

hero:
  name: MCPForge
  text: Architecture Patterns for MCP
  tagline: Production-ready patterns, templates, and tools for building Model Context Protocol servers
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/Richardmsbr/mcpforge

features:
  - icon:
      src: /patterns-icon.svg
    title: Design Patterns Library
    details: 12+ battle-tested patterns including Adapter, Gateway, Circuit Breaker, and more. Each with implementations in multiple languages.
  - icon:
      src: /multi-lang-icon.svg
    title: Multi-Language Templates
    details: Production-ready templates for Python, TypeScript, Go, and Rust. From basic servers to enterprise microservices.
  - icon:
      src: /cli-icon.svg
    title: Powerful CLI
    details: Generate projects, add tools, create diagrams, and validate code. All from a single command-line interface.
  - icon:
      src: /security-icon.svg
    title: Security Built-In
    details: OAuth 2.1, rate limiting, input validation, and hardening guides. Ship secure MCP servers by default.
---

## Quick Start

```bash
# Install MCPForge CLI
npm install -g mcpforge

# Create a new MCP server
mcpforge new my-server --lang python --pattern basic

# Start developing
cd my-server
pip install -e .
python -m my_server
```

## Why MCPForge?

The MCP ecosystem is growing rapidly, but developers face common challenges:

- **No standardized patterns** - Every project reinvents the wheel
- **Language silos** - Knowledge doesn't transfer between languages
- **Security gaps** - Auth, validation, and hardening are afterthoughts
- **Scaling uncertainty** - No guidance for production deployments

MCPForge solves these problems with a unified approach to MCP server development.

## Supported Languages

| Language | SDK | Templates | Status |
|----------|-----|-----------|--------|
| Python | FastMCP 2.0 | basic, enterprise, microservices | Stable |
| TypeScript | Official SDK | basic, enterprise, microservices | Stable |
| Go | mcp-go | basic, enterprise | Beta |
| Rust | rmcp | basic, enterprise | Beta |

## Community

- [GitHub Discussions](https://github.com/Richardmsbr/mcpforge/discussions) - Questions and ideas
- [Discord](https://discord.gg/mcpforge) - Real-time chat
- [Twitter](https://twitter.com/mcpforge) - Updates

## License

MIT License - Use freely in personal and commercial projects.
