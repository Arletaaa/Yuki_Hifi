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
  const playNext = usePlayerStore((state) => state.playNext);
  const setPositionSeconds = usePlayerStore((state) => state.setPositionSeconds);
  const setDurationSeconds = usePlayerStore((state) => state.setDurationSeconds);
  const markPlaybackStarted = usePlayerStore((state) => state.markPlaybackStarted);
  const markPlaybackPaused = usePlayerStore((state) => state.markPlaybackPaused);
  const setPlaybackError = usePlayerStore((state) => state.setPlaybackError);

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
      playNext();
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
  }, [markPlaybackPaused, playNext, setDurationSeconds, setPlaybackError, setPositionSeconds]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.volume = volume / 100;
  }, [volume]);

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

    if (currentTrack.filePath.startsWith("mock://")) {
      if (status === "playing") {
        setPlaybackError("请先从音乐库选择一首本地音频文件。");
      }
      return;
    }

    if (loadedTrackIdRef.current !== currentTrack.id) {
      audio.src = createTrackMediaUrl(currentTrack);
      audio.currentTime = 0;
      audio.load();
      loadedTrackIdRef.current = currentTrack.id;
    }

    if (status === "playing") {
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
