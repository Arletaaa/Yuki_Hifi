import { create, type StateCreator } from "zustand";
import { createStore } from "zustand/vanilla";
import { initialPlayerSnapshot, type PlayerSnapshot, type Track } from "@arlhifi/shared";
import { getNextTrackIndex, getPreviousTrackIndex } from "./queue-logic";

interface PlayerActions {
  readonly loadLibrary: (library: readonly Track[]) => void;
  readonly playTrack: (track: Track) => void;
  readonly togglePlayback: () => void;
  readonly playNext: () => void;
  readonly playPrevious: () => void;
  readonly cyclePlaybackMode: () => void;
  readonly setVolume: (volume: number) => void;
  readonly setPositionSeconds: (positionSeconds: number) => void;
  readonly setDurationSeconds: (durationSeconds: number) => void;
  readonly markPlaybackStarted: () => void;
  readonly markPlaybackPaused: () => void;
  readonly setPlaybackError: (message: string | null) => void;
}

export type PlayerStore = PlayerSnapshot & PlayerActions;

export const createInitialPlayerState = (): PlayerSnapshot => ({
  ...initialPlayerSnapshot,
  library: [...initialPlayerSnapshot.library],
  queue: [...initialPlayerSnapshot.queue]
});

const clampVolume = (volume: number): number => Math.max(0, Math.min(100, Math.round(volume)));

const getPlayableQueue = (state: Pick<PlayerStore, "queue" | "library">): readonly Track[] => {
  if (state.queue.length > 0) {
    return state.queue;
  }

  return state.library;
};

const getTrackIndex = (queue: readonly Track[], currentTrack: Track | null): number => {
  if (!currentTrack) {
    return -1;
  }

  return queue.findIndex((track) => track.id === currentTrack.id);
};

const createPlayerStoreState: StateCreator<PlayerStore> = (set) => ({
  ...createInitialPlayerState(),
  loadLibrary: (library) => {
    const nextLibrary = [...library];

    set((state) => {
      const currentTrackIsInLibrary = state.currentTrack
        ? nextLibrary.some((track) => track.id === state.currentTrack?.id)
        : false;

      return {
        library: nextLibrary,
        queue: nextLibrary,
        currentTrack: currentTrackIsInLibrary ? state.currentTrack : null,
        positionSeconds: currentTrackIsInLibrary ? state.positionSeconds : 0,
        durationSeconds: currentTrackIsInLibrary ? state.durationSeconds : 0,
        playbackErrorMessage: null,
        status: currentTrackIsInLibrary ? state.status : "idle"
      };
    });
  },
  playTrack: (track) => {
    set((state) => {
      const queueIncludesTrack = state.queue.some((queuedTrack) => queuedTrack.id === track.id);

      return {
        currentTrack: track,
        queue: queueIncludesTrack ? state.queue : [track, ...state.queue],
        positionSeconds: 0,
        durationSeconds: track.durationSeconds,
        playbackErrorMessage: null,
        status: "playing"
      };
    });
  },
  togglePlayback: () => {
    set((state) => {
      const queue = getPlayableQueue(state);
      const nextTrack = state.currentTrack ?? queue[0];

      if (!nextTrack) {
        return { status: "idle" as const };
      }

      return {
        currentTrack: nextTrack,
        queue,
        playbackErrorMessage: null,
        status: state.status === "playing" ? ("paused" as const) : ("playing" as const)
      };
    });
  },
  playNext: () => {
    set((state) => {
      const queue = getPlayableQueue(state);
      const currentIndex = getTrackIndex(queue, state.currentTrack);
      const nextIndex = getNextTrackIndex({
        currentIndex,
        length: queue.length,
        mode: state.playbackMode,
        random: Math.random
      });
      const nextTrack = queue[nextIndex];

      if (!nextTrack) {
        return { status: "idle" as const };
      }

      return {
        currentTrack: nextTrack,
        queue,
        positionSeconds: 0,
        durationSeconds: nextTrack.durationSeconds,
        playbackErrorMessage: null,
        status: "playing" as const
      };
    });
  },
  playPrevious: () => {
    set((state) => {
      const queue = getPlayableQueue(state);
      const currentIndex = getTrackIndex(queue, state.currentTrack);
      const previousIndex = getPreviousTrackIndex(currentIndex, queue.length);
      const previousTrack = queue[previousIndex];

      if (!previousTrack) {
        return { status: "idle" as const };
      }

      return {
        currentTrack: previousTrack,
        queue,
        positionSeconds: 0,
        durationSeconds: previousTrack.durationSeconds,
        playbackErrorMessage: null,
        status: "playing" as const
      };
    });
  },
  cyclePlaybackMode: () => {
    set((state) => ({
      playbackMode:
        state.playbackMode === "sequential"
          ? "repeat-one"
          : state.playbackMode === "repeat-one"
            ? "shuffle"
            : "sequential"
    }));
  },
  setVolume: (volume) => {
    set({
      volume: clampVolume(volume)
    });
  },
  setPositionSeconds: (positionSeconds) => {
    set({
      positionSeconds: Math.max(0, Math.floor(positionSeconds))
    });
  },
  setDurationSeconds: (durationSeconds) => {
    set({
      durationSeconds: Number.isFinite(durationSeconds) ? Math.max(0, Math.floor(durationSeconds)) : 0
    });
  },
  markPlaybackStarted: () => {
    set({
      playbackErrorMessage: null,
      status: "playing"
    });
  },
  markPlaybackPaused: () => {
    set((state) => ({
      status: state.currentTrack ? "paused" : "idle"
    }));
  },
  setPlaybackError: (message) => {
    set({
      playbackErrorMessage: message,
      status: "paused"
    });
  }
});

export const createPlayerStore = () => createStore<PlayerStore>()(createPlayerStoreState);

export const usePlayerStore = create<PlayerStore>()(createPlayerStoreState);
