export const getAudioPlaybackErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.name === "NotAllowedError") {
    return "浏览器阻止了自动播放，请再次点击播放。";
  }

  if (typeof error === "object" && error !== null && "code" in error && error.code === 4) {
    return "无法播放该音频格式，或文件已经不可读取。";
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "播放失败，请确认文件格式受支持且文件仍然存在。";
};
