---
title: Avalon 源码地图
updated: 2026-11-09
---

# 源码地图

当前源码包含已验收的 SPEC-001 开发态骨架与 SPEC-007 打包和路径实现。主进程拥有窗口与受控 IPC，preload 通过隔离桥接暴露唯一 `getAppInfo()` 方法，React 页面不访问 Node 或 Electron。

```text
src/
  main/
    index.ts        启动顺序、窗口引用、退出与 activate
    window.ts       本地/开发页面、窗口参数、权限与导航限制
    ipc.ts          固定应用信息处理器与来源适配
    ipc-policy.ts   主 frame、窗口 ID、精确 URL 纯校验
    runtime-paths.ts 开发 / 安装数据隔离、会话和日志目录初始化
    startup-diagnostics.ts 每次启动覆盖的诊断快照
  preload/
    index.ts        窄桥接、响应校验、错误清洗
  renderer/
    index.html      页面入口与 CSP 占位
    src/
      main.tsx      React 挂载
      App.tsx       启动页面及连接状态
      connection.ts 三秒超时、响应校验和可重试错误
      env.d.ts      window.avalon 类型
      style.css     基础可读样式
  shared/
    contracts.ts    AppInfo、AvalonApi、ConnectionState、固定通道
tests/unit/
  ipc-policy.test.ts 来源规则与构建/开发配置
  connection.test.ts 连接成功、失败、超时及初始页面
  ipc.test.ts        IPC、preload、窗口与生命周期聚焦测试
  runtime-paths.test.ts 路径边界、原生路径配置与文件系统失败
  startup-diagnostics.test.ts 快照写入、覆盖与错误传播
```

`electron.vite.config.ts` 配置三入口与 5178 开发服务，生成单文件 CJS main / preload。`tsconfig.node.json` 与 `tsconfig.web.json` 分离宿主和浏览器类型；`vitest.config.ts` 仅运行单元测试。

`tests/e2e/shell.spec.ts` 包含真实窗口、IPC、异常响应、安全边界、关闭、缺失 HTML 和中文路径场景；`playwright.config.ts` 配置单 worker 与证据输出。`scripts/run-e2e.mjs` 执行前置检查并采集原始日志；`scripts/check-test-environment.mjs` 验证干净副本和端口占用。`scripts/check-dev-updates.mjs` 连接 tester 自有开发终端，在隔离副本中验证 HMR、main / preload 更新并还原源码，配合终端 Ctrl+C 检查进程及端口释放；上述真实验收已通过并获用户确认，SPEC-001 已原位归档。

`electron-builder.config.cjs` 与 `build/installer.nsh` 定义 Windows 11 x64 中文离线安装向导；`npm run dist:win` 生成安装包，`npm run pack:win` 生成完整程序目录。安装和数据路径见 [Windows 打包说明](docs/windows-packaging.md)。

`build/install-directory.nsh` 在标准卸载旧版流程前检查目标目录可写性，提供失败提示与返回目录页的入口；静默安装也执行预检。

开发流程与发布要求见 [README](README.md) 和 [版本账本](spec/versions/v0.1/version-context.md)。README 与独立开发文档的整体拆分仍安排在 v0.1 发版准备。
