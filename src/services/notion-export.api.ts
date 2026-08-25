import { ApiError, apiAuth, apiClient, resolveApiUrl } from '@/lib/api/client';
import { pageHtmlExportSchema, pageMarkdownExportSchema } from '@/features/notes/schemas';

/**
 * `GET /pages/:id/pdf` trả nhị phân qua `@Res()` ở BE — Nest bỏ qua
 * TransformInterceptor cho route này, nên không có envelope JSON để
 * `apiClient` bóc. Phải tự fetch, tự gắn Bearer token, tự đọc lỗi 503 (Gotenberg
 * lỗi) từ body — cùng lý do M6-T5 ghi trong plan.
 */
async function fetchPagePdf(pageId: string): Promise<Blob> {
  const url = resolveApiUrl(`/api/v1/pages/${pageId}/pdf`, 'notion');
  const token = apiAuth.getToken();
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    let code = 'EXPORT_PDF_FAILED';
    let message = 'Xuất PDF thất bại';
    try {
      const body = await response.json() as { error?: { code?: string; message?: string } };
      if (body?.error?.code) code = body.error.code;
      if (body?.error?.message) message = body.error.message;
    } catch {
      /* body không phải JSON */
    }
    throw new ApiError(response.status, code, message);
  }
  return response.blob();
}

export const exportApi = {
  html: async (pageId: string) => {
    const raw = await apiClient.get<unknown>(`/api/v1/pages/${pageId}/html`, { service: 'notion' });
    return pageHtmlExportSchema.parse(raw).html;
  },
  markdown: async (pageId: string) => {
    const raw = await apiClient.get<unknown>(`/api/v1/pages/${pageId}/markdown`, { service: 'notion' });
    return pageMarkdownExportSchema.parse(raw).markdown;
  },
  pdf: fetchPagePdf,
} as const;
