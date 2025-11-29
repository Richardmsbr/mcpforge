# MCPForge

**The Architecture Patterns Framework for Model Context Protocol**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![GitHub Stars](https://img.shields.io/github/stars/Richardmsbr/mcpforge?style=social)](https://github.com/Richardmsbr/mcpforge)

---

MCPForge is a comprehensive framework providing battle-tested architecture patterns, production-ready templates, and a powerful CLI for building MCP (Model Context Protocol) servers across multiple languages.

**Stop reinventing the wheel. Start forging production-ready MCP servers.**

---

## Why MCPForge?

The MCP ecosystem is growing fast, but developers face the same challenges repeatedly:

| Problem | MCPForge Solution |
|---------|-------------------|
| No standardized patterns | 12+ documented design patterns with implementations |
| Language-specific knowledge | Unified templates for Python, TypeScript, Go, Rust |
| Boilerplate overhead | CLI generates production-ready scaffolds in seconds |
| Security gaps | Built-in OAuth 2.1, rate limiting, and hardening guides |
| Scaling uncertainty | Enterprise patterns for microservices and gateways |

---

## Features

### Design Patterns Library

Pre-built, documented patterns for every MCP use case:

```
Structural Patterns          Behavioral Patterns         Enterprise Patterns
-------------------          -------------------         -------------------
- Adapter                    - Command                   - API Gateway
- Facade                     - Strategy                  - Service Mesh
- Proxy                      - Observer                  - Circuit Breaker
- Decorator                  - Chain of Responsibility  - Bulkhead
```

### Multi-Language Templates

Production-ready templates with consistent architecture:

```
templates/
  python/
    basic/           # Single-purpose MCP server
    enterprise/      # Auth, logging, monitoring
    microservices/   # Distributed MCP architecture
  typescript/
    basic/
    enterprise/
    microservices/
  go/
    basic/
    enterprise/
  rust/
    basic/
    enterprise/
```

### Powerful CLI

```bash
# Install globally
npm install -g mcpforge

# Create a new MCP server
mcpforge new my-server --lang python --pattern adapter

# Add a tool to existing server
mcpforge add tool search --server my-server

# Generate architecture diagram
mcpforge diagram my-server --output svg

# Validate server structure
mcpforge validate my-server
```

---

## Quick Start

### 1. Install the CLI

```bash
npm install -g mcpforge
```

### 2. Create Your First Server

```bash
mcpforge new my-first-mcp --lang python --pattern basic
cd my-first-mcp
```

### 3. Run and Test

```bash
# Python
pip install -e .
python -m my_first_mcp

# TypeScript
npm install
npm run dev
```

---

## Architecture Patterns

### Adapter Pattern

Transform external APIs into MCP-compatible tools.

```python
# Python Example
from mcpforge import MCPServer, tool, AdapterPattern

class GitHubAdapter(AdapterPattern):
    """Adapts GitHub API to MCP tools"""

    def __init__(self, token: str):
        self.client = GitHub(token)

    @tool(name="list_repos")
    async def list_repositories(self, org: str) -> list[dict]:
        """List repositories for an organization"""
        return await self.client.repos.list(org=org)

server = MCPServer("github-mcp")
server.register_adapter(GitHubAdapter(token=os.getenv("GITHUB_TOKEN")))
```

```typescript
// TypeScript Example
import { MCPServer, tool, AdapterPattern } from 'mcpforge';

class GitHubAdapter extends AdapterPattern {
  private client: Octokit;

  constructor(token: string) {
    super();
    this.client = new Octokit({ auth: token });
  }

  @tool({ name: 'list_repos' })
  async listRepositories(org: string): Promise<Repository[]> {
    const { data } = await this.client.repos.listForOrg({ org });
    return data;
  }
}
```

### Gateway Pattern

Centralized entry point for multiple MCP servers.

```
                    +------------------+
                    |   MCP Gateway    |
                    |  (Auth, Routing) |
                    +--------+---------+
                             |
         +-------------------+-------------------+
         |                   |                   |
+--------v-------+  +--------v-------+  +--------v-------+
|  GitHub MCP    |  |  Database MCP  |  |  Storage MCP   |
|    Server      |  |    Server      |  |    Server      |
+----------------+  +----------------+  +----------------+
```

```python
# Gateway Implementation
from mcpforge import Gateway, route, authenticate

gateway = Gateway("mcp-gateway")

@gateway.route("/github/*")
@authenticate(oauth2=True)
async def github_route(request):
    return await gateway.proxy("github-mcp", request)

@gateway.route("/database/*")
@authenticate(api_key=True)
async def database_route(request):
    return await gateway.proxy("database-mcp", request)
```

### More Patterns

See [docs/patterns/](docs/patterns/) for complete documentation:

- [Adapter Pattern](docs/patterns/adapter.md) - External API integration
- [Facade Pattern](docs/patterns/facade.md) - Simplified interfaces
- [Proxy Pattern](docs/patterns/proxy.md) - Access control and caching
- [Gateway Pattern](docs/patterns/gateway.md) - Centralized routing
- [Circuit Breaker](docs/patterns/circuit-breaker.md) - Fault tolerance
- [Bulkhead Pattern](docs/patterns/bulkhead.md) - Resource isolation
- [CQRS Pattern](docs/patterns/cqrs.md) - Command/Query separation
- [Event Sourcing](docs/patterns/event-sourcing.md) - State management

---

## Templates

### Python Templates

| Template | Use Case | Features |
|----------|----------|----------|
| `basic` | Simple MCP server | Single tool, stdio transport |
| `enterprise` | Production deployment | OAuth 2.1, logging, metrics |
| `microservices` | Distributed systems | Service discovery, tracing |

### TypeScript Templates

| Template | Use Case | Features |
|----------|----------|----------|
| `basic` | Quick prototypes | Minimal dependencies |
| `enterprise` | Full-stack apps | Express integration, SSE |
| `microservices` | Scalable systems | Docker, K8s manifests |

### Go Templates

| Template | Use Case | Features |
|----------|----------|----------|
| `basic` | CLI tools | Single binary output |
| `enterprise` | High-performance | Connection pooling, metrics |

### Rust Templates

| Template | Use Case | Features |
|----------|----------|----------|
| `basic` | Performance-critical | Async runtime, minimal alloc |
| `enterprise` | Systems integration | Tracing, custom transports |

---

## CLI Reference

```bash
mcpforge <command> [options]

Commands:
  new <name>              Create a new MCP server project
  add <type> <name>       Add tool, resource, or prompt to existing project
  diagram <project>       Generate architecture diagram
  validate <project>      Validate project structure and code
  upgrade <project>       Upgrade to latest MCPForge patterns
  docs                    Open documentation in browser

Options:
  --lang, -l              Language: python, typescript, go, rust
  --pattern, -p           Pattern: basic, enterprise, microservices
  --transport, -t         Transport: stdio, sse, http
  --output, -o            Output format for diagrams: svg, png, mermaid
  --help, -h              Show help
  --version, -v           Show version
```

---

## Security Best Practices

MCPForge implements security patterns aligned with the MCP specification:

### Authentication

```python
from mcpforge.security import OAuth2Provider, APIKeyAuth

# OAuth 2.1 (recommended for HTTP transport)
server.use_auth(OAuth2Provider(
    issuer="https://auth.example.com",
    audience="mcp-server"
))

# API Key (for internal services)
server.use_auth(APIKeyAuth(
    header="X-API-Key",
    validator=validate_key
))
```

### Rate Limiting

```python
from mcpforge.security import RateLimiter

server.use_middleware(RateLimiter(
    requests_per_minute=60,
    burst=10
))
```

### Input Validation

```python
from mcpforge.validation import Schema, validate

@tool(name="query_database")
@validate(Schema({
    "query": str,
    "limit": int & Range(1, 100)
}))
async def query_database(query: str, limit: int = 10):
    # Input is validated before execution
    pass
```

---

## Examples

### GitHub Integration Server

```bash
mcpforge new github-mcp --lang python --pattern adapter
cd github-mcp
```

```python
# src/github_mcp/server.py
from mcpforge import MCPServer, tool
from github import Github

server = MCPServer("github-mcp")

@server.tool()
async def search_code(query: str, repo: str) -> list[dict]:
    """Search code in a GitHub repository"""
    g = Github(os.getenv("GITHUB_TOKEN"))
    results = g.search_code(f"{query} repo:{repo}")
    return [{"path": r.path, "url": r.html_url} for r in results[:10]]

@server.tool()
async def create_issue(repo: str, title: str, body: str) -> dict:
    """Create a new issue in a repository"""
    g = Github(os.getenv("GITHUB_TOKEN"))
    repo = g.get_repo(repo)
    issue = repo.create_issue(title=title, body=body)
    return {"number": issue.number, "url": issue.html_url}

if __name__ == "__main__":
    server.run()
```

### Database Query Server

```bash
mcpforge new database-mcp --lang typescript --pattern enterprise
cd database-mcp
```

```typescript
// src/server.ts
import { MCPServer, tool } from 'mcpforge';
import { Pool } from 'pg';

const server = new MCPServer('database-mcp');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

server.tool({
  name: 'query',
  description: 'Execute a read-only SQL query',
  schema: {
    sql: { type: 'string', description: 'SQL query to execute' },
    params: { type: 'array', optional: true }
  }
}, async ({ sql, params }) => {
  // Only allow SELECT statements
  if (!sql.trim().toLowerCase().startsWith('select')) {
    throw new Error('Only SELECT queries are allowed');
  }
  const result = await pool.query(sql, params);
  return result.rows;
});

server.run();
```

---

## Architecture Diagrams

MCPForge auto-generates architecture diagrams from your code:

```bash
mcpforge diagram my-server --output svg
```

```
+------------------------------------------------------------------+
|                         MCP Client                                |
|                    (Claude, ChatGPT, etc.)                        |
+----------------------------------+-------------------------------+
                                   |
                                   v
+------------------------------------------------------------------+
|                        MCP Gateway                                |
|          [Auth] [Rate Limit] [Logging] [Routing]                  |
+--------+-------------------+-------------------+-----------------+
         |                   |                   |
         v                   v                   v
+----------------+  +----------------+  +----------------+
|  GitHub MCP    |  |  Database MCP  |  |  Storage MCP   |
|                |  |                |  |                |
| Tools:         |  | Tools:         |  | Tools:         |
| - search_code  |  | - query        |  | - upload       |
| - create_issue |  | - list_tables  |  | - download     |
| - list_repos   |  | - describe     |  | - list_files   |
+----------------+  +----------------+  +----------------+
```

---

## Roadmap

### v1.0 (Current)
- [x] Core design patterns library
- [x] Python templates (basic, enterprise)
- [x] TypeScript templates (basic, enterprise)
- [x] CLI scaffolding tool
- [x] Documentation site

### v1.1 (Planned)
- [ ] Go templates
- [ ] Rust templates
- [ ] Visual Studio Code extension
- [ ] Architecture diagram generator

### v2.0 (Future)
- [ ] MCP Gateway implementation
- [ ] Kubernetes operators
- [ ] Monitoring dashboard
- [ ] Plugin marketplace

---

## Contributing

We welcome contributions from the community. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup

```bash
git clone https://github.com/Richardmsbr/mcpforge.git
cd mcpforge
npm install
npm run build
npm link
```

### Running Tests

```bash
npm test                    # Unit tests
npm run test:integration    # Integration tests
npm run test:e2e           # End-to-end tests
```

---

## Community

- [GitHub Discussions](https://github.com/Richardmsbr/mcpforge/discussions) - Questions and ideas
- [Discord](https://discord.gg/mcpforge) - Real-time chat
- [Twitter](https://twitter.com/mcpforge) - Updates and announcements

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Acknowledgments

MCPForge builds upon the work of the MCP community:

- [Anthropic](https://anthropic.com) - Model Context Protocol specification
- [FastMCP](https://github.com/jlowin/fastmcp) - Python MCP framework
- [Official MCP SDKs](https://github.com/modelcontextprotocol) - Reference implementations

---

**Built with precision. Forged for production.**
