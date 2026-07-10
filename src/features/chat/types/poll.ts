export type PollOption = {
  id: string;
  text: string;
  voteCount: number;
  voterIds: string[] | null;
  hasVoted: boolean;
};

export type PollData = {
  id: string;
  conversationId: string;
  creatorId: string;
  question: string;
  options: PollOption[];
  isMultiChoice: boolean;
  isAnonymous: boolean;
  allowAddOptions: boolean;
  hideResultsBeforeVote: boolean;
  expiresAt: string | null;
  isExpired: boolean;
  totalVotes: number;
  createdAt: string;
  updatedAt: string;
};
