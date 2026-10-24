import { create, type StateCreator } from "zustand";
import { createStore } from "zustand/vanilla";
import { initialPlayerSnapshot, mockTrack, type PlayerSnapshot, type Track } from "@arlhifi/shared";

interface PlayerActions {
  readonly loadLibrary: (library: readonly Track[]) => void;
  readonly playTrack: (track: Track) => void;
  readonly togglePlayback: () => void;
  readonly playNext: () => void;
  readonly playPrevious: () => void;
  readonly loadMockTrack: () => void;
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

  if (state.library.length > 0) {
    return state.library;
  }

  return [mockTrack];
};

const getTrackIndex = (queue: readonly Track[], currentTrack: Track | null): number => {
  if (!currentTrack) {
    return -1;
  }

  return queue.findIndex((track) => track.id === currentTrack.id);
};

const createPlayerStoreState: StateCreator<PlayerStore> = (set, get) => ({
  ...createInitialPlayerState(),
  loadLibrary: (library) => {
    const nextLibrary = [...library];

    set((state) => {
      const currentTrackIsInLibrary = state.currentTrack
        ? nextLibrary.some((track) => track.id === state.currentTrack?.id)
        : false;

      return {
        library: nextLibrary,
        queue: nextLibrary.length > 0 ? nextLibrary : [mockTrack],
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
      const nextTrack = state.currentTrack ?? queue[0] ?? mockTrack;
      const nextStatus = state.status === "playing" ? "paused" : "playing";

      return {
        currentTrack: nextTrack,
        queue,
        playbackErrorMessage: null,
        status: nextStatus
      };
    });
  },
  playNext: () => {
    set((state) => {
      const queue = getPlayableQueue(state);
      const currentIndex = getTrackIndex(queue, state.currentTrack);
      const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % queue.length : 0;

      return {
        currentTrack: queue[nextIndex] ?? mockTrack,
        queue,
        positionSeconds: 0,
        durationSeconds: queue[nextIndex]?.durationSeconds ?? 0,
        playbackErrorMessage: null,
        status: "playing"
      };
    });
  },
  playPrevious: () => {
    set((state) => {
      const queue = getPlayableQueue(state);
      const currentIndex = getTrackIndex(queue, state.currentTrack);
      const previousIndex = currentIndex >= 0 ? (currentIndex - 1 + queue.length) % queue.length : 0;

      return {
        currentTrack: queue[previousIndex] ?? mockTrack,
        queue,
        positionSeconds: 0,
        durationSeconds: queue[previousIndex]?.durationSeconds ?? 0,
        playbackErrorMessage: null,
        status: "playing"
      };
    });
  },
  loadMockTrack: () => {
    set({
      currentTrack: mockTrack,
      queue: [mockTrack],
      positionSeconds: 0,
      durationSeconds: mockTrack.durationSeconds,
      playbackErrorMessage: null,
      status: "paused"
    });
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
