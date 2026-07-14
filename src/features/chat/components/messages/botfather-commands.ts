export type BotFatherCommand = {
  name: string;
  usage: string;
  description: string;
  insertText: string;
};

export const BOTFATHER_COMMANDS: BotFatherCommand[] = [
  {
    name: "help",
    usage: "/help",
    description: "Hướng dẫn dùng BotFather",
    insertText: "/help",
  },
  {
    name: "newbot",
    usage: "/newbot",
    description: "Tạo bot mới",
    insertText: "/newbot",
  },
  {
    name: "mybots",
    usage: "/mybots",
    description: "Liệt kê bot của bạn",
    insertText: "/mybots",
  },
  {
    name: "token",
    usage: "/token <username>",
    description: "Cấp token mới",
    insertText: "/token ",
  },
  {
    name: "revoke",
    usage: "/revoke <username>",
    description: "Thu hồi token active",
    insertText: "/revoke ",
  },
  {
    name: "deletebot",
    usage: "/deletebot <username>",
    description: "Xoá bot",
    insertText: "/deletebot ",
  },
  {
    name: "cancel",
    usage: "/cancel",
    description: "Huỷ flow đang dở",
    insertText: "/cancel",
  },
];

export function matchBotFatherCommands(plaintext: string): BotFatherCommand[] {
  const match = plaintext.match(/^\/([a-z]*)$/i);
  if (!match) return [];

  const query = match[1].toLowerCase();
  return BOTFATHER_COMMANDS.filter((command) => {
    if (command.name === query) return false;
    return command.name.startsWith(query);
  });
}
