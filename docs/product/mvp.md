# Arlt HiFi Player MVP

## 目标

当前 MVP 目标是形成一个最小可用的本地 HiFi 桌面播放器闭环：用户可以选择本地音乐文件夹、扫描音频文件、查看音乐库列表，并通过底部播放栏完成基础播放控制。

## 范围内

- Electron + React 桌面应用骨架。
- 首页布局：左侧导航、中央音乐库、底部播放栏、HiFi 信息面板。
- 通过 preload API 暴露安全的目录选择与扫描能力。
- 递归扫描本地音频文件：`flac`、`wav`、`mp3`、`m4a`、`ogg`。
- 音乐库列表展示标题、艺术家、专辑、时长和音质信息。
- Zustand 管理 `library`、`queue`、`currentTrack`、`status`、`positionSeconds`、`volume`。
- 使用 `HTMLAudioElement` 建立真实音频播放 MVP。
- 播放、暂停、上一首、下一首、进度、时长和播放错误状态同步。
- TypeScript strict mode。
- 基础单元测试。
- 产品文档、架构决策、提示词和评测计划。

## 范围外

- Rust audio-core。
- 精确音频元数据解析与封面提取。
- 系统输出设备枚举、独占模式和真实音频链路控制。
- Playwright 自动化。
- 右侧舞台、角色舞台或动态视觉舞台。
- Live2D、看板娘行为系统、口型同步或聊天气泡歌词。
- MV 播放、视频解码或动态背景渲染。

## 验收标准

- `pnpm install` 可以安装依赖。
- `pnpm dev` 可以启动 Electron 桌面窗口。
- 可以选择音乐文件夹并扫描支持的音频文件。
- 扫描到曲目时显示音乐库列表；没有曲目时显示空状态。
- 点击曲目后底部播放栏载入曲目并尝试播放。
- `pnpm typecheck` 通过。
- `pnpm test` 通过。
- `npm run build` 通过。
