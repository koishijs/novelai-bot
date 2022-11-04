# 部署 NAIFU

[NAIFU](https://rentry.org/sdg_FAQ#naifu-novelai-model-backend-frontend) 是匿名网友打包的一套 [NovelAI](https://novelai.net/) 的前端与后端应用，通过它可以快速搭建一个第三方的 NovelAI 服务。

::: tip
由于 NAIFU 在传输过程中被多次修改，产生了许多不同的版本，各版本之间的部署方式可能不尽相同。本文档仅针对最初发布的版本进行说明。如果你发现了本文档对部署方式的描述与你所下载的 NAIFU 附带的说明文件不相符，请以你下载的版本为准。
:::

## 下载并解压 NAIFU

透过磁力链接或网盘等方式下载 NAIFU，然后解压到一个目录中。

如果你下载的内容中包含了 `program.zip` 文件，请将其解压到当前目录，不需要解压到子目录中。

最终的目录结构应该如下所示：

```text
naifu/
├── clip/
├── hydra_node/
├── k_diffusion/
├── ldm/
├── main.py
├── models/
|── taming/
├── static/
├── README.txt
├── requirements.txt
├── run.bat
├── run.sh
├── setup.bat
└── setup.sh
```

## 安装 (Windows)

### 安装 Python

从 [Python 官网](https://www.python.org/downloads/)下载 Python 3.8 或更高版本的安装包 (msi 格式或 exe 格式)，安装时请勾选 `Add Python 3.x to PATH` 选项。

鼠标右键单击开始菜单按钮，选择「命令提示符」，在新开启的窗口中输入 `python --version` 并按下回车。如果出现类似如下的输出，则说明 Python 已经安装成功：

```text
Python 3.10.6
```

### 安装依赖

双击打开 `setup.bat` 文件，它会自动帮你安装所需依赖，根据你的网络情况需要 1~10 分钟，请耐心等待安装完成。

::: tip
由于需要下载安装 PyTorch 和 CUDA 等依赖包，总计需要下载超过 10GiB 的内容。如果在下载过程中遇到网络错误，只需要轻按回车后重新运行 `setup.bat` 即可继续下载。
:::

## 安装 (Linux)

### 安装 Python

在终端中输入 `python3 --version` 并按下回车。

如果出现类似如下的输出，则说明 Python 已经安装成功：

```text
Python 3.10.6
```

如果显示 `python` 命令不存在等错误，请根据你的发行版的安装方式进行安装。

对于 Debian 或 Ubuntu 系列，则为：

```bash
sudo apt install python3
```

### 安装依赖

在终端中输入 `./setup.sh` 并按下回车，它会自动帮你安装所需依赖，根据你的网络情况需要 1~10 分钟，请耐心等待安装完成。

## 启动 NAIFU

### 指定模型文件

如果你在第一步的下载中没有选择模型文件 (`models/animefull-final-pruned/model.ckpt`)，或者想要换一个模型，可以将其复制到 `models/animefull-final-pruned/` 文件夹下方，并改名为 `model.ckpt`。

或者，你可以修改 `run.bat` (对于 Linux 用户是 `run.sh`) 文件，将 `MODEL_PATH=models/animefull-final-pruned` 一行改为你所放置的模型的路径，并且确保模型文件的名称是 `model.ckpt`。

### 设定访问令牌 (可选)

如果你想要将 NAIFU 公开于互联网上，我们推荐你为其设定一个访问令牌 (Token)。

- Windows：在 `run.bat` 中 `%PYTHON% -m uvicorn` 之前添加一行 `set TOKEN=你的令牌`
- Linux：在 `run.sh` 中 `python3 -m uvicorn` 之前添加一行 `export TOKEN=你的令牌`

### 启动

双击打开 `run.bat` (对于 Linux 用户是 `run.sh`) 文件，或在终端中输入 `run.bat` 并按下回车，它会自动帮你启动 NAIFU。

当控制台界面显示 `Uvicorn running on http://0.0.0.0:6969` 时，说明 NAIFU 已经启动成功，你可以在浏览器中打开 `http://localhost:6969` 进行访问测试。

::: tip
如果你运行 NAIFU 的电脑和你的浏览器不在同一台电脑上，你需要将 `localhost` 改为电脑的 IP 地址。
:::

## 配置 novelai 插件

打开 Koishi 控制台，点击「插件配置」并选择「novelai」插件，将 `type` 更改为 `naifu`，并将 `endpoint` 改为上述的地址，最后点击右上角的「重载配置」按钮。

::: tip
如果你在启动 NAIFU 时指定了访问令牌，别忘了在 `token` 中进行配置。
:::

## 附录

### NAIFU 下载地址

- [磁力链接](magnet:?xt=urn:btih:4a4b483d4a5840b6e1fee6b0ca1582c979434e4d&dn=naifu&tr=udp%3a%2f%2ftracker.opentrackr.org%3a1337%2fannounce) (原版)
- [百度网盘](https://pan.baidu.com/s/1AoQgHf5UJuXB2qDtQkOVeQ?pwd=RA00) (提取码：RA00)
