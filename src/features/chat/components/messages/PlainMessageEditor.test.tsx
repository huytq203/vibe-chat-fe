import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Framework7Shell } from "@/components/pwa/Framework7Shell";
import type { EditorHandle } from "./RichMessageEditor";
import { PlainMessageEditor } from "./PlainMessageEditor";
import { MAX_LENGTH } from "./composer-utils";

const baseProps = {
  value: "",
  placeholder: "Nhập tin nhắn...",
  onUpdate: vi.fn(),
  onEnter: vi.fn(),
  onPasteFiles: vi.fn(() => false),
};

afterEach(() => {
  vi.clearAllMocks();
});

function renderEditor(ref = createRef<EditorHandle>()) {
  render(
    <Framework7Shell>
      <PlainMessageEditor ref={ref} {...baseProps} />
    </Framework7Shell>,
  );
  return ref;
}

describe("PlainMessageEditor", () => {
  it("dùng textarea native, không bọc toolbar Framework7", async () => {
    renderEditor();

    const textarea = (await screen.findByRole("textbox", {
      name: "Nhập tin nhắn",
    })) as HTMLTextAreaElement;
    expect(textarea.tagName).toBe("TEXTAREA");
    expect(textarea.rows).toBe(1);
    expect(textarea.closest(".toolbar")).toBeNull();
  });

  it("cập nhật plaintext và gửi bằng Enter nhưng giữ Shift+Enter", async () => {
    const onUpdate = vi.fn();
    const onEnter = vi.fn();
    render(
      <Framework7Shell>
        <PlainMessageEditor {...baseProps} onUpdate={onUpdate} onEnter={onEnter} />
      </Framework7Shell>,
    );
    const textarea = (await screen.findByRole("textbox", {
      name: "Nhập tin nhắn",
    })) as HTMLTextAreaElement;

    fireEvent.input(textarea, { target: { value: "Xin chào" } });
    expect(onUpdate).toHaveBeenLastCalledWith(true, "Xin chào");

    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(onEnter).toHaveBeenCalledOnce();
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
    expect(onEnter).toHaveBeenCalledOnce();
  });

  it("giữ contract editor cho emoji, focus và serialize", async () => {
    const onUpdate = vi.fn();
    const ref = createRef<EditorHandle>();
    render(
      <Framework7Shell>
        <PlainMessageEditor ref={ref} {...baseProps} value="Halo" onUpdate={onUpdate} />
      </Framework7Shell>,
    );
    const textarea = (await screen.findByRole("textbox", {
      name: "Nhập tin nhắn",
    })) as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(4, 4);

    ref.current?.insertText(" 👋");
    expect(onUpdate).toHaveBeenLastCalledWith(true, "Halo 👋");
    expect(ref.current?.serialize().plaintext).toBe("Halo 👋");
    expect(ref.current?.isFocused()).toBe(true);
  });

  it("giữ mention và rich text nếu textarea chưa sửa nội dung", async () => {
    const ref = renderEditor();
    await screen.findByRole("textbox", { name: "Nhập tin nhắn" });
    const message = {
      plaintext: "@Huy xin chào",
      mentions: [{ userId: "user-1", startOffset: 0, length: 4 }],
      richText: {
        v: 1 as const,
        marks: [{ start: 5, end: 13, type: "bold" as const }],
        blocks: [],
      },
    };

    ref.current?.setSerialized(message);
    expect(ref.current?.serialize()).toEqual(message);
  });

  it("chặn nội dung vượt quá giới hạn của composer", async () => {
    const onUpdate = vi.fn();
    render(
      <Framework7Shell>
        <PlainMessageEditor {...baseProps} onUpdate={onUpdate} />
      </Framework7Shell>,
    );
    const textarea = (await screen.findByRole("textbox", {
      name: "Nhập tin nhắn",
    })) as HTMLTextAreaElement;

    fireEvent.input(textarea, { target: { value: "a".repeat(MAX_LENGTH + 1) } });
    expect(textarea.value).toBe("");
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("không mở lại keyboard khi chèn emoji từ picker", async () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    const ref = renderEditor();
    await screen.findByRole("textbox", { name: "Nhập tin nhắn" });
    const pickerButton = document.createElement("button");
    document.body.append(pickerButton);
    pickerButton.focus();

    ref.current?.insertText("👋");
    expect(document.activeElement).toBe(pickerButton);
  });
});
