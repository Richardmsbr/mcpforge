# Circuit Breaker Pattern

## Intent

Prevent cascading failures by detecting when a backend service is failing and temporarily stopping requests to it.

## Problem

When an MCP server depends on external services (APIs, databases), failures in those services can:
- Cause request timeouts that block the server
- Exhaust connection pools and threads
- Lead to cascading failures across the system
- Provide poor user experience with long wait times

## Solution

Implement a circuit breaker that:
- Monitors failure rates for each external dependency
- Opens (trips) when failures exceed a threshold
- Rejects requests immediately while open (fail fast)
- Periodically tests if the service has recovered
- Closes when the service is healthy again

## States

```
        +------------------+
        |                  |
        v                  |
    +-------+         +--------+
    | CLOSED| ------> |  OPEN  |
    +-------+         +--------+
        ^                  |
        |                  v
        |            +-----------+
        +----------- | HALF-OPEN |
                     +-----------+

CLOSED:    Normal operation, requests pass through
OPEN:      Requests fail immediately
HALF-OPEN: Testing if service recovered
```

## Implementation

### Python

```python
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Callable, TypeVar, Generic
import asyncio

T = TypeVar('T')

class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

@dataclass
class CircuitBreakerConfig:
    failure_threshold: int = 5
    success_threshold: int = 2
    timeout: timedelta = timedelta(seconds=30)
    half_open_max_calls: int = 3

@dataclass
class CircuitBreakerStats:
    failures: int = 0
    successes: int = 0
    last_failure_time: datetime = None
    consecutive_successes: int = 0

class CircuitBreaker(Generic[T]):
    def __init__(self, name: str, config: CircuitBreakerConfig = None):
        self.name = name
        self.config = config or CircuitBreakerConfig()
        self.state = CircuitState.CLOSED
        self.stats = CircuitBreakerStats()
        self._half_open_calls = 0
        self._lock = asyncio.Lock()

    async def call(self, func: Callable[..., T], *args, **kwargs) -> T:
        async with self._lock:
            self._check_state_transition()

            if self.state == CircuitState.OPEN:
                raise CircuitOpenError(
                    f"Circuit breaker '{self.name}' is open"
                )

            if self.state == CircuitState.HALF_OPEN:
                if self._half_open_calls >= self.config.half_open_max_calls:
                    raise CircuitOpenError(
                        f"Circuit breaker '{self.name}' half-open limit reached"
                    )
                self._half_open_calls += 1

        try:
            result = await func(*args, **kwargs)
            await self._on_success()
            return result
        except Exception as e:
            await self._on_failure()
            raise

    def _check_state_transition(self):
        if self.state == CircuitState.OPEN:
            if self.stats.last_failure_time:
                time_since_failure = datetime.now() - self.stats.last_failure_time
                if time_since_failure >= self.config.timeout:
                    self.state = CircuitState.HALF_OPEN
                    self._half_open_calls = 0
                    self.stats.consecutive_successes = 0

    async def _on_success(self):
        async with self._lock:
            self.stats.successes += 1
            self.stats.consecutive_successes += 1

            if self.state == CircuitState.HALF_OPEN:
                if self.stats.consecutive_successes >= self.config.success_threshold:
                    self.state = CircuitState.CLOSED
                    self.stats.failures = 0

    async def _on_failure(self):
        async with self._lock:
            self.stats.failures += 1
            self.stats.last_failure_time = datetime.now()
            self.stats.consecutive_successes = 0

            if self.state == CircuitState.CLOSED:
                if self.stats.failures >= self.config.failure_threshold:
                    self.state = CircuitState.OPEN

            elif self.state == CircuitState.HALF_OPEN:
                self.state = CircuitState.OPEN

    def get_status(self) -> dict:
        return {
            "name": self.name,
            "state": self.state.value,
            "failures": self.stats.failures,
            "successes": self.stats.successes,
            "last_failure": self.stats.last_failure_time.isoformat()
                if self.stats.last_failure_time else None,
        }

class CircuitOpenError(Exception):
    pass


# Usage with MCP Server
from fastmcp import FastMCP
import httpx

server = FastMCP("resilient-mcp")

# Create circuit breakers for each external service
github_breaker = CircuitBreaker("github", CircuitBreakerConfig(
    failure_threshold=3,
    timeout=timedelta(seconds=60),
))

database_breaker = CircuitBreaker("database", CircuitBreakerConfig(
    failure_threshold=5,
    timeout=timedelta(seconds=30),
))

async def fetch_github_data(endpoint: str) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://api.github.com{endpoint}",
            timeout=10.0
        )
        response.raise_for_status()
        return response.json()

@server.tool()
async def github_user(username: str) -> dict:
    """Get GitHub user information with circuit breaker protection.

    Args:
        username: GitHub username
    """
    try:
        return await github_breaker.call(
            fetch_github_data,
            f"/users/{username}"
        )
    except CircuitOpenError:
        return {
            "error": "GitHub service temporarily unavailable",
            "retry_after": "60 seconds"
        }

@server.tool()
async def circuit_status() -> dict:
    """Get status of all circuit breakers."""
    return {
        "github": github_breaker.get_status(),
        "database": database_breaker.get_status(),
    }
```

### TypeScript

```typescript
import { FastMCP } from 'fastmcp';

enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open',
}

interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeoutMs: number;
  halfOpenMaxCalls: number;
}

interface CircuitBreakerStats {
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  consecutiveSuccesses: number;
}

class CircuitBreaker<T> {
  private state: CircuitState = CircuitState.CLOSED;
  private stats: CircuitBreakerStats = {
    failures: 0,
    successes: 0,
    lastFailureTime: null,
    consecutiveSuccesses: 0,
  };
  private halfOpenCalls = 0;
  private config: CircuitBreakerConfig;

  constructor(
    private name: string,
    config: Partial<CircuitBreakerConfig> = {}
  ) {
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      successThreshold: config.successThreshold ?? 2,
      timeoutMs: config.timeoutMs ?? 30000,
      halfOpenMaxCalls: config.halfOpenMaxCalls ?? 3,
    };
  }

  async call<R>(fn: () => Promise<R>): Promise<R> {
    this.checkStateTransition();

    if (this.state === CircuitState.OPEN) {
      throw new CircuitOpenError(`Circuit '${this.name}' is open`);
    }

    if (this.state === CircuitState.HALF_OPEN) {
      if (this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
        throw new CircuitOpenError(`Circuit '${this.name}' half-open limit`);
      }
      this.halfOpenCalls++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private checkStateTransition(): void {
    if (this.state === CircuitState.OPEN && this.stats.lastFailureTime) {
      const elapsed = Date.now() - this.stats.lastFailureTime;
      if (elapsed >= this.config.timeoutMs) {
        this.state = CircuitState.HALF_OPEN;
        this.halfOpenCalls = 0;
        this.stats.consecutiveSuccesses = 0;
      }
    }
  }

  private onSuccess(): void {
    this.stats.successes++;
    this.stats.consecutiveSuccesses++;

    if (this.state === CircuitState.HALF_OPEN) {
      if (this.stats.consecutiveSuccesses >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.stats.failures = 0;
      }
    }
  }

  private onFailure(): void {
    this.stats.failures++;
    this.stats.lastFailureTime = Date.now();
    this.stats.consecutiveSuccesses = 0;

    if (this.state === CircuitState.CLOSED) {
      if (this.stats.failures >= this.config.failureThreshold) {
        this.state = CircuitState.OPEN;
      }
    } else if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
    }
  }

  getStatus(): Record<string, unknown> {
    return {
      name: this.name,
      state: this.state,
      failures: this.stats.failures,
      successes: this.stats.successes,
      lastFailure: this.stats.lastFailureTime
        ? new Date(this.stats.lastFailureTime).toISOString()
        : null,
    };
  }
}

class CircuitOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitOpenError';
  }
}

// Usage
const server = new FastMCP('resilient-mcp');
const githubBreaker = new CircuitBreaker('github', {
  failureThreshold: 3,
  timeoutMs: 60000,
});

server.tool({
  name: 'github_user',
  description: 'Get GitHub user with circuit breaker',
  schema: {
    username: { type: 'string' },
  },
}, async ({ username }) => {
  try {
    return await githubBreaker.call(async () => {
      const response = await fetch(`https://api.github.com/users/${username}`);
      if (!response.ok) throw new Error('API error');
      return response.json();
    });
  } catch (error) {
    if (error instanceof CircuitOpenError) {
      return { error: 'Service temporarily unavailable' };
    }
    throw error;
  }
});

server.run();
```

## Configuration Guidelines

| Parameter | Description | Typical Value |
|-----------|-------------|---------------|
| `failure_threshold` | Failures before opening | 3-10 |
| `success_threshold` | Successes to close from half-open | 2-5 |
| `timeout` | Time before testing recovery | 30s-5min |
| `half_open_max_calls` | Test calls in half-open state | 1-5 |

## Monitoring

```python
@server.tool()
async def circuit_metrics() -> dict:
    """Get detailed circuit breaker metrics."""
    breakers = [github_breaker, database_breaker]
    return {
        "circuits": [b.get_status() for b in breakers],
        "summary": {
            "total": len(breakers),
            "open": sum(1 for b in breakers if b.state == CircuitState.OPEN),
            "closed": sum(1 for b in breakers if b.state == CircuitState.CLOSED),
            "half_open": sum(1 for b in breakers if b.state == CircuitState.HALF_OPEN),
        }
    }
```

## When to Use

- Calling external APIs that may fail
- Database connections that may timeout
- Any I/O operation with unpredictable latency
- Microservices communication

## Related Patterns

- [Bulkhead Pattern](./bulkhead.md) - Isolates failures
- [Gateway Pattern](./gateway.md) - Centralized failure handling
- [Retry Pattern](./retry.md) - Complements circuit breaker
