import type { AudioQuality } from "./types.js";

const losslessExtensions = new Set(["flac", "wav"]);
const lossyExtensions = new Set(["mp3", "m4a", "ogg"]);

export const getFileExtension = (filePath: string): string => {
  const dotIndex = filePath.lastIndexOf(".");
  const separatorIndex = Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\"));

  if (dotIndex <= separatorIndex || dotIndex === filePath.length - 1) {
    return "";
  }

  return filePath.slice(dotIndex + 1).toLowerCase();
};

export const getAudioFormatLabel = (filePath: string): string => {
  const extension = getFileExtension(filePath);

  return extension.length > 0 ? extension.toUpperCase() : "未知";
};

export const getAudioQuality = (filePath: string): AudioQuality => {
  const extension = getFileExtension(filePath);

  if (losslessExtensions.has(extension)) {
    return "lossless";
  }

  if (lossyExtensions.has(extension)) {
    return "lossy";
  }

  return "unknown";
};

export const getQualityLabel = (quality: AudioQuality): string => {
  switch (quality) {
    case "lossless":
      return "Lossless";
    case "hi-res":
      return "Hi-Res";
    case "lossy":
      return "Lossy";
    case "unknown":
      return "Unknown";
  }
};
