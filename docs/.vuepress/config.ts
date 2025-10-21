import { viteBundler } from '@vuepress/bundler-vite';
import { searchPlugin } from '@vuepress/plugin-search';
import { defaultTheme } from '@vuepress/theme-default';
import { mdEnhancePlugin } from 'vuepress-plugin-md-enhance';
import { defineUserConfig } from 'vuepress/cli';

export default defineUserConfig({
  lang: 'en-US',
  title: 'NestJS Boilerplate',
  description:
    'High-performance, domain-driven NestJS boilerplate for scalable microservices',

  base: '/nestjs-template/',

  theme: defaultTheme({
    logo: '/images/logo.png',
    repo: 'web3ix/nestjs-template',
    docsDir: 'docs',
    docsBranch: 'main',
    editLink: true,
    editLinkText: 'Edit this page on GitHub',
    lastUpdated: true,
    contributors: true,

    navbar: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Architecture', link: '/architecture/overview' },
      { text: 'API', link: '/api/authentication' },
      { text: 'Deployment', link: '/deployment/docker' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          children: [
            '/guide/getting-started.md',
            '/guide/installation.md',
            '/guide/configuration.md',
            '/guide/running.md',
          ],
        },
        {
          text: 'Core Concepts',
          children: [
            '/guide/domain-driven-design.md',
            '/guide/project-structure.md',
            '/guide/conventions.md',
          ],
        },
        {
          text: 'Features',
          children: [
            '/guide/authentication.md',
            '/guide/caching.md',
            '/guide/database.md',
            '/guide/messaging.md',
            '/guide/websockets.md',
            '/guide/workers.md',
          ],
        },
      ],
      '/architecture/': [
        {
          text: 'Architecture',
          children: [
            '/architecture/overview.md',
            '/architecture/domain-layer.md',
            '/architecture/application-layer.md',
            '/architecture/infrastructure-layer.md',
            '/architecture/api-layer.md',
          ],
        },
      ],
      '/api/': [
        {
          text: 'API Documentation',
          children: [
            '/api/authentication.md',
            '/api/health-check.md',
            '/api/error-handling.md',
          ],
        },
      ],
      '/deployment/': [
        {
          text: 'Deployment',
          children: [
            '/deployment/docker.md',
            '/deployment/kubernetes.md',
            '/deployment/environment-variables.md',
          ],
        },
      ],
    },
  }),

  bundler: viteBundler(),

  plugins: [
    searchPlugin({
      locales: {
        '/': {
          placeholder: 'Search',
        },
      },
    }),
    mdEnhancePlugin({
      align: true,
      attrs: true,
      sup: true,
      sub: true,
      footnote: true,
      mark: true,
      tasklist: true,
    }),
  ],
});
