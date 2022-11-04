# [koishi-plugin-novelai](https://bot.novelai.dev)

[![downloads](https://img.shields.io/npm/dm/koishi-plugin-novelai?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-novelai)
[![npm](https://img.shields.io/npm/v/koishi-plugin-novelai?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-novelai)

基于 [NovelAI](https://novelai.net/) 的画图插件。已实现功能：

- 绘制图片
- 更改模型、采样器、图片尺寸
- 高级请求语法
- 自定义违禁词表
- 发送一段时间后自动撤回
- 连接到私服 · [NAIFU](https://bot.novelai.dev/deploy/naifu.html) · [SD-WebUI](https://github.com/AUTOMATIC1111/stable-diffusion-webui)
- img2img · 图片增强

得益于 Koishi 的插件化机制，只需配合其他插件即可实现更多功能：

- 多平台支持 (QQ、Discord、Telegram、开黑啦等)
- 速率限制 (限制每个用户每天可以调用的次数和每次调用的间隔)
- 上下文管理 (限制在哪些群聊中哪些用户可以访问)
- 多语言支持 (为使用不同语言的用户提供对应的回复)

**所以所以快去给 [Koishi](https://github.com/koishijs/koishi) 点个 star 吧！**

## 效果展示

以下图片均使用本插件在聊天平台生成：

| ![example](https://cdn-shiki.momobako.com:444/static/portrait/a11ty-f9drh.webp) | ![example](https://cdn-shiki.momobako.com:444/static/portrait/aaepw-4umze.webp) | ![example](https://cdn-shiki.momobako.com:444/static/portrait/ae4bk-32pk7.webp) | ![example](https://cdn-shiki.momobako.com:444/static/portrait/aoy1m-8evrd.webp) |
|:-:|:-:|:-:|:-:|
| ![example](https://cdn-shiki.momobako.com:444/static/portrait/ap8ia-2yuco.webp) | ![example](https://cdn-shiki.momobako.com:444/static/portrait/a7k8p-gba0y.webp) | ![example](https://cdn-shiki.momobako.com:444/static/portrait/a31uu-ou34k.webp) | ![example](https://cdn-shiki.momobako.com:444/static/portrait/agxe3-4mwjs.webp) |

## 使用教程

搭建教程、使用方法、参数配置、常见问题请见：<https://bot.novelai.dev>

## License

Released under the [MIT](./LICENSE) license.

Copyright © 2022-present, Shigma & Ninzore

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fkoishijs%2Fnovelai-bot.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2Fkoishijs%2Fnovelai-bot?ref=badge_large)
