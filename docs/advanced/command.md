# 指令设置

打开[配置文件](./config.md)，在 `group:basic` 下找到名为 `commands` 的插件，这也是本节要介绍的主题。你可以在这个插件中设置指令的各项参数，包括指令的可见性、权限管理、速率限制等等。

## 可见性

`hidden` 属性用于控制指令的可见性。当设置为 `true` 时，指令将不会在帮助菜单中显示 (但仍然可以被正常调用)。

```yaml {4}
plugins:
  commands:
    novelai:
      hidden: true
```

## 权限管理

::: tip
此功能需要数据库支持。请先自行安装任意数据库插件。
:::

`authority` 属性用于设置指令的调用权限。默认情况下，所有人的权限等级都是 1，而指令的调用权限也是 1。你可以将某个用户的权限等级设置为 0 以限制其对绝大部分功能的访问。你也可以将某个指令的权限等级设置为 2 以限制能够调用该指令的用户。

```yaml {4}
plugins:
  commands:
    novelai:
      authority: 2
```

要修改用户的权限等级，你需要配合 admin 插件使用：

```text
auth 2 -u @user
```

这样就修改了目标用户的权限等级为 2。

## 速率控制

::: tip
此功能需要数据库支持。请先自行安装任意数据库插件。
:::

`maxUsage` 和 `minInterval` 属性用于控制指令的调用速率。当指令被调用时，如果当天内调用次数超过 `maxUsage` 或调用间隔小于 `minInterval`，则会拒绝执行并输出一条提示信息。

```yaml {4-7}
plugins:
  commands:
    novelai:
      # 每人每天只能调用 100 次
      maxUsage: 100
      # 每人每 60 秒只能调用 1 次
      minInterval: 60000
```
