---
type: team-context
schema_version: 1
team_name: spec-20261109-1640-Windows打包与运行路径
spec_dir: spec/versions/v0.1/specs/20261109-1640-tech-Windows打包与运行路径
work_id: SPEC-007
version: v0.1
category: tech
task_description: Windows 打包与运行路径
status: archived
phase: end
runtime: codex
mode: gated
execution: serial
git_branch: tech/spec-20261109-1640-windows-packaging
base_branch: dev
base_commit: e02680d6054e14a50a50ff51446c6910b67433c9
remote_url: https://github.com/PrimeDawn/Avalon.git
pr_url: https://github.com/PrimeDawn/Avalon/pull/1
created_at: 2026-11-09T16:42:38+08:00
updated_at: 2026-11-10
---

# SPEC-007 运行账本

## 当前运行路径与需求小结

dev 同步后创建独立分支，未提交 / 推送本轮改动。第二项正式 ID 为 SPEC-007，属性 tech；不是 SPEC-002。用户已确认 Windows 11 x64 中文离线安装向导方向；本项先交付未签名自用包。范围覆盖构建、资源及可写目录、安装 / 快捷入口 / 退出 / 卸载，保留基础窗口，小说业务与品牌视觉归后续 Spec。

| 步骤 | 负责角色 | 动作 | 状态 | 产物 |
|---|---|---|---|---|
| intent / Git | TeamLead | 沿用六项版本范围，干净 dev 创建分支 | done | 本账本 |
| exploration | spec-explorer | 工程、历史经验、NSIS 模板及官方文档调查 | done | explorer/exploration-report.html |
| plan | spec-writer | 形成具体接口、路径与安装方案 | done / approved | writer/plan.html |
| test-plan | spec-tester | 15 项验收、证据与环境要求 | done / approved | tester/test-plan.html |
| execute | spec-executor | E1～E4 实现及单元验证 | done / approved | executor/summary.html |

## 决策记录

| 编号 | 议题 | 候选 / 结论 | 理由 / 依据 | 拍板者 |
|---|---|---|---|---|
| D-001 | 第二项归属 | v0.1 / tech / SPEC-007 | 用户要求“顺势开始第二个spec，按流程先创建分支” | user |
| D-002 | 开发基线 | dev → tech/spec-20261109-1640-windows-packaging | dev 已同步，基线 e02680d；后续合入 dev | user + TeamLead |
| D-003 | 初始 AWR 失败 | 先记录阻塞，以权威源文档继续探索 | Windows 应用程序控制策略拒绝，未伪造 claim | TeamLead |
| D-004 | 交付形态 | 中文离线安装向导；目录选择、快捷方式、完成后启动、卸载保留外部书库 | 用户“那就按照这个方案继续吧” | user |
| D-005 | 系统支持 | Windows 11 x64（Intel / AMD），不承诺 Win10 / ARM64 | 用户对 Windows 11 x64 默认范围回答“只做win11” | user |
| D-006 | AWR 恢复 | 用户自行关闭 SAC；原安装 0.6.0 恢复，无需升级 | 用户“我关闭了智能应用控制，你可以使用awr了”及本轮 --version/status/claim/progress 成功 | user + TeamLead |
| D-007 | 签名与 SAC 验收 | 本次未签名自用包，SAC 开启态不列为完成条件，保留分发限制说明 | 用户“完全没有，也不存在开启该功能的win11了，本机是打不开了，不行就不管了”；没有授权购买证书 | user |
| D-008 | 技术细化提案 | electron-builder 26.18.0 + NSIS；当前用户安装；三类路径分离；最小启动诊断 | 保留现有 electron-vite；准确配置见 plan，等待实现门禁 | spec-writer（提案） |

## 问题闭环记录

| 问题号 | 分类 | 发现者 | 负责角色 | 问题 / 处理 | 关联产物 | 状态 | 更新者 |
|---|---|---|---|---|---|---|---|
| I-001 | env | TeamLead | spec-debugger | AWR 0.6.0 / 官方 0.7.0 均被 SAC 拦截；用户关闭后原版本恢复；Agent 未修改系统设置 | debugger/debug-001.html | resolved | TeamLead |
| I-002 | test-env | spec-tester | TeamLead | D-011：用户取消额外干净机器要求；P06 改用本机综合验证，不再挂起 | updater/update-001.html | closed-by-decision | TeamLead |
| I-003 | tooling | TeamLead | TeamLead | 检查点辅助脚本命中 Microsoft Store python3 占位程序退出；改用原生 AWR CLI 完成同等会话操作，未修改全局 PATH 或共享技能 | 本账本 | workaround | TeamLead |

## 任务进度与角色句柄

当前 Agent 串行切换角色，不创建子 Agent。AWR 的逻辑 branch main 不是 Git 工作分支；实际 Git 分支已核验为 tech/spec-20261109-1640-windows-packaging，不修改 AWR 分支模型来伪装 Git。

| 角色 | 句柄 / 进度 | 续接方式 |
|---|---|---|
| spec-explorer | 01M6ZRQ0PQB5CH9A8R5FGDJZPE；已接力 writer | AWR session resume / 本账本 |
| spec-writer | 01M6ZS6PJB48ZY4EQGJAMNWDVJ；完成检查点并已接力 tester | AWR session resume / 本账本 |
| spec-tester | 01M71FV2Y3GK57GMPPQ43G0N8Z；测试报告 r2，checkpoint 已保存，session incomplete / ended，租约已释放 | 从此会话 resume 后 prepare；P09 / P11 open |
| spec-debugger | 01M71J76Q72Z1W0F2NGK8N0VYD；debug-002 根因已验证，等待诊断 / 预算确认 | 从此会话 resume / prepare；串行，无子 Agent |
| spec-executor | 01M6ZSTE0BD1N5N5RM2BKRD918；E1～E4 完成，报告待确认 | 从此会话恢复测试交接 |
| reviewer / ender | 角色定义已加载，尚未启动 | 不提前执行 |

## 产物注册表

| 产物 | 角色 | 状态 | 已确认 |
|---|---|---|---|
| [探索报告](../explorer/exploration-report.html) | explorer | r2 / completed | 支撑方案 |
| [实现方案](../writer/plan.html) | writer | r4 / approved | yes；D-011 调整验收环境 |
| [测试计划](../tester/test-plan.html) | tester | r4 / approved | yes；D-011 调整 P06 |
| [AWR 诊断](../debugger/debug-001.html) | debugger | r2 / recovered | 用户主动处理后已实测恢复 |
| [实现报告](../executor/summary.html) | executor | r2 / approved | yes；D-010 |
| rk-manifest.js | TeamLead | 登记账本与五份报告 | 不适用 |

## 方案质量闸门

| 检查 | 结论 |
|---|---|
| 接口签名 | plan §3.3 列明 7 个新增 / 修改函数的参数、返回、错误；NSIS 两个无参宏在 §3.1；IPC 不扩展 |
| 数据结构 | RuntimePaths / StartupDiagnostic 逐字段类型、可空性与默认值在 §3.2；配置值在 §3.1 |
| 文件清单 | §3.4 列明每个新增 / 修改文件及 executor / tester 归属；无删除 |
| 每任务验证 | §5 每项对应命令与可观察结果；原生安装验收由独立 test-plan 定义 |
| 占位符 | 无 TODO、待补充或未替换模板值；未来环境依赖明确列为 I-002 |
| 内部一致 | 生产不启动开发端口；路径 API 与数据结构一致；正常取消与实际加载错误区分 |
| 范围 | R1～R6 对应打包 / 路径；无编辑存储、视觉、自动更新或平台扩展 |
| 歧义 | 当前用户安装由宏强制；未签名与 SAC 未覆盖明确；不把外部书库等同安装目录 |

## 门禁决策

| 门禁 | 状态 | 判定 |
|---|---|---|
| 需求与开工 | approved | 用户确认安装形态、Win11 及本次签名边界 |
| 实现方案 + 测试计划 | approved | 用户确认“可以，继续吧”；技术范围保持 r1 |
| 实现报告 → 独立测试 | approved | D-010：用户确认实现报告，授权独立测试 |
| git commit / push / PR | pending | 此前 main / dev 推送授权不自动覆盖本轮分支提交 |

## 修复循环预算

| 循环 | 最大轮数 | 最大无进展轮数 | 已用轮数 | 连续无进展 | 状态 | 用户已确认 |
|---|---|---|---|---|---|---|
| test-debug | 3 | 2 | 2 | 0 | verified | yes / D-013 |

此次 AWR 为环境诊断及用户自行处理，不虚记产品 test-debug 修复轮次。

## 下一步动作

等待用户确认实现报告后进入 spec-test；干净机缺失只能记录阻塞，不能制造通过证据。README / 开发流程分离仍安排在 v0.1 发版准备。

## 本轮文档验证与机器状态

- 四份 HTML 在 headless Edge 实际加载：各有共享样式和 5 个导航入口；最终检查无横向溢出、无 pageerror。仅预览文档，未打开 Avalon 或进入电脑操作模式。
- 四份报告必需 metadata、相对资源 / 文档链接和 manifest 5 个登记项检查通过；无内联样式或模板占位符；git diff --check 通过。
- 原生 AWR CLI 已完成 progress、writer / tester 接力、prepare、checkpoint、session end；最后 project_revision 为 123，源工作项为 in_progress，下一步为用户确认方案。不是 Spec 完成声明。
- 产品源码、依赖和构建配置未修改；本轮未运行产品测试，未提交 / 推送。

## D-009：实现门禁通过（2026-11-09）

用户原话“可以，继续吧”，确认 writer/plan 与 tester/test-plan r1 内容，报告 r2 仅登记确认。进入 spec-execute，不授权 Git 提交 / 推送或跳过独立测试。executor AWR session：01M6ZSTE0BD1N5N5RM2BKRD918。

实现任务：E1 打包配置 → E2 路径与诊断 → E3 生命周期 → E4 构建与文档；T1 端侧脚本归后续 tester。历史经验沿用 EXP-002/003 与 KNOW-002，保留真实入口验收、退出码及隔离约定。

## 实现交接（2026-11-09）

E1～E4 完成；70 项单元与类型检查通过，NSIS 产物已生成。报告：[executor/summary.html](../executor/summary.html)，证据在 executor/artifacts。所有代码为未提交工作树，未执行真实安装 / 端侧测试、未打开 Avalon、未改旧快捷方式。

| 问题 | 分类 | 处理 | 状态 | 负责角色 |
|---|---|---|---|---|
| I-004 | tooling | asar 检查辅助脚本在 Windows 用正斜杠读取失败，改用本机路径分隔符；最终检查通过，原日志保留 | resolved | spec-executor |
| I-005 | dependency | 打包开发依赖审计 6 moderate；生产依赖 0。保留批准版本，不擅自 audit fix；最终报告列明 | recorded | spec-executor |

下一步：用户确认实现报告后，由 tester 编写 / 执行 T1 和原生安装用例。干净 Windows 环境 I-002 仍 open。

## D-010 / D-011：测试启动与验收环境调整（2026-11-10）

D-010：用户“可以，实现报告确认了，继续按照流程进入测试阶段吧。”实现报告 r2 登记确认。

D-011：用户“完全没有，这个测试条件过于苛刻，不现实，就算你记录也没机会做”。取消额外干净电脑 / VM 门槛，P06 改为本机独立安装综合验证；不伪造跨机器或断网结果，不保留必须补做的干净机阻塞。详见 [update-001](../updater/update-001.html)。之前段落中的环境要求为历史记录，以本决策为准。

测试会话：01M71FV2Y3GK57GMPPQ43G0N8Z；本 Agent 串行续接 tester / update 角色，不创建子 Agent。测试过程使用同一未提交工作树，无 commit / push / PR。

## 独立测试进展（2026-11-10，本节覆盖旧“下一步”）

| 产物 | 当前结论 |
|---|---|
| [测试报告](../tester/test-report.html) | r2 / 未确认；13 通过，P09 / P11 失败；P12 用户辅助通过 |
| [更新方案](../updater/update-001.html) | 已确认，用户 D-011 直接授权 |
| [更新总结](../updater/update-001-summary.html) | 已完成文档调整 |
| [更新审查](../reviewer/update-001-review.html) | 仅审查验收文档一致性，未确认，不代表产品测试通过 |

| 问题 | 分类 | 发现者 | owner | 现象 / 交接 | 状态 |
|---|---|---|---|---|---|
| I-006 | bug / major | spec-tester | spec-debugger | P11 不可写目录误报无法关闭；更换目录重装先移除旧安装再失败。截图、进程、文件状态、数据哈希见测试报告；未改产品 | open |
| I-007 | bug / major | spec-tester | spec-debugger | P09 首窗口立即关闭探针出现 app-start-failed / ERR_FAILED，测试超时退出 1；需加阶段审计定位，不猜测已证实根因 | open |
| I-008 | env | spec-tester | TeamLead | 工具启动安装器进入 Codex 视图；改 Explorer 双击后普通 Windows 列表可见 | resolved |
| I-009 | tooling | spec-tester | user + spec-tester | 用户已卸载；exe 和快捷方式移除，数据哈希不变；原入口与两套 profile 恢复 | resolved |

当前修复循环仍 0 轮，未得到修复方案或预算确认，不擅自进入产品修复。没有额外干净机器不再是待办或阻塞。

## 本轮最终交接（2026-11-10）

测试报告 r2：13 通过、2 失败（P09 / P11），不建议通过测试门禁。用户已完成卸载；外部三章和数据标记哈希一致。旧桌面入口原哈希 E89ACD079E6AAB2B6CA7DB8D2739AC6A0B36D798040DE5934084CFDC8842D3A4 已恢复；普通 64 / Codex 92 个 profile 文件逐项匹配。工具隔离视图留下的本次测试注册项已按精确目标清理，电脑操作内核已退出。

下一步：用户确认进入 spec-debug 诊断 P09 / P11；修复前按流程给出具体方案及预算。当前只测试和只读记录线索，未修改产品来掩盖失败。额外干净机器要求已取消，无此阻塞。

AWR 最终检查点已保存并释放测试会话租约，work 保持 in_progress；open-loop 仅 P09 / P11，无额外干净机或卸载待办。HTML 9 份链接 / 元数据检查通过，5 个主要报告在 headless Edge 预览无 pageerror 或横向溢出；git diff --check 通过。

## D-012：安装行为澄清及修复授权（2026-11-10）

用户指出不可写目录安装失败和重装先移除旧版均为合理行为，并明确提出检测旧程序、自动卸载后安装。随后调用 spec-debug 要求“修复缺陷吧”。因此不再把自动卸载本身或无回滚当作缺陷；P11 聚焦目录预检和错误提示。旧 tester 报告保留历史，新口径见 [debug-002](../debugger/debug-002.html)。

## 调试诊断进展（2026-11-10）

接力会话 01M71J76Q72Z1W0F2NGK8N0VYD，串行 spec-debugger。P09 根因：close 先发生，loadFile 取消拒绝时 isDestroyed 仍 false；两次原生 Electron 隔离实验均退出 1，对照退出 0。P11 根因：供应商提取宏在复制失败第五次使用 appCannotBeClosed；两次不可写夹具均命中，无 Avalon 进程，对照可写成功。

| 问题 | 分类 | owner | 状态 | 证据 / 方案 |
|---|---|---|---|---|
| I-007 / P09 | implementation / race | spec-debugger | diagnosed | debugger/debug-002.html；close 事件与销毁中间态未覆盖 |
| I-006 / P11 | dependency / error-message | spec-debugger | diagnosed | debugger/debug-002.html；不把自动卸载旧版当作缺陷 |

当前未改产品、已确认 plan、依赖或用户 profile；桌面入口不动。本轮没有进入电脑操作模式。修复循环预算仍待确认；提议最多 3 轮 / 连续 2 轮无进展停止，尚未批准。

诊断报告已验证：10 份报告链接与 metadata 检查通过，debug-002 在 headless Edge 无 pageerror / 横向溢出。产品基线文件与 tester 打包前哈希逐项相符，未改产品代码。用户确认问题已发出，预算在得到答复前保持待确认。

## D-013：诊断与预算确认（2026-11-10）

用户明确“确认方案与预算，继续修复”。批准 debug-002 与最多 3 轮、连续 2 轮无进展停止；当前第 1 轮进行中。修复 P09 关闭竞态、P11 目录预检，保留标准自动卸载。完成后串行交 tester 复验。不含 Git 提交授权。AWR session：01M71JWQXR249XP12ZHPFSNSAG。此节覆盖历史等待确认状态。

## 第 1 轮修复交接（2026-11-10）

P09/P11：fixed_pending_verification。修复报告 debugger/debug-002-fix.html；72 单测通过、真实 Electron 关闭两次退出 0、缺资源仍退出 1，目录矩阵 5/5。TeamLead 接受复验请求，同 Agent 串行切换 spec-tester，复验当前产物的 P09/P11 和受影响回归。已用 1/3，连续无进展 0/2。尚无测试门禁或 Git 授权。

## 第 1 轮复验与第 2 轮交接

P07/P08/P09 当前包 2 项 Playwright 测试通过；真实向导与静默拒写检查通过。新发现 I-010（minor）：错误页说明下一步，实际按钮为安装；见 tester/artifacts/test-logs/20261110-100449-retest/directory-preflight.txt。TeamLead 交 debugger 在既定准确提示范围修正按钮名称，进入第 2 轮；无新增需求。保护的普通 64 / 虚拟 92 文件哈希全部恢复，桌面入口不变。


第 2 轮已修正文案，重新构建通过；I-010 fixed_pending_verification。debug-002-fix r2。TeamLead 交 tester 复核最终安装包；无需再次启动正文应用，Electron 产物若哈希相同沿用本轮刚执行的回归证据并标明关联。

## 最终修复复验（2026-11-10）

当前测试报告 r3：本次定向复验通过；P09 / I-007、P11 / I-006、按钮文案 I-010 均 verified / closed，更新者 spec-tester。完整安装卸载历史保留，不声称本轮重新执行所有用例。最终包与本轮 Playwright 测试目录 73 文件逐项相同；最终 Setup 目录提示、返回、再次检查及静默拒写均复验。预算已用 2/3、连续无进展 0/2，verified。

测试窗口已关闭，电脑操作内核已 reset；普通 64 / Codex 92 profile 哈希全部恢复，旧桌面入口不变，测试拒写规则清零，无 Avalon 进程。等待用户确认 tester/test-report.html 后进入 spec-end；未提交 / 推送 / 合并。

## D-014：测试确认与收尾启动（2026-11-10）

用户“可以，执行收尾吧”。测试报告 r4 已登记确认；进入 spec-end，当前分支正确，origin/HEAD 为 main，按用户指定及项目 Git 规则仍以 dev 为 PR 目标。当前 Agent 串行收集各角色产物与经验，执行全量自动测试、规范审查和收尾报告；最终具体 Git 提交 / 推送 / PR 方案准备后再按 AGENTS 门禁确认。

## 收尾检查完成（2026-11-10）

本轮 72 单测、8 开发态 E2E、2 打包态 E2E、5 NSIS 目录用例全部通过。用户原数据和入口已恢复，电脑操作内核退出。多角色材料基于本 Spec 串行产物完成，规范无需变化。exp-reflect 提出 EXP-004 / EXP-005 两条草稿，见 ender/end-report.html。

待一次确认：两条经验入库、正式原位归档、单次提交 feat: add Windows installer and runtime paths、推送当前 Spec 分支并创建 dev PR；不含合并与删分支。当前未提交 / 推送，AWR 保持 in_progress。

## 当前待确认交付（2026-11-10）

| 任务 | 负责角色 | 状态 | 产物 |
|---|---|---|---|
| 收尾检查、全量自动测试、规范审查、经验入库、Git 交付 | spec-ender | done | ender/end-report.html |

AWR 已登记 SPEC007-CLOSEOUT-20261110-110945 的真实验证报告，逐项 complete-input 已准备但未执行完工；原位归档 / 经验入库 / commit / push / dev PR 等待一次最终确认。非整个 v0.1 完成，不合并或删分支。

## D-015：确认全部交付（2026-11-10）

用户“确认全部执行（推荐）”，明确批准两条经验入库、SPEC-007 原位归档、以 feat: add Windows installer and runtime paths 提交当前分支、推送 PrimeDawn/Avalon 并创建 dev PR。不包含合并与删分支。

EXP-004 / EXP-005 已写入 spec/context/experience 并更新索引；本次实现与测试文件逐项 SHA256 与收尾测试工作树一致，未额外重启应用。正式原位归档（目录不移动），AWR 完工核验与 Git 交付执行中。历史待确认段落由本决策覆盖。

AWR work complete 成功，SPEC-007 为 completed / locally_verified；证据与回执在 ender/artifacts/20261110-110945。原位归档与经验沉淀已完成，Git 单次提交与 PR 交付进行中。

## Git 交付完成（2026-11-10）

单次提交 feat: add Windows installer and runtime paths 已推送，PR #1：https://github.com/PrimeDawn/Avalon/pull/1，源分支 tech/spec-20261109-1640-windows-packaging，目标 dev，OPEN。PR URL 与本节通过 amend 并入同一次 Spec 提交，随后 force-with-lease 更新自己刚推送的分支；不合并、不删分支。连接器通信失败后 gh 查重为空再创建成功。

AWR completed / locally_verified，session ended，doctor 0 findings；spec-ender=done。最终提交号以本报告所在 Git 提交和远程 PR head 为准，避免在自身提交中硬编码循环引用。


## D-016：归档后清理测试材料（2026-11-10）

用户明确要求 Spec 归档后清理全部原始证据，本地也不长期留存。按 `.agents/rules/test-artifact-lifecycle.md` 清理本 Spec artifacts 与已完成测试的副本/profile/缓存。自动审批拒绝工具直接删除后，由用户运行修正编码的清理脚本；用户报告完成，本轮已核实两个 Spec 的 artifacts 与旧 .awr/cache 均不存在。报告保留既有结论并注明材料已清理。历史路径仅记录当时的操作，不代表文件继续存在。本次不重跑应用测试，不改验收结论，不提交或推送。

清理复核：本项目约 4.17 GB 运行材料已释放；源码、测试源码、报告、开发依赖、release 产物及 AWR 状态库保留。此记录不代表应用测试再次执行。
