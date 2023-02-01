import { defineConfig } from 'vitepress'
import MarkdownPreview from 'vite-plugin-markdown-preview'

export default defineConfig({
  title: 'Liting Vue',
  description: 'A Vue3 UI Components Library',
  ignoreDeadLinks: true,
  lastUpdated: true,
  cleanUrls: true,
  locales: {
    root: {
      label: 'English',
      lang: 'en',
    },
    zh: {
      label: '简体中文',
      lang: 'zh',
      link: '/zh/',
    },
  },
  themeConfig: {
    siteTitle: 'Liting Vue',
    i18nRouting: true,
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2023-present Liting Yes',
    },
    editLink: {
      pattern: 'https://github.com/liting-yes/litingvue/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },
  },
  vite: {
    plugins: [MarkdownPreview()],
  },
})
