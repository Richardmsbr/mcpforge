import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';

interface AddCommandOptions {
  server: string;
}

type AddType = 'tool' | 'resource' | 'prompt';

const SUPPORTED_TYPES: AddType[] = ['tool', 'resource', 'prompt'];

export async function addCommand(
  type: string,
  name: string,
  options: AddCommandOptions
): Promise<void> {
  const { server } = options;

  if (!SUPPORTED_TYPES.includes(type as AddType)) {
    console.error(chalk.red(`Unsupported type: ${type}`));
    console.log(chalk.dim(`Supported types: ${SUPPORTED_TYPES.join(', ')}`));
    process.exit(1);
  }

  const serverPath = path.resolve(process.cwd(), server);

  if (!(await fs.pathExists(serverPath))) {
    console.error(chalk.red(`Server path not found: ${serverPath}`));
    process.exit(1);
  }

  // Detect project language
  const lang = await detectLanguage(serverPath);
  if (!lang) {
    console.error(chalk.red('Could not detect project language'));
    console.log(chalk.dim('Make sure you are in an MCP server project directory'));
    process.exit(1);
  }

  console.log();
  console.log(chalk.bold.blue('MCPForge') + ` - Adding ${type}`);
  console.log();
  console.log(chalk.dim('  Type:     ') + chalk.white(type));
  console.log(chalk.dim('  Name:     ') + chalk.white(name));
  console.log(chalk.dim('  Language: ') + chalk.white(lang));
  console.log();

  const spinner = ora(`Adding ${type} "${name}"...`).start();

  try {
    switch (lang) {
      case 'python':
        await addToPython(serverPath, type as AddType, name);
        break;
      case 'typescript':
        await addToTypeScript(serverPath, type as AddType, name);
        break;
      case 'go':
        await addToGo(serverPath, type as AddType, name);
        break;
      case 'rust':
        await addToRust(serverPath, type as AddType, name);
        break;
    }

    spinner.succeed(`${type} "${name}" added successfully`);
    console.log();
    console.log(chalk.dim(`Edit the generated code in your server file to customize the ${type}.`));
    console.log();
  } catch (error) {
    spinner.fail(`Failed to add ${type}`);
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}

async function detectLanguage(serverPath: string): Promise<string | null> {
  if (await fs.pathExists(path.join(serverPath, 'pyproject.toml'))) {
    return 'python';
  }
  if (await fs.pathExists(path.join(serverPath, 'package.json'))) {
    return 'typescript';
  }
  if (await fs.pathExists(path.join(serverPath, 'go.mod'))) {
    return 'go';
  }
  if (await fs.pathExists(path.join(serverPath, 'Cargo.toml'))) {
    return 'rust';
  }
  return null;
}

async function addToPython(
  serverPath: string,
  type: AddType,
  name: string
): Promise<void> {
  const snippet = generatePythonSnippet(type, name);
  console.log();
  console.log(chalk.dim('Add this to your server.py:'));
  console.log();
  console.log(chalk.cyan(snippet));
}

async function addToTypeScript(
  serverPath: string,
  type: AddType,
  name: string
): Promise<void> {
  const snippet = generateTypeScriptSnippet(type, name);
  console.log();
  console.log(chalk.dim('Add this to your src/index.ts:'));
  console.log();
  console.log(chalk.cyan(snippet));
}

async function addToGo(
  serverPath: string,
  type: AddType,
  name: string
): Promise<void> {
  const snippet = generateGoSnippet(type, name);
  console.log();
  console.log(chalk.dim('Add this to your main.go:'));
  console.log();
  console.log(chalk.cyan(snippet));
}

async function addToRust(
  serverPath: string,
  type: AddType,
  name: string
): Promise<void> {
  const snippet = generateRustSnippet(type, name);
  console.log();
  console.log(chalk.dim('Add this to your src/main.rs:'));
  console.log();
  console.log(chalk.cyan(snippet));
}

function generatePythonSnippet(type: AddType, name: string): string {
  const nameSnake = name.replace(/-/g, '_').toLowerCase();

  switch (type) {
    case 'tool':
      return `@server.tool()
async def ${nameSnake}(param: str) -> str:
    """Description of ${name}.

    Args:
        param: Description of parameter

    Returns:
        Description of return value
    """
    # Implementation here
    return f"Result: {param}"`;

    case 'resource':
      return `@server.resource("resource://${nameSnake}")
async def ${nameSnake}_resource() -> str:
    """Get ${name} resource."""
    return """
    {
        "key": "value"
    }
    """`;

    case 'prompt':
      return `@server.prompt()
async def ${nameSnake}_prompt() -> str:
    """${name} prompt template."""
    return """Your prompt template here.

Use {{variable}} for template variables."""`;
  }
}

function generateTypeScriptSnippet(type: AddType, name: string): string {
  switch (type) {
    case 'tool':
      return `// Add to ListToolsRequestSchema handler:
{
  name: '${name}',
  description: 'Description of ${name}',
  inputSchema: {
    type: 'object',
    properties: {
      param: { type: 'string', description: 'Description of parameter' },
    },
    required: ['param'],
  },
}

// Add to CallToolRequestSchema handler switch:
case '${name}': {
  const { param } = args as { param: string };
  return { content: [{ type: 'text', text: \`Result: \${param}\` }] };
}`;

    case 'resource':
      return `// Add to ListResourcesRequestSchema handler:
{
  uri: 'resource://${name}',
  name: '${name}',
  description: 'Description of ${name} resource',
  mimeType: 'application/json',
}

// Add to ReadResourceRequestSchema handler:
if (uri === 'resource://${name}') {
  return {
    contents: [{
      uri,
      mimeType: 'application/json',
      text: JSON.stringify({ key: 'value' }, null, 2),
    }],
  };
}`;

    case 'prompt':
      return `// Add to ListPromptsRequestSchema handler:
{
  name: '${name}',
  description: '${name} prompt template',
}

// Add to GetPromptRequestSchema handler:
if (name === '${name}') {
  return {
    messages: [{
      role: 'user',
      content: { type: 'text', text: 'Your prompt template here.' },
    }],
  };
}`;
  }
}

function generateGoSnippet(type: AddType, name: string): string {
  const namePascal = name
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');

  switch (type) {
    case 'tool':
      return `// Add tool registration
s.AddTool(mcp.NewTool("${name}",
    mcp.WithDescription("Description of ${name}"),
    mcp.WithString("param", mcp.Description("Description of parameter")),
), ${namePascal.toLowerCase()}Handler)

// Add handler function
func ${namePascal.toLowerCase()}Handler(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
    param, _ := request.Params.Arguments["param"].(string)
    return mcp.NewToolResultText(fmt.Sprintf("Result: %s", param)), nil
}`;

    case 'resource':
      return `// Resource support requires additional implementation in mcp-go`;

    case 'prompt':
      return `// Prompt support requires additional implementation in mcp-go`;
  }
}

function generateRustSnippet(type: AddType, name: string): string {
  const nameSnake = name.replace(/-/g, '_').toLowerCase();
  const namePascal = name
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');

  switch (type) {
    case 'tool':
      return `#[derive(Debug, Serialize, Deserialize)]
struct ${namePascal}Args {
    param: String,
}

#[tool(name = "${name}", description = "Description of ${name}")]
async fn ${nameSnake}(args: ${namePascal}Args) -> Result<String> {
    Ok(format!("Result: {}", args.param))
}

// Add to server builder:
// .tool(${nameSnake})`;

    case 'resource':
      return `// Resource support - implement custom handler`;

    case 'prompt':
      return `// Prompt support - implement custom handler`;
  }
}
