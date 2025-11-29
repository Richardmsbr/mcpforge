import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import Handlebars from 'handlebars';
import { execa } from 'execa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Find package root by looking for package.json
function findPackageRoot(startDir: string): string {
  let dir = startDir;
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf-8'));
      if (pkg.name === 'mcpforge') {
        return dir;
      }
    }
    dir = path.dirname(dir);
  }
  return startDir;
}

interface NewCommandOptions {
  lang: 'python' | 'typescript' | 'go' | 'rust';
  pattern: 'basic' | 'enterprise' | 'microservices';
  transport: 'stdio' | 'sse' | 'http';
  git: boolean;
  install: boolean;
}

const SUPPORTED_LANGUAGES = ['python', 'typescript', 'go', 'rust'];
const SUPPORTED_PATTERNS = ['basic', 'enterprise', 'microservices'];
const SUPPORTED_TRANSPORTS = ['stdio', 'sse', 'http'];

export async function newCommand(name: string, options: NewCommandOptions): Promise<void> {
  const { lang, pattern, transport, git, install } = options;

  // Validate inputs
  if (!SUPPORTED_LANGUAGES.includes(lang)) {
    console.error(chalk.red(`Unsupported language: ${lang}`));
    console.log(chalk.dim(`Supported: ${SUPPORTED_LANGUAGES.join(', ')}`));
    process.exit(1);
  }

  if (!SUPPORTED_PATTERNS.includes(pattern)) {
    console.error(chalk.red(`Unsupported pattern: ${pattern}`));
    console.log(chalk.dim(`Supported: ${SUPPORTED_PATTERNS.join(', ')}`));
    process.exit(1);
  }

  if (!SUPPORTED_TRANSPORTS.includes(transport)) {
    console.error(chalk.red(`Unsupported transport: ${transport}`));
    console.log(chalk.dim(`Supported: ${SUPPORTED_TRANSPORTS.join(', ')}`));
    process.exit(1);
  }

  const projectPath = path.resolve(process.cwd(), name);

  // Check if directory exists
  if (await fs.pathExists(projectPath)) {
    console.error(chalk.red(`Directory already exists: ${projectPath}`));
    process.exit(1);
  }

  console.log();
  console.log(chalk.bold.blue('MCPForge') + ' - Creating new MCP server');
  console.log();
  console.log(chalk.dim('  Name:      ') + chalk.white(name));
  console.log(chalk.dim('  Language:  ') + chalk.white(lang));
  console.log(chalk.dim('  Pattern:   ') + chalk.white(pattern));
  console.log(chalk.dim('  Transport: ') + chalk.white(transport));
  console.log();

  const spinner = ora('Creating project structure...').start();

  try {
    // Create project directory
    await fs.ensureDir(projectPath);

    // Get template path - find package root first to handle npm link correctly
    const packageRoot = findPackageRoot(__dirname);
    const templatesRoot = path.join(packageRoot, 'templates');
    const templatePath = path.join(templatesRoot, lang, pattern);

    // Debug output for CI troubleshooting
    if (process.env.DEBUG_MCPFORGE) {
      console.log(`DEBUG: __dirname = ${__dirname}`);
      console.log(`DEBUG: packageRoot = ${packageRoot}`);
      console.log(`DEBUG: templatesRoot = ${templatesRoot}`);
      console.log(`DEBUG: templatePath = ${templatePath}`);
      console.log(`DEBUG: template exists = ${await fs.pathExists(templatePath)}`);
    }

    if (await fs.pathExists(templatePath)) {
      // Copy template files
      await copyTemplateFiles(templatePath, projectPath, {
        projectName: name,
        projectNameSnake: toSnakeCase(name),
        projectNamePascal: toPascalCase(name),
        projectNameKebab: toKebabCase(name),
        transport,
        pattern,
      });
    } else {
      // Generate from scratch if template doesn't exist yet
      await generateProject(projectPath, name, lang, pattern, transport);
    }

    spinner.succeed('Project structure created');

    // Initialize git
    if (git) {
      spinner.start('Initializing git repository...');
      await execa('git', ['init'], { cwd: projectPath });
      await execa('git', ['add', '.'], { cwd: projectPath });
      await execa('git', ['commit', '-m', 'Initial commit from MCPForge'], { cwd: projectPath });
      spinner.succeed('Git repository initialized');
    }

    // Install dependencies
    if (install) {
      spinner.start('Installing dependencies...');
      await installDependencies(projectPath, lang);
      spinner.succeed('Dependencies installed');
    }

    console.log();
    console.log(chalk.green('Project created successfully!'));
    console.log();
    console.log(chalk.dim('Next steps:'));
    console.log(chalk.cyan(`  cd ${name}`));

    switch (lang) {
      case 'python':
        console.log(chalk.cyan('  pip install -e .'));
        console.log(chalk.cyan(`  python -m ${toSnakeCase(name)}`));
        break;
      case 'typescript':
        if (!install) console.log(chalk.cyan('  npm install'));
        console.log(chalk.cyan('  npm run dev'));
        break;
      case 'go':
        console.log(chalk.cyan('  go run .'));
        break;
      case 'rust':
        console.log(chalk.cyan('  cargo run'));
        break;
    }

    console.log();
    console.log(chalk.dim('Documentation: https://mcpforge.dev'));
    console.log();

  } catch (error) {
    spinner.fail('Failed to create project');
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}

async function copyTemplateFiles(
  templatePath: string,
  targetPath: string,
  context: Record<string, string>
): Promise<void> {
  const files = await fs.readdir(templatePath, { withFileTypes: true });

  for (const file of files) {
    const sourcePath = path.join(templatePath, file.name);
    let targetName = file.name;

    // Replace template variables in filename
    for (const [key, value] of Object.entries(context)) {
      targetName = targetName.replace(new RegExp(`__${key}__`, 'g'), value);
    }

    // Remove .hbs extension
    targetName = targetName.replace(/\.hbs$/, '');

    const targetFilePath = path.join(targetPath, targetName);

    if (file.isDirectory()) {
      await fs.ensureDir(targetFilePath);
      await copyTemplateFiles(sourcePath, targetFilePath, context);
    } else {
      const content = await fs.readFile(sourcePath, 'utf-8');

      // Process Handlebars template
      const template = Handlebars.compile(content);
      const processed = template(context);

      await fs.writeFile(targetFilePath, processed);
    }
  }
}

async function generateProject(
  projectPath: string,
  name: string,
  lang: string,
  pattern: string,
  transport: string
): Promise<void> {
  const nameSnake = toSnakeCase(name);
  const namePascal = toPascalCase(name);
  const nameKebab = toKebabCase(name);

  switch (lang) {
    case 'python':
      await generatePythonProject(projectPath, name, nameSnake, namePascal, pattern, transport);
      break;
    case 'typescript':
      await generateTypeScriptProject(projectPath, name, nameKebab, namePascal, pattern, transport);
      break;
    case 'go':
      await generateGoProject(projectPath, name, nameSnake, namePascal, pattern, transport);
      break;
    case 'rust':
      await generateRustProject(projectPath, name, nameSnake, namePascal, pattern, transport);
      break;
  }
}

async function generatePythonProject(
  projectPath: string,
  name: string,
  nameSnake: string,
  namePascal: string,
  pattern: string,
  transport: string
): Promise<void> {
  const srcDir = path.join(projectPath, nameSnake);
  await fs.ensureDir(srcDir);

  // pyproject.toml
  await fs.writeFile(
    path.join(projectPath, 'pyproject.toml'),
    `[build-system]
requires = ["setuptools>=61.0", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "${nameSnake}"
version = "0.1.0"
description = "MCP server created with MCPForge"
readme = "README.md"
requires-python = ">=3.11"
dependencies = [
    "mcp>=1.0.0",
    "fastmcp>=2.0.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0.0",
    "pytest-asyncio>=0.24.0",
    "ruff>=0.8.0",
]

[tool.ruff]
line-length = 100
target-version = "py311"

[tool.ruff.lint]
select = ["E", "F", "I", "N", "W"]
`
  );

  // __init__.py
  await fs.writeFile(path.join(srcDir, '__init__.py'), `"""${namePascal} MCP Server"""\n`);

  // __main__.py
  await fs.writeFile(
    path.join(srcDir, '__main__.py'),
    `"""Entry point for ${namePascal} MCP Server"""
from .server import server

if __name__ == "__main__":
    server.run(transport="${transport}")
`
  );

  // server.py
  const serverContent = pattern === 'enterprise'
    ? generatePythonEnterpriseServer(nameSnake, namePascal)
    : generatePythonBasicServer(nameSnake, namePascal);

  await fs.writeFile(path.join(srcDir, 'server.py'), serverContent);

  // README.md
  await fs.writeFile(
    path.join(projectPath, 'README.md'),
    `# ${namePascal}

MCP server created with [MCPForge](https://github.com/Richardmsbr/mcpforge).

## Installation

\`\`\`bash
pip install -e .
\`\`\`

## Usage

\`\`\`bash
python -m ${nameSnake}
\`\`\`

## Development

\`\`\`bash
pip install -e ".[dev]"
pytest
\`\`\`
`
  );

  // .gitignore
  await fs.writeFile(
    path.join(projectPath, '.gitignore'),
    `__pycache__/
*.py[cod]
*$py.class
*.egg-info/
dist/
build/
.eggs/
.pytest_cache/
.ruff_cache/
.venv/
venv/
.env
`
  );
}

function generatePythonBasicServer(nameSnake: string, namePascal: string): string {
  return `"""${namePascal} MCP Server"""
from fastmcp import FastMCP

server = FastMCP("${nameSnake}")


@server.tool()
async def hello(name: str = "World") -> str:
    """Say hello to someone.

    Args:
        name: The name to greet

    Returns:
        A greeting message
    """
    return f"Hello, {name}!"


@server.tool()
async def add(a: int, b: int) -> int:
    """Add two numbers.

    Args:
        a: First number
        b: Second number

    Returns:
        The sum of a and b
    """
    return a + b


@server.resource("config://settings")
async def get_settings() -> str:
    """Get server configuration settings."""
    return """
    {
        "version": "0.1.0",
        "name": "${nameSnake}",
        "created_with": "mcpforge"
    }
    """
`;
}

function generatePythonEnterpriseServer(nameSnake: string, namePascal: string): string {
  return `"""${namePascal} MCP Server - Enterprise Edition"""
import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastmcp import FastMCP
from fastmcp.security import OAuth2Provider

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("${nameSnake}")


@asynccontextmanager
async def lifespan(server: FastMCP) -> AsyncIterator[dict]:
    """Manage server lifecycle - startup and shutdown."""
    logger.info("Starting ${namePascal} server...")

    # Initialize resources (database connections, caches, etc.)
    resources = {
        "startup_time": __import__("datetime").datetime.now().isoformat(),
    }

    yield resources

    logger.info("Shutting down ${namePascal} server...")
    # Cleanup resources


server = FastMCP(
    "${nameSnake}",
    lifespan=lifespan,
)

# Configure OAuth2 authentication (if enabled)
if os.getenv("OAUTH2_ENABLED"):
    server.use_auth(OAuth2Provider(
        issuer=os.getenv("OAUTH2_ISSUER", "https://auth.example.com"),
        audience=os.getenv("OAUTH2_AUDIENCE", "${nameSnake}"),
    ))


@server.tool()
async def hello(name: str = "World") -> str:
    """Say hello to someone.

    Args:
        name: The name to greet

    Returns:
        A greeting message
    """
    logger.info(f"hello called with name={name}")
    return f"Hello, {name}!"


@server.tool()
async def health_check() -> dict:
    """Check server health status.

    Returns:
        Health status information
    """
    return {
        "status": "healthy",
        "version": "0.1.0",
        "uptime": server.context.get("startup_time", "unknown"),
    }


@server.resource("config://settings")
async def get_settings() -> str:
    """Get server configuration settings."""
    return """
    {
        "version": "0.1.0",
        "name": "${nameSnake}",
        "created_with": "mcpforge",
        "pattern": "enterprise"
    }
    """


@server.prompt()
async def system_prompt() -> str:
    """Get the system prompt for this server."""
    return """You are an assistant with access to the ${namePascal} MCP server.

Available tools:
- hello: Greet someone by name
- health_check: Check server health status

Use these tools to help the user with their requests."""
`;
}

async function generateTypeScriptProject(
  projectPath: string,
  _name: string,
  nameKebab: string,
  namePascal: string,
  pattern: string,
  _transport: string
): Promise<void> {
  const srcDir = path.join(projectPath, 'src');
  await fs.ensureDir(srcDir);

  // package.json
  await fs.writeFile(
    path.join(projectPath, 'package.json'),
    JSON.stringify({
      name: nameKebab,
      version: '0.1.0',
      description: 'MCP server created with MCPForge',
      type: 'module',
      main: 'dist/index.js',
      scripts: {
        build: 'tsc',
        dev: 'tsc --watch',
        start: 'node dist/index.js',
        test: 'vitest',
        lint: 'eslint src --ext .ts',
      },
      dependencies: {
        '@modelcontextprotocol/sdk': '^1.0.0',
      },
      devDependencies: {
        '@types/node': '^22.0.0',
        typescript: '^5.7.0',
        vitest: '^2.1.0',
        eslint: '^9.0.0',
      },
    }, null, 2)
  );

  // tsconfig.json
  await fs.writeFile(
    path.join(projectPath, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'bundler',
        lib: ['ES2022'],
        outDir: './dist',
        rootDir: './src',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        declaration: true,
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist'],
    }, null, 2)
  );

  // src/index.ts
  const serverContent = pattern === 'enterprise'
    ? generateTypeScriptEnterpriseServer(nameKebab, namePascal)
    : generateTypeScriptBasicServer(nameKebab, namePascal);

  await fs.writeFile(path.join(srcDir, 'index.ts'), serverContent);

  // README.md
  await fs.writeFile(
    path.join(projectPath, 'README.md'),
    `# ${namePascal}

MCP server created with [MCPForge](https://github.com/Richardmsbr/mcpforge).

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`bash
npm run build
npm start
\`\`\`

## Development

\`\`\`bash
npm run dev
\`\`\`
`
  );

  // .gitignore
  await fs.writeFile(
    path.join(projectPath, '.gitignore'),
    `node_modules/
dist/
.env
*.log
`
  );
}

function generateTypeScriptBasicServer(nameKebab: string, namePascal: string): string {
  return `/**
 * ${namePascal} MCP Server
 * Created with MCPForge
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  {
    name: '${nameKebab}',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'hello',
        description: 'Say hello to someone',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'The name to greet',
              default: 'World',
            },
          },
        },
      },
      {
        name: 'add',
        description: 'Add two numbers',
        inputSchema: {
          type: 'object',
          properties: {
            a: { type: 'number', description: 'First number' },
            b: { type: 'number', description: 'Second number' },
          },
          required: ['a', 'b'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'hello': {
      const greeting = \`Hello, \${(args as { name?: string }).name || 'World'}!\`;
      return { content: [{ type: 'text', text: greeting }] };
    }
    case 'add': {
      const { a, b } = args as { a: number; b: number };
      return { content: [{ type: 'text', text: String(a + b) }] };
    }
    default:
      throw new Error(\`Unknown tool: \${name}\`);
  }
});

// List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'config://settings',
        name: 'Settings',
        description: 'Server configuration settings',
        mimeType: 'application/json',
      },
    ],
  };
});

// Read resource content
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (uri === 'config://settings') {
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              version: '0.1.0',
              name: '${nameKebab}',
              created_with: 'mcpforge',
            },
            null,
            2
          ),
        },
      ],
    };
  }

  throw new Error(\`Unknown resource: \${uri}\`);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('${namePascal} MCP server running on stdio');
}

main().catch(console.error);
`;
}

function generateTypeScriptEnterpriseServer(nameKebab: string, namePascal: string): string {
  return `/**
 * ${namePascal} MCP Server - Enterprise Edition
 * Created with MCPForge
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const startupTime = new Date().toISOString();

const server = new Server(
  {
    name: '${nameKebab}',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

console.error('Starting ${namePascal} server...');

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'hello',
        description: 'Say hello to someone',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'The name to greet',
              default: 'World',
            },
          },
        },
      },
      {
        name: 'health_check',
        description: 'Check server health status',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'hello': {
      const userName = (args as { name?: string }).name || 'World';
      console.error(\`hello called with name=\${userName}\`);
      return { content: [{ type: 'text', text: \`Hello, \${userName}!\` }] };
    }
    case 'health_check': {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: 'healthy',
            version: '0.1.0',
            uptime: startupTime,
          }, null, 2),
        }],
      };
    }
    default:
      throw new Error(\`Unknown tool: \${name}\`);
  }
});

// List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'config://settings',
        name: 'Settings',
        description: 'Server configuration settings',
        mimeType: 'application/json',
      },
    ],
  };
});

// Read resource content
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (uri === 'config://settings') {
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({
          version: '0.1.0',
          name: '${nameKebab}',
          created_with: 'mcpforge',
          pattern: 'enterprise',
        }, null, 2),
      }],
    };
  }

  throw new Error(\`Unknown resource: \${uri}\`);
});

// List available prompts
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: 'system',
        description: 'System prompt for this server',
      },
    ],
  };
});

// Get prompt content
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name } = request.params;

  if (name === 'system') {
    return {
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: \`You are an assistant with access to the ${namePascal} MCP server.

Available tools:
- hello: Greet someone by name
- health_check: Check server health status

Use these tools to help the user with their requests.\`,
        },
      }],
    };
  }

  throw new Error(\`Unknown prompt: \${name}\`);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('${namePascal} MCP server running on stdio');
}

main().catch(console.error);
`;
}

async function generateGoProject(
  projectPath: string,
  _name: string,
  nameSnake: string,
  namePascal: string,
  _pattern: string,
  _transport: string
): Promise<void> {
  // go.mod
  await fs.writeFile(
    path.join(projectPath, 'go.mod'),
    `module ${nameSnake}

go 1.21

require (
    github.com/mark3labs/mcp-go v0.6.0
)
`
  );

  // main.go
  await fs.writeFile(
    path.join(projectPath, 'main.go'),
    `// ${namePascal} MCP Server
// Created with MCPForge
package main

import (
    "context"
    "fmt"
    "log"

    "github.com/mark3labs/mcp-go/mcp"
    "github.com/mark3labs/mcp-go/server"
)

func main() {
    s := server.NewMCPServer(
        "${nameSnake}",
        "0.1.0",
    )

    // Register tools
    s.AddTool(mcp.NewTool("hello",
        mcp.WithDescription("Say hello to someone"),
        mcp.WithString("name",
            mcp.Description("The name to greet"),
            mcp.DefaultString("World"),
        ),
    ), helloHandler)

    s.AddTool(mcp.NewTool("add",
        mcp.WithDescription("Add two numbers"),
        mcp.WithNumber("a", mcp.Description("First number"), mcp.Required()),
        mcp.WithNumber("b", mcp.Description("Second number"), mcp.Required()),
    ), addHandler)

    // Start server
    if err := server.ServeStdio(s); err != nil {
        log.Fatalf("Server error: %v", err)
    }
}

func helloHandler(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
    name, _ := request.Params.Arguments["name"].(string)
    if name == "" {
        name = "World"
    }

    return mcp.NewToolResultText(fmt.Sprintf("Hello, %s!", name)), nil
}

func addHandler(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
    a, _ := request.Params.Arguments["a"].(float64)
    b, _ := request.Params.Arguments["b"].(float64)

    return mcp.NewToolResultText(fmt.Sprintf("%v", a+b)), nil
}
`
  );

  // README.md
  await fs.writeFile(
    path.join(projectPath, 'README.md'),
    `# ${namePascal}

MCP server created with [MCPForge](https://github.com/Richardmsbr/mcpforge).

## Installation

\`\`\`bash
go mod tidy
\`\`\`

## Usage

\`\`\`bash
go run .
\`\`\`

## Build

\`\`\`bash
go build -o ${nameSnake}
\`\`\`
`
  );

  // .gitignore
  await fs.writeFile(
    path.join(projectPath, '.gitignore'),
    `${nameSnake}
*.exe
.env
`
  );
}

async function generateRustProject(
  projectPath: string,
  _name: string,
  nameSnake: string,
  namePascal: string,
  _pattern: string,
  _transport: string
): Promise<void> {
  const srcDir = path.join(projectPath, 'src');
  await fs.ensureDir(srcDir);

  // Cargo.toml
  await fs.writeFile(
    path.join(projectPath, 'Cargo.toml'),
    `[package]
name = "${nameSnake}"
version = "0.1.0"
edition = "2021"
description = "MCP server created with MCPForge"

[dependencies]
rmcp = { version = "0.8", features = ["server"] }
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
`
  );

  // src/main.rs
  await fs.writeFile(
    path.join(srcDir, 'main.rs'),
    `//! ${namePascal} MCP Server
//! Created with MCPForge

use rmcp::{server::Server, tool, Error, Result};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
struct HelloArgs {
    #[serde(default = "default_name")]
    name: String,
}

fn default_name() -> String {
    "World".to_string()
}

#[derive(Debug, Serialize, Deserialize)]
struct AddArgs {
    a: f64,
    b: f64,
}

#[tool(name = "hello", description = "Say hello to someone")]
async fn hello(args: HelloArgs) -> Result<String> {
    Ok(format!("Hello, {}!", args.name))
}

#[tool(name = "add", description = "Add two numbers")]
async fn add(args: AddArgs) -> Result<String> {
    Ok(format!("{}", args.a + args.b))
}

#[tokio::main]
async fn main() -> Result<()> {
    let server = Server::new("${nameSnake}", "0.1.0")
        .tool(hello)
        .tool(add);

    server.run_stdio().await
}
`
  );

  // README.md
  await fs.writeFile(
    path.join(projectPath, 'README.md'),
    `# ${namePascal}

MCP server created with [MCPForge](https://github.com/Richardmsbr/mcpforge).

## Installation

\`\`\`bash
cargo build --release
\`\`\`

## Usage

\`\`\`bash
cargo run
\`\`\`
`
  );

  // .gitignore
  await fs.writeFile(
    path.join(projectPath, '.gitignore'),
    `target/
Cargo.lock
.env
`
  );
}

async function installDependencies(projectPath: string, lang: string): Promise<void> {
  switch (lang) {
    case 'python':
      await execa('pip', ['install', '-e', '.'], { cwd: projectPath });
      break;
    case 'typescript':
      await execa('npm', ['install'], { cwd: projectPath });
      break;
    case 'go':
      await execa('go', ['mod', 'tidy'], { cwd: projectPath });
      break;
    case 'rust':
      await execa('cargo', ['build'], { cwd: projectPath });
      break;
  }
}

// Utility functions
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
