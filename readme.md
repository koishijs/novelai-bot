# [koishi-plugin-novelai](https://bot.novelai.dev)

[![downloads](https://img.shields.io/npm/dm/koishi-plugin-novelai?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-novelai)
[![npm](https://img.shields.io/npm/v/koishi-plugin-novelai?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-novelai)

基于 [NovelAI](https://novelai.net/) 的画图插件。已实现功能：

- 绘制图片
- 更改模型、采样器、图片尺寸
- 高级请求语法
- 自定义违禁词表
- 发送一段时间后自动撤回
- 连接到私服 · NAIFU
- img2img · 图片增强

得益于 Koishi 的插件化机制，只需配合其他插件即可实现更多功能：

- 多平台支持 (QQ、Discord、Telegram、开黑啦等)
- 速率限制 (限制每个用户每天可以调用的次数和每次调用的间隔)
- 上下文管理 (限制在哪些群聊中哪些用户可以访问)
- 多语言支持 (为使用不同语言的用户提供对应的回复)

**所以所以快去给 [Koishi](https://github.com/koishijs/koishi) 点个 star 吧！**

## 效果展示

以下图片均使用本插件在聊天平台生成：

| ![example](https://novelai-gallery.vercel.app/69ff89485ee83344868446d9c2b445590cea859d.png) | ![example](https://novelai-gallery.vercel.app/91a9b0a1c3abad3a515efaa4befe27a64aa7c4b8.png) | ![example](https://novelai-gallery.vercel.app/d0e3dbcbdfba07e435c7c84b4de47cd99c4918c0.png) | ![example](https://novelai-gallery.vercel.app/40e5341a66c0fb97e51ef3d23e51c8150a0f3613.png) |
|:-:|:-:|:-:|:-:|
| ![example](https://novelai-gallery.vercel.app/2e631c1944b9579b2c004481c9edff9ac1784330.png) |

## 使用教程

搭建教程、使用方法、参数配置、常见问题请见：<https://bot.novelai.dev>

## License

Released under the [MIT](./LICENSE) license.

Copyright © 2022-present, Shigma & Ninzore

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fkoishijs%2Fnovelai-bot.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2Fkoishijs%2Fnovelai-bot?ref=badge_large)
