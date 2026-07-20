import { describe, expect, it } from "vitest";
import {
  BOTFATHER_COMMANDS,
  matchBotFatherCommands,
} from "./botfather-commands";

describe("matchBotFatherCommands", () => {
  it('gợi ý tất cả command khi mới gõ "/"', () => {
    expect(matchBotFatherCommands("/")).toEqual(BOTFATHER_COMMANDS);
  });

  it('lọc command theo prefix sau dấu "/"', () => {
    expect(matchBotFatherCommands("/new").map((c) => c.name)).toEqual([
      "newbot",
      "newapp",
    ]);
    expect(matchBotFatherCommands("/he").map((c) => c.name)).toEqual(["help"]);
  });

  it("đóng gợi ý khi command đã được gõ đủ hoặc có tham số", () => {
    expect(matchBotFatherCommands("/newbot")).toEqual([]);
    expect(matchBotFatherCommands("/token weather_bot")).toEqual([]);
  });

  it("không mở gợi ý cho text thường", () => {
    expect(matchBotFatherCommands("xin chào")).toEqual([]);
  });

  it("chỉ gợi ý command BotFather đang hỗ trợ", () => {
    const names = BOTFATHER_COMMANDS.map((command) => command.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "setdescpic",
        "setprivacypolicy",
        "transfer",
      ]),
    );
    expect(names).not.toEqual(
      expect.arrayContaining([
        "setinlinegeo",
        "setinlinefeedback",
        "mygames",
        "newgame",
        "listgames",
        "editgame",
        "deletegame",
      ]),
    );
  });

  it("dùng đúng cú pháp command có username", () => {
    const myApps = BOTFATHER_COMMANDS.find((command) => command.name === "myapps");
    expect(myApps).toMatchObject({
      usage: "/myapps <username>",
      insertText: "/myapps ",
    });
  });
});
