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
    /** 重新扫描时整体替换音频白名单。 */
    allowAudioFilePaths: (filePaths: readonly string[]): void => {
      access.allow("audio", filePaths);
    },
    /** 导入后累加放行：不能把还没重启的旧曲目挤掉。 */
    addAudioFilePaths: (filePaths: readonly string[]): void => {
      access.add("audio", filePaths);
    },
    /** 封面与壁纸累加放行：选择壁纸不能把已放行的封面挤掉。 */
    addImageFilePaths: (filePaths: readonly string[]): void => {
      access.add("image", filePaths);
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
