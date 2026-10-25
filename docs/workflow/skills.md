# 项目级 Skill 清单与使用规则

本文件记录这个仓库装了哪些 agent skill、什么时候该用、以及"什么时候可以去装新的"。

## 已安装（项目级 `.agents/skills/`）

| skill | 来源 | 用途 | 触发时机 |
| --- | --- | --- | --- |
| `threejs` | `mengto/skills` | Three.js 场景/相机/材质/性能的整体做法（与 `complete-shelf` 同作者） | 改 `src/scene/**` 之前先加载 |
| `threejs-interaction` | `cloudai-x/threejs-skills` | 射线拾取、hover/点击、拖拽、相机控制 | 做悬停抽出、点击命中、拖拽惯性时加载 |
| `impeccable` | `pbakaus/impeccable` | 设计质量检查清单 | 提交视觉改动前做一轮自评 |
| `frontend-design` | 全局 | 界面美学方向 | 重构系统层 UI 时 |
| `find-skills` | 全局 | 检索 skill 注册表 | 遇到能力缺口时 |

## 使用规则

1. **先加载再动代码**：改场景前加载 `threejs`；改交互前加载 `threejs-interaction`。不要凭记忆写 API。
2. **视觉改动必须自评**：用 `impeccable` 的清单过一遍，至少覆盖构图 / 配色 / 材质 / 光照 / 排版 / 层级六项。
3. **skill 不是能力**：它给的是流程与配方，不会提高判断力；判断力靠"数值化验收 + 与参考图逐项对比"。

## 什么时候可以装新 skill

**触发条件**（满足其一）：

- 连续两轮在同一类问题上返工（例如光照反复调不对）；
- 需要某个明确领域的能力（音频 DSP、打包签名、E2E），而现有 skill 不覆盖；
- 现有 skill 的内容与项目现状冲突（框架版本、API 变更）。

**动作**：

```powershell
$env:DISABLE_TELEMETRY="1"
npx -y skills find "<具体关键词>"        # 先搜
npx -y skills add <owner/repo@skill> -y   # 项目级安装（不要加 -g）
```

**门禁**：安装前必须由人确认。skill 会以完整 agent 权限运行，等于把一段陌生指令放进上下文，属于供应链风险；本项目不自动安装。

## 为什么不自动装

- **供应链**：skill 是任意指令文本，可能包含与项目冲突或越权的指引。
- **上下文成本**：每个 skill 都占 token，装多了会稀释真正重要的约束。
- **冲突与漂移**：多个 skill 对同一件事给出不同做法时，判断成本会转移到人身上。
- **可复现性**：项目级安装会进版本库，自动安装会让"为什么这个仓库多了个 skill"变得不可追溯。

折中方案：**自动"检索并提议"，人工"批准并安装"**。检索成本极低（一条命令），安装风险却不可逆。

## 维护

- 每个阶段开始时跑一次 `npx skills check`，看已装 skill 是否有更新；
- 更新前先看 diff，避免 API 建议变化导致代码被带偏；
- 移除不再适用的 skill 时，同步更新本文件。