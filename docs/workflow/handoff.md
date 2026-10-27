# 交接状态（2026-10-27 收口 · 第二轮）

## 这一阶段的成果

| 领域 | 状态 |
| --- | --- |
| 主界面 | 3D 画廊为唯一视图；旧 rail / player-bar / 列表页 / 队列页已不再挂载（文件仍在仓库，待第 5 刀删除） |
| 顶栏 | 搜索框（近似匹配，输入即过滤） |
| 设置 | 全透明浮层（Portal 到 body，z-index 9999）；**音乐库导入区** + 材质球两组一行、绿环只包球体、音量行、版权置底 |
| 曲库 | **软件托管**：导入即复制到 `userData/library/<artist>/<album>/<title>.<ext>`，`userData/library.json` 是唯一真源；三元组去重、封面进 `userData/covers` |
| 场景预设 | `scenePreset { table, base, wall, silhouette, light }` 已写入 `settings.json`，台面 / 台底 / 墙面**实时驱动**；`silhouette` / `light` 目前只存不用（见技术债） |
| 持久化 | Electron 走 `settings.json`；网页预览走 `localStorage["arlt-hifi-settings"]` |
| 素材 | 16 套 2K 材质压缩为 48 个文件（10.8MB），按 `table/ base/ wall/ leaf/` 分类；`CREDITS.md` 已登记（CC0 + CC-BY） |
| CD 模型 | 合盖版 GLB 接入，封面按内页包围盒精确贴合；详情场景可开盖、盘片可拖出并限位 |
| 光效 | 丁达尔光束（6 片叠加软光条，漂移 + 呼吸）与流动光斑（150 个模糊圆斑，缓慢平移） |
| 阴影 | 已修复：墙面接收阴影、主光角度、台面投影、接触阴影（见下文记录） |
| 构建 | **Electron 主进程/preload 改 esbuild 打包**，修掉"应用一启动就崩"（之前 tsc 产物直接 import TS 源码） |
| 门禁 | `pnpm typecheck` / `pnpm test`（91 + 11 + 6）/ `pnpm build` 全绿 |

## 阴影修复记录（第一轮）

### 根因（三个问题叠加，缺一不可）

1. **墙面不接收阴影**：`Shelf` 与 `BackWall` 的墙 mesh 都没有 `receiveShadow`，CD 的影子只能落在台面上。
2. **主光俯角过大**：原主光 `(3.6, 4.4, 2.4)` 的 `Ly / Lz = 1.83`，0.3m 远的墙面投影要下坠 0.55m；CD 高 1.04–1.56，影子整块落到 `y < 1.04`，正好被台面和 CD 自己挡住。看起来就像"阴影完全没生成"。
3. **台面不投影 + 环境光过亮**：台面只有 `receiveShadow`，所以台面前缘压到柜体的接触阴影根本不存在；`ambient 0.35 + hemisphere 0.2 + environmentIntensity 0.9` 又把本就微弱的投影洗平。

### 改动

- `gallery-stage.tsx`：墙加 `receiveShadow`、台面加 `castShadow`；主光改 `(2.8, 3.6, 3.4)`、强度 2.4、`mapSize 2048`、`bias -0.0003`、`normalBias 0.018`；`ambient 0.12` / `hemisphere 0.12` / `environmentIntensity 0.4`。
- `contact-shadows.tsx`（新增）：径向渐变黑色贴图当 `map`（不要用 `alphaMap`——three 的 alphaMap 取绿通道，canvas 透明渐变会退化成常量），每个 `Disc` 一片 0.68 × 0.3 的贴地平面，台面上方 1.5mm，`opacity 0.62`、`depthWrite: false`。

### 验证

- 对比图：[`shadow-before.jpg`](shadow-before.jpg) → [`shadow-after.jpg`](shadow-after.jpg)。
- 目视：CD 左后方墙面软投影、台面/柜体接触阴影、CD 底部贴地；画廊 64 calls / 8048 tri。

## 音乐导入与托管（本轮，刀 3）

![设置浮层中的音乐库导入区](library-import.jpg)

### 数据模型

- 托管目录：`userData/library/<artist>/<album>/<title>.<ext>`（只复制受支持格式：flac/wav/mp3/m4a/ogg，原文件不动）。
- 曲库清单：`userData/library.json`，`{ version: 1, entries: [{ track, size, headSha1, importedAt }] }`。**manifest 是唯一真源**，启动时读它，并顺手剔除已被手工删掉的文件。
- 去重三元组：`(文件大小, 时长, 前 256KB SHA-1)`；先比大小+时长，命中候选才读头部算哈希，避免几百 MB 母带整份哈希。
- 命名清洗：Windows 非法字符 `<>:"/\|?*` 与控制字符 → `_`，去掉尾部点/空格，单段 ≤ 80 字符；同名不覆盖，自动 ` (2)`、` (3)`。
- 封面沿用 `userData/covers/`，按托管后的路径哈希命名（同一首重复导入不会产生新封面文件）。

### IPC / 渲染进程

| 通道 | 行为 |
| --- | --- |
| `library:select-files` | 系统多选文件对话框（带音频过滤器），只选不复制 |
| `library:import-files` | 按路径复制入库，返回 `{ imported, skipped }` |
| `library:import-folder` | 目录对话框 + 递归收集受支持格式后导入，返回 `{ canceled, imported, skipped }` |
| `library:load` | 读 manifest 并返回曲目（同时刷新媒体协议白名单） |
| `library:import-progress` | 每处理完一个文件推一次 `{ completed, total }` |

- preload 新增 `selectAudioFiles` / `importAudioFiles` / `importAudioFolder` / `loadLibrary` / `onLibraryImportProgress`（返回取消订阅函数）。
- 导入完成后主进程立刻把新音频与封面加入媒体协议白名单（`addAudioFilePaths` / `addImageFilePaths`），不用重启即可播放。
- 渲染进程 `useLibraryImport` 负责对话框 → 导入 → 重新 `loadLibrary` → 重建队列 → 结果文案（导入 N 首 / 已存在 X 首 / 格式不支持 X 首 / 失败 X 首）。
- 设置浮层「音乐库」区：已托管数量 + 「选择音频文件」「导入文件夹」+ 进度（`正在导入 3/10`）与红色错误文案。
- 空曲库时画廊文案改为「曲库为空 · 右下角设置里可导入音乐」。
- **移除旧目录模型**：`select-music-directory` / `scan-music-directory` / `AppSettings.musicDirectory` / App 的目录扫描状态全部删除；网页预览点击导入会提示「请使用 Electron 桌面应用」。

### 构建链路修复（不修则应用无法启动）

- 现象：`electron .` 直接报 `ERR_UNKNOWN_FILE_EXTENSION ".ts"`。原因：主进程 `import "@arlhifi/shared"`，而该包 `exports` 指向 TS 源码，之前的 tsc 产物没有打包，Node 运行时无法加载。
- 另外 preload 编译成 ESM，而沙箱 preload 不支持 ESM import。
- 新增 `apps/desktop/scripts/build-electron.mjs`（esbuild）：
  - `electron/main.ts` → `main.js`（ESM、bundle、external 只有 `electron`；banner 注入 `createRequire`，供依赖里的 CJS 动态 `require("tty")` 使用）；
  - `electron/preload.ts` → `preload.cjs`（CJS，匹配沙箱 preload 限制）。
- `dev-electron.mjs` 改用同一打包脚本；`package.json` build 去掉 tsc emit、增加 esbuild devDependency；删除 `tsconfig.electron-build.json` / `tsconfig.electron-dev.json`。

### 验证

- 单测（真实临时目录 + 真实 WAV）：
  - `library-import.test.ts` 12 项：复制到 artist/album、进度回调、三元组去重（改名仍算重复）、同名 ` (2)` 不覆盖、不支持/不可读文件不中断批次、头部哈希只读 256KB。
  - `library-manifest.test.ts` 5 项：损坏 manifest 当空库、丢弃畸形条目、落盘回读、剔除被删文件。
  - `music-scanner.test.ts` 新增递归收集与大小写扩展名用例；修正 `createTrackFromFilePath` 对 `.FLAC` 的标题截断 bug。
- 网页预览截图：音乐库区、「14 首已托管」、两个按钮；点击后出现红色提示。
- **未验证**：真实 Electron 窗口里的文件对话框、IPC 导入、媒体协议播放。本机 Electron 创建窗口即 `0xC0000005` 崩溃（最小 `new BrowserWindow` 同样崩），属于当前 DSH 会话环境限制；需要在真实桌面会话跑 `pnpm dev` 复验。

## 未解决

### 1. 技术债

- 导入在**批末**写 manifest：中途崩溃/断电会留下孤儿副本，再次导入同名文件会变成 ` (2)`；如需更强一致性，可每成功一首就落盘或先写临时清单。
- 曲库没有「刷新/监听文件变化」：手工往 `userData/library` 放文件不会被发现；删文件只在下次 `library:load` 时剔除。
- 导入是串行逐文件处理，没有取消；几百首的文件夹会占用 UI（有进度但没有停止按钮）。
- 设置面板「剪影」「光效」两组材质球**没有任何代码消费**（`scenePreset.silhouette` / `.light` 只写入 `settings.json`）；要么接回场景，要么删掉这两组（连同 4 套 leaf 贴图）。
- `gallery-stage.tsx` 已 800+ 行，混了相机、货架、CD、详情、光效、设置入口，建议拆 `scene/shelf.tsx`、`scene/carousel.tsx`、`scene/stage.tsx`。
- 详情场景的盘片自转仍缺（转动整个 `CD_1` 会让盘片侧翻，需要单独转 `Object_13` 的局部法线轴）。
- 网页预览的 `localStorage` 与 Electron 的 `settings.json` 是两套存储，字段变更时要同步 `mergeSettings`。
- `?merge=1` 的网格合并路径保留但默认关闭，未验证收益。

### 2. 未开始的刀

| 刀 | 内容 |
| --- | --- |
| 4 | 管理音乐（排序 / 重命名 / 设封面 / 删除）、搜索飞行到 CD、播放界面音量环 |
| 5 | 删除废弃组件与样式（`app-rail`、`player-bar`、`library-page`、`queue-page` 等）、更新文档、跑门禁 |

## 验收命令

```powershell
pnpm typecheck          # 三个 tsconfig 全绿
pnpm test               # desktop 91 + shared 11 + harness 6
pnpm build              # esbuild 打包 main/preload + vite 打包 dist
pnpm dev:web            # http://localhost:5173/?demo=1&perf=1
pnpm dev                # Vite + Electron（需真实桌面会话）
```

本机环境提示（DSH 沙箱下）：

- `pnpm typecheck/test/build`、`vite`、Chrome、Electron 都需要 `danger-full-access`，否则子进程 `spawn EPERM`。
- 编辑器的原子保存会在源码目录生成 `.xxx.tmpdir` 临时目录，Vite 的 `fs.watch` 会 `EBUSY` 崩溃；用 `$env:CHOKIDAR_USEPOLLING='1'` 启动。
- `pnpm build` 需要把 `$env:TEMP` / `$env:TMP` 指到工作区内，否则 esbuild 删除系统临时文件被沙箱拒绝。
- DSH 环境自带 `ELECTRON_RUN_AS_NODE=1`：启动 Electron 前必须 `Remove-Item Env:ELECTRON_RUN_AS_NODE`，否则 Electron 会当纯 Node 跑。
- 本机 Electron 窗口创建即崩（access violation），headless Chrome 正常；截图脚本可临时放 `.tmp-browser/cdp.mjs`（CDP 直连端口），用完删掉。
