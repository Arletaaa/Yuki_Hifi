# Arlt HiFi Player

Arlt HiFi Player 是一款面向本地 HiFi 音乐播放体验的 Electron 桌面音乐播放器。核心体验围绕本地音乐库扫描、播放队列、真实音频播放 MVP 和 HiFi 播放链路信息展开。

主播放器页面不保留右侧舞台、角色舞台或动态视觉舞台。未来可以评估轻量视觉反馈、专辑视觉或桌面伴随模式，但它们不属于当前 UI 骨架要求。

## 产品方向

- 本地 HiFi 音乐播放：面向本地音乐库、播放队列、采样率、位深、输出设备等信息展示。
- 本地音乐库：支持选择文件夹并扫描 `flac`、`wav`、`mp3`、`m4a`、`ogg` 文件。
- 播放 MVP：使用 `HTMLAudioElement` 播放扫描到的本地音频文件，并同步播放、暂停、切歌、进度和错误状态。
- 安全边界：React 通过 preload API 与 Electron 主进程通信，不直接访问 Node/Electron；本地音频通过受控媒体协议播放。
- 轻量视觉反馈：后续可以在播放栏、封面区域或可关闭的桌面伴随模式中加入状态反馈，但不得改变主播放器页面结构。
- AI-assisted engineering：用清晰的文档、任务模板、评测计划和包边界支撑持续迭代。

## 技术栈

- pnpm workspace
- Electron
- React
- TypeScript strict mode
- Vite
- Zustand
- Tailwind CSS
- Vitest
- Playwright 后续接入

## 本地开发

```bash
pnpm install
pnpm dev
```

当前 `pnpm dev` 会启动 Vite 前端开发服务，并直接打开 Electron 桌面窗口。只调试前端页面时可以使用：

```bash
pnpm dev:web
```

## 质量检查

```bash
pnpm typecheck
pnpm test
npm run build
```

## 工作区结构

- `apps/desktop`：Electron + React 桌面应用
- `packages/shared`：共享类型、mock 数据与工具函数
- `packages/ui`：基础 UI 组件
- `packages/agent-harness`：Codex 任务模板和工程约束
- `docs/product`：产品愿景、MVP 与路线图
- `docs/decisions`：架构决策记录
- `docs/prompts`：可复用提示词
- `docs/evals`：评测设计
- `fixtures/audio`：音频测试样本占位说明
- `fixtures/themes`：主题测试包占位说明
- `fixtures/visuals`：后续可选视觉资源占位说明

## 当前阶段约束

- TypeScript 使用 strict mode。
- 不使用 `any`，除非用注释解释原因。
- 当前播放 MVP 使用 `HTMLAudioElement`，不接入 Rust audio-core。
- 当前不实现右侧舞台、角色舞台、动态视觉舞台、Live2D、MV 播放或视频背景。
- 后续 Rust audio-core 会作为独立模块评估接入。

## Agent Constraints

This repository now includes a project-level [AGENTS.md](AGENTS.md) that merges the existing HiFi player engineering constraints with the `andrej-karpathy-skills` style rules:

- think before coding
- simplicity first
- surgical changes
- goal-driven execution

Use that file as the default constraint layer for AI-assisted implementation, bug fixing, and review tasks.
