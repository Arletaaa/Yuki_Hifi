# Feature Implementation Checklist

## 设计

- 是否阅读了相关 ADR、产品文档和现有代码。
- 设计方案是否符合当前阶段约束（MVP、UI 骨架、安全边界）。
- 是否优先复用 `packages/shared` 与 `packages/ui`。

## 实现

- 是否保持 TypeScript strict mode 通过。
- 是否使用 `any`（如有，必须有注释解释原因）。
- React 是否通过 preload API 通信，不直接访问 Node/Electron。
- 当前阶段是否避免了真实音频解码、右侧舞台、角色舞台或动态视觉舞台。
- 变更范围是否聚焦于任务目标，未引入无关改动。

## 测试

- 是否为新增行为补充了 Vitest 单元测试。
- 是否更新了相关文档、ADR 或提示词模板。

## 验证

- `pnpm typecheck` 是否通过。
- `pnpm test` 是否通过。
- `npm run build` 是否通过。
- 新功能是否符合验收标准。
