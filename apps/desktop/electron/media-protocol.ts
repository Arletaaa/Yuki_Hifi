import electron from "electron";
import { pathToFileURL } from "node:url";
import { createMediaAccessList, resolveMediaRequest } from "./media-access.js";

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
  const access = createMediaAccessList();

  return {
    allowAudioFilePaths: (filePaths: readonly string[]): void => {
      access.allow("audio", filePaths);
    },
    allowImageFilePaths: (filePaths: readonly string[]): void => {
      access.allow("image", filePaths);
    },
    registerHandler: (): void => {
      protocol.handle(mediaProtocolScheme, async (request) => {
        const resolved = resolveMediaRequest(request.url);

        if (!resolved || !access.has(resolved.kind, resolved.filePath)) {
          return new Response("Media file is not available.", { status: 403 });
        }

        return net.fetch(pathToFileURL(resolved.filePath).toString());
      });
    }
  };
};
