export type ReportReason =
  | 'SPAM'
  | 'HARASSMENT'
  | 'NSFW_CONTENT'
  | 'HATE_SPEECH'
  | 'FRAUD_SCAM'
  | 'VIOLENCE';

export type ReportTargetType = 'USER' | 'MESSAGE' | 'CONVERSATION';

export type CreateReportInput = {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  description?: string;
};

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  SPAM: 'Spam / Quảng cáo rác',
  HARASSMENT: 'Quấy rối / Bắt nạt',
  NSFW_CONTENT: 'Nội dung khiêu dâm',
  HATE_SPEECH: 'Ngôn từ thù hận',
  FRAUD_SCAM: 'Lừa đảo / Mạo danh',
  VIOLENCE: 'Bạo lực / Kinh dị',
};
