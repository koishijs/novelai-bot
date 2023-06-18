import { defineConfig } from '@koishijs/vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: 'NovelAI Bot',
  description: '基于 NovelAI 的画图机器人',

  head: [
    ['link', { rel: 'icon', href: 'https://koishi.chat/logo.png' }],
    ['link', { rel: 'manifest', href: '/manifest.json' }],
    ['meta', { name: 'theme-color', content: '#5546a3' }],
  ],

  themeConfig: {
    nav: [{
      text: '更多',
      items: [{
        text: '关于我们',
        items: [
          { text: 'Koishi 官网', link: 'https://koishi.chat' },
          { text: 'NovelAI.dev', link: 'https://novelai.dev' },
          { text: '支持作者', link: 'https://afdian.net/a/shigma' },
        ]
      }, {
        text: '友情链接',
        items: [
          { text: '法术解析', link: 'https://spell.novelai.dev' },
          { text: '标签超市', link: 'https://tags.novelai.dev' },
          { text: '绘世百科', link: 'https://wiki.novelai.dev' },
          { text: 'AiDraw', link: 'https://guide.novelai.dev' },
          { text: 'MutsukiBot', link: 'https://nb.novelai.dev' },
        ],
      }],
    }],

    sidebar: [{
      text: '指南',
      items: [
        { text: '介绍', link: '/' },
        { text: '用法', link: '/usage' },
        { text: '配置项', link: '/config' },
        { text: '更多资源', link: '/more' },
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
        { text: 'Koishi 官网', link: 'https://koishi.chat' },
        { text: 'NovelAI.dev', link: 'https://novelai.dev' },
        { text: '支持作者', link: 'https://afdian.net/a/shigma' },
      ],
    }],

    socialLinks: {
      discord: 'https://discord.com/invite/xfxYwmd284',
      github: 'https://github.com/koishijs/novelai-bot',
    },

    footer: {
      message: `Released under the MIT License.`,
      copyright: 'Copyright © 2022-present Shigma & Ninzore',
    },

    editLink: {
      pattern: 'https://github.com/koishijs/novelai-bot/edit/master/docs/:path',
    },
  },
})
