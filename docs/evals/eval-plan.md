# Eval Plan

## 目标

评测 Arlt HiFi Player 在 AI-assisted engineering 下的代码质量、文档一致性和基础体验稳定性。

## 当前阶段评测项

- 工程骨架：workspace、脚本、包边界是否完整。
- 类型安全：`pnpm typecheck` 是否通过，是否存在未解释的 `any`。
- 单元测试：`pnpm test` 是否通过。
- 构建稳定性：`npm run build` 是否通过。
- Electron 安全边界：目录选择、扫描和本地音频播放是否通过主进程与 preload API 暴露，React 是否避免直接访问 Node/Electron。
- UI 骨架：首页是否包含标题、导航、音乐库列表或空状态、底部播放栏、HiFi 信息面板。
- 播放 MVP：点击扫描到的曲目后是否能载入播放器，播放/暂停/切歌/进度/错误状态是否同步。
- 页面约束：主播放器页面不得包含右侧舞台、角色舞台或动态视觉舞台。
- 文档完整性：README、MVP、Vision、Roadmap、ADR、Prompts、PR checklist 是否与当前产品方向一致。

## 后续评测项

- Playwright 启动与截图回归。
- 音乐库扫描与排序回归。
- 真实元数据解析回归。
- audio-core 边界契约测试。
- 主题包兼容性测试。
- 播放链路信息一致性测试。
