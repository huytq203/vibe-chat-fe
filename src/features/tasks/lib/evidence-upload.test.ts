import { describe, expect, it } from 'vitest';
import { formatFileSize, validateEvidenceFile } from './evidence-upload';

describe('tệp bằng chứng', () => {
  it('nên chấp nhận file pdf dưới 100 MB', () => {
    const file = new File(['pdf'], 'bao-cao.pdf', { type: 'application/pdf' });
    expect(validateEvidenceFile(file)).toBeNull();
  });

  it('nên từ chối file vượt 100 MB', () => {
    const file = new File(['pdf'], 'bao-cao.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 100 * 1024 * 1024 + 1 });
    expect(validateEvidenceFile(file)).toMatch(/100 MB/);
  });

  it('nên từ chối text/html và image/svg+xml', () => {
    expect(validateEvidenceFile(new File(['x'], 'a.html', { type: 'text/html' }))).not.toBeNull();
    expect(validateEvidenceFile(new File(['x'], 'a.svg', { type: 'image/svg+xml' }))).not.toBeNull();
  });

  it('nên đổi dung lượng sang KB và MB', () => {
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(1572864)).toBe('1.5 MB');
  });
});
