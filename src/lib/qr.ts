import QRCode from 'qrcode';

/** Sinh QR data URL (PNG) từ chuỗi. Trả null nếu lỗi. */
export async function toQrDataUrl(text: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(text, { width: 220, margin: 1 });
  } catch {
    return null;
  }
}
