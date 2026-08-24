import { encodeStateVector, type Doc as YDoc } from 'yjs';

/** Đo số byte của state vector hiện tại mà không để feature import Yjs trực tiếp. */
export function collabDocumentStateVectorBytes(doc: YDoc): number {
  return encodeStateVector(doc).byteLength;
}
