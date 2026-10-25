# 素材来源与许可

本目录（`apps/desktop/public/textures/`）与 `素材/` 中的资源，全部来自可自由使用的来源。
**新增素材必须在此登记，否则不得提交。**

## 已使用

| 文件 | 素材 | 作者 / 来源 | 许可 | 用途 |
| --- | --- | --- | --- | --- |
| `wood066-color.jpg`<br>`wood066-normal.jpg`<br>`wood066-roughness.jpg` | Wood066 1K JPG | [ambientCG](https://ambientcg.com/view?asset=Wood066) | **CC0**（无需署名） | 展厅台面 |
| `wood008-color.jpg`<br>`wood008-normal.jpg`<br>`wood008-roughness.jpg` | Wood008 1K JPG（竖木纹） | [ambientCG](https://ambientcg.com/view?asset=Wood008) | **CC0**（无需署名） | 柜体立面 |
| `wall-color.jpg`<br>`wall-normal.jpg`<br>`wall-roughness.jpg` | Fabric009 1K JPG | [ambientCG](https://ambientcg.com/view?asset=Fabric009) | **CC0**（无需署名） | 展厅墙皮 |

> `leaf015-*` 目前未使用（墙面已改用 Fabric028，树叶阴影方案暂缓）。

## 待接入

| 素材 | 来源 | 许可 | 状态 |
| --- | --- | --- | --- |
| CD Jewel Case（`apps/desktop/public/models/cd-case.glb`） | [Sketchfab: cd-jewel-case](https://sketchfab.com/3d-models/cd-jewel-case-f6c8386e76e54918b551ebdd276479dd) | **CC-BY 4.0 — 必须署名** | 已导出 GLB（1.72 MB）。**作者：蓝人组合**。署名文案：`"CD Jewel Case" by 蓝人组合, licensed CC-BY 4.0, via Sketchfab` |

> 已接入但**暂未启用**：模型的朝向与尺寸尚未归一化（正面未朝 +Z、包围盒约为目标尺寸 2 倍），
> 直接替换后每张 CD 会侧转并被裁切。待归一化后再切换，避免交付视觉错误。

> 使用该 CD 盒模型时，界面「关于」页与本文档都必须标注作者与来源。
> 作者名称待补：导出 GLB 时请一并提供 Sketchfab 页面上的作者显示名。

## 未使用（保留备选）

| 文件 | 素材 | 许可 | 备注 |
| --- | --- | --- | --- |
| `素材/Wood008_1K-JPG（竖木纹）.zip` | Wood008 1K JPG | CC0 | 竖纹木，计划用于柜体立面 |

## 规则

1. 只接受 **CC0 / 公有领域** 或 **CC-BY（可署名）**；不接受 NC / ND / 来源不明。
2. 贴图入库前压到 1024 以内、单张 ≤ 500KB（当前 1K 原图最大 1.7MB，后续可压）。
3. 模型入库前确认面数 ≤ 5k、贴图内嵌（`.glb`）。
4. CC-BY 素材必须在「关于」页可见，且链接可点。