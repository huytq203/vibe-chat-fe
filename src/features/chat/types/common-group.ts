/** Nhóm chung giữa mình và 1 user khác (xem 26-common-groups.md). */
export type CommonGroupItem = {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  memberCount: number;
};

export type CommonGroupsPage = {
  items: CommonGroupItem[];
  nextCursor: string | null;
};
