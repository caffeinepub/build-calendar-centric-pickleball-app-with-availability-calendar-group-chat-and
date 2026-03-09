import { fileToUint8Array } from "../utils/file";
import { compressImage } from "../utils/imageCompression";

const avatarCache = new Map<string, string>();

export const storageService = {
  async prepareImageForUpload(
    file: File,
  ): Promise<{ bytes: Uint8Array; file: File }> {
    const compressed = await compressImage(file);
    const bytes = await fileToUint8Array(compressed);
    return { bytes, file: compressed };
  },

  cacheAvatarUrl(principal: string, url: string): void {
    avatarCache.set(principal, url);
  },

  getCachedAvatarUrl(principal: string): string | undefined {
    return avatarCache.get(principal);
  },

  clearAvatarCache(): void {
    avatarCache.clear();
  },
};
