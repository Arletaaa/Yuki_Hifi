export const agentHarnessName = "Arlt HiFi Agent Harness";

export const karpathyConstraints = [
  "Think before coding: state assumptions, surface tradeoffs, and clarify meaningful ambiguity.",
  "Simplicity first: write the minimum code that solves the request without speculative flexibility.",
  "Surgical changes: touch only what the task requires and avoid unrelated cleanup.",
  "Goal-driven execution: define verifiable success criteria and close the loop with focused checks."
] as const;

export const engineeringConstraints = [
  "TypeScript strict mode is required.",
  "Do not use any unless a nearby comment explains why it is unavoidable.",
  "Keep the current playback MVP on HTMLAudioElement.",
  "Keep audio decoding behind future audio-core boundaries.",
  "Do not add a right-side stage, character stage, Live2D surface, MV playback, or a dynamic visual stage to the main player UI.",
  "Prefer small, reviewable changes with tests for shared behavior."
] as const;

export const agentConstraints = [
  ...karpathyConstraints,
  ...engineeringConstraints
] as const;
