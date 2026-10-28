import { create, type StateCreator } from "zustand";
import { createStore } from "zustand/vanilla";
import { initialPlayerSnapshot, type PlaybackMode, type PlayerSnapshot, type Track } from "@arlhifi/shared";
import { getReplacementIndex, pruneQueueToLibrary } from "./queue-logic";

export interface LibraryActions {
  readonly loadLibrary: (library: readonly Track[]) => void;
  readonly toggleFavorite: (trackId: string) => void;
}

export interface QueueActions {
  readonly clearQueue: () => void;
  readonly rebuildQueueFromLibrary: () => void;
  readonly removeFromQueue: (trackId: string) => void;
}

export interface PlaybackActions {
  readonly handleTrackEnded: () => void;
  readonly markPlaybackPaused: () => void;
  readonly markPlaybackStarted: () => void;
  readonly playTrack: (track: Track) => void;
  readonly setDurationSeconds: (durationSeconds: number) => void;
  readonly setPlaybackError: (message: string | null) => void;
  readonly setPlaybackMode: (playbackMode: PlaybackMode) => void;
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
  setVolume: (volume) => {
    set({ volume: clampVolume(volume) });
  },
  setPlaybackMode: (playbackMode) => {
    set({ playbackMode });
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
   * 播完一首后：循环播放重播本曲，播完即停保持暂停；
   * 不做自动跳曲——一个详情页只负责当前这首歌。
   */
  handleTrackEnded: () => {
    const state = get();

    if (!state.currentTrack) {
      return;
    }

    if (state.playbackMode === "repeat-one") {
      set({ positionSeconds: 0, status: "playing" });
      return;
    }

    set({ status: "paused" });
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
