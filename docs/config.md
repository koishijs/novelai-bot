# 配置项

## 登录设置

### type

- 类型：`'login' | 'token' | 'naifu' | 'sd-webui'`
- 默认值：`'token'`

登录方式。`login` 表示使用账号密码登录，`token` 表示使用授权令牌登录。`naifu` 和 `sd-webui` 对应着其他类型的后端。

### email

- 类型：`string`
- 当 `type` 为 `login` 时必填

你的账号邮箱。

### password

- 类型：`string`
- 当 `type` 为 `login` 时必填

你的账号密码。

### token

- 类型：`string`
- 当 `type` 为 `token` 时必填

授权令牌。获取方式如下：

1. 在网页中登录你的 NovelAI 账号
2. 打开控制台 (F12)，并切换到控制台 (Console) 标签页
3. 输入下面的代码并按下回车运行

```js
console.log(JSON.parse(localStorage.session).auth_token)
```

4. 输出的字符串就是你的授权令牌

### endpoint

- 类型：`string`
- 默认值：`'https://api.novelai.net'`
- 当 `type` 为 `naifu` 或 `sd-webui` 时必填

API 服务器地址。如果你搭建了私服，可以将此项设置为你的服务器地址。

### headers

- 类型：`Dict<string>`
- 默认值：官服的 `Referer` 和 `User-Agent`

要附加的额外请求头。如果你的 `endpoint` 是第三方服务器，你可能需要设置正确的请求头，否则请求可能会被拒绝。

## 参数设置

### model

- 类型：`'safe' | 'nai' | 'furry'`
- 默认值：`'nai'`

默认的生成模型。

### orient

- 类型：`'portrait' | 'square' | 'landscape'`
- 默认值：`'portrait'`

默认的图片方向。

### sampler

- 类型：`'k_euler_ancestral' | 'k_euler' | 'k_lms' | 'plms' | 'ddim'`
- 默认值：`'k_euler_ancestral'`

默认的采样器。

### maxSteps

- 类型：`number`

选项 `--steps` 的最大值。

### maxResolution

- 类型：`number`

选项 `--resolution` 中边长的最大值。

## 输入设置

### basePrompt

- 类型: `string`
- 默认值: `'masterpiece, best quality'`

所有请求的附加标签。默认值相当于网页版的「Add Quality Tags」功能。

### negativePrompt

- 类型: `string`
- 默认值: 
  ```text
  nsfw, lowres, bad anatomy, bad hands, text, error, missing fingers,
  extra digit, fewer digits, cropped, worst quality, low quality,
  normal quality, jpeg artifacts, signature, watermark, username, blurry
  ```

所有请求附加的负面标签。默认值相当于网页版的「Low Quality + Bad Anatomy」排除。

### forbidden

- 类型：`string`
- 默认值：`''`

违禁词列表。含有违禁词的请求将被拒绝。

### placement

- 类型：`'before' | 'after'`
- 默认值：`'after'`

默认附加标签相对用户输入的摆放位置。

设置为 `before` 意味着默认标签拥有更高的优先级 (如果希望与 NovelAI 官网行为保持一致，推荐这个选项)，而设置为 `after` 将允许用户更高的创作自由度。

在 `before` 模式下，用户仍然可以通过 `-O, --override` 选项手动忽略默认标签；而在 `after` 模式下，用户仍然可以通过将基础标签写在前面的方式手动提高基础标签的优先级。

### translator

- 类型：`boolean`
- 默认值：`true`

是否启用自动翻译。安装任意 [翻译插件](https://translator.koishi.chat) 后即可自动将用户输入转换为英文。

### latinOnly

- 类型：`boolean`
- 默认值：`false`

是否只接受英文单词。启用后将对于非拉丁字母的输入进行错误提示。

::: tip
[自动翻译](#translator) 会转化用户输入，因此不建议与此选项同时启用。
:::

### maxWords

- 类型：`number`
- 默认值：`0`

用户输入的最大词数 (设置为 `0` 时无限制)。下面是一些细节设定：

- 这个配置项限制的是词数而不是标签数或字符数 (`girl, pleated skirt` 的词数为 3)
- 正向标签和反向标签分别计数，每种均不能超出此限制，但总词数可以达到限制的两倍
- 如果开启了 [自动翻译](#translator)，此限制将作用于翻译后的结果
- 默认附加的正向和反向标签均不计入此限制

## 高级设置

### output

- 类型：`'minimal' | 'default' | 'verbose'`
- 默认值：`'default'`

输出方式。`minimal` 表示只发送图片，`default` 表示发送图片和关键信息，`verbose` 表示发送全部信息。

### allowAnlas

- 类型：`boolean`
- 默认值：`true`

是否允许使用点数。禁用后部分功能 (如图片增强和步数设置) 将无法使用。

### requestTimeout

- 类型：`number`
- 默认值：`30000`

当请求超过这个时间时会中止并提示超时。

<!-- ### recallTimeout

- 类型：`number`
- 默认值：`0`

图片发送后自动撤回的时间 (设置为 `0` 禁用此功能)。 -->

### maxIteration

- 类型：`number`
- 默认值：`1`

允许的最大绘制次数。参见 [批量生成](./usage.md#批量生成)。

### maxConcurrency

- 类型：`number`
- 默认值：`0`

单个频道下的最大并发数量 (设置为 `0` 以禁用此功能)。
