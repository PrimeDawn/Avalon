---
id: EXP-005
title: NSIS安装目录检查应先于卸载旧版
keywords: [NSIS, electron-builder, 目录预检, 错误提示]
scenario: Windows 安装目录失败提示不准确或需在卸载旧版前拒绝无效目标
created: 2026-11-10
---

# NSIS安装目录检查应先于卸载旧版

## 困境

electron-builder 26.18.0 提取宏对复制失败统一提示 appCannotBeClosed；不可写目录被误报为程序无法关闭，标准重装流程已先移除旧版。

## 策略

先解析最终目标目录，以唯一临时文件实际验证创建、写入和删除，再进入标准安装段。向导失败页允许返回；静默路径也执行同样检查。以拒写目录、文件占位、可写对照及阶段标记验证不会提前进入安装。

## 理由与边界

不修改依赖模板，不重复实现旧版卸载；预检不等于事务回滚，也不能保证预检后权限变化或磁盘满仍安装成功。

实际写入探针能区分目录权限问题与程序占用；在标准安装段之前执行才能避免先卸载旧版再因已知不可写目标失败。

## 证据与相关文件

- [诊断与两组对照实验](../../versions/v0.1/specs/20261109-1640-tech-Windows打包与运行路径/debugger/debug-002.html)
- [修复与复验](../../versions/v0.1/specs/20261109-1640-tech-Windows打包与运行路径/debugger/debug-002-fix.html)
- [已确认测试报告](../../versions/v0.1/specs/20261109-1640-tech-Windows打包与运行路径/tester/test-report.html)
- [收尾报告](../../versions/v0.1/specs/20261109-1640-tech-Windows打包与运行路径/ender/end-report.html)
- 实现：[目录检查](../../../build/install-directory.nsh) / [安装钩子](../../../build/installer.nsh)
