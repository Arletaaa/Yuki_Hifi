# Arlt HiFi Player Roadmap

> 状态与 `docs/workflow/rebuild-workflow.md` 的阶段一一对应。每完成一个阶段，更新这里的勾选。

## 已完成

- [x] **S0 基线**：workspace、Electron + React + Vite 骨架、扫描器、媒体协议、播放 MVP、文档体系。
- [x] **S0 修复**：迁移导致的 `node_modules` 失效重建；基线 typecheck/test/build 全绿；git 版本控制初始化。

## v1.0 进行中

- [ ] **S1 需求与 IA 冻结**：三页信息架构、验收标准表、范围边界（ADR 003/004）。
- [ ] **S2 设计系统与骨架**：「夜空唱片室」tokens、`packages/ui` 基础组件、三页布局。
- [ ] **S3 领域模型**：队列与库解耦、播放模式、纯函数抽取与单测。
- [ ] **S4 播放链路**：seek、静音、自动下一首、错误恢复、播放栏重构。
- [ ] **S5 库与持久化**：搜索、排序、刷新、上次目录与设置恢复。
- [ ] **S6 HiFi 信息诚实化**：移除 mock 信号，三态展示。
- [ ] **S7 生产可用**：构建产物链路、`pnpm start`、electron-builder 免安装包。
- [ ] **S8 收尾**：测试补齐、CI 拉齐、文档与验收清单归档。

## P5 之后（backlog，不在 v1.0）

- Rust audio-core：解码、输出设备、采样率/位深、独占模式。
- 标签解析与封面提取。
- 多目录、播放列表、增量索引、SQLite。
- Playwright / agent-browser 端到端回归与截图基线。
- 自动更新、崩溃上报。

## 约束提醒

- 任何阶段都不得加入右侧舞台、角色舞台、Live2D、MV、动态视觉舞台。
- 播放链路在 audio-core 接入前保持 `HTMLAudioElement`，且不得展示无法解释的信号数值。
