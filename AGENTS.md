# Avalon — 项目约定

本地优先的 AI 共创小说工作台（桌面应用）。整本书就是硬盘上的一个普通文件夹，AI 是随时叫得来、也随时否决得掉的合著者。

## 项目身份

- **技术栈**: Electron + React + TypeScript + Vite；ProseMirror（块模型编辑器）、node-llama-cpp（本地嵌入）
- **类型**: 桌面应用（Windows 优先，架构上不写死平台专属逻辑）
- **产品设计**: `DESIGN.md` 是产品决策的唯一权威来源

## 工作方式

采用 R&K Flow / Spec 驱动式开发。新功能、更新、修复与收尾均通过 `.agents/skills/` 中对应 Skill 执行。

## 规则与技能导入

@import .agents/rules/
@import .agents/skills/

## 目录路由

- `DESIGN.md`：产品设计文档（定位、功能规格、边界、不做清单、里程碑）
- `.agents/rules/`：长期规则、项目偏好、编码/文档/Git 约束
- `.agents/skills/`：R&K Flow 工作流 Skill 与项目 SOP
- `.agents/roles/`：CLI 中立项目级角色定义
- `spec/versions/`：版本空间（Version 规划、发版记录与各 Spec）
- `spec/context/knowledge/`：项目架构、模块理解、技术调研
- `spec/context/experience/`：困境-策略、踩坑经验、决策经验

## 硬性约束

- **阶段门禁**：`spec → plan → 执行`，每个阶段边界必须取得人的确认；`git commit`、`git push`、开 MR 一律先经人确认
- **边界**：不实现 `DESIGN.md` §11「明确不做」中的任何能力，除非先改设计文档并取得确认
