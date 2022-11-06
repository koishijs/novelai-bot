import { defineConfig } from '@koishijs/vitepress'

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
        { text: '更多资源', link: '/more' },
      ],
    }, {
      text: '部署',
      items: [
        { text: '部署 NAIFU', link: '/deploy/naifu' },
      ],
    }, {
      text: '进阶',
      items: [
        { text: '配置文件', link: '/advanced/config' },
        { text: '指令设置', link: '/advanced/command' },
        { text: '上下文过滤', link: '/advanced/filter' },
        { text: '自定义回复', link: '/advanced/i18n' },
        { text: '部署到公网', link: '/advanced/server' },
      ],
    }, {
      text: 'FAQ',
      items: [
        { text: '插件相关', link: '/faq/network' },
        { text: '适配器相关', link: '/faq/adapter' },
      ],
    }, {
      text: '更多',
      items: [
        { text: 'Koishi', link: 'https://koishi.chat' },
        { text: 'Koishi Play', link: 'https://play.koishi.chat' },
        { text: 'NovelAI.dev', link: 'https://novelai.dev' },
        { text: '支持作者', link: 'https://afdian.net/a/shigma' },
      ],
    }],

    socialLinks: [
      { icon: 'discord', link: 'https://discord.com/invite/xfxYwmd284' },
      { icon: 'github', link: 'https://github.com/koishijs/novelai-bot' }
    ],

    footer: {
      message: `Released under the MIT License.`,
      copyright: 'Copyright © 2022-present Shigma & Ninzore',
    },

    editLink: {
      pattern: 'https://github.com/koishijs/novelai-bot/edit/master/docs/:path',
    },
  },

  vite: {
    server: {
      fs: {
        strict: false,
      },
    },

    resolve: {
      dedupe: ['vue'],
    },
  },
})
