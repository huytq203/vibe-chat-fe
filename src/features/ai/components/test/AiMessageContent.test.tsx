import { describe, expect, it } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import {
  AiMessageContent,
  normalizeAiMarkdownContent,
} from "../AiMessageContent";

describe("AiMessageContent", () => {
  it("render Markdown cơ bản cho câu trả lời AI/bot", () => {
    renderWithProviders(
      <AiMessageContent
        content={"**Tóm tắt nội dung:**\n- Dòng 7 thành công"}
      />,
    );

    expect(screen.getByText("Tóm tắt nội dung:").tagName).toBe("STRONG");
    expect(screen.getByText("Dòng 7 thành công")).toBeInTheDocument();
  });

  it("tự bọc raw JSON/log thành code block để bubble không bị vỡ chữ", () => {
    const content = [
      "[",
      "  {",
      '    "time": 1784652108109,',
      '    "level": "info",',
      '    "msg": "POST /api/v1/bot/chats/id/actions -> 204"',
      "  }",
      "]",
      "",
      "**Tóm tắt nội dung:** OK",
    ].join("\n");

    const normalized = normalizeAiMarkdownContent(content);

    expect(normalized).toContain("```json\n[");
    expect(normalized).toContain("]\n```");

    const { container } = renderWithProviders(
      <AiMessageContent content={content} />,
    );
    expect(container.querySelector("pre")).toHaveTextContent(
      "POST /api/v1/bot/chats/id/actions -> 204",
    );
    expect(screen.getByText("Tóm tắt nội dung:")).toBeInTheDocument();
  });

  it("nên điều hướng trong app khi link bắt đầu bằng dấu gạch chéo", () => {
    renderWithProviders(
      <AiMessageContent content="[Trang kế hoạch](/notes/workspace-1/page-1)" />,
    );

    const link = screen.getByRole("link", { name: "Trang kế hoạch" });
    expect(link).toHaveAttribute("href", "/notes/workspace-1/page-1");
    expect(link).not.toHaveAttribute("target");
    expect(link).not.toHaveAttribute("rel");
  });

  it("nên mở tab mới an toàn khi link là địa chỉ bên ngoài", () => {
    renderWithProviders(
      <AiMessageContent content="[Tài liệu](https://example.com/docs)" />,
    );

    const link = screen.getByRole("link", { name: "Tài liệu" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
