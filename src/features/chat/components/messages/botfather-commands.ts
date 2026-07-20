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
    description: "Chọn và quản lý bot",
    insertText: "/mybots",
  },
  {
    name: "setname",
    usage: "/setname <username>",
    description: "Đổi tên bot",
    insertText: "/setname ",
  },
  {
    name: "setdescription",
    usage: "/setdescription <username>",
    description: "Đổi mô tả bot",
    insertText: "/setdescription ",
  },
  {
    name: "setabouttext",
    usage: "/setabouttext <username>",
    description: "Bí danh của đổi mô tả",
    insertText: "/setabouttext ",
  },
  {
    name: "setuserpic",
    usage: "/setuserpic <username>",
    description: "Đổi ảnh đại diện bot",
    insertText: "/setuserpic ",
  },
  {
    name: "setdescpic",
    usage: "/setdescpic <username>",
    description: "Đổi ảnh bìa mô tả bot",
    insertText: "/setdescpic ",
  },
  {
    name: "setprivacypolicy",
    usage: "/setprivacypolicy <username>",
    description: "Đặt hoặc xoá chính sách bảo mật",
    insertText: "/setprivacypolicy ",
  },
  {
    name: "setcommands",
    usage: "/setcommands <username>",
    description: "Đổi danh sách lệnh",
    insertText: "/setcommands ",
  },
  {
    name: "token",
    usage: "/token <username>",
    description: "Cấp token mới",
    insertText: "/token ",
  },
  {
    name: "setinline",
    usage: "/setinline <username>",
    description: "Bật hoặc tắt inline mode",
    insertText: "/setinline ",
  },
  {
    name: "setjoingroups",
    usage: "/setjoingroups <username>",
    description: "Cho phép bot vào nhóm",
    insertText: "/setjoingroups ",
  },
  {
    name: "setprivacy",
    usage: "/setprivacy <username>",
    description: "Cài đặt quyền riêng tư nhóm",
    insertText: "/setprivacy ",
  },
  {
    name: "myapps",
    usage: "/myapps <username>",
    description: "Quản lý Web Apps",
    insertText: "/myapps ",
  },
  {
    name: "newapp",
    usage: "/newapp <username>",
    description: "Tạo Web App",
    insertText: "/newapp ",
  },
  {
    name: "listapps",
    usage: "/listapps <username>",
    description: "Liệt kê Web Apps",
    insertText: "/listapps ",
  },
  {
    name: "editapp",
    usage: "/editapp <username>",
    description: "Chỉnh sửa Web App",
    insertText: "/editapp ",
  },
  {
    name: "deleteapp",
    usage: "/deleteapp <username>",
    description: "Xóa Web App",
    insertText: "/deleteapp ",
  },
  {
    name: "transfer",
    usage: "/transfer <username>",
    description: "Chuyển quyền sở hữu bot",
    insertText: "/transfer ",
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
