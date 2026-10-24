# Arlt HiFi Player

Arlt HiFi Player 是一款面向本地 HiFi 音乐播放体验的 Electron 桌面音乐播放器。核心体验围绕本地音乐库扫描、收藏、空间化曲库、播放队列、真实音频播放 MVP 和 HiFi 播放链路信息展开。

曲库被空间化为一个会随收藏长大的房间：收藏的曲目以 CD 陈列，点击后飞入播放台。场景是"曲库本身"，不是装饰舞台——判定与边界见 [ADR 005](docs/decisions/005-scene-gallery.md)。

## 产品方向

- 本地 HiFi 音乐播放：面向本地音乐库、收藏、播放队列、采样率、位深、输出设备等信息展示。
- 本地音乐库：支持选择文件夹并扫描 `flac`、`wav`、`mp3`、`m4a`、`ogg` 文件。
- 空间化曲库（S2R 规划）：实时渲染的收藏展厅，房间随收藏数量分档演进；点击 CD 转场进入悬浮 CD 播放台。见 [场景展厅规格](docs/product/scene-gallery.md)。
- 播放 MVP：使用 `HTMLAudioElement` 播放扫描到的本地音频文件，并同步播放、暂停、切歌、进度和错误状态。
- 安全边界：React 通过 preload API 与 Electron 主进程通信，不直接访问 Node/Electron；本地音频与封面通过受控媒体协议读取。
- 轻量视觉反馈：播放状态、主题氛围与封面视觉可增强体验，但必须可关闭、不遮挡核心操作。
- AI-assisted engineering：用清晰的文档、任务模板、评测计划和包边界支撑持续迭代。

## 技术栈

- pnpm workspace
- Electron
- React
- TypeScript strict mode
- Vite
- Zustand
- three.js + @react-three/fiber（S2R 场景层，待接入）
- Tailwind CSS（preflight 与少量工具类）
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

- `apps/desktop`：Electron + React 桌面应用（渲染层、`src/scene/` 场景层、主进程）
- `packages/shared`：共享类型、工具函数与格式化
- `packages/ui`：基础 UI 组件与设计 token
- `packages/agent-harness`：任务模板和工程约束
- `docs/product`：产品愿景、MVP、场景规格与路线图
- `docs/decisions`：架构决策记录（ADR）
- `docs/workflow`：交付工作流与阶段门禁
- `docs/prompts`：可复用提示词
- `docs/evals`：评测设计
- `fixtures/audio`：音频测试样本占位说明
- `fixtures/themes`：主题测试包占位说明
- `fixtures/visuals`：视觉资源占位说明

## 当前阶段约束

- TypeScript 使用 strict mode。
- 不使用 `any`，除非用注释解释原因。
- 当前播放 MVP 使用 `HTMLAudioElement`，不接入 Rust audio-core。
- 3D 场景是"曲库本身"：每个 3D 元素都必须对应真实收藏或真实播放状态。
- 不做装饰性右侧舞台、角色立绘、Live2D、MV 或视频背景。
- 场景代码只运行在渲染层，封面图片只通过受控媒体协议读取。

## Agent Constraints

This repository now includes a project-level [AGENTS.md](AGENTS.md) that merges the existing HiFi player engineering constraints with the `andrej-karpathy-skills` style rules:

- think before coding
- simplicity first
- surgical changes
- goal-driven execution

Use that file as the default constraint layer for AI-assisted implementation, bug fixing, and review tasks.
