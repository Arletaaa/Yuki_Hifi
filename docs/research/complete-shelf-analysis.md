# 参考实现拆解：MengTo/complete-shelf

来源：`https://github.com/MengTo/complete-shelf`（已克隆到 `.refs/complete-shelf`，仅作阅读参考，不复制代码）。
单文件 `index.html`，共 6307 行。以下是与我们实现相关的实测数据。

## 场景复杂度对照

| 指标 | 参考实现 | 我们当前 |
| --- | --- | --- |
| 物品数 | 7 本书 | 14 张 CD |
| `BoxGeometry` 实例创建 | **1 次**（复用） | 每个盒子独立 clone |
| `PlaneGeometry` 实例创建 | **3 次**（复用） | 每张封面 1 个新 geometry |
| 网格总数（估） | ~20 | **~126**（14 × 9 个 mesh） |
| 投射阴影的物体 | **1 个**（只有主光，书不投影） | 已全部关闭（本轮） |
| 阴影贴图 | 2048²，`PCFSoftShadowMap` | 已关闭 |
| 贴图来源 | **31 个 `CanvasTexture`**（程序化绘制，512 级） | 24 张 2K 照片贴图 |
| 灯光 | 2 个 Directional + 1 Hemisphere | 1 Directional + 1 Ambient |
| 像素比 | `min(dpr, 视口<820 ? 1.5 : 2)` | 固定 1 |
| 色调映射 | `ACESFilmicToneMapping`，exposure 0.9 | 默认（无） |
| 主循环 | 持续 `renderer.render` | `frameloop="demand"` + 手动 invalidate |

## 结论：它的性能来自"少对象"，不是"少效果"

1. **几何复用**：7 本书共享 1 个 BoxGeometry；我们每张 CD 都克隆整套 GLB。
2. **程序化贴图**：31 个 CanvasTexture 意味着没有任何图片解码、显存极小；我们 24 张 2K 贴图约 10.8MB 显存。
3. **只有 1 个阴影投射体**：阴影 pass 几乎免费。
4. **没有后处理、没有环境贴图**。

它反而**开着** antialias、ACES 和最高 2 倍像素比，说明这些不是瓶颈。

## 因此我们的优化优先级应当调整

| 优先级 | 措施 | 预期 |
| --- | --- | --- |
| P0 | **合并每个 CD 盒的静态网格**：`Rough_Plastic` / `Translucent` / `White` / `Material.008` / `FileBase` 合成 1 个 mesh（用 `mergeGeometries(..., useGroups)`），每盒绘制从 9 降到 ~4 | 126 → ~56 draw calls |
| P0 | **封面纹理由共享 geometry**：`PlaneGeometry` 只在模板里建一次 | 少 13 个 geometry |
| P1 | 墙面/台面用 **CanvasTexture 程序化纹理** 替代 2K 图片（或降到 1K） | 显存与采样带宽下降 |
| P1 | 采用 **ACESFilmicToneMapping + exposure** | 仅观感，几乎无成本 |
| P2 | 远处 CD 降级为 billboard（第 2 个 bay 之外） | 视距外开销趋零 |
| P2 | 视口 < 820px 时像素比降到 1（目前固定 1，可上调到 1.5 提升观感） | 观感与性能平衡 |

## 转场与悬停：它的做法

- 所有动效都是 **CSS transition + `cubic-bezier(0.2, 0.72, 0.24, 1)`**（`--ease-out`），时长 180–900ms，按元素层级分层（标题慢、按钮快）。
- 3D 部分用**单条 rAF 循环**逐帧 `lerp` 朝向/位移，没有引入 GSAP 之类的动画库。
- 悬停：物体沿法线前移 + 轻微旋转，指针离开时反向 lerp 回位；**没有弹簧、没有物理**。

对我们的启示：我们已有的 `1 - Math.pow(0.0001, dt)` 阻尼与之等价，**不需要引入动画库**；真正需要补的是"分层时长"（文字 600–900ms、材质球 180ms）和 CSS 缓动曲线统一为同一条。

## 不做的事

- 不复制其代码（仅参考结构）。
- 不引入 GSAP：现有阻尼已覆盖同类效果，加库只增体积。
