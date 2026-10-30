# v1.0 收口清单与下一步

> 最后更新：2026-10-30
> 范围依据：[ADR 007](../decisions/007-v1-scope-convergence.md)、[roadmap](roadmap.md)、[交接记录](../workflow/handoff.md)。
> 本文只记录“还没完成什么、接下来做什么”。

## 0. 已定范围（2026-10-30）

- **画廊收敛为单排货架**：长廊 / Bay 生长 / 跨 Bay 移动移出 v1.0，转入 v1.1+ backlog。
- **删除收藏需求**：不做入口、金边、列表 ★；现有 favorites 代码作为死代码清理。
- **降级不做 v1.0 门禁**：列表视图、无 WebGL 降级、低帧率自动降级都不要求；只保留基础键盘与 ARIA。
- **进度与参数展示迁入 CD 详情新 UI**：不恢复旧播放栏，在详情场景里加轻量信息条。
- **原 MVP 与长廊规格标记取消**：保留历史，不再作为验收基线。

## 1. 当前基线

- 主链路已通：托管曲库导入/管理 → 3D CD 货架 → CD 盒详情（开盖/取盘）→ 唱片机（吸附/起转/落针播放）→ 返回展厅。
- 搜索、排序、设置（材质/四档光效/播放模式/音量）、音量环、两档播放模式已接入。
- 2026-10-30：`pnpm typecheck` 四个 workspace 项目通过；用户在真实桌面启动并跑过主流程，确认正常。
- 2026-10-29 23:55 有 `dist` / `dist-electron` 构建产物，晚于最后一次源码改动。
- **未验证**：最新提交后的 `pnpm test` / `pnpm build` 未在受限会话复跑；Windows 安装包从未实际构建。

## 2. P0：交付前必须完成

### P0-1 门禁复跑

- [x] 在非 DSH 沙箱环境跑 `pnpm typecheck` / `pnpm test` / `pnpm build`。
- 结果：三条命令退出码 0；`typecheck` 4 个 workspace 项目；`test` 19 个文件 / 139 个用例（desktop 122 + shared 11 + harness 6）；`build` 产出 `dist` 与 `dist-electron`。
- 备注：Vite 仍提示 `gallery-stage` chunk 907.93 kB（gzip 247.56 kB），不阻塞构建。

### P0-2 Windows portable 打包

- [x] `pnpm --filter @arlhifi/desktop dist`（配置见 `apps/desktop/electron-builder.yml`）。
- 结果：`apps/desktop/release/ArltHiFiPlayer-0.1.0-portable.exe`，98,423,903 B；未签名。
- 构建修正：`electron` 移到 `devDependencies`，新增 `electron-builder@26.18.0` 与 `author`。

### P0-3 安装包冒烟

- [x] **启动与主界面**：portable 包从 `LOCALAPPDATA` 启动，加载 `arlt-hifi-app://bundle/index.html`；canvas、preload、封面与 5 张专辑正常，截图见 `.verify/shots/package-smoke.png`。
- [ ] **完整交互**：导入文件夹 → 播放 → 开盒 → 拖盘上机 → 落针 → 播完即停 → 返回 → 重启恢复设置，仍待真机手测。
- 备注：装包版读取的是现有 `%APPDATA%\Arlt HiFi Player` 曲库，说明 manifest 与媒体协议在打包后可用。

### P0-4 文档与提交

- [x] README / roadmap / handoff / 唱片机文档同步。
- [x] 决策落成 ADR 007，MVP 与长廊规格标记取消。
- [x] 本轮决策文档提交并推送。
- [x] P0 结果、打包配置与阻塞项提交并推送。

## 3. P1：v1.0 剩余产品工作

### 3.1 CD 详情信息条（下一步实现）

**目标**：把播放进度和 HiFi 参数搬到详情场景，不恢复旧播放栏。

- **位置**：详情场景底部、`gallery-caption` 之上；避开左上返回按钮与右下音量环。桌面两档 1024×680 / 1440×900 都不遮挡 CD 盒与唱片机。
- **内容**：
  - 当前曲目标题 / 艺术家；
  - 进度条 + `当前时间 / 总时长`；
  - 格式 / 采样率 / 位深 / 质量（如 `FLAC · 44.1 kHz · 16 bit`），读不到显示 `—`；
  - 不展示 mock 值，不新增输出设备/独占模式等未接入信息。
- **交互**：
  - 点击进度条 seek；拖动 seek；键盘 ←/→ ±5s；
  - `role="slider"` + `aria-valuemin/max/now/valuetext`；
  - 只有控件接收指针事件，信息条其余区域不拦截 3D 拖拽；
  - 无当前曲目时隐藏。
- **数据**：
  - 读 `currentTrack`、`positionSeconds`、`durationSeconds`；
  - 新增 `seekTo(seconds)` 到 store，并在 `useAudioPlayback` 里同步到 `HTMLAudioElement.currentTime`；
  - 复用 `@arlhifi/shared` 的 `formatDuration` / `formatSampleRate` / `formatBitDepth` / `getQualityLabel`。
- **验收**：
  - 播放时进度持续更新；暂停/播放中 seek 都生效；
  - 参数与当前曲目真实标签一致；无标签时显示 `—`；
  - 1024×680 与 1440×900 不遮挡、不溢出；
  - 信息条出现后 CD/唱臂拖拽不受影响。

### 3.2 清理收藏死代码

- [ ] 删除 `favorites`：shared 类型、`AppSettings` / `PlayerSnapshot`、player-store 的 state/action、settings-store 的读写、use-settings-sync、demo 数据、相关单测。
- 验收：仓库内不再有 `favorites` / `toggleFavorite` 引用；旧 `settings.json` 里的 `favorites` 字段被忽略；typecheck/test 通过。
- 备注：这是“删除需求”的代码落地，不保留兼容层。

### 3.3 基础键盘与 ARIA（可选）

- [ ] 搜索框、设置、返回已有基础 ARIA；补 Tab 焦点顺序与 Esc 行为。
- 不做列表视图、无 WebGL 降级、低帧率自动降级。
- 验收：不碰鼠标可完成“浏览 → 打开 CD → 播放/暂停 → 返回”；不要求降级视图。

### 3.4 曲库日常运维（可排 v1.1）

- [ ] 切回窗口刷新曲库：该逻辑在“管理歌曲改为叠加弹窗”时被移除，确认是否恢复。
- [ ] 文件夹监听 / 手动刷新。
- [ ] 导入取消 / 断点续传。
- [ ] 重命名写回标签（需要 tag writer，单独评估）。

## 4. P2：工程与打磨

- [ ] 拆 `gallery-stage.tsx`（743 行）与 `case-detail.tsx`（746 行）。
- [ ] 组件级测试：目前只有纯函数、store、Electron 单测。
- [ ] 帧率与显存收口：1280×820 ≥ 45fps、纹理 LRU、静止零渲染。
- [ ] 构建冒烟进 CI（当前 GitHub Actions 已删除）。
- [ ] 唱片机 GLB 6.18 MB：首次进入加载时间与缓存策略。
- [ ] 静音按钮（可选，与音量环/设置重复，不列为必须）。

## 5. 建议顺序

1. **P0-1 门禁复跑 → P0-2 打包 → P0-3 装包冒烟**：先证明“可交付”。
2. **实现 3.1 CD 详情信息条**：这是 v1.0 唯一剩下的产品功能。
3. **清理 3.2 收藏死代码**：与 3.1 分开提交，便于回滚。
4. **可选 3.3 键盘 / 3.4 曲库运维 / P2**：不阻塞交付。

## 6. 明确不做（v1.0）

- 长廊 / Bay 生长、跨 Bay 移动。
- 收藏、金边外观、收藏列表。
- 列表视图、无 WebGL 降级、低帧率自动降级。
- 队列页、悬浮播放台、三档播放模式、旧播放栏。
- Rust audio-core、自动更新、崩溃上报、账号/云同步、装饰性舞台。
