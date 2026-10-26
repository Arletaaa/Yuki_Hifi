# 交接状态（2026-10-26 收口）

## 这一阶段的成果

| 领域 | 状态 |
| --- | --- |
| 主界面 | 3D 画廊为唯一视图；旧 rail / player-bar / 列表页 / 队列页已不再挂载（文件仍在仓库，待第 5 刀删除） |
| 顶栏 | 搜索框（近似匹配，输入即过滤） |
| 设置 | 全透明浮层（Portal 到 body，z-index 9999）；材质球两组一行、绿环只包球体、音量行、版权置底 |
| 场景预设 | `scenePreset { table, base, wall, silhouette, light }` 已写入 `settings.json`，材质选择**实时驱动**台面 / 台底 / 墙面贴图 |
| 持久化 | Electron 走 `settings.json`；网页预览走 `localStorage["arlt-hifi-settings"]` |
| 素材 | 16 套 2K 材质压缩为 48 个文件（10.8MB），按 `table/ base/ wall/ leaf/` 分类；`CREDITS.md` 已登记（CC0 + CC-BY） |
| CD 模型 | 合盖版 GLB 接入，封面按内页包围盒精确贴合；详情场景可开盖、盘片可拖出并限位 |
| 光效 | 丁达尔光束（6 片叠加软光条，漂移 + 呼吸）与流动光斑（150 个模糊圆斑，缓慢平移） |
| 交互修复 | 拖拽 / 滚轮 / 左右箭头 / 开盖方向全部纠正；横向滑动改为帧循环内写 Object3D，解决"180fps 但滑动卡" |

## 未解决（下阶段第一优先级）

### 1. 阴影不生效

已确认的 bug：R3F 的 `<Canvas>` 必须显式写 `shadows`，否则 `gl.shadowMap.enabled` 恒为 false —— 已补。
补上后**依然看不到投影**，需按下面顺序二分：

1. `Canvas onCreated` 里打印 `gl.shadowMap.enabled`、`gl.shadowMap.type`、`gl.info.render.calls`；
2. 主光临时改为正上方 `[0, 6, 2]`、环境光降到 `0.05`，截图判断是否有投影：
   - 有 → 是光照角度问题（光太斜，影子被 CD 自身遮挡），固定角度即可；
   - 没有 → 检查 `case-model.ts` 里克隆后 `mesh.castShadow` 是否被覆盖、阴影相机范围是否覆盖台面。
3. 目视对照点：CD 下方左后方、台面前缘到柜体的过渡区。

### 2. 场景观感

- 墙面布料纹理偏"格子感"，与参考图的纯净墙面有差距；可换成 `plain` 或降低 `repeat`。
- 台面与柜体之间缺少接触阴影，视觉上仍偏平（与第 1 条同源）。

### 3. 未开始的刀

| 刀 | 内容 |
| --- | --- |
| 3 | 音乐导入与托管：`library:select-files` / `library:import-files` / `library:import-folder`，复制到 `userData/library/<artist>/<album>/<title>.<ext>`，去重 `(大小, 时长, 前 256KB SHA-1)` |
| 4 | 管理音乐（排序 / 重命名 / 设封面 / 删除）、搜索飞行到 CD、播放界面音量环 |
| 5 | 删除废弃组件与样式（`app-rail`、`player-bar`、`library-page`、`queue-page` 等）、更新文档、跑门禁 |

## 已知技术债

- `gallery-stage.tsx` 已超过 800 行，混了相机、货架、CD、详情、光效、设置入口，建议拆分为 `scene/shelf.tsx`、`scene/carousel.tsx`、`scene/stage.tsx`。
- 详情场景的盘片自转仍缺（转动整个 `CD_1` 会让盘片侧翻，需要单独转 `Object_13` 的局部法线轴）。
- 网页预览的 `localStorage` 与 Electron 的 `settings.json` 是两套存储，字段变更时要同步 `mergeSettings`。
- `?merge=1` 的网格合并路径保留但默认关闭，未验证收益。

## 验收命令

```powershell
pnpm typecheck          # 三个 tsconfig 全绿
pnpm test               # desktop 72 + shared 13 + harness 6
pnpm build              # dist + dist-electron
pnpm dev:web            # http://localhost:5173/?demo=1&perf=1
```