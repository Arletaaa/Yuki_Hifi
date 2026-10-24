import { describe, expect, it } from "vitest";
import { getAudioPlaybackErrorMessage } from "./audio-playback";

describe("audio playback helpers", () => {
  it("maps autoplay errors to a user-facing message", () => {
    const error = new Error("Not allowed");
    error.name = "NotAllowedError";

    expect(getAudioPlaybackErrorMessage(error)).toContain("自动播放");
  });

  it("maps unsupported media errors to a user-facing message", () => {
    expect(getAudioPlaybackErrorMessage({ code: 4 })).toContain("无法播放");
  });
});
