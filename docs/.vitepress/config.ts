import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: 'koishi-plugin-novelai',
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
    }]
  },
  vite: {
    resolve: {
      dedupe: ['vue'],
    },
  },
})
