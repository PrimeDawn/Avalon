---
id: EXP-004
title: Electron关闭中间态不能只检查销毁状态
keywords: [Electron, close, isDestroyed, ERR_FAILED]
scenario: Electron 加载中关闭窗口被误报启动失败
created: 2026-11-10
---

# Electron关闭中间态不能只检查销毁状态

## 困境

加载中关闭窗口时，close 事件早于原生销毁。loadFile 已拒绝，但 isDestroyed 仍为 false，导致正常关窗被当作启动失败。

## 策略

先记录关闭请求，加载取消只在关闭过程中返回 null；其余加载错误继续交错误处理。用真实 Electron 事件时间线和正常关闭对照定位；单测显式覆盖 close 后、destroyed 前的中间态。

## 理由与边界

当前窗口没有取消 close 的逻辑。后续未保存保护若 preventDefault，应重新核对关闭状态的语义，不能机械复用单向布尔标志。

关闭请求和对象销毁是不同生命周期节点；原生事件序列能揭示 mock 一步设置 destroyed 所遗漏的中间态。与 EXP-003 的启动器空退出码是不同根因。

## 证据与相关文件

- [诊断与两组对照实验](../../versions/v0.1/specs/20261109-1640-tech-Windows打包与运行路径/debugger/debug-002.html)
- [修复与复验](../../versions/v0.1/specs/20261109-1640-tech-Windows打包与运行路径/debugger/debug-002-fix.html)
- [已确认测试报告](../../versions/v0.1/specs/20261109-1640-tech-Windows打包与运行路径/tester/test-report.html)
- [收尾报告](../../versions/v0.1/specs/20261109-1640-tech-Windows打包与运行路径/ender/end-report.html)
- 实现：[window.ts](../../../src/main/window.ts)
