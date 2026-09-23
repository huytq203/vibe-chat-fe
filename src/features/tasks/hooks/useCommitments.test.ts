import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { commitmentsApi } from '../services/commitments.api';
import {
  useCommitmentDetail,
  useCommitmentsInfinite,
  useCreateCommitment,
  useTransitionCommitment,
  useUpdateCommitment,
  useUploadEvidenceFile,
} from './useCommitments';

vi.mock('../services/commitments.api', () => ({
  commitmentsApi: {
    listPaged: vi.fn(),
    getDetail: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    transition: vi.fn(),
    presignEvidence: vi.fn(),
    confirmEvidence: vi.fn(),
  },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return createElement(QueryClientProvider, { client: qc }, children);
}

beforeEach(() => vi.clearAllMocks());

describe('useCommitmentsInfinite', () => {
  it('nên gọi commitmentsApi.listPaged với đúng filter', async () => {
    vi.mocked(commitmentsApi.listPaged).mockResolvedValue({
      data: [],
      meta: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    });
    const { result } = renderHook(
      () => useCommitmentsInfinite('proj-1', { deliveryStatus: 'READY' }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(commitmentsApi.listPaged).toHaveBeenCalledWith('proj-1', {
      page: 1,
      limit: 20,
      deliveryStatus: 'READY',
    });
  });
});

describe('useCommitmentDetail', () => {
  it('không gọi API khi commitmentId rỗng', () => {
    const { result } = renderHook(() => useCommitmentDetail(''), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(commitmentsApi.getDetail).not.toHaveBeenCalled();
  });
});

describe('useCreateCommitment', () => {
  it('nên gọi commitmentsApi.create với idempotency key mới mỗi lần', async () => {
    vi.mocked(commitmentsApi.create).mockResolvedValue({} as never);
    const { result } = renderHook(() => useCreateCommitment('proj-1'), {
      wrapper,
    });

    result.current.mutate({ title: 'X', scopeStatus: 'UNCLEAR' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(commitmentsApi.create).toHaveBeenCalledWith(
      'proj-1',
      { title: 'X', scopeStatus: 'UNCLEAR' },
      expect.any(String),
    );
  });
});

describe('useUpdateCommitment', () => {
  it('nên gọi commitmentsApi.update với đúng tham số', async () => {
    vi.mocked(commitmentsApi.update).mockResolvedValue({} as never);
    const { result } = renderHook(
      () => useUpdateCommitment('proj-1', 'c1'),
      { wrapper },
    );

    result.current.mutate({ title: 'X mới', version: 3 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(commitmentsApi.update).toHaveBeenCalledWith('c1', {
      title: 'X mới',
      version: 3,
    });
  });
});

describe('useTransitionCommitment', () => {
  it('nên gọi commitmentsApi.transition với đúng tham số', async () => {
    vi.mocked(commitmentsApi.transition).mockResolvedValue({} as never);
    const { result } = renderHook(
      () => useTransitionCommitment('proj-1', 'c1'),
      { wrapper },
    );

    result.current.mutate({ to: 'READY', version: 2 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(commitmentsApi.transition).toHaveBeenCalledWith('c1', {
      to: 'READY',
      version: 2,
    });
  });
});

describe('useUploadEvidenceFile', () => {
  const file = new File(['pdf'], 'report.pdf', { type: 'application/pdf' });

  it('nên gọi presign rồi PUT rồi confirm theo thứ tự', async () => {
    const steps: string[] = [];
    vi.mocked(commitmentsApi.presignEvidence).mockImplementation(async () => {
      steps.push('presign');
      return { evidenceId: 'e1', uploadUrl: 'https://s3.test/upload' };
    });
    const upload = vi.fn().mockImplementation(async () => {
      steps.push('put');
      return { ok: true };
    });
    vi.stubGlobal('fetch', upload);
    vi.mocked(commitmentsApi.confirmEvidence).mockImplementation(async () => {
      steps.push('confirm');
      return { id: 'e1' } as never;
    });
    const { result } = renderHook(() => useUploadEvidenceFile('c1'), { wrapper });

    await result.current.mutateAsync({ milestone: 'TESTED', file });

    expect(steps).toEqual(['presign', 'put', 'confirm']);
    expect(commitmentsApi.presignEvidence).toHaveBeenCalledWith('c1', {
      milestone: 'TESTED', fileName: 'report.pdf', mimeType: 'application/pdf', fileSize: 3,
    });
    expect(commitmentsApi.confirmEvidence).toHaveBeenCalledWith('c1', 'e1');
    vi.unstubAllGlobals();
  });

  it('nên không gọi confirm khi PUT thất bại', async () => {
    vi.mocked(commitmentsApi.presignEvidence).mockResolvedValue({ evidenceId: 'e1', uploadUrl: 'https://s3.test/upload' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const { result } = renderHook(() => useUploadEvidenceFile('c1'), { wrapper });

    await expect(result.current.mutateAsync({ milestone: 'TESTED', file })).rejects.toThrow();

    expect(commitmentsApi.confirmEvidence).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('nên PUT không kèm Authorization và đúng Content-Type', async () => {
    vi.mocked(commitmentsApi.presignEvidence).mockResolvedValue({ evidenceId: 'e1', uploadUrl: 'https://s3.test/upload' });
    const upload = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', upload);
    vi.mocked(commitmentsApi.confirmEvidence).mockResolvedValue({ id: 'e1' } as never);
    const { result } = renderHook(() => useUploadEvidenceFile('c1'), { wrapper });

    await result.current.mutateAsync({ milestone: 'TESTED', file });

    expect(upload).toHaveBeenCalledWith('https://s3.test/upload', {
      method: 'PUT', body: file, headers: { 'Content-Type': 'application/pdf' },
    });
    vi.unstubAllGlobals();
  });
});
