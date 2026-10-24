import electron from "electron";
import { pathToFileURL } from "node:url";
import { isSupportedAudioFile } from "./music-scanner.js";

const { net, protocol } = electron;

export const mediaProtocolScheme = "arlt-hifi-media";

export const registerMediaProtocolPrivileges = (): void => {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: mediaProtocolScheme,
      privileges: {
        stream: true,
        supportFetchAPI: true
      }
    }
  ]);
};

export const createMediaProtocolAccess = () => {
  const allowedAudioFilePaths = new Set<string>();

  return {
    allowAudioFilePaths: (filePaths: readonly string[]): void => {
      allowedAudioFilePaths.clear();

      for (const filePath of filePaths) {
        if (isSupportedAudioFile(filePath)) {
          allowedAudioFilePaths.add(filePath);
        }
      }
    },
    registerHandler: (): void => {
      protocol.handle(mediaProtocolScheme, async (request) => {
        const requestUrl = new URL(request.url);
        const encodedFilePath = requestUrl.pathname.replace(/^\//, "");
        const filePath = decodeURIComponent(encodedFilePath);

        if (!allowedAudioFilePaths.has(filePath) || !isSupportedAudioFile(filePath)) {
          return new Response("Audio file is not available for playback.", { status: 403 });
        }

        return net.fetch(pathToFileURL(filePath).toString());
      });
    }
  };
};
