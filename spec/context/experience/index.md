# 经验记忆索引 (Experience Index)
记录开发中沉淀的重大「困境-策略对」经验。每次开始复杂任务前，由 \exp-search\ 先读本表，命中后再按需加载对应详情文件。

| ID | 标题 | 关键词 | 适用场景 | 一句话策略 | 详情文件 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| EXP-001 | 占位示例 | 经验, 样例 | 项目初始化 | 遇到复杂技术陷阱时通过 exp-reflect 沉淀到此处 | - |
| EXP-002 | Electron启动失败与项目完整性标签 | Electron, Low, DSH, 窗口站 | 业务加载前崩溃 | 用令牌与 API 证据定位，仅修复授权目录标签 | [详情](exp-002-Electron启动失败与项目完整性标签.md) |
| EXP-003 | 桌面入口路径视图与退出码 | MSIX, Explorer, ExitCode | 桌面双击无响应或退出误报 | 在真实 Explorer 路径完成启动、关闭、重开验证 | [详情](exp-003-桌面入口路径视图与退出码.md) |
| EXP-004 | Electron关闭中间态不能只检查销毁状态 | Electron, close, isDestroyed, ERR_FAILED | 加载期间关窗 | 跟踪关闭请求并覆盖未销毁中间态 | [详情](exp-004-Electron关闭中间态不能只检查销毁状态.md) |
| EXP-005 | NSIS安装目录检查应先于卸载旧版 | NSIS, electron-builder, 目录预检, 错误提示 | 安装目录预检 | 最终目录实际写入探针先于标准卸载流程 | [详情](exp-005-NSIS安装目录检查应先于卸载旧版.md) |
