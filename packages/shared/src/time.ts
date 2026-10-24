export const formatDuration = (seconds: number): string => {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  }

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

export const formatSampleRate = (sampleRateHz: number): string => {
  if (!Number.isFinite(sampleRateHz) || sampleRateHz <= 0) {
    return "—";
  }

  if (sampleRateHz < 1000) {
    return `${Math.round(sampleRateHz)} Hz`;
  }

  const kHz = sampleRateHz / 1000;

  return `${Number.isInteger(kHz) ? kHz : kHz.toFixed(1)} kHz`;
};

export const formatBitDepth = (bitDepth: number): string => {
  if (!Number.isFinite(bitDepth) || bitDepth <= 0) {
    return "—";
  }

  return `${Math.round(bitDepth)}-bit`;
};

export const formatUnknown = (value: string | null | undefined): string => {
  const trimmed = value?.trim() ?? "";

  return trimmed.length > 0 ? trimmed : "—";
};
