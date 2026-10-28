import { useEffect, useRef } from "react";
import { createTrackMediaUrl } from "@arlhifi/shared";
import { getAudioPlaybackErrorMessage } from "./audio-playback";
import { usePlayerStore } from "../store/player-store";

export const useAudioPlayback = (): void => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loadedTrackIdRef = useRef<string | null>(null);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const status = usePlayerStore((state) => state.status);
  const volume = usePlayerStore((state) => state.volume);
  const muted = usePlayerStore((state) => state.muted);
  const playbackMode = usePlayerStore((state) => state.playbackMode);
  const playbackModeRef = useRef(playbackMode);
  const handleTrackEnded = usePlayerStore((state) => state.handleTrackEnded);
  const setPositionSeconds = usePlayerStore((state) => state.setPositionSeconds);
  const setDurationSeconds = usePlayerStore((state) => state.setDurationSeconds);
  const markPlaybackStarted = usePlayerStore((state) => state.markPlaybackStarted);
  const markPlaybackPaused = usePlayerStore((state) => state.markPlaybackPaused);
  const setPlaybackError = usePlayerStore((state) => state.setPlaybackError);

  useEffect(() => {
    playbackModeRef.current = playbackMode;
  }, [playbackMode]);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;

    const handleTimeUpdate = (): void => {
      setPositionSeconds(audio.currentTime);
    };

    const handleLoadedMetadata = (): void => {
      setDurationSeconds(audio.duration);
    };

    const handleEnded = (): void => {
      // 循环播放：ended 后状态仍是 playing，不会触发下面的 effect，需要在事件里直接重播。
      if (playbackModeRef.current === "repeat-one") {
        audio.currentTime = 0;
        void audio.play().catch((error: unknown) => {
          setPlaybackError(getAudioPlaybackErrorMessage(error));
        });
      }

      handleTrackEnded();
    };

    const handleError = (): void => {
      setPlaybackError(getAudioPlaybackErrorMessage(audio.error));
    };

    const handlePause = (): void => {
      if (!audio.ended) {
        markPlaybackPaused();
      }
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("pause", handlePause);
      audioRef.current = null;
    };
  }, [handleTrackEnded, markPlaybackPaused, setDurationSeconds, setPlaybackError, setPositionSeconds]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.volume = volume / 100;
    audio.muted = muted;
  }, [muted, volume]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (!currentTrack) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      loadedTrackIdRef.current = null;
      return;
    }

    if (loadedTrackIdRef.current !== currentTrack.id) {
      audio.src = createTrackMediaUrl(currentTrack);
      audio.currentTime = 0;
      audio.load();
      loadedTrackIdRef.current = currentTrack.id;
    }

    if (status === "playing") {
      // 单曲循环：播放结束后同一首需要从头再放。
      if (audio.ended) {
        audio.currentTime = 0;
      }

      void audio
        .play()
        .then(() => {
          markPlaybackStarted();
        })
        .catch((error: unknown) => {
          setPlaybackError(getAudioPlaybackErrorMessage(error));
        });
      return;
    }

    audio.pause();
  }, [currentTrack, markPlaybackStarted, setPlaybackError, status]);
};
