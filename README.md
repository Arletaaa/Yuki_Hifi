# Arlt HiFi Player

Arlt HiFi Player 是一款面向本地 HiFi 音乐播放体验的 Electron 桌面音乐播放器。曲库由软件托管（导入即复制），空间化为一条可滑动的 3D CD 长廊：每张 CD 对应一张专辑，点击进入详情，搜索可直接飞到目标 CD。

## 产品方向

- 托管曲库：导入的 `flac`、`wav`、`mp3`、`m4a`、`ogg` 复制到 `userData/library/<artist>/<album>/<title>.<ext>`，按 `(大小, 时长, 前 256KB SHA-1)` 去重；重命名 / 设封面 / 删除只作用于副本。
- 3D 画廊：唯一主视图，实时渲染的 CD 长廊；点击 CD 打开详情的透明宝石盒，可开盖、拖出盘片并播放。场景是"曲库本身"，不是装饰舞台——判定与边界见 [ADR 005](docs/decisions/005-scene-gallery.md)。
- 搜索与排序：标题 / 艺术家 / 时长 / 导入时间排序；搜索框列出匹配曲目，回车或点击飞到对应 CD 并抽出高亮。
- 播放 MVP：使用 `HTMLAudioElement` 播放托管曲目，同步播放状态、进度和错误；播放界面提供可拖拽 / 滚轮 / 键盘操作的音量环。
- 设置：场景材质预设（台面 / 台底 / 墙面）与三档光效（晨光 / 夜色 / 聚光）、曲库导入与管理、音量。
- 安全边界：React 通过 preload API 与 Electron 主进程通信，不直接访问 Node/Electron；本地音频与封面通过受控媒体协议读取。

## 技术栈

- pnpm workspace
- Electron（主进程与 preload 由 esbuild 打包）
- React
- TypeScript strict mode
- Vite
- Zustand
- three.js + @react-three/fiber（场景层）
- Tailwind CSS（preflight）
- Vitest

## 本地开发

```bash
pnpm install
pnpm dev
```

`pnpm dev` 会启动 Vite 前端开发服务并打开 Electron 桌面窗口。只调试前端页面时：

```bash
pnpm dev:web
```

`pnpm start` 运行生产构建（`pnpm build` 之后），可附带 Electron 参数，例如 `pnpm start -- --remote-debugging-port=9224`。

如果项目目录受 Windows 权限限制（例如 DSH 工作区：Low integrity / deny-delete），Electron 无法直接从工作区启动；`dev` / `start` 会自动把运行时复制到 `%LOCALAPPDATA%\arlt-hifi-dev\electron-<version>` 再启动，首次会多花几秒。

网页预览使用 `?demo=1` 注入示例曲库；导入、曲库管理等主进程能力在该模式下会提示改用桌面应用。

## 质量检查

```bash
pnpm typecheck
pnpm test
pnpm build
```

## 工作区结构

- `apps/desktop`：Electron + React 桌面应用（渲染层、`src/scene/` 场景层、主进程）
- `packages/shared`：共享类型、工具函数与格式化
- `packages/ui`：设计 token 与基础 UI 组件
- `packages/agent-harness`：任务模板和工程约束
- `docs/product`：产品愿景、MVP、场景规格与路线图
- `docs/decisions`：架构决策记录（ADR）
- `docs/workflow`：交付工作流与阶段门禁
- `docs/prompts`：可复用提示词
- `docs/evals`：评测设计
- `fixtures/audio`：音频测试样本占位说明
- `fixtures/visuals`：视觉资源占位说明

## 当前阶段约束

- TypeScript 使用 strict mode。
- 不使用 `any`，除非用注释解释原因。
- 当前播放 MVP 使用 `HTMLAudioElement`，不接入 Rust audio-core。
- 3D 场景是"曲库本身"：每个 3D 元素都必须对应真实曲目或真实播放状态。
- 不做装饰性右侧舞台、角色立绘、Live2D、MV 或视频背景。
- 场景代码只运行在渲染层，封面图片只通过受控媒体协议读取。

## Agent Constraints

This repository now includes a project-level [AGENTS.md](AGENTS.md) that merges the existing HiFi player engineering constraints with the `andrej-karpathy-skills` style rules:

- think before coding
- simplicity first
- surgical changes
- goal-driven execution

Use that file as the default constraint layer for AI-assisted implementation, bug fixing, and review tasks.
