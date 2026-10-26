# 交接状态（2026-10-27 收口）

## 这一阶段的成果

| 领域 | 状态 |
| --- | --- |
| 主界面 | 3D 画廊为唯一视图；旧 rail / player-bar / 列表页 / 队列页已不再挂载（文件仍在仓库，待第 5 刀删除） |
| 顶栏 | 搜索框（近似匹配，输入即过滤） |
| 设置 | 全透明浮层（Portal 到 body，z-index 9999）；材质球两组一行、绿环只包球体、音量行、版权置底 |
| 场景预设 | `scenePreset { table, base, wall, silhouette, light }` 已写入 `settings.json`，台面 / 台底 / 墙面**实时驱动**；`silhouette` / `light` 目前只存不用（见技术债） |
| 持久化 | Electron 走 `settings.json`；网页预览走 `localStorage["arlt-hifi-settings"]` |
| 素材 | 16 套 2K 材质压缩为 48 个文件（10.8MB），按 `table/ base/ wall/ leaf/` 分类；`CREDITS.md` 已登记（CC0 + CC-BY） |
| CD 模型 | 合盖版 GLB 接入，封面按内页包围盒精确贴合；详情场景可开盖、盘片可拖出并限位 |
| 光效 | 丁达尔光束（6 片叠加软光条，漂移 + 呼吸）与流动光斑（150 个模糊圆斑，缓慢平移） |
| 阴影 | **已修复**：墙面接收阴影、主光角度、台面投影、接触阴影（详见下节） |
| 门禁 | `pnpm typecheck` / `pnpm test`（72 + 13 + 6）/ `pnpm build` 全绿 |

## 阴影修复记录（本轮主要工作）

### 根因（三个问题叠加，缺一不可）

1. **墙面不接收阴影**：`Shelf` 与 `BackWall` 的墙 mesh 都没有 `receiveShadow`，CD 的影子只能落在台面上。
2. **主光俯角过大**：原主光 `(3.6, 4.4, 2.4)` 的 `Ly / Lz = 1.83`，0.3m 远的墙面投影要下坠 0.55m；CD 高 1.04–1.56，影子整块落到 `y < 1.04`，正好被台面和 CD 自己挡住。看起来就像"阴影完全没生成"。
3. **台面不投影 + 环境光过亮**：台面只有 `receiveShadow`，所以台面前缘压到柜体的接触阴影根本不存在；`ambient 0.35 + hemisphere 0.2 + environmentIntensity 0.9` 又把本就微弱的投影洗平。

排查手段：`?demo=1&perf=1` + CDP 检查 `gl.shadowMap.enabled`（=true，PCFSoft）、`render.calls`、接收/投射 mesh 数量；再在运行时改光源位置逐组对比截图。`shadowMap` 一直是开着的，问题从头到尾都是"影子落在看不见的地方"。

### 改动

- `gallery-stage.tsx`
  - 墙（`Shelf` + `BackWall`）加 `receiveShadow`，台面（`DeskSurface`）加 `castShadow`。
  - 主光改为 `(2.8, 3.6, 3.4)`、强度 `2.4`、`mapSize 2048`、`bias -0.0003`、`normalBias 0.018`；`Ly / Lz = 1.06`，影子在墙裙上方留出约 0.17m 可见段。
  - `ambient 0.12`、`hemisphere 0.12`、`environmentIntensity 0.4`，保留 `(-3, 2, 2)` 冷色补光 0.35。
- `contact-shadows.tsx`（新增）
  - 径向渐变的黑色贴图当 `map`（不要用 `alphaMap`：three 的 alphaMap 取绿通道，canvas 透明渐变会退化成常量），每个 `Disc` 一片 0.68 × 0.3 的贴地平面，贴在台面上方 1.5mm，`opacity 0.62`、`depthWrite: false`。
- `case-model.ts`：只更新了关于投影开销的注释（126 个 mesh 的深度 pass 可接受）。

### 验证

- 对比图：[`shadow-before.jpg`](shadow-before.jpg)（修复前：墙面完全没有投影，台面下也是死平）→ [`shadow-after.jpg`](shadow-after.jpg)（墙裙软投影 + 台面/柜体接触阴影 + CD 底部贴地）。
- 画廊：64 calls / 8048 tri（SwiftShader 软渲染下 3–4fps，Electron GPU 下无压力）。
- 目视确认：CD 左后方墙面出现软投影；台面前缘到柜体的过渡区有接触阴影；CD 底部不再"贴纸感"；详情场景（`?detail=1`）盒子在墙上有投影。
- 软阴影靠 `PCFSoftShadowMap` + 2048 map 得到；`shadow.radius` 在 PCFSoft 下无效，想更软就降 `mapSize`。

## 未解决 / 待决策

### 1. 墙面纹理"格子感"（需要拍板）

`fabric009` 是白十字印花布料，`repeat (26, 2.2)` 下十字约 0.26m 一颗，屏幕上很抢眼；参考图是纯净墙面。可选方向：

- **A. 纯色墙（推荐试）**：颜色仍用 `#5d2b2b` 一类暖色，只保留 `normalMap`/`roughnessMap`，去掉 color map → 无格纹、仍保留布料起伏。要动 `WallSurface` 的贴图加载分支。
- **B. 换 `leather012`**：实测那张贴图是近纯米色（近乎无图案），最接近参考图的干净墙，但会把整个场景从暖红压成暖白。
- **C. 新增 `plain` 预设**：动 `defaultScenePreset` + `WALL_SWATCHES` + `mergeSettings` 校验，设置面板墙面组会变成 5 个球。

本轮没有擅自改默认值——这是观感取向问题。

### 2. 技术债

- `gallery-stage.tsx` 已 800+ 行，混了相机、货架、CD、详情、光效、设置入口，建议拆 `scene/shelf.tsx`、`scene/carousel.tsx`、`scene/stage.tsx`。
- 设置面板「剪影」「光效」两组材质球**没有任何代码消费**（`scenePreset.silhouette` / `.light` 只写入 `settings.json`）；要么接回场景，要么删掉这两组（连同 4 套 leaf 贴图）。
- 详情场景的盘片自转仍缺（转动整个 `CD_1` 会让盘片侧翻，需要单独转 `Object_13` 的局部法线轴）。
- 网页预览的 `localStorage` 与 Electron 的 `settings.json` 是两套存储，字段变更时要同步 `mergeSettings`。
- `?merge=1` 的网格合并路径保留但默认关闭，未验证收益。
- `apps/desktop/electron/settings-store.test.ts` 里 `scenePreset` 的过期断言本轮已补（上个阶段加字段时漏改）。

### 3. 未开始的刀

| 刀 | 内容 |
| --- | --- |
| 3 | 音乐导入与托管：`library:select-files` / `library:import-files` / `library:import-folder`，复制到 `userData/library/<artist>/<album>/<title>.<ext>`，去重 `(大小, 时长, 前 256KB SHA-1)` |
| 4 | 管理音乐（排序 / 重命名 / 设封面 / 删除）、搜索飞行到 CD、播放界面音量环 |
| 5 | 删除废弃组件与样式（`app-rail`、`player-bar`、`library-page`、`queue-page` 等）、更新文档、跑门禁 |

## 验收命令

```powershell
pnpm typecheck          # 三个 tsconfig 全绿
pnpm test               # desktop 72 + shared 13 + harness 6
pnpm build              # dist + dist-electron
pnpm dev:web            # http://localhost:5173/?demo=1&perf=1
```

本机环境提示（DSH 沙箱下）：

- `pnpm typecheck/test/build`、`vite`、Chrome 都需要 `danger-full-access`，否则子进程 `spawn EPERM`。
- 编辑器的原子保存会在源码目录生成 `.xxx.tmpdir` 临时目录，Vite 的 `fs.watch` 会 `EBUSY` 崩溃；用 `$env:CHOKIDAR_USEPOLLING='1'` 启动。
- `pnpm build` 需要把 `$env:TEMP` / `$env:TMP` 指到工作区内，否则 esbuild 删除系统临时文件被沙箱拒绝。
- 截图脚本可临时放 `.tmp-browser/cdp.mjs`（CDP 直连 9222），用完删掉，不要提交。
