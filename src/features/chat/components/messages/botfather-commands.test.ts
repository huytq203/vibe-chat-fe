import { describe, expect, it } from "vitest";
import { matchBotFatherCommands } from "./botfather-commands";

describe("matchBotFatherCommands", () => {
  it('gợi ý tất cả command khi mới gõ "/"', () => {
    expect(matchBotFatherCommands("/").map((c) => c.name)).toEqual([
      "help",
      "newbot",
      "mybots",
      "token",
      "revoke",
      "deletebot",
      "cancel",
    ]);
  });

  it('lọc command theo prefix sau dấu "/"', () => {
    expect(matchBotFatherCommands("/new").map((c) => c.name)).toEqual([
      "newbot",
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
});
