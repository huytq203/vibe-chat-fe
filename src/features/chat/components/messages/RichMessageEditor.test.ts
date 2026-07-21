import { describe, expect, it } from "vitest";
import { sanitizePastedHtml } from "./RichMessageEditor";

describe("sanitizePastedHtml", () => {
  it("removes source theme colors while preserving meaningful formatting", () => {
    const html = [
      '<p class="text-white source-copy" style="color: white; background: rgb(0, 0, 0); text-align: center">',
      '<strong style="-webkit-text-fill-color: #fff">Nội dung</strong>',
      "</p>",
    ].join("");

    const result = sanitizePastedHtml(html);

    expect(result).not.toContain("text-white");
    expect(result).not.toContain("color:");
    expect(result).not.toContain("background:");
    expect(result).not.toContain("-webkit-text-fill-color");
    expect(result).toContain("text-align: center");
    expect(result).toContain("<strong>Nội dung</strong>");
  });

  it("removes legacy color attributes", () => {
    expect(
      sanitizePastedHtml('<font color="#fff"><span bgcolor="#000">Text</span></font>'),
    ).toBe("<font><span>Text</span></font>");
  });
});
