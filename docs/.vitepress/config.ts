import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'MCPForge',
  description: 'The Architecture Patterns Framework for Model Context Protocol',
  ignoreDeadLinks: true,

  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
  ],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Patterns', link: '/patterns/' },
      { text: 'API', link: '/api/' },
      {
        text: 'Resources',
        items: [
          { text: 'GitHub', link: 'https://github.com/Richardmsbr/mcpforge' },
          { text: 'Discord', link: 'https://discord.gg/mcpforge' },
          { text: 'Changelog', link: '/changelog' },
        ],
      },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Quick Start', link: '/guide/quick-start' },
          ],
        },
        {
          text: 'CLI',
          items: [
            { text: 'Commands', link: '/guide/cli-commands' },
            { text: 'Configuration', link: '/guide/cli-config' },
          ],
        },
        {
          text: 'Templates',
          items: [
            { text: 'Python', link: '/guide/templates-python' },
            { text: 'TypeScript', link: '/guide/templates-typescript' },
            { text: 'Go', link: '/guide/templates-go' },
            { text: 'Rust', link: '/guide/templates-rust' },
          ],
        },
      ],
      '/patterns/': [
        {
          text: 'Overview',
          items: [
            { text: 'Introduction', link: '/patterns/' },
          ],
        },
        {
          text: 'Structural Patterns',
          items: [
            { text: 'Adapter', link: '/patterns/adapter' },
            { text: 'Facade', link: '/patterns/facade' },
            { text: 'Proxy', link: '/patterns/proxy' },
            { text: 'Decorator', link: '/patterns/decorator' },
          ],
        },
        {
          text: 'Enterprise Patterns',
          items: [
            { text: 'Gateway', link: '/patterns/gateway' },
            { text: 'Circuit Breaker', link: '/patterns/circuit-breaker' },
            { text: 'Bulkhead', link: '/patterns/bulkhead' },
            { text: 'CQRS', link: '/patterns/cqrs' },
          ],
        },
        {
          text: 'Security Patterns',
          items: [
            { text: 'OAuth 2.1', link: '/patterns/oauth' },
            { text: 'Rate Limiting', link: '/patterns/rate-limiting' },
            { text: 'Input Validation', link: '/patterns/validation' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Richardmsbr/mcpforge' },
      { icon: 'discord', link: 'https://discord.gg/mcpforge' },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright 2025 Richard',
    },

    search: {
      provider: 'local',
    },

    editLink: {
      pattern: 'https://github.com/Richardmsbr/mcpforge/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },
  },
});
