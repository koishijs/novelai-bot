# 介绍

基于 [NovelAI](https://novelai.net/) 的画图插件。已实现功能：

- 绘制图片
- 更改模型、采样器、图片尺寸
- 高级请求语法
- 自定义违禁词表
- 发送一段时间后自动撤回
- 连接到私服 · [NAIFU](./deploy/naifu.md) · [SD-WebUI](https://github.com/AUTOMATIC1111/stable-diffusion-webui)
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

## 快速搭建

::: warning
在此之前，你需要一个**拥有有效付费计划的 NovelAI 账号**，本插件只使用 NovelAI 提供的接口。
付费计划请自行前往 [NovelAI](https://novelai.net/) 了解。
:::

给没有使用过 Koishi 的新人提供一份简单的快速搭建指南：

1. 前往[这里](https://koishi.chat/manual/starter/desktop.html)下载 Koishi 桌面版
2. 启动桌面版，你将会看到一个控制台界面
3. 点击左侧的「插件市场」，搜索「novelai」并点击「安装」
4. 点击左侧的「插件配置」，选择「novelai」插件，并在以下两种方案中**任选一种**：
    - 选择登录方式为「账号密码」，并在「email」和「password」中填入邮箱和密码 (推荐)
    - 选择登录方式为「授权令牌」，并在「token」中填入授权令牌 ([获取方式](./config.md#token))
5. 点击右上角的「启用」按钮
6. 现在你已经可以在「沙盒」中使用画图功能了！

如果想进一步在 QQ 中使用，可继续进行下列操作：

1. 准备一个 QQ 号 (等级不要过低，否则可能被风控)
2. 点击左侧的「插件配置」，选择「onebot」插件，完成以下配置：
    - 在「selfId」填写你的 QQ 号
    - 在「password」填写你的密码
    - 在「protocol」选择 `ws-reverse`
    - 开启「gocqhttp.enable」选项
3. 点击右上角的「启用」按钮
4. 现在你可以在 QQ 上中使用画图功能了！
