---
id: EXP-002
title: Electron启动失败与项目完整性标签
keywords: [Electron, Low, Medium, 完整性标签, DSH, CreateWindowStationW]
scenario: Windows Electron 在加载业务代码前以 0x80000003 退出
created: 2026-11-07
---

# Electron启动失败与项目完整性标签

## 困境

单元测试和构建成功，真实 Electron 却在业务代码加载前崩溃。用户普通 PowerShell 运行相同探针也失败，不能仅归因于 Agent 权限。

## 策略

1. 用原生调用证据定位：子进程 IL=4096（Low），父进程 IL=8192（Medium）；CreateWindowStationW 两组掩码均返回 NULL / error 5，CreateAlternateDesktop 返回 12，最终触发 Chromium CHECK。
2. 向上检查标签：C:\workspace 没有 Low；Avalon、Artemis、QQbot 各自有显式可继承 Low。其余六个一级项目根无 Low，不代表递归审计所有项目文件。
3. 本机 DSH windows-acl 0.1.7-rc.2 的路径 SID 算法与三个项目精确匹配，源码会设置并保留可继承 Low；机制有证据，历史写入时间未知。
4. 取得用户“只处理本项目”授权后，仅对 Avalon 执行 icacls 完整性级别恢复 Medium；不重置 DACL、不关闭 Electron sandbox、不修改其他项目。
5. 检查 23,683 个路径，Low 剩余 0；131 个诊断缓存的 DACL 文本变化经 ACE、owner、group、protected 对照等价。原生窗口站创建恢复、六组启动对照及真实桌面测试通过。

## 理由与边界

文件完整性标签会影响进程令牌；“完全访问”不等于不存在完整性隔离。应通过实际令牌和 API 返回值确定失败层次，再进行最小授权修复。全局 DSH 配置未改，未来再次施加 Low 仍可能复发。不要将本次操作推广到整个 workspace。

## 相关文件

- [诊断报告](../../versions/v0.1/specs/20261107-1429-tech-开发态应用骨架/debugger/debug-001.html)
- [修复总结](../../versions/v0.1/specs/20261107-1429-tech-开发态应用骨架/debugger/debug-001-fix.html)
- [原生修复后证据](../../versions/v0.1/specs/20261107-1429-tech-开发态应用骨架/debugger/artifacts/native-1794039698459/events.json)
