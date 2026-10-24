# CLAUDE.md

## Commands

```bash
pnpm install                     # Install all workspace dependencies
pnpm dev                         # Start Vite dev server + Electron window
pnpm dev:web                     # Start Vite dev server only (no Electron)
pnpm typecheck                   # Type-check all workspace packages
pnpm test                        # Run all workspace tests (Vitest)
pnpm -r test                     # Run tests in every package
pnpm --filter @arlhifi/desktop test   # Run tests for a single package
pnpm build                       # Build all workspace packages
pnpm lint                        # Lint all packages (currently typecheck-only)
```

## Project architecture

Arlt HiFi Player — local HiFi desktop music player built on Electron + React + TypeScript strict mode.

```
apps/desktop/          Electron + React desktop app
  electron/              Main process (preload, media protocol, music scanner)
  src/                   Renderer (React components, hooks, stores)
packages/shared/       Shared types, mock data, utilities
packages/ui/           Base UI components (Panel, SoftButton, cn)
packages/agent-harness/  AI harness: constraints, checklists, task templates
docs/                  Product docs, ADRs, prompts, evals
fixtures/              Test fixture placeholders (audio, themes, visuals)
```

## Key Patterns

- **State**: Zustand store in `apps/desktop/src/store/player-store.ts` manages `library`, `queue`, `currentTrack`, `status`, `positionSeconds`, `volume`.
- **Playback MVP**: `HTMLAudioElement` via `useAudioPlayback` hook. Do NOT introduce Rust audio-core yet.
- **Security boundary**: React renderer uses Electron preload API (contextBridge). Never access Node/Electron APIs directly from renderer.
- **Audio files**: `flac`, `wav`, `mp3`, `m4a`, `ogg` scanned via main process `music-scanner.ts`.
- **Styles**: Tailwind CSS + custom properties in `src/styles/`. Use `packages/ui` for shared components.
- **Testing**: Vitest with jsdom. Tests colocated with source (`*.test.ts`/`*.test.tsx`).

## Hard Constraints

- TypeScript strict mode. No `any` without a comment explaining why.
- Current playback stays on `HTMLAudioElement` — no real audio decoding core.
- Keep audio-domain logic compatible with a future `audio-core` boundary.
- Main player UI must NOT add: right-side stage, character stage, Live2D, MV playback, dynamic visual stage.
- React code must use Electron preload boundary — never call Node/Electron APIs directly.
- Prefer `packages/ui` and `packages/shared` reuse over inline duplication.

## Behavioral Constraints

See [AGENTS.md](AGENTS.md) for full details. In short:
- Think before coding — surface tradeoffs, clarify ambiguity.
- Simplicity first — minimum code, no speculative features.
- Surgical changes — touch only what the task requires.
- Goal-driven — define success criteria before implementing.

Before completing any code change: run `pnpm typecheck` and `pnpm test`.
