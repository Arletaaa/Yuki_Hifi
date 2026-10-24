import { create, type StateCreator } from "zustand";
import { createStore } from "zustand/vanilla";
import { initialPlayerSnapshot, type PlayerSnapshot, type Track } from "@arlhifi/shared";
import { getNextTrackIndex, getPreviousTrackIndex, getReplacementIndex, pruneQueueToLibrary } from "./queue-logic";

export interface LibraryActions {
  readonly loadLibrary: (library: readonly Track[]) => void;
  readonly toggleFavorite: (trackId: string) => void;
}

export interface QueueActions {
  readonly clearQueue: () => void;
  readonly cyclePlaybackMode: () => void;
  readonly rebuildQueueFromLibrary: () => void;
  readonly removeFromQueue: (trackId: string) => void;
}

export interface PlaybackActions {
  readonly handleTrackEnded: () => void;
  readonly markPlaybackPaused: () => void;
  readonly markPlaybackStarted: () => void;
  readonly playNext: () => void;
  readonly playPrevious: () => void;
  readonly playTrack: (track: Track) => void;
  readonly setDurationSeconds: (durationSeconds: number) => void;
  readonly setPlaybackError: (message: string | null) => void;
  readonly setPositionSeconds: (positionSeconds: number) => void;
  readonly setVolume: (volume: number) => void;
  readonly toggleMute: () => void;
  readonly togglePlayback: () => void;
}

export type PlayerActions = LibraryActions & QueueActions & PlaybackActions;

export type PlayerStore = PlayerSnapshot & PlayerActions;

export const createInitialPlayerState = (): PlayerSnapshot => ({
  ...initialPlayerSnapshot,
  library: [...initialPlayerSnapshot.library],
  queue: [...initialPlayerSnapshot.queue],
  favorites: [...initialPlayerSnapshot.favorites]
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

/** 曲库切片：扫描结果与收藏。收藏只是 id 集合，不决定曲库内容。 */
const createLibrarySlice: StateCreator<PlayerStore, [], [], LibraryActions> = (set) => ({
  loadLibrary: (library) => {
    const nextLibrary = [...library];

    set((state) => {
      const prunedQueue = pruneQueueToLibrary(state.queue, nextLibrary);
      const currentTrackIsInLibrary = state.currentTrack
        ? nextLibrary.some((track) => track.id === state.currentTrack?.id)
        : false;

      return {
        library: nextLibrary,
        queue: prunedQueue.length > 0 ? prunedQueue : nextLibrary,
        currentTrack: currentTrackIsInLibrary ? state.currentTrack : null,
        positionSeconds: currentTrackIsInLibrary ? state.positionSeconds : 0,
        durationSeconds: currentTrackIsInLibrary ? state.durationSeconds : 0,
        playbackErrorMessage: null,
        status: currentTrackIsInLibrary ? state.status : "idle"
      };
    });
  },
  toggleFavorite: (trackId) => {
    set((state) => ({
      favorites: state.favorites.includes(trackId)
        ? state.favorites.filter((id) => id !== trackId)
        : [...state.favorites, trackId]
    }));
  }
});

/** 队列切片：队列与库解耦，可独立移除/清空/重建。 */
const createQueueSlice: StateCreator<PlayerStore, [], [], QueueActions> = (set) => ({
  removeFromQueue: (trackId) => {
    set((state) => {
      const removedIndex = state.queue.findIndex((track) => track.id === trackId);

      if (removedIndex < 0) {
        return {};
      }

      const nextQueue = state.queue.filter((track) => track.id !== trackId);

      if (state.currentTrack?.id !== trackId) {
        return { queue: nextQueue };
      }

      const replacement = nextQueue[getReplacementIndex(removedIndex, nextQueue.length)] ?? null;

      if (!replacement) {
        return {
          queue: nextQueue,
          currentTrack: null,
          status: "idle" as const,
          positionSeconds: 0,
          durationSeconds: 0
        };
      }

      return {
        queue: nextQueue,
        currentTrack: replacement,
        status: "playing" as const,
        positionSeconds: 0,
        durationSeconds: replacement.durationSeconds
      };
    });
  },
  clearQueue: () => {
    set({
      queue: [],
      currentTrack: null,
      status: "idle",
      positionSeconds: 0,
      durationSeconds: 0,
      playbackErrorMessage: null
    });
  },
  rebuildQueueFromLibrary: () => {
    set((state) => ({ queue: state.library }));
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
  }
});

/** 播放切片：传输控制与音频状态同步。 */
const createPlaybackSlice: StateCreator<PlayerStore, [], [], PlaybackActions> = (set, get) => ({
  playTrack: (track) => {
    set((state) => {
      const queueIncludesTrack = state.queue.some((queuedTrack) => queuedTrack.id === track.id);

      return {
        currentTrack: track,
        queue: queueIncludesTrack ? state.queue : [...state.queue, track],
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
  setVolume: (volume) => {
    set({ volume: clampVolume(volume) });
  },
  setPositionSeconds: (positionSeconds) => {
    set({ positionSeconds: Math.max(0, Math.floor(positionSeconds)) });
  },
  setDurationSeconds: (durationSeconds) => {
    set({ durationSeconds: Number.isFinite(durationSeconds) ? Math.max(0, Math.floor(durationSeconds)) : 0 });
  },
  markPlaybackStarted: () => {
    set({ playbackErrorMessage: null, status: "playing" });
  },
  markPlaybackPaused: () => {
    set((state) => ({ status: state.currentTrack ? "paused" : "idle" }));
  },
  setPlaybackError: (message) => {
    set({ playbackErrorMessage: message, status: "paused" });
  },
  toggleMute: () => {
    set((state) => ({ muted: !state.muted }));
  },
  /**
   * 播完一首后的行为：
   * - repeat-one：重播当前曲；
   * - 顺序模式且已是队列最后一首：停止（不回绕）；
   * - 其余情况：下一首。
   */
  handleTrackEnded: () => {
    const state = get();
    const queue = getPlayableQueue(state);
    const currentIndex = getTrackIndex(queue, state.currentTrack);

    if (queue.length === 0 || currentIndex < 0) {
      return;
    }

    if (state.playbackMode === "repeat-one") {
      set({ positionSeconds: 0, status: "playing" });
      return;
    }

    if (state.playbackMode === "sequential" && currentIndex >= queue.length - 1) {
      set({ positionSeconds: 0, status: "paused" });
      return;
    }

    state.playNext();
  }
});

const createPlayerStoreState: StateCreator<PlayerStore> = (...args) => ({
  ...createInitialPlayerState(),
  ...createLibrarySlice(...args),
  ...createQueueSlice(...args),
  ...createPlaybackSlice(...args)
});

export const createPlayerStore = () => createStore<PlayerStore>()(createPlayerStoreState);

export const usePlayerStore = create<PlayerStore>()(createPlayerStoreState);
