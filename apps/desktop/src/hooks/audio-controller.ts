export interface AudioController {
  readonly seek: (seconds: number) => void;
}

let controller: AudioController | null = null;

export const setAudioController = (next: AudioController | null): void => {
  controller = next;
};

/** 供 UI 调用的一次性 seek（不经过 store，避免每帧位置回写与跳转冲突）。 */
export const seekTo = (seconds: number): void => {
  controller?.seek(seconds);
};
