import { APP_VERSION, BUILD_ID } from '@/lib/version/app-version';
import type { UpdateManifest } from '@/lib/version/update-manifest';
import { readDesktopRelease } from './desktop-release-env';

export const runtime = 'nodejs';
// Đọc env lúc request: đổi bản desktop mới chỉ cần sửa env + restart, không build lại.
export const dynamic = 'force-dynamic';

const HEADERS = {
  'Cache-Control': 'no-store',
  // App desktop chạy ở origin http://127.0.0.1 nên cần CORS. Nội dung công khai, không chứa bí mật.
  'Access-Control-Allow-Origin': '*',
};

export function GET(): Response {
  const manifest: UpdateManifest = {
    version: APP_VERSION,
    buildId: BUILD_ID,
    desktop: readDesktopRelease(),
  };
  return Response.json(manifest, { headers: HEADERS });
}
