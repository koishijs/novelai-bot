# Stable Diffusion Web UI 配置指南

::: tip
如果你不熟悉 Git 和 Python 等，直接使用由秋叶制作的一键启动器。
需要注意的是，在启动器中，你需要勾选 `启用 API` 选项再启动 WebUI，然后根据[配置 NovelAI 插件](#配置-novelai-插件)操作。
:::

## 下载安装 SD-WebUI

使用 Git 下载 SD-WebUI：

```bash
git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui.git
```

使用 Python 安装依赖：

```bash
cd stable-diffusion-webui
pip install -r requirements.txt
```

## 配置 SD-WebUI

确保你在 `webui-user.bat` 或 `webui-user.sh` 中的 `COMMAND_ARGS` 中配置了 `--api` 参数：

  ```cmd
  REM webui-user.bat
  set COMMAND_ARGS=--api
  ```

  ```bash
  # webui-user.sh
  COMMAND_ARGS=--api
  ```

## 配置 NovelAI 插件
