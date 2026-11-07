---
type: team-context
schema_version: 1
team_name: spec-20261107-1429-开发态应用骨架
spec_dir: spec/versions/v0.1/specs/20261107-1429-tech-开发态应用骨架
work_id: SPEC-001
version: v0.1
category: tech
task_description: 开发态应用骨架
status: archived
phase: completed
runtime: codex
mode: gated
execution: serial
git_branch: tech/spec-20261107-1429-dev-shell
base_branch: dev
pr_url:
created_at: 2026-11-07T14:29:00+08:00
updated: 2026-11-07
---

# SPEC-001 运行账本

## 当前运行路径

| 步骤 | 阶段 | 负责角色 | 动作 | 状态 | 产物 | 门禁 |
|---|---|---|---|---|---|---|
| 1 | intent | TeamLead | 采用已确认 v0.1 / tech 范围，用户明确要求启动第一项 | done | 本账本 | gate-1 已通过 |
| 2 | Git | TeamLead | 提交五份规划文件，验证 dev 干净，创建独立分支 | done | 975c33bb72c1caef77a80ef6c526726279e2a143 | 本次用户授权 |
| 3 | exploration | spec-explorer | 本地与官方资料探索 | done | explorer/exploration-report.html r2 | 已交接 |
| 4 | spec-writing | spec-writer | 方案与接口设计 | done | writer/plan.html r5 | gate-2 已通过 |
| 5 | test-design | spec-tester | 15 项验收用例与边界核对 | done | tester/test-plan.html r4 | gate-2 已通过 |
| 6 | implementation | spec-executor | 按确认方案编写代码与单元验证 | done | executor/summary.html r4、executor/artifacts/ | gate-3 已通过 |

## 需求与编码思路小结

归属 v0.1 / tech / SPEC-001；以 dev 为集成基线，单 package 最小工程，默认 gated + serial。目标是从依赖安装启动 Electron、React 开发更新、最小只读 IPC 与正常退出。顺序为探索 → 方案 / 测试计划 → 用户确认 → 测试先行实现。包管理建议 npm；工程组织建议 electron-vite；准确版本及文件列表见方案。

范围已由版本规划和本轮启动指令明确，用户不必重复确认归属、属性、独立分支或目标。新增技术取舍在 gate-2 一并审阅。打包、完整外观、存储和正文编辑分别属于后续 Spec。

## 任务进度

| 任务号 | 角色 | 任务 | 状态 | 产物 |
|---|---|---|---|---|
| T-001 | spec-explorer | 探索与 exp-search / exp-reflect 判断 | done | explorer/exploration-report.html |
| T-002 | spec-writer | 方案及完备度自检 | done | writer/plan.html |
| T-003 | spec-tester | 测试设计与接口对齐 | done | tester/test-plan.html |
| T-004 | spec-executor | 安装 / RED-GREEN / 实现 | done | executor/summary.html、executor/artifacts/ |
| T-005 | spec-tester | 实际桌面及开发更新验证 | done / 用户已确认 | tester/test-report.html r4、tester/artifacts/test-logs/ |
| T-006 | spec-ender | 新鲜回归、经验沉淀、原位归档与本地提交 | done | ender/end-report.html；完成时间 2026-11-07T17:19:50+08:00；更新者 spec-ender |

## 决策记录

| 编号 | 议题 / 候选 | 结论 | 理由与依据 | 拍板者 |
|---|---|---|---|---|
| D-001 | 重复询问需求或按现有确认启动 | 直接启动需求已明确的 SPEC-001，gated + serial | 用户原话「可以，先提交，dev干净后开新分支，按照流程做第一个spec吧」；已确认版本范围 | user |
| D-002 | npm / pnpm；手工 Vite 编排 / electron-vite | 建议 npm + electron-vite，精确锁版本 | 本机 Node 24.18.0/npm 11.16.0；无现有 lockfile；官方三入口 / HMR 能力见探索报告。当时建议待 gate-2，本轮用户已确认 | spec-writer |
| D-003 | 通用 IPC 转发 / 单个窄 API；关闭沙箱 / 单文件 CJS preload | 建议 getAppInfo + 来源校验，保留沙箱；增加处理器非法参数测试并明确 CSP | Electron 官方 context-isolation/security、tester TC-004/007/008；writer r2 | spec-writer + spec-tester |
| D-004 | 浏览器网页验证 / 真实 Electron 验证 | 真实 Electron E2E + 开发态更新 / 关闭检查 | 版本要求 Electron 窗口；Playwright 官方 Electron 支持有实验性限制 | spec-tester |
| D-005 | 开发端口 5173 / 5178 | 采用 127.0.0.1:5178，来源校验、CSP 与测试同步；保留 strictPort；发布版加载本地页面 | 用户原话「本地还是稍微改下，你看改成5178合适吗，会冲突吗」；Get-NetTCPConnection 未发现占用，netsh IPv4/IPv6 排除范围均不含 5178，独占 TCP bind 成功并释放（退出码 0）；此检查仅证明当前可用 | user + spec-writer |
| D-006 | E2E 与单元测试归属、RED 判据 | 遵从用户提供的 spec-execute：executor 只运行单元 / 聚焦测试；E2E 与桌面更新在下一阶段；使用空桩产生断言失败，不将导入错误计为 RED | 用户提供 skill 的运行契约、v2.7 分工与 references/tdd-discipline.md；plan §3.5 明确 tester 所有权 | TeamLead |
| D-007 | 日志格式与配置 API | 启动失败使用对象日志 event=app-start-failed；配置使用已安装 electron-vite 6 / Vite 8 的 rolldownOptions 与 codeSplitting=false；在既定三个测试文件内补窗口 / preload / bootstrap / CSP 聚焦用例 | writer/plan.html §3.1、§3.4、§3.5；node_modules/electron-vite/dist/index.d.ts、rolldown 类型；RED-config 和 GREEN-config-unit 退出码见 executor/artifacts | spec-executor |

| D-008 | 项目标签修复与重验范围 | 只对 Avalon 可继承 Low 恢复 Medium，继续全部未通过测试 | 用户原话“那你处理一下本项目的就行了，然后继续测试那些没通过的部分”；不改其他项目或全局 DSH | user |

| D-009 | 测试确认与收尾方式 | 原位归档及本地提交，不推送、不创建 PR、不合并 dev | 用户原话“可以，测试就通过了，你执行收尾吧，这个仓库暂时没有远端，先不推送吧” | user |

| D-010 | 本地集成 | 合并 Spec 分支到 dev，保留分支，不推送 | 用户原话“本地可以合并到dev”；合并后 npm run test:e2e 退出 0 | user |

## 门禁决策

| 门禁 | 对象 | 状态 | 判定方式 | 依据 |
|---|---|---|---|---|
| gate-1 | 需求、版本与分支方式 | approved | user | 本轮明确授权；范围继承 v0.1 六项正式规划 |
| git-1 | dev 上五份规划提交 | approved / executed | user | 同一句授权；提交 975c33b，创建工作分支前工作树为空 |
| gate-2 | writer/plan.html r3 + tester/test-plan.html r2（5178） | approved | user | 用户原话「好样的，那继续按照流程，按照plan执行实现」，并明确调用 spec-execute |
| gate-3 | executor/summary.html r1（确认记录 r2） | approved | user | 用户原话「可以，实现报告确认了，继续按照流程进入测试阶段吧。」 |
| gate-4 | tester/test-report.html r3（确认登记 r4） | approved | user | 用户原话“可以，测试就通过了，你执行收尾吧” |
| git-next | 原位归档及本地提交 | approved | user | 本轮收尾指令；明确不推送；未授权合并 / 删除分支 |

## 角色运行句柄

同一个 Codex Agent 串行承担角色，没有 spawn 子 Agent；AWR session 为工作运行句柄，不是 Codex 子线程。七个项目角色定义已读取，未激活角色没有虚构 handle。

| 角色 | AWR session | 状态 | 最近产物 / 接续 |
|---|---|---|---|
| spec-explorer | 01M6TB6T9AHFM5BC3BRP7Q0BT3 | 已接力 | exploration-report.html |
| spec-writer | 01M6TBC9X61W0DJZA7KTGVX660 | 已接力 | plan.html |
| spec-tester | 01M6THNTBVPDR2JJ6DN3P6Y416 | 已结束 incomplete，claim 已释放 | test-report r3，等待用户确认 |
| spec-executor | 01M6TD1HW3V45BCJ3BWQQC8R1H | 已结束（incomplete），claim 已释放 | 实现报告已确认，tester 已接续 |
| spec-debugger | 01M6THGXAKG9WEYA7EWK7T99XH | 已接力 tester | debug-001 r4 已确认、debug-001-fix r2 重验通过 |
| spec-reviewer | 无 | 未启用可选独立审查 | ender 执行产物一致性核对，未虚构 review 报告 |
| spec-ender | 01M6TMC3FP3FR87RN3ZHHNPAHX | ended，claim 已释放 | ender/end-report.html |

AWR 0.6 的 work prepare context_hash 位于 context.work_context.context_hash；resume 的成功应结合进程退出码和活跃会话查询判断，不能假设所有命令都有顶层 ok。一次 resume 结果缺顶层 ok 被本地脚本误判，但查询确认已完成 writer 接力，没有重复创建会话。

版本上游：[v0.1 版本规划](../../../plan.html)。

## 产物注册表

| 产物 | 角色 | 状态 | 用户确认 |
|---|---|---|---|
| [探索报告](../explorer/exploration-report.html) | spec-explorer | r2 完成 | 供方案依据 |
| [实现方案](../writer/plan.html) | spec-writer | r5（新增反链） | 方案已确认 |
| [测试计划](../tester/test-plan.html) | spec-tester | r4（执行登记） | 验收标准已确认 |
| [实现总结](../executor/summary.html) | spec-executor | r4（确认及反链） | 已确认 |
| [测试报告](../tester/test-report.html) | spec-tester | r3 全部通过 | 待确认 |
| [诊断报告](../debugger/debug-001.html) | spec-debugger | r4 | 用户授权修复，已确认 |
| [修复总结](../debugger/debug-001-fix.html) | spec-debugger / tester | r2，修复后重验通过 | 随测试报告审阅 |
| rk-manifest.js | TeamLead | 导航已登记八份文档 | 不适用 |

## 问题闭环记录

| 编号 | 分类 | 问题 | 处理 / 证据 | 状态 |
|---|---|---|---|---|
| I-001 | env | 仓库无 remote | git remote 输出为空，记录本地分支；不虚构 pull/push/PR | 已明确，当前不阻塞 |
| I-002 | dependency | npm 候选组合运行兼容性 | npm install / ci、typecheck、unit、build 已通过，无 peer 冲突；原生问题修复后真实桌面通过，关联 I-009 | resolved |
| I-003 | process | 桌面报告可视预览受限 | Edge 未接入；内置浏览器明确拒绝 file 协议，不绕过策略；改做本地 HTML、链接与资源静态校验 | 可视预览未完成 |
| I-004 | process | 测试清单需要适配层非法参数覆盖 | writer r2 补 ipc.test.ts，双方统一 TC-008 | resolved |
| I-005 | env | AWR resume 返回形状差异 | 核验仅一个活跃 writer session，后续按退出码 + session 查询；所有 runtime JSON 存 .awr/cache（已忽略） | resolved |
| I-006 | process | 初次 RED 的超时测试在断言失败时产生未等待 Promise | 改为立即捕获 outcome 后再断言，RED-behavior 为 37 failed / 11 passed 且无未处理错误；保留首轮原始日志 | resolved |
| I-007 | dependency | Node 类型检查未纳入 renderer 的 Window 声明；原生事件测试替身不完整 | node tsconfig 补 env.d.ts，边界替身显式 unknown 转换；typecheck-fixed 与 clean-typecheck 均退出 0 | resolved |
| I-008 | env | Electron 45 npm 包延迟获取运行时，首次下载耗时 | 已安装包 index.js / install.js 确认惰性下载；改用 @electron/get 自定义 curl downloader 获取同一官方文件并保留 SHA-256 校验，无全局配置改动；续传后 SHA-256 校验成功，electron-runtime-ready 退出 0。原下载后来发现已有部分数据，未证明内置下载器故障 | resolved |

| I-009 | env/permission | 项目 Low 导致 Electron 出生即降权并拒绝窗口站创建 | 根标签恢复 Medium；原生启动、15/15 验收及开发更新全部重验通过，debug-001-fix r2 / test-report r3 | verified / resolved |

## 方案质量闸门

| 项目 | 结论 / 证据 |
|---|---|
| 接口签名 | plan §3.4 列出桥接、来源校验、注册、窗口、启动和连接方法的参数、返回及错误语义 |
| 数据结构 | AppInfo / AvalonApi / ConnectionState / IpcCaller 类型、空值和默认值明确 |
| 文件清单 | plan §3.5 包含源码、配置、3 个 unit 测试、桌面测试、runner、README / CODEMAP |
| 每任务验证 | T1–T5 各有具体命令及 RED/GREEN 或人工观察；明确命令尚未创建 / 未执行 |
| 模板占位 | 无 TODO、未替换模板字段；TypeScript 泛型和对象声明不是模板占位 |
| 内部一致性 | tester TC-008 对齐 writer r2；构建验证与分发打包分开 |
| 范围 | 每项映射 FR-001–005；没有小说、存储、打包或外观扩项 |
| 歧义 | 明确 Node/npm、输出路径、可信 URL、CSP、超时及更新 / 关闭行为；依赖运行验证风险显式保留 |

## 角色交接

| 来源 | 接收 | 材料 | 状态 |
|---|---|---|---|
| TeamLead | spec-explorer | 版本范围、dev 提交、分支与 AWR context | done |
| spec-explorer | spec-writer / spec-tester | 探索报告 | done |
| spec-writer | spec-tester | r1 接口及文件清单 | done |
| spec-tester | spec-writer | TC-008 适配层覆盖与 CSP 精确化 | r2 已处理 |
| TeamLead | user | plan r3 + test-plan r2（端口 5178） | 用户已确认，登记为 plan r4 / test-plan r3 |
| spec-executor | TeamLead / user | summary r1、25 项实现文件、17 份运行日志 | 用户已确认（记录 r2），测试反链 r3 |

## 修复循环预算

| 循环 | 最大轮数 | 最大无进展轮数 | 已用 | 状态 |
|---|---|---|---|---|
| test-debug | 3（用户已确认） | 2（用户已确认） | 修复 1；连续无进展 0 | 全部复验通过，待报告确认 |

## 下一步动作

用户已授权仅修本项目并复验；已完成。等待用户确认 tester/test-report.html r3，再按流程审查 / 收尾。SPEC-001 保持 in_progress，未提交 / 推送；后续 DSH 再次写入 Low 的风险未纳入全局治理。


## 本轮验证与接续点

- 4 份 HTML 报告的标签配对、共享资源和本地链接检查通过；manifest 的 4 项路径均存在（Python 静态检查，退出码 0）。
- git diff --check 通过（退出码 0）；这些检查不等于应用测试。
- AWR checkpoint：01M6TBWGYZNYHNA9HE3BE341CC；context_hash：4f6447c0b264acd36ee16e3f9a0c46f05a5e7a6985938c7f148fab496bbbb457。
- session end --outcome incomplete 成功，project revision 38，已释放 tester claim；SPEC-001 仍为 in_progress。
- awr doctor --json：ok=true、findings=[]、foreign_key_violations=0（退出码 0）。
- AWR 默认运行分组 main 未绑定 Git；实际 Git 分支以本账本 git_branch 和 git branch --show-current 为准，不将二者混同。

## 开发端口反馈修订

2026-11-07：当前仍处于首次方案审阅，按 spec-start 的方案反馈修订 writer r3 / tester r2；没有原实现或 executor/summary.html，因此不启动实现后的 spec-update 循环。5178 当前可独占绑定，已立即释放；未来占用仍按端口冲突用例报错，不承诺永久无冲突。未创建应用代码，应用测试尚未执行。

## 本轮实现任务清单（用户批准后）

- T1：最小工具配置与锁定安装 → 来源策略的断言级 RED。
- T2（依赖 T1）：来源策略、连接、IPC 适配层逐项 RED → GREEN。
- T3（依赖 T2）：主进程、窗口、preload、基础 React 页面与构建；进程边界聚焦测试先行。
- T4（依赖 T3）：实现错误退出、开发更新配置、连接重试；真实桌面 / HMR 集成验证由 tester 在实现报告确认后负责。
- T5（依赖 T4）：README / CODEMAP 与干净安装、类型检查、单测、构建复现；E2E 脚本和最终桌面验收交 tester。

用户提供的 spec-execute 明确规定 executor 不写 / 不执行 E2E，优先于 plan §5 将全阶段任务混写在一起的表述；plan §3.5 本已将 shell.spec.ts / run-e2e.mjs 归 tester。按此职责边界交接，不冒领集成结果。严格 TDD 用空桩触发行为断言失败，不采用 plan 末尾提及的缺模块失败作为 RED 证据。

exp-search：项目 experience / knowledge 索引只有占位条目，未命中 Electron / Vite / IPC；没有发现 Auto Memory 项目目录。无已验证历史策略可引用。

## 实现证据进展

2026-11-07T15:15:02.096692+08:00：主工作树 52/52 单元用例、typecheck、build 通过；含中文及空格的 .awr/cache/spec001-复现 空格 目录 npm ci、52/52 unit、typecheck、build 均退出 0。原始日志由运行包装器自动生成，包含命令、时间戳、退出码。尚未运行真实桌面 / E2E；mock 边界的真实覆盖必须由 tester 完成。

实现完成时间：2026-11-07T15:19:04.748197+08:00；更新者：spec-executor。本阶段 T1–T5 的实现与单元 / 构建复现完成；跨真实进程的 T3 / T4 / T5 验收仍归 tester。未提交 / 推送 / 归档。

## 实现阶段收口

- 最新 checkpoint：01M6TE1MBR745RK7DR9VTN66SK；context_hash：b1a2086b3fed737116de534925b33c397fa7ef6cf5967e67ce1d9414515417c5。
- session end --outcome incomplete：ok=true，project revision 46；此状态表示整个 Spec 尚待正式测试，不表示实现失败。
- awr doctor --json：ok=true、findings=[]；git diff --check 退出 0。
- 5 份 HTML 的标签、链接和元数据检查通过；manifest 5 项、17 份自动证据日志均有效，证据未被 gitignore 忽略；Electron 可执行文件和 45.2.3 版本文件存在。报告未做浏览器可视预览，沿用 I-003 的限制。
- 交接要求：用户确认实现报告后再执行真实桌面测试；保持 SPEC-001 in_progress，不提前机器完工。

## 测试阶段启动

用户已批准实现报告；本轮重新运行 unit / typecheck / build，不引用上轮通过数作为最终证据。所有临时源码改动在隔离副本中进行，源工作树仅新增 tester 拥有的测试 / 配置 / runner。若发现产品缺陷，先记录复现与证据，修复循环预算仍待用户确认，测试脚本自身问题可在本阶段修正。

## 首轮测试结果与交接

- 更新者 / 发现者：spec-tester；日期 2026-11-07。用户 gate-3 已通过，本轮 52/52 单元测试、typecheck、build、中文 / 空格干净副本 npm ci 和端口冲突检查通过。
- 15 项验收：5 通过（TC-001/004/006/013/015）、1 失败（TC-002 原生启动）、9 未验证。7 个 Playwright 分组全部在启动阶段失败，不能视为 7 个产品缺陷。
- I-009 | 分类 env / dependency，根因待定 | owner 建议 spec-debugger | open：Electron 45.2.3 退出 2147483651 / 0x80000003，--version 与独立最小程序同样失败，未到业务代码。ZIP 与安装目录 73 文件 CRC 一致；未证明系统或依赖的具体根因。
- 复现、预期 / 实际、运行环境、完整证据：[测试报告](../tester/test-report.html)。主运行 2026-11-07T07-37-16-049Z-8e1aef，独立检查 independent-1794037035692；未采集到窗口截图 / trace / renderer 日志，原因如实披露。
- 测试工具自身类型 / CLI 路径错误已修正，原始失败输出保留；未修改业务代码或 executor 单元测试。开发态 HMR / main / preload 更新、dev Ctrl+C 与缺失 HTML 场景待启动恢复后执行。
- 修复循环预算仍为未确认、已用 0；本阶段只做故障隔离对照，没有运行 spec-debug 或擅自变更 Electron / 系统安全设置。
- 报告状态未确认、整体未通过；不生成通过证明、不调用 work complete。机器失败报告从本轮 results.json 自动派生；正式完工准备须待全项通过。

## 测试阶段收口

- AWR checkpoint：01M6TFB5RJYCP9R91ZQ8Z57XRA；session end incomplete 成功，project revision 52，SPEC-001 继续 in_progress。
- awr doctor：ok=true、findings=[]、foreign_key_violations=0。
- 6 份 HTML 标签 / 元数据 / 本地链接、manifest 6 项、git diff --check 通过；39 份文本日志凭证模式扫描未发现匹配。报告未做可视预览。
- 自动派生 completion-report.json 的检查为 false；prepare-completion 按预期退出 1（completion.report.check.passed），未注册完成证据。HTML evidence locator 只用于交接，不能作为已验证完工证明。
- 收口查询未见 electron.exe 或 5178 监听；没有关闭用户的其他应用。未进行 Git 提交、推送或归档。

## 诊断启动授权

用户原话：可以，去检查根因。承接前轮建议，预算最多 3 轮、连续 2 轮无进展停止；本轮先完成诊断，具体修复方案仍按 gated 流程确认。exp-search 检索项目索引未命中；没有可引用的历史修复策略。


## 首轮原生诊断结果

- 用户已批准诊断与 3 / 2 修复预算；未再次请求预算。新增 [debug-001.html](../debugger/debug-001.html) r1（未确认），发现者 / 更新者 spec-debugger。
- I-009 owner=spec-debugger，分类 env/permission，状态 diagnosed-partial / waiting-user。已确认 CreateWindowStationW 两组掩码均 NULL/5，CreateAlternateDesktop 返回 12，Chromium CHECK 于 electron.exe RVA 0x348e98a 触发。独立 Python 探针相同 DACL 和掩码成功，具体权限拒绝的上游来源未知。
- 本轮新增确定的 API / 返回值 / 断点证据，属于有进展；修复未实施，已用修复轮数 0、连续无进展 0。根据 spec-debug 权限类升级约定，停止改变执行环境或安全设置，等待诊断确认。
- 新增 debugger/probes 下三个可复现探针；原始 stdio / native / winstation / disassembly 输出位于 debugger/artifacts。不以早期观察器错误偏移解释结果，使用后续修正与硬件断点捕获。
- 没有修改业务源码、executor unit、package lock、writer/plan.html、PATH 或权限。未使用 no-sandbox、管理员启动、ACL 重置或替代执行通道绕过权限拒绝。
- 测试报告 r2 / 实现总结 r4 只补诊断反链，之前通过 / 未通过结论保留；manifest 7 项。
- 下一步建议：用户普通非管理员 PowerShell 在仓库运行 debugger/probes/stdio-probe.mjs；若该终端成功，再按原安全配置重跑 test:e2e。对照尚未执行，不能声称宿主已被证明是根因。

诊断阶段收口：checkpoint 01M6TG92FN49A4650E8ZRASSTJ，session end incomplete，project revision 58。业务源码 / unit 指纹未变，3 份本轮修改报告的结构与链接、7 项 manifest、git diff --check 通过；未提交。


## 继续排查与普通终端对照

- 用户再次授权查根因，并亲自完成 stdio-probe；六组均失败，结果 stdio-1794038785174。不是仅 Agent 工具环境出现的失败。
- 新证据：Avalon 根目录有显式可继承 Low 完整性标签，electron.exe 继承 Low；原生创建事件中子进程 IL=4096，父进程 IL=8192。标签最初设置者未知，不能据特殊 SID 猜测责任方。
- I-009 更新者 / owner spec-debugger，状态 diagnosed / waiting-user-fix-approval；关联 debug-001.html r2。最小候选为仅 electron.exe 设 Medium 并复跑原生启动，未执行安全标签写入；非持久治理结论。
- 现有 3 / 2 预算保持；修复轮数 0、连续无进展 0。用户已授权排查，不再请求同一授权；本次待确认的是具体权限标签变更。

本轮接续已写 AWR checkpoint（.awr/cache/integrity-checkpoint.local.json），session end incomplete 成功，project revision 64，doctor findings=[]。报告 r2 结构与链接检查通过，业务源码与单测指纹未变，未修改安全标签、未提交。


## workspace 标签源头补查

- 用户要求向上核对共同父目录与新项目继承影响；不是对前轮标签修正的批准。本轮继续 spec-debug 只读诊断。
- C:\workspace 无 Low，全部九个一级目录中仅 Avalon / Artemis / QQbot 根各自显式 Low；其余六个根无 Low。没有递归审计其余项目所有文件。
- 本机 DSH windows-acl 0.1.7-rc.2 源码明确写入可继承 Low 并保留 workspace grant；其路径 SID 算法对三个项目全部精确匹配，定位设置机制，具体历史写入时刻无审计证据。见 debug-001.html r3 及 workspace-integrity-20261107-161320 两份 JSON。
- 普通新项目不会从 workspace 继承 Low，但上述 DSH backend 可重新向项目根单独写入。持久治理需要防止重施与处理已有标签，单文件覆盖不能独立解决。未修改安全设置、其他项目文件或业务源码；修复0、连续无进展0。

本轮 AWR checkpoint 已保存于 .awr/cache/workspace-integrity-checkpoint.local.json；会话 incomplete 收口，doctor ok=True，findings 数=0，project revision=70。诊断 r3 结构与链接检查通过，未修改安全设置。


## 本项目标签修复及重验授权

用户原话“那你处理一下本项目的就行了，然后继续测试那些没通过的部分”，批准项目级标签恢复和随后复验，无需再次询问同一步授权。debug-001 r4 已确认，新增 [debug-001-fix.html](../debugger/debug-001-fix.html) r1；修复1/3、连续无进展0。扫描23683个路径无Low；131个诊断缓存DACL文本变化已证明ACE/owner/group/protected等价。其他项目未变；DSH全局配置未改，未来重施风险如实保留。I-009 fixed_pending_verification；TeamLead 同意依本次用户授权切入 tester，业务源码未修改。

## 修复后最终重验（2026-11-07）

- 更新者 spec-tester：最终桌面 run 2026-11-07T08-30-34-130Z-3f14a8，typecheck / 52 unit / build / 8 桌面组全部退出 0；15 项验收及三个使用场景全部通过。
- 干净安装 independent-1794040233742 含显式 Electron runtime 安装，全部通过；dev-1794039915835-updates-2 的 HMR、preload、main 更新及恢复通过，Ctrl+C 后 15 个记录进程退出且 5178 / 9237 释放。
- 12 个源码文件及 3 个 executor unit 文件与诊断前 SHA-256 一致；writer 方案未改。测试脚本误判及早期失败原始日志均保留，最终证据另建目录。报告 r3 保留 r1/r2 历史。
- I-009 verified / resolved；修复1/3、连续无进展0。测试报告未确认；不等于 Spec 完工，不启用后续 Spec，不执行 work complete 或 Git 操作。
- 本账本以上“首轮”“诊断”“继续排查”等章节为历史，当前状态以本节及顶部门禁表为准。

## 本轮测试收口

- AWR checkpoint：01M6TJHFK3C087ZG63K7GGDKQ1；session end incomplete 成功，project revision 79；doctor ok=true、findings=[]、foreign_key_violations=0。
- 8 份 HTML 结构 / 元数据 / 链接及 8 项 manifest 验证通过；33 份文本证据凭证模式扫描通过；git diff --check 通过。最终查询未见 Avalon Electron 进程或 5178 / 9237 监听。
- 源码及测试指纹与最终运行汇总一致；AWR evidence 的 HTML 入口仍是非机器完工声明，自动派生 completion-report.json 已就绪，正式绑定 / work complete 留待门禁通过和 ender 阶段。

## 本机桌面体验入口（用户请求，2026-11-07）

- 用户要求将窗口程序放到桌面，方便后续 Spec 亲自体验；这是本机快捷入口配置，不是打包交付或产品功能更新。
- 快捷方式：C:\Users\35692\Desktop\Avalon.lnk；辅助脚本：C:\Users\35692\AppData\Local\Avalon\DesktopLauncher\launch.ps1。每次运行当前项目 npm run build，成功后启动项目 Electron，使用本地页面；不启动 Vite / 不占 5178。构建失败不启动旧产物，日志同目录。
- 通过快捷方式实际启动一次，build exit=0，观察到 Avalon 原生窗口；5178 未监听。verification.json 自动记录 PID、窗口句柄、标题与时间。窗口保留给用户体验，后续检查不要将其误判为测试泄漏并擅自关闭。
- 后续源码更新需关窗再双击，以重新构建。入口依赖 C:\workspace\Avalon 和现有 Node / 项目依赖；正式可分发 exe 仍归 SPEC-007。本轮未修改产品源码、依赖、确认方案或 Git 提交。
## 本机桌面入口关闭误报修复（2026-11-07）

- 用户反馈桌面双击打不开、正常关闭后错误弹框。辅助脚本日志显示 ExitCode=null；Windows PowerShell 5.1 的 Start-Process + 日志重定向 + PassThru 最小对照复现，原子进程真实退出 0 却读到 null。本机辅助脚本问题，不是此前 Low 标签复发。
- 最小修正：启动后立即保留 app.Handle，再等待退出并读取 ExitCode；错误弹框显示前释放启动 mutex，避免弹框阻塞下一次启动。没有修改产品源码 / 已确认方案 / 权限。
- 修复后退出码 0 / 7 对照均正确；真实快捷入口完成两次页面连接成功 → 正常关窗，ExitCode=0，辅助进程消失，第二次重新启动成功。自动证据保存在 C:\Users\35692\AppData\Local\Avalon\DesktopLauncher\fixed-exit-code-probe.json 和 open-close-reopen-verification.json。窗口最终均关闭，可由用户自行双击。
- 保留验证过程问题：首次测试高频 Get-Content 阻挡状态文件写入，改为等待进程退出后再读取；UIA 将状态拆成多个文本节点，按组合文本验证。另一次在页面尚未加载时立即发 WM_CLOSE，应用记录 ERR_FAILED(-2) 并退出1，这与原用户截图的空退出码不同；“页面加载中关闭”尚需在后续审查评估，本次正常加载后关闭已验证，不将其宣称为已覆盖。
- 前次只验证窗口出现便交付快捷入口，漏验关闭 / 重开；本次补齐该路径。不重跑整套桌面测试，不进行 Git 操作。
## 桌面入口真实路径修复（2026-11-07 17:06）

- 用户再次反馈 Explorer 双击无窗口；原启动日志停留16:49，表明脚本未执行。之前仅由 Codex 进程启动的验证不能代替 Explorer 入口。
- 已证实根因是 AppData 路径视图差异：Codex 内写入的 C:\Users\35692\AppData\Local\Avalon\DesktopLauncher 实际落到 Codex MSIX 包的 LocalCache\Local\Avalon\DesktopLauncher；快捷方式参数仍为普通 AppData 脚本路径。由 Explorer 启动的新辅助脚本自动采集 path-visibility.json：ordinaryAppDataScriptExists=false、codexRedirectedScriptExists=true。此前控制台宿主故障只是未证实假设，不是最终根因。
- 当前稳定入口为 C:\Users\35692\.avalon-desktop\AvalonDesktopEntry.exe + launch.ps1，桌面仍为 Avalon.lnk；源码 AvalonDesktopEntry.cs 同目录保留。本地 C# GUI 启动器由已安装 .NET Framework csc 编译，CreateNoWindow 调用 PowerShell，保留每次 build、错误日志、正常退出及锁释放；不依赖 Codex 包路径，不修改全局终端或执行策略。
- computer-use 实际从 Explorer 桌面目录双击：17:04启动，页面与“连接正常 · Avalon 0.1.0”已观察；点右上角关闭，17:05日志 exitCode=0，启动器也退出。17:06再次双击，buildExitCode=0，新的 Avalon 窗口显示“工作台已启动”。窗口留给用户，不应视为测试泄漏并擅自关闭；本次新开的资源管理器窗口已关闭。
- 证据位于 C:\Users\35692\.avalon-desktop\entry.log、ui-close-verification.json、path-visibility.json、status.json；当前 UI 观察保存在 CUA 工具会话。原 AppData 记录保留作历史，后续维护应使用稳定目录。
- 本次没有修改产品源码 / 方案 / 单元测试 / Git提交。正式发布包仍归 SPEC-007。后续存储 / 打包 Spec 应注意桌面宿主与普通 Explorer 的用户目录视图差异，验收需覆盖真实用户启动路径。

## 最终收尾（当前状态，前述阶段记录均为历史）

- 用户确认测试，完成第一个 Spec；目录原位归档，不移动。正式产物见 [收尾报告](../ender/end-report.html)。
- 新鲜回归：2026-11-07T09-10-37-477Z-b537ad（52 unit、8 desktop、typecheck/build），independent-1794042637021（干净安装与端口冲突），dev-closeout-1794042637021（更新、还原、实际 Ctrl+C 后 15 PID 退出及端口释放），均通过。
- 沉淀 EXP-002 / EXP-003 / KNOW-002，规范审查无需修改 AGENTS 或 rules；README 改造仍留发版。
- 用户确认本机桌面入口正常；此后未进入电脑操作模式。保留用户窗口，不额外执行手动开关循环。
- 串行收尾由现有各角色材料补足视角，未创建子线程或虚构 reviewer 产物。
- Git 保留 tech/spec-20261107-1429-dev-shell，仅本地提交；无远端，不推送 / PR，不合并 / 删除分支。后续 SPEC-007、SPEC-003 只解除依赖，不自动开始实现。

- AWR 完工终检：checkpoint 01M6TMYKYH908MV6F327WVJ0BJ；work complete 成功，spec-ender 同一会话 ended；project revision 93，doctor 0 findings。两项验收绑定 locally_verified 机器证据；[原始完工回执](../ender/artifacts/awr-complete.json)。
- intake inspect 的 SPEC-001 阻断缺口为 0；全项目仍有 8 条 SPEC-002/004/006 未完成前置等待，符合六项分期规划，不是当前 Spec 缺陷，不篡改依赖来清空全项目。SPEC-003/007 可进入下轮开工门禁；[范围化审计](../ender/artifacts/awr-closeout.json)。

## 本地 dev 合并（2026-11-07，当前集成状态）

- 用户追加授权“本地可以合并到dev”，D-010 通过；前述未合并状态为历史。
- tech/spec-20261107-1429-dev-shell（bac6918）无冲突合入 dev；保留源分支，不推送。
- 在实际合并结果 1d3735f9034c476a01a723393c49f637ca72b405 上运行 npm run test:e2e：typecheck / build、52 单元、8 桌面组全部通过，退出 0。证据 [merge-verification.json](../tester/artifacts/test-logs/2026-11-07T09-27-49-300Z-610fff/merge-verification.json)。
- 仅将验证记录和证据并入本地合并提交，不改应用代码；当前检出 dev。Spec 保持 archived / completed，未重启 AWR 角色会话。
