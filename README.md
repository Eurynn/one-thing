# 壹件 · One Thing

一个帮助你选出今天最想推进的一件事的中文网页工具。

## 功能

- 输入 2–8 件待办，通过两两选择确定今天的一件事。
- 写下可以立即开始的第一步。
- 15、25、45 分钟专注计时，支持暂停和继续。
- 在当前浏览器保存事项和计时状态，刷新后恢复。
- 选择阶段支持键盘 1 / 2。

## 本地运行

需要 Node.js 22.13.0 或更高版本。

```sh
npm ci
npm run dev
```

打开终端显示的本地地址。

```sh
npm run build
```

使用 React、TypeScript、Vinext、Tailwind CSS 和 shadcn 组件。Sites 部署配置位于 `.openai/hosting.json`；部署到自己的站点时请使用自己的项目配置。

## 数据

待办和计时状态使用浏览器 localStorage，不会上传到服务器；清除浏览器站点数据会删除这些记录。
