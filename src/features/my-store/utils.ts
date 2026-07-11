import type { StoreFolder } from '@/features/my-store/types';

/** Tìm 1 folder theo id trong cây folder lồng nhau (duyệt đệ quy qua `children`). */
export function findFolderById(folders: StoreFolder[], id: string): StoreFolder | null {
  for (const folder of folders) {
    if (folder.id === id) return folder;
    if (folder.children?.length) {
      const found = findFolderById(folder.children, id);
      if (found) return found;
    }
  }
  return null;
}
