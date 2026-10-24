# Arlt HiFi Player Agent Constraints

This file merges the project's existing engineering constraints with the behavioral guidelines popularized by `andrej-karpathy-skills`, adapted for this repository.

## Core behavior

### 1. Think before coding

- State assumptions explicitly when the request is ambiguous.
- Surface tradeoffs instead of silently picking one interpretation.
- Prefer the simpler path when it satisfies the request.
- Stop and clarify when uncertainty would materially change the implementation.

### 2. Simplicity first

- Write the minimum code that solves the actual problem.
- Do not add speculative flexibility, configurability, or future-proofing.
- Do not introduce abstractions for single-use logic.
- Avoid defensive handling for scenarios the current product cannot reach.

### 3. Surgical changes

- Touch only the code required for the task.
- Match the surrounding style and architecture unless the task requires otherwise.
- Remove only the unused code created by your own changes.
- Call out unrelated problems instead of fixing them opportunistically.

### 4. Goal-driven execution

- Translate requests into verifiable success criteria before implementation.
- For bug fixes, prefer a reproduction or regression test first.
- For shared behavior changes, add or update focused tests.
- Verify with `pnpm typecheck`, `pnpm test`, and `npm run build` when the change affects app behavior or shared code.

## Project-specific constraints

- Keep TypeScript strict mode passing.
- Do not use `any` unless a nearby comment explains why it is unavoidable.
- The current playback MVP stays on `HTMLAudioElement`; do not introduce a real audio decoding core yet.
- Keep audio-domain logic compatible with a future `audio-core` boundary.
- Do not add a decorative right-side stage, character stage, Live2D surface, or MV/video background.
- A real-time 3D collection scene (CD gallery + playback stage) is allowed because the scene *is* the library and navigation, not decoration. The exact boundary is defined in `docs/decisions/005-scene-gallery.md`; the test is "does every 3D element map to a real favorite track or playback state".
- Scene code must stay in the renderer and behind the preload boundary; it may load cover images only through the existing controlled media protocol.
- React renderer code must keep using the Electron preload boundary instead of directly accessing Node or Electron APIs.
- Prefer small, reviewable changes and keep tests focused on the changed behavior.

## Where to apply this

- Feature work: treat these rules as the default implementation contract.
- Bug fixing: use them to keep fixes minimal and testable.
- Review work: flag overbuilt solutions, unrelated edits, and unverifiable changes.
