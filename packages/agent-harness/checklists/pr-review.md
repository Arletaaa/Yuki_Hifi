# PR Review Checklist

## 正确性

- 变更是否满足对应 issue 或任务描述。
- 是否保持本地音乐库、播放队列和播放栏状态一致。
- 播放、暂停、切歌、进度和错误状态是否反映真实音频状态或明确的 mock fallback。
- 是否避免在当前阶段引入 Rust audio-core、Live2D、视频播放或独立视觉舞台。

## TypeScript

- 是否保持 strict mode 通过。
- 是否避免 `any`；如必须使用，是否有就近注释解释。
- 公共类型是否放在 `packages/shared`。

## Electron 安全边界

- React 是否避免直接访问 Node/Electron。
- 文件系统能力是否通过主进程和 preload API 暴露。
- 本地音频播放是否避免直接暴露任意 `file://` 路径给 renderer。

## UI

- 首页布局是否保留左侧导航、中央音乐库、底部播放栏与 HiFi 信息面板。
- 主播放器页面是否没有右侧舞台、角色舞台或动态视觉舞台。
- 组件是否优先复用 `packages/ui`。
- 文案是否适合桌面音乐播放器，不写成营销落地页。
- 文本是否不会溢出、重叠或遮挡核心操作。

## 测试与文档

- 是否补充或更新 Vitest 单元测试。
- 是否更新 README、产品文档、ADR 或提示词模板。
- `pnpm typecheck`、`pnpm test` 与 `npm run build` 是否通过。
