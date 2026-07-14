type BotLikeUser = {
  username?: string | null;
  isBot?: boolean | null;
};

const BOT_USERNAME_RE = /bot/i;

/** BE mới trả isBot; fallback username chứa "bot" theo rule tạo bot hiện tại. */
export function isBotUser(user: BotLikeUser | null | undefined): boolean {
  if (!user) return false;
  return user.isBot === true || BOT_USERNAME_RE.test(user.username ?? '');
}
