# 介绍

基于 [NovelAI](https://novelai.net/) 的画图插件。已实现功能：

- 绘制图片
- 更改模型、采样器、图片尺寸
- 高级请求语法
- 自定义违禁词表
- 发送一段时间后自动撤回
- 连接到自建私服
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

## 快速搭建

::: warning
在此之前，你需要一个**拥有有效付费计划的 NovelAI 账号**，本插件只使用 NovelAI 提供的接口。
付费计划请自行前往 [NovelAI](https://novelai.net/) 了解。
:::

给没有使用过 Koishi 的新人提供一份简单的快速搭建指南：

1. 前往[这里](https://github.com/koishijs/koishi-desktop/releases)下载 Koishi 桌面版
2. 启动桌面版，你将会看到一个控制台界面
3. 点击左侧的「插件市场」，搜索「novelai」并点击「安装」
4. 点击左侧的「插件配置」，选择「novelai」插件，填写你的[授权令牌](#token)，并点击右上角的「启用」按钮
5. 现在你已经可以在「沙盒」中使用画图功能了！

如果想进一步在 QQ 中使用，可继续进行下列操作：

1. 准备一个 QQ 号 (等级不要过低，否则可能被风控)
2. 点击左侧的「插件配置」，选择「onebot」插件，完成以下配置：
    - 在「selfId」填写你的 QQ 号
    - 在「password」填写你的密码
    - 在「protocol」选择 `ws-reverse`
    - 开启「gocqhttp.enable」选项
3. 点击右上角的「启用」按钮
4. 现在你可以在 QQ 上中使用画图功能了！
