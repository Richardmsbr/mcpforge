import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';

interface DiagramCommandOptions {
  output: 'svg' | 'png' | 'mermaid';
  file?: string;
}

export async function diagramCommand(
  project: string,
  options: DiagramCommandOptions
): Promise<void> {
  const { output, file } = options;

  const projectPath = path.resolve(process.cwd(), project);

  if (!(await fs.pathExists(projectPath))) {
    console.error(chalk.red(`Project path not found: ${projectPath}`));
    process.exit(1);
  }

  console.log();
  console.log(chalk.bold.blue('MCPForge') + ' - Generating diagram');
  console.log();

  const spinner = ora('Analyzing project structure...').start();

  try {
    // Detect language and parse project
    const lang = await detectLanguage(projectPath);
    if (!lang) {
      spinner.fail('Could not detect project language');
      process.exit(1);
    }

    const analysis = await analyzeProject(projectPath, lang);
    spinner.text = 'Generating diagram...';

    const mermaidCode = generateMermaidDiagram(analysis);

    if (output === 'mermaid' || !file) {
      spinner.succeed('Diagram generated');
      console.log();
      console.log(chalk.dim('Mermaid diagram:'));
      console.log();
      console.log(chalk.cyan(mermaidCode));
      console.log();
      console.log(chalk.dim('Paste this into https://mermaid.live to visualize'));
    } else {
      // For SVG/PNG we would need additional dependencies
      const outputPath = file || `${project}-diagram.${output}`;
      await fs.writeFile(outputPath, mermaidCode);
      spinner.succeed(`Diagram saved to ${outputPath}`);
    }
  } catch (error) {
    spinner.fail('Failed to generate diagram');
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}

async function detectLanguage(projectPath: string): Promise<string | null> {
  if (await fs.pathExists(path.join(projectPath, 'pyproject.toml'))) {
    return 'python';
  }
  if (await fs.pathExists(path.join(projectPath, 'package.json'))) {
    return 'typescript';
  }
  if (await fs.pathExists(path.join(projectPath, 'go.mod'))) {
    return 'go';
  }
  if (await fs.pathExists(path.join(projectPath, 'Cargo.toml'))) {
    return 'rust';
  }
  return null;
}

interface ProjectAnalysis {
  name: string;
  language: string;
  tools: string[];
  resources: string[];
  prompts: string[];
}

async function analyzeProject(
  projectPath: string,
  lang: string
): Promise<ProjectAnalysis> {
  const analysis: ProjectAnalysis = {
    name: path.basename(projectPath),
    language: lang,
    tools: [],
    resources: [],
    prompts: [],
  };

  // Basic static analysis based on language
  switch (lang) {
    case 'python':
      await analyzePython(projectPath, analysis);
      break;
    case 'typescript':
      await analyzeTypeScript(projectPath, analysis);
      break;
    case 'go':
      await analyzeGo(projectPath, analysis);
      break;
    case 'rust':
      await analyzeRust(projectPath, analysis);
      break;
  }

  return analysis;
}

async function analyzePython(
  projectPath: string,
  analysis: ProjectAnalysis
): Promise<void> {
  const serverFile = await findFile(projectPath, 'server.py');
  if (!serverFile) return;

  const content = await fs.readFile(serverFile, 'utf-8');

  // Find @server.tool() decorators
  const toolMatches = content.matchAll(/@server\.tool\(\)\s*\n\s*async def (\w+)/g);
  for (const match of toolMatches) {
    analysis.tools.push(match[1]);
  }

  // Find @server.resource() decorators
  const resourceMatches = content.matchAll(/@server\.resource\(['"](.*?)['"]\)/g);
  for (const match of resourceMatches) {
    analysis.resources.push(match[1]);
  }

  // Find @server.prompt() decorators
  const promptMatches = content.matchAll(/@server\.prompt\(\)\s*\n\s*async def (\w+)/g);
  for (const match of promptMatches) {
    analysis.prompts.push(match[1]);
  }
}

async function analyzeTypeScript(
  projectPath: string,
  analysis: ProjectAnalysis
): Promise<void> {
  const indexFile = await findFile(projectPath, 'index.ts', 'src');
  if (!indexFile) return;

  const content = await fs.readFile(indexFile, 'utf-8');

  // Find server.tool() calls
  const toolMatches = content.matchAll(/server\.tool\(\{[\s\S]*?name:\s*['"](\w+)['"]/g);
  for (const match of toolMatches) {
    analysis.tools.push(match[1]);
  }

  // Find server.resource() calls
  const resourceMatches = content.matchAll(/server\.resource\(\{[\s\S]*?uri:\s*['"]([^'"]+)['"]/g);
  for (const match of resourceMatches) {
    analysis.resources.push(match[1]);
  }

  // Find server.prompt() calls
  const promptMatches = content.matchAll(/server\.prompt\(\{[\s\S]*?name:\s*['"](\w+)['"]/g);
  for (const match of promptMatches) {
    analysis.prompts.push(match[1]);
  }
}

async function analyzeGo(
  projectPath: string,
  analysis: ProjectAnalysis
): Promise<void> {
  const mainFile = path.join(projectPath, 'main.go');
  if (!(await fs.pathExists(mainFile))) return;

  const content = await fs.readFile(mainFile, 'utf-8');

  // Find AddTool calls
  const toolMatches = content.matchAll(/mcp\.NewTool\(['"]([\w-]+)['"]/g);
  for (const match of toolMatches) {
    analysis.tools.push(match[1]);
  }
}

async function analyzeRust(
  projectPath: string,
  analysis: ProjectAnalysis
): Promise<void> {
  const mainFile = path.join(projectPath, 'src', 'main.rs');
  if (!(await fs.pathExists(mainFile))) return;

  const content = await fs.readFile(mainFile, 'utf-8');

  // Find #[tool] attributes
  const toolMatches = content.matchAll(/#\[tool\(name\s*=\s*['"]([\w-]+)['"]/g);
  for (const match of toolMatches) {
    analysis.tools.push(match[1]);
  }
}

async function findFile(
  basePath: string,
  filename: string,
  subdir?: string
): Promise<string | null> {
  const paths = subdir
    ? [path.join(basePath, subdir, filename), path.join(basePath, filename)]
    : [path.join(basePath, filename)];

  // Also check in subdirectories named after the project
  const projectName = path.basename(basePath).replace(/-/g, '_');
  paths.push(path.join(basePath, projectName, filename));

  for (const p of paths) {
    if (await fs.pathExists(p)) {
      return p;
    }
  }
  return null;
}

function generateMermaidDiagram(analysis: ProjectAnalysis): string {
  const lines: string[] = [
    'graph TB',
    `    subgraph "${analysis.name} MCP Server"`,
    '        direction TB',
  ];

  // Add server node
  lines.push(`        SERVER[("${analysis.name}<br/>Language: ${analysis.language}")]`);

  // Add tools
  if (analysis.tools.length > 0) {
    lines.push('        subgraph "Tools"');
    analysis.tools.forEach((tool, i) => {
      lines.push(`            T${i}["${tool}"]`);
    });
    lines.push('        end');
    analysis.tools.forEach((_, i) => {
      lines.push(`        SERVER --> T${i}`);
    });
  }

  // Add resources
  if (analysis.resources.length > 0) {
    lines.push('        subgraph "Resources"');
    analysis.resources.forEach((resource, i) => {
      lines.push(`            R${i}["${resource}"]`);
    });
    lines.push('        end');
    analysis.resources.forEach((_, i) => {
      lines.push(`        SERVER --> R${i}`);
    });
  }

  // Add prompts
  if (analysis.prompts.length > 0) {
    lines.push('        subgraph "Prompts"');
    analysis.prompts.forEach((prompt, i) => {
      lines.push(`            P${i}["${prompt}"]`);
    });
    lines.push('        end');
    analysis.prompts.forEach((_, i) => {
      lines.push(`        SERVER --> P${i}`);
    });
  }

  lines.push('    end');

  // Add MCP Client
  lines.push('    CLIENT[("MCP Client<br/>(Claude, etc.)")]');
  lines.push('    CLIENT <-->|"MCP Protocol"| SERVER');

  return lines.join('\n');
}
