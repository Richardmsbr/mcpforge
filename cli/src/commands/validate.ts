import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';

interface ValidateCommandOptions {
  fix: boolean;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export async function validateCommand(
  project: string,
  _options: ValidateCommandOptions
): Promise<void> {
  const projectPath = path.resolve(process.cwd(), project);

  if (!(await fs.pathExists(projectPath))) {
    console.error(chalk.red(`Project path not found: ${projectPath}`));
    process.exit(1);
  }

  console.log();
  console.log(chalk.bold.blue('MCPForge') + ' - Validating project');
  console.log();

  const spinner = ora('Analyzing project...').start();

  try {
    const lang = await detectLanguage(projectPath);
    if (!lang) {
      spinner.fail('Could not detect project language');
      process.exit(1);
    }

    const result = await validateProject(projectPath, lang);

    if (result.valid && result.warnings.length === 0) {
      spinner.succeed('Project is valid');
      console.log();
      console.log(chalk.green('All checks passed!'));
    } else {
      spinner.stop();
      console.log();

      if (result.errors.length > 0) {
        console.log(chalk.red.bold('Errors:'));
        result.errors.forEach(error => {
          console.log(chalk.red(`  - ${error}`));
        });
        console.log();
      }

      if (result.warnings.length > 0) {
        console.log(chalk.yellow.bold('Warnings:'));
        result.warnings.forEach(warning => {
          console.log(chalk.yellow(`  - ${warning}`));
        });
        console.log();
      }

      if (result.errors.length > 0) {
        process.exit(1);
      }
    }
  } catch (error) {
    spinner.fail('Validation failed');
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

async function validateProject(
  projectPath: string,
  lang: string
): Promise<ValidationResult> {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  // Common validations
  await validateCommon(projectPath, result);

  // Language-specific validations
  switch (lang) {
    case 'python':
      await validatePython(projectPath, result);
      break;
    case 'typescript':
      await validateTypeScript(projectPath, result);
      break;
    case 'go':
      await validateGo(projectPath, result);
      break;
    case 'rust':
      await validateRust(projectPath, result);
      break;
  }

  return result;
}

async function validateCommon(
  projectPath: string,
  result: ValidationResult
): Promise<void> {
  // Check for README
  if (!(await fs.pathExists(path.join(projectPath, 'README.md')))) {
    result.warnings.push('Missing README.md');
  }

  // Check for .gitignore
  if (!(await fs.pathExists(path.join(projectPath, '.gitignore')))) {
    result.warnings.push('Missing .gitignore');
  }

  // Check for .env file (should not exist in repo)
  if (await fs.pathExists(path.join(projectPath, '.env'))) {
    result.warnings.push('.env file found - ensure it is in .gitignore');
  }
}

async function validatePython(
  projectPath: string,
  result: ValidationResult
): Promise<void> {
  // Check for pyproject.toml
  const pyprojectPath = path.join(projectPath, 'pyproject.toml');
  if (!(await fs.pathExists(pyprojectPath))) {
    result.errors.push('Missing pyproject.toml');
    result.valid = false;
    return;
  }

  const pyproject = await fs.readFile(pyprojectPath, 'utf-8');

  // Check for MCP dependencies
  if (!pyproject.includes('mcp') && !pyproject.includes('fastmcp')) {
    result.errors.push('Missing MCP dependency (mcp or fastmcp)');
    result.valid = false;
  }

  // Check Python version
  if (!pyproject.includes('requires-python')) {
    result.warnings.push('Missing requires-python in pyproject.toml');
  }

  // Check for server.py
  const projectName = path.basename(projectPath).replace(/-/g, '_');
  const serverPaths = [
    path.join(projectPath, projectName, 'server.py'),
    path.join(projectPath, 'src', 'server.py'),
    path.join(projectPath, 'server.py'),
  ];

  let serverFound = false;
  for (const serverPath of serverPaths) {
    if (await fs.pathExists(serverPath)) {
      serverFound = true;
      const content = await fs.readFile(serverPath, 'utf-8');

      // Check for at least one tool
      if (!content.includes('@server.tool') && !content.includes('.tool(')) {
        result.warnings.push('No tools defined in server');
      }

      break;
    }
  }

  if (!serverFound) {
    result.errors.push('Missing server.py file');
    result.valid = false;
  }
}

async function validateTypeScript(
  projectPath: string,
  result: ValidationResult
): Promise<void> {
  // Check for package.json
  const packagePath = path.join(projectPath, 'package.json');
  if (!(await fs.pathExists(packagePath))) {
    result.errors.push('Missing package.json');
    result.valid = false;
    return;
  }

  const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf-8'));

  // Check for MCP dependencies
  const deps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  if (!deps['@modelcontextprotocol/sdk']) {
    result.errors.push('Missing MCP dependency (@modelcontextprotocol/sdk)');
    result.valid = false;
  }

  // Check for tsconfig.json
  if (!(await fs.pathExists(path.join(projectPath, 'tsconfig.json')))) {
    result.warnings.push('Missing tsconfig.json');
  }

  // Check for src/index.ts
  const indexPath = path.join(projectPath, 'src', 'index.ts');
  if (!(await fs.pathExists(indexPath))) {
    result.errors.push('Missing src/index.ts');
    result.valid = false;
  } else {
    const content = await fs.readFile(indexPath, 'utf-8');

    // Check for at least one tool
    if (!content.includes('ListToolsRequestSchema') && !content.includes('.tool(')) {
      result.warnings.push('No tools defined in server');
    }
  }
}

async function validateGo(
  projectPath: string,
  result: ValidationResult
): Promise<void> {
  // Check for go.mod
  const goModPath = path.join(projectPath, 'go.mod');
  if (!(await fs.pathExists(goModPath))) {
    result.errors.push('Missing go.mod');
    result.valid = false;
    return;
  }

  const goMod = await fs.readFile(goModPath, 'utf-8');

  // Check for MCP dependency
  if (!goMod.includes('mcp-go') && !goMod.includes('go-sdk')) {
    result.errors.push('Missing MCP dependency (mcp-go or go-sdk)');
    result.valid = false;
  }

  // Check for main.go
  const mainPath = path.join(projectPath, 'main.go');
  if (!(await fs.pathExists(mainPath))) {
    result.errors.push('Missing main.go');
    result.valid = false;
  } else {
    const content = await fs.readFile(mainPath, 'utf-8');

    // Check for at least one tool
    if (!content.includes('AddTool')) {
      result.warnings.push('No tools defined in server');
    }
  }
}

async function validateRust(
  projectPath: string,
  result: ValidationResult
): Promise<void> {
  // Check for Cargo.toml
  const cargoPath = path.join(projectPath, 'Cargo.toml');
  if (!(await fs.pathExists(cargoPath))) {
    result.errors.push('Missing Cargo.toml');
    result.valid = false;
    return;
  }

  const cargo = await fs.readFile(cargoPath, 'utf-8');

  // Check for MCP dependency
  if (!cargo.includes('rmcp')) {
    result.errors.push('Missing MCP dependency (rmcp)');
    result.valid = false;
  }

  // Check for src/main.rs
  const mainPath = path.join(projectPath, 'src', 'main.rs');
  if (!(await fs.pathExists(mainPath))) {
    result.errors.push('Missing src/main.rs');
    result.valid = false;
  } else {
    const content = await fs.readFile(mainPath, 'utf-8');

    // Check for at least one tool
    if (!content.includes('#[tool')) {
      result.warnings.push('No tools defined in server');
    }
  }
}
