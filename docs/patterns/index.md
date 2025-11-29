# Design Patterns

MCPForge provides a comprehensive library of design patterns specifically adapted for MCP server development. These patterns are battle-tested solutions to common challenges in building production-ready MCP servers.

## Pattern Categories

### Structural Patterns

Patterns that deal with how MCP servers are composed and connected.

| Pattern | Description | Use Case |
|---------|-------------|----------|
| [Adapter](./adapter.md) | Convert external APIs to MCP tools | Integrating REST APIs, SDKs |
| [Facade](./facade.md) | Simplify complex subsystem interfaces | Multi-service aggregation |
| [Proxy](./proxy.md) | Control access to resources | Caching, access control |
| [Decorator](./decorator.md) | Add behavior to tools dynamically | Logging, metrics, validation |

### Behavioral Patterns

Patterns that deal with communication and responsibility between components.

| Pattern | Description | Use Case |
|---------|-------------|----------|
| [Command](./command.md) | Encapsulate requests as objects | Undo/redo, queuing |
| [Strategy](./strategy.md) | Interchangeable algorithms | Multiple AI providers |
| [Observer](./observer.md) | Event notification | Real-time updates |
| [Chain of Responsibility](./chain.md) | Request processing pipeline | Middleware, validation |

### Enterprise Patterns

Patterns for building scalable, resilient production systems.

| Pattern | Description | Use Case |
|---------|-------------|----------|
| [Gateway](./gateway.md) | Single entry point for services | Multi-server deployments |
| [Circuit Breaker](./circuit-breaker.md) | Prevent cascading failures | External API calls |
| [Bulkhead](./bulkhead.md) | Isolate components | Resource protection |
| [CQRS](./cqrs.md) | Separate read/write operations | High-scale systems |
| [Event Sourcing](./event-sourcing.md) | Store state as events | Audit trails, debugging |

### Security Patterns

Patterns for secure MCP server implementations.

| Pattern | Description | Use Case |
|---------|-------------|----------|
| [OAuth 2.1](./oauth.md) | Standard authentication | HTTP transports |
| [API Key](./api-key.md) | Simple authentication | Internal services |
| [Rate Limiting](./rate-limiting.md) | Throttle requests | Public APIs |
| [Input Validation](./validation.md) | Sanitize inputs | All user-facing tools |

## Quick Reference

### When to Use Each Pattern

```
Need to integrate an external API?
  -> Adapter Pattern

Multiple MCP servers in production?
  -> Gateway Pattern

Worried about external service failures?
  -> Circuit Breaker Pattern

Need to add logging to all tools?
  -> Decorator Pattern

Want to cache expensive operations?
  -> Proxy Pattern

Building a multi-tenant system?
  -> Bulkhead Pattern
```

### Pattern Combinations

Common pattern combinations for production systems:

```
Production MCP Gateway Stack:
  Gateway
    + Circuit Breaker (per backend)
    + Rate Limiting
    + OAuth 2.1
    + Decorator (logging/metrics)

High-Reliability External Integration:
  Adapter
    + Circuit Breaker
    + Retry with Backoff
    + Proxy (caching)

Multi-Provider AI Tools:
  Strategy
    + Adapter (per provider)
    + Circuit Breaker
    + Facade (unified interface)
```

## Implementation Guidelines

### 1. Start Simple

Begin with the [Adapter Pattern](./adapter.md) for external integrations. Add complexity only when needed.

### 2. Add Resilience

Once your basic MCP server works, add [Circuit Breaker](./circuit-breaker.md) for external calls.

### 3. Scale Up

When deploying multiple servers, implement the [Gateway Pattern](./gateway.md) for centralized management.

### 4. Monitor Everything

Use the [Decorator Pattern](./decorator.md) to add logging and metrics without modifying tool logic.

## Pattern Templates

MCPForge CLI can generate pattern implementations:

```bash
# Generate adapter pattern template
mcpforge new my-api --pattern adapter --lang python

# Generate gateway template
mcpforge new my-gateway --pattern enterprise --lang typescript

# Add circuit breaker to existing project
mcpforge add middleware circuit-breaker
```

## Contributing Patterns

Have a pattern that works well for MCP? We welcome contributions:

1. Document the pattern following our [template](./PATTERN_TEMPLATE.md)
2. Provide implementations in at least Python and TypeScript
3. Include real-world usage examples
4. Submit a pull request

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.
