import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: 'NovelAI Bot',
  description: '基于 NovelAI 的画图机器人',
  themeConfig: {
    outline: [2, 3],
    sidebar: [{
      text: '指南',
      items: [
        { text: '介绍', link: '/' },
        { text: '用法', link: '/usage' },
        { text: '配置项', link: '/config' },
      ],
    }, {
      text: '进阶',
      items: [
        { text: '配置文件', link: '/advanced/config-file' },
        { text: '指令设置', link: '/advanced/command' },
        { text: '自定义回复', link: '/advanced/i18n' },
      ],
    }]
  },
  vite: {
    resolve: {
      dedupe: ['vue'],
    },
  },
})
