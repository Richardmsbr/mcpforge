# Getting Started

MCPForge is the architecture patterns framework for building production-ready MCP (Model Context Protocol) servers.

## What is MCP?

The Model Context Protocol (MCP) is an open standard created by Anthropic that enables AI systems to securely interact with external data sources and tools. Think of it as a universal adapter that connects AI models to the real world.

## What is MCPForge?

MCPForge provides:

- **Design Patterns** - Battle-tested solutions for common MCP challenges
- **Templates** - Production-ready project scaffolds in multiple languages
- **CLI Tool** - Generate, validate, and manage MCP server projects
- **Documentation** - Comprehensive guides for every pattern and feature

## Prerequisites

- Node.js 18 or later (for the CLI)
- One of: Python 3.11+, Node.js 18+, Go 1.21+, or Rust 1.75+

## Installation

```bash
npm install -g mcpforge
```

Verify the installation:

```bash
mcpforge --version
```

## Create Your First Server

```bash
mcpforge new hello-mcp --lang python
cd hello-mcp
```

This creates a new MCP server with:

- Basic project structure
- Sample tools (hello, add)
- Sample resource (config://settings)
- README and configuration files

## Run the Server

```bash
pip install -e .
python -m hello_mcp
```

## Test with Claude

Add to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "hello-mcp": {
      "command": "python",
      "args": ["-m", "hello_mcp"]
    }
  }
}
```

Restart Claude Desktop and try:

> "Use the hello tool to greet me"

## Next Steps

- [Explore the CLI commands](./cli-commands.md)
- [Learn about design patterns](../patterns/)
- [Choose a template for your project](./templates-python.md)
