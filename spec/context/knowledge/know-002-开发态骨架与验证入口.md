---
id: KNOW-002
title: 开发态骨架与验证入口
type: 项目理解
keywords: [Electron, React, IPC, preload, 5178, 开发骨架]
created: 2026-11-07
---

# 开发态骨架与验证入口

## 概述

SPEC-001 交付单 package 的 Electron + React + TypeScript + electron-vite 工程。仅有启动页和应用信息连接检查，小说、编辑器、存储、完整视觉和分发包均未交付。

## 详细内容

- main 等待 ready、注册 IPC、创建 BrowserWindow；启动加载失败记录 app-start-failed 并退出 1。Windows 最后窗口关闭退出应用，开发 watcher 用原终端 Ctrl+C 停止。
- preload 单文件 CJS，仅通过 contextBridge 暴露 getAppInfo；主进程校验窗口、主 frame、文档 URL 与参数，返回 name/version。renderer 不直接接触 Node / Electron。
- 保留 sandbox=true、contextIsolation=true、nodeIntegration=false，拒绝新窗口、越界导航及权限请求。
- 开发 URL 严格为 http://127.0.0.1:5178/，strictPort 保证冲突报错。构建后使用本地 file 页面，不占 5178。
- React 连接检查有 checking、success、error，3 秒超时及重试；没有业务读写 IPC。
- npm ci 后显式运行 node node_modules/electron/install.js；npm run dev 开发，npm run build / preview 验证本地构建。
- npm run test:e2e 自动包含 typecheck、52 单测、build 和 8 组真实桌面验证。check-test-environment.mjs 使用隔离中文 / 空格目录；check-dev-updates.mjs 在 tester 自有终端及副本内验证 HMR、preload 与 main 更新，再验证 Ctrl+C 清理。
- 测试日志按 run-id 保存，源码 SHA-256 补充未提交工作树的精确身份；Git HEAD 不能被误说成已含未提交实现。

## 相关文件

- [源码地图](../../../CODEMAP.md)
- [开发命令](../../../README.md)
- [确认方案](../../versions/v0.1/specs/20261107-1429-tech-开发态应用骨架/writer/plan.html)
- [收尾与测试证据](../../versions/v0.1/specs/20261107-1429-tech-开发态应用骨架/ender/end-report.html)
