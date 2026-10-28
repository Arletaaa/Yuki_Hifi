# Arlt HiFi Player Roadmap

> 每完成一个阶段更新勾选。

## 已完成

- [x] **S0 基线**：workspace、Electron + React + Vite 骨架、扫描器、媒体协议、播放 MVP、文档体系。
- [x] **S0 修复**：迁移导致的 `node_modules` 失效重建；基线 typecheck/test/build 全绿；git 初始化。
- [x] **S1 需求与 IA**：验收标准表、范围边界（ADR 003/004）。
- [x] **S2 系统层设计系统**：tokens、`packages/ui` 组件、三页骨架、内置夜景壁纸、动效三档、微交互。
  - 说明：视觉方向已被 ADR 005 部分取代——系统层（列表、队列、设置、播放栏）继续沿用，库的主视图改为 3D 展厅。

## 当前计划（按依赖排序）

| 顺序 | 阶段 | 依赖 | 产出 |
| --- | --- | --- | --- |
| 1 | **S2R-0 场景技术 spike** | 无 | three + R3F 接入、单张 CD 可旋转、60 张 CD 的长廊压测、帧率 HUD、WebGL 降级开关 |
| 2 | **S3 领域模型 + 收藏** | S2R-0（仅取类型结论） | 队列与库解耦、`Track` 扩展、`favorites`、`getGalleryAnchor`/`getBayCount` 纯函数 |
| 3 | **S5 扫描 / 元数据 / 封面 / 持久化** | S3 | `music-metadata`、封面缓存、搜索排序、设置与收藏持久化 |
| 4 | **S6 HiFi 信息诚实化** | S5 | 真实采样率/位深 + 链路"未接入"三态 |
| 5 | **S4 播放链路** | S3 | seek、静音、模式语义、错误恢复 |
| 6 | **S2R-1 长廊与生长** | S3 + S5 | Bay 空间模型、生长/消退动画、写实材质、实例化与虚拟化 |
| 7 | **S2R-2 长廊交互** | S2R-1 | 拖拽/滚轮/双击、跨 Bay 两段式移动、搜索飞行、收藏外观 |
| 8 | **S2R-3 转场与播放台** | S2R-2 + S4 | 750ms 转场、悬浮倾斜 CD、播放转动 |
| 9 | **S2R-4 降级与可达性** | S2R-3 | 列表视图回归、ARIA、低帧率降级、`motion=off` |
| 10 | **S2R-5 打磨** | S2R-4 | 景深/接触阴影/生长时序/性能收口 |
| 11 | **S7 生产可用** | 全部 | `dist-electron`、`pnpm start`、electron-builder portable |
| 12 | **S8 收尾** | S7 | 测试补齐、CI、构建冒烟、文档与验收清单归档 |

> S2R-0 可以立刻做：它不依赖数据改造，用假数据验证技术路线与美术方向；若不达标可及时改走 CSS 3D 或静态方案。

## 阶段勾选

- [x] S2R-0 场景技术 spike（60 张 56fps / 240 张 42fps；three 全量落在 220.9 kB gzip 懒加载 chunk）
- [x] S2R-1a 性能与虚拟化（架子全局实例化 + CD 按 Bay 虚拟化：240/500 张均为 13 draw calls、挂载 3 段）
- [x] S3 领域模型 + 收藏（store 拆 library/queue/playback 切片；`Track` 增加 `coverPath`/`metadataSource`；收藏与队列解耦；53 个用例）
- [x] S5 扫描 / 元数据 / 封面 / 持久化（music-metadata + 封面缓存 + settings.json + 搜索排序；70 个桌面用例）
- [x] S6 HiFi 信息诚实化（mock 信号已删除；chip 显示真实格式/采样率/位深/质量）
- [x] S4 播放链路（seek 滑块、静音、播完语义、上一首 3 秒规则）
- [~] S2R-1 长廊与生长（1a 虚拟化完成；1b 封面与点击完成；生长/hover/搜索飞行未做）
- [ ] S2R-2 长廊交互
- [ ] S2R-3 转场与播放台
- [ ] S2R-4 降级与可达性
- [ ] S2R-5 打磨
- [~] S7 生产可用（相对路径构建 + dist-electron 产物 + pnpm start + electron-builder 配置；安装包未实际构建）
- [ ] S8 收尾

## v1.1（已确认优先级，见 backlog）

- 静态 LRC 歌词 → 自建播放列表 → 多目录 → 迷你播放器小窗。

## backlog（不在 v1.0）

- Rust audio-core、增量索引、SQLite、主题包、自动更新、崩溃上报、Playwright E2E。
- 场景增强：CD 物理堆叠与拖拽归位、音频电平驱动灯光、多房间主题、无障碍 overlay 投影网格。

## 约束提醒

- 不做装饰性舞台、角色立绘、Live2D、MV/视频背景。
- 3D 元素必须对应真实收藏或真实播放状态（ADR 005 判定标准）。
- 播放链路在 audio-core 接入前保持 `HTMLAudioElement`，且不得展示无法解释的信号数值。
