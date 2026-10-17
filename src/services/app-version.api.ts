import { updateManifestSchema, type UpdateManifest } from '@/lib/version/update-manifest';

/**
 * `/version.json` không đi qua apiClient: không có envelope `{success,data}`, không cần
 * token, và với app desktop là URL tuyệt đối tới bản web chứ không phải BE.
 */
export const appVersionApi = {
  getManifest: async (url: string): Promise<UpdateManifest> => {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Không tải được thông tin phiên bản (HTTP ${response.status})`);
    }
    return updateManifestSchema.parse(await response.json());
  },
};
