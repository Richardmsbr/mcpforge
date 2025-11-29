#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { newCommand } from './commands/new.js';
import { addCommand } from './commands/add.js';
import { diagramCommand } from './commands/diagram.js';
import { validateCommand } from './commands/validate.js';

const program = new Command();

program
  .name('mcpforge')
  .description('The Architecture Patterns Framework for Model Context Protocol')
  .version('1.0.0');

program
  .command('new <name>')
  .description('Create a new MCP server project')
  .option('-l, --lang <language>', 'Language: python, typescript, go, rust', 'python')
  .option('-p, --pattern <pattern>', 'Pattern: basic, enterprise, microservices', 'basic')
  .option('-t, --transport <transport>', 'Transport: stdio, sse, http', 'stdio')
  .option('--no-git', 'Skip git initialization')
  .option('--no-install', 'Skip dependency installation')
  .action(newCommand);

program
  .command('add <type> <name>')
  .description('Add tool, resource, or prompt to existing project')
  .option('-s, --server <path>', 'Path to MCP server project', '.')
  .action(addCommand);

program
  .command('diagram <project>')
  .description('Generate architecture diagram')
  .option('-o, --output <format>', 'Output format: svg, png, mermaid', 'mermaid')
  .option('-f, --file <path>', 'Output file path')
  .action(diagramCommand);

program
  .command('validate <project>')
  .description('Validate project structure and code')
  .option('--fix', 'Attempt to fix issues automatically')
  .action(validateCommand);

program
  .command('docs')
  .description('Open documentation in browser')
  .action(() => {
    console.log(chalk.blue('Opening documentation at https://mcpforge.dev'));
    import('open').then(({ default: open }) => {
      open('https://mcpforge.dev');
    });
  });

// Show help if no command provided
if (process.argv.length === 2) {
  console.log(`
${chalk.bold.blue('MCPForge')} - The Architecture Patterns Framework for MCP

${chalk.dim('Quick Start:')}
  ${chalk.cyan('mcpforge new my-server --lang python')}    Create Python MCP server
  ${chalk.cyan('mcpforge new my-server --lang typescript')} Create TypeScript MCP server
  ${chalk.cyan('mcpforge add tool search')}                 Add a tool to existing project

${chalk.dim('Documentation:')} https://mcpforge.dev
${chalk.dim('Repository:')}    https://github.com/Richardmsbr/mcpforge
  `);
  program.help();
}

program.parse();
