import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ImageInsertPrompt } from "./ImageInsertPrompt";

describe("ImageInsertPrompt", () => {
  it("nên tải ảnh từ máy và giữ URL attachment:// khi chọn tệp", async () => {
    const file = new File(["image"], "ảnh.png", { type: "image/png" });
    const onApply = vi.fn();
    const uploadFile = vi.fn().mockResolvedValue("attachment://att-local");
    render(
      <ImageInsertPrompt onApply={onApply} onClose={vi.fn()} uploadFile={uploadFile} />,
    );

    fireEvent.change(screen.getByLabelText("Chọn ảnh từ máy"), {
      target: { files: [file] },
    });

    await waitFor(() => expect(onApply).toHaveBeenCalledWith("attachment://att-local"));
    expect(uploadFile).toHaveBeenCalledWith(file);
  });
});
