# Gateway Pattern

## Intent

Provide a single entry point for multiple MCP servers, handling authentication, routing, rate limiting, and cross-cutting concerns.

## Problem

In production environments with multiple MCP servers, each server would need to:
- Implement its own authentication
- Handle rate limiting independently
- Manage logging and monitoring separately
- Expose multiple endpoints to clients

This leads to duplicated code, inconsistent security, and complex client configurations.

## Solution

Create a gateway server that:
- Acts as the single entry point for all MCP requests
- Routes requests to appropriate backend servers
- Handles authentication uniformly
- Implements rate limiting and throttling
- Provides centralized logging and monitoring

## Structure

```
                         +------------------------+
                         |      MCP Client        |
                         +----------+-------------+
                                    |
                                    v
+---------------------------------------------------------------+
|                        MCP Gateway                             |
|  +----------+  +----------+  +----------+  +----------------+  |
|  |   Auth   |  |  Router  |  |  Rate    |  |    Logging     |  |
|  | Handler  |  |          |  |  Limiter |  |    Metrics     |  |
|  +----------+  +----------+  +----------+  +----------------+  |
+---------------------------------------------------------------+
         |                |                |
         v                v                v
+----------------+ +----------------+ +----------------+
|   GitHub MCP   | |  Database MCP  | |  Storage MCP   |
+----------------+ +----------------+ +----------------+
```

## Implementation

### Python

```python
from fastmcp import FastMCP
from fastmcp.security import OAuth2Provider
import httpx
import asyncio
from typing import Any
from dataclasses import dataclass
from collections import defaultdict
import time

@dataclass
class ServerConfig:
    name: str
    url: str
    transport: str = "stdio"
    timeout: float = 30.0

class RateLimiter:
    def __init__(self, requests_per_minute: int = 60):
        self.rpm = requests_per_minute
        self.requests: dict[str, list[float]] = defaultdict(list)

    async def check(self, client_id: str) -> bool:
        now = time.time()
        minute_ago = now - 60

        # Clean old requests
        self.requests[client_id] = [
            t for t in self.requests[client_id] if t > minute_ago
        ]

        if len(self.requests[client_id]) >= self.rpm:
            return False

        self.requests[client_id].append(now)
        return True

class MCPGateway:
    def __init__(self, name: str):
        self.server = FastMCP(name)
        self.backends: dict[str, ServerConfig] = {}
        self.rate_limiter = RateLimiter()
        self.metrics: dict[str, int] = defaultdict(int)

    def register_backend(self, config: ServerConfig):
        """Register a backend MCP server."""
        self.backends[config.name] = config

    async def proxy_request(
        self,
        backend: str,
        tool: str,
        arguments: dict[str, Any],
        client_id: str = "anonymous"
    ) -> Any:
        """Proxy a tool request to a backend server."""
        # Rate limiting
        if not await self.rate_limiter.check(client_id):
            raise Exception("Rate limit exceeded")

        # Get backend config
        config = self.backends.get(backend)
        if not config:
            raise Exception(f"Unknown backend: {backend}")

        # Record metrics
        self.metrics[f"{backend}.{tool}"] += 1

        # Make request to backend
        # In production, this would use the MCP client protocol
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{config.url}/tools/{tool}",
                json=arguments,
                timeout=config.timeout
            )
            return response.json()


# Create gateway
gateway = MCPGateway("mcp-gateway")

# Register backends
gateway.register_backend(ServerConfig(
    name="github",
    url="http://localhost:8001",
))
gateway.register_backend(ServerConfig(
    name="database",
    url="http://localhost:8002",
))
gateway.register_backend(ServerConfig(
    name="storage",
    url="http://localhost:8003",
))

# Expose gateway tools
server = gateway.server

@server.tool()
async def github_list_repos(org: str) -> list[dict]:
    """List repositories from GitHub.

    Args:
        org: GitHub organization name
    """
    return await gateway.proxy_request(
        backend="github",
        tool="list_repos",
        arguments={"org": org}
    )

@server.tool()
async def github_search_code(query: str, repo: str) -> list[dict]:
    """Search code in GitHub repository.

    Args:
        query: Search query
        repo: Repository (owner/repo)
    """
    return await gateway.proxy_request(
        backend="github",
        tool="search_code",
        arguments={"query": query, "repo": repo}
    )

@server.tool()
async def database_query(sql: str) -> list[dict]:
    """Execute a database query.

    Args:
        sql: SQL query to execute
    """
    return await gateway.proxy_request(
        backend="database",
        tool="query",
        arguments={"sql": sql}
    )

@server.tool()
async def storage_list(path: str = "/") -> list[dict]:
    """List files in storage.

    Args:
        path: Directory path
    """
    return await gateway.proxy_request(
        backend="storage",
        tool="list",
        arguments={"path": path}
    )

@server.tool()
async def gateway_metrics() -> dict:
    """Get gateway metrics."""
    return {
        "total_requests": sum(gateway.metrics.values()),
        "by_tool": dict(gateway.metrics),
        "registered_backends": list(gateway.backends.keys()),
    }
```

### TypeScript

```typescript
import { FastMCP } from 'fastmcp';

interface ServerConfig {
  name: string;
  url: string;
  timeout?: number;
}

interface RateLimitEntry {
  timestamps: number[];
}

class RateLimiter {
  private rpm: number;
  private requests: Map<string, RateLimitEntry> = new Map();

  constructor(requestsPerMinute: number = 60) {
    this.rpm = requestsPerMinute;
  }

  check(clientId: string): boolean {
    const now = Date.now();
    const minuteAgo = now - 60000;

    let entry = this.requests.get(clientId);
    if (!entry) {
      entry = { timestamps: [] };
      this.requests.set(clientId, entry);
    }

    // Clean old requests
    entry.timestamps = entry.timestamps.filter(t => t > minuteAgo);

    if (entry.timestamps.length >= this.rpm) {
      return false;
    }

    entry.timestamps.push(now);
    return true;
  }
}

class MCPGateway {
  private server: FastMCP;
  private backends: Map<string, ServerConfig> = new Map();
  private rateLimiter: RateLimiter;
  private metrics: Map<string, number> = new Map();

  constructor(name: string) {
    this.server = new FastMCP(name);
    this.rateLimiter = new RateLimiter();
  }

  registerBackend(config: ServerConfig): void {
    this.backends.set(config.name, config);
  }

  async proxyRequest(
    backend: string,
    tool: string,
    args: Record<string, unknown>,
    clientId: string = 'anonymous'
  ): Promise<unknown> {
    if (!this.rateLimiter.check(clientId)) {
      throw new Error('Rate limit exceeded');
    }

    const config = this.backends.get(backend);
    if (!config) {
      throw new Error(`Unknown backend: ${backend}`);
    }

    const key = `${backend}.${tool}`;
    this.metrics.set(key, (this.metrics.get(key) || 0) + 1);

    const response = await fetch(`${config.url}/tools/${tool}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(config.timeout || 30000),
    });

    return response.json();
  }

  getServer(): FastMCP {
    return this.server;
  }

  getMetrics(): Record<string, unknown> {
    return {
      totalRequests: Array.from(this.metrics.values()).reduce((a, b) => a + b, 0),
      byTool: Object.fromEntries(this.metrics),
      registeredBackends: Array.from(this.backends.keys()),
    };
  }
}

// Create and configure gateway
const gateway = new MCPGateway('mcp-gateway');

gateway.registerBackend({ name: 'github', url: 'http://localhost:8001' });
gateway.registerBackend({ name: 'database', url: 'http://localhost:8002' });
gateway.registerBackend({ name: 'storage', url: 'http://localhost:8003' });

const server = gateway.getServer();

server.tool({
  name: 'github_list_repos',
  description: 'List repositories from GitHub',
  schema: {
    org: { type: 'string', description: 'GitHub organization name' },
  },
}, async ({ org }) => {
  return gateway.proxyRequest('github', 'list_repos', { org });
});

server.tool({
  name: 'database_query',
  description: 'Execute a database query',
  schema: {
    sql: { type: 'string', description: 'SQL query to execute' },
  },
}, async ({ sql }) => {
  return gateway.proxyRequest('database', 'query', { sql });
});

server.tool({
  name: 'gateway_metrics',
  description: 'Get gateway metrics',
  schema: {},
}, async () => {
  return gateway.getMetrics();
});

server.run();
```

## Configuration

### Environment-based Routing

```python
import os

BACKENDS = {
    "production": {
        "github": "https://mcp-github.prod.internal",
        "database": "https://mcp-database.prod.internal",
    },
    "staging": {
        "github": "https://mcp-github.staging.internal",
        "database": "https://mcp-database.staging.internal",
    },
    "development": {
        "github": "http://localhost:8001",
        "database": "http://localhost:8002",
    },
}

env = os.getenv("ENVIRONMENT", "development")
for name, url in BACKENDS[env].items():
    gateway.register_backend(ServerConfig(name=name, url=url))
```

### Health Checks

```python
@server.tool()
async def gateway_health() -> dict:
    """Check health of all backend servers."""
    results = {}
    for name, config in gateway.backends.items():
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{config.url}/health",
                    timeout=5.0
                )
                results[name] = {
                    "status": "healthy" if response.status_code == 200 else "unhealthy",
                    "latency_ms": response.elapsed.total_seconds() * 1000
                }
        except Exception as e:
            results[name] = {
                "status": "unreachable",
                "error": str(e)
            }
    return results
```

## When to Use

- Multiple MCP servers in production
- Centralized authentication requirements
- Need for rate limiting across services
- Monitoring and observability requirements
- API versioning and gradual rollouts

## Security Considerations

### OAuth 2.1 Integration

```python
from fastmcp.security import OAuth2Provider

gateway.server.use_auth(OAuth2Provider(
    issuer="https://auth.example.com",
    audience="mcp-gateway",
    scopes={
        "github:read": ["github_list_repos", "github_search_code"],
        "github:write": ["github_create_issue"],
        "database:read": ["database_query"],
    }
))
```

### Request Signing

```python
import hmac
import hashlib

def sign_request(payload: dict, secret: str) -> str:
    message = json.dumps(payload, sort_keys=True)
    return hmac.new(
        secret.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
```

## Related Patterns

- [Adapter Pattern](./adapter.md) - Transforms API interfaces
- [Circuit Breaker](./circuit-breaker.md) - Handles backend failures
- [Bulkhead Pattern](./bulkhead.md) - Isolates backend resources
