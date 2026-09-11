import { encodeStateAsUpdate, encodeStateVector, type Doc as YDoc } from 'yjs';

/** Đo số byte của state vector hiện tại mà không để feature import Yjs trực tiếp. */
export function collabDocumentStateVectorBytes(doc: YDoc): number {
  return encodeStateVector(doc).byteLength;
}

/** Đo toàn bộ trạng thái Y.Doc đã mã hoá, dùng cho giới hạn dung lượng tài liệu. */
export function collabDocumentUpdateBytes(doc: YDoc): number {
  return encodeStateAsUpdate(doc).byteLength;
}
