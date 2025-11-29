# Adapter Pattern

## Intent

Convert the interface of an external API or service into the MCP tool interface that clients expect.

## Problem

External APIs (GitHub, databases, cloud services) have their own interfaces, authentication methods, and data formats. MCP clients expect a standardized tool interface with consistent input/output schemas.

## Solution

Create an adapter class that wraps the external API and exposes its functionality through MCP tools. The adapter handles:

- Authentication and connection management
- Request/response transformation
- Error handling and retry logic
- Rate limiting

## Structure

```
+------------------+     +------------------+     +------------------+
|    MCP Client    | --> |   MCP Adapter    | --> |   External API   |
|                  |     |                  |     |                  |
| Calls: tool()    |     | Transforms       |     | Native methods   |
| Expects: JSON    |     | requests/resp    |     | REST/GraphQL/etc |
+------------------+     +------------------+     +------------------+
```

## Implementation

### Python

```python
from fastmcp import FastMCP
from github import Github
import os

class GitHubAdapter:
    """Adapter for GitHub API to MCP tools."""

    def __init__(self, token: str):
        self.client = Github(token)

    async def list_repos(self, org: str) -> list[dict]:
        """List repositories for an organization."""
        repos = self.client.get_organization(org).get_repos()
        return [
            {
                "name": repo.name,
                "url": repo.html_url,
                "stars": repo.stargazers_count,
                "language": repo.language,
            }
            for repo in repos
        ]

    async def search_code(self, query: str, repo: str) -> list[dict]:
        """Search code in a repository."""
        results = self.client.search_code(f"{query} repo:{repo}")
        return [
            {
                "path": item.path,
                "url": item.html_url,
                "repository": item.repository.full_name,
            }
            for item in results[:20]
        ]

    async def create_issue(
        self, repo: str, title: str, body: str, labels: list[str] = None
    ) -> dict:
        """Create an issue in a repository."""
        repository = self.client.get_repo(repo)
        issue = repository.create_issue(
            title=title,
            body=body,
            labels=labels or [],
        )
        return {
            "number": issue.number,
            "url": issue.html_url,
            "state": issue.state,
        }


# Create MCP server with adapter
server = FastMCP("github-mcp")
adapter = GitHubAdapter(os.getenv("GITHUB_TOKEN"))


@server.tool()
async def list_repos(org: str) -> list[dict]:
    """List repositories for a GitHub organization.

    Args:
        org: Organization name

    Returns:
        List of repositories with name, URL, stars, and language
    """
    return await adapter.list_repos(org)


@server.tool()
async def search_code(query: str, repo: str) -> list[dict]:
    """Search for code in a GitHub repository.

    Args:
        query: Search query
        repo: Repository in format owner/repo

    Returns:
        List of matching files with path and URL
    """
    return await adapter.search_code(query, repo)


@server.tool()
async def create_issue(
    repo: str,
    title: str,
    body: str,
    labels: list[str] = None
) -> dict:
    """Create an issue in a GitHub repository.

    Args:
        repo: Repository in format owner/repo
        title: Issue title
        body: Issue body/description
        labels: Optional list of labels

    Returns:
        Created issue with number, URL, and state
    """
    return await adapter.create_issue(repo, title, body, labels)
```

### TypeScript

```typescript
import { FastMCP } from 'fastmcp';
import { Octokit } from '@octokit/rest';

class GitHubAdapter {
  private client: Octokit;

  constructor(token: string) {
    this.client = new Octokit({ auth: token });
  }

  async listRepos(org: string) {
    const { data } = await this.client.repos.listForOrg({ org });
    return data.map(repo => ({
      name: repo.name,
      url: repo.html_url,
      stars: repo.stargazers_count,
      language: repo.language,
    }));
  }

  async searchCode(query: string, repo: string) {
    const { data } = await this.client.search.code({
      q: `${query} repo:${repo}`,
    });
    return data.items.slice(0, 20).map(item => ({
      path: item.path,
      url: item.html_url,
      repository: item.repository.full_name,
    }));
  }

  async createIssue(
    repo: string,
    title: string,
    body: string,
    labels?: string[]
  ) {
    const [owner, repoName] = repo.split('/');
    const { data } = await this.client.issues.create({
      owner,
      repo: repoName,
      title,
      body,
      labels,
    });
    return {
      number: data.number,
      url: data.html_url,
      state: data.state,
    };
  }
}

const server = new FastMCP('github-mcp');
const adapter = new GitHubAdapter(process.env.GITHUB_TOKEN!);

server.tool({
  name: 'list_repos',
  description: 'List repositories for a GitHub organization',
  schema: {
    org: { type: 'string', description: 'Organization name' },
  },
}, async ({ org }) => adapter.listRepos(org));

server.tool({
  name: 'search_code',
  description: 'Search for code in a GitHub repository',
  schema: {
    query: { type: 'string', description: 'Search query' },
    repo: { type: 'string', description: 'Repository in format owner/repo' },
  },
}, async ({ query, repo }) => adapter.searchCode(query, repo));

server.tool({
  name: 'create_issue',
  description: 'Create an issue in a GitHub repository',
  schema: {
    repo: { type: 'string', description: 'Repository in format owner/repo' },
    title: { type: 'string', description: 'Issue title' },
    body: { type: 'string', description: 'Issue body/description' },
    labels: { type: 'array', items: { type: 'string' }, optional: true },
  },
}, async ({ repo, title, body, labels }) => adapter.createIssue(repo, title, body, labels));

server.run();
```

### Go

```go
package main

import (
    "context"
    "fmt"
    "os"

    "github.com/google/go-github/v57/github"
    "github.com/mark3labs/mcp-go/mcp"
    "github.com/mark3labs/mcp-go/server"
    "golang.org/x/oauth2"
)

type GitHubAdapter struct {
    client *github.Client
}

func NewGitHubAdapter(token string) *GitHubAdapter {
    ts := oauth2.StaticTokenSource(&oauth2.Token{AccessToken: token})
    tc := oauth2.NewClient(context.Background(), ts)
    return &GitHubAdapter{client: github.NewClient(tc)}
}

func (a *GitHubAdapter) ListRepos(ctx context.Context, org string) ([]map[string]interface{}, error) {
    repos, _, err := a.client.Repositories.ListByOrg(ctx, org, nil)
    if err != nil {
        return nil, err
    }

    result := make([]map[string]interface{}, len(repos))
    for i, repo := range repos {
        result[i] = map[string]interface{}{
            "name":     repo.GetName(),
            "url":      repo.GetHTMLURL(),
            "stars":    repo.GetStargazersCount(),
            "language": repo.GetLanguage(),
        }
    }
    return result, nil
}

func main() {
    adapter := NewGitHubAdapter(os.Getenv("GITHUB_TOKEN"))

    s := server.NewMCPServer("github-mcp", "0.1.0")

    s.AddTool(mcp.NewTool("list_repos",
        mcp.WithDescription("List repositories for a GitHub organization"),
        mcp.WithString("org", mcp.Description("Organization name"), mcp.Required()),
    ), func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
        org := req.Params.Arguments["org"].(string)
        repos, err := adapter.ListRepos(ctx, org)
        if err != nil {
            return nil, err
        }
        return mcp.NewToolResultText(fmt.Sprintf("%v", repos)), nil
    })

    server.ServeStdio(s)
}
```

## When to Use

- Integrating external REST/GraphQL APIs
- Wrapping database connections
- Connecting to cloud services (AWS, GCP, Azure)
- Abstracting third-party SDKs

## Considerations

### Authentication Management

```python
class SecureAdapter:
    def __init__(self):
        self._token = None
        self._token_expiry = None

    async def ensure_authenticated(self):
        if self._token_expiry and datetime.now() < self._token_expiry:
            return
        self._token = await self.refresh_token()
        self._token_expiry = datetime.now() + timedelta(hours=1)
```

### Error Handling

```python
class RobustAdapter:
    async def call_api(self, method, *args, **kwargs):
        try:
            return await method(*args, **kwargs)
        except RateLimitError:
            await asyncio.sleep(60)
            return await method(*args, **kwargs)
        except AuthError:
            await self.refresh_credentials()
            return await method(*args, **kwargs)
```

### Caching

```python
from functools import lru_cache

class CachedAdapter:
    @lru_cache(maxsize=100)
    def get_cached_data(self, key: str):
        return self.client.fetch(key)
```

## Related Patterns

- [Facade Pattern](./facade.md) - Simplifies complex subsystems
- [Proxy Pattern](./proxy.md) - Controls access to resources
- [Gateway Pattern](./gateway.md) - Routes requests to multiple services
