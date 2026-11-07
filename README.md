---
title: Avalon
updated: 2026-11-07
---

# Avalon

本地优先的小说工作台，正在开发 v0.1。目前实现的是开发态应用骨架：Electron 窗口、React 启动页面和只读应用信息连接检查。小说编辑、存储、最终界面和 Windows 分发包将在后续 Spec 交付。

## 开发启动

环境：Windows x64、Node.js 24.x、npm 11.x。使用仓库中的 `package-lock.json`，不混用其他包管理器。首次安装依赖和 Electron 运行时需要联网。

```powershell
npm ci
node node_modules/electron/install.js
npm run dev
```

开发窗口由 Electron 打开，Vite 仅监听 `127.0.0.1:5178`。端口占用会报错；先退出占用该端口的自己的开发进程，再启动。主进程修改会重启 Electron，preload 修改会重载页面，renderer 修改由 HMR 更新。

关闭 Windows 上的最后一个窗口会退出 Electron。若终端中的 Vite watcher 仍运行，在原终端按 `Ctrl+C` 结束开发命令。

若启动工具继承了 `ELECTRON_RUN_AS_NODE`，先在启动应用的当前终端移除这个变量：`Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue`。这只影响当前终端，不修改系统环境。

## 构建与检查

```powershell
npm run typecheck
npm run test:unit
npm run build
npm run preview
```

构建输出为 `out/main/index.cjs`、`out/preload/index.cjs`、`out/renderer/index.html`。`preview` 直接加载构建后的本地页面，不启动 Vite 页面服务器，不占用 5178。当前构建不是可分发安装包。

`npm run test:e2e` 会先运行类型检查、单元测试与构建，再执行真实 Electron 测试，日志自动写入当前 Spec 的 `tester/artifacts/test-logs/`。`node scripts/check-test-environment.mjs` 在隔离副本验证干净安装、中文与空格路径构建以及 5178 占用报错。

当前开发态骨架测试已通过：15 项验收、52 项单元测试、8 组真实桌面测试，以及干净安装、开发更新和 Ctrl+C 清理。测试报告已获用户确认，SPEC-001 已原位归档（[收尾报告](spec/versions/v0.1/specs/20261107-1429-tech-开发态应用骨架/ender/end-report.html)）。此前原生启动失败由项目继承的 Low 完整性标签导致，已在用户授权下仅对 Avalon 恢复 Medium；后续若 DSH 再次施加 Low，可能复发。详见[测试报告](spec/versions/v0.1/specs/20261107-1429-tech-开发态应用骨架/tester/test-report.html)。

## 文档

- [产品设计](DESIGN.md)
- [源码地图](CODEMAP.md)
- [v0.1 规划](spec/versions/v0.1/plan.html)
- [当前 Spec 方案](spec/versions/v0.1/specs/20261107-1429-tech-开发态应用骨架/writer/plan.html)

按 v0.1 发版决策 D-004，发布前将整理面向使用者的 README，并将详细开发说明迁至独立文档；目前不创建贡献指南。
