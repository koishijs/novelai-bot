# koishi-plugin-novelai

[![npm](https://img.shields.io/npm/v/koishi-plugin-novelai?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-novelai)

基于 [NovelAI](https://novelai.net/) 的画图插件。

## 使用方法

### 绘制图片

输入「约稿」+ 关键词进行图片绘制。关键词需要为英文，多个关键词之间用逗号分隔。例如：

```
约稿 koishi
```

### 更改图片方向

可以用 `-o` 或 `--orient` 更改图片方向，可选值包括：

- `landscape`: 512×768
- `portrait`: 768×512
- `square`: 640×640

```
约稿 -o landscape koishi
```

### 切换生成模型

可以用 `-m` 或 `--model` 切换生成模型，可选值包括：

- `safe`: 较安全的图片
- `nai`: 自由度较高的图片
- `furry`: 福瑞控特攻

```
约稿 -m furry koishi
```

### 设置采样器

可以用 `-s` 或 `--sampler` 设置采样器，可选值包括：

- `k_euler_ancestral`
- `k_euler`
- `k_lms`
- `plms`
- `ddim`

一般推荐使用 `k_euler_ancestral`，具体有啥区别我也不知道 (欢迎在 issue 中讨论)。

### 调整影响因子

使用半角方括号 `[]` 包裹关键词以弱化该关键词的影响，使用半角花括号 `{}` 包裹关键词以强化该关键词的影响。例如：

```
约稿 [tears] {spread legs}
```

### 要素混合

使用 `|` 分隔多个关键词以混合多个要素。例如：

```
约稿 cat | frog
```

你将得到一只缝合怪 (字面意义上)。
